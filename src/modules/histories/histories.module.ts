import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import {  HistoriesSchema, HISTORIES_MODEL } from "./schemas/histories.schema";
import { HistoriesService } from "./histories.service";
import { HistoriesController } from "./histories.controller";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: HISTORIES_MODEL, schema: HistoriesSchema }]),
  ],
  controllers: [HistoriesController],
  providers: [HistoriesService],
  exports: [HistoriesService],
})
export class HistoriesModule {}
