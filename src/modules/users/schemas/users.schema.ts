import { Options, validateAddress } from "common/config/mongoose.config";
import { Document, SchemaTypes, Types } from "mongoose";
import { v4 as uuidv4 } from "uuid";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Network } from "common/enums/network.enum";
import { generateRandomCode } from "common/utils";

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

  @Prop({ required: false, sparse: true })
  telegram_uid: number;

  @Prop({ required: false })
  telegram_username: string;

  @Prop({ required: false, sparse: true })
  twitter_uid: string;

  @Prop({ required: false })
  twitter_username: string;

  @Prop({ required: false, })
  twitter_avatar: string;

  @Prop({ required: false, default: false })
  twitter_verified: boolean;

  @Prop({ required: true, default: false })
  banned: boolean;

  @Prop({ required: true, type: SchemaTypes.Decimal128, default: 0, min: 0  })
  balance: Types.Decimal128;
}
export type UsersDocument = Users & Document;
export const UsersSchema = SchemaFactory.createForClass(Users);
