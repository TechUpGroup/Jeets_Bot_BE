import { Network } from "common/enums/network.enum";
import { callTimeExecute } from "common/utils";
import { SolanasService, SolanaEvents } from "modules/_shared/services/solana.service";
import { ContractsService } from "modules/contracts/contracts.service";

import { Injectable } from "@nestjs/common";

import { ContractParams } from "../interfaces/helper-solana.interface";
import { web3 } from "@project-serum/anchor";
import { ContractName } from "common/constants/contract";

@Injectable()
export class HelperSolanaService {
  constructor(private readonly contractService: ContractsService, private readonly solanasService: SolanasService) {}

  filterEvents(events: SolanaEvents[], txsHashExists: string[], network: Network) {
    return events.filter(
      ({ transactionHash, logIndex }) => !txsHashExists.includes(`${transactionHash}_${logIndex}_${network}`),
    );
  }

  async excuteSync(params: ContractParams) {
    const { contract, callback } = params;
    const { _id, contract_address } = contract;
    const startTime = process.hrtime();
    const { tx_synced, events, eventHashes } = await this.getEvents(params);
    if (!tx_synced) return;
    const endTime = callTimeExecute(startTime);

    // excute logic
    void (await callback({ events, contract, eventHashes }));

    // update blocknumber synced
    await this.contractService.updateSignatureSynced(_id, tx_synced);

    // save logs
    const message = `(${Math.round(endTime)}ms || ${callTimeExecute(startTime)}ms)`;
    const info: string = contract_address.substring(contract_address.length - 6);
    console.info(`${info} => ${tx_synced.substring(tx_synced.length - 6)}: ${events.length} events ${message}`);
  }

  /****************************************************/

  private getEvents = async ({ contract, eventParser }: ContractParams) => {
    const { tx_synced, contract_address, network, name } = contract;

    let res: any;
    if (eventParser) {
      if (name === ContractName.POOL) {
        res = await this.solanasService.getAllEventTransactions(
          network,
          eventParser,
          new web3.PublicKey(contract_address),
          tx_synced,
        );
      }
      if (name === ContractName.VOTE) {
        res = await this.solanasService.getAllEventVotingTransactions(
          network,
          eventParser,
          new web3.PublicKey(contract_address),
          tx_synced,
        );
      }
    } else {
      res = await this.solanasService.getAllEventTransferToken(
        network,
        new web3.PublicKey(contract_address),
        tx_synced,
      );
    }

    const eventHashes = res.solanaEvents.map(
      ({ transactionHash, logIndex }) => `${transactionHash}_${logIndex}_${network}`,
    );
    return { tx_synced: res.signatureLatest, events: res.solanaEvents, eventHashes };
  };
}
