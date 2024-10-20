import { Module } from "@nestjs/common";

import { SyncEventModule } from "./sync-event/sync-event.module";
import { SyncEventHolderModule } from "./sync-holder/solana/sync-event.module";

@Module({
  imports: [
    // SyncEventModule, 
    SyncEventHolderModule],
})
export class JobModule {}
