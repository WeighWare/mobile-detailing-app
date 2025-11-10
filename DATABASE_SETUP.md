# Database Setup Guide

This guide will help you set up your Supabase PostgreSQL database for the Mobile Detailing Scheduling Application.

## Table of Contents
1. [Create Supabase Project](#create-supabase-project)
2. [Run Database Schema SQL](#run-database-schema-sql)
3. [Set Up Row Level Security](#set-up-row-level-security)
4. [Seed Initial Data](#seed-initial-data)
5. [Get API Credentials](#get-api-credentials)
6. [Test Database Connection](#test-database-connection)

---

## Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in
2. Click **"New Project"**
3. Fill in the details:
   - **Organization**: Choose or create an organization
   - **Name**: `mobile-detailing-app` (or your preferred name)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier is fine for development
4. Click **"Create new project"**
5. Wait 2-3 minutes for provisioning

---

## Run Database Schema SQL

Once your project is ready:

1. Go to **SQL Editor** in the left sidebar
2. Click **"New Query"**
3. Copy and paste the SQL below
4. Click **"Run"**

```sql
-- ============================================
-- DATABASE SCHEMA FOR MOBILE DETAILING APP
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CUSTOMERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  loyalty_points INTEGER DEFAULT 0,
  notification_preferences JSONB DEFAULT '{"sms": true, "email": true, "reminders": true}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT valid_loyalty_points CHECK (loyalty_points >= 0)
);

-- ============================================
-- SERVICES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  category TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_price CHECK (price >= 0),
  CONSTRAINT valid_duration CHECK (duration_minutes > 0)
);

-- ============================================
-- APPOINTMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  appointment_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  location JSONB,  -- Changed from TEXT to JSONB for structured data
  vehicle_info JSONB,
  notes TEXT,
  total_price DECIMAL(10,2),
  payment_status TEXT CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
  payment_intent_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT future_appointment CHECK (appointment_date > created_at),
  CONSTRAINT valid_total_price CHECK (total_price >= 0)
);

-- ============================================
-- APPOINTMENT_SERVICES JOIN TABLE
-- Many-to-many relationship for multiple services per appointment
-- ============================================
CREATE TABLE IF NOT EXISTS appointment_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE NOT NULL,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE NOT NULL,
  price_at_booking DECIMAL(10,2) NOT NULL,  -- Capture price at time of booking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_appointment_service UNIQUE(appointment_id, service_id),
  CONSTRAINT valid_price_at_booking CHECK (price_at_booking >= 0)
);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
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

-- ============================================
-- BUSINESS SETTINGS TABLE
-- Multi-tenant business settings tied to user accounts
-- ============================================
CREATE TABLE IF NOT EXISTS business_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL, -- References auth.users(id) - Supabase Auth
  business_name TEXT,
  business_address JSONB,
  business_phone TEXT,
  business_email TEXT,
  operating_hours JSONB DEFAULT '{
    "monday": {"open": "09:00", "close": "17:00", "closed": false},
    "tuesday": {"open": "09:00", "close": "17:00", "closed": false},
    "wednesday": {"open": "09:00", "close": "17:00", "closed": false},
    "thursday": {"open": "09:00", "close": "17:00", "closed": false},
    "friday": {"open": "09:00", "close": "17:00", "closed": false},
    "saturday": {"open": "10:00", "close": "14:00", "closed": false},
    "sunday": {"open": "10:00", "close": "14:00", "closed": true}
  }'::jsonb,
  service_area JSONB, -- Geographic service area boundaries
  default_buffer_time INTEGER DEFAULT 15, -- Minutes between appointments
  auto_confirm_bookings BOOLEAN DEFAULT false,
  require_deposit BOOLEAN DEFAULT false,
  deposit_percentage DECIMAL(5,2) DEFAULT 0.00,
  cancellation_policy TEXT,
  terms_and_conditions TEXT,
  tax_rate DECIMAL(5,2) DEFAULT 0.00,
  currency TEXT DEFAULT 'USD',
  timezone TEXT DEFAULT 'America/New_York',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_user_settings UNIQUE(user_id),
  CONSTRAINT valid_buffer_time CHECK (default_buffer_time >= 0 AND default_buffer_time <= 120),
  CONSTRAINT valid_deposit_percentage CHECK (deposit_percentage >= 0 AND deposit_percentage <= 100),
  CONSTRAINT valid_tax_rate CHECK (tax_rate >= 0 AND tax_rate <= 100)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_appointments_customer ON appointments(customer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_payment_status ON appointments(payment_status);
CREATE INDEX IF NOT EXISTS idx_appointment_services_appointment ON appointment_services(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_services_service ON appointment_services(service_id);
CREATE INDEX IF NOT EXISTS idx_notifications_appointment ON notifications(appointment_id);
CREATE INDEX IF NOT EXISTS idx_notifications_customer ON notifications(customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(active);
CREATE INDEX IF NOT EXISTS idx_business_settings_user ON business_settings(user_id);

-- ============================================
-- TRIGGERS & FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to customers table
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to appointments table
DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments;
CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to business_settings table
DROP TRIGGER IF EXISTS update_business_settings_updated_at ON business_settings;
CREATE TRIGGER update_business_settings_updated_at
  BEFORE UPDATE ON business_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STORED PROCEDURES / RPC FUNCTIONS
-- ============================================

-- Function to atomically update appointment services
-- This prevents race conditions when updating the services for an appointment
CREATE OR REPLACE FUNCTION update_appointment_services(
  p_appointment_id UUID,
  p_services JSONB  -- Array of {service_id: uuid, price_at_booking: decimal}
)
RETURNS VOID AS $$
BEGIN
  -- Delete existing services for this appointment
  DELETE FROM appointment_services
  WHERE appointment_id = p_appointment_id;

  -- Insert new services
  INSERT INTO appointment_services (appointment_id, service_id, price_at_booking)
  SELECT
    p_appointment_id,
    (service->>'service_id')::UUID,
    (service->>'price_at_booking')::DECIMAL
  FROM jsonb_array_elements(p_services) AS service;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_appointment_services(UUID, JSONB) TO authenticated;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Database schema created successfully!';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Run the Row Level Security (RLS) setup';
  RAISE NOTICE '2. Seed initial services data';
  RAISE NOTICE '3. Get your API credentials from Settings > API';
END $$;
```

---

## Set Up Row Level Security

Supabase uses Row Level Security (RLS) to protect your data. Run this SQL:

```sql
-- ============================================
-- ROW LEVEL SECURITY (RLS) SETUP
-- ============================================

-- Enable RLS on all tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CUSTOMERS POLICIES
-- ============================================

-- Customers can view their own data
CREATE POLICY "Users can view own customer data" ON customers
  FOR SELECT
  USING (auth.uid() = id);

-- Customers can update their own data
CREATE POLICY "Users can update own customer data" ON customers
  FOR UPDATE
  USING (auth.uid() = id);

-- Customers can insert their own data
CREATE POLICY "Users can insert own customer data" ON customers
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- APPOINTMENTS POLICIES
-- ============================================

-- Customers can view their own appointments
CREATE POLICY "Users can view own appointments" ON appointments
  FOR SELECT
  USING (
    customer_id = auth.uid() OR
    auth.jwt() ->> 'role' = 'owner'
  );

-- Customers can create appointments
CREATE POLICY "Users can create appointments" ON appointments
  FOR INSERT
  WITH CHECK (customer_id = auth.uid());

-- Customers can update their own appointments (before completion)
CREATE POLICY "Users can update own appointments" ON appointments
  FOR UPDATE
  USING (
    customer_id = auth.uid() AND status != 'completed'
    OR auth.jwt() ->> 'role' = 'owner'
  );

-- Owners can delete appointments
CREATE POLICY "Owners can delete appointments" ON appointments
  FOR DELETE
  USING (auth.jwt() ->> 'role' = 'owner');

-- ============================================
-- APPOINTMENT_SERVICES POLICIES
-- ============================================

-- Users can view services for their own appointments
CREATE POLICY "Users can view own appointment services" ON appointment_services
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM appointments
      WHERE appointments.id = appointment_services.appointment_id
      AND (appointments.customer_id = auth.uid() OR auth.jwt() ->> 'role' = 'owner')
    )
  );

-- Allow inserting services when creating appointments
CREATE POLICY "Users can add services to own appointments" ON appointment_services
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM appointments
      WHERE appointments.id = appointment_services.appointment_id
      AND appointments.customer_id = auth.uid()
    )
  );

-- Owners can manage all appointment services
CREATE POLICY "Owners can manage appointment services" ON appointment_services
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'owner');

-- ============================================
-- SERVICES POLICIES
-- ============================================

-- Services are viewable by all authenticated users
CREATE POLICY "Authenticated users can view active services" ON services
  FOR SELECT
  USING (active = true OR auth.jwt() ->> 'role' = 'owner');

-- Only owners can manage services
CREATE POLICY "Owners can manage services" ON services
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'owner');

-- ============================================
-- NOTIFICATIONS POLICIES
-- ============================================

-- Customers can view their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT
  USING (
    customer_id = auth.uid() OR
    auth.jwt() ->> 'role' = 'owner'
  );

-- System (service role) can create notifications
-- This is handled via service role key in backend

-- ============================================
-- BUSINESS SETTINGS POLICIES
-- ============================================

-- Users can view their own business settings
CREATE POLICY "Users can view own business settings" ON business_settings
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert their own business settings (once)
CREATE POLICY "Users can create own business settings" ON business_settings
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own business settings
CREATE POLICY "Users can update own business settings" ON business_settings
  FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own business settings
CREATE POLICY "Users can delete own business settings" ON business_settings
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Row Level Security policies created successfully!';
  RAISE NOTICE 'Your data is now protected with proper access controls.';
END $$;
```

---

## Seed Initial Data

Add sample services to get started:

```sql
-- ============================================
-- SEED INITIAL SERVICES DATA
-- ============================================

INSERT INTO services (name, description, price, duration_minutes, category, active) VALUES
  (
    'Basic Wash',
    'Exterior wash and interior vacuum. Perfect for regular maintenance.',
    49.99,
    30,
    'basic',
    true
  ),
  (
    'Premium Detail',
    'Complete exterior detail with wax, interior deep clean, and conditioning.',
    149.99,
    120,
    'premium',
    true
  ),
  (
    'Ultimate Package',
    'Full detail with ceramic coating, engine bay cleaning, and headlight restoration.',
    299.99,
    240,
    'ultimate',
    true
  ),
  (
    'Interior Only',
    'Deep interior cleaning, steam cleaning, and conditioning for all surfaces.',
    89.99,
    90,
    'interior',
    true
  ),
  (
    'Exterior Only',
    'Exterior wash, clay bar treatment, wax, and tire shine.',
    99.99,
    90,
    'exterior',
    true
  ),
  (
    'Headlight Restoration',
    'Restore cloudy or yellowed headlights to like-new clarity.',
    79.99,
    45,
    'addon',
    true
  ),
  (
    'Pet Hair Removal',
    'Specialized deep cleaning to remove pet hair and odors.',
    59.99,
    60,
    'addon',
    true
  ),
  (
    'Engine Bay Cleaning',
    'Thorough engine bay degreasing and detailing.',
    69.99,
    45,
    'addon',
    true
  )
ON CONFLICT DO NOTHING;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
DECLARE
  service_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO service_count FROM services;
  RAISE NOTICE '✅ Seeded % services successfully!', service_count;
  RAISE NOTICE 'You can view services in the Table Editor.';
END $$;
```

---

## Get API Credentials

1. Go to **Settings** > **API** in your Supabase project
2. Copy these values:

   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **service_role key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (⚠️ Keep secret!)

3. Add them to your `.env.local` file:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Test Database Connection

Test your setup with this simple query in the SQL Editor:

```sql
-- Test query to verify everything works
SELECT
  'Services' as table_name,
  COUNT(*) as row_count
FROM services
UNION ALL
SELECT
  'Customers',
  COUNT(*)
FROM customers
UNION ALL
SELECT
  'Appointments',
  COUNT(*)
FROM appointments;
```

You should see a table showing 0 customers and appointments, and 8 services (if you ran the seed data).

---

## Verification Checklist

Before proceeding, verify:

- [ ] ✅ Tables created (customers, services, appointments, notifications)
- [ ] ✅ Indexes created for performance
- [ ] ✅ Triggers set up (updated_at auto-update)
- [ ] ✅ RLS enabled on all tables
- [ ] ✅ RLS policies created
- [ ] ✅ Services seeded (8 services)
- [ ] ✅ API credentials copied to `.env.local`

---

## Troubleshooting

### Error: "relation already exists"
- Some tables already exist. You can either:
  - Drop the tables first: `DROP TABLE IF EXISTS appointments, customers, services, notifications CASCADE;`
  - Or modify the SQL to use `CREATE TABLE IF NOT EXISTS` (already included above)

### Error: "permission denied"
- Make sure you're running queries as the postgres user
- Check that RLS is properly configured

### Can't see data in frontend
- Verify environment variables are set correctly
- Check browser console for Supabase connection errors
- Verify RLS policies allow your queries

---

## Next Steps

Now that your database is set up:

1. **Configure Authentication**: Go to Supabase Authentication > Providers and enable Email
2. **Set Up Webhooks**: Configure Stripe webhook URL in production
3. **Test Locally**: Run `npm run dev` and test database operations
4. **Deploy**: Push to Vercel and add environment variables there too

---

## Database Maintenance

### Backup Your Data

```sql
-- Export appointments as JSON
SELECT json_agg(row_to_json(appointments))
FROM appointments;
```

### Monitor Performance

Go to **Database** > **Queries** to see slow queries and optimize as needed.

### Update Statistics

```sql
-- Analyze tables for better query planning
ANALYZE customers;
ANALYZE appointments;
ANALYZE services;
ANALYZE notifications;
```

---

## Support

For Supabase-specific issues:
- Supabase Docs: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com

For application issues:
- GitHub Issues: https://github.com/WeighWare/mobile-detailing-app/issues
