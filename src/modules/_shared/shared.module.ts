import { LogsModule } from "modules/logs/logs.module";

import { HttpModule } from "@nestjs/axios";
import { Global, Module } from "@nestjs/common";

import { CacheService } from "./services/cache.service";
import { S3Service } from "./services/s3.service";
import { SolanasService } from "./services/solana.service";
import { TelegramService } from "./services/telegram.service";
import { XModule } from "./x/x.module";
import { RedisService } from "./services/redis.service";

const providers = [RedisService, CacheService, S3Service, SolanasService, TelegramService];
const modules = [HttpModule, LogsModule, XModule];

@Global()
@Module({
  providers,
  imports: modules,
  exports: [...providers, ...modules],
})
export class SharedModule {}
