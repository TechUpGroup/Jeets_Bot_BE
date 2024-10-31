import { Options } from "common/config/mongoose.config"
import { Document } from "mongoose"
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"

export const X_MENTION_MODEL = "x-mentions"

@Schema(Options)
export class XMention {
  @Prop({ required: true, unique: true, index: true })
  uid: string

  @Prop({ required: true, default: "" })
  tid: string

  @Prop({ required: true, default: "" })
  text: string
}

export type XMentionDocument = XMention & Document
export const XMentionSchema = SchemaFactory.createForClass(XMention)
