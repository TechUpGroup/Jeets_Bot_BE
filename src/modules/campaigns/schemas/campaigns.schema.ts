import { Options } from "common/config/mongoose.config";
import { Document } from "mongoose";

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

export const CAMPAIGNS_MODEL = "campaigns";

@Schema({ timestamps: false })
export class Details {
  @Prop({ required: true })
  synbol: string;

  @Prop({ required: true })
  mint: string;

  @Prop({ required: true })
  amount: number;
}
export const DetailsSchema = SchemaFactory.createForClass(Details);

@Schema(Options)
export class Campaigns {
  @Prop({ required: true, index: true, unique: true })
  cid: number;

  @Prop({ required: false })
  name: string;

  @Prop({ required: false })
  type: string;

  @Prop({ required: false, type: [DetailsSchema], default: [] })
  detail: Details[];

  @Prop({ required: true })
  start_time: number;

  @Prop({ required: true })
  end_time: number;

  @Prop({ required: true })
  score: number;
}

export type CampaignsDocument = Campaigns & Document;
export const CampaignsSchema = SchemaFactory.createForClass(Campaigns);
