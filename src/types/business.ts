import { BaseEntity } from './common';

export interface Service extends BaseEntity {
  name: string;
  description: string;
  price: number;
  duration: number; // in minutes
  category: 'exterior' | 'interior' | 'full' | 'addon';
  isActive: boolean;
  popularityRank?: number;
  requirements?: string[];
  addOns?: string[];
}

export interface BusinessHours {
  [key: string]: { 
    start: string; 
    end: string; 
    isOpen: boolean; 
  };
}

export interface NotificationSettings {
  smsEnabled: boolean;
  emailEnabled: boolean;
  reminderHours: number[];
  automatedReminders: boolean;
  templates: {
    reminder: string;
    confirmation: string;
    statusChange: string;
    delay: string;
  };
}

export interface PaymentSettings {
  stripeEnabled: boolean;
  cashEnabled: boolean;
  depositRequired: boolean;
  depositPercentage: number;
  acceptedCards: string[];
  refundPolicy: string;
  taxRate: number;
}

export interface BusinessInfo {
  name: string;
  phone: string;
  email: string;
  website?: string;
  logo?: string;
  address?: string;
  serviceRadius: number; // miles
  minimumBookingAdvance: number; // hours
  maxConcurrentBookings: number;
}

export interface LoyaltySettings {
  pointsPerDollar: number;
  redemptionRate: number; // points per dollar discount
  tierBenefits: {
    bronze: { threshold: number; discount: number; perks: string[] };
    silver: { threshold: number; discount: number; perks: string[] };
    gold: { threshold: number; discount: number; perks: string[] };
  };
}

export interface BusinessSettings {
  businessHours: BusinessHours;
  services: Service[];
  pricing: Record<string, number>;
  notifications: NotificationSettings;
  payment: PaymentSettings;
  business: BusinessInfo;
  loyalty: LoyaltySettings;
  features: {
    enableBookingLimits: boolean;
    enableWeatherAlerts: boolean;
    enableCustomerReviews: boolean;
    enableLoyaltyProgram: boolean;
  };
}

export interface BusinessMetrics {
  revenue: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    lastMonth: number;
    growth: number;
  };
  appointments: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    completed: number;
    cancelled: number;
  };
  customers: {
    total: number;
    new: number;
    returning: number;
    retention: number;
  };
  performance: {
    averageRating: number;
    completionRate: number;
    onTimeRate: number;
    customerSatisfaction: number;
  };
}