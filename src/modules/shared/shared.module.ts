import { ConfigifyModule } from "@itgorillaz/configify";
import { Global, Module } from "@nestjs/common";
import { S3Config } from "../../config/s3.config";
import { S3Service } from "../../services/s3.service";

@Global()
@Module({
  imports: [ConfigifyModule],
  providers: [S3Config, S3Service],
  exports: [S3Service],
})
export class SharedModule {}
