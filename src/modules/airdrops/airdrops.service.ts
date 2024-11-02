import { PaginateModel } from "mongoose";

import { BadRequestException, forwardRef, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";

import { UsersDocument } from "modules/users/schemas/users.schema";
import config from "common/config";
import { CreateNewAirdropDto, UpdateAirdropDto } from "./dto/airdrops.dto";
import { PaginationDtoAndSortDto } from "common/dto/pagination.dto";
import { USER_AIRDROPS_MODEL, UserAirdrops, UserAirdropsDocument } from "./schemas/user-airdrops.schema";
import { SolanasService } from "modules/_shared/services/solana.service";
import { AIRDROPS_MODEL, AirdropsDocument } from "./schemas/airdrops.schema";

@Injectable()
export class AirdropsService {
  constructor(
    @InjectModel(USER_AIRDROPS_MODEL)
    private readonly userAirdropsModel: PaginateModel<UserAirdropsDocument>,
    @InjectModel(AIRDROPS_MODEL)
    private readonly airdropsModel: PaginateModel<AirdropsDocument>,
    private readonly solanasService: SolanasService,
  ) {}

  saveUserAirdropHistories(items: UserAirdrops | UserAirdrops[]) {
    if (Array.isArray(items)) {
      return this.userAirdropsModel.insertMany(items);
    }
    return this.userAirdropsModel.create(items);
  }

  bulkUpdateAirdrop(bulkUpdate: any[]) {
    return this.userAirdropsModel.bulkWrite(bulkUpdate);
  }

  async createNewAirdrop(auth: string, body: CreateNewAirdropDto) {
    if (auth !== config.admin) {
      throw new UnauthorizedException("Not permission");
    }
    try {
      return this.airdropsModel.create(body);
    } catch (e) {
      throw new BadRequestException(e);
    }
  }

  async updateAirdrop(auth: string, rank: number, body: UpdateAirdropDto) {
    if (auth !== config.admin) {
      throw new UnauthorizedException("Not permission");
    }
    try {
      return this.airdropsModel.findOneAndUpdate({ rank }, { ...body }, { new: true });
    } catch (e) {
      throw new BadRequestException(e);
    }
  }

  airdropInfos() {
    return this.airdropsModel.find({ status: true });
  }

  async getListAirdrops(user: UsersDocument, query: PaginationDtoAndSortDto) {
    const { limit, page, sortBy = "timestamp", sortType = -1 } = query;
    const aggregate = this.userAirdropsModel.aggregate([
      {
        $match: {
          address: user.address,
        },
      },
      {
        $sort: {
          [sortBy]: sortType,
        },
      },
      {
        $project: {
          address: 1,
          vid: 1,
          timestamp: 1,
          status: 1,
          tx: 1,
          detail: {
            mint: "$detail.mint",
            symbol: "$detail.symbol",
            decimal: "$detail.decimal",
            amount: { $toString: "$detail.amount" },
          },
        },
      },
    ]);
    return this.userAirdropsModel.aggregatePaginate(aggregate, { limit, page });
  }

  async claim(user: UsersDocument, id: string) {
    const airdrop = await this.userAirdropsModel.findOne({ _id: id, status: false });
    if (!airdrop) {
      throw new BadRequestException("Airdrop not found or claimed");
    }
    const tx = await this.solanasService.claimTokenInstruction(
      user.address,
      airdrop.detail.mint,
      airdrop.detail.amount.toString(),
      airdrop.nonce,
    );
    return tx.toString("base64");
  }
}
