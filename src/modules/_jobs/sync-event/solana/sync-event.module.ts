import { forwardRef, Module } from "@nestjs/common";
import { HelperSolanaService } from "./services/_helper-solana.service";
import { UsersModule } from "modules/users/users.module";
import { ContractsModule } from "modules/contracts/contracts.module";
import { HistoriesModule } from "modules/histories/histories.module";
import { JobSyncEventService } from "./services/sync-event-pool.service";

@Module({
  imports: [
    forwardRef(() => UsersModule),
    forwardRef(() => ContractsModule),
    forwardRef(() => HistoriesModule),
  ],
  providers: [
    HelperSolanaService,
    JobSyncEventService,
  ],
})
export class SyncEventSolanaModule {}
