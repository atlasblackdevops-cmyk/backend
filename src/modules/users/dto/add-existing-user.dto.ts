import { ApiProperty } from "@nestjs/swagger";
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsUUID,
} from "class-validator";

export class AddExistingUserDto {
  @ApiProperty({
    description: "ID of the user to add to the current farm",
    format: "uuid",
  })
  @IsNotEmpty({ message: "User ID is required" })
  @IsUUID("4", { message: "User ID must be a valid UUID" })
  userId: string;

  @ApiProperty({
    description:
      "Role ID to assign to the user for this farm (cannot be OWNER or SUPER_ADMIN)",
    format: "uuid",
  })
  @IsNotEmpty({ message: "Role ID is required" })
  @IsUUID("4", { message: "Role ID must be a valid UUID" })
  roleId: string;

  @ApiProperty({
    description: "Array of permission IDs to assign to the user for this farm",
    type: [String],
  })
  @IsNotEmpty({ message: "Permission IDs are required" })
  @IsArray({ message: "Permission IDs must be an array" })
  @ArrayNotEmpty({
    message: "Permission IDs array cannot be empty",
  })
  @ArrayUnique({ message: "Permission IDs must be unique" })
  @IsUUID("4", {
    each: true,
    message: "Each permission ID must be a valid UUID",
  })
  permissionIds: string[];
}
