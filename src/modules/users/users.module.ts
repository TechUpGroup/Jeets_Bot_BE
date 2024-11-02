import { AuthModule } from "modules/auth/auth.module";

import { forwardRef, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { USERS_MODEL, UsersSchema } from "./schemas/users.schema";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { ContractsModule } from "modules/contracts/contracts.module";
import { HoldersModule } from "modules/holders/holders.module";
import { MissionsModule } from "modules/missions/missions.module";
import { USER_SCORE_HISTORIES_MODEL, UserScoreHistoriesSchema } from "./schemas/user-score-histories.schema";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: USERS_MODEL, schema: UsersSchema }]),
    MongooseModule.forFeature([{ name: USER_SCORE_HISTORIES_MODEL, schema: UserScoreHistoriesSchema }]),
    forwardRef(() => AuthModule),
    forwardRef(() => HoldersModule),
    ContractsModule,
    MissionsModule
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
