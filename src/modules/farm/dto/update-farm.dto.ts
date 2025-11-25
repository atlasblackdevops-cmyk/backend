import { PartialType } from "@nestjs/swagger";
import { IsBoolean, IsOptional } from "class-validator";
import { CreateFarmDto } from "./create-farm.dto";

export class UpdateFarmDto extends PartialType(CreateFarmDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
