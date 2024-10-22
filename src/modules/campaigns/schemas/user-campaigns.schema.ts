import { Options } from "common/config/mongoose.config";
import { Document, SchemaTypes } from "mongoose";

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { USERS_MODEL } from "modules/users/schemas/users.schema";

export const USER_CAMPAIGNS_MODEL = "user-campaigns";

@Schema(Options)
export class UserCampaigns {
  @Prop({ type: SchemaTypes.ObjectId, index: true, ref: USERS_MODEL })
  user: string;

  @Prop({ required: true, index: true })
  cid: number;

  @Prop({ required: false, default: new Date() })
  timestamp: Date;

  @Prop({ required: true, index: true, default: true })
  status: boolean;
}

export type UserCampaignsDocument = UserCampaigns & Document;
export const UserCampaignsSchema = SchemaFactory.createForClass(UserCampaigns);
UserCampaignsSchema.index({ user: 1, cid: 1 }, { unique: true });
