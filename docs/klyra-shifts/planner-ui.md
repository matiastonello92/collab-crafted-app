# Planner UI - Manager Interface

## Overview
Interfaccia web per la pianificazione settimanale dei turni, con funzionalità drag&drop, gestione rota e assegnazione dipendenti.

## Accesso e Permessi

### Requisiti
- **Permesso richiesto**: `shifts:manage`
- **Ruoli con accesso**:
  - Platform Admin (accesso globale)
  - Org Admin (tutte le location dell'organizzazione)
  - Manager (solo location assegnate)

### Guard Implementation
```typescript
// app/(app)/planner/page.tsx
const { data: hasPermission } = await supabase
  .rpc('user_has_permission', { 
    p_user: user.id, 
    p_permission: 'shifts:manage' 
  })
```

## Architettura Componenti

```
app/(app)/planner/
├── page.tsx                    # Server component + guard
├── PlannerClient.tsx           # Main container (client)
├── hooks/
│   └── useRotaData.ts         # SWR hook for rota/shifts data
└── components/
    ├── WeekNavigator.tsx      # Week navigation + status badge
    ├── PlannerGrid.tsx        # Drag&drop grid (DndContext)
    ├── DayColumn.tsx          # Single day column (droppable)
    ├── ShiftCard.tsx          # Individual shift card (draggable)
    └── PlannerSidebar.tsx     # Filters + actions sidebar
```

## Flusso Dati

### Data Fetching (SWR)
```typescript
// useRotaData hook
const { rota, shifts, loading, mutate } = useRotaData(locationId, weekStart)

// API Calls
GET /api/v1/rotas?location_id=xxx&week=2025-01-20  → Rota
GET /api/v1/shifts?rota_id=xxx                      → Shifts
```

### State Management
- **Local State**: `useState` per UI (selected location, current week)
- **Server Cache**: SWR con revalidazione `onFocus: false`
- **Mutations**: Dopo PUT/POST/DELETE, chiamare `mutate()` per refresh

## Drag & Drop Pattern

### Libreria: @dnd-kit/core

### ID Schema
```typescript
// Draggable (shift)
id: shift.id  // UUID

// Droppable (day + job tag row)
id: `day-${date}-tag-${tagId}`
// Example: "day-2025-01-20-tag-uuid-xxx"
// Example: "day-2025-01-20-tag-unassigned"
```

### Collision Handling
```typescript
handleDragEnd = async (event: DragEndEvent) => {
  const { active, over } = event
  
  // Parse target day from over.id
  const date = extractDateFromDropId(over.id)
  
  // Calculate new timestamps maintaining duration
  const shift = shifts.find(s => s.id === active.id)
  const newStart = `${date}T${shift.start_at.split('T')[1]}`
  const newEnd = addDuration(newStart, shift.duration)
  
  // API call
  await fetch(`/api/v1/shifts/${shift.id}`, {
    method: 'PUT',
    body: JSON.stringify({ start_at: newStart, end_at: newEnd })
  })
  
  mutate() // Refresh data
}
```

## Stati Rota

| Stato | Descrizione | Permessi Edit | Azioni Disponibili |
|-------|-------------|---------------|-------------------|
| `draft` | Bozza | Manager+ | Pubblica |
| `published` | Pubblicata | Manager+ | Blocca |
| `locked` | Bloccata | Nessuno | - |

### Transizioni
```
draft → published → locked
```
**IRREVERSIBILE**: Una volta bloccata, la rota non può essere modificata.

## Validazioni & Warning

### Server-side (API)
- **Collision check**: Impedisce overlap utente con turni esistenti
- **Time validation**: `end_at > start_at`
- **Week validation**: Turno deve essere entro settimana della rota
- **Timezone**: Normalizzazione Europe/Paris

### Client-side (UI)
- **Visual warning**: Badge giallo se violazione soft (< 11h riposo)
- **Drag disabled**: Se `rota.status === 'locked'`
- **Alert dialog**: Conferma prima di pubblicare/bloccare

## Performance

### Ottimizzazioni Implementate
1. **Memoizzazione**: `memo()` su `PlannerGrid` e `ShiftCard`
2. **Custom comparison**: Evita re-render se `shift.updated_at` non cambia
3. **SWR dedupe**: `dedupingInterval: 60s` su rotas, `30s` su shifts
4. **Virtualization**: Non implementata (non necessaria per <100 shift)

### Benchmark Target
- **Load time**: < 2s per 100 shift
- **Drag&drop latency**: < 100ms (movimento ottimistico)
- **API response**: < 500ms (con rate limiting 100 req/min)

## Timezone Handling

### Filosofia
- **DB**: Sempre `timestamptz` (UTC internamente)
- **API Input/Output**: Europe/Paris (ISO 8601 con offset)
- **UI Display**: Europe/Paris (via `date-fns` + `date-fns-tz`)

### Conversione
```typescript
// lib/shifts/timezone-utils.ts
import { toZonedTime, formatInTimeZone } from 'date-fns-tz'

const PARIS_TZ = 'Europe/Paris'

export function normalizeToParis(isoDate: string): string {
  return formatInTimeZone(isoDate, PARIS_TZ, "yyyy-MM-dd'T'HH:mm:ssXXX")
}
```

## Known Issues & Limitations

### Current MVP
- ✅ Drag&drop base funzionante
- ✅ Stati rota (draft/published/locked)
- ✅ Permessi Manager/OrgAdmin/Platform Admin
- ⚠️ **Non implementato**: Filtri utenti/ruoli in sidebar
- ⚠️ **Non implementato**: Badge ferie/assenze inline
- ⚠️ **Non implementato**: Duplica settimana (API mancante)
- ⚠️ **Non implementato**: Validazione 11h riposo (logica complessa)

### Future Improvements
1. **Virtualizzazione**: Se performance degrada con >150 shift/settimana
2. **Undo/Redo**: Stack azioni con ctrl+z support
3. **Bulk actions**: Seleziona multipli shift + batch update
4. **Template shifts**: Salva pattern ricorrenti (es. "sabato sera")
5. **Conflict resolution**: UI interattiva per risolvere overlap
6. **Mobile**: Responsive layout (attualmente desktop-only)

## API Endpoints Utilizzati

| Endpoint | Metodo | Scopo |
|----------|--------|-------|
| `/api/v1/rotas` | GET | Fetch rota per location + settimana |
| `/api/v1/rotas` | POST | Crea nuova rota (draft) |
| `/api/v1/rotas/:id/status` | PUT | Cambia stato rota |
| `/api/v1/shifts` | GET | Fetch tutti shift di una rota |
| `/api/v1/shifts` | POST | Crea nuovo shift |
| `/api/v1/shifts/:id` | PUT | Update shift (drag&drop) |
| `/api/v1/shifts/:id` | DELETE | Elimina shift |

## Testing Checklist

### Permessi
- [ ] Base User → redirect `/access-denied`
- [ ] Manager → accesso solo location gestite
- [ ] Org Admin → accesso tutte location org
- [ ] Platform Admin → accesso globale

### Funzionalità
- [ ] Drag&drop shift → API chiamata + refresh
- [ ] Pubblica draft → status → published
- [ ] Blocca published → status → locked
- [ ] Locked rota → drag disabled
- [ ] Week navigation → prev/next/today

### Edge Cases
- [ ] Settimana senza rota → empty state
- [ ] Shift multi-day (spanning midnight) → gestione date
- [ ] 100 shift caricati → < 2s load time
- [ ] Collision detection → toast error se overlap

## Troubleshooting

### Shift non si sposta
- Verifica `rota.status !== 'locked'`
- Check console per errori API (429 rate limit?)
- Verifica permessi utente su location

### Performance lenta
- Apri DevTools → Network → verifica tempo risposta API
- Check se SWR sta facendo troppi refetch (disabilitare `revalidateOnFocus`)
- Considera virtualizzazione se >150 shift

### Timezone mismatch
- Verifica che API restituisca offset Europe/Paris
- Check conversione in `lib/shifts/timezone-utils.ts`
- Assicurati che `date-fns-tz` sia installato

## Deployment Notes

### Environment Variables
Nessuna variabile ENV specifica per Planner UI (usa Supabase client globale).

### Build Checks
```bash
npm run build
# Verificare che non ci siano errori TypeScript su types/shifts.ts
```

### Rollout
1. Deploy API endpoints (`/api/v1/rotas`, `/api/v1/shifts`) PRIMA
2. Test API con Postman/curl
3. Deploy frontend con Planner UI
4. Enable feature flag `shifts_planner_enabled` se applicabile

---

**Versione**: 1.0.0 (MVP Sprint 1)  
**Ultimo aggiornamento**: 2025-01-13  
**Contatti**: team-backend@klyra.com
