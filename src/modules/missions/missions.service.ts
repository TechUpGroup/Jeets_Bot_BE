import { PaginateModel } from "mongoose";

import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";

import { MISSIONS_MODEL, MissionsDocument } from "./schemas/missions.schema";
import { USER_MISSIONS_MODEL, UserMissionsDocument } from "./schemas/user-missions.schema";
import { UsersDocument } from "modules/users/schemas/users.schema";
import config from "common/config";
import { CreateMissionDto, UpdateMissionDto } from "./dto/mission.dto";
import { S3Service } from "modules/_shared/services/s3.service";
import { SOCAIL_TYPE, X_ACTION_TYPE } from "common/enums/common";
import { TelegramService } from "modules/_shared/services/telegram.service";
import { XService } from "modules/_shared/x/x.service";
import { RedisService } from "modules/_shared/services/redis.service";
import { REDIS_KEY } from "common/constants/redis";

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
  ) {}

  async action(user: UsersDocument, id: string) {
    if (!user.twitter_uid) {
      throw new BadRequestException("User not connected twitter");
    }
    if (!user.telegram_uid) {
      throw new BadRequestException("User not connected telegram");
    }
    const [mission, userMiss] = await Promise.all([
      this.missionsModel.findOne({ _id: id, status: true }),
      this.userMissionsModel.findOne({ mission: id, user: user._id }),
    ]);
    if (!mission) {
      throw new BadRequestException("Mission not found");
    }

    // rate limit
    const cacheKey = REDIS_KEY.MISSION_ACTION + "-" + user._id.toString() + "-" + mission._id.toString();
    const incr = await this.redisService.incr(cacheKey);
    if (incr > 1) {
      throw new BadRequestException("Too many request");
    } else {
      await this.redisService.expire(cacheKey, 60);
    }

    let check = false;
    if (!userMiss) {
      // verify
      if (mission.type === SOCAIL_TYPE.TELEGRAM) {
        check = await this.telegramService.checkSubscribeTelegram(user, mission.name_chat);
      }

      if (mission.type === SOCAIL_TYPE.X) {
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
      }

      check ? this.userMissionsModel.create({ user: user._id, mission: mission._id }) : undefined;
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
