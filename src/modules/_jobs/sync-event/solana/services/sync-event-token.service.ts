import { ContractsService } from "modules/contracts/contracts.service";
import { LogsService } from "modules/logs/logs.service";

import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

import { ContractName } from "common/constants/contract";
import { HistoriesService } from "modules/histories/histories.service";
import { HelperSolanaService } from "./_helper-solana.service";
import { IEventParams } from "../interfaces/helper-solana.interface";
import { Network } from "common/enums/network.enum";
import { EVENT_CAMPAGIN_HISTORIES, EVENT_SCORE, EVENT_TOKEN } from "common/constants/event";
import { UsersService } from "modules/users/users.service";
import BigNumber from "bignumber.js";
import { CampaignsService } from "modules/campaigns/campaigns.service";
import { AMOUNT_PER_SCORE } from "common/constants/asset";

const acceptEvents = [];

@Injectable()
export class JobSyncEventTokenService {
  constructor(
    private readonly logsService: LogsService,
    private readonly usersService: UsersService,
    private readonly contractService: ContractsService,
    private readonly helperService: HelperSolanaService,
    private readonly historiesService: HistoriesService,
    private readonly campaignsService: CampaignsService,
  ) {}
  private isRunning = {};

  @Cron(CronExpression.EVERY_10_SECONDS)
  private async start() {
    const contract = await this.contractService.getContractByName(ContractName.TOKEN, Network.solana);
    if (!contract) return;
    if (this.isRunning[contract.name]) return;
    this.isRunning[contract.name] = true;
    try {
      await this.helperService.excuteSync({
        contract,
        acceptEvents,
        eventParser: undefined,
        callback: this.handleEvents,
      });
    } catch (err) {
      this.logsService.createLog("JobSyncEventTokenService -> start: ", err);
    } finally {
      delete this.isRunning[contract.name];
    }
  }

  private handleEvents = async ({ events: listEvents, contract, eventHashes }: IEventParams) => {
    try {
      if (!listEvents.length) return;
      const { network, contract_address, decimal, symbol } = contract;
      const txsHashExists = await this.historiesService.findTransactionTokenHashExists(eventHashes);
      const events = this.helperService.filterEvents(listEvents, txsHashExists, network);
      const eventSwap = events.filter((a) => a.event === EVENT_TOKEN.SWAP);
      const eventTransfer = events.filter((a) => a.event === EVENT_TOKEN.TRANSFER);
      const accounts = eventSwap.map((a) => a.account || "");
      const froms = eventTransfer.map((a) => a.from || "");
      const tos = eventTransfer.map((a) => a.to || "");
      const addresses = accounts.concat(froms).concat(tos);
      const userExists = await this.usersService.getUserSocialConnectedByAddresses(addresses);
      const acceptAddress = userExists.map((a) => a.address);

      // save database
      const histories: any[] = [];
      const bulkUpdateScore: any[] = [];
      const bulkUpdateScoreHistories: any[] = [];
      const bulkCreate: any[] = [];
      for (const event of events) {
        const { blockTime, transactionHash, logIndex, account, amount, is_buy, from, to } = event;
        histories.push({
          event: event.event,
          contract_address,
          transaction_hash: transactionHash,
          network,
          log_index: logIndex,
          timestamp: blockTime,
          from,
          to,
        });
        let minusScore = +BigNumber(amount || "0")
          .dividedBy(
            BigNumber(AMOUNT_PER_SCORE)
              .multipliedBy(Math.pow(10, decimal || 6))
              .toFixed(0),
          )
          .toFixed(decimal || 6);
        if (event.event === EVENT_TOKEN.SWAP && account && acceptAddress.includes(account)) {
          minusScore = is_buy ? minusScore : minusScore * -1;
          bulkUpdateScore.push({
            updateOne: {
              filter: {
                address: account,
              },
              update: {
                $inc: { score: minusScore },
              },
            },
          });
          bulkCreate.push({
            event: is_buy ? EVENT_CAMPAGIN_HISTORIES.BUY : EVENT_CAMPAGIN_HISTORIES.SELL,
            address: account,
            cid: 0,
            start_holders: [],
            detail: {
              mint: contract_address,
              amount,
              symbol: symbol || "🌕",
              decimal: decimal || 6,
            },
            score: minusScore,
            is_buy,
            status: false,
            tx: transactionHash,
          });
          bulkUpdateScoreHistories.push({
            address: account,
            event: EVENT_SCORE.TRANSFER_TOKEN,
            score: minusScore,
            timestamp: blockTime * 1000
          })
        }
        if (event.event === EVENT_TOKEN.TRANSFER) {
          if ((acceptAddress || []).includes(from || "")) {
            bulkUpdateScore.push({
              updateOne: {
                filter: {
                  address: from,
                },
                update: {
                  $inc: { score: minusScore * -1 },
                },
              },
            });
            bulkCreate.push({
              event: EVENT_CAMPAGIN_HISTORIES.SENT,
              address: from,
              cid: 0,
              start_holders: [],
              detail: {
                mint: contract_address,
                amount,
                symbol: symbol || "🌕",
                decimal: decimal || 6,
              },
              score: minusScore * -1,
              is_buy,
              is_send: true,
              status: false,
              tx: transactionHash,
            });
            bulkUpdateScoreHistories.push({
              address: from,
              event: EVENT_SCORE.TRANSFER_TOKEN,
              score: minusScore * -1,
              timestamp: blockTime * 1000
            })
          }
          if ((acceptAddress || []).includes(to || "")) {
            bulkUpdateScore.push({
              updateOne: {
                filter: {
                  address: to,
                },
                update: {
                  $inc: { score: minusScore },
                },
              },
            });
            bulkCreate.push({
              event: EVENT_CAMPAGIN_HISTORIES.RECEIVED,
              address: to,
              cid: 0,
              start_holders: [],
              detail: {
                mint: contract_address,
                amount,
                symbol: symbol || "🌕",
                decimal: decimal || 6,
              },
              score: minusScore,
              is_buy,
              is_send: false,
              status: false,
              tx: transactionHash,
            });
            bulkUpdateScoreHistories.push({
              address: to,
              event: EVENT_SCORE.TRANSFER_TOKEN,
              score: minusScore,
              timestamp: blockTime * 1000
            })
          }
        }
      }

      await Promise.all([
        histories.length ? this.historiesService.saveTokenHistories(histories) : undefined,
        bulkCreate.length ? this.campaignsService.saveUserCampagignHistories(bulkCreate) : undefined,
        bulkUpdateScore.length ? this.usersService.bulkWrite(bulkUpdateScore) : undefined,
        bulkUpdateScoreHistories.length ? this.usersService.saveUserScoreHistories(bulkUpdateScoreHistories) : undefined,
      ]);
    } catch (err) {
      this.logsService.createLog("JobSyncEventTokenService -> handleEvents: ", err);
    }
  };
}
