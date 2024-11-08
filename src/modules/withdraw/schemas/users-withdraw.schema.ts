import { Options } from "common/config/mongoose.config";
import { Document, SchemaTypes, Types } from "mongoose";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

export const USER_WITHDRAWS_MODEL = "user-withdraws";

@Schema(Options)
export class UserWithdraw {
  @Prop({ required: true, default: 0 })
  timestamp: number;

  @Prop({ required: true, index: true })
  address: string;

  @Prop({ required: true, type: SchemaTypes.Decimal128, default: 0, min: 0  })
  amount: Types.Decimal128;

  @Prop({ required: true, unique: true, index: true })
  nonce: string;

  @Prop({ required: true })
  signature: string;

  @Prop({ required: true, index: true, default: false })
  success: boolean;
}
export type UserWithdrawDocument = UserWithdraw & Document;
export const UserWithdrawSchema = SchemaFactory.createForClass(UserWithdraw);