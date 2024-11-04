import { IsArray, IsNumber, IsOptional, IsString } from "class-validator";

import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ToArray } from "common/decorators/transforms.decorator";

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
  pid: number;
}

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

export class CreateNewPoolDto {
  @ApiProperty({
    default: 0
  })
  @IsNumber()
  pid: number;

  @ApiProperty({
    default: "0"
  })
  @IsString()
  total: string;

  @ApiProperty({
    default: ""
  })
  @IsString()
  pool_address: string;

  @ApiProperty()
  detail: Details;
}

export class UpdatePoolDto {
  @ApiPropertyOptional({
    default: "0"
  })
  @IsOptional()
  @IsString()
  total: string;

  @ApiPropertyOptional({
    default: ""
  })
  @IsOptional()
  @IsString()
  pool_address: string;

  @ApiPropertyOptional()
  @IsOptional()
  detail: Details;
}