import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import { ContractsService } from "./contracts.service";
import { ContractsDto } from "./dto/contracts.dto";

@ApiTags("Contract")
@Controller("contract")
export class ContractsController {
  constructor(private readonly contractService: ContractsService) {}

  @Get()
  async getAllContract() {
    return this.contractService.getListContract();
  }

  @Get("hold-require")
  async getListHoldTokenRequire(@Query() query: ContractsDto) {
    return this.contractService.getListHoldTokenRequire(query);
  }
}
