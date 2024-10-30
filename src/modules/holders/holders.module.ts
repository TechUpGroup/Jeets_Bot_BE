import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import {  HoldersSchema, HOLDERS_MODEL } from "./schemas/holders.schema";
import { HoldersService } from "./holders.service";
import { HoldersController } from "./holders.controller";
import { ContractsModule } from "modules/contracts/contracts.module";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: HOLDERS_MODEL, schema: HoldersSchema }]),
    ContractsModule
  ],
  controllers: [HoldersController],
  providers: [HoldersService],
  exports: [HoldersService],
})
export class HoldersModule {}
