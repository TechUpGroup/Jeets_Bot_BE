import { forwardRef, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { VotingsService } from "./votings.service";
import { VOTINGS_MODEL, VotingsSchema } from "./schemas/votings.schema";
import { VotingsController } from "./votings.controller";
import { USER_VOTINGS_MODEL, UserVotingsSchema, VOTING_DASHBOARDS_MODEL, VotingDashboardsSchema } from "./schemas/user-votings.schema";
import { UsersModule } from "modules/users/users.module";
import { WHITELIST_MODEL, WhitelistsSchema } from "./schemas/whitelist.schema";
import { MissionsModule } from "modules/missions/missions.module";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: VOTINGS_MODEL, schema: VotingsSchema }]),
    MongooseModule.forFeature([{ name: USER_VOTINGS_MODEL, schema: UserVotingsSchema }]),
    MongooseModule.forFeature([{ name: WHITELIST_MODEL, schema: WhitelistsSchema }]),
    MongooseModule.forFeature([{ name: VOTING_DASHBOARDS_MODEL, schema: VotingDashboardsSchema }]),
    forwardRef(() => UsersModule),
    forwardRef(() => MissionsModule),
  ],
  providers: [VotingsService],
  controllers: [VotingsController],
  exports: [VotingsService],
})
export class VotingsModule {}
