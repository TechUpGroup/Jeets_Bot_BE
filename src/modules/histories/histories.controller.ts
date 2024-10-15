import { CacheTTL, Controller, Get, UseInterceptors } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import { HistoriesService } from "./histories.service";
import { CacheInterceptor } from "@nestjs/cache-manager";

@ApiTags("Histories")
@Controller("histories")
@UseInterceptors(CacheInterceptor)
export class HistoriesController {
  constructor(
    private readonly historiesService: HistoriesService,
    ) {}

  @Get("remain")
  @CacheTTL(10 * 1000)
  async remain() {
    return this.historiesService.remainAmount();
  }

}
