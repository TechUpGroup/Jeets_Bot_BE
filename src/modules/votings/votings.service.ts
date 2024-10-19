import { PaginateModel } from "mongoose";

import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
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
    private readonly missionsService: MissionsService,
  ) {}

  async action(user: UsersDocument, id: string) {
    const now = Date.now();
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
      this.whitelistsModel.findOne({ _id: id, status: true }),
      this.userVotingsModel.findOne({ user: user._id, user_voted: id, voting: current._id }),
    ]);
    if (!voter) {
      throw new BadRequestException("Voter not found");
    }
    if (userVote) {
      throw new BadRequestException("Voted");
    }
    await Promise.all([
      this.userVotingsModel.create({ user: user._id, voting: current._id, user_voted: voter._id }),
      this.votingDashboardsModel.findOneAndUpdate(
        { user_voted: voter._id, voting: current._id },
        { user_voted: voter._id, voting: current._id, $inc: { count: 1 } },
        { upsert: true },
      ),
    ]);
    return { status: "success" };
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
            localField: "_id",
            foreignField: "user_voted",
            as: "dashboard",
            pipeline: [
              {
                $match: {
                  voting: current._id,
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
      this.userVotingsModel.find({ user: user._id, voting: current._id }),
    ]);
    const result: any[] = [];
    for (let i = 0; i < whitelists.length; i++) {
      const found = userVotes.find((a) => a.user_voted.toString() === whitelists[i]._id.toString());
      result.push({
        _id: whitelists[i]._id,
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
}
