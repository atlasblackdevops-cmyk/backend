import { Configuration, Value } from "@itgorillaz/configify";
import { IsNotEmpty, IsString } from "class-validator";

@Configuration()
export class StripeConfig {
  @Value("STRIPE_SECRET_KEY")
  @IsNotEmpty()
  @IsString()
  secretKey: string;

  @Value("STRIPE_PUBLISHABLE_KEY")
  @IsNotEmpty()
  @IsString()
  publishableKey: string;

  @Value("STRIPE_WEBHOOK_SECRET")
  @IsNotEmpty()
  @IsString()
  webhookSecret: string;

  @Value("FRONTEND_URL", { default: "http://localhost:3000" })
  @IsString()
  frontendUrl: string;

  @Value("FRONTEND_SUBSCRIPTION_SUCCESS_URL", {
    default: "http://localhost:3000/subscription/success",
  })
  @IsString()
  subscriptionSuccessUrl: string;

  @Value("FRONTEND_SUBSCRIPTION_CANCEL_URL", {
    default: "http://localhost:3000/subscription/plans",
  })
  @IsString()
  subscriptionCancelUrl: string;
}
