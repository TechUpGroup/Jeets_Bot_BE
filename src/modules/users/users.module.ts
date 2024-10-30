import { AuthModule } from "modules/auth/auth.module";

import { forwardRef, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { USERS_MODEL, UsersSchema } from "./schemas/users.schema";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { ContractsModule } from "modules/contracts/contracts.module";
import { HoldersModule } from "modules/holders/holders.module";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: USERS_MODEL, schema: UsersSchema }]),
    forwardRef(() => AuthModule),
    forwardRef(() => HoldersModule),
    ContractsModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
