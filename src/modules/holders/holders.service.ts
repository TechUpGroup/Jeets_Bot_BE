import { PaginateModel, Types } from "mongoose";

import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";

import { HOLDERS_MODEL, HoldersDocument } from "./schemas/holders.schema";
import { Network } from "common/enums/network.enum";
import { UsersDocument } from "modules/users/schemas/users.schema";
import { ContractName } from "common/constants/contract";
import BigNumber from "bignumber.js";
import { ContractsService } from "modules/contracts/contracts.service";
import { AMOUNT_PER_SCORE } from "common/constants/asset";

@Injectable()
export class HoldersService {
  constructor(
    @InjectModel(HOLDERS_MODEL)
    private readonly holdersModel: PaginateModel<HoldersDocument>,
    private readonly contractsService: ContractsService,
  ) {}

  bulkWrite(bulkUpdate: any[]) {
    return this.holdersModel.bulkWrite(bulkUpdate);
  }

  holders(network: Network, mint: string) {
    return this.holdersModel.find({ network, mint }, { owner: 1, last_updated: 1 });
  }

  holder(network: Network, mint: string, owner: string) {
    return this.holdersModel.findOne({ network, mint, owner }, { amount: 1 });
  }

  userHolders(network: Network, mints: string[], allAvailableAddresses: string[]) {
    return this.holdersModel.find(
      {
        $and: [{ network }, { mint: { $in: mints } }, { owner: { $in: allAvailableAddresses } }],
      },
      { mint: 1, owner: 1, amount: 1 },
    );
  }

  userHolderParticipateds(network: Network, mints: string[], addressParticipated: string[]) {
    return this.holdersModel.find(
      { network, mint: { $in: mints }, owner: { $in: addressParticipated } },
      { mint: 1, owner: 1, amount: 1 },
    );
  }

  userHolder(user: UsersDocument) {
    return this.holdersModel.find({ network: Network.solana, owner: user.address }, { mint: 1, owner: 1, amount: 1 });
  }

  async checkHolder(user: UsersDocument) {
    const [holders, { holdRequires }] = await Promise.all([
      this.userHolder(user),
      this.contractsService.getContractInfosByName(ContractName.TOKEN),
    ]);
    if (!holders.length || holders.every((a) => BigNumber(a.amount.toString()).lt(holdRequires[a.mint]))) {
      return false;
    }
    return true;
  }

  async startTotalScore(user: UsersDocument) {
    const [holders, { symbols, decimals }] = await Promise.all([
      this.userHolder(user),
      this.contractsService.getContractInfosByName(ContractName.TOKEN),
    ]);
    let totalSscore = 0;
    const tokenInfos: any[] = [];
    for (const holder of holders) {
      const score = +BigNumber(holder.amount.toString())
        .dividedBy(
          BigNumber(AMOUNT_PER_SCORE)
            .multipliedBy(Math.pow(10, decimals[holder.mint] || 6))
            .toFixed(0),
        )
        .toFixed(decimals[holder.mint] || 6);
      totalSscore = totalSscore + score;
      tokenInfos.push({
        mint: holder.mint,
        symbol: symbols[holder.mint],
        decimal: decimals[holder.mint],
        amount: holder.amount.toString(),
        score,
      });
    }
    return { totalSscore, tokenInfos };
  }
}
