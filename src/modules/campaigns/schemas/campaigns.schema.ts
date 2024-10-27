import { Options } from "common/config/mongoose.config";
import { Document, SchemaTypes, Types } from "mongoose";

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { CAMPAIGN_TYPE } from "common/enums/common";

export const CAMPAIGNS_MODEL = "campaigns";

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
export class Campaigns {
  @Prop({ required: true, index: true, unique: true })
  cid: number;

  @Prop({ required: false })
  name: string;

  @Prop({ required: false, enum: CAMPAIGN_TYPE, default: CAMPAIGN_TYPE.HOLD_TOKEN })
  type: CAMPAIGN_TYPE;

  @Prop({ required: false, type: [DetailsSchema], default: [] })
  details: Details[];

  @Prop({ required: true, index: true })
  start_time: number;

  @Prop({ required: true, index: true })
  end_time: number;

  @Prop({ required: true })
  score: number;

  @Prop({ required: true, default: true })
  status: boolean;

  @Prop({ required: true, default: true })
  is_origin: boolean;
}

export type CampaignsDocument = Campaigns & Document;
export const CampaignsSchema = SchemaFactory.createForClass(Campaigns);
