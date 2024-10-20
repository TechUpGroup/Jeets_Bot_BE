import { Options } from "common/config/mongoose.config";
import { Document, SchemaTypes, Types } from "mongoose";

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Network } from "common/enums/network.enum";

export const HOLDERS_MODEL = "holders";

@Schema(Options)
export class Holders {
  @Prop({ required: true, index: true, enum: Network })
  network: Network;

  @Prop({ required: true, index: true })
  mint: string;

  @Prop({ required: true, index: true })
  owner: string;

  @Prop({ required: true, index: true })
  last_updated: number;

  @Prop({ required: true, index: true, default: 0 })
  day_streak_holder: number;

  @Prop({ required: true, type: SchemaTypes.Decimal128, default: 0, min: 0  })
  amount: Types.Decimal128;
}
export type HoldersDocument = Holders & Document;
export const HoldersSchema = SchemaFactory.createForClass(Holders);
HoldersSchema.index({ network: 1, mint: 1, owner: 1 }, { unique: true })
