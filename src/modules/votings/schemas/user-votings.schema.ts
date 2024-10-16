import { Options } from "common/config/mongoose.config";
import { Document, SchemaTypes } from "mongoose";

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { VOTINGS_MODEL } from "./votings.schema";
import { USERS_MODEL } from "modules/users/schemas/users.schema";
import { WHITELIST_MODEL } from "./whitelist.schema";

export const USER_VOTINGS_MODEL = "user-votings";
export const VOTING_DASHBOARDS_MODEL = "voting-dashboards";

@Schema(Options)
export class UserVotings {
  @Prop({ required: true, index: true, type: SchemaTypes.ObjectId, ref: USERS_MODEL })
  user: string;

  @Prop({ required: true, index: true, type: SchemaTypes.ObjectId, ref: VOTINGS_MODEL })
  voting: string;

  @Prop({ required: true, index: true, type: SchemaTypes.ObjectId, ref: WHITELIST_MODEL  })
  user_voted: string;

  @Prop({ required: false, default: new Date() })
  timestamp: Date;
}

export type UserVotingsDocument = UserVotings & Document;
export const UserVotingsSchema = SchemaFactory.createForClass(UserVotings);

@Schema(Options)
export class VotingDashboards {
  @Prop({ required: true, index: true, type: SchemaTypes.ObjectId, ref: VOTINGS_MODEL })
  voting: string;

  @Prop({ required: true, index: true, type: SchemaTypes.ObjectId, ref: WHITELIST_MODEL  })
  user_voted: string;

  @Prop({ required: true, default: 0 })
  count: number;
}

export type VotingDashboardsDocument = VotingDashboards & Document;
export const VotingDashboardsSchema = SchemaFactory.createForClass(VotingDashboards);
