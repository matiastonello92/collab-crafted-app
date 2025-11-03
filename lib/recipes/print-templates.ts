/**
 * HTML Templates per stampa ricette
 * Pattern: riusa stile export inventari con CSS inline A4
 */

import { formatQuantity, formatTime } from './scaling';

export interface PrintRecipeData {
  id: string;
  title: string;
  description?: string;
  servings: number;
  prep_time_minutes: number;
  cook_time_minutes: number;
  photo_url?: string;
  created_by_name?: string;
  created_at: string;
  ingredients: Array<{
    id: string;
    quantity: number;
    unit: string;
    item_name_snapshot: string;
    is_optional?: boolean;
    notes?: string;
    sub_recipe?: {
      title: string;
      servings: number;
    };
  }>;
  steps: Array<{
    step_number: number;
    instruction: string;
    photo_url?: string;
  }>;
  allergens?: string[];
  service_notes?: Array<{
    note: string;
    author_name?: string;
    created_at: string;
  }>;
}

const baseStyles = `
  <style>
    @page {
      size: A4;
      margin: 15mm;
    }
    @media print {
      body { margin: 0; }
      .no-print { display: none !important; }
      .page-break { page-break-after: always; }
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #1a1a1a;
      background: white;
    }
    .container {
      max-width: 210mm;
      margin: 0 auto;
      padding: 10mm;
    }
    h1 {
      font-size: 24pt;
      font-weight: 700;
      margin-bottom: 8pt;
      color: #000;
    }
    h2 {
      font-size: 14pt;
      font-weight: 600;
      margin: 16pt 0 8pt 0;
      color: #333;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 4pt;
    }
    h3 {
      font-size: 12pt;
      font-weight: 600;
      margin: 12pt 0 6pt 0;
      color: #555;
    }
    .header {
      border-bottom: 3px solid #000;
      padding-bottom: 10pt;
      margin-bottom: 16pt;
    }
    .meta {
      display: flex;
      gap: 16pt;
      margin: 8pt 0;
      font-size: 10pt;
      color: #666;
    }
    .meta-item {
      display: flex;
      align-items: center;
      gap: 4pt;
    }
    .photo {
      width: 100%;
      max-height: 120mm;
      object-fit: cover;
      border-radius: 4pt;
      margin: 12pt 0;
    }
    .ingredients-list {
      list-style: none;
      margin: 8pt 0;
    }
    .ingredients-list li {
      padding: 6pt 0;
      border-bottom: 1px solid #f3f4f6;
      display: flex;
      align-items: flex-start;
      gap: 8pt;
    }
    .ingredient-qty {
      font-weight: 600;
      min-width: 60pt;
      color: #000;
    }
    .ingredient-name {
      flex: 1;
      color: #333;
    }
    .ingredient-optional {
      font-size: 9pt;
      color: #999;
      font-style: italic;
    }
    .ingredient-notes {
      font-size: 9pt;
      color: #666;
      margin-top: 2pt;
      padding-left: 68pt;
    }
    .checkbox {
      width: 12pt;
      height: 12pt;
      border: 1.5pt solid #666;
      border-radius: 2pt;
      margin-right: 4pt;
      flex-shrink: 0;
    }
    .steps-list {
      counter-reset: step-counter;
      list-style: none;
      margin: 8pt 0;
    }
    .steps-list li {
      counter-increment: step-counter;
      padding: 10pt 0;
      border-bottom: 1px solid #f3f4f6;
      position: relative;
      padding-left: 32pt;
    }
    .steps-list li::before {
      content: counter(step-counter);
      position: absolute;
      left: 0;
      top: 10pt;
      background: #000;
      color: white;
      width: 24pt;
      height: 24pt;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 10pt;
    }
    .allergen-badge {
      display: inline-block;
      padding: 3pt 8pt;
      background: #fef3c7;
      color: #92400e;
      border: 1pt solid #fcd34d;
      border-radius: 4pt;
      font-size: 9pt;
      font-weight: 600;
      margin-right: 6pt;
      margin-bottom: 4pt;
    }
    .service-note {
      background: #fef2f2;
      border-left: 4pt solid #dc2626;
      padding: 10pt;
      margin: 8pt 0;
      border-radius: 4pt;
    }
    .service-note-text {
      color: #7f1d1d;
      font-weight: 500;
      margin-bottom: 4pt;
    }
    .service-note-meta {
      font-size: 9pt;
      color: #991b1b;
    }
    .footer {
      margin-top: 20pt;
      padding-top: 10pt;
      border-top: 1px solid #e5e7eb;
      font-size: 9pt;
      color: #999;
      text-align: center;
    }
    .alert-box {
      background: #fee;
      border: 2pt solid #f00;
      padding: 12pt;
      margin: 12pt 0;
      border-radius: 4pt;
    }
    .alert-title {
      font-weight: 700;
      color: #c00;
      margin-bottom: 6pt;
      font-size: 12pt;
    }
  </style>
`;

export function generateFullRecipePrintTemplate(
  data: PrintRecipeData,
  targetServings: number,
  isDraft: boolean = false
): string {
  const totalTime = data.prep_time_minutes + data.cook_time_minutes;
  const scaleFactor = data.servings > 0 ? targetServings / data.servings : 1;

  return `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ricetta: ${data.title}</title>
  ${baseStyles}
  ${isDraft ? `
    <style>
      body::before {
        content: "BOZZA";
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-45deg);
        font-size: 120pt;
        font-weight: 900;
        color: rgba(220, 38, 38, 0.08);
        z-index: 1;
        pointer-events: none;
        letter-spacing: 20pt;
      }
      .container {
        position: relative;
        z-index: 2;
      }
    </style>
  ` : ''}
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${data.title}</h1>
      ${data.description ? `<p style="color: #666; margin-top: 6pt;">${data.description}</p>` : ''}
      <div class="meta">
        <div class="meta-item">
          <strong>Porzioni:</strong> ${targetServings}
          ${scaleFactor !== 1 ? ` <span style="color: #999;">(originale: ${data.servings}, scala ${scaleFactor.toFixed(2)}x)</span>` : ''}
        </div>
        <div class="meta-item">
          <strong>Tempo totale:</strong> ${formatTime(totalTime)}
        </div>
        <div class="meta-item">
          <strong>Prep:</strong> ${formatTime(data.prep_time_minutes)}
        </div>
        <div class="meta-item">
          <strong>Cottura:</strong> ${formatTime(data.cook_time_minutes)}
        </div>
      </div>
    </div>

    ${data.photo_url ? `<img src="${data.photo_url}" alt="${data.title}" class="photo" />` : ''}

    ${data.allergens && data.allergens.length > 0 ? `
      <div class="alert-box">
        <div class="alert-title">⚠️ ALLERGENI</div>
        <div>
          ${data.allergens.map(a => `<span class="allergen-badge">${a}</span>`).join('')}
        </div>
      </div>
    ` : ''}

    ${data.service_notes && data.service_notes.length > 0 ? `
      <h2>📌 Note di Servizio</h2>
      ${data.service_notes.map(note => `
        <div class="service-note">
          <div class="service-note-text">${note.note}</div>
          <div class="service-note-meta">
            ${note.author_name || 'Autore'} • ${new Date(note.created_at).toLocaleDateString('it-IT')}
          </div>
        </div>
      `).join('')}
    ` : ''}

    <h2>🥘 Ingredienti</h2>
    <ul class="ingredients-list">
      ${data.ingredients.map(ing => {
        const scaledQty = ing.quantity * scaleFactor;
        return `
          <li>
            <span class="ingredient-qty">${formatQuantity(scaledQty)} ${ing.unit}</span>
            <span class="ingredient-name">
              ${ing.item_name_snapshot}
              ${ing.is_optional ? '<span class="ingredient-optional">(opzionale)</span>' : ''}
              ${ing.sub_recipe ? `<br/><small style="color: #999;">Sub-ricetta: ${ing.sub_recipe.title} (${ing.sub_recipe.servings} porzioni)</small>` : ''}
            </span>
            ${ing.notes ? `<div class="ingredient-notes">💡 ${ing.notes}</div>` : ''}
          </li>
        `;
      }).join('')}
    </ul>

    <h2>👨‍🍳 Procedimento</h2>
    <ol class="steps-list">
      ${data.steps.map(step => `
        <li>
          ${step.instruction}
          ${step.photo_url ? `<br/><img src="${step.photo_url}" style="width: 100%; max-width: 400pt; margin-top: 8pt; border-radius: 4pt;" alt="Step ${step.step_number}" />` : ''}
        </li>
      `).join('')}
    </ol>

    <div class="footer">
      <p>Ricetta creata da ${data.created_by_name || 'Klyra'} • ${new Date(data.created_at).toLocaleDateString('it-IT')}</p>
      <p style="margin-top: 4pt;">Stampato il ${new Date().toLocaleDateString('it-IT')} alle ${new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</p>
    </div>
  </div>

  <script>
    window.onload = function() {
      // Auto-print dopo 500ms per dare tempo al caricamento immagini
      setTimeout(function() {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>
  `.trim();
}

export function generateStationRecipePrintTemplate(
  data: PrintRecipeData,
  targetServings: number,
  isDraft: boolean = false
): string {
  const totalTime = data.prep_time_minutes + data.cook_time_minutes;
  const scaleFactor = data.servings > 0 ? targetServings / data.servings : 1;

  return `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Scheda Stazione: ${data.title}</title>
  ${baseStyles}
  ${isDraft ? `
    <style>
      body::before {
        content: "BOZZA";
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-45deg);
        font-size: 120pt;
        font-weight: 900;
        color: rgba(220, 38, 38, 0.08);
        z-index: 1;
        pointer-events: none;
        letter-spacing: 20pt;
      }
      .container {
        position: relative;
        z-index: 2;
      }
    </style>
  ` : ''}
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${data.title}</h1>
      <div class="meta">
        <div class="meta-item">
          <strong>Porzioni:</strong> ${targetServings}
          ${scaleFactor !== 1 ? ` <span style="color: #999;">(scala ${scaleFactor.toFixed(2)}x)</span>` : ''}
        </div>
        <div class="meta-item">
          <strong>Tempo:</strong> ${formatTime(totalTime)}
        </div>
      </div>
    </div>

    ${data.service_notes && data.service_notes.length > 0 ? `
      <div class="alert-box">
        <div class="alert-title">⚠️ NOTE IMPORTANTI</div>
        ${data.service_notes.map(note => `<div style="margin: 6pt 0; font-weight: 500;">• ${note.note}</div>`).join('')}
      </div>
    ` : ''}

    <h2>✓ Ingredienti</h2>
    <ul class="ingredients-list">
      ${data.ingredients.map(ing => {
        const scaledQty = ing.quantity * scaleFactor;
        return `
          <li>
            <div class="checkbox"></div>
            <span class="ingredient-qty">${formatQuantity(scaledQty)} ${ing.unit}</span>
            <span class="ingredient-name">
              ${ing.item_name_snapshot}
              ${ing.is_optional ? '<span class="ingredient-optional">(opz.)</span>' : ''}
            </span>
          </li>
        `;
      }).join('')}
    </ul>

    <h2>Procedimento</h2>
    <ol class="steps-list">
      ${data.steps.map(step => `
        <li>${step.instruction}</li>
      `).join('')}
    </ol>

    <div class="footer">
      <p>Stampato il ${new Date().toLocaleDateString('it-IT')} alle ${new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</p>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>
  `.trim();
}
