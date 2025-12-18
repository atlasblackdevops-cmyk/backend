import { Injectable, Logger } from "@nestjs/common";
import Stripe from "stripe";
import { StripeConfig } from "../config/stripe.config";

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly stripe: Stripe;

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
      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata,
      });
      this.logger.log(`Created Stripe customer: ${customer.id}`);
      return customer;
    } catch (error) {
      this.logger.error("Error creating Stripe customer:", error);
      throw error;
    }
  }

  /**
   * Retrieve a Stripe customer by ID
   */
  async getCustomer(customerId: string): Promise<Stripe.Customer> {
    try {
      const customer = await this.stripe.customers.retrieve(customerId);
      // Handle deleted customers explicitly
      if ((customer as Stripe.DeletedCustomer).deleted) {
        throw new Error(`Customer ${customerId} is deleted`);
      }
      return customer as Stripe.Customer;
    } catch (error) {
      this.logger.error(`Error retrieving customer ${customerId}:`, error);
      throw error;
    }
  }

  /**
   * Create a checkout session for subscription purchase
   */
  async createCheckoutSession(
    customerId: string,
    priceId: string,
    ownerGroupId: string,
    ownerId: string,
  ): Promise<Stripe.Checkout.Session> {
    try {
      const session = await this.stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${this.stripeConfig.subscriptionSuccessUrl}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: this.stripeConfig.subscriptionCancelUrl,
        metadata: {
          ownerGroupId,
          ownerId,
        },
        subscription_data: {
          metadata: {
            ownerGroupId,
            ownerId,
          },
        },
      });

      this.logger.log(
        `Created checkout session: ${session.id} for owner group: ${ownerGroupId}`,
      );
      return session;
    } catch (error) {
      this.logger.error("Error creating checkout session:", error);
      throw error;
    }
  }

  /**
   * Retrieve a checkout session by ID
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
      const subscription = await this.stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        metadata,
      });

      this.logger.log(`Created subscription: ${subscription.id}`);
      return subscription;
    } catch (error) {
      this.logger.error("Error creating subscription:", error);
      throw error;
    }
  }

  /**
   * Retrieve a subscription by ID
   */
  async getSubscription(
    subscriptionId: string,
    expand?: string[],
  ): Promise<Stripe.Subscription> {
    try {
      return await this.stripe.subscriptions.retrieve(subscriptionId, {
        expand: expand || [],
      });
    } catch (error) {
      this.logger.error(
        `Error retrieving subscription ${subscriptionId}:`,
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
    cancelAtPeriodEnd: boolean = true,
  ): Promise<Stripe.Subscription> {
    try {
      const subscription = await this.stripe.subscriptions.update(
        subscriptionId,
        {
          cancel_at_period_end: cancelAtPeriodEnd,
        },
      );

      this.logger.log(
        `Subscription ${subscriptionId} will ${cancelAtPeriodEnd ? "cancel at period end" : "cancel immediately"}`,
      );
      return subscription;
    } catch (error) {
      this.logger.error(
        `Error canceling subscription ${subscriptionId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Update subscription (e.g., change plan)
   */
  async updateSubscription(
    subscriptionId: string,
    newPriceId: string,
  ): Promise<Stripe.Subscription> {
    try {
      const subscription =
        await this.stripe.subscriptions.retrieve(subscriptionId);

      const updatedSubscription = await this.stripe.subscriptions.update(
        subscriptionId,
        {
          items: [
            {
              id: subscription.items.data[0].id,
              price: newPriceId,
            },
          ],
          proration_behavior: "create_prorations",
        },
      );

      this.logger.log(
        `Updated subscription ${subscriptionId} to price ${newPriceId}`,
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
  async getInvoice(invoiceId: string): Promise<Stripe.Invoice> {
    try {
      return await this.stripe.invoices.retrieve(invoiceId, {
        expand: ["subscription"],
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
}
