import { forwardRef, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { CampaignsService } from "./campaigns.service";
import { CAMPAIGNS_MODEL, CampaignsSchema } from "./schemas/campaigns.schema";
import { CampaignsController } from "./campaigns.controller";
import { USER_CAMPAIGNS_MODEL, UserCampaignsSchema } from "./schemas/user-campaigns.schema";
import { UsersModule } from "modules/users/users.module";
import { MissionsModule } from "modules/missions/missions.module";
import { HoldersModule } from "modules/holders/holders.module";
import { ContractsModule } from "modules/contracts/contracts.module";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: CAMPAIGNS_MODEL, schema: CampaignsSchema }]),
    MongooseModule.forFeature([{ name: USER_CAMPAIGNS_MODEL, schema: UserCampaignsSchema }]),
    forwardRef(() => UsersModule),
    forwardRef(() => MissionsModule),
    forwardRef(() => ContractsModule),
    HoldersModule,
  ],
  providers: [CampaignsService],
  controllers: [CampaignsController],
  exports: [CampaignsService],
})
export class CampaignsModule {}
