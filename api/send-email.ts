/**
 * Send Email API Endpoint
 *
 * Vercel Serverless Function to send email notifications via SendGrid
 *
 * Endpoint: POST /api/send-email
 *
 * Request Body:
 * {
 *   to: string,               // Recipient email address
 *   subject: string,          // Email subject
 *   html: string,             // HTML email content
 *   text?: string,            // Plain text version (optional)
 *   appointmentId?: string,   // Optional appointment ID for logging
 *   customerId?: string       // Optional customer ID for logging
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   messageId: string         // SendGrid message ID
 * }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import sgMail from '@sendgrid/mail';
import { createClient } from '@supabase/supabase-js';

// Validate required environment variables
const sendgridApiKey = process.env.SENDGRID_API_KEY;
const sendgridVerifiedSender = process.env.SENDGRID_VERIFIED_SENDER;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!sendgridApiKey || !sendgridVerifiedSender || !supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    'Missing required environment variables for send-email API. ' +
    'Required: SENDGRID_API_KEY, SENDGRID_VERIFIED_SENDER, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY'
  );
}

// Initialize SendGrid
sgMail.setApiKey(sendgridApiKey);

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
    const { to, subject, html, text, appointmentId, customerId } = req.body;

    // Validate required fields
    if (!to || !subject || !html) {
      return res.status(400).json({
        error: 'Missing required fields: to, subject, html',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return res.status(400).json({
        error: 'Invalid email address format',
      });
    }

    // Send email via SendGrid
    const msg = {
      to: to,
      from: {
        email: sendgridVerifiedSender,
        name: 'Mobile Detailing Pro',
      },
      subject: subject,
      html: html,
      text: text || undefined, // Use plain text if provided
    };

    const [response] = await sgMail.send(msg);
    const messageId = response.headers['x-message-id'] || response.statusCode.toString();

    // Log notification in database
    const { error: logError } = await supabase
      .from('notifications')
      .insert({
        appointment_id: appointmentId || null,
        customer_id: customerId || null,
        type: 'email',
        status: response.statusCode === 202 ? 'sent' : 'failed',
        message: subject,
        sent_at: new Date().toISOString(),
      });

    if (logError) {
      console.error('Error logging notification:', logError);
      // Don't fail the request - email was sent successfully
    }

    return res.status(200).json({
      success: true,
      messageId: messageId,
      status: response.statusCode,
    });
  } catch (error) {
    console.error('Error sending email:', error);

    // Log failed notification
    try {
      await supabase.from('notifications').insert({
        appointment_id: req.body.appointmentId || null,
        customer_id: req.body.customerId || null,
        type: 'email',
        status: 'failed',
        message: req.body.subject || '',
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
      error: 'An unexpected error occurred while sending email',
    });
  }
}
