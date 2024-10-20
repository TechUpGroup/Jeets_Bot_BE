import { Options } from "common/config/mongoose.config";
import { Document } from "mongoose";

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

export const USER_VOTINGS_MODEL = "user-votings";
export const VOTING_DASHBOARDS_MODEL = "voting-dashboards";

@Schema(Options)
export class UserVotings {
  @Prop({ required: true, index: true })
  address: string;

  @Prop({ required: true, index: true })
  vid: number;

  @Prop({ required: true, index: true })
  wid: number;

  @Prop({
    required: false,
    unique: true,
    default: function () {
      const { address, vid, wid } = this;
      return `${address}_${vid}_${wid}`;
    },
  })
  key: string;

  @Prop({ required: false, default: new Date() })
  timestamp: Date;
}

export type UserVotingsDocument = UserVotings & Document;
export const UserVotingsSchema = SchemaFactory.createForClass(UserVotings);
UserVotingsSchema.index({ address: 1, vid: 1, wid: 1 }, { unique: true });

@Schema(Options)
export class VotingDashboards {
  @Prop({ required: true, index: true })
  vid: number;

  @Prop({ required: true, index: true })
  wid: number;

  @Prop({ required: true, default: 0 })
  count: number;
}

export type VotingDashboardsDocument = VotingDashboards & Document;
export const VotingDashboardsSchema = SchemaFactory.createForClass(VotingDashboards);
VotingDashboardsSchema.index({ vid: 1, wid: 1 }, { unique: true });
