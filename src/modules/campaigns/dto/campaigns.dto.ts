import { IsArray, IsEnum, IsNumber, IsString } from "class-validator";

import { ApiProperty } from "@nestjs/swagger";
import { ToArray } from "common/decorators/transforms.decorator";
import { CAMPAIGN_TYPE, LEADERBOARD_TYPE } from "common/enums/common";
import { PaginationDto } from "common/dto/pagination.dto";

export class Details {
  @ApiProperty()
  @IsString()
  symbol: string;

  @ApiProperty()
  @IsString()
  mint: string;

  @ApiProperty()
  @IsString()
  amount: string;

  @ApiProperty()
  @IsNumber()
  decimal: number;

  @ApiProperty()
  @IsString()
  totalSupply: string;
}

export class CreateNewCampaignDto {
  @ApiProperty({
    default: "Holder"
  })
  @IsString()
  name: string;

  @ApiProperty({
    enum: CAMPAIGN_TYPE,
    default: CAMPAIGN_TYPE.HOLD_TOKEN
  })
  @IsEnum(CAMPAIGN_TYPE)
  type: string;

  @ApiProperty()
  @IsArray()
  @ToArray()
  details: Details[];

  @ApiProperty({
    default: 0
  })
  @IsNumber()
  score: number;

  @ApiProperty({
    default: Date.now()
  })
  @IsNumber()
  start_time: number;

  @ApiProperty({
    default: Date.now() + 24 * 60 * 60 * 1000
  })
  @IsNumber()
  end_time: number;
}

export class LeaderboardDto {
  @ApiProperty({
    enum: LEADERBOARD_TYPE,
    default: LEADERBOARD_TYPE.WEEK
  })
  @IsEnum(LEADERBOARD_TYPE)
  type: LEADERBOARD_TYPE;
}