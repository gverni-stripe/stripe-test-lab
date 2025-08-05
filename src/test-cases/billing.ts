import Stripe from 'stripe';
import { TestCaseGroup } from './types';

// Helper functions for shared workflow steps
function generateRandomSuffix(): string {
  return Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
}

async function createTestClock(stripe: Stripe) {
  return await stripe.testHelpers.testClocks.create({
    frozen_time: Math.floor(Date.now() / 1000),
  });
}

async function createCustomerWithTestClock(stripe: Stripe, email: string, name: string, testClockId: string) {
  return await stripe.customers.create({
    email,
    name,
    description: 'Full workflow test customer',
    test_clock: testClockId,
    shipping: {
      address: {
        city: 'New York',
        country: 'US',
        line1: '456 Broadway',
        postal_code: '10013',
        state: 'NY',
      },
      name,
    },
  });
}

async function addPaymentMethodToCustomer(stripe: Stripe, customerId: string) {
  const paymentMethod = await stripe.paymentMethods.attach('pm_card_visa', {
    customer: customerId,
  });

  await stripe.customers.update(customerId, {
    invoice_settings: {
      default_payment_method: paymentMethod.id,
    },
  });

  return paymentMethod;
}

async function createProduct(stripe: Stripe, name: string, tier: string) {
  return await stripe.products.create({
    name,
    tax_code: 'txcd_10000000',
    metadata: {
      tier,
    },
  });
}

async function createPrice(stripe: Stripe, productId: string, unitAmount: number, tier: string) {
  return await stripe.prices.create({
    currency: 'usd',
    product: productId,
    recurring: {
      interval: 'month',
      interval_count: 1,
    },
    unit_amount: unitAmount,
    metadata: {
      tier,
      productLine: 'productLine1',
    },
  });
}

async function createEntitlementFeature(stripe: Stripe, lookupKey: string, name: string, tier: string) {
  return await stripe.entitlements.features.create({
    lookup_key: lookupKey,
    name,
    metadata: {
      tier,
    },
  });
}

async function associateFeatureWithProduct(stripe: Stripe, productId: string, featureId: string) {
  return await stripe.products.createFeature(productId, {
    entitlement_feature: featureId,
  });
}

async function createSubscription(stripe: Stripe, customerId: string, priceId: string, organizationId: string, tier: string, paymentBehavior: 'default_incomplete' | 'allow_incomplete' | 'error_if_incomplete' = 'default_incomplete', trialPeriodDays?: number, defaultPaymentMethodId?: string) {
  const subscriptionParams: Stripe.SubscriptionCreateParams = {
    customer: customerId,
    items: [{ price: priceId }],
    payment_behavior: paymentBehavior,
    automatic_tax: {
      enabled: true,
    },
    metadata: {
      organization: organizationId,
      plan: tier,
    },
    expand: ['latest_invoice', 'pending_setup_intent'],
  };

  if (trialPeriodDays) {
    subscriptionParams.trial_period_days = trialPeriodDays;
  }

  if (defaultPaymentMethodId) {
    subscriptionParams.default_payment_method = defaultPaymentMethodId;
  }

  return await stripe.subscriptions.create(subscriptionParams);
}

async function advanceTestClockSync(stripe: Stripe, testClockId: string, weeks: number) {
  // First get the current test clock to use its frozen_time as the base
  const currentTestClock = await stripe.testHelpers.testClocks.retrieve(testClockId);
  const secondsToAdvance = weeks * 7 * 24 * 60 * 60; // weeks * days * hours * minutes * seconds
  await stripe.testHelpers.testClocks.advance(testClockId, {
    frozen_time: currentTestClock.frozen_time + secondsToAdvance,
  });

  // Poll the test clock until it's no longer advancing
  let testClock;
  do {
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    testClock = await stripe.testHelpers.testClocks.retrieve(testClockId);
  } while (testClock.status === 'advancing');

  return testClock;
}

async function updateSubscriptionWithProration(stripe: Stripe, subscriptionId: string, newPriceId: string) {
  return await stripe.subscriptions.update(subscriptionId, {
    items: [{ price: newPriceId }],
    proration_behavior: 'create_prorations',
  });
}

export const billing: TestCaseGroup = {
  label: 'Billing',
  testCases: [
    {
      id: 'billing-1',
      name: 'Subscription Payment Failure',
      description: 'Simulate a failed subscription payment.',
      category: 'Subscription Creation',
      docsUrl: 'https://docs.stripe.com/billing/testing#payment-failures',
      handler: async (stripe: Stripe) => {
        const testClock = await createTestClock(stripe);
        const customer = await createCustomerWithTestClock(stripe, 'failure@example.com', 'Failure Test Company', testClock.id);
        try {
          await stripe.subscriptions.create({
            customer: customer.id,
            items: [{ price_data: { currency: 'usd', product: (await stripe.products.create({ name: 'Test' })).id, unit_amount: 1000, recurring: { interval: 'month' } } }],
            default_payment_method: 'pm_card_visa_chargeDeclined',
            expand: ['latest_invoice.payment_intent'],
          });
          return { message: 'Unexpected: Subscription succeeded with declined card.' };
        } catch (err) {
          return { message: `Expected subscription failure: ${(err as Error).message}`, testClockId: testClock.id };
        }
      },
    },
     {
      id: 'billing-2',
      name: 'Trial without payment method',
      description: 'Create customer, product, price, feature, and subscription with trial period. No saved payment method',
      category: 'Subscription Creation',
      docsUrl: 'https://docs.stripe.com/billing/subscriptions/overview',
      handler: async (stripe: Stripe) => {
        const randomSuffix = generateRandomSuffix();
        const testClock = await createTestClock(stripe);
        const customer = await createCustomerWithTestClock(stripe, 'workflow@example.com', 'Workflow Test Company', testClock.id);
        const product = await createProduct(stripe, 'SaaS Subscription Basic Tier', 'basic');
        const price = await createPrice(stripe, product.id, 49900, 'basic');
        const feature = await createEntitlementFeature(stripe, `access_basic_${randomSuffix}`, 'Basic Access', 'basic');
        const productFeature = await associateFeatureWithProduct(stripe, product.id, feature.id);
        const subscription = await createSubscription(stripe, customer.id, price.id, 'basic_trial_workflow_test', 'basic', 'default_incomplete', 30);

        return { 
          message: 'Complete subscription workflow executed successfully',
          workflow: {
            testClockId: testClock.id,
            customerId: customer.id,
            productId: product.id,
            priceId: price.id,
            featureId: feature.id,
            productFeatureId: productFeature.id,
            subscriptionId: subscription.id,
            subscriptionStatus: subscription.status,
          }
        };
      },
    },
    {
      id: 'billing-3',
      name: 'Subscription with payment method',
      description: 'Create customer with payment method, product, price, feature, and subscription without trial period.',
      category: 'Subscription Creation',
      docsUrl: 'https://docs.stripe.com/billing/subscriptions/overview',
      handler: async (stripe: Stripe) => {
        const randomSuffix = generateRandomSuffix();
        const testClock = await createTestClock(stripe);
        const customer = await createCustomerWithTestClock(stripe, 'premium@example.com', 'Premium Test Company', testClock.id);
        const paymentMethod = await addPaymentMethodToCustomer(stripe, customer.id);
        const product = await createProduct(stripe, 'SaaS Subscription Premium Tier', 'premium');
        const price = await createPrice(stripe, product.id, 99900, 'premium');
        const feature = await createEntitlementFeature(stripe, `access_premium_${randomSuffix}`, 'Premium Access', 'premium');
        const productFeature = await associateFeatureWithProduct(stripe, product.id, feature.id);
        const subscription = await createSubscription(stripe, customer.id, price.id, 'premium_workflow_test', 'premium', 'default_incomplete');

        return { 
          message: 'Subscription with payment method workflow executed successfully',
          workflow: {
            testClockId: testClock.id,
            customerId: customer.id,
            paymentMethodId: paymentMethod.id,
            productId: product.id,
            priceId: price.id,
            featureId: feature.id,
            productFeatureId: productFeature.id,
            subscriptionId: subscription.id,
            subscriptionStatus: subscription.status,
          }
        };
      },
    },
    {
      id: 'billing-4',
      name: 'Mid-cycle upgrade with proration at end of cycle',
      description: 'Simulate a mid-cycle upgrade from premium to super premium tier with proration at end of cycle.',
      category: 'Subscription Update',
      docsUrl: 'https://docs.stripe.com/billing/subscriptions/overview',
      handler: async (stripe: Stripe) => {
        const randomSuffix = generateRandomSuffix();
        const testClock = await createTestClock(stripe);
        const customer = await createCustomerWithTestClock(stripe, 'super-premium@example.com', 'Super Premium Test Company', testClock.id);
        const paymentMethod = await addPaymentMethodToCustomer(stripe, customer.id);
        const product = await createProduct(stripe, 'SaaS Subscription Premium Tier', 'premium');
        const price = await createPrice(stripe, product.id, 99900, 'premium');
        const product2 = await createProduct(stripe, 'SaaS Subscription Super Premium Tier', 'super-premium');
        const price2 = await createPrice(stripe, product2.id, 199900, 'super-premium');
        const feature = await createEntitlementFeature(stripe, `access_premium_${randomSuffix}`, 'Premium Access', 'premium');
        const productFeature = await associateFeatureWithProduct(stripe, product.id, feature.id);
        const subscription = await createSubscription(stripe, customer.id, price.id, 'premium_workflow_test', 'premium', 'allow_incomplete', undefined, paymentMethod.id);
        
        await advanceTestClockSync(stripe, testClock.id, 2);
        const updatedSubscription = await updateSubscriptionWithProration(stripe, subscription.id, price2.id);
        await advanceTestClockSync(stripe, testClock.id, 2.5);

        // Fetch the final subscription to get the latest invoice
        const finalSubscription = await stripe.subscriptions.retrieve(subscription.id, {
          expand: ['latest_invoice'],
        });

        return { 
          message: `Test Clock Subscription With Super Premium Tier Executed Successfully - Subscription ${subscription.id}, prorated Ivoice ${finalSubscription.latest_invoice ? (typeof finalSubscription.latest_invoice === 'string' ? finalSubscription.latest_invoice : finalSubscription.latest_invoice.id) : 'None'}`,
          workflow: {
            testClockId: testClock.id,
            customerId: customer.id,
            paymentMethodId: paymentMethod.id,
            productId: product.id,
            priceId: price.id,
            product2Id: product2.id,
            price2Id: price2.id,
            featureId: feature.id,
            productFeatureId: productFeature.id,
            subscriptionId: subscription.id,
            subscriptionStatus: subscription.status,
            updatedSubscriptionId: updatedSubscription.id,
            updatedSubscriptionStatus: updatedSubscription.status,
            latestInvoiceId: finalSubscription.latest_invoice ? (typeof finalSubscription.latest_invoice === 'string' ? finalSubscription.latest_invoice : finalSubscription.latest_invoice.id) : null,
          }
        };
      },
    },
  ],
};
