import config from "common/config";
import { allNetworks } from "common/constants/network";
import { Network } from "common/enums/network.enum";
import { PaginateModel } from "mongoose";

import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";

import { Contracts, CONTRACTS_MODEL, ContractsDocument } from "./schemas/contracts.schema";
import { ContractName } from "common/constants/contract";

@Injectable()
export class ContractsService {
  constructor(
    @InjectModel(CONTRACTS_MODEL)
    private readonly contractModel: PaginateModel<ContractsDocument>,
  ) {
    void this.initContract();
  }

  async createContract(doc: Contracts) {
    return await this.contractModel.create(doc);
  }

  async updateSignatureSynced(_id: string, tx_synced: string) {
    return await this.contractModel.updateOne({ _id }, { tx_synced });
  }

  async checkContractExist(contract_address: string, network: Network) {
    return !!(await this.contractModel.findOne({ contract_address, network }));
  }

  async getContractByName(name: ContractName, network?: Network) {
    const query: any = { name };
    if (network) {
      query.network = network;
    }
    return await this.contractModel.findOne(query);
  }

  async getAllContractsByName(name: ContractName, network?: Network) {
    const query: any = { name };
    if (network) {
      query.network = network;
    }
    return await this.contractModel.find(query);
  }

  async getContractByNames(names: ContractName[], network?: Network) {
    const query: any = { name: { $in: names } };
    if (network) {
      query.network = network;
    }
    return await this.contractModel.find(query);
  }

  getListContract(network?: Network) {
    const query: any = {};
    if (network) {
      query.network = network;
    }
    return this.contractModel.find(query, {
      _id: 0,
      contract_address: 1,
      name: 1,
      network: 1,
    });
  }

  async initContract() {
    try {
      const contractCreate: {
        contract_address: string;
        tx_synced?: string;
        total_supply?: string;
        name: ContractName;
        network: Network;
      }[] = [];

      for (const network of allNetworks) {
        for (const address of config.getContract().pools) {
          contractCreate.push({
            contract_address: address,
            tx_synced: undefined,
            name: ContractName.POOL,
            network,
          });
        }
        for (const address of config.getContract().votes) {
          contractCreate.push({
            contract_address: address,
            tx_synced: undefined,
            name: ContractName.VOTE,
            network,
          });
        }
      }
      for (const network of allNetworks) {
        for (const address of config.getContract().pools) {
          contractCreate.push({
            contract_address: address,
            tx_synced: undefined,
            name: ContractName.POOL,
            network,
          });
        }
      }
      for (const network of allNetworks) {
        for (const address of config.getContract().pools) {
          contractCreate.push({
            contract_address: address,
            tx_synced: undefined,
            name: ContractName.POOL,
            network,
          });
        }
      }
      for (const network of allNetworks) {
        for (const { mint, totalSupply } of config.getContract().tokens) {
          contractCreate.push({
            contract_address: mint,
            tx_synced: undefined,
            name: ContractName.TOKEN,
            total_supply: totalSupply,
            network,
          });
        }
      }

      for (const contract of contractCreate) {
        const { contract_address, network } = contract;
        if (!contract_address) continue;
        if (!(await this.checkContractExist(contract_address, network))) {
          await this.createContract(contract);
        }
      }
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  }
}
