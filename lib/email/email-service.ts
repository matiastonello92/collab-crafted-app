/**
 * Email Service - Orchestrates email sending with logging and user preferences
 */

import { createClient } from '@supabase/supabase-js';

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
  private supabase: ReturnType<typeof createClient>;

  constructor() {
    // Initialize Supabase client for Edge Function calls
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    console.log('📧 [EMAIL SERVICE] Using Supabase Edge Functions for email');
  }

  /**
   * Send email via Supabase Edge Function
   */
  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    const { to, subject, html, emailType, userId, orgId, metadata } = options;

    try {
      console.log(`📧 [EMAIL SERVICE] Sending ${emailType} email via Edge Function`);

      const { data, error } = await this.supabase.functions.invoke(
        'send-notification-email',
        {
          body: {
            to,
            subject,
            html,
            emailType,
            userId,
            orgId,
            metadata,
          },
        }
      );

      if (error) {
        console.error('❌ [EMAIL SERVICE] Edge Function error:', error);
        return false;
      }

      if (!data?.success) {
        console.log(`📧 [EMAIL SERVICE] Email not sent: ${data?.reason || 'Unknown reason'}`);
        return false;
      }

      console.log(`✅ [EMAIL SERVICE] Email sent successfully: ${data.messageId}`);
      return true;
    } catch (error) {
      console.error('❌ [EMAIL SERVICE] Exception:', error);
      return false;
    }
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
