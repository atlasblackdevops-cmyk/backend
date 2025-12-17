import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OwnerGroupSubscription } from "../../database/entities/owner-group-subscription.entity";
import { SubscriptionPayment } from "../../database/entities/subscription-payment.entity";
import { User } from "../../database/entities/user.entity";
import { StripeService } from "../../services/stripe.service";
import { SubscriptionController } from "./subscription.controller";
import { SubscriptionService } from "./subscription.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OwnerGroupSubscription,
      SubscriptionPayment,
      User,
    ]),
  ],
  controllers: [SubscriptionController],
  providers: [SubscriptionService, StripeService],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
