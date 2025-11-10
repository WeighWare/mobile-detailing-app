/**
 * Send SMS API Endpoint
 *
 * Vercel Serverless Function to send SMS notifications via Twilio
 *
 * Endpoint: POST /api/send-sms
 *
 * Request Body:
 * {
 *   to: string,               // Phone number (E.164 format: +1234567890)
 *   message: string,          // SMS message content (max 160 chars recommended)
 *   appointmentId?: string,   // Optional appointment ID for logging
 *   customerId?: string       // Optional customer ID for logging
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   sid: string,              // Twilio message SID
 *   status: string            // Message status (queued, sent, failed, etc.)
 * }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import twilio from 'twilio';
import { createClient } from '@supabase/supabase-js';

// Validate required environment variables
const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber || !supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    'Missing required environment variables for send-sms API. ' +
    'Required: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY'
  );
}

// Initialize Twilio client
const twilioClient = twilio(twilioAccountSid, twilioAuthToken);

// Initialize Supabase admin client (for logging)
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { to, message, appointmentId, customerId, purpose } = req.body;

    // Validate required fields
    if (!to || !message) {
      return res.status(400).json({
        error: 'Missing required fields: to, message',
      });
    }

    // Validate phone number format (basic check for E.164)
    if (!to.match(/^\+[1-9]\d{1,14}$/)) {
      return res.status(400).json({
        error: 'Invalid phone number format. Use E.164 format: +1234567890',
      });
    }

    // Send SMS via Twilio
    const twilioMessage = await twilioClient.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: to,
    });

    // Log notification in database
    const { error: logError } = await supabase
      .from('notifications')
      .insert({
        appointment_id: appointmentId || null,
        customer_id: customerId || null,
        type: 'sms',
        purpose: purpose || 'reminder', // Notification purpose (e.g., 'reminder', 'confirmation', 'status_change')
        status: twilioMessage.status === 'queued' || twilioMessage.status === 'sent' ? 'sent' : 'failed',
        message: message,
        sent_at: new Date().toISOString(),
      });

    if (logError) {
      console.error('Error logging notification:', logError);
      // Don't fail the request - SMS was sent successfully
    }

    return res.status(200).json({
      success: true,
      sid: twilioMessage.sid,
      status: twilioMessage.status,
    });
  } catch (error) {
    console.error('Error sending SMS:', error);

    // Log failed notification
    try {
      await supabase.from('notifications').insert({
        appointment_id: req.body.appointmentId || null,
        customer_id: req.body.customerId || null,
        type: 'sms',
        purpose: req.body.purpose || 'reminder',
        status: 'failed',
        message: req.body.message || '',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });
    } catch (logError) {
      console.error('Error logging failed notification:', logError);
    }

    if (error instanceof Error) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred while sending SMS',
    });
  }
}
