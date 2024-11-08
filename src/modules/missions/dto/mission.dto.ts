import { IsBoolean, IsEnum, IsOptional, IsString } from "class-validator";

import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ToBoolean, Trim } from "common/decorators/transforms.decorator";
import { MISSION_TYPE, SOCAIL_TYPE } from "common/enums/common";
import { Optional } from "@nestjs/common";

export class MissionXVerifyDto {
  @ApiProperty()
  @Trim()
  @Optional()
  code: string;
}

export class CreateMissionDto {
  @ApiProperty({
    enum: SOCAIL_TYPE,
    default: SOCAIL_TYPE.X,
  })
  @IsEnum(SOCAIL_TYPE)
  type: SOCAIL_TYPE;

  @ApiProperty({
    enum: MISSION_TYPE,
    default: MISSION_TYPE.TASK,
  })
  @IsEnum(MISSION_TYPE)
  mission_type: MISSION_TYPE;

  @ApiProperty({
    default: "Follow X",
  })
  @IsString()
  name: string;

  @ApiProperty({
    default: "@jeetsol123",
  })
  @IsString()
  name_chat: string;

  @ApiProperty({
    default: "",
  })
  @IsString()
  link: string;

  @ApiProperty({
    default: 1000,
  })
  ratio: number;

  @ApiPropertyOptional({
    default: "",
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ type: "string", format: "binary" })
  @IsOptional()
  file?: Express.Multer.File;
}

export class UpdateMissionDto {
  @ApiPropertyOptional({
    enum: SOCAIL_TYPE,
    default: SOCAIL_TYPE.X,
  })
  @IsOptional()
  @IsEnum(SOCAIL_TYPE)
  type: SOCAIL_TYPE;

  @ApiPropertyOptional({
    enum: MISSION_TYPE,
    default: MISSION_TYPE.TASK,
  })
  @IsOptional()
  @IsEnum(MISSION_TYPE)
  mission_type: MISSION_TYPE;

  @ApiPropertyOptional({
    default: "Follow X",
  })
  @IsOptional()
  @IsString()
  name: string;

  @ApiPropertyOptional({
    default: "@jeetsol123",
  })
  @IsOptional()
  @IsString()
  name_chat: string;

  @ApiPropertyOptional({
    default: "",
  })
  @IsOptional()
  @IsString()
  link: string;

  @ApiPropertyOptional({
    default: 1000,
  })
  @IsOptional()
  ratio: number;

  @ApiPropertyOptional({
    default: "",
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
