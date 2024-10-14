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

@Module({
  imports: [
    // global module
    ...(config.cron ? [ScheduleModule.forRoot()] : []),
    MongooseModule.forRoot(config.mongoose.uri, config.mongoose.options),
    CacheModule.register({ isGlobal: true }),
    // CacheModule.register(config.redisConfig),
    I18nModule.forRoot({
      fallbackLanguage: config.fallbackLanguage,
      loaderOptions: {
        path: join(__dirname, "/i18n/"),
        watch: config.isDevelopment,
      },
      resolvers: [{ use: QueryResolver, options: ["lang"] }, AcceptLanguageResolver],
    }),
    SharedModule,
    // app modules
    AuthModule,
    UsersModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: I18nAllExceptionFilter },
    // { provide: APP_INTERCEPTOR, useClass: CacheInterceptor },
  ],
})
export class AppModule {}
