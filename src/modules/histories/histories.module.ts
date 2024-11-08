import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import {
  HistoriesSchema,
  HISTORIES_MODEL,
  VOTING_HISTORIES_MODEL,
  VotingHistoriesSchema,
  TOKEN_HISTORIES_MODEL,
  TokenHistoriesSchema,
  AIRDROP_HISTORIES_MODEL,
  AirdropHistoriesSchema,
  CHAD_HISTORIES_MODEL,
  ChadHistoriesSchema,
} from "./schemas/histories.schema";
import { HistoriesService } from "./histories.service";
import { HistoriesController } from "./histories.controller";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: HISTORIES_MODEL, schema: HistoriesSchema }]),
    MongooseModule.forFeature([{ name: VOTING_HISTORIES_MODEL, schema: VotingHistoriesSchema }]),
    MongooseModule.forFeature([{ name: TOKEN_HISTORIES_MODEL, schema: TokenHistoriesSchema }]),
    MongooseModule.forFeature([{ name: AIRDROP_HISTORIES_MODEL, schema: AirdropHistoriesSchema }]),
    MongooseModule.forFeature([{ name: CHAD_HISTORIES_MODEL, schema: ChadHistoriesSchema }]),
  ],
  controllers: [HistoriesController],
  providers: [HistoriesService],
  exports: [HistoriesService],
})
export class HistoriesModule {}
