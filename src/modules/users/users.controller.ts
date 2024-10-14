import { Auth } from "common/decorators/http.decorators";
import { User } from "common/decorators/user.decorator";

import { Body, Controller, Get, Post, UploadedFile, UseInterceptors } from "@nestjs/common";
import { ApiBody, ApiConsumes, ApiTags } from "@nestjs/swagger";

import { UsersDocument } from "./schemas/users.schema";
import { UsersService } from "./users.service";
import { UpdateUserDto } from "./dto/user.dto";
import { FileInterceptor } from "@nestjs/platform-express";

@ApiTags("Users")
@Controller("users")
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    ) {}

  @Auth()
  @Get("me")
  async getMe(@User() user: UsersDocument) {
    return user;
  }

  @Auth()
  @Post("update")
  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    description: 'File upload',
    type: UpdateUserDto,
  })
  async update(@User() user: UsersDocument, @UploadedFile() file: Express.Multer.File, @Body() body: UpdateUserDto) {
    return this.usersService.updateUser(user, file, body);
  }
}
