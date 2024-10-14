import { Options, validateAddress } from "common/config/mongoose.config";
import { Document, SchemaTypes, Types } from "mongoose";
import { v4 as uuidv4 } from "uuid";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Network } from "common/enums/network.enum";
import { AVATAR } from "../users.constant";
import { generateRandomCode } from "common/utils";

export const USERS_MODEL = "users";

@Schema(Options)
export class Users {
  @Prop({
    required: true,
    index: true,
    unique: true,
    validate: validateAddress,
    lowercase: true,
    trim: true,
  })
  address: string;

  @Prop({ required: true, index: true, enum: Network, default: Network.scroll })
  network: Network;

  @Prop({
    required: true,
    default: function () {
      const { address } = this;
      if (address) {
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
      }
    },
  })
  username: string;

  @Prop({
    required: true,
    default: function () {
      const random = Math.floor(Math.random() * AVATAR.length);
      return AVATAR[random];
    },
  })
  avatar: string;

  @Prop({
    required: false,
  })
  bio: string;

  @Prop({ required: true, default: uuidv4 })
  nonce: string;

  @Prop({ required: true, index: true, unique: true, default: generateRandomCode })
  code: string;

  @Prop({ required: true, default: false })
  banned: boolean;

  @Prop({ required: true, type: SchemaTypes.Decimal128, default: 0, min: 0  })
  balance: Types.Decimal128;
}
export type UsersDocument = Users & Document;
export const UsersSchema = SchemaFactory.createForClass(Users);
