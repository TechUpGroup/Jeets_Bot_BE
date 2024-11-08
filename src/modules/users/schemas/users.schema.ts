import { Options,  } from "common/config/mongoose.config";
import { Document, SchemaTypes, Types } from "mongoose";
import { v4 as uuidv4 } from "uuid";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Network } from "common/enums/network.enum";
import { generateRandomCode } from "common/utils";
import { Details, DetailsSchema } from "modules/campaigns/schemas/campaigns.schema";

export const USERS_MODEL = "users";

@Schema(Options)
export class Users {
  @Prop({
    required: true,
    index: true,
    unique: true,
    trim: true,
  })
  address: string;

  @Prop({ required: true, index: true, enum: Network, default: Network.solana })
  network: Network;

  @Prop({ required: true, default: uuidv4 })
  nonce: string;

  @Prop({ required: true, index: true, unique: true, default: generateRandomCode })
  code: string;

  @Prop({ required: false, unique: true, sparse: true })
  telegram_uid: number;

  @Prop({ required: false })
  telegram_username: string;

  @Prop({ required: false, unique: true, sparse: true })
  twitter_uid: string;

  @Prop({ required: false })
  twitter_username: string;

  @Prop({ required: false, })
  twitter_avatar: string;

  @Prop({ required: false })
  twitter_verified_type: string;

  @Prop({ required: false, default: 0 })
  twitter_followers_count: number;

  @Prop({ required: true, default: false })
  banned: boolean;

  @Prop({ required: true, default: 0 })
  score: number;

  @Prop({ required: false, type: DetailsSchema  })
  partner: Details;

  @Prop({ required: true, default: false })
  is_claimed: boolean;

  @Prop({ required: false, type: SchemaTypes.Decimal128, default: 0, min: 0  })
  sol_deposited: Types.Decimal128;
}
export type UsersDocument = Users & Document;
export const UsersSchema = SchemaFactory.createForClass(Users);
