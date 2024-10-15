import { forwardRef, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { VotingsService } from "./votings.service";
import { VOTINGS_MODEL, VotingsSchema } from "./schemas/votings.schema";
import { VotingsController } from "./votings.controller";
import { USER_VOTINGS_MODEL, UserVotingsSchema } from "./schemas/user-votings.schema";
import { UsersModule } from "modules/users/users.module";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: VOTINGS_MODEL, schema: VotingsSchema }]),
    MongooseModule.forFeature([{ name: USER_VOTINGS_MODEL, schema: UserVotingsSchema }]),
    forwardRef(() => UsersModule),
  ],
  providers: [VotingsService],
  controllers: [VotingsController],
  exports: [VotingsService],
})
export class VotingsModule {}
