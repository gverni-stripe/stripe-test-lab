import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { allTestCaseGroups } from '../../../test-cases';
import type { TestCase } from '../../../test-cases/types';

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
    const handler = getTestCaseHandler(testCaseId);
    if (!handler) {
      console.error('[API] Unknown test case', { testCaseId });
      return NextResponse.json({ error: 'Unknown test case.' }, { status: 400 });
    }
    let result;
    try {
      result = await handler(stripe, { currency });
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

// Remove testCaseHandlers and instead build a dynamic lookup
function getTestCaseHandler(testCaseId: string): TestCase['handler'] | undefined {
  for (const group of allTestCaseGroups) {
    const found = group.testCases.find((tc: TestCase) => tc.id === testCaseId);
    if (found) return found.handler;
  }
  return undefined;
}
