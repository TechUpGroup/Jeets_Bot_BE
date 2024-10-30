import { Options } from "common/config/mongoose.config";
import { Document } from "mongoose";

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Details, DetailsSchema } from "./campaigns.schema";

export const USER_AIRDROPS_MODEL = "user-airdrops";

@Schema(Options)
export class UserAirdrops {
  @Prop({ required: true, index: true })
  address: string;

  @Prop({ required: true, index: true })
  nonce: string;

  @Prop({ required: true, index: true })
  vid: number;

  @Prop({ required: false, default: new Date() })
  timestamp: Date;

  @Prop({ required: true, type: DetailsSchema })
  detail: Details;

  @Prop({ required: true, index: true, default: false })
  status: boolean;

  @Prop({ required: false })
  tx: string;
}

export type UserAirdropsDocument = UserAirdrops & Document;
export const UserAirdropsSchema = SchemaFactory.createForClass(UserAirdrops);
