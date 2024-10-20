import { CacheTTL, Controller, Get, Query, UseInterceptors } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import { HoldersService } from "./holders.service";
import { CacheInterceptor } from "@nestjs/cache-manager";
import { PaginationDtoAndSortDto } from "common/dto/pagination.dto";

@ApiTags("Holders")
@Controller("holders")
@UseInterceptors(CacheInterceptor)
export class HoldersController {
  constructor(private readonly holdersService: HoldersService) {}
  
}
