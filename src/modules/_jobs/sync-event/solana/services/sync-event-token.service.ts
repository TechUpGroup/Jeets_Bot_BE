import { ContractsService } from "modules/contracts/contracts.service";
import { LogsService } from "modules/logs/logs.service";

import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

import { ContractName } from "common/constants/contract";
import { HistoriesService } from "modules/histories/histories.service";
import { HelperSolanaService } from "./_helper-solana.service";
import { IEventParams } from "../interfaces/helper-solana.interface";
import { Network } from "common/enums/network.enum";
import { EVENT_TOKEN } from "common/constants/event";
import { UsersService } from "modules/users/users.service";
import BigNumber from "bignumber.js";
import { CampaignsService } from "modules/campaigns/campaigns.service";

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
    const [contract, allUsers] = await Promise.all([
      this.contractService.getContractByName(ContractName.POOL, Network.solana),
      this.usersService.getAllUsers(),
    ]);
    if (!contract) return;
    if (this.isRunning[contract.name]) return;
    this.isRunning[contract.name] = true;
    try {
      await this.helperService.excuteSync({
        contract,
        acceptEvents,
        acceptAddress: allUsers.map((a) => a.address),
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
      const { network, contract_address } = contract;
      const txsHashExists = await this.historiesService.findTransactionTokenHashExists(eventHashes);
      const events = this.helperService.filterEvents(listEvents, txsHashExists, network);

      // save database
      const histories: any[] = [];
      const bulkUpdateScore: any[] = [];
      const bulkCreate: any[] = [];
      for (const event of events) {
        const { blockTime, transactionHash, logIndex, account, amount, is_buy, is_send } = event;
        histories.push({
          event: event.event,
          contract_address,
          transaction_hash: transactionHash,
          network,
          log_index: logIndex,
          timestamp: blockTime,
        });
        let minusScore = +BigNumber(amount || "0")
          .dividedBy("10000000000")
          .toFixed(6);
        if (event.event === EVENT_TOKEN.SWAP) {
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
            event: event.event,
            address: account,
            cid: 0,
            start_holders: [],
            amount,
            is_buy, 
            is_send,
            status: false,
          });
        }
        if (event.event === EVENT_TOKEN.TRANSFER) {
        minusScore = !is_send ? minusScore : minusScore * -1;
          bulkUpdateScore.push({
            updateOne: {
              filter: {
                address: account,
              },
              update: {
                $inc: { score: minusScore * -1 },
              },
            },
          });
          bulkCreate.push({
            event: event.event,
            address: account,
            cid: 0,
            start_holders: [],
            amount,
            is_buy, 
            is_send,
            status: false,
          });
        }
      }

      await Promise.all([
        histories.length ? this.historiesService.saveHistories(histories) : undefined,
        bulkCreate.length ? this.campaignsService.saveUserCampagignHistories(bulkCreate) : undefined,
        bulkUpdateScore.length ? this.usersService.bulkWrite(bulkUpdateScore) : undefined,
      ]);
    } catch (err) {
      this.logsService.createLog("JobSyncEventTokenService -> handleEvents: ", err);
    }
  };
}
