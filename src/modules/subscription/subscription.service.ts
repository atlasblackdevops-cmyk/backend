import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import Stripe from "stripe";
import { Repository } from "typeorm";
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

    /**
     * Prevent duplicate active checkouts (enable when ready).
     *
     * if (existingSub) {
     *   const isActiveLike =
     *     existingSub.status === SubscriptionStatus.ACTIVE ||
     *     existingSub.status === SubscriptionStatus.TRIALING ||
     *     existingSub.status === SubscriptionStatus.PAST_DUE;
     *   const periodStillValid =
     *     !!existingSub.currentPeriodEnd &&
     *     existingSub.currentPeriodEnd.getTime() > Date.now();
     *   const cancelAtPeriodEndFuture =
     *     existingSub.cancelAtPeriodEnd && periodStillValid;
     *
     *   if (isActiveLike && (periodStillValid || existingSub.status === SubscriptionStatus.ACTIVE)) {
     *     throw new BadRequestException(
     *       "An active subscription already exists; use plan change instead of starting a new checkout.",
     *     );
     *   }
     *
     *   if (cancelAtPeriodEndFuture) {
     *     throw new BadRequestException(
     *       "A subscription is pending cancellation at period end. Please wait until it ends before re-subscribing.",
     *     );
     *   }
     * }
     */

    let stripeCustomerId =
      existingSub?.stripeCustomerId ??
      (await this.ensureStripeCustomer(owner.email, owner.name));

    const session = await this.stripeService.createCheckoutSession(
      stripeCustomerId,
      priceId,
      owner.ownerGroupId,
      owner.id,
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
   * Change plan for an existing subscription (upgrade/downgrade).
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

    const updated = await this.stripeService.updateSubscription(
      sub.stripeSubscriptionId,
      newPriceId,
    );

    await this.applySubscriptionUpdate(owner.ownerGroupId, updated);

    return {
      subscriptionId: updated.id,
      priceId: newPriceId,
      status: updated.status,
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
        await this.handleInvoicePaymentSucceeded(
          event.data.object as Stripe.Invoice,
        );
        break;
      case "invoice.payment_failed":
        await this.handleInvoicePaymentFailed(
          event.data.object as Stripe.Invoice,
        );
        break;
      default:
        this.logger.debug(`Unhandled Stripe event: ${event.type}`);
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

    const subscription =
      await this.stripeService.getSubscription(subscriptionId);

    await this.applySubscriptionUpdate(ownerGroupId, subscription, {
      ownerId,
      customerId: customerId ?? undefined,
      priceId: priceId ?? undefined,
    });
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const ownerGroupId =
      (subscription.metadata as any)?.ownerGroupId ||
      (subscription.metadata as any)?.owner_group_id;
    if (!ownerGroupId) {
      this.logger.error("subscription.updated missing ownerGroupId metadata");
      return;
    }
    await this.applySubscriptionUpdate(ownerGroupId, subscription);
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

    if (!sub) {
      this.logger.warn(
        `invoice.payment_succeeded subscription not found; subscriptionId=${subscriptionId} invoice=${invoiceWithSubs.id} customer=${customerId ?? "unknown"}`,
      );
      return;
    }

    const paymentIntentId =
      (invoiceWithSubs.payment_intent as string) || invoiceWithSubs.id;

    this.logger.debug(
      `Recording payment for subscription=${sub.id} invoice=${invoiceWithSubs.id} paymentIntent=${paymentIntentId} amount=${invoiceWithSubs.amount_paid}`,
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

    // Insert payment record with card details
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
      }),
    );

    // Update period dates if present
    if (invoiceWithSubs.lines?.data?.[0]?.period) {
      const period = invoiceWithSubs.lines.data[0].period;
      await this.subscriptions.update(
        { id: sub.id },
        {
          currentPeriodStart: period.start
            ? new Date(period.start * 1000)
            : sub.currentPeriodStart,
          currentPeriodEnd: period.end
            ? new Date(period.end * 1000)
            : sub.currentPeriodEnd,
        },
      );
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
   * Upsert subscription for an owner group based on Stripe subscription data.
   */
  private async applySubscriptionUpdate(
    ownerGroupId: string,
    subscription: Stripe.Subscription,
    options?: { ownerId?: string; customerId?: string; priceId?: string },
  ) {
    const subscriptionWithPeriods = subscription as Stripe.Subscription & {
      current_period_start?: number;
      current_period_end?: number;
      trial_start?: number;
      trial_end?: number;
    };

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

    const sub = await this.subscriptions.findOne({
      where: { ownerGroupId },
    });

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

    const payload: Partial<OwnerGroupSubscription> = {
      ownerGroupId,
      owner,
      stripePriceId: stripePriceId || sub?.stripePriceId,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId:
        options?.customerId ||
        (subscription.customer as string | undefined) ||
        sub?.stripeCustomerId,
      status: mappedStatus,
      currentPeriodStart: subscriptionWithPeriods.current_period_start
        ? new Date(subscriptionWithPeriods.current_period_start * 1000)
        : (sub?.currentPeriodStart ?? null),
      currentPeriodEnd: subscriptionWithPeriods.current_period_end
        ? new Date(subscriptionWithPeriods.current_period_end * 1000)
        : (sub?.currentPeriodEnd ?? null),
      cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
      canceledAt: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000)
        : (sub?.canceledAt ?? null),
      trialStart: subscriptionWithPeriods.trial_start
        ? new Date(subscriptionWithPeriods.trial_start * 1000)
        : (sub?.trialStart ?? null),
      trialEnd: subscriptionWithPeriods.trial_end
        ? new Date(subscriptionWithPeriods.trial_end * 1000)
        : (sub?.trialEnd ?? null),
      // Store payment method details
      stripePaymentMethodId: cardDetails.paymentMethodId,
      cardBrand: cardDetails.brand,
      cardLast4: cardDetails.last4,
      cardExpMonth: cardDetails.expMonth,
      cardExpYear: cardDetails.expYear,
    };

    if (sub) {
      await this.subscriptions.update({ id: sub.id }, payload);
    } else {
      await this.subscriptions.save(this.subscriptions.create(payload));
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
