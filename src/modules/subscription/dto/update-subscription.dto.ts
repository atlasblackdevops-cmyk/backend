import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class UpdateSubscriptionDto {
  @ApiProperty({
    description: "Target Stripe price ID to switch the subscription to",
    example: "price_123",
  })
  @IsString()
  @IsNotEmpty()
  newPriceId: string;
}
