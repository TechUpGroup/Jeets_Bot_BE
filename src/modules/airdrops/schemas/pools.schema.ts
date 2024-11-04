import { Options } from "common/config/mongoose.config";
import { Document, SchemaTypes, Types } from "mongoose";

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

export const POOLS_MODEL = "pools";

@Schema({ _id: false, timestamps: false })
export class Details {
  @Prop({ required: true })
  symbol: string;

  @Prop({ required: true })
  decimal: number;

  @Prop({ required: true })
  mint: string;
}
export const DetailsSchema = SchemaFactory.createForClass(Details);

@Schema(Options)
export class Pools {
  @Prop({ required: true, index: true, unique: true })
  pid: number;

  @Prop({ required: true, type: SchemaTypes.Decimal128, default: 0, min: 0  })
  total: Types.Decimal128;

  @Prop({ required: true })
  pool_address: string;

  @Prop({ required: true, default: new Date() })
  timestamp: Date;

  @Prop({ required: false, type: DetailsSchema })
  detail: Details;

  @Prop({ required: true, default: true })
  status: boolean;
}

export type PoolsDocument = Pools & Document;
export const PoolsSchema = SchemaFactory.createForClass(Pools);
