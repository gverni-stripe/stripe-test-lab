import Stripe from 'stripe';
import { TestCaseGroup } from './types';

export const billing: TestCaseGroup = {
  label: 'Billing',
  testCases: [
    {
      id: 'billing-1',
      name: 'Subscription Payment Failure',
      description: 'Simulate a failed subscription payment.',
      category: 'Subscription Payment',
      docsUrl: 'https://docs.stripe.com/billing/testing#payment-failures',
      handler: async (stripe: Stripe) => {
        const customer = await stripe.customers.create();
        try {
          await stripe.subscriptions.create({
            customer: customer.id,
            items: [{ price_data: { currency: 'usd', product: (await stripe.products.create({ name: 'Test' })).id, unit_amount: 1000, recurring: { interval: 'month' } } }],
            default_payment_method: 'pm_card_visa_chargeDeclined',
            expand: ['latest_invoice.payment_intent'],
          });
          return { message: 'Unexpected: Subscription succeeded with declined card.' };
        } catch (err) {
          return { message: `Expected subscription failure: ${(err as Error).message}` };
        }
      },
    },
  ],
};
