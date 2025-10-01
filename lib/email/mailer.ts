/**
 * Mailer Interface - Abstract email sending functionality
 * Allows easy switching between providers (Resend, SMTP, etc.)
 */

export interface EmailPayload {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
}

export interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface IMailer {
  sendEmail(payload: EmailPayload): Promise<EmailResponse>;
}

/**
 * Placeholder Mailer - logs emails instead of sending
 * Use for development or when no provider is configured
 */
export class PlaceholderMailer implements IMailer {
  async sendEmail(payload: EmailPayload): Promise<EmailResponse> {
    console.log('📧 [PLACEHOLDER MAILER] Email not sent (no provider configured):', {
      to: payload.to,
      subject: payload.subject,
      preview: payload.html?.substring(0, 100) || payload.text?.substring(0, 100)
    });
    
    return {
      success: true,
      messageId: `placeholder-${Date.now()}`,
    };
  }
}
