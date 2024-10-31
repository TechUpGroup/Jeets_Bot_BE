import { Module } from "@nestjs/common";

import { SyncEventModule } from "./sync-event/sync-event.module";
import { SyncEventHolderModule } from "./sync-holder/solana/sync-event.module";
import { XJobModule } from "./x-event/x-job.module";

@Module({
  imports: [SyncEventModule, SyncEventHolderModule, XJobModule],
})
export class JobModule {}
