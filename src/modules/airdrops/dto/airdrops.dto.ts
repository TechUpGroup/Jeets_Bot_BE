import { IsArray, IsNumber } from "class-validator";

import { ApiProperty } from "@nestjs/swagger";
import { ToArray } from "common/decorators/transforms.decorator";
import { Details } from "modules/campaigns/dto/campaigns.dto";

export class CreateNewAirdropDto {
  @ApiProperty({
    default: 0
  })
  @IsNumber()
  rank: number;

  @ApiProperty()
  @IsArray()
  @ToArray()
  details: Details[];
}

export class UpdateAirdropDto {
  @ApiProperty()
  @IsArray()
  @ToArray()
  details: Details[];
}