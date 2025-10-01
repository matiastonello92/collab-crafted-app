# API Development Pattern Guide

This guide documents the correct patterns for building secure API endpoints in the Klyra Shifts application.

## Table of Contents

1. [The "Inventory Pattern" (Recommended)](#the-inventory-pattern-recommended)
2. [Deprecated Anti-Patterns](#deprecated-anti-patterns)
3. [When to Use Admin Client](#when-to-use-admin-client)
4. [Examples](#examples)

---

## The "Inventory Pattern" (Recommended)

The **Inventory Pattern** is the standard approach for all new API endpoints. It provides secure, multi-tenant data access through Supabase RLS policies.

### Key Principles

1. **Use `createSupabaseServerClient()` with RLS**
2. **Authenticate the user** with `supabase.auth.getUser()`
3. **Derive `org_id`** from the entity being accessed (location, invitation, etc.)
4. **Rely on RLS policies** for access control
5. **Add detailed logging** for debugging

### Template

```typescript
// POST /api/v1/example/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { exampleSchema } from '@/lib/validations'

export async function POST(req: NextRequest) {
  try {
    console.log('🔍 [EXAMPLE POST] Starting request');
    
    // 1. Use server client with RLS
    const supabase = await createSupabaseServerClient()
    
    // 2. Authenticate user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('❌ [EXAMPLE POST] Unauthorized - no user');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    console.log('✅ [EXAMPLE POST] User authenticated:', user.id);
    
    // 3. Parse and validate input
    const body = await req.json()
    const validated = exampleSchema.parse(body)
    
    console.log('📥 [EXAMPLE POST] Request body:', validated);
    
    // 4. Derive org_id from the entity being accessed
    // Example: If working with locations
    const { data: location, error: locationError } = await supabase
      .from('locations')
      .select('org_id')
      .eq('id', validated.location_id)
      .maybeSingle()
    
    if (locationError) {
      console.error('❌ [EXAMPLE POST] Error fetching location:', locationError);
      return NextResponse.json({ error: locationError.message }, { status: 500 })
    }
    
    if (!location) {
      console.error('❌ [EXAMPLE POST] Location not found');
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }
    
    console.log('✅ [EXAMPLE POST] Derived org_id:', location.org_id);
    
    // 5. Perform business logic - RLS handles permissions!
    const { data, error } = await supabase
      .from('example_table')
      .insert({
        org_id: location.org_id,
        location_id: validated.location_id,
        // ... other fields
      })
      .select()
      .single()
    
    if (error) {
      console.error('❌ [EXAMPLE POST] Insert error:', error);
      throw error
    }
    
    console.log('✅ [EXAMPLE POST] Success:', data.id);
    
    return NextResponse.json({ data }, { status: 201 })
  } catch (err: any) {
    console.error('❌ [EXAMPLE POST] Unexpected error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
```

### Why This Pattern Works

- **Security**: RLS policies enforce org-level isolation automatically
- **Consistency**: Same pattern across all endpoints
- **Debuggability**: Detailed logging at every step
- **Correctness**: `org_id` is always derived from authoritative sources
- **No Auth Bugs**: User session is validated before any DB access

---

## Deprecated Anti-Patterns

### ❌ Anti-Pattern 1: Using `checkOrgAdmin()`

**Problem**: Relies on `org_id` cookie that is **never populated**, causing 100% failures.

```typescript
// ❌ DEPRECATED - DO NOT USE
import { checkOrgAdmin } from '@/lib/admin/guards'

export async function POST(req: NextRequest) {
  const { hasAccess, orgId } = await checkOrgAdmin()
  // orgId is ALWAYS null - cookie never set!
  // ...
}
```

**Solution**: Use the Inventory Pattern (see above).

---

### ❌ Anti-Pattern 2: Using `createClient()` with Service Role Key

**Problem**: Bypasses RLS and authentication entirely.

```typescript
// ❌ WRONG - Bypasses RLS and auth
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // ❌ NO!
  )
  // No auth, no RLS - security hole!
  // ...
}
```

**Solution**: Use `createSupabaseServerClient()` (see Inventory Pattern).

---

### ❌ Anti-Pattern 3: Using `createSupabaseAdminClient()` for Business Logic

**Problem**: Bypasses RLS for operations that should respect org isolation.

```typescript
// ❌ WRONG - Bypasses RLS for user data
import { createSupabaseAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const adminClient = createSupabaseAdminClient()
  
  // ❌ Admin client bypasses RLS - can see ALL orgs' data!
  const { data } = await adminClient
    .from('profiles')
    .select('*')
  // ...
}
```

**Solution**: Use `createSupabaseServerClient()` unless you have a legitimate admin-only use case (see next section).

---

## When to Use Admin Client

There are **very few** legitimate cases for using `createSupabaseAdminClient()`:

### ✅ Legitimate Use Case 1: Tables Without RLS

If a table has **no RLS policies** (e.g., `platform_admins`, lookup tables), you must use the admin client.

```typescript
// ✅ CORRECT - platform_admins has no RLS
import { createSupabaseAdminClient } from '@/lib/supabase/server'

export async function GET() {
  const adminClient = createSupabaseAdminClient()
  
  // Check if user is platform admin (no RLS on platform_admins table)
  const { data } = await adminClient
    .from('platform_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .single()
  
  // ...
}
```

### ✅ Legitimate Use Case 2: PIN Lookup

The `profiles.pin_code` column has no RLS (for kiosk timeclock lookups).

```typescript
// ✅ CORRECT - pin_code has no RLS
import { createSupabaseAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const adminClient = createSupabaseAdminClient()
  
  // Look up user by PIN (no RLS on pin_code)
  const { data: profile } = await adminClient
    .from('profiles')
    .select('id, full_name, org_id')
    .eq('pin_code', validated.pin_code)
    .single()
  
  // ...
}
```

### ⚠️ Rule of Thumb

**If the table has RLS policies, DO NOT use the admin client for business logic.**

Only use `createSupabaseAdminClient()` for:
- Tables explicitly without RLS (e.g., `platform_admins`)
- Columns explicitly without RLS (e.g., `profiles.pin_code`)
- Admin-only operations (e.g., bootstrap scripts)

---

## Examples

### Example 1: Job Tags API (Correct Pattern)

```typescript
// GET /api/v1/admin/job-tags

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  console.log('🔍 [JOB TAGS GET] Starting request');

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('✅ [JOB TAGS GET] User authenticated:', user.id);

  // Derive org_id from user's membership
  const { data: membership } = await supabase
    .from('memberships')
    .select('org_id')
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'User not in any organization' }, { status: 403 })
  }

  console.log('✅ [JOB TAGS GET] Derived org_id:', membership.org_id);

  // RLS handles permissions!
  const { data, error } = await supabase
    .from('job_tags')
    .select('*')
    .eq('org_id', membership.org_id)
    .order('label_it')

  if (error) {
    console.error('❌ [JOB TAGS GET] Query error:', error);
    throw error
  }

  console.log('✅ [JOB TAGS GET] Found tags:', data?.length || 0);

  return NextResponse.json({ job_tags: data || [] })
}
```

---

### Example 2: Timesheets Export (Correct Pattern)

```typescript
// POST /api/v1/timesheets/export

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { exportTimesheetsSchema } from '@/lib/shifts/timesheet-validations'
import { generateTimesheetsCsv, generateCsvFilename } from '@/lib/exports/csv-generator'

export async function POST(req: NextRequest) {
  try {
    console.log('🔍 [TIMESHEETS EXPORT] Starting export request');

    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      console.error('❌ [TIMESHEETS EXPORT] Unauthorized - no user');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ [TIMESHEETS EXPORT] User authenticated:', user.id);

    const body = await req.json()
    const payload = exportTimesheetsSchema.parse(body)

    const { location_id, period_start, period_end, status, fields } = payload

    // RLS will filter based on user's org and accessible locations
    let query = supabase
      .from('timesheets')
      .select(`
        *,
        user:user_id (
          email,
          raw_user_meta_data
        )
      `)
      .gte('period_start', period_start)
      .lte('period_end', period_end)
      .order('period_start', { ascending: false })

    if (location_id) {
      query = query.eq('location_id', location_id)
    }
    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('❌ [TIMESHEETS EXPORT] Query error:', error);
      throw error
    }

    console.log('✅ [TIMESHEETS EXPORT] Found timesheets:', data?.length || 0);

    // Transform data for CSV
    const timesheets = data.map((ts: any) => ({
      ...ts,
      user: {
        email: ts.user?.email,
        full_name: ts.user?.raw_user_meta_data?.full_name
      }
    }))

    // Generate CSV
    const csv = generateTimesheetsCsv(timesheets, { fields })
    const filename = generateCsvFilename('timesheets')

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv;charset=utf-8;',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })
  } catch (err: any) {
    console.error('❌ [TIMESHEETS EXPORT] Unexpected error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
```

---

### Example 3: Platform Admin Check (Legitimate Admin Client Use)

```typescript
// GET /api/v1/me/permissions

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ✅ CORRECT: platform_admins table has NO RLS, so we must use admin client
  const adminClient = createSupabaseAdminClient()
  const { data: platformAdmin } = await adminClient
    .from('platform_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  const isPlatformAdmin = !!platformAdmin

  // For user-specific data, use RLS-enabled client
  const { data: userPermissions } = await supabase
    .from('user_permissions')
    .select('permission_id, granted')
    .eq('user_id', user.id)

  return NextResponse.json({
    isPlatformAdmin,
    permissions: userPermissions || []
  })
}
```

---

## Migration Checklist

When converting an endpoint to the Inventory Pattern:

- [ ] Replace `checkOrgAdmin()` with `createSupabaseServerClient()` + `auth.getUser()`
- [ ] Replace `createClient(url, serviceKey)` with `createSupabaseServerClient()`
- [ ] Replace `createSupabaseAdminClient()` with `createSupabaseServerClient()` (unless legitimate admin use)
- [ ] Add user authentication check
- [ ] Derive `org_id` from the entity being accessed
- [ ] Remove explicit permission checks (rely on RLS)
- [ ] Add detailed logging (`console.log('🔍 [ENDPOINT] ...')`)
- [ ] Test with multiple users in different orgs to verify isolation

---

## Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Server-Side Rendering with Supabase](https://supabase.com/docs/guides/auth/server-side-rendering)
- Project RLS policies: `docs/klyra-shifts/rls.md`
- Example implementations: `app/api/v1/inventory/**`, `app/api/v1/admin/job-tags/**`

---

**Last Updated**: 2025-01-XX  
**Maintainers**: Klyra Development Team
