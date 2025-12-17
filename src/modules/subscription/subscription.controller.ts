import { Body, Controller, Get, HttpCode, Post, Req } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { FastifyRequest } from "fastify";
import { Auth } from "../../decorators/auth.decorator";
import { AuthUser } from "../../decorators/user.decorator";
import { UserRole } from "../../enums/user.enum";
import { StripeService } from "../../services/stripe.service";
import { CancelSubscriptionDto } from "./dto/cancel-subscription.dto";
import { CreateCheckoutSessionDto } from "./dto/create-checkout-session.dto";
import { SubscriptionService } from "./subscription.service";

@ApiTags("Subscription")
@Controller({ path: "subscription", version: "1" })
export class SubscriptionController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly stripeService: StripeService,
  ) {}

  @Get("plans")
  @ApiOperation({ summary: "List available plans (from Stripe)" })
  @ApiResponse({
    status: 200,
    description: "List of active plans fetched from Stripe",
  })
  async listPlans() {
    const plans = await this.subscriptionService.listPlans();
    return { data: plans };
  }

  @Post("checkout")
  @Auth([UserRole.OWNER])
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create checkout session (owner only)" })
  @ApiResponse({
    status: 200,
    description: "Checkout session created",
  })
  async createCheckoutSession(
    @AuthUser() user: { id: string },
    @Body() dto: CreateCheckoutSessionDto,
  ) {
    const session = await this.subscriptionService.createCheckoutSession(
      user.id,
      dto.priceId,
    );
    return {
      message: "Checkout session created",
      data: session,
    };
  }

  @Get("current")
  @Auth()
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get current subscription for the user/owner group",
  })
  @ApiResponse({
    status: 200,
    description: "Current subscription status/details",
  })
  async current(@AuthUser() user: { id: string }) {
    const sub = await this.subscriptionService.getCurrentSubscriptionForUser(
      user.id,
    );
    return { data: sub };
  }

  @Post("cancel")
  @Auth([UserRole.OWNER])
  @ApiBearerAuth()
  @ApiOperation({ summary: "Cancel subscription (owner only)" })
  @ApiBody({ type: CancelSubscriptionDto })
  @ApiResponse({
    status: 200,
    description: "Cancellation requested",
  })
  async cancel(
    @AuthUser() user: { id: string },
    @Body() dto: CancelSubscriptionDto,
  ) {
    const result = await this.subscriptionService.cancelSubscription(
      user.id,
      dto.cancelAtPeriodEnd ?? true,
    );
    return { message: "Cancellation requested", data: result };
  }

  @Post("webhook")
  @HttpCode(200)
  @ApiOperation({ summary: "Stripe webhook endpoint" })
  @ApiBody({
    description:
      "Stripe webhook payload (raw body required). Signature must be in 'stripe-signature' header.",
  })
  @ApiResponse({ status: 200, description: "Webhook received" })
  async webhook(@Req() req: FastifyRequest) {
    const signature = req.headers["stripe-signature"] as string | undefined;
    // Depending on Fastify body parser, raw body may be available as rawBody or raw
    const rawBody =
      (req as any).rawBody || (req as any).raw || JSON.stringify(req.body);

    if (!signature || !rawBody) {
      throw new Error("Missing Stripe signature or raw body");
    }

    const event = this.stripeService.constructWebhookEvent(rawBody, signature);
    await this.subscriptionService.handleWebhook(event);
    return { received: true };
  }
}
