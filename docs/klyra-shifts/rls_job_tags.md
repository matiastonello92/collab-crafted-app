# Row-Level Security (RLS) Policies - Job Tags Module

## Tabella `job_tags`

### Policy: `job_tags_select_by_org`
**Command:** `SELECT`  
**Permissive:** Yes

```sql
CREATE POLICY job_tags_select_by_org
ON public.job_tags
FOR SELECT
USING (
  is_platform_admin() 
  OR user_in_org(org_id)
);
```

**Descrizione:**
- **Platform Admin**: può vedere tutti i tag
- **Org Members**: possono vedere i tag della propria org

---

### Policy: `job_tags_insert_by_org_admin`
**Command:** `INSERT`  
**Permissive:** Yes

```sql
CREATE POLICY job_tags_insert_by_org_admin
ON public.job_tags
FOR INSERT
WITH CHECK (
  is_platform_admin() 
  OR (
    user_in_org(org_id) 
    AND user_has_permission(auth.uid(), 'manage_users')
  )
);
```

**Descrizione:**
- **Platform Admin**: può creare tag per qualsiasi org
- **Org Admin**: può creare tag solo per la propria org (richiede permission `manage_users`)

---

### Policy: `job_tags_update_by_org_admin`
**Command:** `UPDATE`  
**Permissive:** Yes

```sql
CREATE POLICY job_tags_update_by_org_admin
ON public.job_tags
FOR UPDATE
USING (
  is_platform_admin() 
  OR (
    user_in_org(org_id) 
    AND user_has_permission(auth.uid(), 'manage_users')
  )
);
```

**Descrizione:**
- Solo **Platform Admin** o **Org Admin** possono aggiornare tag

---

### Policy: `job_tags_delete_by_org_admin`
**Command:** `DELETE`  
**Permissive:** Yes

```sql
CREATE POLICY job_tags_delete_by_org_admin
ON public.job_tags
FOR DELETE
USING (
  is_platform_admin() 
  OR (
    user_in_org(org_id) 
    AND user_has_permission(auth.uid(), 'manage_users')
  )
);
```

**Descrizione:**
- Solo **Platform Admin** o **Org Admin** possono eliminare tag (hard delete se non referenziati)

---

## Tabella `user_job_tags`

### Policy: `user_job_tags_select`
**Command:** `SELECT`  
**Permissive:** Yes

```sql
CREATE POLICY user_job_tags_select
ON public.user_job_tags
FOR SELECT
USING (
  is_platform_admin()
  OR (user_id = auth.uid())
  OR (
    user_in_org(org_id)
    AND (
      user_has_permission(auth.uid(), 'manage_users')
      OR user_in_location(location_id)
    )
  )
);
```

**Descrizione:**
- **Platform Admin**: vede tutte le assegnazioni
- **Utente Base**: vede solo le proprie assegnazioni
- **Org Admin / Manager**: vedono assegnazioni della propria org e location

---

### Policy: `user_job_tags_insert`
**Command:** `INSERT`  
**Permissive:** Yes

```sql
CREATE POLICY user_job_tags_insert
ON public.user_job_tags
FOR INSERT
WITH CHECK (
  is_platform_admin()
  OR (
    user_in_org(org_id)
    AND user_in_location(location_id)
    AND user_has_permission(auth.uid(), 'manage_users')
  )
);
```

**Descrizione:**
- **Platform Admin**: può assegnare tag ovunque
- **Org Admin / Manager**: possono assegnare tag solo nelle location accessibili

---

### Policy: `user_job_tags_update`
**Command:** `UPDATE`  
**Permissive:** Yes

```sql
CREATE POLICY user_job_tags_update
ON public.user_job_tags
FOR UPDATE
USING (
  is_platform_admin()
  OR (
    user_in_org(org_id)
    AND user_in_location(location_id)
    AND user_has_permission(auth.uid(), 'manage_users')
  )
);
```

**Descrizione:**
- Solo **Platform Admin** o **Manager** della location possono aggiornare assegnazioni

---

### Policy: `user_job_tags_delete`
**Command:** `DELETE`  
**Permissive:** Yes

```sql
CREATE POLICY user_job_tags_delete
ON public.user_job_tags
FOR DELETE
USING (
  is_platform_admin()
  OR (
    user_in_org(org_id)
    AND user_in_location(location_id)
    AND user_has_permission(auth.uid(), 'manage_users')
  )
);
```

**Descrizione:**
- Solo **Platform Admin** o **Manager** della location possono rimuovere assegnazioni

---

## Test RLS

### Test 1: Org Admin crea tag per altra org → FAIL

```sql
SET ROLE authenticated;
SET request.jwt.claims TO '{"sub": "user-A-orgX"}';

INSERT INTO public.job_tags (org_id, key, label_it, categoria, color)
VALUES ('org-Y', 'test', 'Test Tag', 'Cucina', '#EF4444');
-- Expected: RLS violation (user_in_org(org-Y) = false)
```

### Test 2: Manager location A assegna tag a user in location B → FAIL

```sql
SET ROLE authenticated;
SET request.jwt.claims TO '{"sub": "manager-locA"}';

INSERT INTO public.user_job_tags (org_id, location_id, user_id, job_tag_id, is_primary)
VALUES ('org-X', 'loc-B', 'user-Y', 'tag-1', false);
-- Expected: RLS violation (user_in_location(loc-B) = false)
```

### Test 3: Base user vede solo proprie assegnazioni → PASS

```sql
SET ROLE authenticated;
SET request.jwt.claims TO '{"sub": "user-base-123"}';

SELECT * FROM public.user_job_tags;
-- Expected: Only rows where user_id = 'user-base-123'
```

---

## Security Considerations

1. **Multi-Tenant Isolation**: `org_id` check obbligatorio in tutte le policy
2. **Location-Scoped Permissions**: Manager possono operare solo nelle proprie location
3. **Least Privilege**: Base users hanno solo `SELECT` sulle proprie assegnazioni
4. **Audit Trail**: `assigned_by` traccia chi ha fatto l'assegnazione (opzionale: aggiungere trigger per audit_events)

---

**Last Updated:** 2025-01-01
