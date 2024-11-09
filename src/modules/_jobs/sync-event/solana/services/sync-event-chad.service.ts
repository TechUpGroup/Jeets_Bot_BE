import { ContractsService } from "modules/contracts/contracts.service";
import { LogsService } from "modules/logs/logs.service";

import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

import { ContractName } from "common/constants/contract";
import { EVENT_CHAD } from "common/constants/event";
import { HistoriesService } from "modules/histories/histories.service";
import { HelperSolanaService } from "./_helper-solana.service";
import { SolanasService } from "modules/_shared/services/solana.service";
import { Network } from "common/enums/network.enum";
import { vaultIDL } from "common/idl/pool";
import { IEventParams } from "../interfaces/helper-solana.interface";
import { UsersService } from "modules/users/users.service";
import { WithdrawsService } from "modules/withdraw/withdraw.service";
const acceptEvents = [EVENT_CHAD.DEPOSITED, EVENT_CHAD.CLAIMED];

@Injectable()
export class JobSyncEventChadService {
  constructor(
    private readonly logsService: LogsService,
    private readonly solanasService: SolanasService,
    private readonly contractService: ContractsService,
    private readonly helperService: HelperSolanaService,
    private readonly historiesService: HistoriesService,
    private readonly usersService: UsersService,
    private readonly withdrawsService: WithdrawsService,
  ) {}
  private isRunning = {};

  @Cron(CronExpression.EVERY_5_SECONDS)
  private async startDepoit() {
    const contracts = await this.contractService.getAllContractsByName(ContractName.CHAD_DEPOSIT, Network.solana);
    if (!contracts.length) return;
    for (const contract of contracts) {
      if (this.isRunning[contract.contract_address]) continue;
      this.isRunning[contract.contract_address] = true;
      try {
        await this.helperService.excuteSync({
          contract,
          acceptEvents,
          eventParser: undefined,
          callback: this.handleEvents,
        });
      } catch (err) {
        console.log(err);
        this.logsService.createLog("JobSyncEventChadService -> start: ", err);
      } finally {
        delete this.isRunning[contract.contract_address];
      }
    }
  }

  @Cron(CronExpression.EVERY_5_SECONDS)
  private async startClaim() {
    const contracts = await this.contractService.getAllContractsByName(ContractName.CHAD_CLAIM, Network.solana);
    if (!contracts.length) return;
    for (const contract of contracts) {
      if (this.isRunning[contract.contract_address]) continue;
      this.isRunning[contract.contract_address] = true;
      try {
        vaultIDL.address = contract.contract_address; 
        const eventParser = this.solanasService.eventParserAirdrop(Network.solana, vaultIDL);
        await this.helperService.excuteSync({
          contract,
          acceptEvents,
          eventParser,
          callback: this.handleEvents,
        });
      } catch (err) {
        console.log(err);
        this.logsService.createLog("JobSyncEventChadService -> start: ", err);
      } finally {
        delete this.isRunning[contract.contract_address];
      }
    }
  }

  private handleEvents = async ({ events: listEvents, contract, eventHashes }: IEventParams) => {
    try {
      if (!listEvents.length) return;
      const { network, contract_address } = contract;
      const txsHashExists = await this.historiesService.findTransactionChadHashExists(eventHashes);
      const events = this.helperService.filterEvents(listEvents, txsHashExists, network);

      // save database
      const histories: any[] = [];
      const bulkDeposited: any[] = [];
      const bulkUpdateClaimed: any[] = [];
      for (const event of events) {
        const { blockTime, transactionHash, logIndex } = event;
        const history = {
          transaction_hash: transactionHash,
          network,
          log_index: logIndex,
          timestamp: blockTime,
          contract_address
        };
        if (event.event === EVENT_CHAD.DEPOSITED) {
          const { account, amount } = event;
          histories.push({
            ...history,
            event: EVENT_CHAD.DEPOSITED,
          });
          bulkDeposited.push({
            updateOne: {
              filter: {
                address: account
              },
              update: {
                $inc: { sol_deposited: amount || "0" }
              }
            }
          })
        }
        if (event.event === EVENT_CHAD.CLAIMED) {
          const {
            nonce,
          } = event;
          histories.push({
            ...history,
            event: EVENT_CHAD.CLAIMED,
          });
          bulkUpdateClaimed.push({
            updateOne: {
              filter: {
                nonce
              },
              update: {
                success: true
              }
            }
          })
        }
      }

      await Promise.all([
        histories.length ? this.historiesService.saveChadHistories(histories) : undefined,
        bulkDeposited.length ? this.usersService.bulkWrite(bulkDeposited) : undefined,
        bulkUpdateClaimed.length ? this.withdrawsService.bulkWithdraw(bulkUpdateClaimed) : undefined,
      ]);

    } catch (err) {
      this.logsService.createLog("JobSyncEventChadService -> handleEvents: ", err);
    }
  };
}
