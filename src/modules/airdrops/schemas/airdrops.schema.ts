import { Options } from "common/config/mongoose.config";
import { Document, SchemaTypes, Types } from "mongoose";

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

export const AIRDROPS_MODEL = "airdrops";

@Schema({ _id: false, timestamps: false })
export class Details {
  @Prop({ required: true })
  symbol: string;

  @Prop({ required: true })
  decimal: number;

  @Prop({ required: true })
  mint: string;

  @Prop({ required: true, type: SchemaTypes.Decimal128, default: 0, min: 0  })
  amount: Types.Decimal128;
}
export const DetailsSchema = SchemaFactory.createForClass(Details);

@Schema(Options)
export class Airdrops {
  @Prop({ required: true, index: true, unique: true })
  rank: number;

  @Prop({ required: false, type: [DetailsSchema], default: [] })
  details: Details[];

  @Prop({ required: true, default: true })
  status: boolean;
}

export type AirdropsDocument = Airdrops & Document;
export const AirdropsSchema = SchemaFactory.createForClass(Airdrops);
