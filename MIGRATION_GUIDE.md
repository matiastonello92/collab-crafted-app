# 🔄 Migration Guide - Code Refactoring 2025

This guide helps you migrate from old patterns to new unified patterns.

---

## 📦 Supabase Client Imports

### ❌ Before (Multiple patterns)
```typescript
// DON'T - Hardcoded credentials (DELETED)
import { supabase } from '@/integrations/supabase/client'

// DON'T - Direct imports
import { createSupabaseBrowserClient } from '@/utils/supabase/client'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
```

### ✅ After (Environment-specific imports)
```typescript
// DO - Client Components
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

// DO - Server Components / API Routes
import { 
  createSupabaseServerClient,
  createSupabaseAdminClient 
} from '@/lib/supabase/server'
```

---

## 🔐 Permission Checking

### ❌ Before (Multiple functions)
```typescript
// DON'T - Old patterns
import { can } from '@/lib/permissions'
import { hasPermission } from '@/hooks/usePermissions'

// Multiple ways to check
if (can(permissions, 'users:edit')) { }
if (hasPermission(permissions, 'users:edit')) { }
```

### ✅ After (Unified pattern)
```typescript
// DO - Single source of truth
import { checkPermission } from '@/lib/permissions'

// Direct check
if (checkPermission(permissions, 'users:edit')) { }

// Or use the hook
import { usePermissions } from '@/hooks/usePermissions'
const { can } = usePermissions()
if (can('users:edit')) { }
```

---

## 🎣 Permission Hooks

### ❌ Before (Multiple hooks)
```typescript
// DON'T - Old store-based hook
import { useEffectivePermissions } from '@/hooks/useEffectivePermissions'
const { permissions, permissionsLoading } = useEffectivePermissions()

// DON'T - Store-based permission check
const hasPermission = useAppStore((state) => state.hasPermission)
```

### ✅ After (SWR-based hook)
```typescript
// DO - Modern SWR hook with caching
import { usePermissions } from '@/hooks/usePermissions'

// Get all permissions
const { permissions, isAdmin, can, isLoading, refetch } = usePermissions()

// Check permission
if (can('users:edit')) { ... }
if (can(['users:edit', 'users:delete'])) { ... }

// Location-scoped permissions
const { permissions } = usePermissions(locationId)
```

---

## 🏪 Store Usage

### ❌ Before (Mixed purposes)
```typescript
// DON'T - Store used for server data
const permissions = useAppStore((state) => state.permissions)
const setPermissions = useAppStore((state) => state.setPermissions)
```

### ✅ After (UI state only)
```typescript
// DO - Store for UI state only
const { context, updateLocation } = useAppStore()

// DO - Use SWR hooks for server data
const { permissions } = usePermissions()
const { data: users } = useSWR('/api/v1/admin/users', fetcher)
```

---

## 🛡️ Admin Guards

### ❌ Before (Deprecated functions)
```typescript
// DON'T - Deprecated guards (DELETED)
import { requireAdmin, checkAdminAccess } from '@/lib/admin/guards'

// Server Component
const userId = await requireAdmin()

// API Route
const { hasAccess } = await checkAdminAccess()
```

### ✅ After (New guards)
```typescript
// DO - Use new org-scoped guards
import { requireOrgAdmin, checkOrgAdmin } from '@/lib/admin/guards'

// Server Component
const { userId, orgId } = await requireOrgAdmin()

// API Route
const { hasAccess, orgId } = await checkOrgAdmin()
if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
```

---

## 📊 Data Fetching

### ❌ Before (Mixed patterns)
```typescript
// DON'T - Raw fetch with useState
const [data, setData] = useState(null)
useEffect(() => {
  fetch('/api/users').then(r => r.json()).then(setData)
}, [])

// DON'T - Over-engineered wrapper (DELETED)
import { useAdvancedData } from '@/hooks/useAdvancedData'
const { data } = useAdvancedData(key, fetcher, config)
```

### ✅ After (Standard SWR)
```typescript
// DO - Direct SWR usage
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const { data, error, isLoading, mutate } = useSWR('/api/users', fetcher, {
  revalidateOnFocus: false,
  dedupingInterval: 60000, // 1 min cache
})

// DO - Create custom hooks for specific resources
function useUsers() {
  return useSWR('/api/v1/admin/users', fetcher)
}
```

---

## 📝 Logging

### ❌ Before (Console.log everywhere)
```typescript
// DON'T - Direct console.log in production
console.log('🔍 User logged in:', user.email)
console.warn('⚠️ Something happened')
```

### ✅ After (Proper logger)
```typescript
// DO - Use logger (only logs in development)
import { createLogger } from '@/lib/logger'

const logger = createLogger('MyComponent')

logger.debug('User logged in', { email: user.email })
logger.warn('Something happened', { context: 'value' })
logger.error('Operation failed', error, { userId })
```

---

## 🔍 Quick Reference

| Old Pattern | New Pattern | File |
|------------|-------------|------|
| `import { supabase } from '@/integrations/...'` | `import { create... } from '@/lib/supabase'` | Any |
| `can(permissions, 'perm')` | `checkPermission(permissions, 'perm')` | Permission checks |
| `useEffectivePermissions()` | `usePermissions()` | Hooks |
| `useAppStore().permissions` | `usePermissions().permissions` | Store |
| `requireAdmin()` | `requireOrgAdmin()` | Guards |
| `console.log(...)` | `logger.debug(...)` | Logging |
| `useAdvancedData(...)` | `useSWR(...)` | Data fetching |

---

## 🚨 Breaking Changes

### Deleted Files
- ❌ `/src/integrations/supabase/client.ts` - Hardcoded credentials
- ❌ `/hooks/useEffectivePermissions.ts` - Use `usePermissions()` instead
- ❌ `/hooks/useAdvancedData.ts` - Use `useSWR` directly

### Deleted Functions
- ❌ `requireAdmin()` - Use `requireOrgAdmin()` instead
- ❌ `checkAdminAccess()` - Use `checkOrgAdmin()` instead
- ❌ `can()` from `/lib/permissions.ts` - Use `checkPermission()` from `/lib/permissions/index.ts`

### Store Changes
- ❌ `permissions` state removed from store
- ❌ `permissionsLoading` state removed
- ❌ `setPermissions()` action removed
- ❌ `hasPermission()` method removed
- ✅ Use `usePermissions()` hook instead

---

## ✅ Migration Checklist

- [ ] Update all Supabase imports to use `/lib/supabase`
- [ ] Replace `useEffectivePermissions()` with `usePermissions()`
- [ ] Replace `can()` with `checkPermission()` or hook's `can()`
- [ ] Update admin guards from `requireAdmin` to `requireOrgAdmin`
- [ ] Remove permission state from store usage
- [ ] Replace `console.log` with logger
- [ ] Replace `useAdvancedData` with `useSWR`
- [ ] Run tests to ensure everything works
- [ ] Update documentation

---

## 📞 Need Help?

If you encounter issues during migration:

1. Check this guide for the pattern
2. Look at updated files for examples
3. Review `/app/CODE_REVIEW_ANALYSIS.md` for details
4. Search codebase for working examples

**Remember:** The goal is simpler, more maintainable code!