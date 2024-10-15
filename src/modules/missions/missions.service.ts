import { PaginateModel } from "mongoose";

import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";

import { MISSIONS_MODEL, MissionsDocument } from "./schemas/missions.schema";
import { USER_MISSIONS_MODEL, UserMissionsDocument } from "./schemas/user-missions.schema";
import { UsersDocument } from "modules/users/schemas/users.schema";
import { SOCAIL_TYPE } from "common/enums/common";

@Injectable()
export class MissionsService {
  constructor(
    @InjectModel(MISSIONS_MODEL)
    private readonly missionsModel: PaginateModel<MissionsDocument>,
    @InjectModel(USER_MISSIONS_MODEL)
    private readonly userMissionsModel: PaginateModel<UserMissionsDocument>
  ) {}

  async action(user: UsersDocument, id: string) {
    const [mission, userMiss] = await Promise.all([
      this.missionsModel.findOne({ _id: id, status: true }),
      this.userMissionsModel.findOne({ mission: id, user: user._id }),
    ]);
    if (!mission) {
      throw new BadRequestException("Mission not found");
    }

    if (!userMiss) {
      return this.userMissionsModel.create({ user: user._id, mission: mission._id });
    }
    return;
  }

  async getUserMissions(user: UsersDocument) {
    const [missions, userMiss] = await Promise.all([
      this.missionsModel.find({ status: true }).sort({ mid: 1 }),
      this.userMissionsModel.find({ user: user._id }),
    ]);
    const active: any[] = [];
    const completed: any[] = [];
    for (const mission of missions) {
      const found = userMiss.find((u) => u.mission.toString() === mission._id.toString());
      if (found) {
          completed.push({
            ...mission["_doc"],
            status: true,
          });
      } else {
        active.push({
          ...mission["_doc"],
          status: false,
        });
      }
    }
    return { active, completed };
  }
}
