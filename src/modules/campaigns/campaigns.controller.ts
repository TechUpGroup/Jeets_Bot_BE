import { Body, Controller, Get, Headers, Post, Query, Param } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CampaignsService } from "./campaigns.service";
import { Auth } from "common/decorators/http.decorators";
import { User } from "common/decorators/user.decorator";
import { UsersDocument } from "modules/users/schemas/users.schema";
import { CreateNewAirdropDto, CreateNewCampaignDto, LeaderboardDto, UpdateAirdropDto } from "./dto/campaigns.dto";
import { PaginationDtoAndSortDto } from "common/dto/pagination.dto";

@ApiTags("Campaigns")
@Controller("campaigns")
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) { }

  @Auth()
  @Get("histories")
  getCampaignHistories(@User() user: UsersDocument, @Query() query: PaginationDtoAndSortDto) {
    return this.campaignsService.getCampaignHistories(user, query);
  }

  @Auth()
  @Get("list")
  getListCampaigns(@User() user: UsersDocument, @Query() query: PaginationDtoAndSortDto) {
    return this.campaignsService.getListCampaigns(user, query);
  }

  @Auth()
  @Post("airdrop/claim/:id")
  claim(@User() user: UsersDocument, @Param("id") id: string ) {
    return this.campaignsService.claim(user, id);
  }

  @Auth()
  @Get("leaderboard")
  leaderboard(@User() user: UsersDocument,@Query() query: LeaderboardDto) {
    return this.campaignsService.leaderboard(user, query);
  }

  @Post("create-new-campaign")
  createNewCampaign(@Headers('auth') auth: string, @Body() body: CreateNewCampaignDto) {
    return this.campaignsService.createNewCampaign(auth, body);
  }

  @Post("airdrop/create")
  createNewAirdrop(@Headers('auth') auth: string, @Body() body: CreateNewAirdropDto) {
    return this.campaignsService.createNewAirdrop(auth, body);
  }

  @Post("airdrop/update/:rank")
  updateAirdrop(@Headers('auth') auth: string, @Param("rank") rank: number, @Body() body: UpdateAirdropDto) {
    return this.campaignsService.updateAirdrop(auth, rank, body);
  }

  @Get("airdrop/info")
  airdropInfos() {
    return this.campaignsService.airdropInfos();
  }
}
