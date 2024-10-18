import { Body, Controller, Get, Headers, Param, Post, Put, UploadedFile, UseInterceptors } from "@nestjs/common";
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";
import { MissionsService } from "./missions.service";
import { Auth } from "common/decorators/http.decorators";
import { User } from "common/decorators/user.decorator";
import { UsersDocument } from "modules/users/schemas/users.schema";
import { CreateMissionDto, UpdateMissionDto } from "./dto/mission.dto";
import { FileInterceptor } from "@nestjs/platform-express";

@ApiTags("Missions")
@Controller("missions")
export class MissionsController {
  constructor(private readonly missionsService: MissionsService) { }

  @Auth()
  @Post("action/:id")
  @ApiOperation({ summary: "User performs task" })
  action(@User() user: UsersDocument, @Param('id') id: string) {
    return this.missionsService.action(user, id);
  }

  @Auth()
  @Get("user")
  @ApiOperation({ summary: "User information about active completed tasks and active tasks" })
  getUserMissions(@User() user: UsersDocument) {
    return this.missionsService.getUserMissions(user);
  }

  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    description: "File upload",
    type: CreateMissionDto,
  })
  @Post("create-mission")
  create(@Headers('auth') auth: string, @Body() body: CreateMissionDto, @UploadedFile() file?: Express.Multer.File) {
    return this.missionsService.createMission(auth, body, file);
  }

  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    description: "File upload",
    type: UpdateMissionDto,
  })
  @Put("update-mission/:mid")
  update(@Headers('auth') auth: string, @Param('mid') mid: number, @Body() body: UpdateMissionDto, @UploadedFile() file?: Express.Multer.File) {
    return this.missionsService.updateMission(auth, mid, body, file);
  }

  @Get("")
  getAll(@Headers('auth') auth: string) {
    return this.missionsService.getAll(auth);
  }
}
