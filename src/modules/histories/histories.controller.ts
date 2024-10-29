import { CacheTTL, Controller, Get, Query, UseInterceptors } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import { HistoriesService } from "./histories.service";
import { CacheInterceptor } from "@nestjs/cache-manager";
import { PaginationDtoAndSortDto } from "common/dto/pagination.dto";

@ApiTags("Histories")
@Controller("histories")
@UseInterceptors(CacheInterceptor)
export class HistoriesController {
  constructor(private readonly historiesService: HistoriesService) {}
  
  @Get("")
  async histories(@Query() query: PaginationDtoAndSortDto) {
    return this.historiesService.histories(query);
  }

  @Get("remain")
  @CacheTTL(10 * 1000)
  async remain() {
    return this.historiesService.remainAmount();
  }
}
