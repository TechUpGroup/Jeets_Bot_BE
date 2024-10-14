import { IsEthereumAddress, IsOptional, IsString, MaxLength } from "class-validator";
import { PaginationDtoAndSortDto } from "common/dto/pagination.dto";

import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ToLowerCase, Trim } from "common/decorators/transforms.decorator";

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
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  username: string;

  @ApiPropertyOptional({ type: "string", format: "binary" })
  @IsOptional()
  file: Express.Multer.File;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio: string;
}
