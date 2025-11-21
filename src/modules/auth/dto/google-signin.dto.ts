import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class GoogleSignInDto {
  @ApiProperty()
  @IsNotEmpty({ message: "idToken is required" })
  @IsString({ message: "idToken must be a string" })
  idToken: string;
}
