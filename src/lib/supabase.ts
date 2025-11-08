/**
 * Supabase Client Configuration
 *
 * This module provides the Supabase client instance for database operations,
 * authentication, and real-time subscriptions.
 *
 * IMPORTANT:
 * - Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env.local
 * - The anon key is safe to expose in the frontend (it's rate-limited and restricted by RLS)
 * - Never expose the SERVICE_ROLE_KEY in frontend code (use it only in API routes)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

// Environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate required environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env.local file.'
  );
}

/**
 * Supabase client instance
 *
 * This client:
 * - Handles authentication automatically
 * - Respects Row Level Security (RLS) policies
 * - Provides real-time subscriptions
 * - Uses the anon key (safe for frontend)
 */
export const supabase: SupabaseClient<Database> = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      // Persist auth state in localStorage
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // Storage key for auth tokens
      storageKey: 'mobile-detailing-auth',
    },
    // Real-time configuration
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

/**
 * Helper function to check if Supabase is properly configured
 */
export const isSupabaseConfigured = (): boolean => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};

/**
 * Helper function to get the current user
 */
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Error getting current user:', error);
    return null;
  }
  return user;
};

/**
 * Helper function to check if user is authenticated
 */
export const isAuthenticated = async (): Promise<boolean> => {
  const { data: { session } } = await supabase.auth.getSession();
  return Boolean(session);
};

/**
 * Helper function to sign out
 */
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

/**
 * Database type definitions
 * These will be auto-generated from your Supabase schema
 * For now, we'll export a basic structure
 */
export type Tables = Database['public']['Tables'];
export type Appointment = Tables['appointments']['Row'];
export type Customer = Tables['customers']['Row'];
export type Service = Tables['services']['Row'];
export type Notification = Tables['notifications']['Row'];

// Export everything
export default supabase;
