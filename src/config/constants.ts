// Application-wide constants
export const APP_CONFIG = {
  name: 'The Mobile Detailers',
  version: '2.0.0',
  description: 'Enterprise Car Detailing Management Platform',
  author: 'Mobile Detailers Inc.',
  website: 'https://themobiledetailers.com',
} as const;

export const BUSINESS_HOURS = {
  DEFAULT: {
    monday: { start: '08:00', end: '18:00', isOpen: true },
    tuesday: { start: '08:00', end: '18:00', isOpen: true },
    wednesday: { start: '08:00', end: '18:00', isOpen: true },
    thursday: { start: '08:00', end: '18:00', isOpen: true },
    friday: { start: '08:00', end: '18:00', isOpen: true },
    saturday: { start: '09:00', end: '17:00', isOpen: true },
    sunday: { start: '10:00', end: '16:00', isOpen: false },
  }
} as const;

export const NOTIFICATION_SETTINGS = {
  DEFAULT_REMINDER_HOURS: [24, 2],
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MINUTES: 15,
  BATCH_SIZE: 50,
} as const;

export const PAYMENT_SETTINGS = {
  CURRENCIES: ['USD', 'CAD', 'EUR', 'GBP'] as const,
  DEFAULT_CURRENCY: 'USD',
  ACCEPTED_CARDS: ['visa', 'mastercard', 'amex', 'discover'] as const,
  DEFAULT_TAX_RATE: 0.08,
  MIN_DEPOSIT_PERCENTAGE: 10,
  MAX_DEPOSIT_PERCENTAGE: 50,
} as const;

export const APPOINTMENT_SETTINGS = {
  MIN_BOOKING_ADVANCE_HOURS: 2,
  MAX_BOOKING_ADVANCE_DAYS: 90,
  DEFAULT_SLOT_DURATION: 30, // minutes
  BUFFER_TIME: 15, // minutes between appointments
  MAX_CONCURRENT_APPOINTMENTS: 5,
} as const;

export const LOYALTY_SETTINGS = {
  DEFAULT_POINTS_PER_DOLLAR: 1,
  DEFAULT_REDEMPTION_RATE: 100, // 100 points = $1
  TIER_THRESHOLDS: {
    bronze: 0,
    silver: 1000,
    gold: 2500,
  },
  TIER_DISCOUNTS: {
    bronze: 0,
    silver: 5,
    gold: 10,
  },
} as const;

export const VALIDATION_RULES = {
  CUSTOMER_NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 50,
  },
  PHONE_NUMBER: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 15,
  },
  EMAIL: {
    MAX_LENGTH: 100,
  },
  APPOINTMENT_NOTES: {
    MAX_LENGTH: 500,
  },
  REVIEW: {
    MAX_LENGTH: 1000,
  },
} as const;

export const SERVICE_CATEGORIES = [
  'exterior',
  'interior', 
  'full',
  'addon'
] as const;

export const VEHICLE_SIZES = [
  'compact',
  'midsize',
  'large',
  'suv',
  'truck'
] as const;

export const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
] as const;

export const ERROR_MESSAGES = {
  REQUIRED_FIELD: 'This field is required',
  INVALID_EMAIL: 'Please enter a valid email address',
  INVALID_PHONE: 'Please enter a valid phone number',
  INVALID_DATE: 'Please select a valid date',
  INVALID_TIME: 'Please select a valid time',
  BOOKING_CONFLICT: 'This time slot conflicts with another appointment',
  PAST_DATE: 'Cannot book appointments in the past',
  OUTSIDE_BUSINESS_HOURS: 'Selected time is outside business hours',
  INSUFFICIENT_ADVANCE: 'Minimum booking advance time not met',
  PAYMENT_FAILED: 'Payment processing failed. Please try again.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  VALIDATION_FAILED: 'Please check your input and try again',
} as const;

export const SUCCESS_MESSAGES = {
  APPOINTMENT_CREATED: 'Appointment scheduled successfully!',
  APPOINTMENT_UPDATED: 'Appointment updated successfully!',
  APPOINTMENT_CANCELLED: 'Appointment cancelled successfully',
  PAYMENT_PROCESSED: 'Payment processed successfully!',
  NOTIFICATION_SENT: 'Notification sent successfully',
  SETTINGS_SAVED: 'Settings saved successfully',
  PROFILE_UPDATED: 'Profile updated successfully',
} as const;

export const LOCAL_STORAGE_KEYS = {
  APPOINTMENTS: 'mobile-detailers-appointments',
  CUSTOMERS: 'mobile-detailers-customers',
  SETTINGS: 'mobile-detailers-settings',
  NOTIFICATIONS: 'mobile-detailers-notifications',
  USER_PREFERENCES: 'mobile-detailers-user-prefs',
} as const;

export const API_ENDPOINTS = {
  APPOINTMENTS: '/api/appointments',
  CUSTOMERS: '/api/customers',
  NOTIFICATIONS: '/api/notifications',
  PAYMENTS: '/api/payments',
  ANALYTICS: '/api/analytics',
  SETTINGS: '/api/settings',
} as const;