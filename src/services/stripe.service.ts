import { Injectable, Logger } from "@nestjs/common";
import Stripe from "stripe";
import { StripeConfig } from "../config/stripe.config";

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private stripe: Stripe;

  constructor(private readonly stripeConfig: StripeConfig) {
    // Use Stripe's default API version pinned to the account; avoid hardcoding
    this.stripe = new Stripe(stripeConfig.secretKey);
  }

  /**
   * Create a Stripe customer
   */
  async createCustomer(
    email: string,
    name?: string,
    metadata?: Record<string, string>,
  ): Promise<Stripe.Customer> {
    try {
      return await this.stripe.customers.create({
        email,
        name,
        metadata,
      });
    } catch (error) {
      this.logger.error("Error creating customer:", error);
      throw error;
    }
  }

  /**
   * Retrieve a customer by ID
   */
  async getCustomer(customerId: string): Promise<Stripe.Customer> {
    try {
      const customer = await this.stripe.customers.retrieve(customerId);
      if ((customer as any).deleted) {
        throw new Error(`Customer ${customerId} is deleted`);
      }
      return customer as Stripe.Customer;
    } catch (error) {
      this.logger.error(`Error retrieving customer ${customerId}:`, error);
      throw error;
    }
  }

  /**
   * Update a customer
   */
  async updateCustomer(
    customerId: string,
    params: Stripe.CustomerUpdateParams,
  ): Promise<Stripe.Customer> {
    try {
      return await this.stripe.customers.update(customerId, params);
    } catch (error) {
      this.logger.error(`Error updating customer ${customerId}:`, error);
      throw error;
    }
  }

  /**
   * Create a checkout session for subscription
   */
  async createCheckoutSession(
    customerId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string,
    metadata?: Record<string, string>,
  ): Promise<Stripe.Checkout.Session> {
    try {
      return await this.stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata,
      });
    } catch (error) {
      this.logger.error("Error creating checkout session:", error);
      throw error;
    }
  }

  /**
   * Retrieve a checkout session
   */
  async getCheckoutSession(
    sessionId: string,
  ): Promise<Stripe.Checkout.Session> {
    try {
      return await this.stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["subscription"],
      });
    } catch (error) {
      this.logger.error(
        `Error retrieving checkout session ${sessionId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Create a subscription
   */
  async createSubscription(
    customerId: string,
    priceId: string,
    metadata?: Record<string, string>,
  ): Promise<Stripe.Subscription> {
    try {
      return await this.stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        metadata,
      });
    } catch (error) {
      this.logger.error("Error creating subscription:", error);
      throw error;
    }
  }

  /**
   * Retrieve a subscription
   */
  async getSubscription(
    subscriptionId: string,
    expand?: string[],
  ): Promise<Stripe.Subscription> {
    try {
      const params: Stripe.SubscriptionRetrieveParams = {};
      if (expand && expand.length > 0) {
        params.expand = expand;
      }
      return await this.stripe.subscriptions.retrieve(subscriptionId, params);
    } catch (error) {
      this.logger.error(
        `Error retrieving subscription ${subscriptionId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * List subscriptions for a customer
   * Used to find subscription when invoice doesn't have subscription ID
   */
  async listCustomerSubscriptions(
    customerId: string,
    status?:
      | "active"
      | "trialing"
      | "incomplete"
      | "incomplete_expired"
      | "past_due"
      | "canceled"
      | "unpaid"
      | "all",
  ): Promise<Stripe.Subscription[]> {
    try {
      const params: Stripe.SubscriptionListParams = {
        customer: customerId,
        limit: 10,
      };
      if (status && status !== "all") {
        params.status = status;
      }
      const subscriptions = await this.stripe.subscriptions.list(params);
      return subscriptions.data;
    } catch (error) {
      this.logger.error(
        `Error listing subscriptions for customer ${customerId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(
    subscriptionId: string,
    cancelAtPeriodEnd: boolean = false,
  ): Promise<Stripe.Subscription> {
    try {
      if (cancelAtPeriodEnd) {
        return await this.stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        });
      } else {
        return await this.stripe.subscriptions.cancel(subscriptionId);
      }
    } catch (error) {
      this.logger.error(
        `Error canceling subscription ${subscriptionId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Reactivate a subscription (remove cancellation)
   * Used when user wants to continue subscription that was set to cancel at period end
   */
  async reactivateSubscription(
    subscriptionId: string,
  ): Promise<Stripe.Subscription> {
    try {
      const subscription = await this.stripe.subscriptions.update(
        subscriptionId,
        {
          cancel_at_period_end: false,
        },
      );

      this.logger.log(
        `Subscription ${subscriptionId} reactivated. Cancellation removed.`,
      );
      return subscription;
    } catch (error) {
      this.logger.error(
        `Error reactivating subscription ${subscriptionId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Update subscription metadata
   * Used to add custom metadata to subscriptions (e.g., ownerGroupId, ownerId)
   */
  async updateSubscriptionMetadata(
    subscriptionId: string,
    metadata: Record<string, string>,
  ): Promise<Stripe.Subscription> {
    try {
      return await this.stripe.subscriptions.update(subscriptionId, {
        metadata,
      });
    } catch (error) {
      this.logger.error(
        `Error updating subscription metadata for ${subscriptionId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Update a subscription (change plan)
   * If scheduleAtPeriodEnd is true, creates a subscription schedule to change at period end
   * Otherwise, applies the change immediately with proration
   */
  async updateSubscription(
    subscriptionId: string,
    newPriceId: string,
    scheduleAtPeriodEnd: boolean = false,
    currentPeriodEndTimestamp?: number,
    ownerGroupId?: string,
    ownerId?: string,
  ): Promise<Stripe.Subscription> {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(
        subscriptionId,
        { expand: ["items.data.price", "schedule"] },
      );

      const oldPriceId = subscription.items.data[0]?.price?.id;
      if (!oldPriceId) {
        throw new Error(
          `Subscription ${subscriptionId} has no price associated`,
        );
      }

      if (oldPriceId === newPriceId) {
        this.logger.log(
          `Subscription ${subscriptionId} is already on price ${newPriceId}`,
        );
        return subscription;
      }

      // If scheduling at period end, use subscription schedules
      if (scheduleAtPeriodEnd) {
        // Verify subscription is active before scheduling
        if (
          subscription.status !== "active" &&
          subscription.status !== "trialing"
        ) {
          throw new Error(
            `Cannot schedule plan change for subscription with status: ${subscription.status}. Subscription must be active or trialing.`,
          );
        }

        try {
          return await this.scheduleSubscriptionChangeAtPeriodEnd(
            subscriptionId,
            subscription,
            newPriceId,
            currentPeriodEndTimestamp,
            ownerGroupId,
            ownerId,
          );
        } catch (error: any) {
          // If schedule creation fails, verify subscription is still active
          const verifySubscription = await this.stripe.subscriptions.retrieve(
            subscriptionId,
          );
          
          if (
            verifySubscription.status === "canceled" ||
            verifySubscription.status === "incomplete_expired"
          ) {
            this.logger.error(
              `CRITICAL: Subscription ${subscriptionId} was cancelled during schedule creation attempt. Original error: ${error.message}`,
            );
            throw new Error(
              `Failed to schedule plan change and subscription was cancelled. Please contact support. Original error: ${error.message}`,
            );
          }

          // Re-throw the original error
          throw error;
        }
      }

      // Immediate change (upgrade)
      // Get old and new price details to compare billing intervals
      const oldPrice = await this.getPrice(oldPriceId);
      const newPrice = await this.getPrice(newPriceId);

      const oldInterval = oldPrice.recurring?.interval || ("one_time" as const);
      const oldIntervalCount = oldPrice.recurring?.interval_count || 1;
      const newInterval = newPrice.recurring?.interval || ("one_time" as const);
      const newIntervalCount = newPrice.recurring?.interval_count || 1;

      const isIntervalChanging =
        oldInterval !== newInterval || oldIntervalCount !== newIntervalCount;

      // Prepare update parameters
      const updateParams: Stripe.SubscriptionUpdateParams = {
        items: [
          {
            id: subscription.items.data[0].id,
            price: newPriceId,
          },
        ],
        proration_behavior: "create_prorations",
      };

      // If billing interval is changing, reset the billing cycle anchor to now
      // This ensures the new billing cycle starts immediately and prevents double-charging
      // Note: Cannot use proration_date when billing_cycle_anchor=now
      if (isIntervalChanging) {
        updateParams.billing_cycle_anchor = "now";
        this.logger.log(
          `Billing interval changing from ${oldIntervalCount} ${oldInterval}(s) to ${newIntervalCount} ${newInterval}(s). Resetting billing cycle anchor.`,
        );
      } else {
        // When intervals are the same, use proration_date to ensure proration is calculated from current moment
        const prorationDate = Math.floor(Date.now() / 1000);
        updateParams.proration_date = prorationDate;
      }

      const updatedSubscription = await this.stripe.subscriptions.update(
        subscriptionId,
        updateParams,
      );

      this.logger.log(
        `Updated subscription ${subscriptionId} to price ${newPriceId}. Interval change: ${isIntervalChanging ? "yes (billing_cycle_anchor=now)" : "no (proration_date set)"}`,
      );
      return updatedSubscription;
    } catch (error) {
      this.logger.error(
        `Error updating subscription ${subscriptionId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Schedule a subscription plan change to occur at the end of the current billing period
   * This is used for downgrades - no immediate charge, change happens at period end
   */
  async scheduleSubscriptionChangeAtPeriodEnd(
    subscriptionId: string,
    subscription: Stripe.Subscription,
    newPriceId: string,
    currentPeriodEndTimestamp?: number,
    ownerGroupId?: string,
    ownerId?: string,
  ): Promise<Stripe.Subscription> {
    try {
      // Try to get current_period_end from subscription object, fallback to provided timestamp
      let currentPeriodEnd =
        (subscription as any).current_period_end || currentPeriodEndTimestamp;

      // If still not available, try to fetch subscription again with full details
      if (!currentPeriodEnd) {
        this.logger.warn(
          `Subscription ${subscriptionId} does not have current_period_end in provided object. Fetching fresh subscription.`,
        );
        const freshSubscription = await this.stripe.subscriptions.retrieve(
          subscriptionId,
        );
        currentPeriodEnd = (freshSubscription as any).current_period_end;
      }

      if (!currentPeriodEnd) {
        throw new Error(
          `Subscription ${subscriptionId} does not have current_period_end. Cannot schedule plan change.`,
        );
      }

      // Check if subscription already has a schedule
      // The subscription was retrieved with schedule expanded, so check it properly
      let finalScheduleId: string | undefined;
      
      if (subscription.schedule) {
        finalScheduleId =
          typeof subscription.schedule === "string"
            ? subscription.schedule
            : subscription.schedule.id;
      }

      // Double-check by fetching schedule if we think there might be one
      // This handles cases where schedule wasn't properly expanded
      // Note: subscriptionSchedules.list() doesn't support filtering by subscription
      // So we'll rely on the expanded schedule field from the subscription object
      // If schedule is null/undefined, assume there's no schedule

      const currentPriceId = subscription.items.data[0]?.price?.id as string;
      if (!currentPriceId) {
        throw new Error(
          `Subscription ${subscriptionId} has no price in items`,
        );
      }

      // Get current_period_start for Phase 0
      const currentPeriodStart =
        (subscription as any).current_period_start ||
        Math.floor(Date.now() / 1000);

      let schedule: Stripe.SubscriptionSchedule;

      if (finalScheduleId) {
        // Update existing schedule
        // Retrieve the existing schedule to get Phase 0 details
        this.logger.log(
          `Subscription ${subscriptionId} already has a schedule ${finalScheduleId}. Updating existing schedule.`,
        );

        const existingSchedule = await this.stripe.subscriptionSchedules.retrieve(
          finalScheduleId,
        );

        // Get Phase 0 details from existing schedule
        const phase0 = existingSchedule.phases[0];
        if (!phase0) {
          throw new Error(
            `Schedule ${finalScheduleId} has no phases. Cannot update.`,
          );
        }

        // Check if Phase 0 is currently active (start_date is in the past or now)
        const now = Math.floor(Date.now() / 1000);
        const phase0IsActive = phase0.start_date <= now;

        // Get new price details to determine billing interval for duration
        const newPrice = await this.getPrice(newPriceId);
        const billingInterval = newPrice.recurring?.interval || "month";
        const billingIntervalCount = newPrice.recurring?.interval_count || 1;

        // If Phase 0 is active, we CANNOT modify its start_date
        // We must include Phase 0 but WITHOUT start_date/end_date - Stripe will keep existing values
        if (phase0IsActive) {
          this.logger.log(
            `Phase 0 is active for schedule ${finalScheduleId}. Updating schedule without modifying Phase 0 start_date.`,
          );

          // When Phase 0 is active, Stripe doesn't allow ANY modification to the schedule
          // Solution: Release the schedule (removes it but keeps subscription active), then create a new one
          // Release is different from cancel - it doesn't cause "already attached" errors
          this.logger.log(
            `Phase 0 is active. Releasing schedule ${finalScheduleId} and creating a new one.`,
          );

          try {
            // Release the schedule (this removes it from subscription but keeps subscription active)
            await this.stripe.subscriptionSchedules.release(finalScheduleId);
            this.logger.log(`Released schedule ${finalScheduleId}`);
            
            // Wait for Stripe to process the release (longer wait than cancel)
            await new Promise((resolve) => setTimeout(resolve, 1000));
          } catch (releaseError: any) {
            // If schedule is already released or doesn't exist, that's fine
            if (
              releaseError.type !== "StripeInvalidRequestError" ||
              (!releaseError.message?.includes("already released") &&
                !releaseError.message?.includes("No such subscription_schedule"))
            ) {
              this.logger.warn(
                `Failed to release schedule ${finalScheduleId}:`,
                releaseError.message,
              );
              throw new Error(
                `Failed to release schedule: ${releaseError.message}`,
              );
            }
          }

          // Now create a new schedule from the subscription
          schedule = await this.stripe.subscriptionSchedules.create({
            from_subscription: subscriptionId,
          });

          // Calculate Phase 0 duration from current period
          const phase0DurationSeconds = currentPeriodEnd - currentPeriodStart;
          const phase0DurationDays = Math.floor(phase0DurationSeconds / 86400);
          const phase0DurationWeeks = Math.floor(phase0DurationDays / 7);
          const phase0DurationMonths = Math.floor(phase0DurationDays / 30);
          const phase0DurationYears = Math.floor(phase0DurationDays / 365);

          // Determine Phase 0 duration interval
          let phase0DurationInterval: "day" | "week" | "month" | "year";
          let phase0DurationIntervalCount: number;
          if (phase0DurationYears >= 1) {
            phase0DurationInterval = "year";
            phase0DurationIntervalCount = phase0DurationYears;
          } else if (phase0DurationMonths >= 1) {
            phase0DurationInterval = "month";
            phase0DurationIntervalCount = phase0DurationMonths;
          } else if (phase0DurationWeeks >= 1) {
            phase0DurationInterval = "week";
            phase0DurationIntervalCount = phase0DurationWeeks;
          } else {
            phase0DurationInterval = "day";
            phase0DurationIntervalCount = phase0DurationDays;
          }

          // Update the schedule to add Phase 1 with the new price
          schedule = await this.stripe.subscriptionSchedules.update(
            schedule.id,
            {
              phases: [
                {
                  // Phase 0: Current subscription - use duration
                  items: [
                    {
                      price: currentPriceId,
                      quantity: 1,
                    },
                  ],
                  start_date: currentPeriodStart,
                  duration: {
                    interval: phase0DurationInterval,
                    interval_count: phase0DurationIntervalCount,
                  },
                },
                {
                  // Phase 1: New price - use duration based on new price's billing interval
                  items: [{ price: newPriceId, quantity: 1 }],
                  duration: {
                    interval: billingInterval as "day" | "week" | "month" | "year",
                    interval_count: billingIntervalCount,
                  },
                  // No prorations when transitioning to downgrade
                  proration_behavior: "none",
                },
              ],
              end_behavior: "release",
              // No prorations when updating schedule for downgrade
              proration_behavior: "none",
              // Add metadata here (can't be set when using from_subscription)
              metadata: ownerGroupId && ownerId
                ? {
                    ownerGroupId,
                    ownerId,
                  }
                : undefined,
            },
          );
        } else {
          // Phase 0 is NOT active yet - we can safely update the schedule
          const phase0StartDate = phase0.start_date;
          const phase0EndDate = phase0.end_date || currentPeriodEnd;
          const hasPhase1 = existingSchedule.phases.length > 1;
          const phase1StartDate = hasPhase1
            ? existingSchedule.phases[1].start_date
            : phase0EndDate;

          // Build Phase 0 object - can modify since it's not active
          const phase0Update: any = {
            items: phase0.items.map((item) => ({
              price: item.price as string,
              quantity: item.quantity || 1,
            })),
            start_date: phase0StartDate, // Can modify since not active
            end_date: phase0EndDate,
          };

          // Update the existing schedule
          schedule = await this.stripe.subscriptionSchedules.update(
            finalScheduleId,
            {
              phases: [
                phase0Update,
                {
                  // Phase 1: Update with new price - use duration
                  items: [{ price: newPriceId, quantity: 1 }],
                  start_date: phase1StartDate,
                  duration: {
                    interval: billingInterval as "day" | "week" | "month" | "year",
                    interval_count: billingIntervalCount,
                  },
                  // No prorations when transitioning to downgrade
                  proration_behavior: "none",
                },
              ],
              end_behavior: "release",
              // No prorations when updating schedule for downgrade
              proration_behavior: "none",
              metadata: ownerGroupId && ownerId
                ? {
                    ownerGroupId,
                    ownerId,
                  }
                : undefined,
            },
          );
        }
      } else {
        // Get new price details to determine billing interval for duration
        const newPrice = await this.getPrice(newPriceId);
        const billingInterval = newPrice.recurring?.interval || "month";
        const billingIntervalCount = newPrice.recurring?.interval_count || 1;

        // Create schedule from subscription (this creates Phase 0 with current subscription)
        // Cannot set end_behavior, phases, or metadata when using from_subscription
        // Then we'll update it to add Phase 1 with the new price and metadata
        schedule = await this.stripe.subscriptionSchedules.create({
          from_subscription: subscriptionId,
        });

        // Calculate Phase 0 duration from current period
        const phase0DurationSeconds = currentPeriodEnd - currentPeriodStart;
        const phase0DurationDays = Math.floor(phase0DurationSeconds / 86400);
        const phase0DurationWeeks = Math.floor(phase0DurationDays / 7);
        const phase0DurationMonths = Math.floor(phase0DurationDays / 30);
        const phase0DurationYears = Math.floor(phase0DurationDays / 365);

        // Determine Phase 0 duration interval (use the most appropriate)
        let phase0DurationInterval: "day" | "week" | "month" | "year";
        let phase0DurationIntervalCount: number;
        if (phase0DurationYears >= 1) {
          phase0DurationInterval = "year";
          phase0DurationIntervalCount = phase0DurationYears;
        } else if (phase0DurationMonths >= 1) {
          phase0DurationInterval = "month";
          phase0DurationIntervalCount = phase0DurationMonths;
        } else if (phase0DurationWeeks >= 1) {
          phase0DurationInterval = "week";
          phase0DurationIntervalCount = phase0DurationWeeks;
        } else {
          phase0DurationInterval = "day";
          phase0DurationIntervalCount = phase0DurationDays;
        }

        // Now update the schedule to add Phase 1 with the new price
        // Use duration instead of dates (recommended by Stripe)
        schedule = await this.stripe.subscriptionSchedules.update(schedule.id, {
          phases: [
            {
              // Phase 0: Current subscription - use duration for remaining period
              items: [
                {
                  price: currentPriceId,
                  quantity: 1,
                },
              ],
              start_date: currentPeriodStart, // Required anchor point
              duration: {
                interval: phase0DurationInterval,
                interval_count: phase0DurationIntervalCount,
              },
              // No proration for Phase 0 (current phase)
            },
            {
              // Phase 1: New price - use duration based on new price's billing interval
              items: [{ price: newPriceId, quantity: 1 }],
              duration: {
                interval: billingInterval as "day" | "week" | "month" | "year",
                interval_count: billingIntervalCount,
              },
              // No prorations when transitioning to downgrade (phase transition)
              proration_behavior: "none",
            },
          ],
          end_behavior: "release",
          // No prorations when updating schedule for downgrade
          proration_behavior: "none",
          metadata: ownerGroupId && ownerId
            ? {
                ownerGroupId,
                ownerId,
              }
            : undefined,
        });
      }

      this.logger.log(
        `Created/updated schedule ${schedule.id} for subscription ${subscriptionId} to change to price ${newPriceId} at period end ${new Date(currentPeriodEnd * 1000).toISOString()}`,
      );

      // Retrieve the updated subscription to return
      const updatedSubscription = await this.stripe.subscriptions.retrieve(
        subscriptionId,
        { expand: ["schedule"] },
      );

      // Attach schedule ID to subscription object for database storage
      (updatedSubscription as any).scheduleId = schedule.id;

      return updatedSubscription;
    } catch (error) {
      this.logger.error(
        `Error scheduling subscription change for ${subscriptionId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Retrieve a price by ID (for fetching plan details)
   */
  async getPrice(priceId: string): Promise<Stripe.Price> {
    try {
      return await this.stripe.prices.retrieve(priceId);
    } catch (error) {
      this.logger.error(`Error retrieving price ${priceId}:`, error);
      throw error;
    }
  }

  /**
   * Retrieve a product by ID (for fetching plan details)
   */
  async getProduct(productId: string): Promise<Stripe.Product> {
    try {
      return await this.stripe.products.retrieve(productId);
    } catch (error) {
      this.logger.error(`Error retrieving product ${productId}:`, error);
      throw error;
    }
  }

  /**
   * List all active prices (for displaying available plans)
   */
  async listPrices(
    active: boolean = true,
    limit: number = 100,
  ): Promise<Stripe.Price[]> {
    try {
      const prices = await this.stripe.prices.list({
        active,
        limit,
      });
      return prices.data;
    } catch (error) {
      this.logger.error("Error listing prices:", error);
      throw error;
    }
  }

  /**
   * Construct webhook event from raw body and signature
   */
  constructWebhookEvent(
    payload: string | Buffer,
    signature: string,
  ): Stripe.Event {
    try {
      return this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.stripeConfig.webhookSecret,
      );
    } catch (error) {
      this.logger.error("Error constructing webhook event:", error);
      throw error;
    }
  }

  /**
   * Retrieve an invoice (used when webhook payload is missing fields)
   */
  async getInvoice(
    invoiceId: string,
    expand?: string[],
  ): Promise<Stripe.Invoice> {
    try {
      return await this.stripe.invoices.retrieve(invoiceId, {
        expand: expand || ["subscription", "payment_intent"],
      });
    } catch (error) {
      this.logger.error(`Error retrieving invoice ${invoiceId}:`, error);
      throw error;
    }
  }

  /**
   * Get plan details (price + product) from Stripe
   * This is used to fetch plan information when displaying to users
   */
  async getPlanDetails(priceId: string): Promise<{
    price: Stripe.Price;
    product: Stripe.Product;
    name: string;
    amount: number;
    currency: string;
    interval: string;
    intervalCount: number;
    description: string | null;
  }> {
    try {
      const price = await this.getPrice(priceId);
      const product = await this.getProduct(price.product as string);

      return {
        price,
        product,
        name: product.name,
        amount: price.unit_amount || 0,
        currency: price.currency,
        interval: price.recurring?.interval || "one_time",
        intervalCount: price.recurring?.interval_count || 1,
        description: product.description,
      };
    } catch (error) {
      this.logger.error(`Error getting plan details for ${priceId}:`, error);
      throw error;
    }
  }

  /**
   * Retrieve a payment method by ID
   * Used to get card details (brand, last4, expiry) from Stripe
   */
  async getPaymentMethod(
    paymentMethodId: string,
  ): Promise<Stripe.PaymentMethod> {
    try {
      return await this.stripe.paymentMethods.retrieve(paymentMethodId);
    } catch (error) {
      this.logger.error(
        `Error retrieving payment method ${paymentMethodId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Retrieve a payment intent by ID
   * Used to get payment method from invoice payment_intent
   */
  async getPaymentIntent(
    paymentIntentId: string,
    expand?: string[],
  ): Promise<Stripe.PaymentIntent> {
    try {
      return await this.stripe.paymentIntents.retrieve(paymentIntentId, {
        expand: expand || [],
      });
    } catch (error) {
      this.logger.error(
        `Error retrieving payment intent ${paymentIntentId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Extract card details from a Stripe Payment Method
   * Returns safe-to-store card information (last4, brand, expiry)
   */
  extractCardDetails(paymentMethod: Stripe.PaymentMethod | null | undefined): {
    paymentMethodId: string | null;
    brand: string | null;
    last4: string | null;
    expMonth: number | null;
    expYear: number | null;
  } {
    if (
      !paymentMethod ||
      paymentMethod.type !== "card" ||
      !paymentMethod.card
    ) {
      return {
        paymentMethodId: null,
        brand: null,
        last4: null,
        expMonth: null,
        expYear: null,
      };
    }

    return {
      paymentMethodId: paymentMethod.id,
      brand: paymentMethod.card.brand || null,
      last4: paymentMethod.card.last4 || null,
      expMonth: paymentMethod.card.exp_month || null,
      expYear: paymentMethod.card.exp_year || null,
    };
  }

  /**
   * Retrieve a subscription schedule by ID
   * Used to check schedule phases when subscription transitions
   */
  async getSubscriptionSchedule(
    scheduleId: string,
  ): Promise<Stripe.SubscriptionSchedule> {
    try {
      return await this.stripe.subscriptionSchedules.retrieve(scheduleId);
    } catch (error) {
      this.logger.error(
        `Error retrieving subscription schedule ${scheduleId}:`,
        error,
      );
      throw error;
    }
  }
}
