/**
 * Database Type Definitions
 *
 * This file contains TypeScript type definitions for your Supabase database schema.
 * These types ensure type safety when interacting with the database.
 *
 * To auto-generate these types from your Supabase schema, run:
 * npx supabase gen types typescript --project-id your-project-id > src/types/database.ts
 *
 * For now, we're manually defining the types based on the schema in DEPLOYMENT.md
 */

import type { Address } from './common';
import type { BusinessHours } from './business';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      customers: {
        Row: {
          id: string;
          email: string;
          name: string;
          phone: string | null;
          address: Address | null; // Structured address data with type safety
          loyalty_points: number;
          notification_preferences: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          name: string;
          phone?: string | null;
          address?: Address | null; // Structured address data with type safety
          loyalty_points?: number;
          notification_preferences?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          phone?: string | null;
          address?: Address | null; // Structured address data with type safety
          loyalty_points?: number;
          notification_preferences?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      services: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          price: number;
          duration_minutes: number;
          category: string | null;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          price: number;
          duration_minutes: number;
          category?: string | null;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          price?: number;
          duration_minutes?: number;
          category?: string | null;
          active?: boolean;
          created_at?: string;
        };
      };
      appointments: {
        Row: {
          id: string;
          customer_id: string | null;
          appointment_date: string;
          status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
          location: Json | null;  // Changed to JSONB
          vehicle_info: Json | null;
          notes: string | null;
          total_price: number | null;
          payment_status: 'pending' | 'paid' | 'refunded' | 'failed' | null;
          payment_intent_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id?: string | null;
          appointment_date: string;
          status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
          location?: Json | null;
          vehicle_info?: Json | null;
          notes?: string | null;
          total_price?: number | null;
          payment_status?: 'pending' | 'paid' | 'refunded' | 'failed' | null;
          payment_intent_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string | null;
          appointment_date?: string;
          status?: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
          location?: Json | null;
          vehicle_info?: Json | null;
          notes?: string | null;
          total_price?: number | null;
          payment_status?: 'pending' | 'paid' | 'refunded' | 'failed' | null;
          payment_intent_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      appointment_services: {
        Row: {
          id: string;
          appointment_id: string;
          service_id: string;
          price_at_booking: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          appointment_id: string;
          service_id: string;
          price_at_booking: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          appointment_id?: string;
          service_id?: string;
          price_at_booking?: number;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          appointment_id: string | null;
          customer_id: string | null;
          type: 'sms' | 'email';
          status: 'pending' | 'sent' | 'failed';
          message: string;
          sent_at: string | null;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          appointment_id?: string | null;
          customer_id?: string | null;
          type: 'sms' | 'email';
          status: 'pending' | 'sent' | 'failed';
          message: string;
          sent_at?: string | null;
          error_message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          appointment_id?: string | null;
          customer_id?: string | null;
          type?: 'sms' | 'email';
          status?: 'pending' | 'sent' | 'failed';
          message?: string;
          sent_at?: string | null;
          error_message?: string | null;
          created_at?: string;
        };
      };
      business_settings: {
        Row: {
          id: string;
          user_id: string;
          business_name: string | null;
          business_address: Address | null; // Type-safe business address
          business_phone: string | null;
          business_email: string | null;
          operating_hours: BusinessHours; // Type-safe business hours
          service_area: Json | null;
          default_buffer_time: number;
          auto_confirm_bookings: boolean;
          require_deposit: boolean;
          deposit_percentage: number;
          cancellation_policy: string | null;
          terms_and_conditions: string | null;
          tax_rate: number;
          currency: string;
          timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          business_name?: string | null;
          business_address?: Address | null; // Type-safe business address
          business_phone?: string | null;
          business_email?: string | null;
          operating_hours?: BusinessHours; // Type-safe business hours
          service_area?: Json | null;
          default_buffer_time?: number;
          auto_confirm_bookings?: boolean;
          require_deposit?: boolean;
          deposit_percentage?: number;
          cancellation_policy?: string | null;
          terms_and_conditions?: string | null;
          tax_rate?: number;
          currency?: string;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          business_name?: string | null;
          business_address?: Address | null; // Type-safe business address
          business_phone?: string | null;
          business_email?: string | null;
          operating_hours?: BusinessHours; // Type-safe business hours
          service_area?: Json | null;
          default_buffer_time?: number;
          auto_confirm_bookings?: boolean;
          require_deposit?: boolean;
          deposit_percentage?: number;
          cancellation_policy?: string | null;
          terms_and_conditions?: string | null;
          tax_rate?: number;
          currency?: string;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
