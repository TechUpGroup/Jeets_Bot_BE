import { ContractsService } from "modules/contracts/contracts.service";
import { LogsService } from "modules/logs/logs.service";

import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

import { ContractName } from "common/constants/contract";
import { EVENT } from "common/constants/event";
import { HistoriesService } from "modules/histories/histories.service";
import { HelperSolanaService } from "./_helper-solana.service";
import { SolanasService } from "modules/_shared/services/solana.service";
import { IEventParams } from "../interfaces/helper-solana.interface";
import { Network } from "common/enums/network.enum";
import { common } from "common/idl/pool";
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

  @Cron(CronExpression.EVERY_10_SECONDS)
  private async start() {
    const contracts = await this.contractService.getAllContractsByName(ContractName.POOL, Network.solana);
    if (!contracts.length) return;
    for (const contract of contracts) {
      if (this.isRunning[contract.contract_address]) continue;
      this.isRunning[contract.contract_address] = true;
      try {
        common.address = contract.contract_address;
        const eventParser = this.solanasService.eventParser(Network.solana, common);
        await this.helperService.excuteSync({
          contract,
          acceptEvents,
          eventParser,
          callback: this.handleEvents,
        });
      } catch (err) {
        console.log(err);
        this.logsService.createLog("JobSyncEventService -> start: ", err);
      } finally {
        delete this.isRunning[contract.contract_address];
      }
    }
  }

  private handleEvents = async ({ events: listEvents, contract, eventHashes }: IEventParams) => {
    try {
      if (!listEvents.length) return;
      const { network, contract_address } = contract;
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
          timestamp: blockTime,
        };
        if (event.event === EVENT.OPERATOR_TRANSFER) {
          histories.push({
            ...history,
            contract_address,
            event: EVENT.OPERATOR_TRANSFER,
            remain,
            transfer_amount,
          });
        }
      }

      await Promise.all([histories.length ? this.historiesService.saveHistories(histories) : undefined]);
    } catch (err) {
      this.logsService.createLog("JobSyncEventService -> handleEvents: ", err);
    }
  };
}
