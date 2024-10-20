import { PaginateModel } from "mongoose";

import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";

import { HOLDERS_MODEL, Holders, HoldersDocument } from "./schemas/holders.schema";
import { PaginationDtoAndSortDto } from "common/dto/pagination.dto";
import { EVENT } from "common/constants/event";
import { INIT_LOCKED } from "common/constants/asset";
import BigNumber from "bignumber.js";
import { Network } from "common/enums/network.enum";

@Injectable()
export class HoldersService {
  constructor(
    @InjectModel(HOLDERS_MODEL)
    private readonly holdersModel: PaginateModel<HoldersDocument>,
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
}
