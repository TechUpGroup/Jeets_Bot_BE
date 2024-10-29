import { forwardRef, Module } from "@nestjs/common";
import { UsersModule } from "modules/users/users.module";
import { ContractsModule } from "modules/contracts/contracts.module";
import { JobSyncHolderService } from "./services/sync-holder.service";
import { HoldersModule } from "modules/holders/holders.module";

@Module({
  imports: [
    forwardRef(() => UsersModule),
    forwardRef(() => ContractsModule),
    forwardRef(() => HoldersModule),
  ],
  providers: [
    JobSyncHolderService,
  ],
})
export class SyncEventHolderModule {}
