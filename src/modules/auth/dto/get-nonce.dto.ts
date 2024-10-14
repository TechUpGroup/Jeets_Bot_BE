import { ApiProperty } from "@nestjs/swagger";

export class GetNonceDto {
  @ApiProperty()
  address: string;
}
