/**
 * Email Service - Orchestrates email sending with logging and user preferences
 */

import { createClient } from '@supabase/supabase-js';
import { IMailer, EmailPayload } from './mailer';
import { PlaceholderMailer } from './mailer';
import { ResendMailer } from './resend-mailer';

export type EmailType = 'rota_published' | 'shift_assignment_change' | 'leave_decision';

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  emailType: EmailType;
  userId?: string;
  orgId: string;
  metadata?: Record<string, any>;
}

export class EmailService {
  private mailer: IMailer;
  private supabase: ReturnType<typeof createClient>;

  constructor() {
    // Initialize mailer based on environment
    const resendApiKey = process.env.RESEND_API_KEY;
    
    if (resendApiKey) {
      this.mailer = new ResendMailer(resendApiKey);
      console.log('📧 [EMAIL SERVICE] Using Resend mailer');
    } else {
      this.mailer = new PlaceholderMailer();
      console.warn('⚠️ [EMAIL SERVICE] No RESEND_API_KEY found, using placeholder mailer');
    }

    // Initialize Supabase admin client for logging
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  }

  /**
   * Check if user has opted out of this email type
   */
  private async checkUserPreferences(userId: string, emailType: EmailType): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('email_preferences')
        .eq('id', userId)
        .single();

      if (error || !data) {
        // Default to sending if we can't check preferences
        return true;
      }

      const prefs = (data as any).email_preferences as Record<string, boolean> || {};
      return prefs[emailType] !== false; // Default true if not set
    } catch (error) {
      console.error('Error checking email preferences:', error);
      return true; // Default to sending on error
    }
  }

  /**
   * Log email to database for audit trail
   */
  private async logEmail(
    recipientEmail: string,
    emailType: EmailType,
    subject: string,
    status: 'pending' | 'sent' | 'failed',
    orgId: string,
    userId?: string,
    providerId?: string,
    errorMessage?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await (this.supabase.from('email_logs') as any).insert({
        org_id: orgId,
        user_id: userId,
        recipient_email: recipientEmail,
        email_type: emailType,
        subject,
        status,
        provider_id: providerId,
        error_message: errorMessage,
        metadata: metadata || {},
        sent_at: status === 'sent' ? new Date().toISOString() : null,
      });
    } catch (error) {
      console.error('Failed to log email:', error);
      // Don't throw - logging shouldn't block email sending
    }
  }

  /**
   * Send email with preference checking and logging
   */
  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    const { to, subject, html, emailType, userId, orgId, metadata } = options;
    const recipientEmail = Array.isArray(to) ? to[0] : to;

    // Check user preferences (if userId provided)
    if (userId) {
      const shouldSend = await this.checkUserPreferences(userId, emailType);
      if (!shouldSend) {
        console.log(`📧 [EMAIL SERVICE] User ${userId} has opted out of ${emailType}`);
        await this.logEmail(recipientEmail, emailType, subject, 'pending', orgId, userId, undefined, 'User opted out', metadata);
        return false;
      }
    }

    // Send email
    const result = await this.mailer.sendEmail({ to, subject, html });

    // Log result
    await this.logEmail(
      recipientEmail,
      emailType,
      subject,
      result.success ? 'sent' : 'failed',
      orgId,
      userId,
      result.messageId,
      result.error,
      metadata
    );

    return result.success;
  }

  /**
   * Send bulk emails (for rota published to multiple users)
   */
  async sendBulkEmails(
    recipients: Array<{ email: string; userId: string }>,
    subject: string,
    html: string,
    emailType: EmailType,
    orgId: string,
    metadata?: Record<string, any>
  ): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (const recipient of recipients) {
      const success = await this.sendEmail({
        to: recipient.email,
        subject,
        html,
        emailType,
        userId: recipient.userId,
        orgId,
        metadata,
      });

      if (success) sent++;
      else failed++;
    }

    return { sent, failed };
  }
}

// Singleton instance
let emailServiceInstance: EmailService | null = null;

export function getEmailService(): EmailService {
  if (!emailServiceInstance) {
    emailServiceInstance = new EmailService();
  }
  return emailServiceInstance;
}
