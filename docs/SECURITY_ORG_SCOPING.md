# Security: Organization Scoping Guidelines

## Overview

This document outlines the security patterns for multi-tenant organization isolation in the Klyra platform. **CRITICAL**: All admin endpoints MUST enforce organization-level isolation to prevent cross-organization data access.

---

## ✅ Secure Pattern (FOLLOW THIS)

### API Route Implementation

```typescript
import { checkOrgAdmin } from '@/lib/admin/guards'
import { createSupabaseAdminClient } from '@/lib/supabase/server'

export async function GET() {
  // 1. ALWAYS extract orgId from checkOrgAdmin
  const { hasAccess, orgId } = await checkOrgAdmin()
  
  // 2. ALWAYS verify both hasAccess AND orgId
  if (!hasAccess || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const supabase = createSupabaseAdminClient()
  
  // 3. ALWAYS filter queries by org_id
  const { data, error } = await supabase
    .from('table_name')
    .select('*')
    .eq('org_id', orgId)  // ← CRITICAL: Filter by org
    .order('created_at')

  return NextResponse.json({ data })
}

export async function POST(request: Request) {
  const { hasAccess, orgId } = await checkOrgAdmin()
  
  if (!hasAccess || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await request.json()
  const supabase = createSupabaseAdminClient()
  
  // 4. ALWAYS force org_id in INSERT operations
  const { data, error } = await supabase
    .from('table_name')
    .insert({ ...body, org_id: orgId })  // ← CRITICAL: Force org_id
    .select()
    .single()

  return NextResponse.json({ data })
}
```

---

## ❌ Insecure Pattern (NEVER DO THIS)

```typescript
// ❌ BAD: Does not extract orgId
const { hasAccess } = await checkOrgAdmin()

// ❌ BAD: Does not filter by org_id
const { data } = await supabase
  .from('locations')
  .select('*')
  .order('name')  // ← Returns ALL locations from ALL orgs!

// ❌ BAD: Does not force org_id in INSERT
const { data } = await supabase
  .from('locations')
  .insert(body)  // ← Allows creating resources for ANY org!
```

**IMPACT**: An admin from Org A can see/modify data from Org B → **CRITICAL SECURITY BREACH**

---

## 📋 Endpoint Security Checklist

Before deploying any `/api/v1/admin/**` endpoint, verify:

- [ ] Uses `checkOrgAdmin()` and extracts `orgId`
- [ ] Verifies both `hasAccess` AND `orgId` are present
- [ ] **GET requests**: All queries include `.eq('org_id', orgId)`
- [ ] **POST requests**: All inserts force `org_id: orgId`
- [ ] **UPDATE/DELETE requests**: All operations filter by `org_id`
- [ ] Related tables (via foreign keys) are also scoped to the same org
- [ ] RLS policies on database tables enforce org isolation as a backup

---

## 🔒 RLS Policy Requirements

All tables with `org_id` column MUST have RLS policies that enforce organization-level isolation:

```sql
-- Example: locations table RLS policy
CREATE POLICY "locations_select_by_org"
ON public.locations
FOR SELECT
USING (
  is_platform_admin() 
  OR user_in_org(org_id)
);

CREATE POLICY "locations_insert_by_org"
ON public.locations
FOR INSERT
WITH CHECK (
  is_platform_admin() 
  OR user_in_org(org_id)
);
```

**Note**: RLS policies are a **defense-in-depth** measure. API-level filtering is the primary security control.

---

## Additional Security Patterns

### User Management Endpoints

When fetching users for display or assignment:

```typescript
// ✅ SECURE: Filter by org_id and optionally by location_id
export async function GET(request: NextRequest) {
  const { hasAccess, orgId } = await checkOrgAdmin()
  if (!hasAccess || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const locationId = request.nextUrl.searchParams.get('location_id')

  let query = supabase
    .from('profiles')
    .select(`id, full_name, user_roles_locations!inner(location_id, org_id, is_active), memberships!inner(org_id)`)
    .eq('memberships.org_id', orgId)
    .eq('user_roles_locations.org_id', orgId)
    .eq('user_roles_locations.is_active', true)

  if (locationId) {
    query = query.eq('user_roles_locations.location_id', locationId)
  }

  const { data } = await query
  // Deduplicate and return users
}
```

### Cross-Resource Operations

When operating on resources that reference other resources (e.g., assigning roles to users):

```typescript
// ✅ SECURE: Verify ALL resources belong to admin's org
export async function POST(req: Request, { params }: { params: { userId: string } }) {
  const { hasAccess, orgId } = await checkOrgAdmin()
  if (!hasAccess || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await req.json()

  // 1. Verify user belongs to org
  const { data: user } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', params.userId)
    .single()

  if (!user || user.org_id !== orgId) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // 2. Verify role belongs to org
  const { data: role } = await supabase
    .from('roles')
    .select('org_id')
    .eq('id', body.role_id)
    .single()

  if (!role || role.org_id !== orgId) {
    return NextResponse.json({ error: 'Role not found' }, { status: 404 })
  }

  // 3. If location_id provided, verify it belongs to org
  if (body.location_id) {
    const { data: location } = await supabase
      .from('locations')
      .select('org_id')
      .eq('id', body.location_id)
      .single()

    if (!location || location.org_id !== orgId) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }
  }

  // Now safe to proceed with operation
}
```

---

## 🧪 Testing Organization Isolation

### Manual Testing

1. Create 2 organizations (Org A, Org B)
2. Create admin users for each org
3. Login as Org A admin
4. Attempt to access Org B resources via API
5. Verify that Org A admin sees ONLY Org A data

### Automated Testing

See `tests/security/org-isolation.test.ts` for automated integration tests.

Run tests:
```bash
npm run test:security
```

---

## 📊 Secure Endpoints (Verified)

| Endpoint | Status | Notes |
|----------|--------|-------|
| `/api/v1/admin/locations` | ✅ | Fixed: Filters by org_id |
| `/api/v1/admin/roles` | ✅ | Fixed: Filters by org_id |
| `/api/v1/admin/invitations` | ✅ | Fixed: Filters by org_id |
| `/api/v1/admin/leave-types` | ✅ | Already secure |
| `/api/v1/admin/job-tags` | ✅ | Already secure |
| `/api/v1/admin/user-job-tags` | ✅ | Already secure |

---

## 🚨 Insecure Endpoints (Need Fix)

| Endpoint | Issue | Priority |
|----------|-------|----------|
| (None currently) | - | - |

---

## 📖 References

- `lib/admin/guards.ts` - Authentication guards with org_id resolution
- `docs/db_policies_20250913.md` - RLS policies documentation
- `tests/security/org-isolation.test.ts` - Automated security tests
- `SECURITY_FIX_ORG_SCOPING.md` - Detailed fix report

---

**Last Updated**: 2025-01-XX  
**Reviewed By**: Security Team  
**Next Review**: Before each major release
