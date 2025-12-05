import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsNotEmpty, IsUUID } from "class-validator";

export class AssignAnimalsDto {
  @ApiProperty({
    description: "Array of animal UUIDs to assign to the group",
    example: [
      "123e4567-e89b-12d3-a456-426614174000",
      "123e4567-e89b-12d3-a456-426614174001",
    ],
    type: [String],
  })
  @IsNotEmpty()
  @IsArray()
  @IsUUID("4", { each: true })
  animalIds: string[];
}
