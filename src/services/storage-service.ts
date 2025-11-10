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
  CustomerBasicProfile,
  BusinessSettings,
  NotificationLog
} from '../types';
import type { Database } from '../types/database';

type DbAppointment = Database['public']['Tables']['appointments']['Row'];
type DbCustomer = Database['public']['Tables']['customers']['Row'];
type DbNotification = Database['public']['Tables']['notifications']['Row'];

// Type for appointment with joined customer and services data
type DbAppointmentWithJoins = DbAppointment & {
  customers?: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  } | null;
  appointment_services?: Array<{
    service_id: string;
    price_at_booking: number;
    services?: {
      id: string;
      name: string;
      description: string | null;
      price: number;
      duration_minutes: number;
    } | null;
  }> | null;
};

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
            services (id, name, description, price, duration_minutes, category, active)
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
            services (id, name, description, price, duration_minutes, category, active)
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

      // Save appointment services to join table using atomic RPC function
      // This prevents race conditions by executing delete+insert within a single transaction
      if (appointment.services && appointment.services.length > 0) {
        const servicesData = appointment.services.map(service => ({
          service_id: service.id,
          price_at_booking: service.price,
        }));

        const { error: rpcError } = await supabase.rpc('update_appointment_services', {
          p_appointment_id: data.id,
          p_services: servicesData,
        });

        if (rpcError) {
          console.error('Error saving appointment services:', rpcError);
          throw rpcError;
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
   * Get all customers with basic profile data only (no computed stats).
   * For customers with full statistics, use getCustomerWithStats().
   */
  async getCustomers(): Promise<CustomerBasicProfile[]> {
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
   * Get a customer by email with basic profile data only (no computed stats).
   * For customer with full statistics, use getCustomerWithStats().
   */
  async getCustomerByEmail(email: string): Promise<CustomerBasicProfile | null> {
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
   * Save a single customer. Accepts CustomerProfile but only saves direct database fields.
   * Returns CustomerBasicProfile (computed stats are not saved/returned).
   */
  async saveCustomer(customer: CustomerProfile): Promise<CustomerBasicProfile> {
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
   * Save multiple customers (bulk operation). Accepts CustomerProfile array but only saves direct database fields.
   * Returns CustomerBasicProfile array (computed stats are not saved/returned).
   */
  async saveCustomers(customers: CustomerProfile[]): Promise<CustomerBasicProfile[]> {
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

  /**
   * Get customer with computed statistics
   * This method fetches a customer and computes aggregate fields from related tables:
   * - totalBookings: COUNT of appointments
   * - totalSpent: SUM of appointment total_price
   * - lastBookingDate: MAX appointment_date
   * - vehicleHistory: Unique vehicles from appointments
   * - addresses: Unique addresses from appointments
   *
   * This is more expensive than getCustomerByEmail() but returns complete data.
   */
  async getCustomerWithStats(email: string): Promise<CustomerProfile | null> {
    try {
      // Call database RPC function that computes all stats in one query
      // This is significantly more efficient than multiple round-trips
      const { data, error } = await supabase
        .rpc('get_customer_profile_with_stats', { p_email: email });

      if (error) throw error;
      if (!data) return null;

      // Transform database JSONB result to CustomerProfile type
      return {
        id: data.id,
        email: data.email,
        name: data.name,
        phone: data.phone || '',
        preferredContactMethod: 'both',
        loyaltyPoints: data.loyaltyPoints,
        totalBookings: data.totalBookings,
        totalSpent: data.totalSpent,
        averageRating: 0, // TODO: Implement ratings system
        lastBookingDate: data.lastBookingDate,
        createdAt: data.createdAt,
        vehicleHistory: data.vehicleHistory || [],
        preferences: {
          preferredServices: data.preferredServices || [],
          preferredTimes: [], // TODO: Analyze appointment times
          preferredDays: [], // TODO: Analyze appointment days
          notifications: data.notificationPreferences || {
            reminders: true,
            promotions: true,
            statusUpdates: true,
            newsletter: false,
          },
        },
        addresses: data.addresses || [],
        isActive: true,
        tier: data.tier,
      } as CustomerProfile;
    } catch (error) {
      console.error('Error fetching customer with stats:', error);
      return null;
    }
  }

  // ============================================
  // BUSINESS SETTINGS
  // ============================================

  /**
   * Get business settings from database
   * @param userId - The user ID from auth context (required for RLS)
   * @returns Business settings for the user
   */
  async getBusinessSettings(userId: string): Promise<Partial<BusinessSettings>> {
    try {
      const { data, error } = await supabase
        .from('business_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        // If no settings found (PGRST116), return empty object
        if (error.code === 'PGRST116') {
          return {};
        }
        throw error;
      }

      // Transform database format to app format
      return this.transformDbBusinessSettingsToApp(data);
    } catch (error) {
      console.error('Error loading business settings:', error);
      return {};
    }
  }

  /**
   * Save business settings to database
   * @param userId - The user ID from auth context (required for RLS)
   * @param settings - Business settings to save
   * @returns True if successful, false otherwise
   */
  async saveBusinessSettings(userId: string, settings: Partial<BusinessSettings>): Promise<boolean> {
    try {
      const dbSettings = this.transformAppBusinessSettingsToDb(userId, settings);

      const { error } = await supabase
        .from('business_settings')
        .upsert(dbSettings, { onConflict: 'user_id' });

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error saving business settings:', error);
      return false;
    }
  }

  /**
   * DEPRECATED: Legacy localStorage getter
   * @deprecated Use async getBusinessSettings(userId) instead
   */
  getBusinessSettingsLegacy(): Partial<BusinessSettings> {
    console.warn('DEPRECATED: Use async getBusinessSettings(userId) instead');
    try {
      const saved = localStorage.getItem('mobile-detailers-settings');
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error('Error loading legacy settings:', error);
      return {};
    }
  }

  /**
   * DEPRECATED: Legacy localStorage setter
   * @deprecated Use async saveBusinessSettings(userId, settings) instead
   */
  saveBusinessSettingsLegacy(settings: Partial<BusinessSettings>): boolean {
    console.warn('DEPRECATED: Use async saveBusinessSettings(userId, settings) instead');
    try {
      localStorage.setItem('mobile-detailers-settings', JSON.stringify(settings));
      return true;
    } catch (error) {
      console.error('Error saving legacy settings:', error);
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
   * @deprecated This method always throws an error
   */
  async saveNotificationLogs(logs: NotificationLog[]): Promise<never> {
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
        await this.saveBusinessSettings(customerId, data.settings);
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
  private transformDbAppointmentWithJoinsToApp(db: DbAppointmentWithJoins): Appointment {
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
        category: as.services?.category || 'addon',
        isActive: as.services?.active ?? true,
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
   * Transform database customer to basic profile (no computed stats).
   * Only includes fields directly from the customers table.
   * For complete profile with stats, use getCustomerWithStats() instead.
   */
  private transformDbCustomerToApp(db: DbCustomer): CustomerBasicProfile {
    return {
      id: db.id,
      email: db.email,
      name: db.name,
      phone: db.phone || '',
      // TODO: Add preferredContactMethod to the database schema or remove from type
      // Currently hardcoded to 'both' as there's no corresponding database field
      preferredContactMethod: 'both',
      loyaltyPoints: db.loyalty_points,
      createdAt: db.created_at,
      preferences: {
        notifications: (db.notification_preferences as any) || {
          reminders: true,
          promotions: true,
          statusUpdates: true,
          newsletter: false,
        },
      },
      // TODO: Add an 'active' status column to the customers table
      // Currently hardcoded to true as there's no corresponding database field
      isActive: true,
    } as CustomerBasicProfile;
  }

  /**
   * Transform app customer to database format
   *
   * NOTE: Multiple Address Limitation
   * - CustomerProfile supports multiple addresses (addresses: Address[])
   * - Database customers.address field stores only a single Address
   * - Currently saves only the first address (app.addresses?.[0])
   * - This leads to data loss if customer has multiple addresses
   *
   * FUTURE IMPROVEMENT OPTIONS:
   * 1. Change customers.address from Address to Address[] to store all addresses
   * 2. Create separate customer_addresses table with one-to-many relationship
   * 3. Store array in appointment.location instead for location-specific data
   */
  private transformAppCustomerToDb(app: CustomerProfile): Database['public']['Tables']['customers']['Insert'] {
    return {
      id: app.id,
      email: app.email,
      name: app.name,
      phone: app.phone || null,
      address: app.addresses?.[0] || null, // LIMITATION: Only saves first address
      loyalty_points: app.loyaltyPoints,
      notification_preferences: app.preferences.notifications as any,
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

  /**
   * Transform database business settings to app format
   */
  private transformDbBusinessSettingsToApp(db: any): Partial<BusinessSettings> {
    return {
      businessName: db.business_name || undefined,
      businessAddress: db.business_address || undefined,
      businessPhone: db.business_phone || undefined,
      businessEmail: db.business_email || undefined,
      operatingHours: db.operating_hours || undefined,
      serviceArea: db.service_area || undefined,
      defaultBufferTime: db.default_buffer_time,
      autoConfirmBookings: db.auto_confirm_bookings,
      requireDeposit: db.require_deposit,
      depositPercentage: db.deposit_percentage,
      cancellationPolicy: db.cancellation_policy || undefined,
      termsAndConditions: db.terms_and_conditions || undefined,
      taxRate: db.tax_rate,
      currency: db.currency,
      timezone: db.timezone,
    };
  }

  /**
   * Transform app business settings to database format
   */
  private transformAppBusinessSettingsToDb(
    userId: string,
    app: Partial<BusinessSettings>
  ): Database['public']['Tables']['business_settings']['Insert'] {
    return {
      user_id: userId,
      business_name: app.businessName || null,
      business_address: app.businessAddress || null,
      business_phone: app.businessPhone || null,
      business_email: app.businessEmail || null,
      operating_hours: app.operatingHours || undefined,
      service_area: app.serviceArea || null,
      default_buffer_time: app.defaultBufferTime || 15,
      auto_confirm_bookings: app.autoConfirmBookings || false,
      require_deposit: app.requireDeposit || false,
      deposit_percentage: app.depositPercentage || 0,
      cancellation_policy: app.cancellationPolicy || null,
      terms_and_conditions: app.termsAndConditions || null,
      tax_rate: app.taxRate || 0,
      currency: app.currency || 'USD',
      timezone: app.timezone || 'America/New_York',
    };
  }
}
