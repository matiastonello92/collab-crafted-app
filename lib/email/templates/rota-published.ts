/**
 * Rota Published Email Template
 */

import { baseEmailTemplate } from './base';

interface RotaPublishedData {
  userName: string;
  weekStart: string; // e.g., "2024-01-15"
  weekEnd: string;
  locationName: string;
  shiftsCount: number;
  appUrl: string;
}

export function rotaPublishedTemplate(data: RotaPublishedData, locale: 'it' | 'fr' = 'it'): { subject: string; html: string } {
  const translations = {
    it: {
      subject: `📅 Turni pubblicati per la settimana ${data.weekStart}`,
      greeting: `Ciao ${data.userName},`,
      mainText: `Il planning per la settimana dal <strong>${data.weekStart}</strong> al <strong>${data.weekEnd}</strong> è stato pubblicato!`,
      locationInfo: `<strong>Location:</strong> ${data.locationName}`,
      shiftsInfo: `Hai <strong>${data.shiftsCount}</strong> ${data.shiftsCount === 1 ? 'turno assegnato' : 'turni assegnati'} per questa settimana.`,
      ctaButton: 'Vedi i tuoi turni',
      reminderTitle: '💡 Ricordati di:',
      reminders: [
        'Controllare gli orari e confermare la tua presenza',
        'Segnalare eventuali problemi al tuo responsabile',
        'Rispettare gli orari di inizio e fine turno'
      ]
    },
    fr: {
      subject: `📅 Planning publié pour la semaine du ${data.weekStart}`,
      greeting: `Bonjour ${data.userName},`,
      mainText: `Le planning pour la semaine du <strong>${data.weekStart}</strong> au <strong>${data.weekEnd}</strong> a été publié !`,
      locationInfo: `<strong>Site :</strong> ${data.locationName}`,
      shiftsInfo: `Vous avez <strong>${data.shiftsCount}</strong> ${data.shiftsCount === 1 ? 'service assigné' : 'services assignés'} pour cette semaine.`,
      ctaButton: 'Voir mes services',
      reminderTitle: '💡 N\'oubliez pas de :',
      reminders: [
        'Vérifier les horaires et confirmer votre présence',
        'Signaler tout problème à votre responsable',
        'Respecter les horaires de début et fin de service'
      ]
    }
  };

  const t = translations[locale];

  const content = `
    <p>${t.greeting}</p>
    <p>${t.mainText}</p>
    
    <div class="info-box">
      <p>${t.locationInfo}</p>
      <p>${t.shiftsInfo}</p>
    </div>

    <div style="text-align: center;">
      <a href="${data.appUrl}/my-shifts" class="button">${t.ctaButton}</a>
    </div>

    <h3>${t.reminderTitle}</h3>
    <ul>
      ${t.reminders.map(r => `<li>${r}</li>`).join('')}
    </ul>
  `;

  return {
    subject: t.subject,
    html: baseEmailTemplate({
      title: t.subject,
      content,
      locale
    })
  };
}
