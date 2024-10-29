import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from "class-validator";

import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ToBoolean } from "common/decorators/transforms.decorator";

export class CreateSessionVoteDto {
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

export class CreateDto {
  @ApiProperty({
    default: "Follow X"
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({ type: "string", format: "binary" })
  @IsOptional()
  file?: Express.Multer.File;
}

export class UpdateDto {
  @ApiPropertyOptional({
    default: "Follow X"
  })
  @IsOptional()
  @IsString()
  name: string;

  @ApiPropertyOptional({ type: "string", format: "binary" })
  @IsOptional()
  file?: Express.Multer.File;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @ToBoolean()
  status?: boolean;
}