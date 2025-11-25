import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsUUID } from "class-validator";

export class SwitchFarmDto {
  @ApiProperty({ description: "Farm ID to switch to" })
  @IsUUID()
  @IsNotEmpty()
  farmId: string;
}
