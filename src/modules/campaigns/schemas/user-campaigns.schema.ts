import { Options } from "common/config/mongoose.config";
import { Document, SchemaTypes, Types } from "mongoose";

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Details, DetailsSchema } from "./campaigns.schema";

export const USER_CAMPAIGNS_MODEL = "user-campaigns";
export const USER_CAMPAIGN_HISTORIES_MODEL = "user-campaign-histories";

@Schema(Options)
export class UserCampaigns {
  @Prop({ required: true, index: true })
  address: string;

  @Prop({ required: true, index: true })
  cid: number;

  @Prop({ required: false, default: new Date() })
  timestamp: Date;

  @Prop({ required: true, type: [DetailsSchema], default: [] })
  start_holders: Details[];

  @Prop({ required: true, type: [DetailsSchema], default: [] })
  end_holders: Details[];

  @Prop({ required: true, default: 0 })
  score: number;

  @Prop({ required: true, index: true, default: true })
  status: boolean;
}

export type UserCampaignsDocument = UserCampaigns & Document;
export const UserCampaignsSchema = SchemaFactory.createForClass(UserCampaigns);
UserCampaignsSchema.index({ address: 1, cid: 1 }, { unique: true });
