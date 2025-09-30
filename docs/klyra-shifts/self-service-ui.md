# Self-Service UI - "I miei Turni"

## Overview

Feature di self-service per dipendenti, permette la gestione autonoma di:
- Visualizzazione e accettazione turni assegnati
- Gestione disponibilità settimanale
- Richieste di permesso/ferie

## Architettura

### Route & Componenti

```
app/(app)/my-shifts/
├── page.tsx                    # Route entry (no auth guard - tutti gli utenti autenticati)
├── MyWeekClient.tsx            # Container principale con tabs
├── hooks/
│   ├── useMyShifts.ts         # SWR hook per turni personali
│   ├── useMyAvailability.ts   # SWR hook per disponibilità
│   └── useMyLeaveRequests.ts  # SWR hook per permessi
└── components/
    ├── MyShiftsList.tsx       # Lista turni con azioni Accept/Decline
    ├── MyAvailabilityPanel.tsx # Gestione disponibilità settimanale
    └── MyLeavePanel.tsx       # Richieste permessi (pending/approved/rejected)
```

### API Endpoints

- `GET /api/v1/shifts/my-shifts` - Turni assegnati (filtro RLS su user_id)
- `GET /api/v1/availability` - Disponibilità utente (RLS self-service)
- `POST /api/v1/availability` - Crea disponibilità
- `DELETE /api/v1/availability/:id` - Rimuove disponibilità
- `GET /api/v1/leave/requests` - Richieste permesso utente
- `POST /api/v1/leave/requests` - Nuova richiesta permesso
- `POST /api/v1/assignments/:id/accept` - Accetta/Rifiuta turno

## Permessi & RLS

**Accesso:** Tutti gli utenti autenticati (no permission check).

**Isolamento dati:** RLS policies garantiscono che ogni utente veda solo i propri dati:
- `shifts`: filtro su `assignments.user_id = auth.uid()`
- `availability`: `user_id = auth.uid()`
- `leave_requests`: `user_id = auth.uid()`

## UI Flow

### Tab "Turni"
1. Fetch shifts con status `published` o `locked`
2. Raggruppa per settimana (`rota.week_start_date`)
3. Mostra assignment status:
   - `proposed`/`assigned` → Bottoni **Accetta** / **Rifiuta**
   - `accepted` → Badge verde "Accettato"
   - `declined` → Badge rosso "Rifiutato"

### Tab "Disponibilità"
1. Mostra disponibilità per giorno della settimana
2. Badge colore per preferenza:
   - `preferred` → verde
   - `ok` → grigio
   - `unavailable` → rosso
3. Form per aggiungere nuova disponibilità (giorno + ora inizio/fine + preferenza)

### Tab "Permessi"
1. Mostra 3 sezioni:
   - **Approvati** (badge verde)
   - **In attesa** (badge giallo)
   - **Rifiutati** (badge rosso, con motivo se presente)
2. Form per nuova richiesta (date + motivazione opzionale)

## Performance

- **SWR caching**: dedupingInterval 30s per shifts, revalidateOnFocus: false
- **Lazy loading**: componenti caricati on-demand per tab
- **Skeleton states**: UI immediata durante fetch

## Testing

### User Acceptance
- [ ] Utente vede solo i propri turni (non quelli di altri)
- [ ] Accettazione turno aggiorna status e ricarica lista
- [ ] Rifiuto turno aggiorna status
- [ ] Disponibilità modificabile senza conflitti
- [ ] Richiesta permesso inviata con successo
- [ ] Toast messaggi chiari per ogni azione

### Edge Cases
- Turno già accettato da altro utente (gestito da RLS)
- Richiesta permesso con date sovrapposte (TODO: validazione backend)
- Disponibilità con orari inconsistenti (TODO: validazione)

## Limitazioni Attuali

1. **Leave types hardcoded**: type_id non validato (TODO: fetch da `/api/v1/leave/types`)
2. **Shift swap non implementato**: "Chiedi cambio" menzionato nel prompt ma non realizzato
3. **Time range parsing semplificato**: `availability.time_range` (tstzrange) visualizzato come "Tutto il giorno"
4. **No pagination**: se utente ha >50 turni, potrebbe degradare performance

## Future Enhancements

- **Notifiche push**: alert quando nuovo turno assegnato
- **Calendario view**: alternativa a lista per visualizzare turni
- **Shift swap**: meccanismo per proporre scambio turno con collega
- **Filtraggio**: per status, location, periodo
- **Export PDF**: stampa turni mensili

## Security

- **No platform_admin bypass**: anche admin vedono solo i propri turni su questa UI
- **RLS enforcement**: tutte le query filtrate lato DB, non client-side
- **CSRF protection**: Next.js built-in (cookies SameSite)

---

**Documentazione creata:** 2025-01-30  
**Versione:** 1.0
