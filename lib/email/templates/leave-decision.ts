/**
 * Leave Request Decision Email Template
 */

import { baseEmailTemplate } from './base';

interface LeaveDecisionData {
  userName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  status: 'approved' | 'rejected';
  approverName?: string;
  reason?: string;
  appUrl: string;
}

export function leaveDecisionTemplate(data: LeaveDecisionData, locale: 'it' | 'fr' = 'it'): { subject: string; html: string } {
  const translations = {
    it: {
      approved: {
        subject: '✅ Richiesta di assenza approvata',
        title: 'La tua richiesta è stata approvata!',
        emoji: '✅',
        message: 'Buone notizie! La tua richiesta di assenza è stata approvata.'
      },
      rejected: {
        subject: '❌ Richiesta di assenza rifiutata',
        title: 'La tua richiesta è stata rifiutata',
        emoji: '❌',
        message: 'Ci dispiace, ma la tua richiesta di assenza è stata rifiutata.'
      },
      greeting: `Ciao ${data.userName},`,
      typeLabel: '<strong>Tipo:</strong>',
      periodLabel: '<strong>Periodo:</strong>',
      approverLabel: '<strong>Approvato da:</strong>',
      reasonLabel: '<strong>Motivazione:</strong>',
      ctaButton: 'Vedi le tue richieste',
      needHelp: 'Per maggiori informazioni, contatta il tuo responsabile.'
    },
    fr: {
      approved: {
        subject: '✅ Demande d\'absence approuvée',
        title: 'Votre demande a été approuvée !',
        emoji: '✅',
        message: 'Bonne nouvelle ! Votre demande d\'absence a été approuvée.'
      },
      rejected: {
        subject: '❌ Demande d\'absence refusée',
        title: 'Votre demande a été refusée',
        emoji: '❌',
        message: 'Nous sommes désolés, mais votre demande d\'absence a été refusée.'
      },
      greeting: `Bonjour ${data.userName},`,
      typeLabel: '<strong>Type :</strong>',
      periodLabel: '<strong>Période :</strong>',
      approverLabel: '<strong>Approuvé par :</strong>',
      reasonLabel: '<strong>Motif :</strong>',
      ctaButton: 'Voir mes demandes',
      needHelp: 'Pour plus d\'informations, contactez votre responsable.'
    }
  };

  const t = translations[locale];
  const statusTexts = t[data.status];

  const content = `
    <p>${t.greeting}</p>
    <h2 style="color: ${data.status === 'approved' ? '#10b981' : '#ef4444'};">
      ${statusTexts.emoji} ${statusTexts.title}
    </h2>
    <p>${statusTexts.message}</p>
    
    <div class="info-box">
      <p>${t.typeLabel} ${data.leaveType}</p>
      <p>${t.periodLabel} ${data.startDate} - ${data.endDate}</p>
      ${data.approverName ? `<p>${t.approverLabel} ${data.approverName}</p>` : ''}
      ${data.reason ? `<p>${t.reasonLabel} ${data.reason}</p>` : ''}
    </div>

    <div style="text-align: center;">
      <a href="${data.appUrl}/my-shifts" class="button">${t.ctaButton}</a>
    </div>

    <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
      ${t.needHelp}
    </p>
  `;

  return {
    subject: statusTexts.subject,
    html: baseEmailTemplate({
      title: statusTexts.subject,
      content,
      locale
    })
  };
}
