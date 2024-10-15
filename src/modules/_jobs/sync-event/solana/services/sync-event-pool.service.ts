import { ContractsService } from "modules/contracts/contracts.service";
import { LogsService } from "modules/logs/logs.service";

import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

import { ContractName } from "common/constants/contract";
import { EVENT } from "common/constants/event";
import { HistoriesService } from "modules/histories/histories.service";
import { HelperSolanaService } from "./_helper-solana.service";
import { SolanasService } from "modules/_shared/services/solana.service";
import idl from "common/idl/pool.json";
import { IEventParams } from "../interfaces/helper-solana.interface";
import { Network } from "common/enums/network.enum";
const acceptEvents = [EVENT.OPERATOR_TRANSFER];

@Injectable()
export class JobSyncEventService {
  constructor(
    private readonly logsService: LogsService,
    private readonly solanasService: SolanasService,
    private readonly contractService: ContractsService,
    private readonly helperService: HelperSolanaService,
    private readonly historiesService: HistoriesService,
  ) {}
  private isRunning = {};

  @Cron(CronExpression.EVERY_5_SECONDS)
  private async start() {
    const contract = await this.contractService.getContractByName(ContractName.POOL, Network.solana);
    if (!contract) return;
    if (this.isRunning[contract.name]) return;
    this.isRunning[contract.name] = true;
    try {
      const eventParser = this.solanasService.eventParser(contract.network, idl);
      await this.helperService.excuteSync({
        contract,
        acceptEvents,
        eventParser,
        callback: this.handleEvents,
      });
    } catch (err) {
      this.solanasService.switchRPC();
      this.logsService.createLog("JobSyncEventService -> start: ", err);
    } finally {
      delete this.isRunning[contract.name];
    }
  }

  private handleEvents = async ({ events: listEvents, contract, eventHashes }: IEventParams) => {
    try {
      if (!listEvents.length) return;
      const { network } = contract;
      const txsHashExists = await this.historiesService.findTransactionHashExists(eventHashes);
      const events = this.helperService.filterEvents(listEvents, txsHashExists, network);

      // save database
      const histories: any[] = [];
      for (const event of events) {
        const { blockTime, transactionHash, logIndex, remain, transfer_amount } = event;
        const history = {
          transaction_hash: transactionHash,
          network,
          log_index: logIndex,
          block_number: blockTime,
        };
        if (event.event === EVENT.OPERATOR_TRANSFER) {
          histories.push({
            ...history,
            event: EVENT.OPERATOR_TRANSFER,
            timestamp: blockTime,
            remain,
            transfer_amount
          });
        }
      }

      await Promise.all([
        histories.length ? this.historiesService.saveHistories(histories) : undefined,
      ]);
    } catch (err) {
      this.logsService.createLog("JobSyncEventService -> handleEvents: ", err);
    }
  };
}
