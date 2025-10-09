/**
 * Resend Mailer Implementation
 * Requires: RESEND_API_KEY environment variable
 */

import { IMailer, EmailPayload, EmailResponse } from './mailer';

export class ResendMailer implements IMailer {
  private apiKey: string;
  private defaultFrom: string;

  constructor(apiKey: string, defaultFrom: string = 'Klyra Shifts <noreply@managementpn.services>') {
    this.apiKey = apiKey;
    this.defaultFrom = defaultFrom;
  }

  async sendEmail(payload: EmailPayload): Promise<EmailResponse> {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: payload.from || this.defaultFrom,
          to: Array.isArray(payload.to) ? payload.to : [payload.to],
          subject: payload.subject,
          html: payload.html,
          text: payload.text,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('❌ [RESEND] Email send failed:', error);
        return {
          success: false,
          error: `Resend API error: ${error}`,
        };
      }

      const data = await response.json();
      console.log('✅ [RESEND] Email sent successfully:', data.id);
      
      return {
        success: true,
        messageId: data.id,
      };
    } catch (error) {
      console.error('❌ [RESEND] Exception:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
