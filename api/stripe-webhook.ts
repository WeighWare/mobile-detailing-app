/**
 * Stripe Webhook Handler
 *
 * Vercel Serverless Function to handle Stripe webhook events
 * Listens for payment events and updates the database accordingly
 *
 * Endpoint: POST /api/stripe-webhook
 *
 * Important:
 * - Webhook signature verification is CRITICAL for security
 * - Configure this URL in Stripe Dashboard: https://dashboard.stripe.com/webhooks
 * - Set STRIPE_WEBHOOK_SECRET environment variable
 *
 * Events Handled:
 * - payment_intent.succeeded: Mark payment as paid
 * - payment_intent.payment_failed: Mark payment as failed
 * - charge.refunded: Process refund
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { buffer } from 'micro';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

// Initialize Supabase admin client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Disable body parsing, need raw body for webhook signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;

  // Verify webhook signature
  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).json({
      error: `Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
    });
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'charge.refunded':
        await handleRefund(event.data.object as Stripe.Charge);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({
      error: 'Webhook handler failed',
    });
  }
}

/**
 * Handle successful payment
 */
async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  console.log('✅ Payment succeeded:', paymentIntent.id);

  const appointmentId = paymentIntent.metadata.appointmentId;

  if (!appointmentId) {
    console.error('No appointment ID in payment intent metadata');
    return;
  }

  // Update appointment payment status
  const { error } = await supabase
    .from('appointments')
    .update({
      payment_status: 'paid',
      payment_intent_id: paymentIntent.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', appointmentId);

  if (error) {
    console.error('Error updating appointment:', error);
    throw error;
  }

  // TODO: Send confirmation email/SMS
  // TODO: Update loyalty points
  console.log(`Updated appointment ${appointmentId} - payment confirmed`);
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log('❌ Payment failed:', paymentIntent.id);

  const appointmentId = paymentIntent.metadata.appointmentId;

  if (!appointmentId) {
    console.error('No appointment ID in payment intent metadata');
    return;
  }

  // Update appointment payment status
  const { error } = await supabase
    .from('appointments')
    .update({
      payment_status: 'failed',
      payment_intent_id: paymentIntent.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', appointmentId);

  if (error) {
    console.error('Error updating appointment:', error);
    throw error;
  }

  // TODO: Send payment failed notification
  console.log(`Updated appointment ${appointmentId} - payment failed`);
}

/**
 * Handle refund
 */
async function handleRefund(charge: Stripe.Charge) {
  console.log('💸 Refund processed:', charge.id);

  const paymentIntentId = charge.payment_intent as string;

  if (!paymentIntentId) {
    console.error('No payment intent ID in charge');
    return;
  }

  // Update appointment payment status
  const { error } = await supabase
    .from('appointments')
    .update({
      payment_status: 'refunded',
      updated_at: new Date().toISOString(),
    })
    .eq('payment_intent_id', paymentIntentId);

  if (error) {
    console.error('Error updating appointment:', error);
    throw error;
  }

  // TODO: Send refund confirmation email
  console.log(`Refund processed for payment intent ${paymentIntentId}`);
}
