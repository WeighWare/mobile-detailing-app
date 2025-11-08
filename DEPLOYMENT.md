# Production Deployment Guide

This guide covers deploying the Mobile Detailing Scheduling App to production with all required backend integrations.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Database Setup (Supabase)](#database-setup-supabase)
3. [Authentication Setup](#authentication-setup)
4. [Payment Integration (Stripe)](#payment-integration-stripe)
5. [Notification Services](#notification-services)
6. [Vercel Deployment](#vercel-deployment)
7. [Post-Deployment](#post-deployment)
8. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Prerequisites

Before deploying, ensure you have:
- [ ] GitHub repository with code pushed
- [ ] Vercel account (free tier works)
- [ ] Supabase account (free tier works)
- [ ] Stripe account (start with test mode)
- [ ] Twilio account (for SMS notifications)
- [ ] Email service account (SendGrid, Mailgun, or SMTP)
- [ ] Domain name (optional, Vercel provides free subdomain)

---

## Database Setup (Supabase)

### 1. Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose organization, name your project, set database password
4. Wait for project to be provisioned (~2 minutes)

### 2. Create Database Tables

Run this SQL in Supabase SQL Editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Customers table
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  loyalty_points INTEGER DEFAULT 0,
  notification_preferences JSONB DEFAULT '{"sms": true, "email": true}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Services table
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  category TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Appointments table
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id),
  appointment_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  location TEXT,
  vehicle_info JSONB,
  notes TEXT,
  total_price DECIMAL(10,2),
  payment_status TEXT CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
  payment_intent_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('sms', 'email')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed')),
  message TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_appointments_customer ON appointments(customer_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_notifications_appointment ON notifications(appointment_id);
CREATE INDEX idx_customers_email ON customers(email);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 3. Set Up Row Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Customers can only see their own data
CREATE POLICY "Customers can view own data" ON customers
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Customers can update own data" ON customers
  FOR UPDATE USING (auth.uid() = id);

-- Appointments policies
CREATE POLICY "Customers can view own appointments" ON appointments
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Customers can create appointments" ON appointments
  FOR INSERT WITH CHECK (customer_id = auth.uid());

-- Services are public (readable by all)
CREATE POLICY "Services are viewable by all" ON services
  FOR SELECT USING (active = true);

-- Admin policies (you'll need to set up admin role)
-- For now, allow all operations for authenticated users
-- TODO: Implement proper role-based access control
```

### 4. Insert Sample Services

```sql
INSERT INTO services (name, description, price, duration_minutes, category) VALUES
  ('Basic Wash', 'Exterior wash and interior vacuum', 49.99, 30, 'basic'),
  ('Premium Detail', 'Complete exterior detail, interior deep clean, wax', 149.99, 120, 'premium'),
  ('Ultimate Package', 'Full detail, ceramic coating, engine bay cleaning', 299.99, 240, 'ultimate'),
  ('Interior Only', 'Deep interior cleaning and conditioning', 89.99, 90, 'interior'),
  ('Exterior Only', 'Exterior wash, clay bar, wax, tire shine', 99.99, 90, 'exterior');
```

### 5. Get Supabase Credentials

1. Go to Project Settings > API
2. Copy your **Project URL** (VITE_SUPABASE_URL)
3. Copy your **anon/public key** (VITE_SUPABASE_ANON_KEY)
4. Save these for later configuration

---

## Authentication Setup

### Option 1: Supabase Auth (Recommended)

1. Go to Authentication > Providers in Supabase
2. Enable Email provider
3. Configure email templates for:
   - Confirmation email
   - Password reset
   - Magic link (optional)

4. Install Supabase client:
```bash
npm install @supabase/supabase-js
```

5. Create auth context in your app:
```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### Option 2: Auth0

1. Create Auth0 account and application
2. Configure callback URLs
3. Install Auth0 SDK:
```bash
npm install @auth0/auth0-react
```

---

## Payment Integration (Stripe)

### 1. Set Up Stripe Account

1. Create account at [https://stripe.com](https://stripe.com)
2. Complete business verification
3. Enable payment methods (cards, Apple Pay, Google Pay)

### 2. Get API Keys

1. Go to Developers > API Keys
2. Copy **Publishable key** (starts with `pk_live_` for production)
3. Copy **Secret key** (starts with `sk_live_` for production)
   - **IMPORTANT**: Never expose secret key in frontend code!

### 3. Create Webhook Endpoint

You'll need a backend API endpoint to handle Stripe webhooks. Options:

**Option A: Vercel Serverless Functions**

Create `/api/stripe-webhook.ts`:
```typescript
import { stripe } from '@/lib/stripe';
import { supabase } from '@/lib/supabase';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      // Update appointment payment status in database
      await supabase
        .from('appointments')
        .update({ payment_status: 'paid', payment_intent_id: paymentIntent.id })
        .eq('payment_intent_id', paymentIntent.id);
      break;

    case 'payment_intent.payment_failed':
      // Handle failed payment
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
}
```

**Option B: Supabase Edge Functions**

Create edge function for webhook handling.

### 4. Configure Webhook in Stripe

1. Go to Developers > Webhooks
2. Add endpoint: `https://your-app.vercel.app/api/stripe-webhook`
3. Select events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
4. Copy webhook signing secret

---

## Notification Services

### Twilio Setup (SMS)

1. Create account at [https://twilio.com](https://twilio.com)
2. Get a phone number
3. Get credentials from Console:
   - Account SID
   - Auth Token
   - Phone Number

4. Create API endpoint `/api/send-sms.ts`:
```typescript
import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export default async function handler(req, res) {
  const { to, message } = req.body;

  try {
    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to,
    });

    res.status(200).json({ success: true, sid: result.sid });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

### Email Setup (SendGrid)

1. Create account at [https://sendgrid.com](https://sendgrid.com)
2. Verify sender identity
3. Create API key
4. Install SDK:
```bash
npm install @sendgrid/mail
```

5. Create API endpoint `/api/send-email.ts`:
```typescript
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export default async function handler(req, res) {
  const { to, subject, html } = req.body;

  try {
    await sgMail.send({
      to,
      from: process.env.SENDGRID_VERIFIED_SENDER,
      subject,
      html,
    });

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

---

## Vercel Deployment

### 1. Connect GitHub Repository

1. Go to [https://vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Vercel will auto-detect Vite configuration

### 2. Configure Environment Variables

In Vercel project settings, add these environment variables:

**Frontend (VITE_ prefix)**
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_APP_NAME=Mobile Detailing Pro
```

**Backend (for API routes)**
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890
SENDGRID_API_KEY=SG.xxx
SENDGRID_VERIFIED_SENDER=noreply@yourdomain.com
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Deploy

1. Click "Deploy"
2. Wait for build to complete (~2 minutes)
3. Get your production URL: `https://your-app.vercel.app`

### 4. Configure Custom Domain (Optional)

1. Go to Project Settings > Domains
2. Add your custom domain
3. Update DNS records as instructed
4. Wait for SSL certificate provisioning

---

## Post-Deployment

### 1. Update Stripe Webhook URL

Update your Stripe webhook endpoint to production URL:
```
https://your-app.vercel.app/api/stripe-webhook
```

### 2. Update Supabase Auth Redirect URLs

1. Go to Supabase Authentication > URL Configuration
2. Add production URL to allowed redirect URLs
3. Update site URL to production domain

### 3. Test Complete User Flows

- [ ] Customer can sign up and log in
- [ ] Customer can book an appointment
- [ ] Payment processing works end-to-end
- [ ] Confirmation emails/SMS are sent
- [ ] Owner can view dashboard and appointments
- [ ] Analytics display correctly

### 4. Set Up Production Services

Replace all localStorage usage with Supabase:
```typescript
// Before (localStorage)
localStorage.setItem('appointments', JSON.stringify(appointments));

// After (Supabase)
const { data, error } = await supabase
  .from('appointments')
  .insert(newAppointment);
```

---

## Monitoring & Maintenance

### Error Tracking (Sentry)

1. Create account at [https://sentry.io](https://sentry.io)
2. Install SDK:
```bash
npm install @sentry/react
```

3. Initialize in app:
```typescript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "your_sentry_dsn",
  environment: "production",
  tracesSampleRate: 1.0,
});
```

### Analytics (Vercel Analytics)

1. Install Vercel Analytics:
```bash
npm install @vercel/analytics
```

2. Add to app:
```typescript
import { Analytics } from '@vercel/analytics/react';

function App() {
  return (
    <>
      <YourApp />
      <Analytics />
    </>
  );
}
```

### Uptime Monitoring

Use services like:
- Vercel monitoring (built-in)
- UptimeRobot (free tier available)
- Pingdom

### Database Backups

Supabase automatically backs up your database. Configure:
1. Go to Database > Backups
2. Enable Point-in-Time Recovery (paid feature)
3. Download manual backups weekly

---

## Troubleshooting

### Common Issues

**Build fails on Vercel**
- Check Node.js version matches `.nvmrc`
- Verify all dependencies are in `package.json`
- Check build logs for TypeScript errors

**Stripe webhooks not working**
- Verify webhook URL is correct
- Check webhook signing secret matches
- Ensure endpoint returns 200 status
- View webhook logs in Stripe dashboard

**Supabase connection fails**
- Verify environment variables are set correctly
- Check if IP is allowed (Supabase allows all by default)
- Confirm RLS policies allow the operation

**SMS/Email not sending**
- Verify API keys are correct
- Check account is not in sandbox mode
- Verify phone numbers are in correct format
- Review service provider logs

---

## Security Checklist

- [ ] All API keys stored as environment variables (never in code)
- [ ] Stripe secret key only used in backend/serverless functions
- [ ] Supabase RLS policies properly configured
- [ ] HTTPS enabled (Vercel provides this automatically)
- [ ] CORS configured correctly for API endpoints
- [ ] Input validation on all forms
- [ ] SQL injection prevention (use parameterized queries)
- [ ] XSS prevention (React escapes by default, but verify)
- [ ] Rate limiting on API endpoints
- [ ] User authentication required for sensitive operations

---

## Next Steps

1. **Load Testing**: Test with realistic user load
2. **Backup Strategy**: Set up automated backups
3. **Monitoring Alerts**: Configure alerts for errors/downtime
4. **Documentation**: Document internal processes
5. **Support System**: Set up customer support workflow
6. **Marketing**: Launch and promote your app!

---

## Support

For deployment issues:
- Vercel: [https://vercel.com/docs](https://vercel.com/docs)
- Supabase: [https://supabase.com/docs](https://supabase.com/docs)
- Stripe: [https://stripe.com/docs](https://stripe.com/docs)

For application issues:
- GitHub Issues: [https://github.com/WeighWare/mobile-detailing-app/issues](https://github.com/WeighWare/mobile-detailing-app/issues)
