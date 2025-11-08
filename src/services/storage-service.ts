import { LOCAL_STORAGE_KEYS } from '../config';
import { safeLocalStorageGet, safeLocalStorageSet } from '../lib/utils';
import type { 
  Appointment, 
  CustomerProfile, 
  BusinessSettings, 
  NotificationLog 
} from '../types';

export class StorageService {
  private static instance: StorageService;

  static getInstance(): StorageService {
    if (!this.instance) {
      this.instance = new StorageService();
    }
    return this.instance;
  }

  // Appointments
  getAppointments(): Appointment[] {
    return safeLocalStorageGet(LOCAL_STORAGE_KEYS.APPOINTMENTS, []);
  }

  saveAppointments(appointments: Appointment[]): boolean {
    return safeLocalStorageSet(LOCAL_STORAGE_KEYS.APPOINTMENTS, appointments);
  }

  // Customers
  getCustomers(): CustomerProfile[] {
    return safeLocalStorageGet(LOCAL_STORAGE_KEYS.CUSTOMERS, []);
  }

  saveCustomers(customers: CustomerProfile[]): boolean {
    return safeLocalStorageSet(LOCAL_STORAGE_KEYS.CUSTOMERS, customers);
  }

  // Business Settings
  getBusinessSettings(): Partial<BusinessSettings> {
    return safeLocalStorageGet(LOCAL_STORAGE_KEYS.SETTINGS, {});
  }

  saveBusinessSettings(settings: Partial<BusinessSettings>): boolean {
    return safeLocalStorageSet(LOCAL_STORAGE_KEYS.SETTINGS, settings);
  }

  // Notifications
  getNotificationLogs(): NotificationLog[] {
    return safeLocalStorageGet(LOCAL_STORAGE_KEYS.NOTIFICATIONS, []);
  }

  saveNotificationLogs(logs: NotificationLog[]): boolean {
    return safeLocalStorageSet(LOCAL_STORAGE_KEYS.NOTIFICATIONS, logs);
  }

  // User Preferences
  getUserPreferences(): Record<string, any> {
    return safeLocalStorageGet(LOCAL_STORAGE_KEYS.USER_PREFERENCES, {});
  }

  saveUserPreferences(preferences: Record<string, any>): boolean {
    return safeLocalStorageSet(LOCAL_STORAGE_KEYS.USER_PREFERENCES, preferences);
  }

  // Utility methods
  clearAllData(): void {
    Object.values(LOCAL_STORAGE_KEYS).forEach(key => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(key);
      }
    });
  }

  exportData(): string {
    const data = {
      appointments: this.getAppointments(),
      customers: this.getCustomers(),
      settings: this.getBusinessSettings(),
      notifications: this.getNotificationLogs(),
      preferences: this.getUserPreferences(),
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(data, null, 2);
  }

  importData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.appointments) this.saveAppointments(data.appointments);
      if (data.customers) this.saveCustomers(data.customers);
      if (data.settings) this.saveBusinessSettings(data.settings);
      if (data.notifications) this.saveNotificationLogs(data.notifications);
      if (data.preferences) this.saveUserPreferences(data.preferences);
      
      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  }
}