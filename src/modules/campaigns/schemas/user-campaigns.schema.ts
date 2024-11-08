import { Options } from "common/config/mongoose.config";
import { Document } from "mongoose";

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Details, DetailsSchema } from "./campaigns.schema";
import { EVENT_CAMPAGIN_HISTORIES } from "common/constants/event";

export const USER_CAMPAIGNS_MODEL = "user-campaigns";

@Schema(Options)
export class UserCampaigns {
  @Prop({ required: true, index: true })
  address: string;

  @Prop({ required: true, index: true })
  cid: number;

  @Prop({ required: false, index: true, default: new Date() })
  timestamp: Date;

  @Prop({ required: false, type: [DetailsSchema], default: [] })
  start_holders: Details[];

  @Prop({ required: false, type: [DetailsSchema], default: [] })
  end_holders: Details[];

  @Prop({ required: true, default: 0 })
  score: number;

  @Prop({ required: true, index: true, default: true })
  status: boolean;

  @Prop({ required: false, enum: EVENT_CAMPAGIN_HISTORIES })
  event: EVENT_CAMPAGIN_HISTORIES;

  @Prop({ required: false, type: DetailsSchema })
  detail: Details;

  @Prop({ required: false, default: true })
  is_buy: boolean;

  @Prop({ required: false, default: true })
  is_send: boolean;

  @Prop({ required: false })
  tx: string;
}

export type UserCampaignsDocument = UserCampaigns & Document;
export const UserCampaignsSchema = SchemaFactory.createForClass(UserCampaigns);
