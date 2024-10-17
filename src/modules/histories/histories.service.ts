import { PaginateModel } from "mongoose";

import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";

import { HISTORIES_MODEL, Histories, HistoriesDocument } from "./schemas/histories.schema";
import { PaginationDtoAndSortDto } from "common/dto/pagination.dto";
import { EVENT } from "common/constants/event";
import { INIT_LOCKED } from "common/constants/asset";
import BigNumber from "bignumber.js";

@Injectable()
export class HistoriesService {
  constructor(
    @InjectModel(HISTORIES_MODEL)
    private readonly historiesModel: PaginateModel<HistoriesDocument>,
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
    const res = await this.historiesModel.aggregate([
      {
        $group: {
          _id: null,
          totalTransfer: { $sum: "$transfer_amount" }
        }
      }
    ]);
    return res.length ? BigNumber(INIT_LOCKED).minus(res[0].totalTransfer.toString()).toFixed() : INIT_LOCKED.toFixed();
  }

  histories(query: PaginationDtoAndSortDto) {
    const { limit, page, sortBy = "timestamp", sortType = -1 } = query;
    const aggregate = this.historiesModel.aggregate([
      {
        $match: {
          event: EVENT.OPERATOR_TRANSFER,
        },
      },
      {
        $sort: {
          [sortBy]: sortType,
        },
      },
      {
        $project: {
          _id: 0,
          transaction_hash: 1,
          timestamp: 1,
          remain: { $toString: "$remain" },
          transfer_amount: { $toString: "$transfer_amount" },
        },
      },
    ]);
    return this.historiesModel.aggregatePaginate(aggregate, { limit, page });
  }
}
