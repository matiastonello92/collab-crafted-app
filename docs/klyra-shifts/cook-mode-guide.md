# Guida Modalità Cucina (Cook Mode)

## Panoramica

La **Modalità Cucina** è un'interfaccia full-screen progettata per guidare lo staff attraverso la preparazione delle ricette step-by-step, con timer integrati e checklist interattive.

## Accesso alla Modalità Cucina

### Prerequisiti
- La ricetta deve essere in stato **Published**
- La ricetta deve avere almeno un passaggio (step) definito

### Come Accedere
1. Aprire una ricetta pubblicata dalla pagina `/recipes`
2. Cliccare sul pulsante **"Modalità Cucina"** nell'header della ricetta
3. Si aprirà l'interfaccia full-screen dedicata

## Funzionalità Principali

### 1. Navigazione Step-by-Step

#### Elementi dell'Interfaccia
- **Header**: Titolo ricetta e indicatore progresso (es. "Step 2 di 5")
- **Progress Bar**: Barra di avanzamento visiva
- **Badge Step**: Numero dello step corrente
- **Pulsante Exit**: Icona X per tornare alla ricetta

#### Controlli di Navigazione
- **Pulsante "Precedente"**: Torna allo step precedente
- **Pulsante "Successivo"**: Avanza allo step successivo
- I pulsanti si disabilitano automaticamente al primo/ultimo step

### 2. Visualizzazione Step

Ogni step mostra:
- **Foto** (se disponibile): Immagine di riferimento per lo step
- **Titolo** (opzionale): Nome descrittivo del passaggio
- **Istruzioni**: Testo completo del procedimento
- **Badge Informativi**:
  - 🕐 Timer (se configurato)
  - ☑️ Numero items checklist (se presente)

### 3. Timer Interattivo

#### Caratteristiche
- **Display formato MM:SS**: Visualizzazione minuti e secondi
- **Progress Bar**: Avanzamento visivo del tempo
- **Controlli**:
  - ▶️ **Play/Pause**: Avvia o mette in pausa il timer
  - 🔄 **Reset**: Riporta il timer al tempo iniziale

#### Comportamento
- Il timer si resetta automaticamente quando si cambia step
- Al completamento:
  - Suona un alert audio
  - Appare notifica toast "Timer completato!"
  - Il card diventa verde (border verde)
  - I controlli si disabilitano fino al reset

#### Audio Alert
- Formato: WAV nativo del browser
- Volume: 50% (default)
- Durata: ~2 secondi
- **Nota**: L'audio potrebbe non funzionare se l'utente non ha mai interagito con la pagina (limitazione browser)

### 4. Checklist Interattiva

#### Funzionalità
- **Click su Item**: Spunta/deseleziona l'item
- **Click su Checkbox**: Stesso effetto del click sull'item
- **Progress Bar**: Mostra completamento (es. "3 / 5")
- **Visual Feedback**:
  - Item spuntati: testo barrato e grigio
  - Card verde con messaggio "✓ Checklist completata!" al 100%

#### Persistenza Dati
- **Storage**: localStorage del browser
- **Chiave formato**: `cook_mode_{recipeId}_step_{stepNumber}_checklist`
- **Scope**: Locale per sessione/postazione
- **Nessuna sincronizzazione multi-utente**
- I dati persistono tra refresh/navigazione

#### Esempio Chiave Storage
```
cook_mode_123e4567-e89b-12d3-a456-426614174000_step_2_checklist
```

Valore:
```json
{
  "0": true,
  "1": false,
  "2": true
}
```

### 5. Layout Responsive

#### Desktop (lg breakpoint)
- **Grid 2 colonne**: Step card + Widgets affiancati
- Ottimale per tablet/monitor cucina

#### Mobile
- **Layout verticale**: Step card sopra, widgets sotto
- Touch-friendly (44px minimum tap target)

## Gestione Steps (Editor)

### Aggiunta Nuovo Step

1. Nella pagina dettaglio ricetta (draft), tab **"Procedimento"**
2. Click su **"Aggiungi Step"**
3. Compilare:
   - **Numero Step** (1-999): Deve essere univoco
   - **Titolo** (opzionale): Nome descrittivo
   - **Istruzioni** (obbligatorio): Testo del passaggio
   - **Timer** (opzionale): Minuti per l'operazione
   - **Checklist** (opzionale): Lista di controlli

4. Click **"Salva"**

### Modifica Step

1. Click su **"Modifica"** accanto allo step desiderato
2. Aggiornare i campi nel form
3. Click **"Salva"**

### Eliminazione Step

1. Click sull'icona 🗑️ **Trash** accanto allo step
2. Confermare eliminazione nel prompt
3. Lo step viene rimosso definitivamente

### Gestione Checklist Items

Nel form di editing step:
1. Digitare l'item nel campo "Aggiungi item"
2. Premere **Invio** o click su **+**
3. L'item appare come badge
4. Click su **X** nel badge per rimuoverlo

### Ordinamento Steps

- **No Drag & Drop**: L'ordinamento è gestito esclusivamente dal campo numerico `step_number`
- Gli step vengono sempre visualizzati in ordine crescente per `step_number`
- Per riordinare: modificare manualmente il `step_number` degli step interessati

## Validazioni e Restrizioni

### Steps Editor
- ✅ Solo ricette **draft** possono essere modificate
- ✅ `step_number` deve essere univoco per ricetta
- ✅ `instruction` è obbligatorio (min 1 carattere)
- ✅ `timer_minutes` deve essere ≥ 0
- ✅ `checklist_items` max 50 items per step

### Cook Mode
- ✅ Solo ricette **published** accessibili
- ✅ Almeno 1 step necessario per avviare Cook Mode
- ✅ Timer non può andare sotto 0 secondi

## Best Practices

### Per lo Staff di Cucina

1. **Preparazione**:
   - Posizionare tablet/dispositivo in zona visibile e protetta da schizzi
   - Volume audio attivo per alert timer
   - Mani pulite per interazione touch

2. **Durante l'Uso**:
   - Leggere interamente lo step prima di iniziare
   - Avviare timer appena si inizia l'operazione
   - Spuntare checklist items man mano che si completano
   - Usare "Precedente" per rivedere step già fatti

3. **Igiene Dispositivo**:
   - Interagire con mani pulite o usando strumenti capacitivi
   - Pulire schermo tra una ricetta e l'altra

### Per Manager/Admin

1. **Configurazione Ricette**:
   - Timer realistici: basare su test pratici
   - Checklist concise: max 5-7 items per step
   - Foto di qualità: aiutano impiattamento/presentazione
   - Step atomici: un'operazione principale per step

2. **Manutenzione**:
   - Aggiornare ricette basandosi su feedback staff
   - Testare Cook Mode prima di pubblicare ricette critiche
   - Foto step opzionali ma raccomandate per step complessi

## Troubleshooting

### Timer Non Suona
- **Causa**: Browser blocca audio senza interazione utente
- **Soluzione**: Click su pulsante Play almeno una volta per abilitare audio

### Checklist Non Si Salva
- **Causa**: localStorage pieno o disabilitato
- **Soluzione**: Svuotare cache browser o abilitare storage

### Step Non Si Caricano
- **Causa**: Ricetta non ha recipe_steps salvati
- **Soluzione**: Tornare a dettaglio ricetta, tab Procedimento, aggiungere steps

### Layout Rotto su Mobile
- **Causa**: Viewport troppo piccolo (<320px)
- **Soluzione**: Usare dispositivo con screen ≥360px (standard mobile)

## Limitazioni Note

1. **No Multi-User Sync**: Checklist non sincronizzano tra dispositivi
2. **No Offline Mode**: Richiede connessione per caricamento iniziale
3. **Audio Limitato**: Alert audio dipende da policy browser
4. **No Voice Control**: Nessun controllo vocale (future enhancement)

## FAQ

**Q: Posso usare Cook Mode su più dispositivi contemporaneamente?**  
A: Sì, ma le checklist saranno indipendenti (storage locale)

**Q: Cosa succede se chiudo Cook Mode a metà?**  
A: La checklist rimane salvata in localStorage per quando riapri

**Q: Posso stampare una ricetta in Cook Mode?**  
A: No, usa la vista dettaglio ricetta per stampa

**Q: Timer supporta ore (>60 min)?**  
A: Sì, display mostra MM:SS correttamente (es. 90min = 90:00)

**Q: Posso modificare ricetta mentre è in Cook Mode?**  
A: No, devi prima uscire da Cook Mode e la ricetta deve essere draft

## Supporto Tecnico

Per problemi tecnici o segnalazioni:
- **Database**: Tabella `recipe_steps` (campo `timer_minutes`, `checklist_items`)
- **API Endpoint**: `/api/v1/recipes/:id/steps`
- **Component Path**: `app/(app)/recipes/[id]/cook/`
- **Storage Keys**: Pattern `cook_mode_{recipeId}_step_{stepNumber}_checklist`

---

**Versione**: 1.0.0  
**Ultimo Aggiornamento**: 2025-10-03  
**Modulo**: Klyra Recipes - Cook Mode
