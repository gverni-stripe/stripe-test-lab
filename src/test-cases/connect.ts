import Stripe from 'stripe';
import { TestCaseGroup } from './types';

export const connect: TestCaseGroup = {
  label: 'Connect',
  testCases: [
    {
      id: 'connect-1',
      name: 'Create Connected Account',
      description: 'Test account creation flow.',
      category: 'Account Creation',
      docsUrl: 'https://docs.stripe.com/connect/testing',
      handler: async (stripe: Stripe) => {
        const account = await stripe.accounts.create({
          type: 'express',
          country: 'US',
          email: `test+${Date.now()}@example.com`,
        });
        return { message: `Connected account created: ${account.id}` };
      },
    },
  ],
};
