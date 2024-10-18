import { PaginateModel } from "mongoose";

import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";

import { MISSIONS_MODEL, MissionsDocument } from "./schemas/missions.schema";
import { USER_MISSIONS_MODEL, UserMissionsDocument } from "./schemas/user-missions.schema";
import { UsersDocument } from "modules/users/schemas/users.schema";
import config from "common/config";
import { CreateMissionDto, UpdateMissionDto } from "./dto/mission.dto";
import { S3Service } from "modules/_shared/services/s3.service";
import { SOCAIL_TYPE } from "common/enums/common";
import { TelegramService } from "modules/_shared/services/telegram.service";

@Injectable()
export class MissionsService {
  constructor(
    @InjectModel(MISSIONS_MODEL)
    private readonly missionsModel: PaginateModel<MissionsDocument>,
    @InjectModel(USER_MISSIONS_MODEL)
    private readonly userMissionsModel: PaginateModel<UserMissionsDocument>,
    private readonly s3Service: S3Service,
    private readonly telegramService: TelegramService,
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

    if (!userMiss) {
      //verify
      let check = false;
      if (mission.type === SOCAIL_TYPE.TELEGRAM) {
       check = await this.telegramService.checkSubscribeTelegram(user, mission.name_chat);
      }

      if (mission.type === SOCAIL_TYPE.X) {
       check = false;
      }

      return check ? this.userMissionsModel.create({ user: user._id, mission: mission._id }) : undefined;
    }
    return;
  }

  async getUserMissions(user: UsersDocument) {
    const [missions, userMiss] = await Promise.all([
      this.missionsModel.find({ status: true }).sort({ mid: 1 }),
      this.userMissionsModel.find({ user: user._id }),
    ]);
    const result: any[] = [];
    for (const mission of missions) {
      const found = userMiss.find((u) => u.mission.toString() === mission._id.toString());
      if (found) {
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
    return result;
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
      const lastMissions = await this.missionsModel.find().sort({ mid: -1 }).limit(1);
      const currentMID = lastMissions.length ? lastMissions[0].mid + 1 : 1;
      const data: any = {
        ...body,
        mid: currentMID,
        mission_image,
        action_link: missionActionLink,
        status: true,
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
        data = {
          ...data,
          action_link: missionActionLink,
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
