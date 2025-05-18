import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Update testCaseHandlers to accept currency as a second argument
const testCaseHandlers: Record<string, (stripe: Stripe, currency?: string) => Promise<{ message: string }>> = {
  'core-1': async (stripe, currency = 'usd') => {
    // Successful Payment (pm_card_visa)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 1000,
      currency,
      payment_method: 'pm_card_visa',
      confirm: true,
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
    });
    return { message: `PaymentIntent succeeded: ${paymentIntent.id}` };
  },
  'core-2': async (stripe, currency = 'usd') => {
    // Declined Card (pm_card_visa_chargeDeclined)
    try {
      await stripe.paymentIntents.create({
        amount: 1000,
        currency,
        payment_method: 'pm_card_visa_chargeDeclined',
        confirm: true,
        automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
      });
      return { message: 'Unexpected: Payment succeeded with declined card.' };
    } catch (err: unknown) {
      // Try to extract payment_intent id if available
      let piId: string | undefined;
      let errMsg = 'Unknown error';
      if (typeof err === 'object' && err !== null) {
        const e = err as { message?: string; raw?: { payment_intent?: { id?: string } } };
        piId = e.raw?.payment_intent?.id;
        errMsg = e.message || errMsg;
      }
      if (piId) {
        return { message: `Expected decline: ${errMsg} (payment_intent: ${piId})` };
      }
      return { message: `Expected decline: ${errMsg}` };
    }
  },
  'connect-1': async (stripe) => {
    // Create Connected Account (test)
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      email: `test+${Date.now()}@example.com`,
    });
    return { message: `Connected account created: ${account.id}` };
  },
  'billing-1': async (stripe) => {
    // Subscription Payment Failure (simulate with pm_card_visa_chargeDeclined)
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
};

export async function POST(req: NextRequest) {
  try {
    const { stripeKey, testCaseId, currency } = await req.json();
    console.log('[API] Received POST /run-test', { testCaseId, hasStripeKey: !!stripeKey, currency });
    if (!stripeKey || !testCaseId) {
      console.error('[API] Missing required fields', { stripeKey, testCaseId });
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }
    // Use the latest Stripe API version for this SDK
    const stripe = new Stripe(stripeKey, { apiVersion: '2025-04-30.basil' });
    const handler = testCaseHandlers[testCaseId];
    if (!handler) {
      console.error('[API] Unknown test case', { testCaseId });
      return NextResponse.json({ error: 'Unknown test case.' }, { status: 400 });
    }
    let result;
    try {
      result = await handler(stripe, currency);
    } catch (handlerError) {
      console.error('[API] Error in test case handler', { testCaseId, handlerError });
      throw handlerError;
    }
    console.log('[API] Test case result', { testCaseId, result });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[API] Internal server error', error);
    return NextResponse.json({ error: (error as Error).message || 'Internal server error.' }, { status: 500 });
  }
}
