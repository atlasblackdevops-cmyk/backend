import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class CreateCheckoutSessionDto {
  @ApiProperty({
    description: "Stripe Price ID for the selected plan",
    example: "price_123",
  })
  @IsNotEmpty()
  @IsString()
  priceId: string;
}
