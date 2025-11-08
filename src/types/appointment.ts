import { BaseEntity, Address, AppointmentStatus } from './common';
import { Service } from './business';
import { Payment } from './payment';

export interface VehicleInfo {
  make: string;
  model: string;
  year: number;
  color: string;
  licensePlate?: string;
  size?: 'compact' | 'midsize' | 'large' | 'suv' | 'truck';
}

export interface AppointmentLocation extends Address {
  parkingInstructions?: string;
}

export interface Appointment extends BaseEntity {
  // Customer Information
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  
  // Legacy fields for backward compatibility
  contactEmail?: string;
  contactPhone?: string;
  
  // Appointment Details
  date: string;
  time: string;
  status: AppointmentStatus;
  notes?: string;
  
  // Services & Pricing
  services: Service[];
  estimatedDuration?: number;
  
  // Location & Vehicle
  location?: AppointmentLocation;
  vehicleInfo?: VehicleInfo;
  
  // Payment
  payment?: Payment;
  
  // Service Execution
  actualStartTime?: string;
  actualEndTime?: string;
  assignedTechnician?: string;
  equipmentUsed?: string[];
  weatherConditions?: string;
  completionNotes?: string;
  
  // Customer Feedback
  customerRating?: number;
  customerReview?: string;
  
  // Business Logic
  reminderSent?: boolean;
  delayReason?: string;
  loyaltyPointsEarned?: number;
  
  // Media
  beforePhotos?: string[];
  afterPhotos?: string[];
}

export interface AppointmentFormData {
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  date: string;
  time: string;
  services: Service[];
  vehicleInfo?: Partial<VehicleInfo>;
  location?: Partial<AppointmentLocation>;
  notes?: string;
}

export interface AppointmentFilters {
  status?: AppointmentStatus[];
  dateFrom?: string;
  dateTo?: string;
  customerId?: string;
  serviceIds?: string[];
  search?: string;
}

export interface AppointmentStats {
  total: number;
  byStatus: Record<AppointmentStatus, number>;
  upcomingCount: number;
  todayCount: number;
  thisWeekRevenue: number;
  thisMonthRevenue: number;
  averageRating: number;
}