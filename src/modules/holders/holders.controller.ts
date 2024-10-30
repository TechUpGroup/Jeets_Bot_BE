import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import { HoldersService } from "./holders.service";
import { Auth } from "common/decorators/http.decorators";
import { User } from "common/decorators/user.decorator";
import { UsersDocument } from "modules/users/schemas/users.schema";

@ApiTags("Holders")
@Controller("holders")
export class HoldersController {
  constructor(private readonly holdersService: HoldersService) {}

  @Auth()
  @Get("user")
  holderValid(@User() user: UsersDocument) {
    return this.holdersService.holderValid(user);
  }
  
}
