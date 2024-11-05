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
import axios from "axios";
import { LogsService } from "modules/logs/logs.service";
import { generateRandomString } from "common/utils/ethers";
import { AirdropsService } from "modules/airdrops/airdrops.service";
import { EVENT_CAMPAGIN_HISTORIES, EVENT_SCORE } from "common/constants/event";
import { UsersService } from "modules/users/users.service";
import { THRESHOLD_FOLLOWERS } from "common/constants/asset";
import { CampaignsService } from "modules/campaigns/campaigns.service";

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
    private readonly logsService: LogsService,
    private readonly airdropsService: AirdropsService,
    private readonly campaignsService: CampaignsService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
  ) {}

  async createVote(user: UsersDocument, wid: number) {
    const now = Date.now();
    if (!user.telegram_uid || !user.twitter_uid) {
      throw new BadRequestException("No connected social account");
    }
    if (!user?.twitter_verified_type || user.twitter_verified_type === "none") {
      throw new BadRequestException("Unverified X account");
    }
    const checkHolder = await this.holdersService.checkHolder(user);
    if (!checkHolder) {
      throw new BadRequestException("Hold token invalid");
    }
    const [current, { ratio }] = await Promise.all([
      this.votingsModel.findOne({ start_time: { $lte: now }, end_time: { $gt: now } }),
      this.missionsService.getUserMissions(user),
    ]);
    if (!current) {
      throw new BadRequestException("No session active");
    }
    if (ratio < 100) {
      throw new BadRequestException("Incomplete Missions");
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
    const bulkUpdateScore: any[] = [];
    const bulkUpdateScoreHistories: any[] = [];
    const bulkCreateScoreCamppaigns: any[] = [];
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
        bulkUpdateScoreHistories.push({
          address: data.address,
          event: EVENT_SCORE.VOTING,
          score: 1,
          timestamp: data.timestamp * 1000,
        });
        bulkCreateScoreCamppaigns.push({
          address: data.address,
          event: EVENT_CAMPAGIN_HISTORIES.VOTED,
          cid: 0,
          score: 1,
          status: false,
          tx: data.transactionHash,
        });
        bulkUpdateScore.push({
          updateOne: {
            filter: {
              address: data.address,
            },
            update: {
              $inc: { score: 1 },
            },
          },
        });
      }
    }
    await Promise.all([
      bulkCreate.length ? this.userVotingsModel.insertMany(bulkCreate) : undefined,
      bulkUpdate.length ? this.votingDashboardsModel.bulkWrite(bulkUpdate) : undefined,
      bulkUpdateScore.length ? this.usersService.bulkWrite(bulkUpdateScore) : undefined,
      bulkUpdateScoreHistories.length ? this.usersService.saveUserScoreHistories(bulkUpdateScoreHistories) : undefined,
      bulkCreateScoreCamppaigns.length ? this.campaignsService.saveUserCampagignHistories(bulkCreateScoreCamppaigns) : undefined,
    ]);
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

  async getCurrentListWinner() {
    {
      const timestamp = new Date();
      timestamp.setHours(0, 0, 0, 0);
      const startTime = timestamp.getTime();
      const session = await this.votingsModel.findOne({ start_time: startTime });
      let result: string[] = [];
      if (session) {
        const res = await this.votingDashboardsModel
          .aggregate([
            {
              $match: {
                vid: session.vid,
                count: { $gt: 0 },
              },
            },
            {
              $sort: {
                count: -1,
              },
            },
            {
              $lookup: {
                from: WHITELIST_MODEL,
                localField: "wid",
                foreignField: "wid",
                as: "wl",
                pipeline: [
                  {
                    $project: {
                      _id: 0,
                      address: 1,
                      name: 1,
                    },
                  },
                ],
              },
            },
            {
              $unwind: {
                path: "$wl",
                preserveNullAndEmptyArrays: true,
              },
            },
          ])
          .limit(10);
        result = res.map((a) => a.wl.address);
      }
      return result;
    }
  }

  async checkVotingProcess(user: UsersDocument) {
    const [exists, currentWinners] = await Promise.all([this.airdropsService.checkAirdropExists(user), this.getCurrentListWinner()]);
    if (exists || currentWinners.includes(user.address)) {
      return true;
    }
    return false;
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
      address: user.address,
      status: true,
    };
    return this.whitelistsModel.create(data);
  }

  async checkWLExistsByAddress(address: string) {
    const res = await this.whitelistsModel.findOne({ address });
    return !!res;
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

  async getListWinnerYesterday() {
    {
      const timestamp = new Date();
      timestamp.setDate(timestamp.getDate() - 1);
      timestamp.setHours(0, 0, 0, 0);
      const startTime = timestamp.getTime();
      const endTime = timestamp.getTime() + 86400000;
      const sessionYesterday = await this.votingsModel.findOne({ start_time: startTime, end_time: endTime });
      if (sessionYesterday) {
        return this.votingDashboardsModel
          .aggregate([
            {
              $match: {
                vid: sessionYesterday.vid,
                count: { $gt: 0 },
              },
            },
            {
              $sort: {
                count: -1,
              },
            },
            {
              $lookup: {
                from: WHITELIST_MODEL,
                localField: "wid",
                foreignField: "wid",
                as: "wl",
                pipeline: [
                  {
                    $project: {
                      _id: 0,
                      address: 1,
                      name: 1,
                    },
                  },
                ],
              },
            },
            {
              $unwind: {
                path: "$wl",
                preserveNullAndEmptyArrays: true,
              },
            },
          ])
          .limit(10);
      }
      return [];
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { name: "syncSessionVoting" })
  async syncSessionVoting() {
    const lastS = await this.votingsModel.find().sort({ vid: -1 }).limit(1);
    const currentVID = lastS.length ? lastS[0].vid + 1 : 1;
    const timestamp = new Date();
    timestamp.setHours(0, 0, 0, 0);
    const startTime = timestamp.getTime();
    const endTime = timestamp.getTime() + 86400000;
    const data: any = {
      start_time: startTime,
      end_time: endTime,
      vid: currentVID,
    };
    return this.votingsModel.create(data);
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { name: "syncWinnerVotings" })
  async syncWinnerVotings() {
    const [listWinners, airdropInfos] = await Promise.all([
      this.getListWinnerYesterday(),
      this.airdropsService.airdropInfos(),
    ]);
    if (!airdropInfos.length) return;
    const bulkUpdate: any[] = [];
    const datas: any[] = [];
    const bulkCreate: any[] = [];
    for (let i = 0; i < listWinners.length; i++) {
      bulkUpdate.push({
        updateOne: {
          filter: {
            wid: listWinners[i].wid,
          },
          update: {
            status: false,
          },
        },
      });
      datas.push({ address: listWinners[i].wl.address, x_account: listWinners[i].wl.name });
      const foundAirdrop = airdropInfos.find((a) => a.rank === i + 1);
      if (foundAirdrop) {
        for (const item of foundAirdrop.details) {
          bulkCreate.push({
            address: listWinners[i].wl.address,
            vid: listWinners[i].vid,
            nonce: generateRandomString(6) + Date.now().toFixed(),
            detail: {
              pid: item.pid,
              mint: item.mint,
              amount: item.amount.toString(),
              symbol: item?.symbol || "",
              decimal: item?.decimal || "",
            },
            status: false,
          });
        }
      }
    }
    await Promise.all([
      bulkUpdate.length ? this.whitelistsModel.bulkWrite(bulkUpdate) : undefined,
      bulkCreate.length ? this.airdropsService.saveUserAirdropHistories(bulkCreate) : undefined,
      datas.length ? this.addSourceAddressToTracking(datas) : undefined,
    ]);
  }

  private async addSourceAddressToTracking(datas: any[]) {
    try {
      const body: any = {
        auth: "monitor_2024",
        datas,
      };
      await axios.post(`${config.server.tracking_url}/wallet/create/srcaddresses`, body, {
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch (e) {
      console.log(e);
      try {
        this.logsService.createLog("addSourceAddressToTracking", e);
      } catch {}
    }
  }
}
