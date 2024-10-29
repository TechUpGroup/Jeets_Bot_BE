import { Options } from "common/config/mongoose.config"
import { Document } from "mongoose"
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"

export const X_AUTH_MODEL = "x-auth"

@Schema(Options)
export class XAuth {
  @Prop({ required: true, unique: true, index: true })
  uid: string

  @Prop({ required: true, default: "" })
  accessToken: string

  @Prop({ required: true, default: "" })
  refreshToken: string

  @Prop({ required: false, default: () => new Date() })
  expireDate: Date
}

export type XAuthDocument = XAuth & Document
export const XAuthSchema = SchemaFactory.createForClass(XAuth)
