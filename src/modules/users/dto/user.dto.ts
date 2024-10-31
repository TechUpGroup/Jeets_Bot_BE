import { IsEnum, IsEthereumAddress, IsOptional, IsString, MaxLength } from "class-validator";
import { PaginationDtoAndSortDto } from "common/dto/pagination.dto";

import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ToLowerCase, Trim } from "common/decorators/transforms.decorator";
import { LEADERBOARD_TYPE } from "common/enums/common";

export class GetUsersDto extends PaginationDtoAndSortDto {
  @ApiProperty()
  @IsOptional()
  @ToLowerCase()
  @Trim()
  @IsEthereumAddress()
  address?: string;
}

export class ConnectDto {
  @ApiProperty()
  @Trim()
  code: string;
}

export class UpdateUserDto {
  @ApiProperty()
  @IsString()
  telegram_username: string;

  @ApiProperty()
  @IsString()
  twitter_username: string;
}

export class LeaderboardDto {
  @ApiProperty({
    enum: LEADERBOARD_TYPE,
    default: LEADERBOARD_TYPE.WEEK
  })
  @IsEnum(LEADERBOARD_TYPE)
  type: LEADERBOARD_TYPE;
}
