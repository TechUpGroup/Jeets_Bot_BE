import { PaginateModel, Types } from "mongoose";

import { BadRequestException, forwardRef, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";

import { USERS_MODEL, UsersDocument } from "./schemas/users.schema";
import { ErrorMessages } from "./users.constant";
import { Network } from "common/enums/network.enum";
import { getCurrentMonth, getCurrentWeek, getCurrentYear, telegramCheckAuth } from "common/utils";
import { ConnectTelegramDto, ConnectTwitterDto } from "./dto/twitter.dto";
import { XService } from "modules/_shared/x/x.service";
import { ContractsService } from "modules/contracts/contracts.service";
import { MissionsService } from "modules/missions/missions.service";
import {
  USER_SCORE_HISTORIES_MODEL,
  UserScoreHistories,
  UserScoreHistoriesDocument,
} from "./schemas/user-score-histories.schema";
import { LeaderboardDto } from "./dto/user.dto";
import { LEADERBOARD_TYPE } from "common/enums/common";
import config from "common/config";
import { TIMESTAM_HOUR } from "common/constants/asset";
import { HoldersService } from "modules/holders/holders.service";
import { EVENT_CAMPAGIN_HISTORIES, EVENT_SCORE } from "common/constants/event";
import { CampaignsService } from "modules/campaigns/campaigns.service";
import { LogsService } from "modules/logs/logs.service";

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(USERS_MODEL)
    private readonly usersModel: PaginateModel<UsersDocument>,
    @InjectModel(USER_SCORE_HISTORIES_MODEL)
    private readonly userScoreHistoriesModel: PaginateModel<UserScoreHistoriesDocument>,
    private readonly xService: XService,
    private readonly contractsService: ContractsService,
    @Inject(forwardRef(() => MissionsService))
    private readonly missionsService: MissionsService,
    @Inject(forwardRef(() => CampaignsService))
    private readonly campaignsService: CampaignsService,
    private readonly holdersService: HoldersService,
    private readonly logsService: LogsService,
  ) {}

  async queryUsers(filter: any, options: any) {
    const users = await this.usersModel.paginate(filter, options);
    return users;
  }

  async isAddressTaken(address: string) {
    const checkAddress = await this.usersModel.findOne({
      address,
    });
    if (checkAddress) {
      return true;
    }
    return false;
  }

  async isSocialTaken(data: any) {
    const checkSocial = await this.usersModel.findOne({
      ...data,
    });
    if (checkSocial) {
      return true;
    }
    return false;
  }

  async create(address: string, network: Network) {
    const isAddressTaken = await this.isAddressTaken(address);
    if (isAddressTaken) {
      throw new BadRequestException(ErrorMessages.ADDRESS_EXISTS);
    }
    return this.usersModel.create({ address, network });
  }

  getAllUsersVerified() {
    return this.usersModel.find({
      $and: [{ twitter_verified_type: { $exists: true } }, { twitter_verified_type: { $ne: "none" } }],
    });
  }

  async getUser(id: string) {
    const user = await this.usersModel.findById(id);
    if (!user) {
      throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
    }
    return user;
  }

  async getUserById(id: string) {
    return await this.usersModel.findById(id);
  }

  async updateNonce(id: string, nonce: string) {
    const user = await this.usersModel.findOneAndUpdate({ _id: id }, { nonce }, { new: true });
    if (!user) {
      throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
    }
    return user;
  }

  async getUserByAddress(address: string) {
    const user = await this.findUserByAddress(address);
    if (!user) {
      throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
    }
    return user;
  }

  async getUsersByAddresses(addresses: string[]) {
    return this.usersModel.find({ address: { $in: addresses } });
  }

  async getUserSocialConnectedByAddresses(addresses: string[]) {
    return this.usersModel.find({
      address: { $in: addresses },
      telegram_uid: { $exists: true },
      twitter_uid: { $exists: true },
    });
  }

  async findUserByAddress(address: string) {
    const user = await this.usersModel.findOne({ address });
    return user;
  }

  async findUserByUID(telegram_uid: number) {
    const user = await this.usersModel.findOne({ telegram_uid });
    return user;
  }

  async findUserById(id: string) {
    const user = await this.usersModel.findById(id);
    if (!user) {
      throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
    }
    return user;
  }

  async findOrCreateUserByAddress(address: string, network: Network) {
    const user = await this.findUserByAddress(address);
    if (!user) {
      return await this.create(address, network);
    }
    return user;
  }

  async deleteUser(id: string) {
    const user = await this.usersModel.findOneAndDelete({ _id: id });
    if (!user) {
      throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
    }
    return user;
  }

  async getInfoUser(username: string) {
    const user = await this.usersModel.findOne(
      { $or: [{ username }, { address: username }], banned: false },
      {
        _id: 1,
        address: 1,
        nonce: 1,
        banned: 1,
        balance: 1,
      },
    );
    if (!user) {
      throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
    }
    return user;
  }

  async getUserByCode(code: string) {
    const user = await this.usersModel.findOne({ code });
    if (!user) {
      throw new NotFoundException("Code is invalid");
    }
    return user;
  }

  async getListUserByIds(ids: string[]) {
    const users = await this.usersModel.find({ _id: { $in: ids.map((i) => new Types.ObjectId(i)) } });
    return users;
  }

  async checkUsernameExists(username: string) {
    const user = await this.usersModel.findOne({ username }, { _id: 1 });
    return !!user;
  }

  updateBalance(id: string, amount: number) {
    return this.usersModel.updateOne({ _id: new Types.ObjectId(id) }, { $inc: { balance: amount } });
  }

  async updatePartner(user: UsersDocument, mint: string) {
    const res = await this.contractsService.getContractInfo(mint, Network.solana);
    if (res) {
      return this.usersModel.findOneAndUpdate(
        { _id: new Types.ObjectId(user._id) },
        {
          partner: {
            mint,
            symbol: res.symbol,
            decimal: res.decimal,
            amount: (res.require_hold || "0").toString(),
          },
        },
        { new: true },
      );
    }
  }

  bulkWrite(bulkUpdate: any[]) {
    return this.usersModel.bulkWrite(bulkUpdate);
  }

  async connectTelegram(user: UsersDocument, data: ConnectTelegramDto) {
    const base64 = data.code.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map(function (c) {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join(""),
    );
    const userInfo = JSON.parse(jsonPayload);

    if (user.telegram_uid) {
      throw new BadRequestException(
        "User with this wallet address already connected telegram with telegram_uid " + user.telegram_uid,
      );
    }
    // validate hash
    if (!telegramCheckAuth(userInfo)) {
      throw new BadRequestException("Hash not matched or expired");
    }

    if (await this.isSocialTaken({ telegram_uid: userInfo.id })) {
      throw new BadRequestException("This telegram user already connected to other user.");
    }

    try {
      let score = 0;
      const  bulkCreate :any[] = [];
      if (user?.twitter_uid) {
        const scoreInfo = await this.holdersService.startTotalScore(user);
        score = scoreInfo.totalSscore;
        for (const tokenInfo of scoreInfo.tokenInfos) {
          bulkCreate.push({
            event: EVENT_CAMPAGIN_HISTORIES.START_HOLD,
            address: user.address,
            cid: 0,
            start_holders: [],
            detail: {
              mint: tokenInfo.mint,
              amount: tokenInfo.amount,
              symbol: tokenInfo.symbol,
              decimal: tokenInfo.decimal,
            },
            score:  tokenInfo.score,
            status: false,
          });
        }
      }
      await Promise.all([
        this.usersModel.findByIdAndUpdate(user._id, {
          $set: {
            telegram_uid: userInfo.id,
            telegram_username: userInfo.username,
            score,
          },
        }),
        score
          ? this.saveUserScoreHistories({
              address: user.address,
              event: EVENT_SCORE.START_HOLD_TOKEN,
              score,
              timestamp: Date.now(),
            })
          : undefined,
        score
          ? this.campaignsService.saveUserCampagignHistories(bulkCreate)
          : undefined,
      ]);

      return userInfo;
    } catch (error) {
      this.logsService.createLog("Error:", error.message);
      throw new BadRequestException("Internal Server Error");
    }
  }

  async reStart(user: UsersDocument) {
    if (!user.twitter_uid) {
      throw new BadRequestException("User not connected twitter");
    }
    return {
      redirectUrl: `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${
        config.twitter.clientId
      }&redirect_uri=${encodeURIComponent(
        config.twitter.callbackURL,
      )}&scope=tweet.read%20tweet.write%20users.read%20follows.read%20follows.write%20like.read%20like.write%20offline.access&state=retwitter&code_challenge=challenge&code_challenge_method=plain`,
    };
  }

  async twitterConnect(user: UsersDocument, { code }: ConnectTwitterDto, forceReconnect = false) {
    if (!forceReconnect && user.twitter_uid) {
      throw new BadRequestException("This user already connected twitter with twitter_uid " + user.twitter_uid);
    }
    const [userInfo, resultToken] = await Promise.all([
      this.getUser(user._id),
      this.xService.obtainingAccessToken(code),
    ]);
    const userMe = await resultToken.client.v2
      .me({
        "user.fields": [
          "created_at",
          "description",
          "entities",
          "id",
          "location",
          "name",
          "pinned_tweet_id",
          "profile_image_url",
          "protected",
          "public_metrics",
          "url",
          "username",
          "verified",
          "verified_type",
          "withheld",
        ],
      })
      .catch((error) => {
        console.error({ accessToken: resultToken.accessToken }, error?.response?.data || error);
      });

    if (!userMe) {
      throw new BadRequestException("Cannot get userInfo");
    }

    // check match connected user.
    if (forceReconnect && userMe.data.id !== user.twitter_uid) {
      throw new BadRequestException("X user does not match the connected X user.");
    }

    const otherUser = await this.usersModel.findOne({ twitter_uid: userMe.data.id });
    if (otherUser && otherUser._id.toString() !== user._id.toString()) {
      throw new BadRequestException("This twitter user already connected to other user.");
    }

    // save access token
    await this.xService.updateToken(userMe.data.id, resultToken);

    // save
    if (forceReconnect) {
      userInfo.twitter_verified_type = userMe.data?.verified_type || "";
      userInfo.twitter_followers_count = userMe.data?.public_metrics?.followers_count || 0;
      await this.missionsService.addWLVoting(userInfo);
    } else {
      userInfo.twitter_uid = userMe.data.id;
      userInfo.twitter_username = userMe.data.username;
      userInfo.twitter_avatar = userMe.data?.profile_image_url || "";
      userInfo.twitter_verified_type = userMe.data?.verified_type || "";
      userInfo.twitter_followers_count = userMe.data?.public_metrics?.followers_count || 0;
      let score = 0;
      const  bulkCreate :any[] = [];
      if (user?.telegram_uid) {
        const scoreInfo = await this.holdersService.startTotalScore(user);
        score = scoreInfo.totalSscore;
        userInfo.score = score;
        for (const tokenInfo of scoreInfo.tokenInfos) {
          bulkCreate.push({
            event: EVENT_CAMPAGIN_HISTORIES.START_HOLD,
            address: user.address,
            cid: 0,
            start_holders: [],
            detail: {
              mint: tokenInfo.mint,
              amount: tokenInfo.amount,
              symbol: tokenInfo.symbol,
              decimal: tokenInfo.decimal,
            },
            score:  tokenInfo.score,
            status: false,
          });
        }
      }
      await Promise.all([
        userInfo.save(),
        score
          ? this.saveUserScoreHistories({
              address: user.address,
              event: EVENT_SCORE.START_HOLD_TOKEN,
              score,
              timestamp: Date.now(),
            })
          : undefined,
        score
          ? this.campaignsService.saveUserCampagignHistories(bulkCreate)
          : undefined,
      ]);
    }
    return userInfo;
  }

  // score
  saveUserScoreHistories(items: UserScoreHistories | UserScoreHistories[]) {
    if (Array.isArray(items)) {
      return this.userScoreHistoriesModel.insertMany(items);
    }
    return this.userScoreHistoriesModel.create(items);
  }

  async leaderboard(user: UsersDocument, query: LeaderboardDto) {
    const { type } = query;
    let startTime = Date.now();
    let endTime = Date.now();
    if (type === LEADERBOARD_TYPE.WEEK) {
      const time = getCurrentWeek();
      startTime = time.startTime.getTime();
      endTime = time.endTime.getTime();
    }
    if (type === LEADERBOARD_TYPE.MONTH) {
      const time = getCurrentMonth();
      startTime = time.startTime.getTime();
      endTime = time.endTime.getTime();
    }
    if (type === LEADERBOARD_TYPE.YEAR) {
      const time = getCurrentYear();
      startTime = time.startTime.getTime();
      endTime = time.endTime.getTime();
    }
    if (type === LEADERBOARD_TYPE.YEAR) {
      const time = getCurrentYear();
      startTime = time.startTime.getTime();
      endTime = time.endTime.getTime();
    }
    if (type === LEADERBOARD_TYPE.TOP_100) {
      startTime = new Date("10/01/2024").getTime();
      endTime = Date.now() + TIMESTAM_HOUR;
    }
    const allUsers = await this.userScoreHistoriesModel.aggregate([
      {
        $match: {
          $and: [{ timestamp: { $gte: startTime } }, { timestamp: { $lte: endTime } }],
        },
      },
      {
        $group: {
          _id: "$address",
          totalScore: { $sum: "$score" },
        },
      },
      {
        $match: {
          totalScore: { $gte: 0 },
        },
      },
      {
        $sort: {
          totalScore: -1,
        },
      },
      {
        $project: {
          _id: 1,
          totalScore: 1,
        },
      },
    ]);
    let userindex = allUsers.length + 1;
    let totalScore = 0;
    const found = allUsers.findIndex((u) => u._id === user.address);
    if (found !== -1) {
      userindex = found + 1;
      totalScore = allUsers[found].totalScore;
    }
    const datas = allUsers.slice(0, 110);
    const addresses = datas.map((a) => a._id);
    const userInfos = await this.getUsersByAddresses(addresses);
    const topScores: any[] = [];
    datas.forEach((a, i) => {
      const u = userInfos.find((b) => b.address === a._id);
      if (u?.twitter_uid) {
        {
          topScores.push({
            twitter_username: u?.twitter_username,
            twitter_avatar: u?.twitter_avatar,
            totalScore: a.totalScore,
            rank: i + 1,
          });
        }
      }
    });
    return {
      user: {
        twitter_username: user.twitter_username,
        twitter_avatar: user?.twitter_avatar,
        totalScore,
        rank: userindex,
      },
      topScores: topScores.slice(0, 100),
    };
  }
}
