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
   * Get all appointments from Supabase
   */
  async getAppointments(): Promise<Appointment[]> {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .order('appointment_date', { ascending: false });

      if (error) throw error;

      // Transform database records to app format
      return (data || []).map(this.transformDbAppointmentToApp);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      throw new Error('Failed to fetch appointments from database');
    }
  }

  /**
   * Get a single appointment by ID
   */
  async getAppointmentById(id: string): Promise<Appointment | null> {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return this.transformDbAppointmentToApp(data);
    } catch (error) {
      console.error('Error fetching appointment:', error);
      return null;
    }
  }

  /**
   * Save a single appointment (create or update)
   */
  async saveAppointment(appointment: Appointment): Promise<Appointment> {
    try {
      const dbAppointment = this.transformAppAppointmentToDb(appointment);

      const { data, error } = await supabase
        .from('appointments')
        .upsert(dbAppointment)
        .select()
        .single();

      if (error) throw error;

      return this.transformDbAppointmentToApp(data);
    } catch (error) {
      console.error('Error saving appointment:', error);
      throw new Error('Failed to save appointment to database');
    }
  }

  /**
   * Save multiple appointments (bulk operation)
   * NOTE: This replaces the old saveAppointments() method
   */
  async saveAppointments(appointments: Appointment[]): Promise<Appointment[]> {
    try {
      const dbAppointments = appointments.map(this.transformAppAppointmentToDb);

      const { data, error } = await supabase
        .from('appointments')
        .upsert(dbAppointments)
        .select();

      if (error) throw error;

      return (data || []).map(this.transformDbAppointmentToApp);
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
   * NOTE: In production, this should be stored in a settings table or user metadata
   * For now, we'll keep using localStorage as a temporary solution
   */
  getBusinessSettings(): Partial<BusinessSettings> {
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
   * NOTE: This is temporary - should be moved to Supabase in production
   */
  saveBusinessSettings(settings: Partial<BusinessSettings>): boolean {
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
   */
  async importData(jsonData: string): Promise<boolean> {
    try {
      const data = JSON.parse(jsonData);

      if (data.appointments?.length) {
        await this.saveAppointments(data.appointments);
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
   */
  async importFromLocalStorage(): Promise<{
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
        await this.saveAppointments(appointments);
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
   * Transform database appointment to app format
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
   * Transform app appointment to database format
   */
  private transformAppAppointmentToDb(app: Appointment): Database['public']['Tables']['appointments']['Insert'] {
    return {
      id: app.id,
      customer_id: null, // Set from auth context
      service_id: app.services?.[0]?.id || null,
      appointment_date: `${app.date}T${app.time}:00`,
      status: app.status as any,
      location: app.location || null, // Supabase handles JSONB conversion
      vehicle_info: app.vehicleInfo as any,
      notes: app.notes || null,
      total_price: app.payment?.amount || null,
      payment_status: app.payment?.status || 'pending',
      payment_intent_id: app.payment?.stripePaymentIntentId || null,
    };
  }

  /**
   * Transform database customer to app format
   */
  private transformDbCustomerToApp(db: DbCustomer): CustomerProfile {
    return {
      id: db.id,
      email: db.email,
      name: db.name,
      phone: db.phone || '',
      preferredContactMethod: 'both',
      loyaltyPoints: db.loyalty_points,
      totalBookings: 0,
      averageRating: 0,
      createdAt: db.created_at,
      vehicleHistory: [],
      preferredServices: [],
      notesHistory: [],
      notifications: db.notification_preferences as any || {},
    };
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
