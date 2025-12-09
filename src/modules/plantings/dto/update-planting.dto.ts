import { PartialType } from "@nestjs/swagger";
import { CreatePlantingDto } from "./create-planting.dto";

export class UpdatePlantingDto extends PartialType(CreatePlantingDto) {}
