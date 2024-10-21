import { PaginateModel } from "mongoose";

import { BadRequestException, forwardRef, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";

import { CAMPAIGNS_MODEL, CampaignsDocument } from "./schemas/campaigns.schema";
import {
  USER_CAMPAIGNS_MODEL,
  UserCampaignsDocument,
} from "./schemas/user-campaigns.schema";
import { UsersDocument } from "modules/users/schemas/users.schema";
import config from "common/config";
import { CreateNewCampaignDto } from "./dto/campaigns.dto";
import { MissionsService } from "modules/missions/missions.service";
import { SolanasService } from "modules/_shared/services/solana.service";

@Injectable()
export class CampaignsService {
  constructor(
    @InjectModel(CAMPAIGNS_MODEL)
    private readonly campaignsModel: PaginateModel<CampaignsDocument>,
    @InjectModel(USER_CAMPAIGNS_MODEL)
    private readonly userCampaignsModel: PaginateModel<UserCampaignsDocument>,
    @Inject(forwardRef(() => MissionsService))
    private readonly missionsService: MissionsService,
  ) {}

  async saveCampaignHistories(user: UsersDocument, wid: number) {
  }

  async getCampaignHistories(user: UsersDocument) {
  }

  async createNewCampaign(auth: string, body: CreateNewCampaignDto) {
    if (auth !== config.admin) {
      throw new UnauthorizedException("Not permission");
    }
    try {
      const lastS = await this.campaignsModel.find().sort({ cid: -1 }).limit(1);
      const currentCID = lastS.length ? lastS[0].cid + 1 : 1;
      const data: any = {
        ...body,
        vid: currentCID,
      };
      return this.campaignsModel.create(data);
    } catch (e) {
      throw new BadRequestException(e);
    }
  }

}
