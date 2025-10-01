/**
 * Shift Assignment Change Email Template
 */

import { baseEmailTemplate } from './base';

interface ShiftAssignmentData {
  userName: string;
  shiftDate: string;
  shiftStart: string;
  shiftEnd: string;
  locationName: string;
  roleName?: string;
  changeType: 'assigned' | 'modified' | 'cancelled';
  appUrl: string;
}

export function shiftAssignmentTemplate(data: ShiftAssignmentData, locale: 'it' | 'fr' = 'it'): { subject: string; html: string } {
  const translations = {
    it: {
      assigned: {
        subject: '✅ Nuovo turno assegnato',
        title: 'Hai ricevuto un nuovo turno!',
        emoji: '✅'
      },
      modified: {
        subject: '🔄 Turno modificato',
        title: 'Il tuo turno è stato modificato',
        emoji: '🔄'
      },
      cancelled: {
        subject: '❌ Turno cancellato',
        title: 'Il tuo turno è stato cancellato',
        emoji: '❌'
      },
      greeting: `Ciao ${data.userName},`,
      dateLabel: '<strong>Data:</strong>',
      timeLabel: '<strong>Orario:</strong>',
      locationLabel: '<strong>Location:</strong>',
      roleLabel: '<strong>Ruolo:</strong>',
      ctaButton: 'Vedi dettagli turno',
      needHelp: 'Se hai domande o necessiti di modifiche, contatta il tuo responsabile.'
    },
    fr: {
      assigned: {
        subject: '✅ Nouveau service assigné',
        title: 'Vous avez reçu un nouveau service !',
        emoji: '✅'
      },
      modified: {
        subject: '🔄 Service modifié',
        title: 'Votre service a été modifié',
        emoji: '🔄'
      },
      cancelled: {
        subject: '❌ Service annulé',
        title: 'Votre service a été annulé',
        emoji: '❌'
      },
      greeting: `Bonjour ${data.userName},`,
      dateLabel: '<strong>Date :</strong>',
      timeLabel: '<strong>Horaire :</strong>',
      locationLabel: '<strong>Site :</strong>',
      roleLabel: '<strong>Rôle :</strong>',
      ctaButton: 'Voir les détails',
      needHelp: 'Si vous avez des questions ou besoin de modifications, contactez votre responsable.'
    }
  };

  const t = translations[locale];
  const changeTexts = t[data.changeType];

  const content = `
    <p>${t.greeting}</p>
    <h2 style="color: #667eea;">${changeTexts.emoji} ${changeTexts.title}</h2>
    
    <div class="info-box">
      <p>${t.dateLabel} ${data.shiftDate}</p>
      <p>${t.timeLabel} ${data.shiftStart} - ${data.shiftEnd}</p>
      <p>${t.locationLabel} ${data.locationName}</p>
      ${data.roleName ? `<p>${t.roleLabel} ${data.roleName}</p>` : ''}
    </div>

    ${data.changeType !== 'cancelled' ? `
      <div style="text-align: center;">
        <a href="${data.appUrl}/my-shifts" class="button">${t.ctaButton}</a>
      </div>
    ` : ''}

    <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
      ${t.needHelp}
    </p>
  `;

  return {
    subject: changeTexts.subject,
    html: baseEmailTemplate({
      title: changeTexts.subject,
      content,
      locale
    })
  };
}
