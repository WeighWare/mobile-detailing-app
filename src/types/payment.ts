import { BaseEntity, PaymentStatus } from './common';

export interface Payment extends BaseEntity {
  appointmentId: string;
  customerId?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: 'card' | 'cash' | 'bank_transfer' | 'loyalty_points';
  
  // Payment Provider Details
  stripePaymentIntentId?: string;
  stripeCustomerId?: string;
  invoiceUrl?: string;
  receiptUrl?: string;
  
  // Transaction Details
  subtotal: number;
  tax: number;
  discount: number;
  tip?: number;
  depositAmount?: number;
  remainingAmount?: number;
  
  // Refund Information
  refundAmount?: number;
  refundReason?: string;
  refundedAt?: string;
  
  // Metadata
  description?: string;
  metadata?: Record<string, any>;
  failureReason?: string;
  processedAt?: string;
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  clientSecret: string;
  status: string;
}

export interface RefundRequest {
  paymentId: string;
  amount: number;
  reason: string;
  refundType: 'full' | 'partial';
}

export interface PaymentStats {
  totalProcessed: number;
  totalRefunded: number;
  successRate: number;
  averageTransactionAmount: number;
  paymentMethodBreakdown: Record<Payment['method'], number>;
  monthlyRevenue: number[];
}