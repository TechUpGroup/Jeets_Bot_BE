import { forwardRef, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { WithdrawsController } from "./withdraw.controller";
import { WithdrawsService } from "./withdraw.service";
import { USER_WITHDRAWS_MODEL, UserWithdrawSchema } from "./schemas/users-withdraw.schema";
import { UsersModule } from "modules/users/users.module";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: USER_WITHDRAWS_MODEL, schema: UserWithdrawSchema }]),
    forwardRef(() => UsersModule), 
  ],
  controllers: [WithdrawsController],
  providers: [WithdrawsService],
  exports: [WithdrawsService],
})
export class WithdrawsModule {}
