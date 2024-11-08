import { ApiProperty } from "@nestjs/swagger";

export class WithdrawDto {
  @ApiProperty({
    default: 25
  })
  amount: number;
}