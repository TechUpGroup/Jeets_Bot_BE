import { forwardRef, Module } from "@nestjs/common";
import { HelperSolanaService } from "./services/_helper-solana.service";
import { UsersModule } from "modules/users/users.module";
import { ContractsModule } from "modules/contracts/contracts.module";
import { HistoriesModule } from "modules/histories/histories.module";
import { JobSyncEventService } from "./services/sync-event-pool.service";
import { VotingsModule } from "modules/votings/votings.module";
import { JobSyncEventVotingService } from "./services/sync-event-voting.service";
import { CampaignsModule } from "modules/campaigns/campaigns.module";
import { JobSyncEventTokenService } from "./services/sync-event-token.service";

@Module({
  imports: [
    forwardRef(() => UsersModule),
    forwardRef(() => ContractsModule),
    forwardRef(() => HistoriesModule),
    VotingsModule,
    CampaignsModule
  ],
  providers: [
    HelperSolanaService,
    JobSyncEventService,
    JobSyncEventVotingService,
    JobSyncEventTokenService
  ],
})
export class SyncEventSolanaModule {}
