import { Module } from "@nestjs/common";
import { XJobService } from "./x-job.service";
import { MongooseModule } from "@nestjs/mongoose";
import { X_MENTION_MODEL, XMentionSchema } from "modules/_shared/x/schemas/x-mentions.schema";

@Module({
  imports: [MongooseModule.forFeature([{ name: X_MENTION_MODEL, schema: XMentionSchema }])],
  providers: [XJobService],
})
export class XJobModule {}
