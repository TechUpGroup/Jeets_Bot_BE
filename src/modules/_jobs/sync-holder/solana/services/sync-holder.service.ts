import { ContractsService } from "modules/contracts/contracts.service";
import { LogsService } from "modules/logs/logs.service";

import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

import { ContractName } from "common/constants/contract";
import { Network } from "common/enums/network.enum";
import BigNumber from "bignumber.js";
import { HoldersService } from "modules/holders/holders.service";
import { diffDay, onDay } from "common/utils";

@Injectable()
export class JobSyncHolderService {
  constructor(
    private readonly logsService: LogsService,
    private readonly contractService: ContractsService,
    private readonly holdersService: HoldersService,
  ) {}
  private isRunning = {};

  @Cron(CronExpression.EVERY_30_MINUTES)
  private async start() {
    const contracts = await this.contractService.getAllContractsByName(ContractName.TOKEN, Network.solana);
    if (!contracts.length) return;
    for (const contract of contracts) {
      const mint = contract.contract_address;
      const totalSupply = contract.total_supply || "0";
      if (this.isRunning[mint]) continue;
      this.isRunning[mint] = true;
      try {
        const hodlers = await this.findHolders(mint);
        await this.processHolder(contract.network, mint, hodlers, totalSupply);
      } catch (err) {
        console.log(err);
        this.logsService.createLog("JobSyncHolderService -> start: ", err);
      } finally {
        delete this.isRunning[mint];
      }
    }
  }

  private async findHolders(mint: string) {
    let page = 1;
    const holders: any[] = [];

    while (true) {
      const response = await fetch("https://mainnet.helius-rpc.com/?api-key=551c2f41-1a34-4a97-931b-ca311af626ce", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "getTokenAccounts",
          id: "helius-test",
          params: {
            page: page,
            limit: 1000,
            displayOptions: {},
            mint,
          },
        }),
      });
      const data = await response.json();

      if (!data.result || data.result.token_accounts.length === 0) {
        return holders;
      }
      data.result.token_accounts.forEach((account) => holders.push(account));
      page++;
    }
  }

  private async processHolder(network: Network, mint: string, holders: any[], totalSupply: string) {
    const timestamp = new Date();
    const bulkUpdate: any[] = [];
    const holdersSaved = await this.holdersService.holders(network, mint);
    for (const holder of holders) {
      const found = holdersSaved.find(a => a.owner === holder.owner);
      const inc = found ? onDay(timestamp, new Date(found.last_updated)) ? 0 : diffDay(timestamp, new Date(found.last_updated)) : 1;
      bulkUpdate.push({
        updateOne: {
          filter: {
            network,
            owner: holder.owner,
          },
          update: {
            network,
            mint: holder.mint,
            owner: holder.owner,
            last_updated: timestamp.getTime(),
            amount: holder.amount,
            ...(BigNumber(holder.amount).gte(BigNumber(totalSupply).multipliedBy(0.001).toFixed())
              ? { $inc: { day_streak_holder: inc } }
              : { $set: { day_streak_holder: 0 } }),
          },
          upsert: true,
        },
      });
    }
    await Promise.all([
      bulkUpdate.length ? this.holdersService.bulkWrite(bulkUpdate) : undefined
    ])
  }
}
