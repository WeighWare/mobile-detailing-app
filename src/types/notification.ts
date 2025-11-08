import { BaseEntity, NotificationStatus } from './common';

export interface NotificationLog extends BaseEntity {
  appointmentId: string;
  customerId?: string;
  type: 'reminder' | 'status_change' | 'delay' | 'confirmation' | 'cancellation' | 'payment';
  method: 'sms' | 'email' | 'both';
  status: NotificationStatus;
  sentAt: string;
  reminderHours?: number;
  retryCount: number;
  errorMessage?: string;
  content?: {
    subject?: string;
    body: string;
  };
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: NotificationLog['type'];
  method: NotificationLog['method'];
  subject?: string;
  body: string;
  variables: string[];
  isActive: boolean;
}

export interface NotificationStats {
  total: number;
  sent: number;
  failed: number;
  pending: number;
  byType: Record<NotificationLog['type'], number>;
  byMethod: Record<'sms' | 'email', number>;
  deliveryRate: number;
  averageDeliveryTime: number;
}

export interface ReminderSchedule {
  appointmentId: string;
  reminderTimes: Date[];
  customerPreferences: {
    sms: boolean;
    email: boolean;
    reminders: boolean;
  };
  isScheduled: boolean;
}