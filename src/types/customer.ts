import { BaseEntity, Address, ContactInfo } from './common';

export interface CustomerNotificationPreferences {
  reminders: boolean;
  promotions: boolean;
  statusUpdates: boolean;
  newsletter: boolean;
}

export interface CustomerPreferences {
  preferredServices: string[];
  preferredTimes: string[];
  preferredDays: string[];
  notifications: CustomerNotificationPreferences;
}

export interface CustomerVehicle {
  make: string;
  model: string;
  year: number;
  color: string;
  licensePlate?: string;
  size?: string;
}

/**
 * Basic customer profile with only fields directly from the customers table.
 * Used by getCustomers() and getCustomerByEmail() which don't compute aggregate stats.
 * For complete profile with computed stats, use CustomerProfile from getCustomerWithStats().
 */
export interface CustomerBasicProfile extends BaseEntity, ContactInfo {
  name: string;
  email: string;
  phone: string;

  // Direct database fields only
  loyaltyPoints: number;

  // Notification preferences from database
  preferences: {
    notifications: CustomerNotificationPreferences;
  };

  // Account Settings
  isActive: boolean;
}

/**
 * Complete customer profile with computed statistics and history.
 * This includes aggregate data from appointments, services, and other related tables.
 * Only returned by getCustomerWithStats() which performs expensive queries.
 */
export interface CustomerProfile extends CustomerBasicProfile {
  // Computed Business Metrics (requires joins/aggregation)
  totalBookings: number;
  totalSpent: number;
  averageRating: number;
  lastBookingDate?: string;

  // Computed Preferences & History (requires joins/aggregation)
  preferences: CustomerPreferences;
  vehicleHistory: CustomerVehicle[];
  addresses: Address[];

  // Computed tier based on totalSpent
  tier?: 'bronze' | 'silver' | 'gold';
}

export interface CustomerStats {
  totalCustomers: number;
  newThisMonth: number;
  activeCustomers: number;
  averageLifetimeValue: number;
  retentionRate: number;
  topSpenders: CustomerProfile[];
}