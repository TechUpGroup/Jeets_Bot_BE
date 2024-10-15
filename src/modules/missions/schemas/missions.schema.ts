import { Options } from "common/config/mongoose.config";
import { Document } from "mongoose";

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

export const MISSIONS_MODEL = "missions";

@Schema(Options)
export class Missions {
  @Prop({ required: true, index: true, unique: true })
  mid: number;

  @Prop({ required: false })
  mission_image: string;

  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  link: string;

  @Prop({ required: true })
  action_link: string;

  @Prop({ required: true, default: 0 })
  ratio: number;

  @Prop({ required: false })
  content: string;

  @Prop({ required: false })
  refs: number;

  @Prop({ required: false, index: true, default: true })
  status: boolean;
}

export type MissionsDocument = Missions & Document;
export const MissionsSchema = SchemaFactory.createForClass(Missions);
