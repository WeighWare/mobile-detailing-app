/**
 * Storage Service - Supabase Implementation
 *
 * This service has been COMPLETELY REWRITTEN to use Supabase instead of localStorage.
 * All data is now persisted to a PostgreSQL database with proper type safety.
 *
 * BREAKING CHANGES from localStorage version:
 * - All methods are now async
 * - Methods return Promise<T> instead of T
 * - Errors are thrown instead of returning false/empty arrays
 * - Data is stored in Supabase tables, not localStorage
 *
 * Migration from localStorage:
 * - Use the importFromLocalStorage() method to migrate existing data
 * - This is a one-time operation that should be run on first launch
 */

import { supabase } from '../lib/supabase';
import type {
  Appointment,
  CustomerProfile,
  BusinessSettings,
  NotificationLog
} from '../types';
import type { Database } from '../types/database';

type DbAppointment = Database['public']['Tables']['appointments']['Row'];
type DbCustomer = Database['public']['Tables']['customers']['Row'];
type DbNotification = Database['public']['Tables']['notifications']['Row'];

export class StorageService {
  private static instance: StorageService;

  static getInstance(): StorageService {
    if (!this.instance) {
      this.instance = new StorageService();
    }
    return this.instance;
  }

  // ============================================
  // APPOINTMENTS
  // ============================================

  /**
   * Get all appointments from Supabase with joined customer and services data
   */
  async getAppointments(): Promise<Appointment[]> {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          customers (id, name, email, phone),
          appointment_services (
            service_id,
            price_at_booking,
            services (id, name, description, price, duration_minutes)
          )
        `)
        .order('appointment_date', { ascending: false });

      if (error) throw error;

      // Transform database records to app format
      return (data || []).map(this.transformDbAppointmentWithJoinsToApp);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      throw new Error('Failed to fetch appointments from database');
    }
  }

  /**
   * Get a single appointment by ID with joined customer and services data
   */
  async getAppointmentById(id: string): Promise<Appointment | null> {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          customers (id, name, email, phone),
          appointment_services (
            service_id,
            price_at_booking,
            services (id, name, description, price, duration_minutes)
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return this.transformDbAppointmentWithJoinsToApp(data);
    } catch (error) {
      console.error('Error fetching appointment:', error);
      return null;
    }
  }

  /**
   * Save a single appointment (create or update)
   * @param appointment - The appointment to save
   * @param customerId - The customer ID from auth context (required for RLS)
   */
  async saveAppointment(appointment: Appointment, customerId: string): Promise<Appointment> {
    try {
      // Transform appointment for database
      const dbAppointment = this.transformAppAppointmentToDb(appointment, customerId);

      // Save the main appointment record
      const { data, error } = await supabase
        .from('appointments')
        .upsert(dbAppointment)
        .select()
        .single();

      if (error) throw error;

      // Save appointment services to join table
      if (appointment.services && appointment.services.length > 0) {
        // First, delete existing appointment_services records for this appointment
        await supabase
          .from('appointment_services')
          .delete()
          .eq('appointment_id', data.id);

        // Then insert new records for each service
        const appointmentServices = appointment.services.map(service => ({
          appointment_id: data.id,
          service_id: service.id,
          price_at_booking: service.price,
        }));

        const { error: servicesError } = await supabase
          .from('appointment_services')
          .insert(appointmentServices);

        if (servicesError) {
          console.error('Error saving appointment services:', servicesError);
          throw servicesError;
        }
      }

      // Fetch the complete appointment with joins
      const savedAppointment = await this.getAppointmentById(data.id);
      if (!savedAppointment) {
        throw new Error('Failed to fetch complete appointment details after saving.');
      }
      return savedAppointment;
    } catch (error) {
      console.error('Error saving appointment:', error);
      throw new Error('Failed to save appointment to database');
    }
  }

  /**
   * Save multiple appointments (bulk operation)
   * NOTE: All appointments must belong to the same customer
   * @param appointments - The appointments to save
   * @param customerId - The customer ID from auth context (required for RLS)
   */
  async saveAppointments(appointments: Appointment[], customerId: string): Promise<Appointment[]> {
    try {
      // For bulk operations, save each appointment individually to handle services properly
      const savedAppointments: Appointment[] = [];

      for (const appointment of appointments) {
        const saved = await this.saveAppointment(appointment, customerId);
        savedAppointments.push(saved);
      }

      return savedAppointments;
    } catch (error) {
      console.error('Error saving appointments:', error);
      throw new Error('Failed to save appointments to database');
    }
  }

  /**
   * Delete an appointment
   */
  async deleteAppointment(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting appointment:', error);
      throw new Error('Failed to delete appointment from database');
    }
  }

  // ============================================
  // CUSTOMERS
  // ============================================

  /**
   * Get all customers
   */
  async getCustomers(): Promise<CustomerProfile[]> {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(this.transformDbCustomerToApp);
    } catch (error) {
      console.error('Error fetching customers:', error);
      throw new Error('Failed to fetch customers from database');
    }
  }

  /**
   * Get a customer by email
   */
  async getCustomerByEmail(email: string): Promise<CustomerProfile | null> {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('email', email)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return this.transformDbCustomerToApp(data);
    } catch (error) {
      console.error('Error fetching customer:', error);
      return null;
    }
  }

  /**
   * Save a single customer
   */
  async saveCustomer(customer: CustomerProfile): Promise<CustomerProfile> {
    try {
      const dbCustomer = this.transformAppCustomerToDb(customer);

      const { data, error } = await supabase
        .from('customers')
        .upsert(dbCustomer)
        .select()
        .single();

      if (error) throw error;

      return this.transformDbCustomerToApp(data);
    } catch (error) {
      console.error('Error saving customer:', error);
      throw new Error('Failed to save customer to database');
    }
  }

  /**
   * Save multiple customers (bulk operation)
   */
  async saveCustomers(customers: CustomerProfile[]): Promise<CustomerProfile[]> {
    try {
      const dbCustomers = customers.map(this.transformAppCustomerToDb);

      const { data, error } = await supabase
        .from('customers')
        .upsert(dbCustomers)
        .select();

      if (error) throw error;

      return (data || []).map(this.transformDbCustomerToApp);
    } catch (error) {
      console.error('Error saving customers:', error);
      throw new Error('Failed to save customers to database');
    }
  }

  // ============================================
  // BUSINESS SETTINGS
  // ============================================

  /**
   * Get business settings
   *
   * ⚠️ CRITICAL LIMITATION - NOT SUITABLE FOR PRODUCTION SAAS
   *
   * This method uses localStorage, which is device-specific and not tied to user accounts.
   * This is NOT suitable for a multi-user SaaS application because:
   * 1. Settings are lost when user switches devices/browsers
   * 2. Settings are not shared across user's devices
   * 3. Multiple users on same device would share settings
   * 4. No backup/recovery of settings
   * 5. No audit trail of setting changes
   *
   * FOR PRODUCTION, business settings MUST be migrated to a database table:
   *
   * CREATE TABLE business_settings (
   *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
   *   user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
   *   business_name TEXT,
   *   business_address JSONB,
   *   business_phone TEXT,
   *   business_email TEXT,
   *   operating_hours JSONB,
   *   service_area JSONB,
   *   default_buffer_time INTEGER,
   *   auto_confirm_bookings BOOLEAN,
   *   require_deposit BOOLEAN,
   *   deposit_percentage DECIMAL(5,2),
   *   cancellation_policy TEXT,
   *   terms_and_conditions TEXT,
   *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
   *   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
   *   CONSTRAINT unique_user_settings UNIQUE(user_id)
   * );
   *
   * Then implement getBusinessSettings() to fetch from DB with RLS policies.
   *
   * TODO: Create business_settings table in DATABASE_SETUP.md
   * TODO: Add RLS policies for business_settings
   * TODO: Implement async getBusinessSettings(userId: string)
   * TODO: Implement async saveBusinessSettings(userId: string, settings: BusinessSettings)
   * TODO: Migration script to move localStorage settings to database
   */
  getBusinessSettings(): Partial<BusinessSettings> {
    console.warn(
      'PRODUCTION WARNING: Business settings are stored in localStorage. ' +
      'This is NOT suitable for SaaS applications. Settings must be moved to database.'
    );
    try {
      const saved = localStorage.getItem('mobile-detailers-settings');
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error('Error loading business settings:', error);
      return {};
    }
  }

  /**
   * Save business settings
   *
   * ⚠️ CRITICAL LIMITATION - NOT SUITABLE FOR PRODUCTION SAAS
   * See getBusinessSettings() documentation for details and migration plan.
   */
  saveBusinessSettings(settings: Partial<BusinessSettings>): boolean {
    console.warn(
      'PRODUCTION WARNING: Business settings are stored in localStorage. ' +
      'This is NOT suitable for SaaS applications. Settings must be moved to database.'
    );
    try {
      localStorage.setItem('mobile-detailers-settings', JSON.stringify(settings));
      return true;
    } catch (error) {
      console.error('Error saving business settings:', error);
      return false;
    }
  }

  // ============================================
  // NOTIFICATIONS
  // ============================================

  /**
   * Get notification logs
   */
  async getNotificationLogs(): Promise<NotificationLog[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      return (data || []).map(this.transformDbNotificationToApp);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Fallback to empty array instead of throwing
      return [];
    }
  }

  /**
   * Save a notification log
   * @param log - The notification log to save
   * @param customerId - The customer ID (required for RLS)
   * @param message - The notification message content (required by DB)
   */
  async saveNotificationLog(
    log: NotificationLog,
    customerId: string,
    message: string
  ): Promise<NotificationLog> {
    try {
      const dbNotification = this.transformAppNotificationToDb(log, customerId, message);

      const { data, error } = await supabase
        .from('notifications')
        .insert(dbNotification)
        .select()
        .single();

      if (error) throw error;

      return this.transformDbNotificationToApp(data);
    } catch (error) {
      console.error('Error saving notification log:', error);
      throw new Error('Failed to save notification log');
    }
  }

  /**
   * Save multiple notification logs (kept for compatibility)
   * NOTE: This method is deprecated. Use saveNotificationLog with customerId and message instead.
   * This method cannot properly set customer_id and message fields, which are required.
   */
  async saveNotificationLogs(logs: NotificationLog[]): Promise<void> {
    console.warn('saveNotificationLogs is deprecated. Notifications should be created via API endpoints.');
    // This method is kept for backward compatibility but should not be used
    // The API endpoints (send-email.ts, send-sms.ts) handle notification logging properly
    throw new Error('saveNotificationLogs is deprecated. Use send-email or send-sms API endpoints.');
  }

  // ============================================
  // USER PREFERENCES
  // ============================================

  /**
   * Get user preferences
   * NOTE: This should be stored in user metadata in Supabase Auth
   * For now, keeping localStorage as temporary solution
   */
  getUserPreferences(): Record<string, any> {
    try {
      const saved = localStorage.getItem('mobile-detailers-user-preferences');
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error('Error loading user preferences:', error);
      return {};
    }
  }

  /**
   * Save user preferences
   */
  saveUserPreferences(preferences: Record<string, any>): boolean {
    try {
      localStorage.setItem('mobile-detailers-user-preferences', JSON.stringify(preferences));
      return true;
    } catch (error) {
      console.error('Error saving user preferences:', error);
      return false;
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Clear all localStorage data (for testing/reset)
   * NOTE: Does NOT clear Supabase data
   */
  clearAllLocalStorageData(): void {
    const keysToRemove = [
      'mobile-detailers-settings',
      'mobile-detailers-user-preferences',
      'mobile-detailers-auth',
    ];

    keysToRemove.forEach(key => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(key);
      }
    });
  }

  /**
   * Export data from Supabase (for backup)
   */
  async exportData(): Promise<string> {
    try {
      const [appointments, customers, notifications] = await Promise.all([
        this.getAppointments(),
        this.getCustomers(),
        this.getNotificationLogs(),
      ]);

      const data = {
        appointments,
        customers,
        notifications,
        settings: this.getBusinessSettings(),
        preferences: this.getUserPreferences(),
        exportedAt: new Date().toISOString(),
        source: 'supabase',
      };

      return JSON.stringify(data, null, 2);
    } catch (error) {
      console.error('Error exporting data:', error);
      throw new Error('Failed to export data');
    }
  }

  /**
   * Import data to Supabase (for migration/restore)
   * @param jsonData - JSON string containing exported data
   * @param customerId - The customer ID to associate imported appointments with
   */
  async importData(jsonData: string, customerId: string): Promise<boolean> {
    try {
      const data = JSON.parse(jsonData);

      if (data.appointments?.length) {
        await this.saveAppointments(data.appointments, customerId);
      }

      if (data.customers?.length) {
        await this.saveCustomers(data.customers);
      }

      if (data.settings) {
        this.saveBusinessSettings(data.settings);
      }

      if (data.preferences) {
        this.saveUserPreferences(data.preferences);
      }

      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  }

  /**
   * ONE-TIME MIGRATION: Import data from localStorage to Supabase
   * This should be called once when transitioning from localStorage to Supabase
   * @param customerId - The customer ID to associate imported appointments with
   */
  async importFromLocalStorage(customerId: string): Promise<{
    success: boolean;
    imported: {
      appointments: number;
      customers: number;
    };
    errors: string[];
  }> {
    const result = {
      success: true,
      imported: { appointments: 0, customers: 0 },
      errors: [] as string[],
    };

    try {
      // Import appointments
      const appointmentsData = localStorage.getItem('mobile-detailers-appointments');
      if (appointmentsData) {
        const appointments: Appointment[] = JSON.parse(appointmentsData);
        await this.saveAppointments(appointments, customerId);
        result.imported.appointments = appointments.length;
      }

      // Import customers
      const customersData = localStorage.getItem('mobile-detailers-customers');
      if (customersData) {
        const customers: CustomerProfile[] = JSON.parse(customersData);
        await this.saveCustomers(customers);
        result.imported.customers = customers.length;
      }

      console.log(`✅ Migration complete: ${result.imported.appointments} appointments, ${result.imported.customers} customers`);
    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      console.error('Migration error:', error);
    }

    return result;
  }

  // ============================================
  // TRANSFORMATION HELPERS
  // ============================================

  /**
   * Transform database appointment to app format (without joins - simplified)
   * NOTE: This method returns incomplete data. Use transformDbAppointmentWithJoinsToApp for complete data.
   */
  private transformDbAppointmentToApp(db: DbAppointment): Appointment {
    // This is a simplified transformation - you may need to adjust based on your exact schema
    return {
      id: db.id,
      customerName: '', // Will need to join with customer table
      date: new Date(db.appointment_date).toISOString().split('T')[0],
      time: new Date(db.appointment_date).toTimeString().slice(0, 5),
      status: db.status as any,
      notes: db.notes || undefined,
      location: db.location || undefined, // JSONB is already parsed by Supabase
      vehicleInfo: db.vehicle_info as any,
      payment: {
        status: db.payment_status || 'pending',
        amount: db.total_price || 0,
        method: 'card',
        stripePaymentIntentId: db.payment_intent_id || undefined,
      },
      services: [], // Will need to join with services table
      createdAt: db.created_at,
      updatedAt: db.updated_at,
    } as Appointment;
  }

  /**
   * Transform database appointment with joins to app format
   * This handles the data structure returned from queries with customer and services joins
   */
  private transformDbAppointmentWithJoinsToApp(db: any): Appointment {
    return {
      id: db.id,
      customerName: db.customers?.name || '',
      customerEmail: db.customers?.email,
      customerPhone: db.customers?.phone || '',
      date: new Date(db.appointment_date).toISOString().split('T')[0],
      time: new Date(db.appointment_date).toTimeString().slice(0, 5),
      status: db.status as any,
      notes: db.notes || undefined,
      location: db.location || undefined, // JSONB is already parsed by Supabase
      vehicleInfo: db.vehicle_info as any,
      payment: {
        status: db.payment_status || 'pending',
        amount: db.total_price || 0,
        method: 'card',
        stripePaymentIntentId: db.payment_intent_id || undefined,
      },
      services: (db.appointment_services || []).map((as: any) => ({
        id: as.services?.id || as.service_id,
        name: as.services?.name || '',
        description: as.services?.description || '',
        price: as.price_at_booking || as.services?.price || 0,
        duration: as.services?.duration_minutes || 60,
      })),
      createdAt: db.created_at,
      updatedAt: db.updated_at,
    } as Appointment;
  }

  /**
   * Transform app appointment to database format
   * @param app - The appointment from the app
   * @param customerId - The customer ID from auth context (required for RLS)
   */
  private transformAppAppointmentToDb(
    app: Appointment,
    customerId: string
  ): Database['public']['Tables']['appointments']['Insert'] {
    return {
      id: app.id,
      customer_id: customerId, // From parameter (required for RLS policies)
      appointment_date: `${app.date}T${app.time}:00`,
      status: app.status as any,
      location: app.location || null, // Supabase handles JSONB conversion
      vehicle_info: app.vehicleInfo as any,
      notes: app.notes || null,
      total_price: app.services?.reduce((sum, s) => sum + s.price, 0) || 0, // Calculate from services
      payment_status: app.payment?.status || 'pending',
      payment_intent_id: app.payment?.stripePaymentIntentId || null,
    };
  }

  /**
   * Transform database customer to app format
   *
   * NOTE: This returns a simplified CustomerProfile with computed fields set to defaults.
   * The following fields are NOT computed from the database for performance reasons:
   * - totalBookings: Set to 0 (should be COUNT of appointments for this customer)
   * - totalSpent: Not included (should be SUM of appointment total_price)
   * - averageRating: Set to 0 (requires ratings table that doesn't exist yet)
   * - lastBookingDate: Not included (should be MAX appointment_date)
   * - vehicleHistory: Empty array (should aggregate vehicle_info from appointments)
   * - addresses: Not included (should aggregate location from appointments)
   * - preferences: Set from notification_preferences only
   * - isActive: Not included (no field in DB)
   * - tier: Not included (no field in DB)
   *
   * For a complete customer profile with computed stats, use getCustomerWithStats() instead.
   *
   * TODO: Consider creating a separate CustomerBasicProfile type for data directly from DB
   * TODO: Implement getCustomerWithStats() to compute totalBookings, totalSpent, etc.
   */
  private transformDbCustomerToApp(db: DbCustomer): CustomerProfile {
    return {
      id: db.id,
      email: db.email,
      name: db.name,
      phone: db.phone || '',
      preferredContactMethod: 'both',
      loyaltyPoints: db.loyalty_points,
      totalBookings: 0, // TODO: Compute from appointments count
      totalSpent: 0, // TODO: Compute from SUM(appointments.total_price)
      averageRating: 0, // TODO: Implement ratings system
      createdAt: db.created_at,
      vehicleHistory: [], // TODO: Extract from appointments.vehicle_info
      preferences: {
        preferredServices: [], // TODO: Compute from appointment_services frequency
        preferredTimes: [], // TODO: Analyze appointment times
        preferredDays: [], // TODO: Analyze appointment days
        notifications: (db.notification_preferences as any) || {
          reminders: true,
          promotions: true,
          statusUpdates: true,
          newsletter: false,
        },
      },
      addresses: [], // TODO: Extract from appointments.location
      isActive: true, // Default to true (no field in DB yet)
      tier: undefined, // TODO: Implement tier calculation based on totalSpent
    } as CustomerProfile;
  }

  /**
   * Transform app customer to database format
   */
  private transformAppCustomerToDb(app: CustomerProfile): Database['public']['Tables']['customers']['Insert'] {
    return {
      id: app.id,
      email: app.email,
      name: app.name,
      phone: app.phone || null,
      address: null,
      loyalty_points: app.loyaltyPoints,
      notification_preferences: app.notifications as any,
    };
  }

  /**
   * Transform database notification to app format
   */
  private transformDbNotificationToApp(db: DbNotification): NotificationLog {
    return {
      id: db.id,
      appointmentId: db.appointment_id || '',
      type: 'reminder',
      method: db.type === 'sms' ? 'sms' : 'email',
      sentAt: db.sent_at || db.created_at,
      status: db.status === 'sent' ? 'sent' : db.status === 'failed' ? 'failed' : 'pending',
      retryCount: 0,
      errorMessage: db.error_message || undefined,
    };
  }

  /**
   * Transform app notification to database format
   * @param app - The notification log from the app
   * @param customerId - The customer ID (required for RLS)
   * @param message - The notification message content (required by DB)
   */
  private transformAppNotificationToDb(
    app: NotificationLog,
    customerId: string,
    message: string
  ): Database['public']['Tables']['notifications']['Insert'] {
    return {
      id: app.id,
      appointment_id: app.appointmentId || null,
      customer_id: customerId, // From parameter (required for RLS)
      type: app.method === 'sms' ? 'sms' : 'email',
      status: app.status === 'sent' ? 'sent' : app.status === 'failed' ? 'failed' : 'pending',
      message: message, // From parameter (required by DB NOT NULL constraint)
      sent_at: app.sentAt || null,
      error_message: app.errorMessage || null,
    };
  }
}
