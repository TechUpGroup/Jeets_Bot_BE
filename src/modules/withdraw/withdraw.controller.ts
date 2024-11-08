import { Auth } from "common/decorators/http.decorators";
import { User } from "common/decorators/user.decorator";
import { BadRequestException, Controller, Get, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { WithdrawsService } from "./withdraw.service";
import { UsersDocument } from "modules/users/schemas/users.schema";

@ApiTags("Withdraw")
@Controller("withdraw")
export class WithdrawsController {
  private isProcessing = {}
  constructor(private readonly withdrawService: WithdrawsService) { }

  @Auth()
  @Post("token")
  @ApiOperation({ summary: "Generate a signauture for withdraw token USDT" })
  async withdrawToken(@User() user: UsersDocument) {
    try {
      if (this.isProcessing[user.address]) {
        throw new BadRequestException("Too many requests from this user")
      };
      this.isProcessing[user.address] = true;
      const res = await this.withdrawService.withdrawToken(user);
      delete this.isProcessing[user.address];
      return res;
    } catch (e) {
      if (!e?.message || !e?.message.match("Too many requests from this user")) {
        delete this.isProcessing[user.address];
      }
      throw e;
    }
  }

  @Auth()
  @Get("check-retryTx")
  @ApiOperation({ summary: "Check if there are any transactions that need to be retried" })
  checkRetryTx(@User() user: UsersDocument) {
    return this.withdrawService.checkRetryTx(user);
  }
}
