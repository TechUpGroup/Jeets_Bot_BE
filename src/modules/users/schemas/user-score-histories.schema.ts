import { Options,  } from "common/config/mongoose.config";
import { Document } from "mongoose";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { EVENT_SCORE } from "common/constants/event";

export const USER_SCORE_HISTORIES_MODEL = "user-score--histories";

@Schema(Options)
export class UserScoreHistories {
  @Prop({
    required: true,
    index: true,
    unique: true,
    trim: true,
  })
  address: string;

  @Prop({ required: true, enum: EVENT_SCORE,  default: EVENT_SCORE.VOTING })
  event: EVENT_SCORE;

  @Prop({ required: true, default: 0 })
  score: number;

  @Prop({ required: false, default: Date.now() })
  timestamp: number;
}
export type UserScoreHistoriesDocument = UserScoreHistories & Document;
export const UserScoreHistoriesSchema = SchemaFactory.createForClass(UserScoreHistories);
