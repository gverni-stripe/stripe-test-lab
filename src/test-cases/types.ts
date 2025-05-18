import Stripe from 'stripe';

export type TestCase = {
  id: string;
  name: string;
  description: string;
  category: string; // Subcategory
  docsUrl?: string;
  handler: (stripe: Stripe, params: { currency: string; [key: string]: any }) => Promise<{ message: string }>;
};

export type TestCaseGroup = {
  label: string; // Group label (e.g., "Core Payments")
  testCases: TestCase[];
};
