import { ContractsService } from "modules/contracts/contracts.service";
import { LogsService } from "modules/logs/logs.service";

import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

import { ContractName } from "common/constants/contract";
import { EVENT_AIRDROP } from "common/constants/event";
import { HistoriesService } from "modules/histories/histories.service";
import { HelperSolanaService } from "./_helper-solana.service";
import { SolanasService } from "modules/_shared/services/solana.service";
import { Network } from "common/enums/network.enum";
import { vaultIDL } from "common/idl/pool";
import { IEventParams } from "../interfaces/helper-solana.interface";
import { CampaignsService } from "modules/campaigns/campaigns.service";
const acceptEvents = [EVENT_AIRDROP.CLAIM];

@Injectable()
export class JobSyncEventAirdropService {
  constructor(
    private readonly logsService: LogsService,
    private readonly solanasService: SolanasService,
    private readonly contractService: ContractsService,
    private readonly helperService: HelperSolanaService,
    private readonly historiesService: HistoriesService,
    private readonly campaignsService: CampaignsService,
  ) {}
  private isRunning = {};

  @Cron(CronExpression.EVERY_5_SECONDS)
  private async start() {
    const contracts = await this.contractService.getAllContractsByName(ContractName.AIRDROP, Network.solana);
    if (!contracts.length) return;
    for (const contract of contracts) {
      if (this.isRunning[contract.contract_address]) continue;
      this.isRunning[contract.contract_address] = true;
      try {
        const eventParser = this.solanasService.eventParserAirdrop(Network.solana, vaultIDL);
        await this.helperService.excuteSync({
          contract,
          acceptEvents,
          eventParser,
          callback: this.handleEvents,
        });
      } catch (err) {
        console.log(err);
        this.logsService.createLog("JobSyncEventAirdropService -> start: ", err);
      } finally {
        delete this.isRunning[contract.contract_address];
      }
    }
  }

  private handleEvents = async ({ events: listEvents, contract, eventHashes }: IEventParams) => {
    try {
      if (!listEvents.length) return;
      const { network, contract_address } = contract;
      const txsHashExists = await this.historiesService.findTransactionAirdropHashExists(eventHashes);
      const events = this.helperService.filterEvents(listEvents, txsHashExists, network);

      // save database
      const histories: any[] = [];
      const bulkUpdate: any[] = [];
      for (const event of events) {
        const { blockTime, transactionHash, logIndex, nonce } = event;
        const history = {
          transaction_hash: transactionHash,
          network,
          log_index: logIndex,
          timestamp: blockTime,
        };
        if (event.event === EVENT_AIRDROP.CLAIM) {
          histories.push({
            ...history,
            contract_address,
            event: EVENT_AIRDROP.CLAIM,
          });
          bulkUpdate.push({
            updateOne: {
              filter: {
                nonce
              },
              update: {
                status: true,
                tx: transactionHash,
              }
            }
          })
        }
      }

      await Promise.all([
        histories.length ? this.historiesService.saveAirdropHistories(histories) : undefined,
        bulkUpdate.length ? this.campaignsService.bulkUpdateAirdrop(bulkUpdate) : undefined,
      ]);
    } catch (err) {
      this.logsService.createLog("JobSyncEventAirdropService -> handleEvents: ", err);
    }
  };
}
