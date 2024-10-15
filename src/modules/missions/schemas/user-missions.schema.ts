import { Options } from "common/config/mongoose.config";
import { Document, SchemaTypes } from "mongoose";

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { MISSIONS_MODEL } from "./missions.schema";
import { USERS_MODEL } from "modules/users/schemas/users.schema";

export const USER_MISSIONS_MODEL = "user-missions";

@Schema(Options)
export class UserMissions {
  @Prop({ required: true, index: true, type: SchemaTypes.ObjectId, ref: USERS_MODEL })
  user: string;

  @Prop({ required: true, index: true, type: SchemaTypes.ObjectId, ref: MISSIONS_MODEL })
  mission: string;

  @Prop({ required: false, default: new Date() })
  completed_time: Date;
}

export type UserMissionsDocument = UserMissions & Document;
export const UserMissionsSchema = SchemaFactory.createForClass(UserMissions);
