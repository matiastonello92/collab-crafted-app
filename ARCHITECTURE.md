# 🏗️ Application Architecture

## Overview

Multi-tenant staff management system built with Next.js 15 App Router, Supabase, and TypeScript.

---

## 🎯 Core Principles

1. **Single Source of Truth** - One way to do things
2. **Type Safety** - TypeScript everywhere
3. **Security First** - Deny by default, explicit permissions
4. **Performance** - Smart caching with SWR
5. **Maintainability** - Clear patterns, good documentation

---

## 📁 Directory Structure

```
/app
├── app/                    # Next.js App Router
│   ├── (app)/             # Main app layout
│   ├── (platform)/        # Platform admin
│   ├── (kiosk)/          # Kiosk mode
│   ├── api/              # API routes
│   └── actions/          # Server actions
├── components/            # React components
│   ├── ui/               # Radix UI components
│   ├── auth/             # Auth guards
│   └── ...               # Feature components
├── lib/                   # Core utilities
│   ├── supabase/         # Supabase clients
│   ├── permissions/      # Permission system
│   ├── store/            # Zustand store
│   ├── admin/            # Admin utilities
│   └── ...               # Other utilities
├── hooks/                 # React hooks
├── types/                 # TypeScript types
└── utils/                 # Helper functions
```

---

## 🔐 Authentication & Authorization

### Authentication Flow

1. User authenticates via Supabase Auth
2. JWT token stored in HTTP-only cookie
3. Session validated on each request via middleware
4. User redirected to /login if not authenticated

### Authorization (RBAC/ABAC)

**Permission Format:** `module:action`
- Examples: `users:view`, `users:edit`, `inventory:manage`
- Wildcards: `users:*` (all user permissions), `*` (admin)

**Permission Checking:**
```typescript
import { usePermissions } from '@/hooks/usePermissions'

const { can, isAdmin } = usePermissions()

if (can('users:edit')) {
  // User can edit users
}

if (can(['users:edit', 'users:delete'])) {
  // User has ALL listed permissions
}
```

### Guards

**Server Components:**
```typescript
import { requireOrgAdmin } from '@/lib/admin/guards'

const { userId, orgId } = await requireOrgAdmin()
```

**API Routes:**
```typescript
import { checkOrgAdmin } from '@/lib/admin/guards'

const { hasAccess, orgId } = await checkOrgAdmin()
if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
```

**Client Components:**
```typescript
import { AuthGuard } from '@/components/auth/AuthGuard'

<AuthGuard>
  <ProtectedContent />
</AuthGuard>
```

---

## 💾 Data Management

### State Management Strategy

**UI State → Zustand Store**
- User context (org, location)
- Active selections
- UI preferences
- Performance metrics

**Server Data → SWR Hooks**
- User permissions
- User lists
- Locations
- Inventory
- All API data

### Zustand Store (UI State Only)

```typescript
import { useAppStore, useLocationContext } from '@/lib/store/unified'

// Get context
const { context } = useAppStore()

// Update location
const { updateLocation } = useAppStore()
updateLocation(locationId, locationName)
```

### SWR Hooks (Server Data)

```typescript
import useSWR from 'swr'

const { data, error, isLoading, mutate } = useSWR(
  '/api/v1/admin/users',
  fetcher,
  {
    revalidateOnFocus: false,
    dedupingInterval: 60000, // Cache for 1 min
  }
)

// Manual refetch
mutate()

// Optimistic update
mutate(newData, false)
```

### Custom Hooks Pattern

```typescript
// hooks/use-users.ts
export function useUsers(locationId?: string) {
  const key = locationId 
    ? `/api/v1/admin/users?location_id=${locationId}`
    : '/api/v1/admin/users'
  
  return useSWR(key, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  })
}

// Usage
const { data: users, isLoading, error } = useUsers(locationId)
```

---

## 🗄️ Database (Supabase)

### Supabase Clients

**3 Client Types:**

1. **Browser Client** - Client components
   ```typescript
   import { createSupabaseBrowserClient } from '@/lib/supabase'
   const supabase = createSupabaseBrowserClient()
   ```

2. **Server Client** - Server components, API routes
   ```typescript
   import { createSupabaseServerClient } from '@/lib/supabase'
   const supabase = await createSupabaseServerClient()
   ```

3. **Admin Client** - Bypass RLS (admin operations only)
   ```typescript
   import { createSupabaseAdminClient } from '@/lib/supabase'
   const supabase = createSupabaseAdminClient()
   ```

### Row Level Security (RLS)

All tables protected by RLS policies:
- Users can only see data within their org
- Permission-based access control
- Admin client bypasses RLS for system operations

---

## 🛣️ Routing

### App Router Structure

```
app/
├── (app)/                 # Authenticated app
│   ├── admin/            # Admin features
│   ├── dashboard/        # Main dashboard
│   ├── inventory/        # Inventory management
│   ├── planner/          # Shift planning
│   └── settings/         # User settings
├── (platform)/           # Platform admin (global)
├── (kiosk)/             # Kiosk mode (time clock)
├── login/               # Authentication
└── api/                 # API routes
    └── v1/              # API v1
```

### API Route Patterns

```typescript
// app/api/v1/[resource]/route.ts

export async function GET(request: NextRequest) {
  // 1. Authenticate
  const { hasAccess, orgId } = await checkOrgAdmin()
  if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  
  // 2. Validate input
  const params = request.nextUrl.searchParams
  const locationId = params.get('location_id')
  
  // 3. Fetch data (RLS applies)
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('table')
    .select('*')
    .eq('org_id', orgId)
  
  // 4. Return response
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
```

---

## 🎨 UI Components

### Component Library

- **Radix UI** - Accessible primitives
- **Tailwind CSS** - Utility-first styling
- **Lucide React** - Icons
- **shadcn/ui** - Pre-built components

### Component Patterns

**Server Component (Default):**
```typescript
// Fetch data directly
const { data } = await fetchUsers()

return <UserList users={data} />
```

**Client Component:**
```typescript
'use client'

// Use SWR for data
const { data, isLoading } = useUsers()

if (isLoading) return <Spinner />
return <UserList users={data} />
```

---

## 🔍 Best Practices

### Do's ✅

- ✅ Use `usePermissions()` hook for permissions
- ✅ Use SWR for all server data
- ✅ Use Zustand store only for UI state
- ✅ Import Supabase clients from `/lib/supabase`
- ✅ Use proper logger instead of console.log
- ✅ Add data-testid to interactive elements
- ✅ Handle loading and error states
- ✅ Use TypeScript strictly

### Don'ts ❌

- ❌ Don't use console.log in production
- ❌ Don't store server data in Zustand
- ❌ Don't use deprecated guards or hooks
- ❌ Don't hardcode URLs or credentials
- ❌ Don't fetch data in useEffect
- ❌ Don't bypass RLS without reason
- ❌ Don't ignore TypeScript errors

---

## 📊 Performance

### Caching Strategy

1. **SWR Cache** - 60s-5min for most data
2. **Zustand Persist** - UI state persisted to localStorage
3. **Next.js Cache** - Static pages, API routes
4. **Supabase RLS** - Query optimization via policies

### Optimization Techniques

- Component code splitting
- Selective re-renders with Zustand selectors
- SWR deduplication and revalidation
- Lazy loading for heavy components
- Image optimization with Next.js Image

---

## 🔐 Security

### Layers

1. **Authentication** - Supabase Auth
2. **Authorization** - Permission system
3. **RLS** - Database-level security
4. **API Guards** - Endpoint protection
5. **CSP** - Content Security Policy (middleware)
6. **Rate Limiting** - Per-endpoint limits

### Audit Trail

All mutations logged to `audit_events` table:
- Who performed the action
- What was changed
- When it happened
- IP address and metadata

---

## 📚 Key Files

- `/lib/supabase/index.ts` - Supabase clients
- `/lib/permissions/index.ts` - Permission system
- `/lib/store/unified.ts` - App store
- `/hooks/usePermissions.ts` - Permission hook
- `/lib/admin/guards.ts` - Admin guards
- `/lib/logger.ts` - Logging utility
- `/middleware.ts` - Request middleware

---

## 🚀 Development Workflow

1. **Start dev server:** `npm run dev`
2. **Run type check:** `npm run typecheck`
3. **Run linter:** `npm run lint`
4. **Run tests:** `npm test`
5. **Build:** `npm run build`

---

## 📝 Documentation

- `/MIGRATION_GUIDE.md` - Migration instructions
- `/CODE_REVIEW_ANALYSIS.md` - Refactoring details
- `/README.md` - Setup and overview
- This file - Architecture overview

---

**Last Updated:** 2025
**Version:** 2.0 (Post-refactoring)