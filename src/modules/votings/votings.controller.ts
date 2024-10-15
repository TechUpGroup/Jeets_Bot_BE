import { Body, Controller, Get, Headers, Param, Post, Put, UploadedFile, UseInterceptors } from "@nestjs/common";
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";
import { VotingsService } from "./votings.service";
import { Auth } from "common/decorators/http.decorators";
import { User } from "common/decorators/user.decorator";
import { UsersDocument } from "modules/users/schemas/users.schema";
import { CreateDto, UpdateDto } from "./dto/votings.dto";
import { FileInterceptor } from "@nestjs/platform-express";

@ApiTags("Votings")
@Controller("votings")
export class VotingsController {
  constructor(private readonly votingsService: VotingsService) { }

  @Auth()
  @Post("action/:id")
  @ApiOperation({ summary: "User performs task" })
  action(@User() user: UsersDocument, @Param('id') id: string) {
    return this.votingsService.action(user, id);
  }

  @Auth()
  @Get("user")
  @ApiOperation({ summary: "User information about active completed tasks and active tasks" })
  getUserVotings(@User() user: UsersDocument) {
    return this.votingsService.getUserVotings(user);
  }
}
