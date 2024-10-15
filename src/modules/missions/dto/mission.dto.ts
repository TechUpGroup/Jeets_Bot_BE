import { IsBoolean, IsEnum, IsOptional, IsString } from "class-validator";

import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ToBoolean } from "common/decorators/transforms.decorator";
import { SOCAIL_TYPE } from "common/enums/common";

export class CreateDto {
  @ApiProperty({
    enum: SOCAIL_TYPE,
    default: SOCAIL_TYPE.X
  })
  @IsEnum(SOCAIL_TYPE)
  type: SOCAIL_TYPE;

  @ApiProperty({
    default: "Follow X"
  })
  @IsString()
  name: string;

  @ApiProperty({
    default: ""
  })
  @IsString()
  link: string;

  @ApiProperty({
    default: 1000
  })
  reward: number;

  @ApiPropertyOptional({
    default: ""
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ type: "string", format: "binary" })
  @IsOptional()
  file?: Express.Multer.File;
}

export class UpdateDto {
  @ApiPropertyOptional({
    enum: SOCAIL_TYPE,
    default: SOCAIL_TYPE.X
  })
  @IsOptional()
  @IsEnum(SOCAIL_TYPE)
  type: SOCAIL_TYPE;

  @ApiPropertyOptional({
    default: "Follow X"
  })
  @IsOptional()
  @IsString()
  name: string;


  @ApiPropertyOptional({
    default: ""
  })
  @IsOptional()
  @IsString()
  link: string;

  @ApiPropertyOptional({
    default: 1000
  })
  @IsOptional()
  reward: number;

  @ApiPropertyOptional({
    default: ""
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ type: "string", format: "binary" })
  @IsOptional()
  file?: Express.Multer.File;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @ToBoolean()
  status?: boolean;
}