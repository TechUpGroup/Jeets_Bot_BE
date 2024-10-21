import { PaginateModel } from "mongoose";

import { BadRequestException, forwardRef, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";

import { MISSIONS_MODEL, MissionsDocument } from "./schemas/missions.schema";
import { USER_MISSIONS_MODEL, UserMissionsDocument } from "./schemas/user-missions.schema";
import { UsersDocument } from "modules/users/schemas/users.schema";
import config from "common/config";
import { CreateMissionDto, MissionXVerifyDto, UpdateMissionDto } from "./dto/mission.dto";
import { S3Service } from "modules/_shared/services/s3.service";
import { SOCAIL_TYPE, X_ACTION_TYPE } from "common/enums/common";
import { TelegramService } from "modules/_shared/services/telegram.service";
import { XService } from "modules/_shared/x/x.service";
import { RedisService } from "modules/_shared/services/redis.service";
import { REDIS_KEY } from "common/constants/redis";
import { VotingsService } from "modules/votings/votings.service";
import { UsersService } from "modules/users/users.service";

@Injectable()
export class MissionsService {
  constructor(
    @InjectModel(MISSIONS_MODEL)
    private readonly missionsModel: PaginateModel<MissionsDocument>,
    @InjectModel(USER_MISSIONS_MODEL)
    private readonly userMissionsModel: PaginateModel<UserMissionsDocument>,
    private readonly s3Service: S3Service,
    private readonly telegramService: TelegramService,
    private readonly xService: XService,
    private readonly redisService: RedisService,
    @Inject(forwardRef(() => VotingsService))
    private readonly votingsService: VotingsService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
  ) {}

  async actionStart(user: UsersDocument, id: string) {
    if (!user.twitter_uid) {
      throw new BadRequestException("User not connected twitter");
    }
    const mission = await this.missionsModel.findOne({ _id: id, status: true });
    if (!mission) {
      throw new BadRequestException("Mission not found");
    }
    if (mission.type !== SOCAIL_TYPE.X) {
      throw new BadRequestException("Only X missions are allowed");
    }
    return {
      redirectUrl: `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${
        config.twitter.clientId
      }&redirect_uri=${encodeURIComponent(
        config.twitter.callbackURL,
      )}&scope=tweet.read%20tweet.write%20users.read%20follows.read%20follows.write%20like.read%20like.write%20offline.access&state=mission-x-${id}&code_challenge=challenge&code_challenge_method=plain`,
    };
  }

  async actionTwitter(user: UsersDocument, mission: MissionsDocument, data: MissionXVerifyDto) {
    let check = false;
    if (!data?.code) {
      throw new BadRequestException("Missing code");
    }
    // rate limit
    const cacheKey = REDIS_KEY.MISSION_ACTION + "-" + user._id.toString() + "-" + mission._id.toString();
    const incr = await this.redisService.incr(cacheKey);
    if (incr > 1) {
      throw new BadRequestException("Too many request");
    } else {
      await this.redisService.expire(cacheKey, 3);
    }
    // connect
    await this.usersService.twitterConnect(user, { code: data.code }, true);
    // action
    switch (mission.x_action_type) {
      case X_ACTION_TYPE.FOLLOW:
        check = await this.xService.isFollowing(user.twitter_uid, mission.x_uid);
        break;
      case X_ACTION_TYPE.LIKE:
        if (mission.x_uid) {
          check = await this.xService.isLiking(user.twitter_uid, mission.x_uid);
        }
        break;
      case X_ACTION_TYPE.RETWEET:
        if (mission.x_uid) {
          check = await this.xService.isRetweet(user.twitter_uid, mission.x_uid);
        }
    }
    return check;
  }

  async action(user: UsersDocument, id: string, data: MissionXVerifyDto) {
    if (!user.twitter_uid) {
      throw new BadRequestException("User not connected twitter");
    }
    if (!user.telegram_uid) {
      throw new BadRequestException("User not connected telegram");
    }
    const [mission, userMiss, { ratio }] = await Promise.all([
      this.missionsModel.findOne({ _id: id, status: true }),
      this.userMissionsModel.findOne({ mission: id, user: user._id }),
      this.getUserMissions(user),
    ]);
    if (!mission) {
      throw new BadRequestException("Mission not found");
    }

    let check = false;
    if (!userMiss) {
      // verify
      if (mission.type === SOCAIL_TYPE.TELEGRAM) {
        check = await this.telegramService.checkSubscribeTelegram(user, mission.name_chat);
      }
      if (mission.type === SOCAIL_TYPE.X) {
        check = await this.actionTwitter(user, mission, data);
      }
      await Promise.all([
        check ? this.userMissionsModel.create({ user: user._id, mission: mission._id }) : undefined,
        check &&
        ratio + mission.ratio >= 100 &&
        user.twitter_followers_count >= 2000 &&
        user?.twitter_verified_type &&
        user?.twitter_verified_type !== "none"
          ? this.votingsService.addUserToWhiteList(user)
          : undefined,
        // check && ratio + mission.ratio >= 100 ? this.votingsService.addUserToWhiteList(user) : undefined,
      ]);
    }
    return check;
  }

  async getUserMissions(user: UsersDocument) {
    const [missions, userMiss] = await Promise.all([
      this.missionsModel.find({ status: true }).sort({ mid: 1 }),
      this.userMissionsModel.find({ user: user._id }),
    ]);
    const result: any[] = [];
    let ratio = 0;
    for (const mission of missions) {
      const found = userMiss.find((u) => u.mission.toString() === mission._id.toString());
      if (found) {
        ratio += mission.ratio;
        result.push({
          ...mission["_doc"],
          status: true,
        });
      } else {
        result.push({
          ...mission["_doc"],
          status: false,
        });
      }
    }
    return { ratio, result };
  }

  async createMission(auth: string, body: CreateMissionDto, file?: Express.Multer.File) {
    if (auth !== config.admin) {
      throw new UnauthorizedException("Not permission");
    }
    try {
      let mission_image;
      if (file) {
        mission_image = await this.s3Service.uploadImage(file.originalname, file);
      } else {
        const res = await this.missionsModel.findOne({ type: body.type });
        if (res) {
          mission_image = res?.mission_image;
        }
      }
      let missionActionLink = body.link;
      if (body?.content) {
        missionActionLink =
          "https://x.com/intent/tweet?text=" +
          body.content.replace(body.link, "").replace(/\n/g, "%0A").replace(/\r/g, "") +
          "&url=" +
          body.link;
      }
      //
      let x_action_type: any = undefined;
      let x_uid: any = undefined;
      if (body.type === SOCAIL_TYPE.X) {
        if (body.name.match(/follow/gim)) {
          x_action_type = X_ACTION_TYPE.FOLLOW;
          const username = body.link.split(".com/")[1].split("/")[0];
          const tInfo = await this.xService.getUserInfo(username);
          x_uid = tInfo.id;
        }
        if (body.name.match(/like/gim)) {
          x_action_type = X_ACTION_TYPE.LIKE;
          x_uid = body.link.split("status/")?.[1]?.split("/")?.[0];
        }
        if (body.name.match(/retweet/gim)) {
          x_action_type = X_ACTION_TYPE.RETWEET;
          x_uid = body.link.split("status/")?.[1]?.split("/")?.[0];
        }
      }
      //
      const lastMissions = await this.missionsModel.find().sort({ mid: -1 }).limit(1);
      const currentMID = lastMissions.length ? lastMissions[0].mid + 1 : 1;
      const data: any = {
        ...body,
        mid: currentMID,
        mission_image,
        action_link: missionActionLink,
        status: true,
        x_action_type,
        x_uid,
      };
      return this.missionsModel.create(data);
    } catch (e) {
      throw new BadRequestException(e);
    }
  }

  async updateMission(auth: string, mid: number, body: UpdateMissionDto, file?: Express.Multer.File) {
    if (auth !== config.admin) {
      throw new UnauthorizedException("Not permission");
    }
    try {
      let data: any = {
        ...body,
      };
      let mission_image;
      if (file) {
        mission_image = await this.s3Service.uploadImage(file.originalname, file);
        data = {
          ...data,
          mission_image,
        };
      }
      let missionActionLink;
      if (body?.link || body?.content) {
        missionActionLink = body.link;
        if (body?.content) {
          missionActionLink =
            "https://x.com/intent/tweet?text=" +
            body.content.replace(body.link, "").replace(/\n/g, "%0A").replace(/\r/g, "") +
            "&url=" +
            body.link;
        }
        let x_action_type: any = undefined;
        let x_uid: any = undefined;
        if (body.type === SOCAIL_TYPE.X) {
          if (body.name.match(/follow/gim)) {
            x_action_type = X_ACTION_TYPE.FOLLOW;
            const username = body.link.split(".com/")[1].split("/")[0];
            const tInfo = await this.xService.getUserInfo(username);
            x_uid = tInfo.id;
          }
          if (body.name.match(/like/gim)) {
            x_action_type = X_ACTION_TYPE.LIKE;
            x_uid = body.link.split("status/")?.[1]?.split("/")?.[0];
          }
          if (body.name.match(/retweet/gim)) {
            x_action_type = X_ACTION_TYPE.RETWEET;
            x_uid = body.link.split("status/")?.[1]?.split("/")?.[0];
          }
        }
        data = {
          ...data,
          action_link: missionActionLink,
          x_uid,
          x_action_type,
        };
      }
      return this.missionsModel.findOneAndUpdate({ mid }, { ...data }, { new: true });
    } catch (e) {
      throw new BadRequestException(e);
    }
  }

  async getAll(auth: string) {
    if (auth !== config.admin) {
      throw new UnauthorizedException("Not permission");
    }
    return this.missionsModel.find().sort({ mid: 1 });
  }
}
