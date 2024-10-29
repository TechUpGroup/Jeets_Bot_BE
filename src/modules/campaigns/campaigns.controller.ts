import { Body, Controller, Get, Headers, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CampaignsService } from "./campaigns.service";
import { Auth } from "common/decorators/http.decorators";
import { User } from "common/decorators/user.decorator";
import { UsersDocument } from "modules/users/schemas/users.schema";
import { CreateNewCampaignDto, LeaderboardDto } from "./dto/campaigns.dto";
import { PaginationDtoAndSortDto } from "common/dto/pagination.dto";

@ApiTags("Campaigns")
@Controller("campaigns")
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) { }

  @Auth()
  @Get("histories")
  getCampaignHistories(@User() user: UsersDocument,@Query() query: PaginationDtoAndSortDto) {
    return this.campaignsService.getCampaignHistories(user, query);
  }

  @Get("list")
  getListCampaigns(@Query() query: PaginationDtoAndSortDto) {
    return this.campaignsService.getListCampaigns(query);
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
}
