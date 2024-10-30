import { Controller } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import { HoldersService } from "./holders.service";

@ApiTags("Holders")
@Controller("holders")
export class HoldersController {
  constructor(private readonly holdersService: HoldersService) {}
  
}
