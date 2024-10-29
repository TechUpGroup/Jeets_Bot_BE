import { Module } from "@nestjs/common"
import { XService } from "./x.service"
import { MongooseModule } from "@nestjs/mongoose"
import { X_AUTH_MODEL, XAuthSchema } from "./schemas/x-auth.schema"

@Module({
  imports: [
    MongooseModule.forFeature([{ name: X_AUTH_MODEL, schema: XAuthSchema }]),
  ],
  providers: [XService],
  controllers: [],
  exports: [XService],
})
export class XModule {}
