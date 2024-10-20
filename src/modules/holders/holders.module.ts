import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import {  HoldersSchema, HOLDERS_MODEL } from "./schemas/holders.schema";
import { HoldersService } from "./holders.service";
import { HoldersController } from "./holders.controller";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: HOLDERS_MODEL, schema: HoldersSchema }]),
  ],
  controllers: [HoldersController],
  providers: [HoldersService],
  exports: [HoldersService],
})
export class HoldersModule {}
