import { IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from "class-validator";

import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ToArray, ToBoolean } from "common/decorators/transforms.decorator";
import { CAMPAIGN_TYPE } from "common/enums/common";

export class Details {
  @ApiProperty()
  @IsString()
  synbol: string;

  @ApiProperty()
  @IsString()
  mint: string;

  @ApiProperty()
  @IsNumber()
  amount: number;
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