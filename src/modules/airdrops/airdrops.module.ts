import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AirdropsService } from "./airdrops.service";
import { AirdropsController } from "./airdrops.controller";
import { USER_AIRDROPS_MODEL, UserAirdropsSchema } from "./schemas/user-airdrops.schema";
import { AIRDROPS_MODEL, AirdropsSchema } from "./schemas/airdrops.schema";
import { POOLS_MODEL, PoolsSchema } from "./schemas/pools.schema";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: USER_AIRDROPS_MODEL, schema: UserAirdropsSchema }]),
    MongooseModule.forFeature([{ name: AIRDROPS_MODEL, schema: AirdropsSchema }]),
    MongooseModule.forFeature([{ name: POOLS_MODEL, schema: PoolsSchema }]),

  ],
  providers: [AirdropsService],
  controllers: [AirdropsController],
  exports: [AirdropsService],
})
export class AirdropsModule {}
