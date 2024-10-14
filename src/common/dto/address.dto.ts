import { IsDefined } from "class-validator";
import { Trim } from "common/decorators/transforms.decorator";

import { ApiProperty } from "@nestjs/swagger";

export class AddressDto {
  @ApiProperty()
  @IsDefined()
  @Trim()
  address: string;
}
