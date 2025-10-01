# Job Tags Module - Documentazione Completa

## Indice

1. [Architettura e Schema DB](#architettura-e-schema-db)
2. [Flussi Utente](#flussi-utente)
3. [API Reference](#api-reference)
4. [Validazioni e Regole di Business](#validazioni-e-regole-di-business)
5. [UI Components](#ui-components)
6. [Testing](#testing)

---

## Architettura e Schema DB

### Tabelle

#### `job_tags`
```sql
CREATE TABLE public.job_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  key TEXT NOT NULL,              -- Slug univoco (es. "cameriere")
  label_it TEXT NOT NULL,         -- Nome visualizzato (es. "Cameriere")
  categoria TEXT,                 -- 'Direzione' | 'Cucina' | 'Sala' | 'Trasversali'
  color TEXT,                     -- Colore HEX per UI (es. "#10B981")
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT job_tags_org_key_unique UNIQUE (org_id, key)
);
```

#### `user_job_tags`
```sql
CREATE TABLE public.user_job_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  location_id UUID NOT NULL REFERENCES public.locations(id),
  user_id UUID NOT NULL,
  job_tag_id UUID NOT NULL REFERENCES public.job_tags(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  note TEXT,
  assigned_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ujt_unique_per_tag UNIQUE (user_id, location_id, job_tag_id)
);

-- Indice parziale: un solo primario per user+location
CREATE UNIQUE INDEX ujt_primary_one_per_loc 
ON public.user_job_tags(user_id, location_id) 
WHERE is_primary = true;
```

### Trigger: Unicità Tag Primario

```sql
CREATE OR REPLACE FUNCTION public.ensure_single_primary_tag()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary = true THEN
    UPDATE public.user_job_tags
    SET is_primary = false
    WHERE user_id = NEW.user_id
      AND location_id = NEW.location_id
      AND id != NEW.id
      AND is_primary = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_ensure_single_primary_tag
BEFORE INSERT OR UPDATE ON public.user_job_tags
FOR EACH ROW WHEN (NEW.is_primary = true)
EXECUTE FUNCTION public.ensure_single_primary_tag();
```

### RLS Policies

**`job_tags`:**
- **Platform Admin**: pieno accesso
- **Org Admin**: `SELECT/INSERT/UPDATE/DELETE` per `org_id = current_org()`
- **Manager**: `SELECT` per `org_id = current_org()`
- **Base**: `SELECT` per `org_id = current_org()`

**`user_job_tags`:**
- **Platform Admin**: pieno accesso
- **Org Admin**: `SELECT/INSERT/UPDATE/DELETE` per `org_id = current_org()`
- **Manager**: `SELECT/INSERT/UPDATE/DELETE` per `org_id = current_org()` e `location_id IN my_accessible_locations()`
- **Base**: `SELECT` limitato a `user_id = auth.uid()`

Vedi dettagli in [docs/klyra-shifts/rls_job_tags.md](./klyra-shifts/rls_job_tags.md)

---

## Flussi Utente

### 1. Org Admin crea Job Tags (Tab Catalogo)

1. Naviga a `/staff/job-tags`
2. Tab "Catalogo Tag"
3. Click "Nuovo Tag"
4. Compila form:
   - **Nome** (obbligatorio): es. "Cameriere"
   - **Categoria** (opzionale): Direzione / Cucina / Sala / Trasversali
   - **Colore** (opzionale): HEX es. `#10B981` (default per categoria se non specificato)
5. Salva → `POST /api/v1/admin/job-tags`
6. Server genera `key` (slug) via `generate_job_tag_key(label_it)`
7. Tag creato e visibile in tabella

**Opzionale - Set Consigliato Ristorazione:**
- Click "Set Consigliato Ristorazione"
- Conferma modale
- Inserisce 15 tag predefiniti (Direttore, Pizzaiolo, Cameriere, etc.) con colori
- Idempotente: nessun duplicato se esistono già

### 2. Manager assegna Tag a Utenti (Tab Assegnazioni)

1. Naviga a `/staff/job-tags`
2. Tab "Assegnazioni"
3. Seleziona **Location** (obbligatorio)
4. Sistema carica utenti della location
5. Per ogni utente:
   - **Tag Primario** (dropdown): seleziona ruolo principale → `POST` o `PUT` per impostare `is_primary=true`
   - **Tag Secondari** (chips): click per aggiungere/rimuovere → `POST/DELETE`
6. Salva transazionale: trigger DB garantisce unicità primario

**Validazioni UI:**
- Utente senza primario: card con bordo rosso + badge "Manca primario"
- Tag disattivi: non visualizzati in selezione
- Colori tag: visualizzati come badge/chip colorati per efficacia UI

---

## API Reference

### Job Tags (Admin Org)

#### `GET /api/v1/admin/job-tags`
Lista job tags dell'org corrente.

**Query Params:**
- `is_active` (boolean): filtra per stato
- `categoria` (string): filtra per categoria

**Response:**
```json
{
  "jobTags": [
    {
      "id": "uuid",
      "label_it": "Cameriere",
      "key": "cameriere",
      "categoria": "Sala",
      "color": "#10B981",
      "is_active": true,
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

#### `POST /api/v1/admin/job-tags`
Crea nuovo job tag (solo Org Admin).

**Body:**
```json
{
  "label_it": "Pizzaiolo",
  "categoria": "Cucina",
  "color": "#EF4444"
}
```

**Response:**
```json
{
  "jobTag": { /* ... */ }
}
```

**Errors:**
- `409 Conflict`: tag con stesso `key` esiste già per org

#### `PUT /api/v1/admin/job-tags/:id`
Aggiorna job tag (rigenera `key` se cambia `label_it`).

**Body:**
```json
{
  "label_it": "Pizzaiolo Senior",
  "color": "#F87171",
  "is_active": false
}
```

#### `DELETE /api/v1/admin/job-tags/:id`
Elimina job tag:
- **Soft delete** (`is_active=false`) se referenziato in `user_job_tags`
- **Hard delete** altrimenti

---

### User Job Tags (Manager+)

#### `GET /api/v1/admin/user-job-tags`
Lista assegnazioni.

**Query Params:**
- `location_id` (uuid): filtra per location
- `user_id` (uuid): filtra per utente

**Response:**
```json
{
  "assignments": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "location_id": "uuid",
      "job_tag_id": "uuid",
      "is_primary": true,
      "note": "Senior con 5 anni esperienza",
      "job_tag": { /* join con job_tags */ },
      "profile": { /* join con profiles */ }
    }
  ]
}
```

#### `POST /api/v1/admin/user-job-tags`
Assegna job tag a utente per location.

**Body:**
```json
{
  "location_id": "uuid",
  "user_id": "uuid",
  "job_tag_id": "uuid",
  "is_primary": true,
  "note": "Opzionale"
}
```

**Validazioni:**
- Tag deve esistere e `is_active=true`
- Trigger DB garantisce unicità primario (setta `false` agli altri se `is_primary=true`)

**Errors:**
- `404 Not Found`: tag non trovato
- `400 Bad Request`: tag non attivo
- `409 Conflict`: assegnazione duplicata

#### `PUT /api/v1/admin/user-job-tags/:id`
Aggiorna assegnazione (cambio primario, note).

**Body:**
```json
{
  "is_primary": true,
  "note": "Aggiornamento note"
}
```

#### `DELETE /api/v1/admin/user-job-tags/:id`
Rimuove assegnazione.

---

### Set Consigliato Ristorazione

#### `POST /api/v1/admin/job-tags/preset`
Inserisce 15 tag predefiniti con colori (idempotente).

**Response:**
```json
{
  "ok": true,
  "inserted": 12,
  "message": "Inseriti 12 nuovi tag su 15 totali"
}
```

**Tag Preset:**
- **Direzione**: Direttore (#8B5CF6), Manager (#A78BFA)
- **Cucina**: Pizzaiolo (#EF4444), Commis Pizzaiolo (#F87171), Commis Cuisine (#FCA5A5), Plongeur (#FEE2E2)
- **Sala**: Runner (#10B981), Cameriere (#34D399), Chef de Rang (#6EE7B7), Accoglienza (#A7F3D0), Bar (#D1FAE5)
- **Trasversali**: Manutenzione (#6B7280), Pulizie (#9CA3AF), Formazione (#D1D5DB), Trasferta (#E5E7EB)

---

## Validazioni e Regole di Business

### Zod Schemas

```typescript
// lib/admin/validations.ts

export const createJobTagSchema = z.object({
  label_it: z.string().min(1).max(100),
  categoria: z.enum(['Direzione', 'Cucina', 'Sala', 'Trasversali']).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  is_active: z.boolean().optional().default(true),
})

export const updateJobTagSchema = z.object({
  label_it: z.string().min(1).max(100).optional(),
  categoria: z.enum(['Direzione', 'Cucina', 'Sala', 'Trasversali']).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  is_active: z.boolean().optional(),
})

export const assignJobTagSchema = z.object({
  location_id: z.string().uuid(),
  user_id: z.string().uuid(),
  job_tag_id: z.string().uuid(),
  is_primary: z.boolean().optional().default(false),
  note: z.string().max(500).optional(),
})

export const updateUserJobTagSchema = z.object({
  is_primary: z.boolean().optional(),
  note: z.string().max(500).optional(),
})
```

### Regole Chiave

1. **Unicità Key:** `(org_id, key)` unique → server genera slug da `label_it`
2. **Unicità Primario:** Trigger DB + indice parziale garantisce max 1 primario per `(user_id, location_id)`
3. **Colori Default:** Se categoria specificata ma color vuoto, API usa `DEFAULT_COLORS[categoria]`
4. **Soft Delete:** Tag referenziati non vengono cancellati hard, solo `is_active=false`
5. **RLS:** Manager può assegnare solo nelle proprie location

---

## UI Components

### Struttura Pagina

```
/staff/job-tags
├── JobTagsClient.tsx          # Container con Tabs
├── CatalogoTagTab.tsx         # Tab A: CRUD Job Tags
├── AssegnazioniTab.tsx        # Tab B: Assegna Tags a Users
```

### CatalogoTagTab.tsx

**Features:**
- Tabella con Label, Categoria, Colore (swatch), Stato, Azioni
- Modale Crea/Modifica con form (Nome, Categoria, Colore HEX)
- Toggle Attivo/Disattivo (icona Power)
- Pulsante "Set Consigliato Ristorazione" con conferma

**UI Copy (italiano):**
- "Nessun tag disponibile. Crea un Job Tag per iniziare."
- "Tag creato" / "Tag aggiornato"
- "Tag disattivato (è assegnato a utenti)"

### AssegnazioniTab.tsx

**Features:**
- Filtri: Location (obbligatorio), Cerca Utente (nome/email)
- Card per utente con:
  - **Primario**: Dropdown con preview colore/categoria
  - **Secondari**: Chips cliccabili (aggiungi/rimuovi)
  - Badge "Manca primario" se nessuno impostato
- Colori tag: visualizzati come background badge/chip per efficacia visiva

**UI Copy:**
- "Primario (obbligatorio)" / "Secondari (opzionali)"
- "Tag primario impostato" / "Tag assegnato" / "Tag rimosso"
- "Nessun utente trovato per questa location"

---

## Testing

### Unit Test (DB)

`tests/unit/job-tags.test.ts`:
- Verifica `ujt_primary_one_per_loc` index: inserisce 2 primari per stesso user+location → errore
- Verifica `generate_job_tag_key()` function: "Chef de Rang" → "chef_de_rang"

### API Test

`tests/api/job-tags.test.ts`:
- `POST /job-tags`: crea tag, verifica `key` generato
- `PUT /job-tags/:id`: set `is_primary=true`, verifica altri primari vengono unset
- RLS: Manager location A non può assegnare tag a utente in location B → 403

### E2E Test (Playwright)

`tests/e2e/job-tags.spec.ts`:
- Flow: Org Admin crea tag "Pizzaiolo" categoria "Cucina"
- Flow: Manager assegna primario, aggiunge/rimuove secondario
- Verifica UI: badge "Manca primario" appare/scompare
- Verifica colori: tag "Cucina" ha background rosso (#EF4444)

---

## Screenshot (Placeholder)

1. **Catalogo Tag**: Tabella con colori visualizzati
2. **Modale Crea Tag**: Form con anteprima colore
3. **Assegnazioni Tab**: Card utente con primario dropdown + chips secondari

---

## Prossimi Passi

- [ ] Multilingua (`label_it` → `label_{lang}`)
- [ ] Export CSV assegnazioni per location
- [ ] Storia modifiche (audit trail)
- [ ] Notifiche email quando primario cambia

---

**Maintainer:** Klyra Shifts Team  
**Last Updated:** 2025-01-01
