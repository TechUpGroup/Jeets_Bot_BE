import { Body, Controller, Get, Headers, Post, Query, Param } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AirdropsService } from "./airdrops.service";
import { Auth } from "common/decorators/http.decorators";
import { User } from "common/decorators/user.decorator";
import { UsersDocument } from "modules/users/schemas/users.schema";
import { CreateNewAirdropDto, UpdateAirdropDto } from "./dto/airdrops.dto";
import { PaginationDtoAndSortDto } from "common/dto/pagination.dto";

@ApiTags("Airdrops")
@Controller("airdrops")
export class AirdropsController {
  constructor(private readonly airdropsService: AirdropsService) { }

  @Auth()
  @Get("list")
  getListAirdrop(@User() user: UsersDocument,@Query() query: PaginationDtoAndSortDto) {
    return this.airdropsService.getListAirdrops(user, query);
  }

  @Auth()
  @Post("claim/:id")
  claim(@User() user: UsersDocument, @Param("id") id: string ) {
    return this.airdropsService.claim(user, id);
  }

  @Post("create")
  createNewAirdrop(@Headers('auth') auth: string, @Body() body: CreateNewAirdropDto) {
    return this.airdropsService.createNewAirdrop(auth, body);
  }

  @Post("update/:rank")
  updateAirdrop(@Headers('auth') auth: string, @Param("rank") rank: number, @Body() body: UpdateAirdropDto) {
    return this.airdropsService.updateAirdrop(auth, rank, body);
  }

  @Get("info")
  airdropInfos() {
    return this.airdropsService.airdropInfos();
  }
}
