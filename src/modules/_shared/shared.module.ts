import { LogsModule } from "modules/logs/logs.module";

import { HttpModule } from "@nestjs/axios";
import { Global, Module } from "@nestjs/common";

import { CacheService } from "./services/cache.service";
import { S3Service } from "./services/s3.service";
import { SolanasService } from "./services/solana.service";

const providers = [CacheService, S3Service, SolanasService];
const modules = [HttpModule, LogsModule];

@Global()
@Module({
  providers,
  imports: modules,
  exports: [...providers, ...modules],
})
export class SharedModule {}
