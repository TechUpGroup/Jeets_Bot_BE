import { PaginateModel } from "mongoose";

import { BadRequestException, forwardRef, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";

import { VOTINGS_MODEL, VotingsDocument } from "./schemas/votings.schema";
import {
  USER_VOTINGS_MODEL,
  UserVotingsDocument,
  VOTING_DASHBOARDS_MODEL,
  VotingDashboardsDocument,
} from "./schemas/user-votings.schema";
import { UsersDocument } from "modules/users/schemas/users.schema";
import { WHITELIST_MODEL, WhitelistsDocument } from "./schemas/whitelist.schema";
import config from "common/config";
import { CreateDto, CreateSessionVoteDto } from "./dto/votings.dto";
import { S3Service } from "modules/_shared/services/s3.service";
import { MissionsService } from "modules/missions/missions.service";
import { Cron, CronExpression } from "@nestjs/schedule";
import { SolanasService } from "modules/_shared/services/solana.service";
import { HoldersService } from "modules/holders/holders.service";
import { Network } from "common/enums/network.enum";
import BigNumber from "bignumber.js";

@Injectable()
export class VotingsService {
  constructor(
    @InjectModel(VOTINGS_MODEL)
    private readonly votingsModel: PaginateModel<VotingsDocument>,
    @InjectModel(USER_VOTINGS_MODEL)
    private readonly userVotingsModel: PaginateModel<UserVotingsDocument>,
    @InjectModel(WHITELIST_MODEL)
    private readonly whitelistsModel: PaginateModel<WhitelistsDocument>,
    @InjectModel(VOTING_DASHBOARDS_MODEL)
    private readonly votingDashboardsModel: PaginateModel<VotingDashboardsDocument>,
    private readonly s3Service: S3Service,
    @Inject(forwardRef(() => MissionsService))
    private readonly missionsService: MissionsService,
    private readonly solanasService: SolanasService,
    private readonly holdersService: HoldersService,
  ) {}

  async createVote(user: UsersDocument, wid: number) {
    const now = Date.now();
    if (!user.telegram_uid || !user.twitter_uid) {
      throw new BadRequestException("No connected social account");
    }
    // const holder = await this.holdersService.holder(Network.solana, config.getContract().tokens[0].mint, user.address);
    // if (!holder || BigNumber(holder.amount.toString()).lt("2000000000")) {
    //   throw new BadRequestException("Holder minimum 2000🌕");
    // }
    const [current, { ratio }] = await Promise.all([
      this.votingsModel.findOne({ start_time: { $lte: now }, end_time: { $gt: now } }),
      this.missionsService.getUserMissions(user),
    ]);
    if (!current) {
      throw new BadRequestException("No session active");
    }
    if (ratio < 100) {
      throw new BadRequestException("Not completed task mission");
    }
    const [voter, userVote] = await Promise.all([
      this.whitelistsModel.findOne({ wid, status: true }),
      this.userVotingsModel.findOne({ address: user.address, wid, vid: current.vid }),
    ]);
    if (!voter) {
      throw new BadRequestException("Voter not found");
    }
    if (userVote) {
      throw new BadRequestException("Voted");
    }
    const tx = await this.solanasService.votingInstruction(user.address, current.vid, wid);
    return tx.toString("base64");
  }

  async processVoting(datas: any[]) {
    const keys = datas.map((a) => {
      return `${a.address}_${a.vid}_${a.wid}`;
    });
    const keyExists = await this.userVotingsModel.find({ key: { $in: keys } }).distinct("key");
    const bulkCreate: any[] = [];
    const bulkUpdate: any[] = [];
    for (const data of datas) {
      if (!keyExists.includes(`${data.address}_${data.vid}_${data.wid}`)) {
        bulkCreate.push({
          address: data.address,
          vid: data.vid,
          wid: data.wid,
          timestamp: data.timestamp,
        });
        bulkUpdate.push({
          updateOne: {
            filter: {
              vid: data.vid,
              wid: data.wid,
            },
            update: {
              vid: data.vid,
              wid: data.wid,
              $inc: { count: 1 },
            },
            upsert: true,
          },
        });
      }
    }
    await Promise.all([this.userVotingsModel.insertMany(bulkCreate), this.votingDashboardsModel.bulkWrite(bulkUpdate)]);
  }

  async getUserVotings(user: UsersDocument) {
    const now = Date.now();
    const [current, { ratio }] = await Promise.all([
      this.votingsModel.findOne({ start_time: { $lte: now }, end_time: { $gt: now } }),
      this.missionsService.getUserMissions(user),
    ]);
    if (!current) {
      throw new BadRequestException("No session active");
    }
    const [whitelists, userVotes] = await Promise.all([
      this.whitelistsModel.aggregate([
        {
          $match: {
            status: true,
          },
        },
        {
          $lookup: {
            from: VOTING_DASHBOARDS_MODEL,
            localField: "wid",
            foreignField: "wid",
            as: "dashboard",
            pipeline: [
              {
                $match: {
                  vid: current.vid,
                },
              },
              {
                $project: {
                  _id: 0,
                  count: 1,
                },
              },
            ],
          },
        },
        {
          $addFields: {
            countVote: {
              $cond: {
                if: { $eq: [{ $size: "$dashboard" }, 0] },
                then: 0,
                else: {
                  $arrayElemAt: ["$dashboard.count", 0],
                },
              },
            },
          },
        },
        {
          $sort: {
            countVote: -1,
          },
        },
      ]),
      this.userVotingsModel.find({ address: user.address, vid: current.vid }),
    ]);
    const result: any[] = [];
    for (let i = 0; i < whitelists.length; i++) {
      const found = userVotes.find((a) => a.wid === whitelists[i].wid);
      result.push({
        wid: whitelists[i].wid,
        rank: i + 1,
        name: whitelists[i].name,
        avatar: whitelists[i].avatar,
        countVote: whitelists[i].countVote,
        status: found ? true : false,
      });
    }
    return { current, ratio, result };
  }

  async addWhiteList(auth: string, body: CreateDto, file?: Express.Multer.File) {
    if (auth !== config.admin) {
      throw new UnauthorizedException("Not permission");
    }
    try {
      let avatar;
      if (file) {
        avatar = await this.s3Service.uploadImage(file.originalname, file);
      }
      const lastWL = await this.whitelistsModel.find().sort({ wid: -1 }).limit(1);
      const currentWID = lastWL.length ? lastWL[0].wid + 1 : 1;
      const data: any = {
        ...body,
        wid: currentWID,
        avatar,
        status: true,
      };
      return this.whitelistsModel.create(data);
    } catch (e) {
      throw new BadRequestException(e);
    }
  }

  async addUserToWhiteList(user: UsersDocument) {
    const lastWL = await this.whitelistsModel.find().sort({ wid: -1 }).limit(1);
    const currentWID = lastWL.length ? lastWL[0].wid + 1 : 1;
    const data: any = {
      wid: currentWID,
      name: user.twitter_username,
      avatar: user.twitter_avatar,
      status: true,
    };
    return this.whitelistsModel.create(data);
  }

  async createSessionVote(auth: string, body: CreateSessionVoteDto) {
    if (auth !== config.admin) {
      throw new UnauthorizedException("Not permission");
    }
    try {
      const lastS = await this.votingsModel.find().sort({ vid: -1 }).limit(1);
      const currentVID = lastS.length ? lastS[0].vid + 1 : 1;
      const data: any = {
        ...body,
        vid: currentVID,
      };
      return this.votingsModel.create(data);
    } catch (e) {
      throw new BadRequestException(e);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { name: "syncSessionVoting" })
  async syncSessionVoting() {
    const lastS = await this.votingsModel.find().sort({ vid: -1 }).limit(1);
    const currentVID = lastS.length ? lastS[0].vid + 1 : 1;
    const timestamp = new Date();
    timestamp.setHours(0, 0, 0);
    const startTime = timestamp.getTime();
    const endTime = timestamp.getTime() + 86400000;
    const data: any = {
      start_time: startTime,
      end_time: endTime,
      vid: currentVID,
    };
    return this.votingsModel.create(data);
  }
}
