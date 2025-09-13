# Edge Functions - FINAL STATE
**Pre-Migration Multi-Tenant State - FROZEN**  
**Total Edge Functions: 3**

## Complete Edge Function Catalog

### 1. `set_app_context`
- **Path**: `supabase/functions/set_app_context/index.ts`
- **Entry Point**: `index.ts` (183 lines)
- **Purpose**: Set application context (org_id, location_id, user_id) in PostgreSQL session
- **HTTP Methods**: POST, OPTIONS (CORS)
- **Authentication**: JWT Bearer token required
- **Authorization**: Service role validation + user membership verification

#### Function Flow
1. **CORS Handling**: OPTIONS preflight support
2. **Method Validation**: POST only
3. **JWT Authentication**: Bearer token extraction and validation
4. **User Verification**: `supabaseUser.auth.getUser()` 
5. **Membership Check**: Validates user access to org_id/location_id via `users_locations` table
6. **Context Setting**: Calls `supabaseUser.rpc('app.set_context', { p_org, p_location })`

#### Request Format
```json
{
  "org_id": "uuid",
  "location_id": "uuid"
}
```

#### Response Format  
```json
{
  "success": true,
  "context": {
    "user_id": "uuid",
    "org_id": "uuid", 
    "location_id": "uuid"
  },
  "message": "Application context set successfully"
}
```

#### Dependencies
- **Supabase Client**: `@supabase/supabase-js@2`
- **Environment**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`
- **Database**: Requires `users_locations` table and `app.set_context` RPC function
- **Critical**: Core to multi-tenant security model

### 2. `send-invitation`
- **Path**: `supabase/functions/send-invitation/index.ts`
- **Entry Point**: `index.ts` (108 lines)
- **Purpose**: Send invitation emails via Resend API
- **HTTP Methods**: POST, OPTIONS (CORS)
- **Authentication**: Not required (public function)
- **Dependencies**: RESEND_API_KEY secret

#### Function Flow
1. **CORS Handling**: OPTIONS preflight support
2. **Request Parsing**: Extract email parameters
3. **Email Composition**: HTML template with Klyra branding
4. **Email Dispatch**: Resend API integration
5. **Response**: Email delivery confirmation

#### Request Format
```json
{
  "to": "email@example.com",
  "name": "User Name", 
  "inviteUrl": "https://app.com/invite/token",
  "inviterName": "Admin Name" // optional
}
```

#### Email Template Features
- **Branding**: Klyra theme with gradient header
- **Responsive**: Mobile-optimized HTML design
- **Security**: 7-day expiration notice
- **Fallback**: Plain text URL for accessibility
- **Localization**: Italian language template

#### Dependencies
- **Resend**: `npm:resend@2.0.0`
- **Environment**: `RESEND_API_KEY`
- **Usage**: Called from invitation creation workflow

### 3. `run_sql_batch`
- **Path**: `supabase/functions/run_sql_batch/index.ts`  
- **Entry Point**: `index.ts` (183 lines)
- **Purpose**: Execute batch SQL operations securely
- **HTTP Methods**: POST, OPTIONS (CORS)
- **Authentication**: Service role token required
- **Authorization**: Service role key verification

#### Function Flow
1. **CORS Handling**: OPTIONS preflight support
2. **Method Validation**: POST only
3. **Service Role Auth**: Strict service role token verification
4. **SQL Batch Processing**: Execute statements array sequentially
5. **Error Handling**: Idempotent operation support (ignores "already exists" errors)
6. **Result Aggregation**: Success/failure summary with details

#### Request Format
```json
{
  "statements": [
    "CREATE TABLE IF NOT EXISTS ...",
    "INSERT INTO ... VALUES ...",
    "-- comments are skipped"
  ],
  "token": "optional_service_role_key"
}
```

#### Response Format
```json
{
  "success": true,
  "message": "SQL batch execution completed",
  "summary": {
    "total_statements": 3,
    "successful": 2,
    "errors": 1
  },
  "results": [
    {
      "statement": "CREATE TABLE ...",
      "success": true,
      "rowCount": 0
    }
  ],
  "timestamp": "2025-09-13T10:35:58.123Z"
}
```

#### Security Features
- **Service Role Only**: Enforces service role authorization
- **Token Validation**: Direct service role key comparison
- **SQL Injection Protection**: Uses Supabase RPC `exec_sql`
- **Idempotent Operations**: Gracefully handles "already exists" scenarios
- **Logging**: Comprehensive execution logging

#### Dependencies
- **Supabase Client**: `@supabase/supabase-js@2`
- **Environment**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- **Database**: Requires `exec_sql` RPC function
- **Usage**: Database maintenance and setup operations

## Edge Function Configuration

### CORS Headers (All Functions)
```javascript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
```

### Common Dependencies
- **Deno Runtime**: `https://deno.land/std@0.168.0/http/server.ts`
- **Supabase JS**: `https://esm.sh/@supabase/supabase-js@2`
- **Environment Variables**: Standardized Supabase environment setup

### Security Patterns
1. **OPTIONS Handling**: All functions support CORS preflight
2. **Method Validation**: Explicit HTTP method checking
3. **Error Boundaries**: Comprehensive try/catch with structured responses
4. **Logging**: Console logging for debugging and monitoring

## Multi-Tenant Migration Impact

### High Impact Functions
- **`set_app_context`**: Core function - will need org_id validation logic updates
- **`send-invitation`**: Template may need org-specific branding

### Medium Impact Functions  
- **`run_sql_batch`**: May need org-scoped SQL execution capabilities

### Migration Dependencies
- Database schema changes (org_id columns)
- RPC function updates (`app.set_context` signature changes)
- Template customization for multi-org branding
- Service role permission scope adjustments

## Deployment Status
- **Auto-Deploy**: All functions deploy automatically with code changes
- **Monitoring**: Edge Function logs available in Supabase Dashboard
- **Secrets**: RESEND_API_KEY configured and active
- **Testing**: All functions tested and operational

**MIGRATION READY**: All 3 edge functions documented and frozen for multi-tenant transition.