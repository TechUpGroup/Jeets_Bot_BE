import config from "common/config";
import { allNetworks } from "common/constants/network";
import { Network } from "common/enums/network.enum";
import { PaginateModel } from "mongoose";

import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";

import { Contracts, CONTRACTS_MODEL, ContractsDocument } from "./schemas/contracts.schema";
import { ContractName } from "common/constants/contract";
import { Detail } from "aws-sdk/clients/forecastservice";
import { Details } from "modules/campaigns/dto/campaigns.dto";
import { ContractsDto } from "./dto/contracts.dto";

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

  getContractInfo(contract_address: string, network: Network) {
    return  this.contractModel.findOne({ contract_address, network });
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

  async getContractInfosByName(name: ContractName, network?: Network) {
    const res = await this.getAllContractsByName(name);
    const holdRequires: any = {};
    const symbols: any = {};
    const decimals: any = {};
    res.forEach((a) => {
      holdRequires[a.contract_address] = a.require_hold;
      symbols[a.contract_address] = a.symbol;
      decimals[a.contract_address] = a.decimal;
    });
    return { holdRequires, symbols, decimals };
  }

  async getListHoldTokenRequire(query: ContractsDto) {
    const { mint } = query;
    const match: any = { name: ContractName.TOKEN };
    if (mint) {
      match.contract_address = mint;
    }
    return this.contractModel.find(match, { contract_address: 1, symbol: 1, decimal: 1, require_hold: 1 });
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

  async createContracts(datas: Details[]) {
    {
      const contractCreate: {
        contract_address: string;
        tx_synced?: string;
        total_supply?: string;
        decimal?: number;
        symbol?: string;
        name: ContractName;
        network: Network;
      }[] = [];

      for (const { mint, totalSupply, decimal, symbol } of datas) {
        contractCreate.push({
          contract_address: mint,
          tx_synced: undefined,
          name: ContractName.TOKEN,
          total_supply: totalSupply,
          decimal,
          symbol,
          network: Network.solana,
        });
      }

      for (const contract of contractCreate) {
        const { contract_address, network } = contract;
        if (!contract_address) continue;
        if (!(await this.checkContractExist(contract_address, network))) {
          await this.createContract(contract);
        }
      }
    }
  }

  async initContract() {
    try {
      const contractCreate: {
        contract_address: string;
        tx_synced?: string;
        total_supply?: string;
        decimal?: number;
        symbol?: string;
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
        for (const address of config.getContract().airdrops) {
          contractCreate.push({
            contract_address: address,
            tx_synced: undefined,
            name: ContractName.AIRDROP,
            network,
          });
        }
        for (const address of config.getContract().chadClaimeds) {
          contractCreate.push({
            contract_address: address,
            tx_synced: undefined,
            name: ContractName.CHAD_CLAIM,
            network,
          });
        }
        for (const address of config.getContract().chadDeposteds) {
          contractCreate.push({
            contract_address: address,
            tx_synced: undefined,
            name: ContractName.CHAD_DEPOSIT,
            network,
          });
        }
      }
      for (const network of allNetworks) {
        for (const { mint, totalSupply, decimal, symbol } of config.getContract().tokens) {
          contractCreate.push({
            contract_address: mint,
            tx_synced: undefined,
            name: ContractName.TOKEN,
            total_supply: totalSupply,
            decimal,
            symbol,
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
