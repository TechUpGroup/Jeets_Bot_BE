import config from "common/config";
import { I18nAllExceptionFilter } from "common/filters/i18n-all-exception.filter";
import { SharedModule } from "modules/_shared/shared.module";
import { AcceptLanguageResolver, I18nModule, QueryResolver } from "nestjs-i18n";
import { join } from "path";
import { Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { MongooseModule } from "@nestjs/mongoose";
import { ScheduleModule } from "@nestjs/schedule";
import { AuthModule } from "modules/auth/auth.module";
import { UsersModule } from "modules/users/users.module";
import { CacheModule } from "@nestjs/cache-manager";
import { ContractsModule } from "modules/contracts/contracts.module";
import { JobModule } from "modules/_jobs/job.module";
import { HistoriesModule } from "modules/histories/histories.module";
import { VotingsModule } from "modules/votings/votings.module";
import { MissionsModule } from "modules/missions/missions.module";
import { HoldersModule } from "modules/holders/holders.module";
import { CampaignsModule } from "modules/campaigns/campaigns.module";

@Module({
  imports: [
    // global module
    ...(config.cron ? [ScheduleModule.forRoot()] : []),
    MongooseModule.forRoot(config.mongoose.uri, config.mongoose.options),
    // CacheModule.register({ isGlobal: true }),
    CacheModule.register(config.redisConfig),
    I18nModule.forRoot({
      fallbackLanguage: config.fallbackLanguage,
      loaderOptions: {
        path: join(__dirname, "/i18n/"),
        watch: config.isDevelopment,
      },
      resolvers: [{ use: QueryResolver, options: ["lang"] }, AcceptLanguageResolver],
    }),
    JobModule,
    SharedModule,
    // app modules
    AuthModule,
    UsersModule,
    ContractsModule,
    HistoriesModule,
    MissionsModule,
    VotingsModule,
    HoldersModule,
    CampaignsModule
  ],
  providers: [
    { provide: APP_FILTER, useClass: I18nAllExceptionFilter },
    // { provide: APP_INTERCEPTOR, useClass: CacheInterceptor },
  ],
})
export class AppModule {}
