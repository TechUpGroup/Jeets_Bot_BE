import { PaginateModel } from "mongoose";

import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";

import {
  HISTORIES_MODEL,
  Histories,
  HistoriesDocument,
} from "./schemas/histories.schema";
import { SolanasService } from "modules/_shared/services/solana.service";
import { Network } from "common/enums/network.enum";

@Injectable()
export class HistoriesService {
  constructor(
    @InjectModel(HISTORIES_MODEL)
    private readonly historiesModel: PaginateModel<HistoriesDocument>,
    private readonly solanasService: SolanasService,
  ) {}

  async findTransactionHashExists(hashes: string[]) {
    if (!hashes.length) return [];
    const result = await this.historiesModel.find(
      { transaction_hash_index: { $in: hashes } },
      { transaction_hash_index: 1 },
    );
    return result.map((o) => o.transaction_hash_index as string);
  }

  saveHistories(items: Histories | Histories[]) {
    if (Array.isArray(items)) {
      return this.historiesModel.insertMany(items);
    }
    return this.historiesModel.create(items);
  }

  async remainAmount() {
    const res = await this.historiesModel.find().sort({ timestamp: -1 }).limit(1);
    let amount =  res.length ? res[0].remain.toString() : 0;
    if (!res.length) {
      amount = await this.solanasService.getTokenAccountBalance(Network.solana);
    }
    return amount;
  }

}
