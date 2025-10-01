/**
 * Base Email Template - Klyra branding
 */

export interface BaseTemplateProps {
  title: string;
  content: string;
  locale: 'it' | 'fr';
}

export function baseEmailTemplate({ title, content, locale }: BaseTemplateProps): string {
  const footerText = locale === 'it' 
    ? 'Questo è un messaggio automatico. Per modificare le tue preferenze email, accedi al tuo profilo.'
    : 'Ceci est un message automatique. Pour modifier vos préférences email, accédez à votre profil.';

  return `
<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background-color: #f9fafb;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 32px 24px;
      text-align: center;
      color: #ffffff;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
    }
    .header .logo {
      font-size: 32px;
      margin-bottom: 8px;
    }
    .content {
      padding: 32px 24px;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background: #667eea;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 16px 0;
    }
    .button:hover {
      background: #5568d3;
    }
    .footer {
      padding: 24px;
      background: #f9fafb;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
      border-top: 1px solid #e5e7eb;
    }
    .info-box {
      background: #f3f4f6;
      border-left: 4px solid #667eea;
      padding: 16px;
      margin: 16px 0;
      border-radius: 4px;
    }
    .info-box strong {
      color: #374151;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🐑</div>
      <h1>Klyra Shifts</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>${footerText}</p>
      <p>&copy; ${new Date().getFullYear()} Klyra Shifts</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
