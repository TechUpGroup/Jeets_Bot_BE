import { PaginateModel } from "mongoose";

import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";

import {
  AIRDROP_HISTORIES_MODEL,
  AirdropHistories,
  AirdropHistoriesDocument,
  HISTORIES_MODEL,
  Histories,
  HistoriesDocument,
  TOKEN_HISTORIES_MODEL,
  TokenHistories,
  TokenHistoriesDocument,
  VOTING_HISTORIES_MODEL,
  VotingHistories,
  VotingHistoriesDocument,
} from "./schemas/histories.schema";
import { PaginationDtoAndSortDto } from "common/dto/pagination.dto";
import { EVENT } from "common/constants/event";
import { INIT_LOCKED } from "common/constants/asset";
import BigNumber from "bignumber.js";

@Injectable()
export class HistoriesService {
  constructor(
    @InjectModel(HISTORIES_MODEL)
    private readonly historiesModel: PaginateModel<HistoriesDocument>,
    @InjectModel(VOTING_HISTORIES_MODEL)
    private readonly votingHistoriesModel: PaginateModel<VotingHistoriesDocument>,
    @InjectModel(TOKEN_HISTORIES_MODEL)
    private readonly tokenHistoriesModel: PaginateModel<TokenHistoriesDocument>,
    @InjectModel(AIRDROP_HISTORIES_MODEL)
    private readonly airdropHistoriesModel: PaginateModel<AirdropHistoriesDocument>,
  ) {}

  async findTransactionTokenHashExists(hashes: string[]) {
    if (!hashes.length) return [];
    const result = await this.tokenHistoriesModel.find(
      { transaction_hash_index: { $in: hashes } },
      { transaction_hash_index: 1 },
    );
    return result.map((o) => o.transaction_hash_index as string);
  }

  saveTokenHistories(items: TokenHistories | TokenHistories[]) {
    if (Array.isArray(items)) {
      return this.tokenHistoriesModel.insertMany(items);
    }
    return this.tokenHistoriesModel.create(items);
  }

  async findTransactionVotingHashExists(hashes: string[]) {
    if (!hashes.length) return [];
    const result = await this.votingHistoriesModel.find(
      { transaction_hash_index: { $in: hashes } },
      { transaction_hash_index: 1 },
    );
    return result.map((o) => o.transaction_hash_index as string);
  }

  saveVotingHistories(items: VotingHistories | VotingHistories[]) {
    if (Array.isArray(items)) {
      return this.votingHistoriesModel.insertMany(items);
    }
    return this.votingHistoriesModel.create(items);
  }

  async findTransactionAirdropHashExists(hashes: string[]) {
    if (!hashes.length) return [];
    const result = await this.airdropHistoriesModel.find(
      { transaction_hash_index: { $in: hashes } },
      { transaction_hash_index: 1 },
    );
    return result.map((o) => o.transaction_hash_index as string);
  }

  saveAirdropHistories(items: AirdropHistories | AirdropHistories[]) {
    if (Array.isArray(items)) {
      return this.airdropHistoriesModel.insertMany(items);
    }
    return this.airdropHistoriesModel.create(items);
  }

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
          totalTransfer: { $sum: "$transfer_amount" },
        },
      },
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
