# Timesheets (base) + Export — Implementation Complete

**Implementato:** 2025-06-01  
**Prompt:** #8 — Timesheets (base) + Export

## Obiettivo Raggiunto

Riepilogo ore mensili con:
- ✅ Calcolo ore lavorate (time_clock_events + shifts)
- ✅ Calcolo straordinari (>40h/settimana)
- ✅ Differenze vs planning
- ✅ Lock periodo dopo approvazione
- ✅ Export CSV personalizzabile
- ✅ Timezone-safe (Europe/Paris)

---

## Schema DB

### Tabella: `timesheets`

```sql
CREATE TABLE timesheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(org_id),
  location_id UUID NOT NULL REFERENCES locations(id),
  user_id UUID NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  totals JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'locked')),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_timesheets_user_period 
  ON timesheets(user_id, location_id, period_start, period_end);
```

**Totals JSONB Structure:**
```json
{
  "regular_minutes": 2400,
  "overtime_minutes": 120,
  "break_minutes": 240,
  "planned_minutes": 2400,
  "variance_minutes": 120,
  "days_worked": 20
}
```

---

## Business Logic

### `lib/shifts/timesheet-calculator.ts`

**Funzioni principali:**

1. **`calculateWorkedHoursFromClockEvents()`**  
   Input: array di `TimeClockEvent`, periodo  
   Output: `{ regularMinutes, overtimeMinutes, breakMinutes, daysWorked }`  
   - Costruisce sessioni da clock_in/out
   - Somma pause da break_start/end
   - Rileva straordinari (>40h/settimana)

2. **`calculatePlannedHoursFromShifts()`**  
   Input: array di `Shift`, periodo  
   Output: `{ plannedMinutes }`  
   - Somma durata shift assegnati nel periodo
   - Sottrae break_minutes

3. **`generateTimesheetTotals()`**  
   Input: worked, planned  
   Output: JSONB totals structure  
   - Calcola variance (effettivo - pianificato)

4. **`getCurrentMonthPeriod()`**  
   Ritorna `{ start: '2025-06-01', end: '2025-06-30' }` per mese corrente (Europe/Paris)

5. **`formatMinutesToHours()`**  
   Converte minuti in ore decimali (es. 90 → "1.50")

---

## API Endpoints

### `GET /api/v1/timesheets`

**Query Params:**
- `location_id` (optional)
- `user_id` (optional)
- `status` (optional: draft|approved|locked)
- `period_start` (optional: YYYY-MM-DD)
- `period_end` (optional: YYYY-MM-DD)

**Response:**
```json
{
  "timesheets": [
    {
      "id": "...",
      "user_id": "...",
      "period_start": "2025-06-01",
      "period_end": "2025-06-30",
      "totals": { "regular_minutes": 2400, ... },
      "status": "draft",
      "user": {
        "email": "user@example.com",
        "raw_user_meta_data": { "full_name": "Mario Rossi" }
      }
    }
  ]
}
```

---

### `POST /api/v1/timesheets`

**Body:**
```json
{
  "user_id": "uuid",
  "location_id": "uuid",
  "period_start": "2025-06-01",
  "period_end": "2025-06-30",
  "force": false
}
```

**Logica:**
1. Controlla se timesheet esiste già
2. Se `approved_at` presente e `force=false` → blocca (409)
3. Fetch time_clock_events per periodo
4. Fetch shift_assignments per periodo
5. Calcola worked + planned
6. Upsert timesheet con totals

**Response:** `{ timesheet: {...} }`

---

### `POST /api/v1/timesheets/[id]/approve`

**Body:**
```json
{
  "notes": "Approvato da Manager"
}
```

**Logica:**
1. Verifica auth header
2. Controlla se già approvato → blocca (409)
3. Set `status=approved`, `approved_by=user.id`, `approved_at=now()`
4. Aggiorna notes (opzionale)

**Response:** `{ timesheet: {...} }`

**Nota:** RLS policy `timesheets_update` blocca ulteriori modifiche se `approved_at IS NOT NULL`.

---

### `POST /api/v1/timesheets/export`

**Body:**
```json
{
  "location_id": "uuid",
  "period_start": "2025-06-01",
  "period_end": "2025-06-30",
  "status": "approved",
  "fields": [
    "user_email",
    "period",
    "regular_hours",
    "overtime_hours",
    "total_hours",
    "variance_hours",
    "status"
  ]
}
```

**Response:**  
CSV file attachment con header + righe

**Campi disponibili:**
- `user_email`, `user_name`, `period`
- `regular_hours`, `overtime_hours`, `break_hours`, `total_hours`
- `planned_hours`, `variance_hours`, `days_worked`
- `status`, `approved_at`, `notes`

---

## CSV Generator (`lib/exports/csv-generator.ts`)

**Funzioni:**

1. **`generateTimesheetsCsv()`**  
   Input: array timesheets, config  
   Output: stringa CSV con header + righe

2. **`escapeCsvValue()`**  
   Gestisce virgole, virgolette, newline

3. **`createCsvBlob()`**  
   Crea Blob per download

4. **`generateCsvFilename()`**  
   Ritorna `timesheets_2025-06-01.csv`

---

## UI Manager

### `/admin/timesheets`

**Componenti:**
- `TimesheetsClient.tsx`: lista + filtri + export
- Filtri: status, period_start, period_end
- Bottone "Genera Mese Corrente": auto-genera per tutti gli utenti con eventi nel mese
- Bottone "Export CSV": dialog con selezione campi

**Screenshot:**
```
┌────────────────────────────────────────────────┐
│ Timesheets                   [ Export ] [ + ]  │
├────────────────────────────────────────────────┤
│ Stato: [Tutti ▼]  Da: [____]  A: [____] [Filtra]│
├────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────┐   │
│ │ Mario Rossi <approved>                   │   │
│ │ 📅 2025-06-01 - 2025-06-30  Giorni: 20  │   │
│ │                              160.00h     │   │
│ │                       +2.50h vs pianif.  │   │
│ └──────────────────────────────────────────┘   │
│ ┌──────────────────────────────────────────┐   │
│ │ Giulia Bianchi <draft>                   │   │
│ │ ...                                      │   │
│ └──────────────────────────────────────────┘   │
└────────────────────────────────────────────────┘
```

---

### `/admin/timesheets/[id]`

**Componenti:**
- `TimesheetDetailClient.tsx`: dettaglio + approve

**Sezioni:**
1. **Header:** nome utente, badge status, bottone "Approva e Blocca"
2. **Summary Cards:** ore totali, ordinarie, straordinari, giorni lavorati
3. **Breakdown:** pause, pianificate, differenza
4. **Note:** textarea (disabilitata se approvato)
5. **Approval Badge:** verde se approvato

**Screenshot:**
```
┌────────────────────────────────────────────────┐
│ [<] Mario Rossi <approved>     [✓ Approva]     │
│     📅 2025-06-01 - 2025-06-30                 │
├────────────────────────────────────────────────┤
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐  │
│ │ Totali │ │Ordinarie││Straord.││ Giorni │  │
│ │ 162.50h│ │ 160.00h││  2.50h ││   20   │  │
│ └────────┘ └────────┘ └────────┘ └────────┘  │
├────────────────────────────────────────────────┤
│ Dettaglio                                      │
│ Pause totali           4.00h                   │
│ Ore pianificate      160.00h                   │
│ Differenza           +2.50h                    │
├────────────────────────────────────────────────┤
│ Note                                           │
│ [Approvato dal Manager...]                     │
└────────────────────────────────────────────────┘
```

---

## RLS Lock Enforcement

### Policy: `timesheets_update`

```sql
CREATE POLICY "timesheets_update" ON timesheets
FOR UPDATE
USING (
  is_platform_admin() OR
  (user_in_org(org_id) AND approved_at IS NULL) -- LOCK
);
```

**Effetto:**  
Dopo approvazione (`approved_at` settato), solo platform_admin può modificare.

---

## Validazioni (Zod)

### `lib/shifts/timesheet-validations.ts`

**Schemas:**

1. **`generateTimesheetSchema`**
   ```typescript
   {
     user_id: uuid,
     location_id: uuid,
     period_start: YYYY-MM-DD,
     period_end: YYYY-MM-DD,
     force: boolean (default: false)
   }
   ```

2. **`approveTimesheetSchema`**
   ```typescript
   {
     notes: string (optional)
   }
   ```

3. **`exportTimesheetsSchema`**
   ```typescript
   {
     location_id: uuid (optional),
     period_start: YYYY-MM-DD,
     period_end: YYYY-MM-DD,
     status: 'draft'|'approved'|'locked' (optional),
     fields: string[] (default: [...])
   }
   ```

---

## Testing

### Test Plan

#### 1. **Timezone Safety**
- [ ] Eventi clock_in a 23:00 giorno X → clock_out 01:00 giorno X+1
- [ ] Verifica che le ore vengano conteggiate correttamente in Europe/Paris

#### 2. **Overtime Calculation**
- [ ] 40h/settimana standard
- [ ] 41h/settimana → 1h straordinari
- [ ] Periodo multi-settimana (es. mese): verifica calcolo proporzionale

#### 3. **Lock Enforcement**
- [ ] Approva timesheet → status=approved, approved_at settato
- [ ] Tentativo UPDATE via API → errore 403 (bloccato da RLS)
- [ ] Tentativo UPDATE via UI → disabled o nascosto

#### 4. **Export CSV**
- [ ] Selezione campi custom
- [ ] Verifica escape virgole, virgolette, newline
- [ ] Verifica file scaricato con nome corretto
- [ ] Verifica dati: ore decimali (es. 1.50 non 1.5)

#### 5. **RLS Permissions**
- [ ] Manager può vedere solo timesheets della propria org
- [ ] Platform admin vede tutti
- [ ] Utente normale può vedere solo propri timesheets (TODO: aggiungere policy se necessario)

#### 6. **Variance Calculation**
- [ ] Planned=160h, Worked=162.5h → variance=+2.5h
- [ ] Planned=160h, Worked=155h → variance=-5h
- [ ] Badge verde per positivo, rosso per negativo

---

## File Modificati/Creati

### Core Logic
- `types/shifts.ts` (modificato: Timesheet interface)
- `lib/shifts/timesheet-calculator.ts` (nuovo)
- `lib/shifts/timesheet-validations.ts` (nuovo)
- `lib/exports/csv-generator.ts` (nuovo)

### API
- `app/api/v1/timesheets/route.ts` (nuovo)
- `app/api/v1/timesheets/[id]/approve/route.ts` (nuovo)
- `app/api/v1/timesheets/export/route.ts` (nuovo)

### UI Manager
- `app/(app)/admin/timesheets/page.tsx` (nuovo)
- `app/(app)/admin/timesheets/TimesheetsClient.tsx` (nuovo)
- `app/(app)/admin/timesheets/[id]/page.tsx` (nuovo)
- `app/(app)/admin/timesheets/[id]/TimesheetDetailClient.tsx` (nuovo)

### Docs
- `docs/klyra-shifts/timesheets-complete.md` (questo file)

---

## Prossimi Step (Future)

**Non inclusi nell'MVP:**
- [ ] UI Employee per visualizzare propri timesheets (read-only)
- [ ] Notifiche email pre-approvazione
- [ ] Export PDF (attualmente solo CSV)
- [ ] Dashboard analytics timesheets (grafici trend mensili)
- [ ] Timesheet notes editabili post-approvazione (con audit log)

---

## Risorse

- [Timesheet Calculator Source](../../lib/shifts/timesheet-calculator.ts)
- [CSV Generator Source](../../lib/exports/csv-generator.ts)
- [API Routes](../../app/api/v1/timesheets/)
- [Manager UI](../../app/(app)/admin/timesheets/)

---

**Status:** ✅ **COMPLETE** (MVP Timesheets + Export)
