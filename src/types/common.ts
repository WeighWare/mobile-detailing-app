// Common types used across the application
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Address {
  id: string;
  label: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  coordinates?: { lat: number; lng: number };
  isDefault?: boolean;
}

export interface ContactInfo {
  email?: string;
  phone?: string;
  preferredMethod?: 'email' | 'sms' | 'both';
}

export type UserRole = 'owner' | 'customer';

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  errors?: string[];
}

export interface ValidationError {
  field: string;
  message: string;
}

// Status types
export type AppointmentStatus = 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'delayed';
export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';
export type NotificationStatus = 'sent' | 'failed' | 'pending';