import { ApiProperty } from "@nestjs/swagger";
import { IsOptional } from "class-validator";
import { Trim } from "common/decorators/transforms.decorator";

export class ConnectDto {
    @ApiProperty()
    @Trim()
    code: string;
  }
  
  export class ConnectTwitterDto extends ConnectDto {}

  export class ConnectTelegramDto extends ConnectDto {}