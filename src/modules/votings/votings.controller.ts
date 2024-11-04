import { Body, Controller, Get, Headers, Param, Post, UploadedFile, UseInterceptors } from "@nestjs/common";
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";
import { VotingsService } from "./votings.service";
import { Auth } from "common/decorators/http.decorators";
import { User } from "common/decorators/user.decorator";
import { UsersDocument } from "modules/users/schemas/users.schema";
import { CreateDto, CreateSessionVoteDto } from "./dto/votings.dto";
import { FileInterceptor } from "@nestjs/platform-express";

@ApiTags("Votings")
@Controller("votings")
export class VotingsController {
  constructor(private readonly votingsService: VotingsService) { }

  @Auth()
  @Post("create-vote/:wid")
  @ApiOperation({ summary: "User performs task" })
  createVote(@User() user: UsersDocument, @Param('wid') wid: number) {
    return this.votingsService.createVote(user, wid);
  }

  @Auth()
  @Get("user")
  @ApiOperation({ summary: "User information about active completed tasks and active tasks" })
  getUserVotings(@User() user: UsersDocument) {
    return this.votingsService.getUserVotings(user);
  }

  @Auth()
  @Get("check")
  checkVotingProcess(@User() user: UsersDocument) {
    return this.votingsService.checkVotingProcess(user);
  }

  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    description: "File upload",
    type: CreateDto,
  })
  @Post("add-whitelist")
  addWhiteList(@Headers('auth') auth: string, @Body() body: CreateDto, @UploadedFile() file?: Express.Multer.File) {
    return this.votingsService.addWhiteList(auth, body, file);
  }

  @Post("create-session-vote")
  createSessionVote(@Headers('auth') auth: string, @Body() body: CreateSessionVoteDto) {
    return this.votingsService.createSessionVote(auth, body);
  }
}
