import { Module } from "@nestjs/common";
import { SyncEventSolanaModule } from "./solana/sync-event.module";

@Module({
  imports: [
    SyncEventSolanaModule
  ]
})
export class SyncEventModule {}
