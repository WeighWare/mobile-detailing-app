# Billing System Setup Guide

## Overview

The mobile detailing app now features **real Stripe payment integration** for processing customer payments. This replaces the previous mock payment service with production-ready payment processing.

## What Was Fixed

### Previous Issues
- ❌ Payment system used **mock/demo implementation**
- ❌ No actual Stripe integration on frontend
- ❌ PaymentService.ts had commented-out real code
- ❌ Backend API endpoints existed but were never called
- ❌ Error: "Billing System Error" (non-existent error message)

### Current Solution
- ✅ **Real Stripe Elements integration** with secure payment forms
- ✅ **Payment intent creation** via backend API
- ✅ **Webhook support** for payment confirmations
- ✅ **PCI-compliant** payment collection (Stripe handles card data)
- ✅ **Payment checkout dialog** with proper UX
- ✅ **Error handling** with user-friendly messages

## Architecture

### Frontend Components

1. **`useStripePayment` Hook** (`src/hooks/useStripePayment.ts`)
   - Creates payment intents by calling `/api/create-payment-intent`
   - Confirms payments using Stripe Elements
   - Handles loading states and errors

2. **`PaymentCheckout` Component** (`src/components/PaymentCheckout.tsx`)
   - Modal dialog for payment collection
   - Integrates Stripe Elements (PaymentElement)
   - Shows payment summary, security notice, and processing states
   - Handles success/error flows with visual feedback

3. **`CustomerAppointmentCard` Component** (updated)
   - "Pay Now" button triggers payment dialog
   - Updates appointment status on payment success
   - Shows payment status badge

### Backend API Endpoints

1. **`/api/create-payment-intent`**
   - Creates Stripe PaymentIntent
   - Links payment to appointment in database
   - Cancels payment if database update fails (prevents orphaned charges)

2. **`/api/stripe-webhook`**
   - Handles Stripe webhook events
   - Updates payment status: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`
   - Verifies webhook signatures for security

## Setup Instructions

### 1. Get Stripe API Keys

1. Sign up for a Stripe account at https://stripe.com
2. Get your API keys from https://dashboard.stripe.com/apikeys
3. For testing, use **test mode** keys (they start with `pk_test_` and `sk_test_`)
4. For production, use **live mode** keys (start with `pk_live_` and `sk_live_`)

### 2. Configure Environment Variables

Add these variables to your `.env.local` file:

```bash
# Frontend - Stripe publishable key (safe to expose)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE

# Backend - Stripe secret key (NEVER expose to frontend!)
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE

# Backend - Webhook secret (get this after setting up webhooks)
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
```

### 3. Set Up Stripe Webhooks

1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Enter your webhook URL:
   - **Local development**: Use Stripe CLI (see below)
   - **Production**: `https://your-domain.vercel.app/api/stripe-webhook`
4. Select these events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
5. Copy the webhook signing secret and add it to your environment variables as `STRIPE_WEBHOOK_SECRET`

### 4. Local Development with Stripe CLI

For testing webhooks locally:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe  # macOS
# Or download from https://stripe.com/docs/stripe-cli

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/stripe-webhook

# This will output your webhook signing secret - add it to .env.local
```

### 5. Install Required Dependencies

The following packages are already installed:

```bash
npm install @stripe/stripe-js  # Stripe.js for frontend
npm install stripe             # Stripe Node.js SDK for backend
```

### 6. Deploy to Vercel

Add environment variables in Vercel:

1. Go to your project settings: https://vercel.com/[your-project]/settings/environment-variables
2. Add all three Stripe environment variables:
   - `VITE_STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
3. Redeploy your application

## Testing Payments

### Test Card Numbers

Use these test card numbers in **test mode**:

| Card Number | Description |
|-------------|-------------|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 9995` | Declined (insufficient funds) |
| `4000 0000 0000 0002` | Declined (card declined) |
| `4000 0025 0000 3155` | Requires authentication (3D Secure) |

- Use any future expiration date (e.g., `12/34`)
- Use any 3-digit CVC (e.g., `123`)
- Use any ZIP code (e.g., `12345`)

### Testing Workflow

1. **Customer View**: Switch to customer mode
2. **Create Appointment**: Book a new appointment
3. **Click "Pay Now"**: Payment dialog opens
4. **Enter Test Card**: Use `4242 4242 4242 4242`
5. **Submit Payment**: Payment processes
6. **Verify Success**: Payment status updates to "paid"
7. **Check Stripe Dashboard**: See the payment in https://dashboard.stripe.com/test/payments

### Testing Webhooks

After a successful payment:

1. Check Vercel logs or terminal for webhook received messages
2. Verify appointment `payment_status` updated to `'paid'` in database
3. In Stripe Dashboard, check the webhook event logs

## Payment Flow

### Customer Payment Flow

```
1. Customer clicks "Pay Now" button on appointment card
   ↓
2. PaymentCheckout dialog opens
   ↓
3. Frontend calls /api/create-payment-intent
   ↓
4. Backend creates Stripe PaymentIntent and updates appointment
   ↓
5. Frontend receives clientSecret, initializes Stripe Elements
   ↓
6. Customer enters card details in PaymentElement
   ↓
7. Customer clicks "Pay $XX.XX" button
   ↓
8. Stripe.js confirms payment (handles 3D Secure if needed)
   ↓
9. Payment succeeds → appointment status updates to "paid"
   ↓
10. Stripe sends webhook to /api/stripe-webhook
   ↓
11. Backend confirms payment status in database
```

### Error Handling

The system handles these error scenarios:

- **Stripe not configured**: Shows warning to add API keys
- **Payment intent creation fails**: Shows error, allows retry
- **Card declined**: Shows Stripe error message, allows retry
- **Network error**: Shows error, allows retry
- **Webhook failure**: Payment still succeeds, manual review may be needed

## Security Features

✅ **PCI Compliance**: Stripe Elements handles card data (never touches your server)
✅ **Webhook Verification**: All webhooks verify Stripe signatures
✅ **Payment Intent Cancellation**: Orphaned payments cancelled if database update fails
✅ **Environment Variables**: Secrets never exposed to frontend
✅ **HTTPS Only**: All Stripe API calls use HTTPS
✅ **Audit Trail**: All payments logged in Stripe Dashboard

## Troubleshooting

### Payment Dialog Shows "Payment system not configured"

**Problem**: `VITE_STRIPE_PUBLISHABLE_KEY` environment variable not set

**Solution**:
1. Add `VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...` to `.env.local`
2. Restart development server: `npm run dev`

### "Failed to create payment intent" Error

**Problem**: Backend API error (missing `STRIPE_SECRET_KEY` or network issue)

**Solution**:
1. Check `.env.local` has `STRIPE_SECRET_KEY=sk_test_...`
2. Check Vercel environment variables (for production)
3. Check browser console and Vercel logs for detailed error

### Webhooks Not Received

**Problem**: Webhook secret mismatch or endpoint not reachable

**Solution**:
1. Verify `STRIPE_WEBHOOK_SECRET` matches your Stripe Dashboard
2. For local development, use Stripe CLI: `stripe listen --forward-to localhost:3000/api/stripe-webhook`
3. For production, verify webhook endpoint URL is correct

### Payment Succeeds But Status Not Updated

**Problem**: Webhook not processing correctly

**Solution**:
1. Check Stripe Dashboard webhook logs for errors
2. Check Vercel function logs for `/api/stripe-webhook` errors
3. Manually update payment status in database if needed

## API Version

The integration uses **Stripe API version `2024-04-10`** (latest stable).

If Stripe releases a new API version, update in:
- `api/create-payment-intent.ts` (line 39)
- `api/stripe-webhook.ts` (line 40)

## Production Checklist

Before going live with real payments:

- [ ] Replace test API keys with live keys
- [ ] Set up live webhook endpoint in Stripe Dashboard
- [ ] Update `VITE_STRIPE_PUBLISHABLE_KEY` to live key (starts with `pk_live_`)
- [ ] Update `STRIPE_SECRET_KEY` to live key (starts with `sk_live_`)
- [ ] Update `STRIPE_WEBHOOK_SECRET` to live webhook secret
- [ ] Test payment flow with real card (small amount)
- [ ] Verify webhooks are being received and processed
- [ ] Set up Stripe email notifications
- [ ] Review Stripe fraud settings
- [ ] Enable 3D Secure authentication
- [ ] Set up business bank account in Stripe for payouts

## Support

For issues with:
- **Stripe integration**: Check https://stripe.com/docs/payments/quickstart
- **Stripe.js errors**: See https://stripe.com/docs/js/errors
- **Webhook events**: See https://stripe.com/docs/webhooks
- **Test cards**: See https://stripe.com/docs/testing

## Next Steps

Future enhancements to consider:

1. **Invoice Generation**: Automatically create PDF invoices after payment
2. **Refund Processing**: Allow owners to process refunds from dashboard
3. **Saved Payment Methods**: Let customers save cards for future use
4. **Subscription Billing**: For membership or recurring service plans
5. **Payment Analytics**: Track revenue metrics and trends
6. **Multi-currency**: Support international customers
7. **Dispute Management**: Handle chargebacks through the dashboard
