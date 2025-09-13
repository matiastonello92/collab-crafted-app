# Step 6 • Verification Report (SaaS)

**Data:** 2025-01-13 • **Ambiente:** Production/Stage

## A) Functions Hardening
- [ ] Nessuna SECURITY DEFINER senza `search_path=public` (query A: PASS/FAIL)
  - Dettagli: (elenco eventuali funzioni non conformi)

## B) RLS Metadata RBAC
- [ ] Admin vede `roles` della propria org (COUNT>=1) — PASS/FAIL (query B.2)
- [ ] Utente base NON vede `roles` (COUNT=0) — PASS/FAIL (query B.3)

## C) Audit Events
- [ ] Tabella `audit_events` presente e con policy — PASS/FAIL (query C)
- [ ] Event `settings.updated` (email_test) scritto negli ultimi 15' — PASS/FAIL
- [ ] Event `user.invited` scritto negli ultimi 15' — PASS/FAIL

## D) API Smoke
- [ ] POST /api/settings/email-test → 200 + messageId — PASS/FAIL
- [ ] POST /api/v1/admin/invitations → 200/201 + email inviata — PASS/FAIL

## Detailed Results

### SQL Verification
```sql
-- Results from qa/sql/step6_verification.sql
-- Check the output file for detailed PASS/FAIL status
```

### API Test Results
```json
{
  "email_test": {
    "status": "PASS/FAIL",
    "messageId": "...",
    "error": "..."
  },
  "invitation_test": {
    "status": "PASS/FAIL", 
    "invitationId": "...",
    "error": "..."
  }
}
```

### Database Audit Verification
Check for recent audit events:

```sql
-- Email test audit
SELECT event_key, created_at, payload->>'action' as action
FROM audit_events
WHERE event_key='settings.updated'
  AND (payload->>'action')='email_test'  
  AND created_at > now() - interval '15 minutes'
ORDER BY created_at DESC LIMIT 1;

-- Invitation audit  
SELECT event_key, payload->>'email' as email, created_at
FROM audit_events
WHERE event_key='user.invited'
  AND created_at > now() - interval '15 minutes'
ORDER BY created_at DESC LIMIT 1;
```

## Esito complessivo
- ✅ PASS / ⚠️ PARTIAL / ❌ FAIL

### Note & next steps:
- Review any FAIL results and address underlying issues
- Verify email configuration if email tests fail
- Check user permissions if RBAC tests fail
- Validate database migrations if table/policy checks fail

## Troubleshooting Guide

### Common Issues

**Functions without search_path=public:**
```sql
-- Fix with:
ALTER FUNCTION function_name() SET search_path = public;
```

**RLS Policy Issues:**
- Verify user has correct org membership
- Check JWT claims are properly set
- Validate helper functions like `user_in_org()` work

**Audit Events Missing:**
- Check if audit logging is enabled
- Verify RLS policies allow insertion
- Check trigger functions are working

**API Failures:**
- Verify RESEND_API_KEY is set and valid
- Check user authentication tokens
- Validate email domain is verified in Resend
- Review server logs for detailed errors

## Files Generated
- SQL verification: `qa/sql/step6_verification.out.txt`
- API test results: `qa/http/step6_*`
- Full report: This file