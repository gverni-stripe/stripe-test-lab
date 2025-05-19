import Stripe from 'stripe';
import { TestCaseGroup } from './types';

function randomAmount(min = 500, max = 5000) {
  // Stripe amounts are in the smallest currency unit (e.g., cents)
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createTestPaymentIntent(stripe: Stripe, params: { currency: string, description?: string }, payment_method: string, amount?: number) {
  return stripe.paymentIntents.create({
    amount: amount ?? randomAmount(),
    currency: params.currency,
    payment_method,
    confirm: true,
    automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
    description: params.description,
  });
}

export const corePayments: TestCaseGroup = {
  label: 'Core Payments',
  testCases: [
    // --- Successful card payments by brand ---
    {
      id: 'success-visa',
      name: 'Successful Visa Payment',
      description: 'Simulate a successful Visa card payment.',
      category: 'Card Payments',
      docsUrl: 'https://docs.stripe.com/testing#cards',
      handler: async (stripe: Stripe, params: { currency: string }) => {
        const paymentIntent = await createTestPaymentIntent(stripe, { ...params, description: 'Simulate a successful Visa card payment.' }, 'pm_card_visa');
        return { message: `Visa PaymentIntent succeeded: ${paymentIntent.id}` };
      },
    },
    {
      id: 'success-mastercard',
      name: 'Successful Mastercard Payment',
      description: 'Simulate a successful Mastercard payment.',
      category: 'Card Payments',
      docsUrl: 'https://docs.stripe.com/testing#cards',
      handler: async (stripe: Stripe, params: { currency: string }) => {
        const paymentIntent = await createTestPaymentIntent(stripe, { ...params, description: 'Simulate a successful Mastercard payment.' }, 'pm_card_mastercard');
        return { message: `Mastercard PaymentIntent succeeded: ${paymentIntent.id}` };
      },
    },
    {
      id: 'success-amex',
      name: 'Successful American Express Payment',
      description: 'Simulate a successful American Express payment.',
      category: 'Card Payments',
      docsUrl: 'https://docs.stripe.com/testing#cards',
      handler: async (stripe: Stripe, params: { currency: string }) => {
        const paymentIntent = await createTestPaymentIntent(stripe, { ...params, description: 'Simulate a successful American Express payment.' }, 'pm_card_amex');
        return { message: `Amex PaymentIntent succeeded: ${paymentIntent.id}` };
      },
    },
    // --- Successful payments by country ---
    {
      id: 'success-us',
      name: 'Successful US Payment',
      description: 'Simulate a successful payment from a US cardholder.',
      category: 'Cards by country',
      docsUrl: 'https://docs.stripe.com/testing#international-cards',
      handler: async (stripe: Stripe, params: { currency: string }) => {
        const paymentIntent = await createTestPaymentIntent(stripe, { ...params, description: 'Simulate a successful payment from a US cardholder.' }, 'pm_card_us');
        return { message: `US PaymentIntent succeeded: ${paymentIntent.id}` };
      },
    },
    {
      id: 'success-gb',
      name: 'Successful UK Payment',
      description: 'Simulate a successful payment from a UK cardholder.',
      category: 'Cards by country',
      docsUrl: 'https://docs.stripe.com/testing#international-cards',
      handler: async (stripe: Stripe, params: { currency: string }) => {
        const paymentIntent = await createTestPaymentIntent(stripe, { ...params, description: 'Simulate a successful payment from a UK cardholder.' }, 'pm_card_gb');
        return { message: `UK PaymentIntent succeeded: ${paymentIntent.id}` };
      },
    },
    {
      id: 'success-it',
      name: 'Successful Italy Payment',
      description: 'Simulate a successful payment from an Italian cardholder.',
      category: 'Cards by country',
      docsUrl: 'https://docs.stripe.com/testing#international-cards',
      handler: async (stripe: Stripe, params: { currency: string }) => {
        const paymentIntent = await createTestPaymentIntent(stripe, { ...params, description: 'Simulate a successful payment from an Italian cardholder.' }, 'pm_card_it');
        return { message: `Italy PaymentIntent succeeded: ${paymentIntent.id}` };
      },
    },
    // --- Declined payments (one for each decline reason) ---
    ...[
      { id: 'decline-generic', name: 'Declined: Generic', pm: 'pm_card_visa_chargeDeclined', reason: 'generic_decline' },
      { id: 'decline-insufficient-funds', name: 'Declined: Insufficient Funds', pm: 'pm_card_visa_chargeDeclinedInsufficientFunds', reason: 'insufficient_funds' },
      { id: 'decline-lost-card', name: 'Declined: Lost Card', pm: 'pm_card_visa_chargeDeclinedLostCard', reason: 'lost_card' },
      { id: 'decline-stolen-card', name: 'Declined: Stolen Card', pm: 'pm_card_visa_chargeDeclinedStolenCard', reason: 'stolen_card' },
      { id: 'decline-expired-card', name: 'Declined: Expired Card', pm: 'pm_card_chargeDeclinedExpiredCard', reason: 'expired_card' },
      { id: 'decline-incorrect-cvc', name: 'Declined: Incorrect CVC', pm: 'pm_card_chargeDeclinedIncorrectCvc', reason: 'incorrect_cvc' },
      { id: 'decline-processing-error', name: 'Declined: Processing Error', pm: 'pm_card_chargeDeclinedProcessingError', reason: 'processing_error' },
      { id: 'decline-velocity-limit', name: 'Declined: Velocity Limit', pm: 'pm_card_visa_chargeDeclinedVelocityLimitExceeded', reason: 'card_velocity_exceeded' },
    ].map(({ id, name, pm, reason }) => ({
      id,
      name,
      description: `Simulate a declined payment (${reason.replace('_', ' ')}).`,
      category: 'Declined Payments',
      docsUrl: 'https://docs.stripe.com/testing#declined-payments',
      handler: async (stripe: Stripe, params: { currency: string }) => {
        try {
          await createTestPaymentIntent(stripe, { ...params, description: `Simulate a declined payment (${reason.replace('_', ' ')}).` }, pm);
          return { message: `Unexpected: Payment succeeded with declined card (${reason})` };
        } catch (err) {
          let piId: string | undefined;
          let errMsg = 'Unknown error';
          if (typeof err === 'object' && err !== null) {
            const e = err as { message?: string; raw?: { payment_intent?: { id?: string } } };
            piId = e.raw?.payment_intent?.id;
            errMsg = e.message || errMsg;
          }
          if (piId) {
            return { message: `Expected decline (${reason}): ${errMsg} (payment_intent: ${piId})` };
          }
          return { message: `Expected decline (${reason}): ${errMsg}` };
        }
      },
    })),
    // --- 3D Secure authentication scenarios ---
    // 3D Secure test cannot really be simulated in the same way as other tests, 
    // as it requires a redirect to a 3D Secure page. Leaving this test for future implementation.
    // {
    //   id: '3ds-required',
    //   name: '3D Secure Required',
    //   description: 'Simulate a payment that requires 3D Secure authentication.',
    //   category: '3D Secure',
    //   docsUrl: 'https://docs.stripe.com/testing#regulatory-cards',
    //   handler: async (stripe: Stripe, params: { currency: string }) => {
    //     const paymentIntent = await createTestPaymentIntent(stripe, params, 'pm_card_threeDSecure2Required');
    //     return { message: `3DS Required PaymentIntent: ${paymentIntent.id}` };
    //   },
    // },
    // {
    //   id: '3ds-declined',
    //   name: '3D Secure Declined',
    //   description: 'Simulate a payment declined after 3D Secure authentication.',
    //   category: '3D Secure',
    //   docsUrl: 'https://docs.stripe.com/testing#regulatory-cards',
    //   handler: async (stripe: Stripe, params: { currency: string }) => {
    //     try {
    //       await createTestPaymentIntent(stripe, params, 'pm_card_threeDSecureRequiredChargeDeclined');
    //       return { message: 'Unexpected: Payment succeeded with 3DS declined card.' };
    //     } catch (err) {
    //       return { message: `Expected 3DS decline: ${(err as Error).message}` };
    //     }
    //   },
    // },
    // --- Refunds ---
    {
      id: 'refund-success',
      name: 'Successful Refund',
      description: 'Simulate a successful refund (pending then succeeded).',
      category: 'Refunds',
      docsUrl: 'https://docs.stripe.com/testing#refunds',
      handler: async (stripe: Stripe, params: { currency: string }) => {
        const paymentIntent = await createTestPaymentIntent(stripe, { ...params, description: 'Simulate a successful refund (pending then succeeded).' }, 'pm_card_pendingRefund', 1000);
        const refund = await stripe.refunds.create({ payment_intent: paymentIntent.id });
        return { message: `Refund created: ${refund.id} for PaymentIntent: ${paymentIntent.id}` };
      },
    },
    {
      id: 'refund-fail',
      name: 'Failed Refund',
      description: 'Simulate a refund that fails after being created.',
      category: 'Refunds',
      docsUrl: 'https://docs.stripe.com/testing#refunds',
      handler: async (stripe: Stripe, params: { currency: string }) => {
        const paymentIntent = await createTestPaymentIntent(stripe, { ...params, description: 'Simulate a refund that fails after being created.' }, 'pm_card_refundFail', 1000);
        const refund = await stripe.refunds.create({ payment_intent: paymentIntent.id });
        return { message: `Refund (expected to fail): ${refund.id} for PaymentIntent: ${paymentIntent.id}` };
      },
    },
    // --- Disputes ---
    {
      id: 'dispute-won',
      name: 'Dispute: Win',
      description: 'Simulate a dispute and respond with winning evidence.',
      category: 'Disputes',
      docsUrl: 'https://docs.stripe.com/testing#disputes',
      handler: async (stripe: Stripe, params: { currency: string }) => {
        const paymentIntent = await createTestPaymentIntent(stripe, { ...params, description: 'Simulate a dispute and respond with winning evidence.' }, 'pm_card_createDispute', 1000);
        // Find the dispute
        const charges = await stripe.charges.list({ payment_intent: paymentIntent.id });
        const charge = charges.data[0];
        // The dispute ID is available as charge['dispute'] (not typed in Stripe SDK)
        let disputeId: string | undefined = charge && typeof ((charge as unknown as { dispute?: string }).dispute) === 'string'
          ? ((charge as unknown as { dispute?: string }).dispute)
          : undefined;
        if (!disputeId && charge && charge.disputed) {
          // Fallback: list disputes for the charge
          const disputes = await stripe.disputes.list({ charge: charge.id });
          disputeId = disputes.data[0]?.id;
        }
        if (!disputeId) return { message: 'No dispute found.' };
        await stripe.disputes.update(disputeId, { evidence: { uncategorized_text: 'winning_evidence' } });
        return { message: `Dispute ${disputeId} responded with winning evidence.` };
      },
    },
    {
      id: 'dispute-lost',
      name: 'Dispute: Lose',
      description: 'Simulate a dispute and respond with losing evidence.',
      category: 'Disputes',
      docsUrl: 'https://docs.stripe.com/testing#disputes',
      handler: async (stripe: Stripe, params: { currency: string }) => {
        const paymentIntent = await createTestPaymentIntent(stripe, { ...params, description: 'Simulate a dispute and respond with losing evidence.' }, 'pm_card_createDispute', 1000);
        // Find the dispute
        const charges = await stripe.charges.list({ payment_intent: paymentIntent.id });
        const charge = charges.data[0];
        let disputeId: string | undefined = (charge && 'dispute' in charge) ? (charge as unknown as { dispute?: string }).dispute : undefined;
        if (!disputeId && charge && charge.disputed) {
          const disputes = await stripe.disputes.list({ charge: charge.id });
          disputeId = disputes.data[0]?.id;
        }
        if (!disputeId) return { message: 'No dispute found.' };
        await stripe.disputes.update(disputeId, { evidence: { uncategorized_text: 'losing_evidence' } });
        return { message: `Dispute ${disputeId} responded with losing evidence.` };
      },
    },
    {
      id: 'dispute-no-response',
      name: 'Dispute: No Response',
      description: 'Simulate a dispute and do not respond (dispute not responded).',
      category: 'Disputes',
      docsUrl: 'https://docs.stripe.com/testing#disputes',
      handler: async (stripe: Stripe, params: { currency: string }) => {
        const paymentIntent = await createTestPaymentIntent(stripe, { ...params, description: 'Simulate a dispute and do not respond (dispute not responded).' }, 'pm_card_createDispute', 1000);
        // No response to dispute
        return { message: `Dispute created for PaymentIntent: ${paymentIntent.id} (no response sent)` };
      },
    },
    // --- Available balance (bypass) ---
    {
      id: 'bypass-pending-us',
      name: 'Bypass Pending Balance (US)',
      description: 'Simulate a US payment that goes directly to available balance.',
      category: 'Available Balance',
      docsUrl: 'https://docs.stripe.com/testing#available-balance',
      handler: async (stripe: Stripe, params: { currency: string }) => {
        const paymentIntent = await createTestPaymentIntent(stripe, { ...params, description: 'Simulate a US payment that goes directly to available balance.' }, 'pm_card_bypassPending');
        return { message: `Bypass Pending (US) PaymentIntent: ${paymentIntent.id}` };
      },
    },
    {
      id: 'bypass-pending-intl',
      name: 'Bypass Pending Balance (International)',
      description: 'Simulate an international payment that goes directly to available balance.',
      category: 'Available Balance',
      docsUrl: 'https://docs.stripe.com/testing#available-balance',
      handler: async (stripe: Stripe, params: { currency: string }) => {
        const paymentIntent = await createTestPaymentIntent(stripe, { ...params, description: 'Simulate an international payment that goes directly to available balance.' }, 'pm_card_bypassPendingInternational');
        return { message: `Bypass Pending (Intl) PaymentIntent: ${paymentIntent.id}` };
      },
    },
  ].flat(),
};
