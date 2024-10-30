import { IsOptional, IsString } from "class-validator";

import { ApiPropertyOptional } from "@nestjs/swagger";

export class ContractsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mint: string;
}