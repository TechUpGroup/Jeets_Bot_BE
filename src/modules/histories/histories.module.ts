import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import {  HistoriesSchema, HISTORIES_MODEL, VOTING_HISTORIES_MODEL, VotingHistoriesSchema } from "./schemas/histories.schema";
import { HistoriesService } from "./histories.service";
import { HistoriesController } from "./histories.controller";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: HISTORIES_MODEL, schema: HistoriesSchema }]),
    MongooseModule.forFeature([{ name: VOTING_HISTORIES_MODEL, schema: VotingHistoriesSchema }]),
  ],
  controllers: [HistoriesController],
  providers: [HistoriesService],
  exports: [HistoriesService],
})
export class HistoriesModule {}
