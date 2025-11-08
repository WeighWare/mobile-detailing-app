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

export interface CustomerProfile extends BaseEntity, ContactInfo {
  name: string;
  email: string;
  phone: string;
  
  // Business Metrics
  loyaltyPoints: number;
  totalBookings: number;
  totalSpent: number;
  averageRating: number;
  lastBookingDate?: string;
  
  // Preferences & History
  preferences: CustomerPreferences;
  vehicleHistory: CustomerVehicle[];
  addresses: Address[];
  
  // Account Settings
  isActive: boolean;
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