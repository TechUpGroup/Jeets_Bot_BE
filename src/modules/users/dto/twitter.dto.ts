import { ApiProperty } from "@nestjs/swagger";
import { Trim } from "common/decorators/transforms.decorator";

export class ConnectDto {
  @ApiProperty()
  @Trim()
  code: string;
}

export class ConnectTwitterDto extends ConnectDto {}

export class ConnectTelegramDto extends ConnectDto {}
