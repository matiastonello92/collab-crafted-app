# Phase 2 Migration Guide - Unified Permissions System

## Overview
Phase 2 introduces a unified permissions system with SWR caching, replacing the scattered `can()` and `hasPermission()` patterns.

## New Patterns

### 1. Use `usePermissions()` hook instead of store
```typescript
// ❌ Old pattern
const { hasPermission, permissionsLoading } = useAppStore()

// ✅ New pattern  
const { permissions, isLoading, hasPermission } = usePermissions()
const { hasPermission } = usePermissionCheck() // For simple checking
```

### 2. Use `PermissionGuard` component for conditional rendering
```typescript
// ❌ Old pattern
{hasPermission('users:view') && <UsersList />}

// ✅ New pattern
<PermissionGuard required="users:view">
  <UsersList />
</PermissionGuard>
```

### 3. Use unified `checkPermission()` function
```typescript
// ❌ Old pattern
import { can } from '@/lib/permissions'
const canEdit = can(permissions, 'users:edit')

// ✅ New pattern
import { checkPermission } from '@/lib/permissions/unified'
const canEdit = checkPermission(permissions, 'users:edit')
```

## Migration Path

### Phase 2.1: Add new hooks alongside existing (✅ Done)
- New `usePermissions()` hook with SWR caching
- New `checkPermission()` unified utility
- New `PermissionGuard` component
- API endpoint caching headers

### Phase 2.2: Gradual component migration (Next)
- Replace `useAppStore().hasPermission` with `usePermissionCheck()`
- Replace manual permission checks with `PermissionGuard`
- Replace `can()` calls with `checkPermission()`

### Phase 2.3: Cleanup old patterns (Later)
- Remove old `useEffectivePermissions` hook
- Clean up Zustand store permissions state
- Remove legacy `can()` function

## Benefits
- ✅ Single source of truth for permissions
- ✅ Automatic SWR caching (5min memory + HTTP cache)
- ✅ Reduced API calls and better performance  
- ✅ Consistent permission checking logic
- ✅ Easy testing and maintenance
- ✅ Backwards compatible during transition