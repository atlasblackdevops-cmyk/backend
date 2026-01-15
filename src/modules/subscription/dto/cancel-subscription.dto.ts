import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional } from "class-validator";

export class CancelSubscriptionDto {
  @ApiPropertyOptional({
    description:
      "Cancel at period end (default true). Set false to cancel immediately.",
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  cancelAtPeriodEnd?: boolean = true;
}
