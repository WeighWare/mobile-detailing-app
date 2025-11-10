/**
 * Create Payment Intent API Endpoint
 *
 * Vercel Serverless Function to create Stripe Payment Intents
 * This keeps the Stripe secret key secure on the backend.
 *
 * Endpoint: POST /api/create-payment-intent
 *
 * Request Body:
 * {
 *   amount: number,           // Amount in dollars (e.g., 149.99)
 *   appointmentId: string,    // Associated appointment ID
 *   customerEmail: string,    // Customer email
 *   customerId?: string,      // Optional customer ID for Supabase
 *   metadata?: object         // Additional metadata
 * }
 *
 * Response:
 * {
 *   clientSecret: string,     // For Stripe Elements
 *   paymentIntentId: string   // For tracking
 * }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Validate required environment variables
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!stripeSecretKey || !supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    'Missing required environment variables for create-payment-intent API. ' +
    'Required: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY'
  );
}

// Initialize Stripe with secret key (backend only!)
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-11-20.acacia',
});

// Initialize Supabase admin client (for updating database)
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      amount,
      appointmentId,
      customerEmail,
      customerId,
      metadata = {},
    } = req.body;

    // Validate required fields
    if (!amount || !appointmentId || !customerEmail) {
      return res.status(400).json({
        error: 'Missing required fields: amount, appointmentId, customerEmail',
      });
    }

    // Convert amount to cents (Stripe uses smallest currency unit)
    const amountInCents = Math.round(amount * 100);

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      receipt_email: customerEmail,
      metadata: {
        appointmentId,
        customerId: customerId || '',
        ...metadata,
      },
      description: `Mobile Detailing Appointment #${appointmentId.slice(0, 8)}`,
    });

    // Update appointment in Supabase with payment intent ID
    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        payment_intent_id: paymentIntent.id,
        payment_status: 'pending',
      })
      .eq('id', appointmentId);

    if (updateError) {
      console.error('Error updating appointment with payment intent:', updateError);

      // CRITICAL: Cancel the payment intent to prevent orphaned charges
      // This ensures we don't have a payment intent in Stripe without a corresponding appointment record
      try {
        await stripe.paymentIntents.cancel(paymentIntent.id);
        console.log(`Cancelled payment intent ${paymentIntent.id} due to database update failure`);

        return res.status(500).json({
          error: 'Failed to link payment to appointment. Payment has been cancelled.',
          details: updateError.message,
        });
      } catch (cancelError) {
        console.error('CRITICAL: Failed to cancel orphaned payment intent:', cancelError);
        // Log this for manual review - we have an orphaned payment intent
        console.error(`MANUAL REVIEW REQUIRED: Payment Intent ${paymentIntent.id} for appointment ${appointmentId}`);

        return res.status(500).json({
          error: 'Payment created but failed to link to appointment. Please contact support.',
          paymentIntentId: paymentIntent.id,
        });
      }
    }

    // Return client secret for frontend
    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);

    if (error instanceof Stripe.errors.StripeError) {
      return res.status(400).json({
        error: error.message,
        type: error.type,
      });
    }

    return res.status(500).json({
      error: 'An unexpected error occurred while processing payment',
    });
  }
}
