# Stripe Test Lab

Stripe Test Lab is a full stack app for running and validating Stripe test scenarios, built with Next.js (App Router), TypeScript, Tailwind CSS, and ESLint. It helps developers and QA teams test their Stripe integrations using real-world scenarios for Core Payments, Connect, and Billing.

This app is available at [https://stripe-test-lab.vercel.app/](https://stripe-test-lab.vercel.app/)

## Features

- Securely input your Stripe secret key(s)
- Categorized, searchable list of Stripe test cases (Core Payments, Connect, Billing)
- Run individual or multiple test cases with checkboxes and action buttons
- Real-time log output for test execution progress
- Modern, accessible UI with glowing effects
- No sensitive data is stored beyond the session
- Extensible architecture for adding new test cases

## Getting Started

First, install dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to use the app.

## Stripe Test Case Sources

- [Core Payments](https://docs.stripe.com/testing)
- [Connect](https://docs.stripe.com/connect/testing)
- [Billing](https://docs.stripe.com/billing/testing)


## Extending Test Cases (Adding New Groups or Scenarios)

Test cases are organized for easy extensibility:

- **Each group** (e.g., Core Payments, Connect, Billing) is defined in its own file in `src/test-cases/` (e.g., `core-payments.ts`).
- **Each group file** exports an object with a `label` (group name) and a `testCases` array. Each test case includes metadata and a `handler` function for custom logic.
- **All groups are imported in `src/test-cases/index.ts`**. To add or remove a group, simply update this index file.
- **To add a new test case group:**
  1. Create a new file in `src/test-cases/` (e.g., `issuing.ts`).
  2. Export a group object with a `label` and `testCases` array.
  3. Import and add it to the `allTestCaseGroups` array in `index.ts`.
- **To add a new test case to a group:**
  1. Edit the relevant group file and add a new object to its `testCases` array.
  2. Each test case must have an `id`, `name`, `description`, `category` (subcategory), and a `handler` function.

**Example group file:**
```ts
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
        // ...Stripe logic here...
        return { message: '...' };
      },
    },
    // Add more test cases here
  ],
};
```

**Example index file:**
```ts
import { corePayments } from './core-payments';
import { connect } from './connect';
import { billing } from './billing';

export const allTestCaseGroups = [
  corePayments,
  connect,
  billing,
];
```

This pattern makes it easy to add, remove, or update test cases and groups without changing the main app logic.

