## Report

### Problemi risolti

- Endpoint migrations solo stub, senza tracking reale – **FIXED**
- Middleware fragile con 500 in caso di errore – **FIXED**
- Admin bootstrap con riferimento a tabelle inesistenti – **FIXED**
- 404/not-found crash dovuto a hook client senza boundary – **FIXED**
- Supabase SSR ancora su API 0.5 con `getAll`/`setAll` deprecati – **FIXED**
- Segreti hardcoded nei config Supabase – **FIXED**
- Mancanza di route boundaries (`error`, `loading`) – **FIXED**
- Header/Sidebar senza `<Suspense>` e con hook client in RSC – **FIXED**

### Diff principali

- `app/api/internal/setup/apply-migrations/route.ts`: esecuzione SQL reale con tracking `schema_migrations`.
- `middleware.ts`: gestione CSP e init Supabase protetta in try/catch.
- `app/api/v1/admin/bootstrap/route.ts`: bootstrap org/location/ruoli con transazioni SQL.
- `next.config.js`, `tailwind.config.ts`, `postcss.config.js`: configurazioni minime di base.
- `app/globals.css`: aggiunte direttive `@tailwind`.
- `utils/supabase/server.ts`, `utils/supabase/client.ts`, `utils/supabase/middleware.ts`: migrazione a @supabase/ssr 0.7 e nuova cookie API.
- `utils/supabase/config.ts`, `.env.example`: rimozione fallback hardcoded.
- `app/not-found.tsx`, `app/error.tsx`, `app/loading.tsx`: aggiunte boundary di routing.
- `components/nav/HeaderClient.tsx`, `components/nav/SidebarClient.tsx`, `app/layout.tsx`: separazione client/server e `<Suspense>`.
- `db/migrations/003_permission_presets.sql`, `db/seeds/002_permission_presets.sql`: tabelle preset globali con RLS (solo admin possono modificare) e seed idempotente.

### Note migrazione 0.5 → 0.7

La versione 0.7 di `@supabase/ssr` depreca le vecchie API di gestione cookie in favore di `get/set/remove`. La middleware e il client server usano ora la nuova interfaccia e la gestione dei cookie è sincrona in Next.js 15.

### Build

Lint, typecheck e build eseguiti localmente senza fetch esterni grazie al font Inter self-hosted.

