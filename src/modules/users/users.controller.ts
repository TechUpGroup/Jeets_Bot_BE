import { Auth } from "common/decorators/http.decorators";
import { User } from "common/decorators/user.decorator";

import { Body, Controller, Get, Param, Post, Put, Query, Redirect } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { UsersDocument } from "./schemas/users.schema";
import { UsersService } from "./users.service";
import config from "common/config";
import { ConnectTelegramDto, ConnectTwitterDto } from "./dto/twitter.dto";
import { HoldersService } from "modules/holders/holders.service";
import { LeaderboardDto } from "./dto/user.dto";

@ApiTags("Users")
@Controller("users")
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly holdersService: HoldersService,
    ) {}

  @Auth()
  @Get("me")
  async getMe(@User() user: UsersDocument) {
    const is_hold_token = await this.holdersService.checkHolder(user);
    return { ...user, is_hold_token };
  }

  @Auth()
  @Put("update-partner/:mint")
  async updatePartner(@User() user: UsersDocument, @Param("mint") mint: string) {
    return this.usersService.updatePartner(user, mint);
  }

  @Get("telegram/start")
  @ApiOperation({ summary: "Redirect to telegram to auth (Open this in browser)" })
  @Redirect(
    `https://oauth.telegram.org/auth?bot_id=${config.telegram.bot_id}&origin=${config.telegram.origin_url}&request_access=write&return_to=${config.telegram.callback_url}&force=1&unique=${Date.now()}`,
  )
  async telegramStart() {}

  @Auth()
  @Post("telegram/connect")
  connectTelegram(@User() user: UsersDocument, @Body() data: ConnectTelegramDto) {
    return this.usersService.connectTelegram(user, data);
  }

  @Get("twitter/start")
  @ApiOperation({ summary: "Redirect to twitter to auth (Open this in browser)" })
  @Redirect(
    `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${
      config.twitter.clientId
    }&redirect_uri=${encodeURIComponent(
      config.twitter.callbackURL,
    )}&scope=tweet.read%20tweet.write%20users.read%20follows.read%20follows.write%20like.read%20like.write%20offline.access&state=twitter&code_challenge=challenge&code_challenge_method=plain`,
  )
  async twitterStart() {}

  @Auth()
  @Post("twitter/connect")
  @ApiOperation({ summary: "Connect twitter" })
  async twitterConnect(@User() user: UsersDocument, @Body() data: ConnectTwitterDto) {
    return this.usersService.twitterConnect(user, data);
  }

  @Auth()
  @Get("twitter/restart")
  @ApiOperation({ summary: "Generate X mission URL" })
  reStart(@User() user: UsersDocument) {
    return this.usersService.reStart(user);
  }

  @Auth()
  @Post("twitter/reconnect")
  @ApiOperation({ summary: "Connect twitter" })
  async twitterReConnect(@User() user: UsersDocument, @Body() data: ConnectTwitterDto) {
    return this.usersService.twitterConnect(user, data, true);
  }

  @Auth()
  @Get("leaderboard")
  leaderboard(@User() user: UsersDocument,@Query() query: LeaderboardDto) {
    return this.usersService.leaderboard(user, query);
  }
}
