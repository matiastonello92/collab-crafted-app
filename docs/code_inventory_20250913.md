# Code Inventory Snapshot - 2025-09-13

**Pre-Migration Multi-Tenant State**

## API Routes Catalog

### Admin API Routes (`/app/api/v1/admin/*`)

#### User Management
- `GET /api/v1/admin/users/[userId]` - Get user details
- `PATCH /api/v1/admin/users/[userId]` - Update user  
- `POST /api/v1/admin/users/[userId]/roles` - Assign user role
- `DELETE /api/v1/admin/users/[userId]/roles` - Revoke user role
- `GET /api/v1/admin/users/[userId]/permissions` - Get user permissions

#### Location Management  
- `GET /api/v1/admin/locations` - List all locations
- `POST /api/v1/admin/locations` - Create location
- `PATCH /api/v1/admin/locations/[id]` - Update location (admin)
- `PATCH /api/v1/admin/locations/[id]/schedule` - Update schedule (manager)
- `POST /api/v1/admin/locations/[id]/managers` - Assign location manager
- `DELETE /api/v1/admin/locations/[id]/managers` - Remove location manager
- `POST /api/v1/admin/locations/upload-photo` - Upload location photo

#### Invitation Management
- `GET /api/v1/admin/invitations` - List invitations
- `POST /api/v1/admin/invitations` - Create invitation
- `POST /api/v1/admin/invitations/[invitationId]/revoke` - Revoke invitation

#### System Data
- `GET /api/v1/admin/permissions` - List all permissions
- `GET /api/v1/admin/roles` - List all roles (with inviteOnly filter)
- `GET /api/v1/admin/job-tags` - List job tags
- `POST /api/v1/admin/user-job-tags` - Assign job tags to user
- `POST /api/v1/admin/bootstrap` - System bootstrap

### User API Routes (`/app/api/v1/me/*`)
- `GET /api/v1/me/permissions` - Get current user permissions

### Public API Routes
- `POST /api/public/invite/accept` - Accept invitation (public)

### System/QA API Routes  
- `GET /api/health` - Health check
- `GET /api/qa/cookies` - Debug cookies
- `GET /api/qa/session` - Debug session
- `GET /api/qa/snapshot` - Get auth snapshot
- `POST /api/admin/send-test-email` - Test email functionality

### Internal API Routes
- `POST /api/internal/setup/apply-migrations` - Apply database migrations
- `GET /api/internal/setup/bootstrap-report` - Get bootstrap status

## Edge Functions

### Active Edge Functions (`/supabase/functions/`)

#### 1. `set_app_context`
- **Purpose**: Set application context (org_id, location_id, user_id) in PostgreSQL session
- **File**: `supabase/functions/set_app_context/index.ts`
- **Usage**: Called by middleware for context-aware RLS
- **Critical**: Core to multi-tenant security model

#### 2. `send-invitation`  
- **Purpose**: Send invitation emails via Resend API
- **File**: `supabase/functions/send-invitation/index.ts`
- **Dependencies**: RESEND_API_KEY secret
- **Usage**: Called from invitation creation workflow

#### 3. `run_sql_batch`
- **Purpose**: Execute batch SQL operations
- **File**: `supabase/functions/run_sql_batch/index.ts`  
- **Usage**: Database maintenance and setup operations

## Server-Side Guards & Helpers

### SSR Guards (`/lib/admin/guards.ts`)

#### 1. `requireAdmin()`
- **Purpose**: Server-side admin guard with redirect
- **Returns**: `string` (user ID)
- **Behavior**: Redirects to /login if not authenticated, to home if not admin
- **Usage**: Used in admin page components

#### 2. `checkAdminAccess()`
- **Purpose**: Admin check for API routes (no redirect)
- **Returns**: `{ userId: string | null; hasAccess: boolean }`
- **Usage**: Used in API route handlers

### Permission Helpers (`/lib/permissions/can.ts`)

#### 1. `can(userId, permission, context?)`
- **Purpose**: Check single permission  
- **Server**: Direct DB queries with RLS
- **Client**: API call to `/api/v1/me/permissions`
- **Returns**: `Promise<boolean>`

#### 2. `canAny(userId, permissions[], context?)`
- **Purpose**: Check if user has ANY of the permissions
- **Returns**: `Promise<boolean>`

#### 3. `canAll(userId, permissions[], context?)`  
- **Purpose**: Check if user has ALL of the permissions
- **Returns**: `Promise<boolean>`

### Permission Registry (`/lib/permissions/registry.ts`)
- **Total Permissions**: 45+ categorized permissions
- **Categories**: Users, Locations, Invitations, System, Features
- **Format**: Normalized `module:action` format (e.g., `users:manage`)

### Legacy Permission Helper (`/lib/permissions.ts`)
- **Function**: `can(perms, required)` - Legacy sync permission checker
- **Usage**: Used in client-side components with store

## Application Sections

### `/settings` - User Settings
#### Personal Settings (`/app/(app)/settings/page.tsx`)
- **Component**: `UserSettingsClient`
- **Purpose**: User profile management
- **Features**: Name, avatar, phone, locale, timezone, notifications

#### Admin Settings (`/app/(app)/admin/settings/page.tsx`)
- **Component**: `AdminSettingsClient` 
- **Purpose**: System-wide administrative settings
- **Guard**: `requireAdmin()` SSR guard

### `/invite` - Invitation System  
#### Public Acceptance (`/app/invite/[token]/page.tsx`)
- **Component**: `InviteAcceptance`
- **Purpose**: Public invitation acceptance flow
- **Security**: Token-based validation

#### Admin Management (`/app/(app)/admin/invitations/page.tsx`)
- **Components**: `InvitationsList`, `InviteUserForm`
- **Purpose**: Administrative invitation management
- **Guard**: Admin permissions required

### `/qa` - Debug & Testing
#### QA Dashboard (`/app/(app)/qa/page.tsx`)
- **Purpose**: Development and testing tools
- **Features**: System diagnostics, debug information

#### Health Check (`/app/(app)/qa/health/page.tsx`)  
- **Purpose**: System health monitoring
- **API**: Calls `/api/health` endpoint

#### Identity Debug (`/app/(app)/qa/whoami/page.tsx`)
- **Purpose**: Debug user identity and permissions
- **API**: Calls `/api/qa/session` and `/api/qa/snapshot`

### `/admin/*` - Administrative Console

#### Users Management (`/app/(app)/admin/users/`)
- **Main**: `page.tsx` - User listing with `UserTable`
- **Details**: `[id]/page.tsx` - Individual user management
- **Components**: 
  - `UserOverview` - Basic user info
  - `RolesByLocationPanel` - Role assignments  
  - `PermissionOverridesPanel` - Permission overrides
  - `EffectivePermissions` - Computed permissions
  - `JobTagsPanel` - Job tag assignments
  - `ActivityPanel` - User activity logs
  - `DeleteUserDialog` - User deletion
- **Invite**: `invite/page.tsx` - New user invitation

#### Locations Management (`/app/(app)/admin/locations/`)
- **Main**: `page.tsx` - Location listing
- **Create**: `create/page.tsx` - New location creation  
- **Details**: `[id]/page.tsx` - Location management with tabs:
  - `LocationInfoTab` - Basic information
  - `LocationScheduleTab` - Operating hours
  - `LocationManagersTab` - Manager assignments

#### Feature Management
- **Feature Flags**: `/admin/feature-flags/page.tsx`
- **Flags**: `/admin/flags/page.tsx` (alternate route)

## Security Architecture

### Authentication Flow
1. **Middleware**: `middleware.ts` - Supabase auth check
2. **Context Setting**: Edge function `set_app_context` for RLS
3. **Guards**: Server-side `requireAdmin()` and `checkAdminAccess()`
4. **Permission Checks**: `can()` helpers with context

### Permission System
- **Storage**: Zustand store (`/lib/store.ts`) for client state
- **Server**: Direct DB queries with RLS for accuracy  
- **Caching**: Client-side permission cache with context awareness
- **Registry**: Centralized permission definitions

### RLS Context
- **Current**: Location-scoped permissions via `app.location_id`
- **Migration Target**: Organization + location scoping
- **Critical Functions**: `jwt_is_admin()`, `user_has_permission()`

## Multi-Tenant Migration Impact

### High Impact Areas
1. **Edge Functions**: Need org_id context
2. **Permission Helpers**: Context parameter usage
3. **RLS Policies**: Add org_id scoping  
4. **Admin Guards**: Multi-org admin logic

### Medium Impact Areas  
1. **API Routes**: Organization context validation
2. **UI Components**: Organization selector
3. **Store**: Organization state management

### Low Impact Areas
1. **Utility Functions**: Minimal changes expected
2. **Static Components**: No changes needed
3. **Styling**: Theme system already established

## Operational Status
- **Active Users**: 2
- **Active Locations**: 3  
- **Active Roles**: 19
- **Pending Invitations**: 13 (1 accepted)
- **System Status**: Fully operational with Klyra branding
- **Theme**: Dark mode native support implemented