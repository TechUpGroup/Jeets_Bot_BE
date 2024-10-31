import { Module } from "@nestjs/common";
import { XService } from "../../_shared/x/x.service";
import { MongooseModule } from "@nestjs/mongoose";
import { X_AUTH_MODEL, XAuthSchema } from "../../_shared/x/schemas/x-auth.schema";
import { X_MENTION_MODEL, XMentionSchema } from "./schemas/x-mentions.schema";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: X_AUTH_MODEL, schema: XAuthSchema }]),
    MongooseModule.forFeature([{ name: X_MENTION_MODEL, schema: XMentionSchema }]),
  ],
  providers: [XService],
  controllers: [],
  exports: [XService],
})
export class XModule {}
