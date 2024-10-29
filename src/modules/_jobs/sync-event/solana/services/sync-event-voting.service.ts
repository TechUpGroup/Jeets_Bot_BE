import { ContractsService } from "modules/contracts/contracts.service";
import { LogsService } from "modules/logs/logs.service";

import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

import { ContractName } from "common/constants/contract";
import { EVENT_VOTING } from "common/constants/event";
import { HistoriesService } from "modules/histories/histories.service";
import { HelperSolanaService } from "./_helper-solana.service";
import { SolanasService } from "modules/_shared/services/solana.service";
import { Network } from "common/enums/network.enum";
import { votingIDL } from "common/idl/pool";
import { IEventParams } from "../interfaces/helper-solana.interface";
import { VotingsService } from "modules/votings/votings.service";
const acceptEvents = [EVENT_VOTING.VOTED];

@Injectable()
export class JobSyncEventVotingService {
  constructor(
    private readonly logsService: LogsService,
    private readonly solanasService: SolanasService,
    private readonly contractService: ContractsService,
    private readonly helperService: HelperSolanaService,
    private readonly historiesService: HistoriesService,
    private readonly votingsService: VotingsService,
  ) {}
  private isRunning = {};

  @Cron(CronExpression.EVERY_5_SECONDS)
  private async start() {
    const contracts = await this.contractService.getAllContractsByName(ContractName.VOTE, Network.solana);
    if (!contracts.length) return;
    for (const contract of contracts) {
      if (this.isRunning[contract.contract_address]) continue;
      this.isRunning[contract.contract_address] = true;
      try {
        const eventParser = this.solanasService.eventParserVoting(Network.solana, votingIDL);
        await this.helperService.excuteSync({
          contract,
          acceptEvents,
          eventParser,
          callback: this.handleEvents,
        });
      } catch (err) {
        console.log(err);
        this.logsService.createLog("JobSyncEventVotingService -> start: ", err);
      } finally {
        delete this.isRunning[contract.contract_address];
      }
    }
  }

  private handleEvents = async ({ events: listEvents, contract, eventHashes }: IEventParams) => {
    try {
      if (!listEvents.length) return;
      const { network, contract_address } = contract;
      const txsHashExists = await this.historiesService.findTransactionVotingHashExists(eventHashes);
      const events = this.helperService.filterEvents(listEvents, txsHashExists, network);

      // save database
      const histories: any[] = [];
      const bulkCreate: any[] = [];
      for (const event of events) {
        const { blockTime, transactionHash, logIndex, account, uid, sessionId } = event;
        const history = {
          transaction_hash: transactionHash,
          network,
          log_index: logIndex,
          timestamp: blockTime,
        };
        if (event.event === EVENT_VOTING.VOTED) {
          histories.push({
            ...history,
            contract_address,
            event: EVENT_VOTING.VOTED,
          });
          bulkCreate.push({
            address: account,
            wid: uid,
            vid: sessionId,
            timestamp: blockTime,
          })
        }
      }

      await Promise.all([
        histories.length ? this.historiesService.saveVotingHistories(histories) : undefined,
        bulkCreate.length ? this.votingsService.processVoting(bulkCreate) : undefined,
      ]);
    } catch (err) {
      this.logsService.createLog("JobSyncEventVotingService -> handleEvents: ", err);
    }
  };
}
