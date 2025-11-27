import { Configuration, Value } from "@itgorillaz/configify";
import { IsNotEmpty, IsString } from "class-validator";

@Configuration()
export class S3Config {
  @Value("AWS_REGION")
  @IsNotEmpty()
  @IsString()
  region: string;

  @Value("AWS_ACCESS_KEY_ID")
  @IsNotEmpty()
  @IsString()
  accessKeyId: string;

  @Value("AWS_SECRET_ACCESS_KEY")
  @IsNotEmpty()
  @IsString()
  secretAccessKey: string;

  @Value("AWS_S3_BUCKET_NAME")
  @IsNotEmpty()
  @IsString()
  bucketName: string;
}
