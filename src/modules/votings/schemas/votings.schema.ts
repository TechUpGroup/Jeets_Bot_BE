import { Options } from "common/config/mongoose.config";
import { Document } from "mongoose";

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

export const VOTINGS_MODEL = "votings";

@Schema(Options)
export class Votings {
  @Prop({ required: true, index: true, unique: true })
  vid: number;

  @Prop({ required: true })
  start_time: number;

  @Prop({ required: true })
  end_time: number;

  @Prop({ required: true, index: true, default: true })
  status: boolean;
}

export type VotingsDocument = Votings & Document;
export const VotingsSchema = SchemaFactory.createForClass(Votings);
