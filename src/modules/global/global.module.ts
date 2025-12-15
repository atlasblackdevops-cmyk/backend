import { Global, Module } from "@nestjs/common";
import { BcryptService } from "../../services/bcrypt.service";
import { StripeService } from "../../services/stripe.service";

@Global()
@Module({
  controllers: [],
  providers: [BcryptService, StripeService],
  exports: [BcryptService, StripeService],
})
export class GlobalModule {}
