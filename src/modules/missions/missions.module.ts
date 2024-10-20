import { forwardRef, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { MissionsService } from "./missions.service";
import { MISSIONS_MODEL, MissionsSchema } from "./schemas/missions.schema";
import { MissionsController } from "./missions.controller";
import { USER_MISSIONS_MODEL, UserMissionsSchema } from "./schemas/user-missions.schema";
import { UsersModule } from "modules/users/users.module";
import { VotingsModule } from "modules/votings/votings.module";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: MISSIONS_MODEL, schema: MissionsSchema }]),
    MongooseModule.forFeature([{ name: USER_MISSIONS_MODEL, schema: UserMissionsSchema }]),
    forwardRef(() => UsersModule),
    VotingsModule
  ],
  providers: [MissionsService],
  controllers: [MissionsController],
  exports: [MissionsService],
})
export class MissionsModule {}
