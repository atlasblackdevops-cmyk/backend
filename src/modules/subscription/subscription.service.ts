import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import Stripe from "stripe";
import { Repository } from "typeorm";
import { StripeConfig } from "../../config/stripe.config";
import {
  OwnerGroupSubscription,
  SubscriptionStatus,
} from "../../database/entities/owner-group-subscription.entity";
import {
  PaymentStatus,
  SubscriptionPayment,
} from "../../database/entities/subscription-payment.entity";
import { User } from "../../database/entities/user.entity";
import { UserRole } from "../../enums/user.enum";
import { StripeService } from "../../services/stripe.service";

type StripeSubStatus =
  | "active"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "past_due"
  | "paused"
  | "trialing"
  | "unpaid";

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(OwnerGroupSubscription)
    private readonly subscriptions: Repository<OwnerGroupSubscription>,
    @InjectRepository(SubscriptionPayment)
    private readonly payments: Repository<SubscriptionPayment>,
    private readonly stripeService: StripeService,
    private readonly stripeConfig: StripeConfig,
  ) {}

  /**
   * List available plans from Stripe (always fresh from Stripe API).
   * Optionally filter by allowed price IDs (pass a list to restrict).
   */
  async listPlans(allowPriceIds?: string[]) {
    const prices = await this.stripeService.listPrices(true, 100);

    const filtered = allowPriceIds
      ? prices.filter((p) => allowPriceIds.includes(p.id))
      : prices;

    // Enrich with product details
    return Promise.all(
      filtered.map(async (price) => {
        const details = await this.stripeService.getPlanDetails(price.id);
        return {
          priceId: price.id,
          productId: price.product as string,
          name: details.name,
          amount: details.amount,
          currency: details.currency,
          interval: details.interval,
          intervalCount: details.intervalCount,
          description: details.description,
          metadata: price.metadata,
        };
      }),
    );
  }

  /**
   * Create a Stripe Checkout Session for an owner.
   */
  async createCheckoutSession(ownerId: string, priceId: string) {
    const owner = await this.users.findOne({
      where: { id: ownerId },
      relations: ["role"],
    });
    if (!owner) throw new NotFoundException("Owner not found");
    if (owner.role?.roleName !== UserRole.OWNER) {
      throw new BadRequestException("Only owners can start checkout");
    }
    if (!owner.ownerGroupId) {
      throw new BadRequestException("Owner does not have ownerGroupId");
    }

    // reuse existing subscription/customer if any
    const existingSub = await this.subscriptions.findOne({
      where: { ownerGroupId: owner.ownerGroupId },
    });

    // Validate existing subscription status
    if (existingSub) {
      const isActiveLike =
        existingSub.status === SubscriptionStatus.ACTIVE ||
        existingSub.status === SubscriptionStatus.TRIALING ||
        existingSub.status === SubscriptionStatus.PAST_DUE;
      const periodStillValid =
        !!existingSub.currentPeriodEnd &&
        existingSub.currentPeriodEnd.getTime() > Date.now();
      const cancelAtPeriodEndFuture =
        existingSub.cancelAtPeriodEnd && periodStillValid;

      // Prevent creating new checkout if active subscription exists
      if (
        isActiveLike &&
        (periodStillValid || existingSub.status === SubscriptionStatus.ACTIVE)
      ) {
        throw new BadRequestException(
          "An active subscription already exists; use plan change instead of starting a new checkout.",
        );
      }

      // Prevent creating new checkout if subscription is pending cancellation
      // User should use "change plan" button to reactivate instead
      if (cancelAtPeriodEndFuture) {
        throw new BadRequestException(
          "A subscription is pending cancellation. Use 'Change Plan' to reactivate it, or wait until the period ends to start a new subscription.",
        );
      }

      // If subscription is CANCELED and period has ended, allow new purchase
      // The old subscription will be updated by webhook when new one is created
      if (existingSub.status === SubscriptionStatus.CANCELED) {
        this.logger.log(
          `Creating new checkout for ownerGroupId=${owner.ownerGroupId} with existing CANCELED subscription. Old subscription will be replaced.`,
        );
      }
    }

    // Reuse customer ID if exists, otherwise create new customer
    let stripeCustomerId =
      existingSub?.stripeCustomerId ??
      (await this.ensureStripeCustomer(owner.email, owner.name));

    // Build success and cancel URLs with query parameters
    const successUrl = new URL(this.stripeConfig.subscriptionSuccessUrl);
    successUrl.searchParams.set("session_id", "{CHECKOUT_SESSION_ID}");
    successUrl.searchParams.set("ownerGroupId", owner.ownerGroupId);
    successUrl.searchParams.set("ownerId", owner.id);

    const cancelUrl = new URL(this.stripeConfig.subscriptionCancelUrl);
    cancelUrl.searchParams.set("ownerGroupId", owner.ownerGroupId);
    cancelUrl.searchParams.set("ownerId", owner.id);

    const session = await this.stripeService.createCheckoutSession(
      stripeCustomerId,
      priceId,
      successUrl.toString(),
      cancelUrl.toString(),
      {
        ownerGroupId: owner.ownerGroupId,
        ownerId: owner.id,
      },
    );

    return {
      url: session.url,
      id: session.id,
    };
  }

  private async ensureStripeCustomer(email: string, name?: string) {
    const customer = await this.stripeService.createCustomer(email, name);
    return customer.id;
  }

  /**
   * Change plan for an existing subscription (upgrade/downgrade/reactivate).
   *
   * Handles three scenarios:
   * 1. Reactivation: If subscription is pending cancellation, reactivates it
   * 2. Upgrade/Downgrade: If subscription is active, changes the plan
   * 3. Same plan: If new price is same as current, just reactivates if needed
   */
  async changePlan(ownerId: string, newPriceId: string) {
    const owner = await this.users.findOne({
      where: { id: ownerId },
      relations: ["role"],
    });
    if (!owner) throw new NotFoundException("Owner not found");
    if (owner.role?.roleName !== UserRole.OWNER) {
      throw new BadRequestException("Only owners can change subscription plan");
    }
    if (!owner.ownerGroupId) {
      throw new BadRequestException("Owner does not have ownerGroupId");
    }

    const sub = await this.subscriptions.findOne({
      where: { ownerGroupId: owner.ownerGroupId },
    });
    if (!sub || !sub.stripeSubscriptionId) {
      throw new NotFoundException(
        "Active subscription not found to change plan",
      );
    }

    // Validate subscription status - only allow plan changes for active subscriptions
    if (
      sub.status !== SubscriptionStatus.ACTIVE &&
      sub.status !== SubscriptionStatus.TRIALING
    ) {
      // Check if subscription was cancelled - provide helpful error message
      if (sub.status === SubscriptionStatus.CANCELED) {
        throw new BadRequestException(
          `Cannot change plan for cancelled subscription. Your subscription was cancelled. Please contact support to reactivate it.`,
        );
      }
      throw new BadRequestException(
        `Cannot change plan for subscription with status: ${sub.status}. Only ACTIVE or TRIALING subscriptions can be changed.`,
      );
    }

    // Verify subscription is still active in Stripe before proceeding
    try {
      const stripeSubscription = await this.stripeService.getSubscription(
        sub.stripeSubscriptionId,
      );
      if (
        stripeSubscription.status === "canceled" ||
        stripeSubscription.status === "incomplete_expired"
      ) {
        throw new BadRequestException(
          `Cannot change plan: Subscription has been cancelled in Stripe. Please contact support.`,
        );
      }
    } catch (error: any) {
      // If it's our BadRequestException, re-throw it
      if (error instanceof BadRequestException) {
        throw error;
      }
      // Otherwise log and continue (might be a network issue)
      this.logger.warn(
        `Failed to verify subscription status in Stripe: ${error.message}`,
      );
    }

    // Check if period has ended (for pending cancellations)
    const periodEnded =
      sub.currentPeriodEnd && sub.currentPeriodEnd.getTime() <= Date.now();
    if (sub.cancelAtPeriodEnd && periodEnded) {
      throw new BadRequestException(
        "Subscription period has already ended. Please start a new subscription instead.",
      );
    }

    // Scenario 1: Reactivation (pending cancellation + same or different plan)
    // If subscription is pending cancellation, reactivate it first
    if (sub.cancelAtPeriodEnd && !periodEnded) {
      this.logger.log(
        `Subscription is pending cancellation. Reactivating and ${sub.stripePriceId === newPriceId ? "keeping same plan" : "changing plan"}.`,
      );

      // If same plan, just reactivate
      if (sub.stripePriceId === newPriceId) {
        const reactivated = await this.stripeService.reactivateSubscription(
          sub.stripeSubscriptionId,
        );
        await this.applySubscriptionUpdate(owner.ownerGroupId, reactivated);
        return {
          message: "Subscription reactivated successfully",
          subscriptionId: reactivated.id,
          priceId: newPriceId,
          status: reactivated.status,
          reactivated: true,
          planChanged: false,
        };
      }

      // If different plan, reactivate AND change plan in one call
      // Stripe allows this - setting cancel_at_period_end to false and changing price
      const updated = await this.stripeService.updateSubscription(
        sub.stripeSubscriptionId,
        newPriceId,
      );
      // Also explicitly remove cancellation
      const reactivated = await this.stripeService.reactivateSubscription(
        sub.stripeSubscriptionId,
      );

      this.logger.log(
        `Plan changed for ownerGroupId=${owner.ownerGroupId}: ` +
          `from price=${sub.stripePriceId} to price=${newPriceId}. ` +
          `Subscription also reactivated.`,
      );

      await this.applySubscriptionUpdate(owner.ownerGroupId, reactivated);

      return {
        message: "Subscription reactivated and plan changed successfully",
        subscriptionId: reactivated.id,
        priceId: newPriceId,
        status: reactivated.status,
        reactivated: true,
        planChanged: true,
      };
    }

    // Scenario 2: Upgrade/Downgrade (active subscription, different plan)
    if (sub.stripePriceId !== newPriceId) {
      // Determine if this is a downgrade by comparing prices
      const oldPrice = await this.stripeService.getPrice(sub.stripePriceId);
      const newPrice = await this.stripeService.getPrice(newPriceId);

      const oldPriceAmount = oldPrice.unit_amount || 0;
      const newPriceAmount = newPrice.unit_amount || 0;
      const isDowngrade = newPriceAmount < oldPriceAmount;

      // For downgrades, schedule change at period end (no immediate charge, no refund)
      // For upgrades, apply immediately with proration
      const scheduleAtPeriodEnd = isDowngrade;

      this.logger.log(
        `Plan change requested for ownerGroupId=${owner.ownerGroupId}: ` +
          `from price=${sub.stripePriceId} ($${(oldPriceAmount / 100).toFixed(2)}) ` +
          `to price=${newPriceId} ($${(newPriceAmount / 100).toFixed(2)}). ` +
          `Type: ${isDowngrade ? "DOWNGRADE" : "UPGRADE"}. ` +
          `Schedule at period end: ${scheduleAtPeriodEnd}`,
      );

      // Pass currentPeriodEnd timestamp for scheduling (convert Date to Unix timestamp)
      const currentPeriodEndTimestamp = sub.currentPeriodEnd
        ? Math.floor(sub.currentPeriodEnd.getTime() / 1000)
        : undefined;

      const updated = await this.stripeService.updateSubscription(
        sub.stripeSubscriptionId,
        newPriceId,
        scheduleAtPeriodEnd,
        currentPeriodEndTimestamp,
        owner.ownerGroupId,
        owner.id,
      );

      await this.applySubscriptionUpdate(owner.ownerGroupId, updated);

      const currentPeriodEnd = sub.currentPeriodEnd
        ? sub.currentPeriodEnd.toISOString()
        : "unknown";

      return {
        message: scheduleAtPeriodEnd
          ? `Subscription plan change scheduled for period end (${currentPeriodEnd}). Your current plan ($${(oldPriceAmount / 100).toFixed(2)}) will remain active until then. The new plan ($${(newPriceAmount / 100).toFixed(2)}) will start automatically.`
          : `Subscription plan updated successfully. You've been upgraded to the new plan and charged a prorated amount.`,
        subscriptionId: updated.id,
        priceId: newPriceId,
        status: updated.status,
        reactivated: false,
        planChanged: true,
        scheduledAtPeriodEnd: scheduleAtPeriodEnd,
        currentPeriodEnd: sub.currentPeriodEnd?.toISOString(),
        isDowngrade,
      };
    }

    // Scenario 3: Same plan (no change needed)
    return {
      message: "Subscription is already on this plan",
      subscriptionId: sub.stripeSubscriptionId,
      priceId: newPriceId,
      status: sub.status,
      reactivated: false,
      planChanged: false,
    };
  }

  /**
   * Get current subscription for an ownerGroupId.
   */
  async getCurrentSubscriptionForUser(userId: string) {
    const user = await this.users.findOne({
      where: { id: userId },
      relations: ["role"],
    });
    if (!user) throw new NotFoundException("User not found");
    if (!user.ownerGroupId)
      throw new NotFoundException("User has no owner group assigned");

    const sub = await this.subscriptions.findOne({
      where: { ownerGroupId: user.ownerGroupId },
    });
    if (!sub) {
      return { status: "NONE" };
    }
    return sub;
  }

  /**
   * Cancel subscription (owner only).
   */
  async cancelSubscription(ownerId: string, cancelAtPeriodEnd = true) {
    const owner = await this.users.findOne({
      where: { id: ownerId },
      relations: ["role"],
    });
    if (!owner) throw new NotFoundException("Owner not found");
    if (owner.role?.roleName !== UserRole.OWNER) {
      throw new BadRequestException("Only owners can cancel subscription");
    }
    if (!owner.ownerGroupId) {
      throw new BadRequestException("Owner does not have ownerGroupId");
    }

    const sub = await this.subscriptions.findOne({
      where: { ownerGroupId: owner.ownerGroupId },
    });
    if (!sub || !sub.stripeSubscriptionId) {
      throw new NotFoundException("Active subscription not found");
    }

    // Validate subscription status - only allow cancellation for active subscriptions
    // Prevent canceling already canceled subscription
    if (sub.status === SubscriptionStatus.CANCELED) {
      throw new BadRequestException("Subscription is already canceled");
    }

    if (
      sub.status !== SubscriptionStatus.ACTIVE &&
      sub.status !== SubscriptionStatus.TRIALING &&
      sub.status !== SubscriptionStatus.PAST_DUE
    ) {
      throw new BadRequestException(
        `Cannot cancel subscription with status: ${sub.status}. Only ACTIVE, TRIALING, or PAST_DUE subscriptions can be canceled.`,
      );
    }

    const canceled = await this.stripeService.cancelSubscription(
      sub.stripeSubscriptionId,
      cancelAtPeriodEnd,
    );

    await this.applySubscriptionUpdate(owner.ownerGroupId, canceled);
    return { status: canceled.status, cancelAtPeriodEnd };
  }

  /**
   * Handle Stripe webhook event (controller passes constructed event)
   */
  async handleWebhook(event: Stripe.Event) {
    switch (event.type) {
      case "checkout.session.completed":
        await this.handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await this.handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
        );
        break;
      case "customer.subscription.deleted":
        await this.handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        );
        break;
      case "invoice.payment_succeeded":
      case "invoice.paid":
        await this.handleInvoicePaymentSucceeded(
          event.data.object as Stripe.Invoice,
        );
        break;
      case "invoice.payment_failed":
        await this.handleInvoicePaymentFailed(
          event.data.object as Stripe.Invoice,
        );
        break;
      case "subscription_schedule.completed":
        await this.handleSubscriptionScheduleCompleted(
          event.data.object as Stripe.SubscriptionSchedule,
        );
        break;
      default:
        this.logger.debug(`Unhandled Stripe event: ${event.type}`);
        break;
    }
  }

  private async handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session,
  ) {
    const ownerGroupId = session.metadata?.ownerGroupId;
    const ownerId = session.metadata?.ownerId;
    const subscriptionId = session.subscription as string | null;
    const customerId = session.customer as string | null;
    const priceId =
      (session.line_items?.data?.[0]?.price?.id as string | undefined) ||
      (session.metadata as any)?.priceId ||
      null;

    if (!ownerGroupId || !ownerId || !subscriptionId) {
      this.logger.error(
        "Missing ownerGroupId/ownerId/subscriptionId in checkout.session.completed",
      );
      return;
    }

    // Update subscription metadata with ownerGroupId and ownerId
    // This ensures that subscription.updated webhooks can find the ownerGroupId
    try {
      await this.stripeService.updateSubscriptionMetadata(subscriptionId, {
        ownerGroupId,
        ownerId,
      });
      this.logger.log(
        `Updated subscription ${subscriptionId} metadata with ownerGroupId=${ownerGroupId} and ownerId=${ownerId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update subscription metadata for ${subscriptionId}:`,
        error,
      );
      // Continue anyway - we can still update the database record
    }

    // Fetch subscription AFTER updating metadata to ensure we have the latest data
    // This is important because Stripe might have updated the subscription after checkout
    // Retry a few times if period dates are missing (subscription might be initializing)
    let subscription = await this.stripeService.getSubscription(subscriptionId);
    let retries = 0;
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second

    // If period dates are missing, retry a few times (subscription might be initializing)
    while (
      !(subscription as any).current_period_start &&
      retries < maxRetries
    ) {
      retries++;
      this.logger.log(
        `Subscription ${subscriptionId} missing period dates (attempt ${retries}/${maxRetries}). Retrying in ${retryDelay}ms...`,
      );
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
      subscription = await this.stripeService.getSubscription(subscriptionId);
    }

    // Log period dates for debugging
    if ((subscription as any).current_period_start) {
      this.logger.log(
        `Subscription ${subscriptionId} period: ${new Date((subscription as any).current_period_start * 1000).toISOString()} to ${new Date((subscription as any).current_period_end * 1000).toISOString()}`,
      );
    } else {
      this.logger.warn(
        `Subscription ${subscriptionId} missing period dates in Stripe response after ${retries} retries. Subscription status: ${subscription.status}. This may be normal for incomplete subscriptions.`,
      );
    }

    await this.applySubscriptionUpdate(ownerGroupId, subscription, {
      ownerId,
      customerId: customerId ?? undefined,
      priceId: priceId ?? undefined,
    });
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    let ownerGroupId =
      (subscription.metadata as any)?.ownerGroupId ||
      (subscription.metadata as any)?.owner_group_id;

    // If metadata is missing, try to find existing subscription record
    if (!ownerGroupId) {
      this.logger.warn(
        `subscription.updated missing ownerGroupId metadata for subscription ${subscription.id}. Attempting to find from database.`,
      );

      // Try to find by stripeSubscriptionId
      const existingSub = await this.subscriptions.findOne({
        where: { stripeSubscriptionId: subscription.id },
        relations: ["owner"],
      });

      if (existingSub && existingSub.ownerGroupId && existingSub.owner) {
        ownerGroupId = existingSub.ownerGroupId;
        // Update Stripe subscription metadata for future webhooks
        try {
          await this.stripeService.updateSubscriptionMetadata(subscription.id, {
            ownerGroupId: existingSub.ownerGroupId,
            ownerId: existingSub.owner.id,
          });
          this.logger.log(
            `Updated subscription ${subscription.id} metadata from existing database record`,
          );
        } catch (metaErr) {
          this.logger.warn(
            `Failed to update subscription metadata: ${metaErr}`,
          );
        }
      } else {
        // Try to find by customer ID
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer?.id;
        if (customerId) {
          const subByCustomer = await this.subscriptions.findOne({
            where: { stripeCustomerId: customerId },
            order: { createdAt: "DESC" },
            relations: ["owner"],
          });
          if (
            subByCustomer &&
            subByCustomer.ownerGroupId &&
            subByCustomer.owner
          ) {
            ownerGroupId = subByCustomer.ownerGroupId;
            // Update Stripe subscription metadata
            try {
              await this.stripeService.updateSubscriptionMetadata(
                subscription.id,
                {
                  ownerGroupId: subByCustomer.ownerGroupId,
                  ownerId: subByCustomer.owner.id,
                },
              );
              this.logger.log(
                `Updated subscription ${subscription.id} metadata from customer lookup`,
              );
            } catch (metaErr) {
              this.logger.warn(
                `Failed to update subscription metadata: ${metaErr}`,
              );
            }
          }
        }
      }
    }

    if (!ownerGroupId) {
      // If we still can't find ownerGroupId, check if subscription has period dates
      // If it does, we should try to update the existing record even without metadata
      const hasPeriodDates =
        (subscription as any).current_period_start &&
        (subscription as any).current_period_end;

      // Try to find subscription by stripeSubscriptionId one more time
      // This handles the case where subscription was created but metadata wasn't set yet
      const existingSubByStripeId = await this.subscriptions.findOne({
        where: { stripeSubscriptionId: subscription.id },
        relations: ["owner"],
      });

      if (existingSubByStripeId && existingSubByStripeId.ownerGroupId) {
        ownerGroupId = existingSubByStripeId.ownerGroupId;
        // Update metadata for future webhooks
        try {
          await this.stripeService.updateSubscriptionMetadata(subscription.id, {
            ownerGroupId: existingSubByStripeId.ownerGroupId,
            ownerId: existingSubByStripeId.owner.id,
          });
          this.logger.log(
            `Found subscription by stripeSubscriptionId and updated metadata`,
          );
        } catch (metaErr) {
          this.logger.warn(`Failed to update metadata: ${metaErr}`);
        }
      } else if (!hasPeriodDates) {
        // Subscription is still initializing, wait for checkout.session.completed
        this.logger.warn(
          `subscription.updated missing ownerGroupId metadata and subscription has no period dates; subscription=${subscription.id} customer=${typeof subscription.customer === "string" ? subscription.customer : (subscription.customer?.id ?? "unknown")}. Waiting for checkout.session.completed webhook.`,
        );
        return;
      } else {
        // Subscription has period dates but no metadata and not in database
        // This shouldn't happen, but log it
        this.logger.error(
          `subscription.updated missing ownerGroupId metadata and could not find in database; subscription=${subscription.id} customer=${typeof subscription.customer === "string" ? subscription.customer : (subscription.customer?.id ?? "unknown")}. Subscription has period dates but no ownerGroupId.`,
        );
        return;
      }
    }

    // If subscription doesn't have period dates yet, retry a few times
    let subscriptionToUse = subscription;
    if (!(subscriptionToUse as any).current_period_start) {
      let retries = 0;
      const maxRetries = 3;
      const retryDelay = 1000;

      while (
        !(subscriptionToUse as any).current_period_start &&
        retries < maxRetries
      ) {
        retries++;
        this.logger.log(
          `Subscription ${subscription.id} missing period dates in subscription.updated (attempt ${retries}/${maxRetries}). Retrying...`,
        );
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        subscriptionToUse = await this.stripeService.getSubscription(
          subscription.id,
        );
      }
    }

    await this.applySubscriptionUpdate(ownerGroupId, subscriptionToUse);
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const ownerGroupId =
      (subscription.metadata as any)?.ownerGroupId ||
      (subscription.metadata as any)?.owner_group_id;
    if (!ownerGroupId) {
      this.logger.error("subscription.deleted missing ownerGroupId metadata");
      return;
    }

    const mappedStatus = this.mapStripeStatus(subscription.status);
    await this.subscriptions.update(
      { ownerGroupId },
      {
        status: mappedStatus,
        canceledAt: subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000)
          : new Date(),
        cancelAtPeriodEnd: true,
      },
    );
  }

  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
    let invoiceWithSubs = invoice as Stripe.Invoice & {
      subscription?: string | Stripe.Subscription | null;
      payment_intent?: string | Stripe.PaymentIntent | null;
      customer?: string | Stripe.Customer | null;
    };

    let subscriptionId = invoiceWithSubs.subscription as string | undefined;
    const customerId =
      typeof invoiceWithSubs.customer === "string"
        ? (invoiceWithSubs.customer as string)
        : (invoiceWithSubs.customer as Stripe.Customer | null)?.id;

    // Fallback: refetch invoice to get subscription id if missing
    if (!subscriptionId) {
      try {
        const refreshed = (await this.stripeService.getInvoice(
          invoiceWithSubs.id,
          ["subscription", "payment_intent"],
        )) as Stripe.Invoice & {
          subscription?: string | Stripe.Subscription | null;
          payment_intent?: string | Stripe.PaymentIntent | null;
          customer?: string | Stripe.Customer | null;
        };
        invoiceWithSubs = refreshed;
        subscriptionId = refreshed.subscription as string | undefined;
      } catch (err) {
        this.logger.error(
          `Failed to refetch invoice ${invoiceWithSubs.id} for subscription id resolution`,
          err as any,
        );
      }
    }

    // Fallback: try to resolve subscription from customer if still missing
    let sub = subscriptionId
      ? await this.subscriptions.findOne({
          where: { stripeSubscriptionId: subscriptionId },
        })
      : null;

    if (!sub && customerId) {
      sub = await this.subscriptions.findOne({
        where: { stripeCustomerId: customerId },
        order: { createdAt: "DESC" },
      });
      if (sub && !subscriptionId) {
        subscriptionId = sub.stripeSubscriptionId ?? undefined;
      }
    }

    // If subscription ID is missing from invoice, try to find active subscription for customer
    if (!subscriptionId && customerId) {
      try {
        // Try to find subscription from database first
        const existingSub = await this.subscriptions.findOne({
          where: { stripeCustomerId: customerId },
          order: { createdAt: "DESC" },
        });
        if (existingSub?.stripeSubscriptionId) {
          subscriptionId = existingSub.stripeSubscriptionId;
          this.logger.log(
            `Found subscription ${subscriptionId} from database for invoice ${invoiceWithSubs.id}`,
          );
        } else {
          // If not in database, try to list customer's subscriptions from Stripe
          // This handles cases where invoice is for a subscription that hasn't been synced yet
          this.logger.log(
            `Invoice ${invoiceWithSubs.id} missing subscription ID. Attempting to find subscription from Stripe customer ${customerId}`,
          );
          try {
            const customerSubscriptions =
              await this.stripeService.listCustomerSubscriptions(
                customerId,
                "all",
              );
            // Find the most recent active/trialing subscription
            const activeSub = customerSubscriptions.find(
              (s) =>
                s.status === "active" ||
                s.status === "trialing" ||
                s.status === "incomplete",
            );
            if (activeSub) {
              subscriptionId = activeSub.id;
              this.logger.log(
                `Found subscription ${subscriptionId} from Stripe customer subscriptions for invoice ${invoiceWithSubs.id}`,
              );
            } else {
              this.logger.warn(
                `No active subscription found for customer ${customerId} in Stripe. Invoice ${invoiceWithSubs.id} may be a setup invoice or one-time payment.`,
              );
              return;
            }
          } catch (listErr) {
            this.logger.error(
              `Failed to list customer subscriptions for ${customerId}:`,
              listErr,
            );
            return;
          }
        }
      } catch (err) {
        this.logger.error(
          `Error finding subscription for invoice ${invoiceWithSubs.id}:`,
          err,
        );
      }
    }

    if (!subscriptionId && !sub) {
      this.logger.warn(
        `invoice.payment_succeeded missing subscription id; invoice=${invoiceWithSubs.id} customer=${customerId ?? "unknown"}`,
      );
      return;
    }

    if (!sub && subscriptionId) {
      sub = await this.subscriptions.findOne({
        where: { stripeSubscriptionId: subscriptionId },
      });
    }

    // If subscription still not found, try to create it from Stripe subscription data
    // This handles cases where subscription.updated webhook failed or hasn't fired yet
    if (!sub && subscriptionId) {
      try {
        this.logger.log(
          `Subscription not found in database for invoice.payment_succeeded. Attempting to create from Stripe subscription ${subscriptionId}`,
        );
        const stripeSubscription =
          await this.stripeService.getSubscription(subscriptionId);

        // Try to get ownerGroupId from subscription metadata
        const ownerGroupId =
          (stripeSubscription.metadata as any)?.ownerGroupId ||
          (stripeSubscription.metadata as any)?.owner_group_id;

        if (ownerGroupId) {
          // We have ownerGroupId, so we can create/update the subscription
          await this.applySubscriptionUpdate(ownerGroupId, stripeSubscription);
          // Fetch the newly created subscription
          sub = await this.subscriptions.findOne({
            where: { stripeSubscriptionId: subscriptionId },
          });
          this.logger.log(
            `Successfully created subscription record from invoice.payment_succeeded webhook`,
          );
        } else {
          // If no ownerGroupId in metadata, try to find existing subscription by customer
          // or find owner by looking up existing subscription
          if (customerId) {
            const existingSub = await this.subscriptions.findOne({
              where: { stripeCustomerId: customerId },
              order: { createdAt: "DESC" },
              relations: ["owner"],
            });
            if (existingSub && existingSub.ownerGroupId && existingSub.owner) {
              // Update subscription metadata with ownerId so future webhooks work
              try {
                await this.stripeService.updateSubscriptionMetadata(
                  subscriptionId,
                  {
                    ownerGroupId: existingSub.ownerGroupId,
                    ownerId: existingSub.owner.id,
                  },
                );
              } catch (metaErr) {
                this.logger.warn(
                  `Failed to update subscription metadata: ${metaErr}`,
                );
              }
              await this.applySubscriptionUpdate(
                existingSub.ownerGroupId,
                stripeSubscription,
                {
                  ownerId: existingSub.owner.id,
                  customerId,
                },
              );
              sub = await this.subscriptions.findOne({
                where: { stripeSubscriptionId: subscriptionId },
              });
              this.logger.log(
                `Successfully created subscription record from invoice.payment_succeeded using existing subscription lookup`,
              );
            }
          }
        }
      } catch (err) {
        this.logger.error(
          `Failed to create subscription from invoice.payment_succeeded: ${err}`,
        );
      }
    }

    if (!sub) {
      this.logger.warn(
        `invoice.payment_succeeded subscription not found and could not be created; subscriptionId=${subscriptionId} invoice=${invoiceWithSubs.id} customer=${customerId ?? "unknown"}`,
      );
      return;
    }

    const paymentIntentId =
      (invoiceWithSubs.payment_intent as string) || invoiceWithSubs.id;

    // Check if this is a proration invoice (from plan change)
    const isProration =
      invoiceWithSubs.billing_reason === "subscription_update";
    const invoiceType = isProration ? "PRORATION" : "REGULAR";

    this.logger.log(
      `Recording ${invoiceType} payment: subscription=${sub.id} ` +
        `invoice=${invoiceWithSubs.id} paymentIntent=${paymentIntentId} ` +
        `amount=${invoiceWithSubs.amount_paid} currency=${invoiceWithSubs.currency}` +
        (isProration ? " (from plan change)" : ""),
    );

    // If payment_intent is not available or not expanded, refetch invoice with payment_intent expanded
    if (
      !invoiceWithSubs.payment_intent ||
      (typeof invoiceWithSubs.payment_intent === "object" &&
        !(invoiceWithSubs.payment_intent as any).payment_method)
    ) {
      try {
        const refreshedInvoice = await this.stripeService.getInvoice(
          invoiceWithSubs.id,
          ["subscription", "payment_intent"],
        );
        invoiceWithSubs = refreshedInvoice as Stripe.Invoice & {
          subscription?: string | Stripe.Subscription | null;
          payment_intent?: string | Stripe.PaymentIntent | null;
          customer?: string | Stripe.Customer | null;
        };
        this.logger.debug(
          `Refetched invoice ${invoiceWithSubs.id} with payment_intent expanded`,
        );
      } catch (err) {
        this.logger.warn(
          `Failed to refetch invoice ${invoiceWithSubs.id} with payment_intent`,
          err as any,
        );
      }
    }

    // Extract payment method details from invoice
    let cardDetails = {
      paymentMethodId: null as string | null,
      brand: null as string | null,
      last4: null as string | null,
      expMonth: null as number | null,
      expYear: null as number | null,
    };

    try {
      //Try to get payment method from invoice's payment_intent
      if (typeof invoiceWithSubs.payment_intent === "string") {
        const paymentIntent = await this.stripeService.getPaymentIntent(
          invoiceWithSubs.payment_intent,
          ["payment_method"],
        );
        if (paymentIntent.payment_method) {
          const pm =
            typeof paymentIntent.payment_method === "string"
              ? await this.stripeService.getPaymentMethod(
                  paymentIntent.payment_method,
                )
              : paymentIntent.payment_method;
          cardDetails = this.stripeService.extractCardDetails(pm);
          this.logger.debug(
            `Extracted payment method from payment intent for invoice ${invoiceWithSubs.id}`,
          );
        }
      } else if (
        invoiceWithSubs.payment_intent &&
        typeof invoiceWithSubs.payment_intent === "object"
      ) {
        const pm = (invoiceWithSubs.payment_intent as any).payment_method;
        if (pm) {
          const paymentMethod =
            typeof pm === "string"
              ? await this.stripeService.getPaymentMethod(pm)
              : pm;
          cardDetails = this.stripeService.extractCardDetails(paymentMethod);
          this.logger.debug(
            `Extracted payment method from expanded payment intent for invoice ${invoiceWithSubs.id}`,
          );
        }
      }

      //If payment method not found from payment_intent, try subscription's default_payment_method
      if (!cardDetails.paymentMethodId && subscriptionId && sub) {
        try {
          const subscription = await this.stripeService.getSubscription(
            subscriptionId,
            ["default_payment_method"],
          );
          if (subscription.default_payment_method) {
            const pm =
              typeof subscription.default_payment_method === "string"
                ? await this.stripeService.getPaymentMethod(
                    subscription.default_payment_method,
                  )
                : subscription.default_payment_method;
            cardDetails = this.stripeService.extractCardDetails(pm);
            this.logger.debug(
              `Extracted payment method from subscription default_payment_method for invoice ${invoiceWithSubs.id}`,
            );
          }
        } catch (subErr) {
          this.logger.warn(
            `Failed to get payment method from subscription for invoice ${invoiceWithSubs.id}`,
            subErr as any,
          );
        }
      }

      // Log if we still don't have payment method details
      if (!cardDetails.paymentMethodId) {
        this.logger.warn(
          `Could not extract payment method details for invoice ${invoiceWithSubs.id}. Payment intent: ${typeof invoiceWithSubs.payment_intent === "string" ? invoiceWithSubs.payment_intent : "object/expanded"}`,
        );
      }
    } catch (err) {
      this.logger.error(
        `Failed to extract payment method from invoice ${invoiceWithSubs.id}`,
        err as any,
      );
    }

    // Extract plan info and period dates from invoice
    // For proration invoices, we need to find the line item for the NEW plan
    // (not the credit line item which might be first)
    let priceId: string | undefined = undefined;
    let priceObject: any = null;
    let period: any = null;

    if (isProration && invoiceWithSubs.lines?.data) {
      // For proration invoices, find the line item with positive amount (new plan charge)
      // Skip negative amounts (credits for unused time)
      for (const lineItem of invoiceWithSubs.lines.data as any[]) {
        const lineAmount = lineItem.amount || 0;
        if (lineAmount > 0) {
          // This is the charge for the new plan
          priceObject =
            lineItem.price && typeof lineItem.price === "object"
              ? lineItem.price
              : null;
          priceId = priceObject?.id || lineItem.price || undefined;
          period = lineItem.period;
          break;
        }
      }
      // If no positive line item found, fall back to first line item
      if (!priceId && invoiceWithSubs.lines.data.length > 0) {
        const firstLineItem = invoiceWithSubs.lines.data[0] as any;
        priceObject =
          firstLineItem?.price && typeof firstLineItem.price === "object"
            ? firstLineItem.price
            : null;
        priceId = priceObject?.id || firstLineItem?.price || undefined;
        period = firstLineItem?.period;
      }
    } else {
      // For regular invoices, use the first line item
      // CRITICAL: If price is not expanded in invoice line items, refetch with expansion
      let firstLineItem = invoiceWithSubs.lines?.data?.[0] as any;

      // Log invoice line items for debugging
      this.logger.debug(
        `Invoice ${invoiceWithSubs.id} line items: ${invoiceWithSubs.lines?.data?.length || 0} items. First item: ${JSON.stringify(
          {
            price: firstLineItem?.price,
            priceType: typeof firstLineItem?.price,
            amount: firstLineItem?.amount,
            period: firstLineItem?.period,
          },
        )}`,
      );

      priceObject =
        firstLineItem?.price && typeof firstLineItem.price === "object"
          ? firstLineItem.price
          : null;

      // CRITICAL: Always prioritize price from invoice line items (reflects actual subscription state)
      // This is especially important when subscription schedule completes and Phase 1 starts
      priceId = priceObject?.id || firstLineItem?.price || undefined;

      // If price not found or not expanded, refetch invoice with line items expanded
      if (!priceId || !priceObject) {
        try {
          this.logger.log(
            `Price not found in invoice line items. Refetching invoice ${invoiceWithSubs.id} with line items expanded.`,
          );
          const expandedInvoice = await this.stripeService.getInvoice(
            invoiceWithSubs.id,
            [
              "lines.data.price",
              "subscription",
              "subscription.items.data.price",
            ],
          );
          const expandedLineItem = expandedInvoice.lines?.data?.[0] as any;
          if (expandedLineItem) {
            firstLineItem = expandedLineItem;
            priceObject =
              expandedLineItem?.price &&
              typeof expandedLineItem.price === "object"
                ? expandedLineItem.price
                : null;
            priceId = priceObject?.id || expandedLineItem?.price || priceId;

            // Also check invoice's subscription object for price
            const expandedInvoiceWithSub = expandedInvoice as Stripe.Invoice & {
              subscription?: string | Stripe.Subscription | null;
            };
            if (!priceId && expandedInvoiceWithSub.subscription) {
              const invoiceSubscription =
                typeof expandedInvoiceWithSub.subscription === "string"
                  ? await this.stripeService.getSubscription(
                      expandedInvoiceWithSub.subscription,
                      ["items.data.price"],
                    )
                  : (expandedInvoiceWithSub.subscription as Stripe.Subscription);
              const invoiceSubPriceId = invoiceSubscription.items.data[0]?.price
                ?.id as string | undefined;
              if (invoiceSubPriceId) {
                priceId = invoiceSubPriceId;
                this.logger.log(
                  `Got price ${priceId} from invoice's subscription object.`,
                );
              }
            }

            if (priceId && priceObject) {
              this.logger.log(
                `Refetched invoice ${invoiceWithSubs.id} with line items expanded. Found price: ${priceId}`,
              );
            } else if (priceId) {
              this.logger.log(
                `Refetched invoice ${invoiceWithSubs.id}. Found price ID: ${priceId} but price object not expanded.`,
              );
            } else {
              this.logger.warn(
                `Refetched invoice ${invoiceWithSubs.id} with expansion but still no price found. Line items: ${JSON.stringify(expandedInvoice.lines?.data?.map((item: any) => ({ price: item.price, amount: item.amount, period: item.period })))}`,
              );
            }
          }
        } catch (invoiceErr) {
          this.logger.warn(
            `Failed to refetch invoice ${invoiceWithSubs.id} with line items expanded`,
            invoiceErr as any,
          );
        }
      }

      // If price still not found, try to determine from invoice period
      // Calculate period duration to determine if it's 6 months or 1 year
      // Also check if we have a schedule that should have Phase 1 active
      let periodDays: number | null = null;
      if (!priceId && period) {
        const periodStart = period.start ? new Date(period.start * 1000) : null;
        const periodEnd = period.end ? new Date(period.end * 1000) : null;
        if (periodStart && periodEnd) {
          periodDays = Math.round(
            (periodEnd.getTime() - periodStart.getTime()) /
              (1000 * 60 * 60 * 24),
          );
          this.logger.log(
            `Invoice period: ${periodStart.toISOString()} to ${periodEnd.toISOString()} (${periodDays} days).`,
          );
          // If period is approximately 6 months (150-200 days), it's likely the 6-month plan
          // If period is approximately 1 year (360-370 days), it's likely the 1-year plan
          if (periodDays >= 150 && periodDays <= 200) {
            this.logger.warn(
              `Invoice period suggests 6-month billing (${periodDays} days), but price not found. This may indicate schedule Phase 1 has started but price not yet updated.`,
            );
          } else if (periodDays >= 360 && periodDays <= 370) {
            this.logger.warn(
              `Invoice period suggests 1-year billing (${periodDays} days). If schedule Phase 1 should have started, this indicates the schedule may not have transitioned correctly.`,
            );
          }
        }
      }

      // If invoice period is 1 year but we expect 6 months (schedule Phase 1 should have started),
      // try to find the schedule from the database subscription record
      // The subscription might have metadata or we can check if there's a known downgrade
      if (
        !priceId &&
        periodDays &&
        periodDays >= 360 &&
        periodDays <= 370 &&
        sub
      ) {
        // Check if subscription has a different expected price (from downgrade)
        // We can check the database to see if there was a recent plan change
        this.logger.log(
          `Invoice shows 1-year period but schedule Phase 1 should have started. Checking if we can determine Phase 1 price from subscription context.`,
        );
      }

      // If price still not found in invoice line items, check subscription schedule
      // This handles the case where schedule Phase 1 has started but subscription hasn't updated yet
      if (!priceId && subscriptionId) {
        try {
          // First, try to get price from subscription
          const currentSubscription = await this.stripeService.getSubscription(
            subscriptionId,
            ["items.data.price", "schedule"],
          );
          const subscriptionPrice = currentSubscription.items.data[0]?.price;
          const subscriptionPriceId = subscriptionPrice?.id as
            | string
            | undefined;

          // If subscription still has old price, check if schedule exists and Phase 1 has started
          // Also check if subscription items have been updated (might have new price even if schedule is gone)
          const currentSubPriceId = currentSubscription.items.data[0]?.price
            ?.id as string | undefined;
          if (currentSubPriceId && currentSubPriceId !== subscriptionPriceId) {
            // Subscription has a different price than what we initially got - use it
            priceId = currentSubPriceId;
            const currentSubPrice = currentSubscription.items.data[0]?.price;
            if (
              currentSubPrice &&
              typeof currentSubPrice === "object" &&
              !priceObject
            ) {
              priceObject = currentSubPrice;
            }
            this.logger.log(
              `Subscription has updated price ${priceId} (different from initial check). Using this price.`,
            );
          } else if (subscriptionPriceId) {
            const scheduleId = (currentSubscription as any).schedule;
            if (scheduleId && typeof scheduleId === "string") {
              try {
                // Get the schedule to check Phase 1
                const schedule =
                  await this.stripeService.getSubscriptionSchedule(scheduleId);

                // If schedule is completed, Phase 1 has already started and subscription should be updated
                // But if invoice arrived before subscription.updated webhook, we can still get Phase 1 price
                if (
                  schedule.status === "completed" &&
                  schedule.phases &&
                  schedule.phases.length > 1
                ) {
                  // Schedule completed, Phase 1 should be active now
                  const phase1 = schedule.phases[1];
                  if (phase1) {
                    const phase1PriceId = phase1.items?.[0]?.price as
                      | string
                      | undefined;
                    if (phase1PriceId) {
                      priceId = phase1PriceId;
                      this.logger.log(
                        `Subscription schedule is completed. Phase 1 should be active. Using price ${priceId} from completed schedule Phase 1.`,
                      );
                      // Try to get price object for billing interval
                      try {
                        const phase1Price =
                          await this.stripeService.getPrice(phase1PriceId);
                        priceObject = phase1Price as any;
                      } catch (priceErr) {
                        this.logger.warn(
                          `Failed to fetch price details for ${phase1PriceId}`,
                          priceErr as any,
                        );
                      }
                    }
                  }
                } else {
                  // Check if Phase 1 has started
                  // current_phase can be a number (phase index) or null
                  const currentPhaseIndex =
                    typeof schedule.current_phase === "number"
                      ? schedule.current_phase
                      : null;
                  // If we're in Phase 1 (index 1) or later, get the price from that phase
                  if (
                    currentPhaseIndex !== null &&
                    currentPhaseIndex > 0 &&
                    schedule.phases &&
                    schedule.phases[currentPhaseIndex]
                  ) {
                    const activePhase = schedule.phases[currentPhaseIndex];
                    const phasePriceId = activePhase.items?.[0]?.price as
                      | string
                      | undefined;
                    if (phasePriceId) {
                      priceId = phasePriceId;
                      this.logger.log(
                        `Subscription schedule Phase ${currentPhaseIndex} is active. Using price ${priceId} from schedule Phase ${currentPhaseIndex} (subscription may not have updated yet).`,
                      );
                      // Try to get price object for billing interval
                      try {
                        const phasePrice =
                          await this.stripeService.getPrice(phasePriceId);
                        priceObject = phasePrice as any;
                      } catch (priceErr) {
                        this.logger.warn(
                          `Failed to fetch price details for ${phasePriceId}`,
                          priceErr as any,
                        );
                      }
                    }
                  } else if (schedule.phases && schedule.phases.length > 1) {
                    // If schedule exists but current_phase is not set, check Phase 1 directly
                    // This handles cases where schedule is transitioning
                    const phase1 = schedule.phases[1];
                    if (phase1) {
                      const phase1PriceId = phase1.items?.[0]?.price as
                        | string
                        | undefined;
                      if (phase1PriceId) {
                        priceId = phase1PriceId;
                        this.logger.log(
                          `Subscription schedule has Phase 1 configured. Using price ${priceId} from Phase 1 (subscription may not have updated yet).`,
                        );
                        // Try to get price object for billing interval
                        try {
                          const phase1Price =
                            await this.stripeService.getPrice(phase1PriceId);
                          priceObject = phase1Price as any;
                        } catch (priceErr) {
                          this.logger.warn(
                            `Failed to fetch price details for ${phase1PriceId}`,
                            priceErr as any,
                          );
                        }
                      }
                    }
                  }
                }
              } catch (scheduleErr) {
                this.logger.warn(
                  `Failed to fetch subscription schedule ${scheduleId}`,
                  scheduleErr as any,
                );
              }
            }

            // If we still don't have price from schedule, check if invoice period suggests
            // Phase 1 should have started (1-year period but schedule Phase 1 exists)
            if (
              !priceId &&
              periodDays &&
              periodDays >= 360 &&
              periodDays <= 370
            ) {
              // Invoice shows 1-year period, but if schedule Phase 1 exists, it should be 6 months
              // This means Stripe generated invoice before schedule completed
              // Try to get Phase 1 price from any available schedule
              if (scheduleId && typeof scheduleId === "string") {
                try {
                  // Try to get schedule even if it's completed/released
                  const scheduleCheck =
                    await this.stripeService.getSubscriptionSchedule(
                      scheduleId,
                    );
                  if (scheduleCheck.phases && scheduleCheck.phases.length > 1) {
                    const phase1Check = scheduleCheck.phases[1];
                    const phase1PriceIdCheck = phase1Check.items?.[0]?.price as
                      | string
                      | undefined;
                    if (phase1PriceIdCheck) {
                      priceId = phase1PriceIdCheck;
                      this.logger.log(
                        `Invoice shows 1-year period but schedule Phase 1 exists. Using Phase 1 price ${priceId} (Stripe generated invoice before schedule completed).`,
                      );
                      try {
                        const phase1PriceCheck =
                          await this.stripeService.getPrice(phase1PriceIdCheck);
                        priceObject = phase1PriceCheck as any;
                      } catch (priceErr) {
                        this.logger.warn(
                          `Failed to fetch price details for ${phase1PriceIdCheck}`,
                          priceErr as any,
                        );
                      }
                    }
                  }
                } catch (scheduleCheckErr) {
                  // Schedule might be released, that's okay
                  this.logger.debug(
                    `Could not check schedule ${scheduleId} for Phase 1 price: ${scheduleCheckErr}`,
                  );
                }
              }
            }

            // CRITICAL: If invoice period is 1 year but schedule Phase 1 (6 months) should be active,
            // override the price to use Phase 1 price even if subscription hasn't updated yet
            if (
              priceId &&
              periodDays &&
              periodDays >= 360 &&
              periodDays <= 370 &&
              scheduleId &&
              typeof scheduleId === "string"
            ) {
              try {
                const scheduleCheck =
                  await this.stripeService.getSubscriptionSchedule(scheduleId);
                if (scheduleCheck.phases && scheduleCheck.phases.length > 1) {
                  const phase1Check = scheduleCheck.phases[1];
                  const phase1PriceIdCheck = phase1Check.items?.[0]?.price as
                    | string
                    | undefined;
                  if (phase1PriceIdCheck) {
                    // Check if Phase 1 price is 6 months
                    try {
                      const phase1PriceCheck =
                        await this.stripeService.getPrice(phase1PriceIdCheck);
                      const phase1Interval =
                        phase1PriceCheck.recurring?.interval || null;
                      const phase1IntervalCount =
                        phase1PriceCheck.recurring?.interval_count || null;
                      const isPhase1SixMonths =
                        phase1Interval === "month" && phase1IntervalCount === 6;

                      // If Phase 1 is 6 months but invoice shows 1 year, override to Phase 1 price
                      if (isPhase1SixMonths) {
                        this.logger.log(
                          `OVERRIDE: Invoice shows 1-year period (${periodDays} days) but schedule Phase 1 is 6 months. ` +
                            `Using Phase 1 price ${phase1PriceIdCheck} instead of ${priceId}. ` +
                            `This indicates billing_cycle_anchor may not have reset correctly.`,
                        );
                        priceId = phase1PriceIdCheck;
                        priceObject = phase1PriceCheck as any;
                      }
                    } catch (priceErr) {
                      this.logger.warn(
                        `Failed to verify Phase 1 price interval: ${priceErr}`,
                      );
                    }
                  }
                }
              } catch (scheduleCheckErr) {
                this.logger.debug(
                  `Could not check schedule ${scheduleId} for Phase 1 override: ${scheduleCheckErr}`,
                );
              }
            }

            // If we still don't have price from schedule, use subscription price
            if (!priceId && subscriptionPriceId) {
              priceId = subscriptionPriceId;
              // Also extract price object if available (for billing interval)
              if (
                subscriptionPrice &&
                typeof subscriptionPrice === "object" &&
                !priceObject
              ) {
                priceObject = subscriptionPrice;
              }
              this.logger.log(
                `Price not found in invoice line items or schedule. Using current subscription price ${priceId}.`,
              );
            }
          }
        } catch (subErr) {
          this.logger.warn(
            `Failed to fetch subscription ${subscriptionId} from Stripe to get current price`,
            subErr as any,
          );
        }
      }

      // Last resort: use database price (may be stale if schedule just completed)
      if (!priceId) {
        priceId = sub.stripePriceId || undefined;
        if (priceId) {
          this.logger.warn(
            `Using database price ${priceId} as fallback. This may be stale if subscription schedule just completed.`,
          );
        }
      }

      period = firstLineItem?.period;
    }

    // Extract billing interval info from price object (if expanded in invoice)
    // Price object has recurring.interval and recurring.interval_count
    let recurring = priceObject?.recurring;
    let billingInterval = recurring?.interval || null; // "month", "year", etc.
    let billingIntervalCount = recurring?.interval_count || null; // 1, 6, 12, etc.

    // Always fetch price details if we have a priceId
    // Invoice line items often don't include expanded price details with recurring info
    if (priceId && typeof priceId === "string") {
      try {
        const priceDetails = await this.stripeService.getPrice(priceId);
        if (priceDetails.recurring) {
          billingInterval = priceDetails.recurring.interval || billingInterval;
          billingIntervalCount =
            priceDetails.recurring.interval_count || billingIntervalCount;
          this.logger.debug(
            `Fetched billing interval from price ${priceId}: ${billingIntervalCount} ${billingInterval}(s)`,
          );
        } else {
          this.logger.warn(
            `Price ${priceId} does not have recurring information (one-time payment?)`,
          );
        }
      } catch (err) {
        this.logger.warn(
          `Failed to fetch price details for ${priceId} to get interval info`,
          err as any,
        );
      }
    }

    // For proration invoices, fetch subscription from Stripe to get updated period dates
    // The database subscription might not be updated yet when invoice payment webhook arrives
    let prorationPeriodStart: Date | null = null;
    let prorationPeriodEnd: Date | null = null;

    if (isProration && subscriptionId) {
      // CRITICAL: For proration invoices when Phase 1 starts, prioritize invoice line item period
      // This reflects the actual new billing cycle period
      if (period) {
        if (period.start) {
          prorationPeriodStart = new Date(period.start * 1000);
        }
        if (period.end) {
          prorationPeriodEnd = new Date(period.end * 1000);
        }
        this.logger.log(
          `Proration invoice: Using period from invoice line items: ${prorationPeriodStart?.toISOString()} to ${prorationPeriodEnd?.toISOString()}`,
        );
      }

      // If period not in invoice line items, try to get from subscription
      if (!prorationPeriodStart || !prorationPeriodEnd) {
        try {
          const subscription = await this.stripeService.getSubscription(
            subscriptionId,
            ["items.data.price"],
          );
          // Get updated period dates from Stripe subscription (reflects new billing cycle)
          if ((subscription as any).current_period_start) {
            prorationPeriodStart = new Date(
              (subscription as any).current_period_start * 1000,
            );
          }
          if ((subscription as any).current_period_end) {
            prorationPeriodEnd = new Date(
              (subscription as any).current_period_end * 1000,
            );
          }

          // Also try to get interval info if still missing
          if (
            (!billingInterval || !billingIntervalCount) &&
            subscription.items.data[0]?.price
          ) {
            const subscriptionPriceId = subscription.items.data[0]?.price
              ?.id as string | undefined;
            if (subscriptionPriceId) {
              const subscriptionPrice = subscription.items.data[0]?.price;
              if (
                subscriptionPrice &&
                typeof subscriptionPrice === "object" &&
                (subscriptionPrice as any).recurring
              ) {
                const subRecurring = (subscriptionPrice as any).recurring;
                billingInterval = subRecurring.interval || billingInterval;
                billingIntervalCount =
                  subRecurring.interval_count || billingIntervalCount;
                this.logger.debug(
                  `Fetched billing interval from subscription item: ${billingIntervalCount} ${billingInterval}(s)`,
                );
              }
            }
          }

          this.logger.debug(
            `Fetched period dates from Stripe subscription for proration: ${prorationPeriodStart?.toISOString()} to ${prorationPeriodEnd?.toISOString()}`,
          );
        } catch (err) {
          this.logger.warn(
            `Failed to fetch subscription details for ${subscriptionId} to get period dates`,
            err as any,
          );
        }
      }

      // If still no period dates, try to calculate from Phase 1 start date and new billing interval
      // This handles cases where invoice and subscription don't have period info yet
      if (
        (!prorationPeriodStart || !prorationPeriodEnd) &&
        billingInterval &&
        billingIntervalCount &&
        subscriptionId
      ) {
        try {
          // Get subscription to check for schedule
          const subscription = await this.stripeService.getSubscription(
            subscriptionId,
            ["schedule"],
          );
          const scheduleId = (subscription as any).schedule;
          if (scheduleId && typeof scheduleId === "string") {
            try {
              const schedule =
                await this.stripeService.getSubscriptionSchedule(scheduleId);
              // Check if Phase 1 has started (completed schedule or current_phase > 0)
              if (
                schedule.status === "completed" &&
                schedule.phases &&
                schedule.phases.length > 1
              ) {
                const phase1 = schedule.phases[1];
                if (phase1.start_date) {
                  prorationPeriodStart = new Date(phase1.start_date * 1000);
                  // Calculate period end based on new billing interval
                  if (billingInterval === "month") {
                    // Approximate: 30.44 days per month average
                    const monthsInSeconds = billingIntervalCount * 2629746;
                    prorationPeriodEnd = new Date(
                      (phase1.start_date + monthsInSeconds) * 1000,
                    );
                  } else if (billingInterval === "year") {
                    // Approximate: 365.25 days per year
                    const yearsInSeconds = billingIntervalCount * 31557600;
                    prorationPeriodEnd = new Date(
                      (phase1.start_date + yearsInSeconds) * 1000,
                    );
                  }
                  this.logger.log(
                    `Calculated proration period from Phase 1: ${prorationPeriodStart?.toISOString()} to ${prorationPeriodEnd?.toISOString()} (${billingIntervalCount} ${billingInterval}(s))`,
                  );
                }
              }
            } catch (scheduleErr) {
              this.logger.debug(
                `Could not get schedule ${scheduleId} to calculate period dates: ${scheduleErr}`,
              );
            }
          }
        } catch (subErr) {
          this.logger.debug(
            `Could not fetch subscription to calculate period dates: ${subErr}`,
          );
        }
      }
    }

    // Final fallback: Try to get interval from subscription if still missing (for non-proration)
    if (
      !isProration &&
      (!billingInterval || !billingIntervalCount) &&
      subscriptionId
    ) {
      try {
        const subscription = await this.stripeService.getSubscription(
          subscriptionId,
          ["items.data.price"],
        );
        const subscriptionPriceId = subscription.items.data[0]?.price?.id as
          | string
          | undefined;
        if (subscriptionPriceId) {
          // Try to get recurring info from subscription item price
          const subscriptionPrice = subscription.items.data[0]?.price;
          if (
            subscriptionPrice &&
            typeof subscriptionPrice === "object" &&
            (subscriptionPrice as any).recurring
          ) {
            const subRecurring = (subscriptionPrice as any).recurring;
            billingInterval = subRecurring.interval || billingInterval;
            billingIntervalCount =
              subRecurring.interval_count || billingIntervalCount;
            this.logger.debug(
              `Fetched billing interval from subscription item: ${billingIntervalCount} ${billingInterval}(s)`,
            );
          }
        }
      } catch (err) {
        this.logger.warn(
          `Failed to fetch subscription details for ${subscriptionId} to get interval info`,
          err as any,
        );
      }
    }

    // Check if payment record already exists (handles duplicate webhooks)
    const existingPayment = await this.payments.findOne({
      where: { stripePaymentIntentId: paymentIntentId },
    });

    if (existingPayment) {
      this.logger.log(
        `Payment record already exists for paymentIntentId=${paymentIntentId} invoice=${invoiceWithSubs.id}. Skipping duplicate payment creation.`,
      );
      return;
    }

    // Insert payment record with card details, plan info, and period dates
    try {
      await this.payments.save(
        this.payments.create({
          ownerGroupSubscription: sub,
          stripePaymentIntentId: paymentIntentId,
          stripeInvoiceId: invoiceWithSubs.id,
          amount: (invoiceWithSubs.amount_paid ?? 0) / 100,
          currency: invoiceWithSubs.currency,
          status: PaymentStatus.SUCCEEDED,
          paidAt: invoiceWithSubs.status_transitions?.paid_at
            ? new Date(invoiceWithSubs.status_transitions.paid_at * 1000)
            : new Date(),
          stripePaymentMethodId: cardDetails.paymentMethodId,
          cardBrand: cardDetails.brand,
          cardLast4: cardDetails.last4,
          cardExpMonth: cardDetails.expMonth,
          cardExpYear: cardDetails.expYear,
          // Store plan info and period dates
          stripePriceId: priceId || sub.stripePriceId || null,
          // For proration invoices, prioritize period from invoice line items (reflects new billing cycle)
          // Then fall back to calculated prorationPeriodStart/End, then subscription dates
          // For regular invoices, use invoice line item period
          periodStart: isProration
            ? period?.start
              ? new Date(period.start * 1000)
              : prorationPeriodStart || sub.currentPeriodStart
            : period?.start
              ? new Date(period.start * 1000)
              : sub.currentPeriodStart,
          periodEnd: isProration
            ? period?.end
              ? new Date(period.end * 1000)
              : prorationPeriodEnd || sub.currentPeriodEnd
            : period?.end
              ? new Date(period.end * 1000)
              : sub.currentPeriodEnd,
          // Store billing interval info
          billingInterval: billingInterval,
          billingIntervalCount: billingIntervalCount,
        }),
      );
      this.logger.log(
        `Successfully created payment record for paymentIntentId=${paymentIntentId} invoice=${invoiceWithSubs.id}`,
      );
    } catch (error: any) {
      // Handle race condition where payment was created between our check and save
      if (
        error?.code === "23505" &&
        error?.constraint ===
          "subscription_payments_stripe_payment_intent_id_key"
      ) {
        this.logger.log(
          `Payment record already exists for paymentIntentId=${paymentIntentId} (race condition). Skipping duplicate payment creation.`,
        );
      } else {
        // Re-throw if it's a different error
        throw error;
      }
    }

    // Update subscription period dates and price if present in invoice
    // This ensures subscription dates and price are always in sync with latest payment
    // CRITICAL: Update price if it has changed (e.g., when subscription schedule Phase 1 completes)
    const updateData: any = {};

    if (period) {
      updateData.currentPeriodStart = period.start
        ? new Date(period.start * 1000)
        : sub.currentPeriodStart;
      updateData.currentPeriodEnd = period.end
        ? new Date(period.end * 1000)
        : sub.currentPeriodEnd;
    }

    // Update price if it's different from database (important when schedule completes)
    if (priceId && priceId !== sub.stripePriceId) {
      updateData.stripePriceId = priceId;
      this.logger.log(
        `Updating subscription ${sub.id} price from ${sub.stripePriceId} to ${priceId} (likely from schedule Phase 1 completion).`,
      );
    }

    if (Object.keys(updateData).length > 0) {
      await this.subscriptions.update({ id: sub.id }, updateData);
    }
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    const invoiceWithSubs = invoice as Stripe.Invoice & {
      subscription?: string | Stripe.Subscription | null;
    };

    const subscriptionId = invoiceWithSubs.subscription as string | undefined;
    if (!subscriptionId) return;

    const sub = await this.subscriptions.findOne({
      where: { stripeSubscriptionId: subscriptionId },
    });
    if (!sub) return;

    await this.subscriptions.update(
      { id: sub.id },
      { status: SubscriptionStatus.PAST_DUE },
    );
  }

  /**
   * Handle subscription schedule completion
   * When a schedule completes, the subscription has transitioned to the new plan
   * We need to update the database to reflect the new plan and period dates
   */
  private async handleSubscriptionScheduleCompleted(
    schedule: Stripe.SubscriptionSchedule,
  ) {
    try {
      const subscriptionId = schedule.subscription as string | undefined;
      if (!subscriptionId) {
        this.logger.warn(
          `subscription_schedule.completed missing subscription ID for schedule ${schedule.id}`,
        );
        return;
      }

      this.logger.log(
        `Subscription schedule ${schedule.id} completed for subscription ${subscriptionId}. Updating subscription record.`,
      );

      // Fetch the updated subscription from Stripe
      const subscription =
        await this.stripeService.getSubscription(subscriptionId);

      // Get ownerGroupId from subscription metadata
      const ownerGroupId =
        (subscription.metadata as any)?.ownerGroupId ||
        (subscription.metadata as any)?.owner_group_id;

      if (!ownerGroupId) {
        // Try to find from database
        const existingSub = await this.subscriptions.findOne({
          where: { stripeSubscriptionId: subscriptionId },
        });
        if (existingSub && existingSub.ownerGroupId) {
          await this.applySubscriptionUpdate(
            existingSub.ownerGroupId,
            subscription,
          );
          this.logger.log(
            `Updated subscription ${subscriptionId} after schedule completion`,
          );
        } else {
          this.logger.warn(
            `Could not find ownerGroupId for subscription ${subscriptionId} after schedule completion`,
          );
        }
      } else {
        await this.applySubscriptionUpdate(ownerGroupId, subscription);
        this.logger.log(
          `Updated subscription ${subscriptionId} after schedule completion`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error handling subscription schedule completion:`,
        error,
      );
    }
  }

  /**
   * Upsert subscription for an owner group based on Stripe subscription data.
   */
  private async applySubscriptionUpdate(
    ownerGroupId: string,
    subscription: Stripe.Subscription,
    options?: { ownerId?: string; customerId?: string; priceId?: string },
  ) {
    const ownerId =
      options?.ownerId ||
      (subscription.metadata as any)?.ownerId ||
      (subscription.metadata as any)?.owner_id;
    if (!ownerId) {
      this.logger.error("Missing ownerId in subscription metadata");
      return;
    }

    const owner = await this.users.findOne({
      where: { id: ownerId },
      relations: ["role"],
    });
    if (!owner) {
      this.logger.error(`Owner ${ownerId} not found`);
      return;
    }

    const stripePriceId =
      options?.priceId ||
      (subscription.items.data[0]?.price?.id as string | undefined);

    const mappedStatus = this.mapStripeStatus(
      subscription.status as StripeSubStatus,
    );

    // First check if subscription exists by stripeSubscriptionId (unique constraint)
    // This handles cases where webhook arrives multiple times or subscription already exists
    let sub = await this.subscriptions.findOne({
      where: { stripeSubscriptionId: subscription.id },
    });

    // If found by stripeSubscriptionId but ownerGroupId doesn't match, log warning
    // This shouldn't happen in normal flow, but handle edge cases
    if (sub && sub.ownerGroupId !== ownerGroupId) {
      this.logger.warn(
        `Subscription ${subscription.id} exists but ownerGroupId mismatch. Existing: ${sub.ownerGroupId}, Expected: ${ownerGroupId}. Updating existing record.`,
      );
    }

    // If not found by stripeSubscriptionId, check by ownerGroupId
    // This handles cases where subscription doesn't exist yet for this owner group
    if (!sub) {
      sub = await this.subscriptions.findOne({
        where: { ownerGroupId },
      });
    }

    // Handle case: New subscription created but old CANCELED subscription exists
    // This happens when user cancels then buys again
    // We should update the existing record instead of creating a new one
    let isReSubscription = false;
    if (
      sub &&
      sub.status === SubscriptionStatus.CANCELED &&
      sub.stripeSubscriptionId !== subscription.id
    ) {
      this.logger.log(
        `New subscription ${subscription.id} created for ownerGroupId=${ownerGroupId}. ` +
          `Replacing old CANCELED subscription ${sub.stripeSubscriptionId}. ` +
          `This is expected when user re-subscribes after cancellation.`,
      );
      isReSubscription = true;
    }

    // Double-check: If we're about to create a new record, verify stripeSubscriptionId doesn't exist
    // This handles race conditions where multiple webhooks arrive simultaneously
    if (!sub) {
      const existingByStripeId = await this.subscriptions.findOne({
        where: { stripeSubscriptionId: subscription.id },
      });
      if (existingByStripeId) {
        this.logger.log(
          `Subscription ${subscription.id} found on second check (race condition). Using existing record.`,
        );
        sub = existingByStripeId;
      }
    }

    // Extract payment method details from subscription
    let cardDetails = {
      paymentMethodId: null as string | null,
      brand: null as string | null,
      last4: null as string | null,
      expMonth: null as number | null,
      expYear: null as number | null,
    };

    try {
      // Get default payment method from subscription
      // Note: We need to retrieve subscription with expanded payment_method
      const expandedSubscription = await this.stripeService.getSubscription(
        subscription.id,
        ["default_payment_method"],
      );
      if (expandedSubscription.default_payment_method) {
        const pm =
          typeof expandedSubscription.default_payment_method === "string"
            ? await this.stripeService.getPaymentMethod(
                expandedSubscription.default_payment_method,
              )
            : expandedSubscription.default_payment_method;
        cardDetails = this.stripeService.extractCardDetails(pm);
      }
    } catch (err) {
      this.logger.warn(
        `Failed to extract payment method from subscription ${subscription.id}`,
        err as any,
      );
    }

    // Extract schedule ID from subscription (if attached)
    // Schedule ID can come from: 1) scheduleId property attached by stripeService, 2) subscription.schedule (expanded), 3) subscription.schedule (string ID)
    let scheduleId: string | null = null;
    if ((subscription as any).scheduleId) {
      scheduleId = (subscription as any).scheduleId;
    } else if (subscription.schedule) {
      scheduleId =
        typeof subscription.schedule === "string"
          ? subscription.schedule
          : subscription.schedule.id;
    }

    // Read dates directly from Stripe subscription object
    // Stripe subscription has current_period_start and current_period_end as Unix timestamps
    const payload: Partial<OwnerGroupSubscription> = {
      ownerGroupId,
      owner,
      stripePriceId: stripePriceId || sub?.stripePriceId,
      stripeSubscriptionId: subscription.id,
      stripeScheduleId: scheduleId || sub?.stripeScheduleId || null, // Store schedule ID per Stripe best practices
      stripeCustomerId:
        options?.customerId ||
        (subscription.customer as string | undefined) ||
        sub?.stripeCustomerId,
      status: mappedStatus,
      // Always update dates from Stripe subscription to ensure they're current
      currentPeriodStart: (subscription as any).current_period_start
        ? new Date((subscription as any).current_period_start * 1000)
        : (sub?.currentPeriodStart ?? null),
      currentPeriodEnd: (subscription as any).current_period_end
        ? new Date((subscription as any).current_period_end * 1000)
        : (sub?.currentPeriodEnd ?? null),
      cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
      canceledAt: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000)
        : (sub?.canceledAt ?? null),
      trialStart: (subscription as any).trial_start
        ? new Date((subscription as any).trial_start * 1000)
        : (sub?.trialStart ?? null),
      trialEnd: (subscription as any).trial_end
        ? new Date((subscription as any).trial_end * 1000)
        : (sub?.trialEnd ?? null),
      // Store payment method details
      stripePaymentMethodId: cardDetails.paymentMethodId,
      cardBrand: cardDetails.brand,
      cardLast4: cardDetails.last4,
      cardExpMonth: cardDetails.expMonth,
      cardExpYear: cardDetails.expYear,
    };

    // If this is a re-subscription (cancelled → new), clear canceled flags
    if (isReSubscription) {
      payload.canceledAt = null;
      payload.cancelAtPeriodEnd = false;
    }

    if (sub) {
      // Always update, even if period dates are null - they might be available in a later webhook
      await this.subscriptions.update({ id: sub.id }, payload);
      this.logger.log(
        `Updated subscription ${subscription.id} (id: ${sub.id}) for ownerGroupId=${ownerGroupId}. Period dates: ${payload.currentPeriodStart ? payload.currentPeriodStart.toISOString() : "null"} to ${payload.currentPeriodEnd ? payload.currentPeriodEnd.toISOString() : "null"}`,
      );
    } else {
      // Use save with catch to handle race conditions where subscription was created
      // between our check and the save operation
      try {
        const newSub = await this.subscriptions.save(
          this.subscriptions.create(payload),
        );
        this.logger.log(
          `Created subscription ${subscription.id} (id: ${newSub.id}) for ownerGroupId=${ownerGroupId}. Period dates: ${payload.currentPeriodStart ? payload.currentPeriodStart.toISOString() : "null"} to ${payload.currentPeriodEnd ? payload.currentPeriodEnd.toISOString() : "null"}`,
        );
      } catch (error: any) {
        // If duplicate key error, fetch the existing record and update it
        if (
          error?.code === "23505" &&
          error?.constraint ===
            "owner_group_subscriptions_stripe_subscription_id_key"
        ) {
          this.logger.log(
            `Duplicate key detected for subscription ${subscription.id}. Fetching existing record and updating.`,
          );
          const existingSub = await this.subscriptions.findOne({
            where: { stripeSubscriptionId: subscription.id },
          });
          if (existingSub) {
            // Merge period dates: use new ones if available, otherwise keep existing
            const mergedPayload = { ...payload };
            if (
              !mergedPayload.currentPeriodStart &&
              existingSub.currentPeriodStart
            ) {
              mergedPayload.currentPeriodStart = existingSub.currentPeriodStart;
            }
            if (
              !mergedPayload.currentPeriodEnd &&
              existingSub.currentPeriodEnd
            ) {
              mergedPayload.currentPeriodEnd = existingSub.currentPeriodEnd;
            }
            await this.subscriptions.update(
              { id: existingSub.id },
              mergedPayload,
            );
            this.logger.log(
              `Updated existing subscription ${subscription.id} (id: ${existingSub.id}) after duplicate key. Period dates: ${mergedPayload.currentPeriodStart ? mergedPayload.currentPeriodStart.toISOString() : "null"} to ${mergedPayload.currentPeriodEnd ? mergedPayload.currentPeriodEnd.toISOString() : "null"}`,
            );
          } else {
            // If still not found, re-throw the error
            throw error;
          }
        } else {
          // Re-throw if it's a different error
          throw error;
        }
      }
    }
  }

  private mapStripeStatus(status: StripeSubStatus): SubscriptionStatus {
    switch (status) {
      case "active":
        return SubscriptionStatus.ACTIVE;
      case "trialing":
        return SubscriptionStatus.TRIALING;
      case "past_due":
        return SubscriptionStatus.PAST_DUE;
      case "unpaid":
        return SubscriptionStatus.UNPAID;
      case "incomplete":
        return SubscriptionStatus.INCOMPLETE;
      case "incomplete_expired":
        return SubscriptionStatus.INCOMPLETE_EXPIRED;
      case "canceled":
        return SubscriptionStatus.CANCELED;
      case "paused":
        return SubscriptionStatus.CANCELED; // treat paused as inactive
      default:
        return SubscriptionStatus.INCOMPLETE;
    }
  }
}
