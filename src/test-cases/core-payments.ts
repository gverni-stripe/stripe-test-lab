import Stripe from 'stripe';
import { TestCaseGroup } from './types';

export const corePayments: TestCaseGroup = {
  label: 'Core Payments',
  testCases: [
    {
      id: 'core-1',
      name: 'Successful Payment',
      description: 'Simulate a successful card payment.',
      category: 'Card Payments',
      docsUrl: 'https://docs.stripe.com/testing#cards',
      handler: async (stripe: Stripe, { currency }) => {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: 1000,
          currency,
          payment_method: 'pm_card_visa',
          confirm: true,
          automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
        });
        return { message: `PaymentIntent succeeded: ${paymentIntent.id}` };
      },
    },
    {
      id: 'core-2',
      name: 'Declined Card',
      description: 'Simulate a declined card payment.',
      category: 'Card Payments',
      docsUrl: 'https://docs.stripe.com/testing#declined-payments',
      handler: async (stripe: Stripe, { currency }) => {
        try {
          await stripe.paymentIntents.create({
            amount: 1000,
            currency,
            payment_method: 'pm_card_visa_chargeDeclined',
            confirm: true,
            automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
          });
          return { message: 'Unexpected: Payment succeeded with declined card.' };
        } catch (err) {
          const piId = (err as any)?.raw?.payment_intent?.id;
          if (piId) {
            return { message: `Expected decline: ${(err as Error).message} (payment_intent: ${piId})` };
          }
          return { message: `Expected decline: ${(err as Error).message}` };
        }
      },
    },
  ],
};
