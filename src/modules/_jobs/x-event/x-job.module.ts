import { Module } from "@nestjs/common";
import { XJobService } from "./x-job.service";

@Module({
  providers: [XJobService],
})
export class XJobModule {}
