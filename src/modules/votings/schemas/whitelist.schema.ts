import { Options } from "common/config/mongoose.config";
import { Document } from "mongoose";

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

export const WHITELIST_MODEL = "whitelists";

@Schema(Options)
export class Whitelists {
  @Prop({ required: true, index: true, unique: true })
  wid: number;

  @Prop({ required: true })
  name: number;

  @Prop({ required: true, index: true, default: true })
  status: boolean;
}

export type WhitelistsDocument = Whitelists & Document;
export const WhitelistsSchema = SchemaFactory.createForClass(Whitelists);
