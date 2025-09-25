# PROMPT AGENTE - ARCHITETTURA ENTERPRISE MULTI-TENANT

## OVERVIEW ARCHITETTURALE

Costruisci una piattaforma SaaS enterprise-grade multi-tenant con architettura multi-location, sistema RBAC/ABAC avanzato, performance ottimizzate e sicurezza di livello enterprise.

### STACK TECNOLOGICO
- **Frontend**: Next.js 15.5.2 (App Router) + React 18.3.1 + TypeScript
- **Styling**: Tailwind CSS + Shadcn/ui + Custom Design System (HSL tokens)
- **State Management**: Zustand + SWR + React Query (TanStack)
- **Backend**: Supabase (PostgreSQL + Edge Functions + Auth + Storage)
- **Security**: Row Level Security (RLS) + JWT + Multi-layer auth
- **Performance**: SSR/SSG + Smart caching + Data separation + Route optimization

## DATABASE SCHEMA COMPLETA

### CORE TABLES

```sql
-- Organizations (tenant isolation)
CREATE TABLE public.organizations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Locations (multi-location support)
CREATE TABLE public.locations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id),
  name text NOT NULL,
  address jsonb,
  settings jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- User Profiles (extended user data)
CREATE TABLE public.user_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid UNIQUE NOT NULL, -- References auth.users
  email text UNIQUE NOT NULL,
  first_name text,
  last_name text,
  avatar_url text,
  phone text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Permissions Registry
CREATE TABLE public.permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text UNIQUE NOT NULL, -- e.g., 'users:view', 'locations:edit'
  name text NOT NULL,
  description text,
  module text NOT NULL, -- e.g., 'users', 'locations', 'admin'
  created_at timestamptz DEFAULT now()
);

-- Roles
CREATE TABLE public.roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id),
  code text NOT NULL, -- e.g., 'admin', 'manager', 'employee'
  name text NOT NULL,
  description text,
  level integer DEFAULT 0, -- Hierarchy level (90+ = admin)
  is_system boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(org_id, code)
);

-- Role Permissions (many-to-many)
CREATE TABLE public.role_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

-- User Roles (location-scoped)
CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL, -- References auth.users
  org_id uuid NOT NULL REFERENCES public.organizations(id),
  role_id uuid NOT NULL REFERENCES public.roles(id),
  location_id uuid NULL REFERENCES public.locations(id), -- NULL = all locations
  assigned_by uuid, -- References auth.users
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, org_id, role_id, location_id)
);

-- User Permission Overrides (granular control)
CREATE TABLE public.user_permission_overrides (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL, -- References auth.users
  org_id uuid NOT NULL REFERENCES public.organizations(id),
  permission_id uuid NOT NULL REFERENCES public.permissions(id),
  location_id uuid NULL REFERENCES public.locations(id), -- NULL = all locations
  allow boolean NOT NULL, -- true = grant, false = deny
  reason text,
  assigned_by uuid, -- References auth.users
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Invitations System
CREATE TABLE public.invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id),
  email text NOT NULL,
  token text UNIQUE NOT NULL,
  invited_by uuid NOT NULL, -- References auth.users
  role_id uuid NOT NULL REFERENCES public.roles(id),
  location_id uuid NULL REFERENCES public.locations(id),
  permissions jsonb DEFAULT '[]', -- Override permissions
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Feature Flags
CREATE TABLE public.feature_flags (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NULL REFERENCES public.organizations(id), -- NULL = global
  code text NOT NULL,
  name text NOT NULL,
  description text,
  is_enabled boolean DEFAULT false,
  config jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(org_id, code)
);

-- Audit Log
CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NULL REFERENCES public.organizations(id),
  user_id uuid, -- References auth.users
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  old_values jsonb,
  new_values jsonb,
  metadata jsonb DEFAULT '{}',
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Event Outbox (event-driven architecture)
CREATE TABLE public.event_outbox (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type text NOT NULL,
  aggregate_id uuid NOT NULL,
  event_data jsonb NOT NULL,
  metadata jsonb DEFAULT '{}',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  retry_count integer DEFAULT 0,
  max_retries integer DEFAULT 3,
  scheduled_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  created_at timestamptz DEFAULT now()
);
```

### CRITICAL SQL FUNCTIONS

```sql
-- Set Application Context (security boundary)
CREATE OR REPLACE FUNCTION app.set_context_checked(p_org uuid, p_location uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_result jsonb;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Verify user has access to organization
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = v_user_id AND ur.org_id = p_org
  ) THEN
    RAISE EXCEPTION 'Access denied to organization';
  END IF;
  
  -- Verify location belongs to organization
  IF p_location IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.locations l 
    WHERE l.id = p_location AND l.org_id = p_org
  ) THEN
    RAISE EXCEPTION 'Location does not belong to organization';
  END IF;
  
  -- Set context
  PERFORM set_config('app.current_org_id', p_org::text, true);
  PERFORM set_config('app.current_location_id', COALESCE(p_location::text, ''), true);
  PERFORM set_config('app.current_user_id', v_user_id::text, true);
  
  v_result := jsonb_build_object(
    'org_id', p_org,
    'location_id', p_location,
    'user_id', v_user_id,
    'success', true
  );
  
  RETURN v_result;
END;
$$;

-- Get Effective Permissions (location-scoped)
CREATE OR REPLACE FUNCTION app.get_effective_permissions(p_user uuid, p_org uuid, p_location uuid)
RETURNS TABLE(permission text)
LANGUAGE sql
STABLE
AS $$
  WITH role_codes AS (
    SELECT DISTINCT p.code
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id AND r.org_id = ur.org_id
    JOIN public.role_permissions rp ON rp.role_id = r.id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = p_user
      AND ur.org_id = p_org
      AND (ur.location_id IS NULL OR ur.location_id = p_location)
  ),
  apply_overrides AS (
    SELECT rc.code AS permission, TRUE AS allowed
    FROM role_codes rc
    UNION ALL
    SELECT p.code, upo.allow AS allowed
    FROM public.user_permission_overrides upo
    JOIN public.permissions p ON p.id = upo.permission_id
    WHERE upo.user_id = p_user
      AND upo.org_id = p_org
      AND (upo.location_id IS NULL OR upo.location_id = p_location)
  ),
  resolved AS (
    SELECT permission,
           BOOL_OR(allowed) FILTER (WHERE allowed = TRUE) AS any_allow,
           BOOL_OR(NOT allowed) FILTER (WHERE allowed = FALSE) AS any_deny
    FROM apply_overrides
    GROUP BY permission
  )
  SELECT permission
  FROM resolved
  WHERE (any_allow = TRUE AND any_deny = FALSE)
     OR (any_allow = TRUE AND any_deny IS NULL)
     OR (any_allow IS NULL AND any_deny = FALSE);
$$;

-- Audit Trigger Function
CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    org_id,
    user_id,
    action,
    resource_type,
    resource_id,
    old_values,
    new_values,
    ip_address
  ) VALUES (
    COALESCE(
      NULLIF(current_setting('app.current_org_id', true), ''),
      NEW.org_id::text,
      OLD.org_id::text
    )::uuid,
    NULLIF(current_setting('app.current_user_id', true), '')::uuid,
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' THEN to_jsonb(NEW) 
         WHEN TG_OP = 'UPDATE' THEN to_jsonb(NEW) 
         ELSE NULL END,
    inet_client_addr()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;
```

### ROW LEVEL SECURITY (RLS) POLICIES

```sql
-- Organizations: Users can only see their orgs
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own organizations" ON public.organizations
FOR ALL USING (
  id IN (
    SELECT ur.org_id FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid()
  )
);

-- Locations: Org-scoped access
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Location org access" ON public.locations
FOR ALL USING (
  org_id IN (
    SELECT ur.org_id FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid()
  )
);

-- User Profiles: Own profile + admin view
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own profile access" ON public.user_profiles
FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admin profile access" ON public.user_profiles
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.level >= 90
  )
);

-- Permissions: Read-only for authenticated users
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permissions read access" ON public.permissions
FOR SELECT USING (auth.role() = 'authenticated');

-- Additional RLS policies for all other tables...
```

## DESIGN SYSTEM ARCHITETTURA

### Tailwind Configuration (tailwind.config.ts)
```typescript
export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
```

### Global Styles (app/globals.css)
```css
:root {
  --background: 0 0% 100%;
  --foreground: 224 71.4% 4.1%;
  --card: 0 0% 100%;
  --card-foreground: 224 71.4% 4.1%;
  --popover: 0 0% 100%;
  --popover-foreground: 224 71.4% 4.1%;
  --primary: 220.9 39.3% 11%;
  --primary-foreground: 210 20% 98%;
  --secondary: 220 14.3% 95.9%;
  --secondary-foreground: 220.9 39.3% 11%;
  --muted: 220 14.3% 95.9%;
  --muted-foreground: 220 8.9% 46.1%;
  --accent: 220 14.3% 95.9%;
  --accent-foreground: 220.9 39.3% 11%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 20% 98%;
  --border: 220 13% 91%;
  --input: 220 13% 91%;
  --ring: 224 71.4% 4.1%;
  --radius: 0.5rem;
}

.dark {
  --background: 224 71.4% 4.1%;
  --foreground: 210 20% 98%;
  --card: 224 71.4% 4.1%;
  --card-foreground: 210 20% 98%;
  --popover: 224 71.4% 4.1%;
  --popover-foreground: 210 20% 98%;
  --primary: 210 20% 98%;
  --primary-foreground: 220.9 39.3% 11%;
  --secondary: 215 27.9% 16.9%;
  --secondary-foreground: 210 20% 98%;
  --muted: 215 27.9% 16.9%;
  --muted-foreground: 217.9 10.6% 64.9%;
  --accent: 215 27.9% 16.9%;
  --accent-foreground: 210 20% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 210 20% 98%;
  --border: 215 27.9% 16.9%;
  --input: 215 27.9% 16.9%;
  --ring: 216 12.2% 83.9%;
}
```

## STATE MANAGEMENT UNIFICATO

### Zustand Store (lib/store/unified.ts)
```typescript
interface AppContext {
  org_id: string | null
  location_id: string | null
  location_name: string | null
  user_id: string | null
}

interface PerformanceMetrics {
  cacheHits: number
  cacheMisses: number
  averageLoadTime: number
}

interface AppState {
  hasHydrated: boolean
  context: AppContext
  permissions: string[]
  permissionsLoading: boolean
  metrics: PerformanceMetrics
  
  // Actions
  setContext: (context: Partial<AppContext>) => void
  updateLocation: (locationId: string, locationName?: string) => void
  clearContext: () => void
  setPermissions: (permissions: string[]) => void
  setPermissionsLoading: (loading: boolean) => void
  hasPermission: (permission: string | string[]) => boolean
  recordCacheHit: () => void
  recordCacheMiss: () => void
  updateLoadTime: (time: number) => void
}

export const useAppStore = create<AppState>()(
  subscribeWithSelector(
    persist(
      immer((set, get) => ({
        hasHydrated: false,
        context: { org_id: null, location_id: null, location_name: null, user_id: null },
        permissions: [],
        permissionsLoading: false,
        metrics: { cacheHits: 0, cacheMisses: 0, averageLoadTime: 0 },
        
        setContext: (newContext) => set((state) => {
          Object.assign(state.context, newContext)
        }),
        
        updateLocation: (locationId, locationName) => set((state) => {
          state.context.location_id = locationId
          if (locationName) state.context.location_name = locationName
        }),
        
        clearContext: () => set((state) => {
          state.context = { org_id: null, location_id: null, location_name: null, user_id: null }
          state.permissions = []
        }),
        
        setPermissions: (permissions) => set((state) => {
          state.permissions = permissions
        }),
        
        setPermissionsLoading: (loading) => set((state) => {
          state.permissionsLoading = loading
        }),
        
        hasPermission: (required) => {
          const permissions = get().permissions
          if (permissions.includes('*')) return true
          
          const requiredList = Array.isArray(required) ? required : [required]
          return requiredList.some(perm => {
            if (permissions.includes(perm)) return true
            const [module] = perm.split(':')
            return module && permissions.includes(`${module}:*`)
          })
        },
        
        recordCacheHit: () => set((state) => {
          state.metrics.cacheHits++
        }),
        
        recordCacheMiss: () => set((state) => {
          state.metrics.cacheMisses++
        }),
        
        updateLoadTime: (time) => set((state) => {
          const current = state.metrics.averageLoadTime
          state.metrics.averageLoadTime = current ? (current + time) / 2 : time
        })
      })),
      {
        name: 'app-store',
        partialize: (state) => ({ context: state.context }),
        onRehydrateStorage: () => (state) => {
          if (state) {
            state.hasHydrated = true
            state.metrics = { cacheHits: 0, cacheMisses: 0, averageLoadTime: 0 }
          }
        }
      }
    )
  )
)
```

### Hydration Safety System

```typescript
// lib/hydration/HydrationToolkit.ts
export function useIsClient(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

export function ssrSafeNow(): number {
  return typeof window === "undefined" ? 0 : Date.now();
}

export function ssrGuard<T>(value: T, fallback: T): T {
  return typeof window === "undefined" ? fallback : value;
}

// components/ClientOnly.tsx
export default function ClientOnly({
  children,
  fallback = null,
}: { children: ReactNode; fallback?: ReactNode }) {
  const isClient = useIsClient();
  if (!isClient) return <>{fallback}</>;
  return <>{children}</>;
}

// lib/store/useHydratedStore.ts
export function useHydratedStore(): any {
  const store = useAppStore()
  const hasHydrated = useAppStore(state => state.hasHydrated)
  
  if (!hasHydrated) {
    return {
      hasHydrated: false,
      context: { org_id: null, location_id: null, location_name: null, user_id: null },
      permissions: [],
      permissionsLoading: false,
      metrics: { cacheHits: 0, cacheMisses: 0, averageLoadTime: 0 },
      setContext: () => {},
      updateLocation: () => {},
      clearContext: () => {},
      setPermissions: () => {},
      setPermissionsLoading: () => {},
      hasPermission: () => false,
      recordCacheHit: () => {},
      recordCacheMiss: () => {},
      updateLoadTime: () => {}
    }
  }
  
  return store
}
```

## SISTEMA PERMESSI AVANZATO

### Unified Permissions Hook (hooks/usePermissions.ts)
```typescript
interface PermissionsResponse {
  permissions: string[]
  is_admin?: boolean
}

export function usePermissions(locationId?: string) {
  const key = locationId 
    ? `/api/v1/me/permissions?locationId=${locationId}`
    : '/api/v1/me/permissions'
  
  const { data, error, isLoading, mutate } = useSWR<PermissionsResponse>(
    key,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000, // 5min cache
      errorRetryCount: 2,
      errorRetryInterval: 1000,
    }
  )

  const permissions = data?.permissions ? normalizeSet(data.permissions) : []
  const isAdmin = data?.is_admin || permissions.includes('*')

  return {
    permissions,
    isAdmin,
    isLoading,
    error,
    mutate,
  }
}

export function hasPermission(permissions: string[], required: string | string[]): boolean {
  if (!permissions || permissions.length === 0) return false
  
  if (permissions.includes('*')) return true
  
  const requiredList = Array.isArray(required) ? required : [required]
  
  return requiredList.some(perm => {
    if (permissions.includes(perm)) return true
    
    const [module] = perm.split(':')
    if (module && permissions.includes(`${module}:*`)) return true
    
    return false
  })
}

export function usePermissionCheck() {
  const { permissions, isLoading } = usePermissions()
  
  return {
    hasPermission: (required: string | string[]) => hasPermission(permissions, required),
    isLoading,
  }
}
```

### Permission Guard Component (components/permissions/PermissionGuard.tsx)
```typescript
interface PermissionGuardProps {
  permission: string | string[]
  fallback?: React.ReactNode
  children: React.ReactNode
  requireAll?: boolean
}

export function PermissionGuard({ 
  permission, 
  fallback = null, 
  children, 
  requireAll = false 
}: PermissionGuardProps) {
  const { hasPermission, isLoading } = usePermissionCheck()
  
  if (isLoading) {
    return <div className="animate-pulse bg-muted h-8 rounded" />
  }
  
  const permissions = Array.isArray(permission) ? permission : [permission]
  const hasAccess = requireAll 
    ? permissions.every(p => hasPermission(p))
    : permissions.some(p => hasPermission(p))
  
  if (!hasAccess) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}
```

## PERFORMANCE OPTIMIZATION

### Advanced Data Fetching (hooks/useAdvancedData.ts)
```typescript
interface CacheConfig {
  ttl?: number
  revalidateOnFocus?: boolean
  dedupingInterval?: number
  errorRetryCount?: number
}

export function useAdvancedData<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  config: CacheConfig = {}
) {
  const store = useAppStore()
  
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    key,
    async () => {
      const start = Date.now()
      try {
        const result = await fetcher()
        store.recordCacheHit()
        return result
      } catch (err) {
        store.recordCacheMiss()
        throw err
      } finally {
        store.updateLoadTime(Date.now() - start)
      }
    },
    {
      revalidateOnFocus: config.revalidateOnFocus ?? false,
      dedupingInterval: config.dedupingInterval ?? 300000,
      errorRetryCount: config.errorRetryCount ?? 2,
      ...config
    }
  )

  return {
    data,
    error,
    isLoading,
    isValidating,
    refresh: () => mutate(),
    updateData: (newData: T) => mutate(newData, false),
    mutate
  }
}

export function useBatchData<T extends Record<string, any>>(
  queries: Record<keyof T, () => Promise<any>>,
  config: CacheConfig = {}
) {
  const results = Object.entries(queries).map(([key, fetcher]) => {
    const result = useAdvancedData(key as string, fetcher as () => Promise<any>, config)
    return [key, result] as const
  })

  const data = Object.fromEntries(
    results.map(([key, result]) => [key, result.data])
  ) as T

  const isLoading = results.some(([, result]) => result.isLoading)
  const hasError = results.some(([, result]) => result.error)

  return {
    data,
    isLoading,
    hasError,
    refreshAll: () => results.forEach(([, result]) => result.refresh()),
    results: Object.fromEntries(results)
  }
}

export function useOptimisticData<T>(
  key: string,
  fetcher: () => Promise<T>,
  config: CacheConfig = {}
) {
  const { data, error, isLoading, mutate } = useAdvancedData(key, fetcher, config)
  
  const optimisticUpdate = useCallback(async (
    optimisticData: T,
    updateFn: () => Promise<T>
  ) => {
    try {
      await mutate(optimisticData, false)
      const result = await updateFn()
      await mutate(result, false)
      return result
    } catch (err) {
      await mutate()
      throw err
    }
  }, [mutate])

  return {
    data,
    error,
    isLoading,
    optimisticUpdate,
    mutate
  }
}
```

### Smart Loading Components
```typescript
// components/performance/SmartLoading.tsx
export function SmartSkeleton({ 
  count = 1, 
  height = "h-4", 
  className = "" 
}: SmartSkeletonProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={cn(height, "w-full")} />
      ))}
    </div>
  )
}

export function AdaptiveLoader({ 
  isLoading, 
  error, 
  data, 
  children, 
  fallback, 
  errorFallback 
}: AdaptiveLoaderProps) {
  if (error) {
    return errorFallback || <div className="text-destructive">Error loading data</div>
  }
  
  if (isLoading || !data) {
    return fallback || <SmartSkeleton count={3} />
  }
  
  return <>{children}</>
}
```

## AUTHENTICATION & SECURITY

### Auth Guard (components/auth/AuthGuard.tsx)
```typescript
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }
      
      setUser(user)
      setLoading(false)
    }

    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          router.push('/login')
        } else if (event === 'SIGNED_IN') {
          setUser(session.user)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [router])

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary" />
    </div>
  }

  if (!user) {
    return null
  }

  return <>{children}</>
}
```

### Middleware Security (middleware.ts)
```typescript
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options?: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options?: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Protected routes
  const protectedPaths = ['/dashboard', '/admin', '/me', '/settings']
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))

  if (isProtectedPath) {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // Public routes that should redirect if authenticated
  const publicPaths = ['/login']
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path))

  if (isPublicPath) {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

## LAYOUT ARCHITECTURE

### Root Layout (app/layout.tsx)
```typescript
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" suppressHydrationWarning>
      <body className={cn("min-h-[100svh] bg-background text-foreground antialiased", inter.className)}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <QueryProvider>
            {children}
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### App Layout with Shell (app/(app)/layout.tsx)
```typescript
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <AppShell>
        {children}
      </AppShell>
    </AuthGuard>
  )
}
```

### App Shell (components/layouts/AppShell.tsx)
```typescript
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ClientOnly fallback={<AppShellSkeleton />}>
      <div className="min-h-screen bg-background">
        <SidebarProvider>
          <div className="flex min-h-screen">
            <AppSidebar />
            <div className="flex-1 flex flex-col">
              <Header />
              <main className="flex-1 p-6">
                {children}
              </main>
            </div>
          </div>
        </SidebarProvider>
      </div>
    </ClientOnly>
  )
}
```

## API ROUTES STRUCTURE

### Authentication API (app/api/v1/me/permissions/route.ts)
```typescript
export async function GET(request: Request) {
  const supabase = createSupabaseServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const locationId = searchParams.get('locationId')

  try {
    // Get current org context
    const { data: orgContext } = await supabase
      .rpc('app.get_current_context')

    if (!orgContext?.org_id) {
      return NextResponse.json({ error: 'No organization context' }, { status: 400 })
    }

    // Get effective permissions
    const { data: permissions } = await supabase
      .rpc('app.get_effective_permissions', {
        p_user: user.id,
        p_org: orgContext.org_id,
        p_location: locationId || orgContext.location_id
      })

    const permissionCodes = permissions?.map(p => p.permission) || []
    const isAdmin = permissionCodes.includes('*')

    return NextResponse.json({
      permissions: permissionCodes,
      is_admin: isAdmin
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch permissions' }, { status: 500 })
  }
}
```

### Admin API Routes
```typescript
// app/api/v1/admin/users/route.ts
export async function GET() {
  const { hasAccess, user, orgId } = await checkOrgAdmin()
  if (!hasAccess) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const supabase = createSupabaseAdminClient()
  
  const { data: users, error } = await supabase
    .from('user_profiles')
    .select(`
      *,
      user_roles!inner(
        role_id,
        location_id,
        roles(code, name, level)
      )
    `)
    .eq('user_roles.org_id', orgId)

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }

  return NextResponse.json({ users })
}

export async function POST(request: Request) {
  const { hasAccess, user, orgId } = await checkOrgAdmin()
  if (!hasAccess) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await request.json()
  const supabase = createSupabaseAdminClient()

  // Create user logic with proper RBAC checks
  // ... implementation
}
```

## EDGE FUNCTIONS

### Context Setting Function (supabase/functions/set_app_context/index.ts)
```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface ContextRequest {
  org_id: string
  location_id?: string
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const { org_id, location_id }: ContextRequest = await req.json()

    const { data, error } = await supabase
      .rpc('app.set_context_checked', {
        p_org: org_id,
        p_location: location_id || null
      })

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
```

### Invitation Email Function (supabase/functions/send-invitation/index.ts)
```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface EmailRequest {
  to: string
  invitationToken: string
  organizationName: string
  inviterName: string
}

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { to, invitationToken, organizationName, inviterName }: EmailRequest = await req.json()

  const inviteUrl = `${Deno.env.get('APP_URL')}/invite/${invitationToken}`

  const emailHtml = `
    <h2>You're invited to join ${organizationName}</h2>
    <p>${inviterName} has invited you to join their organization on Klyra.</p>
    <p><a href="${inviteUrl}" style="background: #000; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Accept Invitation</a></p>
    <p>This invitation will expire in 7 days.</p>
  `

  // Send email using Resend or similar service
  // ... implementation

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

## NAVIGATION SYSTEM

### Sidebar (components/nav/SidebarClient.tsx)
```typescript
const navigationItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    permission: 'dashboard:view'
  },
  {
    title: 'Locations',
    href: '/locations/manage',
    icon: MapPin,
    permission: 'locations:view'
  },
  {
    title: 'Admin',
    icon: Settings,
    permission: 'admin:access',
    children: [
      {
        title: 'Users',
        href: '/admin/users',
        permission: 'users:view'
      },
      {
        title: 'Locations',
        href: '/admin/locations',
        permission: 'locations:admin'
      },
      {
        title: 'Invitations',
        href: '/admin/invitations',
        permission: 'invitations:view'
      }
    ]
  }
]

export function SidebarClient() {
  const { hasPermission } = usePermissionCheck()
  
  const filterNavigation = (items: NavigationItem[]): NavigationItem[] => {
    return items.filter(item => {
      if (item.permission && !hasPermission(item.permission)) {
        return false
      }
      
      if (item.children) {
        item.children = filterNavigation(item.children)
        return item.children.length > 0
      }
      
      return true
    })
  }

  const filteredNavigation = filterNavigation(navigationItems)

  return (
    <aside className="w-64 bg-card border-r">
      <nav className="p-4 space-y-2">
        {filteredNavigation.map(item => (
          <NavItem key={item.title} item={item} />
        ))}
      </nav>
    </aside>
  )
}
```

### Header with Context (components/nav/HeaderClient.tsx)
```typescript
export function HeaderClient({ 
  locations, 
  activeLocationId, 
  persisted, 
  errorMessage,
  setActiveLocation 
}: HeaderClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const selectRef = useRef<HTMLSelectElement>(null)
  const { context, setContext } = useHydratedStore()
  const { location_id } = useHydratedContext()

  // Set context when active location changes
  useEffect(() => {
    if (activeLocationId && context.org_id && activeLocationId !== location_id) {
      setContext({ 
        location_id: activeLocationId,
        location_name: locations?.find(l => l.id === activeLocationId)?.name || null
      })
    }
  }, [activeLocationId, context.org_id, location_id, setContext, locations])

  const onSelect = (locationId: string) => {
    startTransition(async () => {
      await setActiveLocation(locationId)
      router.refresh()
    })
  }

  return (
    <header className="bg-background border-b px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Brand Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded" />
            <span className="font-semibold text-lg">Klyra</span>
          </div>

          {/* Location Selector */}
          {errorMessage ? (
            <span className="text-destructive text-sm">{errorMessage}</span>
          ) : !locations?.length ? (
            <span className="text-muted-foreground text-sm">No location assigned</span>
          ) : (
            <select
              ref={selectRef}
              value={activeLocationId || ''}
              onChange={(e) => onSelect(e.target.value)}
              disabled={isPending}
              className="bg-background border border-input rounded-md px-3 py-1 text-sm"
            >
              <option value="">Select location...</option>
              {locations.map(location => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <ThemeToggle />
          <UserDropdown />
        </div>
      </div>
    </header>
  )
}
```

## ADMIN DASHBOARD COMPONENTS

### User Management (app/admin/users/components/UserTable.tsx)
```typescript
export function UserTable() {
  const { data: users, isLoading, error } = useAdvancedData(
    '/api/v1/admin/users',
    () => fetch('/api/v1/admin/users').then(res => res.json())
  )

  if (isLoading) return <SmartSkeleton count={5} height="h-16" />
  if (error) return <div className="text-destructive">Error loading users</div>

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Users</h2>
        <PermissionGuard permission="users:invite">
          <Button asChild>
            <Link href="/admin/users/invite">
              <UserPlus className="w-4 h-4 mr-2" />
              Invite User
            </Link>
          </Button>
        </PermissionGuard>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users?.users?.map((user: any) => (
            <TableRow key={user.id}>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback>
                      {`${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">
                      {user.first_name} {user.last_name}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                {user.user_roles?.map((ur: any) => (
                  <Badge key={ur.role_id} variant="secondary" className="mr-1">
                    {ur.roles.name}
                  </Badge>
                ))}
              </TableCell>
              <TableCell>
                {user.user_roles?.some((ur: any) => !ur.location_id) 
                  ? "All Locations" 
                  : "Specific"
                }
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-green-600">
                  Active
                </Badge>
              </TableCell>
              <TableCell>
                <PermissionGuard permission="users:edit">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/admin/users/${user.id}`}>
                      <Edit className="w-4 h-4" />
                    </Link>
                  </Button>
                </PermissionGuard>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
```

### Location Management (app/admin/locations/page.tsx)
```typescript
export default function LocationsAdminPage() {
  const { data: locations, isLoading, mutate } = useAdvancedData(
    '/api/v1/admin/locations',
    () => fetch('/api/v1/admin/locations').then(res => res.json())
  )

  const { optimisticUpdate } = useOptimisticData(
    '/api/v1/admin/locations',
    () => fetch('/api/v1/admin/locations').then(res => res.json())
  )

  const handleToggleActive = async (locationId: string, isActive: boolean) => {
    const optimisticData = {
      ...locations,
      locations: locations.locations.map((loc: any) => 
        loc.id === locationId ? { ...loc, is_active: !isActive } : loc
      )
    }

    await optimisticUpdate(optimisticData, async () => {
      const response = await fetch(`/api/v1/admin/locations/${locationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive })
      })
      return response.json()
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Locations</h1>
        <PermissionGuard permission="locations:create">
          <Button asChild>
            <Link href="/admin/locations/create">
              <Plus className="w-4 h-4 mr-2" />
              Add Location
            </Link>
          </Button>
        </PermissionGuard>
      </div>

      <AdaptiveLoader
        isLoading={isLoading}
        data={locations}
        fallback={<SmartSkeleton count={3} height="h-32" />}
      >
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {locations?.locations?.map((location: any) => (
            <Card key={location.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">{location.name}</CardTitle>
                  <PermissionGuard permission="locations:edit">
                    <Switch
                      checked={location.is_active}
                      onCheckedChange={() => handleToggleActive(location.id, location.is_active)}
                    />
                  </PermissionGuard>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {location.address && (
                    <p className="text-sm text-muted-foreground">
                      {location.address.street}, {location.address.city}
                    </p>
                  )}
                  <div className="flex justify-between items-center">
                    <Badge variant={location.is_active ? "default" : "secondary"}>
                      {location.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <PermissionGuard permission="locations:view">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/locations/${location.id}`}>
                          View Details
                        </Link>
                      </Button>
                    </PermissionGuard>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </AdaptiveLoader>
    </div>
  )
}
```

## INVITATION SYSTEM

### Invitation API (app/api/v1/admin/invitations/route.ts)
```typescript
export async function POST(request: Request) {
  const { hasAccess, user, orgId } = await checkOrgAdmin()
  if (!hasAccess) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { email, roleId, locationId, permissions } = await request.json()
  
  const supabase = createSupabaseAdminClient()
  
  // Generate secure token
  const token = crypto.randomUUID()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

  const { data: invitation, error } = await supabase
    .from('invitations')
    .insert({
      org_id: orgId,
      email,
      token,
      invited_by: user.id,
      role_id: roleId,
      location_id: locationId,
      permissions: permissions || [],
      expires_at: expiresAt.toISOString(),
      status: 'pending'
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
  }

  // Send invitation email via Edge Function
  await supabase.functions.invoke('send-invitation', {
    body: {
      to: email,
      invitationToken: token,
      organizationName: 'Your Organization', // Get from context
      inviterName: `${user.user_metadata?.first_name || 'Someone'}`
    }
  })

  return NextResponse.json({ invitation })
}
```

### Invitation Acceptance (app/invite/[token]/page.tsx)
```typescript
export default function InvitePage({ params }: { params: { token: string } }) {
  const [invitation, setInvitation] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchInvitation = async () => {
      try {
        const response = await fetch(`/api/public/invite/${params.token}`)
        if (!response.ok) {
          throw new Error('Invitation not found or expired')
        }
        const data = await response.json()
        setInvitation(data.invitation)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load invitation')
      } finally {
        setLoading(false)
      }
    }

    fetchInvitation()
  }, [params.token])

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  }

  if (error || !invitation) {
    return <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-destructive">Invalid Invitation</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{error || 'This invitation is no longer valid.'}</p>
        </CardContent>
      </Card>
    </div>
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Join {invitation.organization?.name}</CardTitle>
          <p className="text-muted-foreground">
            You've been invited to join as {invitation.role?.name}
          </p>
        </CardHeader>
        <CardContent>
          <InviteAcceptance invitation={invitation} token={params.token} />
        </CardContent>
      </Card>
    </div>
  )
}
```

## ERROR HANDLING & TESTING

### Error Boundary (components/error-boundary-enhanced.tsx)
```typescript
interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

export class EnhancedErrorBoundary extends Component<
  { children: ReactNode; fallback?: ComponentType<any> },
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    
    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      // Send to error tracking service
    }

    this.setState({
      error,
      errorInfo
    })
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      return <FallbackComponent error={this.state.error} />
    }

    return this.props.children
  }
}

function DefaultErrorFallback({ error }: { error?: Error }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-destructive">Something went wrong</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {error?.message || 'An unexpected error occurred'}
          </p>
          <Button onClick={() => window.location.reload()}>
            Reload Page
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
```

### QA Test Page (app/qa/hooks-check/page.tsx)
```typescript
export default function HooksCheckPage() {
  const [copied, setCopied] = useState<string>("");

  const tryCopy = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText("test");
        setCopied("OK: clipboard");
      } else {
        setCopied("Fallback: clipboard non disponibile");
      }
    } catch {
      setCopied("Errore: clipboard");
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>QA — Hooks & Hydration</h1>
      <ClientOnly fallback={<p>Loading (SSR placeholder)...</p>}>
        <button onClick={tryCopy}>Prova clipboard</button>
        <p data-testid="clipboard-status">{copied}</p>
        <p>Client time: {new Date().toISOString()}</p>
      </ClientOnly>
    </div>
  );
}
```

## DEPLOYMENT & CONFIGURATION

### Next.js Configuration (next.config.js)
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
};

export default nextConfig;
```

### ESLint Configuration (eslint.config.js)
```javascript
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import react from 'eslint-plugin-react'
import jsxA11y from 'eslint-plugin-jsx-a11y'

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  react.configs.flat.recommended,
  {
    plugins: { "react-hooks": reactHooks },
    rules: { 
      ...reactHooks.configs.recommended.rules,
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn"
    },
  },
  jsxA11y.flatConfigs.recommended,
  {
    plugins: {
      'react-refresh': reactRefresh,
    },
    rules: {
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      'react/react-in-jsx-scope': 'off',
    },
  },
)
```

### Supabase Configuration (supabase/config.toml)
```toml
project_id = "jwchmdivuwgfjrwvgtia"

[api]
enabled = true
port = 54321
schemas = ["public", "app", "graphql_public"]
extra_search_path = ["public", "extensions"]
max_rows = 1000

[auth]
enabled = true
port = 54324
site_url = "http://localhost:3000"
additional_redirect_urls = ["https://localhost:3000"]
jwt_expiry = 3600
enable_signup = true
enable_confirmations = false

[auth.email]
enable_signup = true
double_confirm_changes = true
enable_confirmations = false

[storage]
enabled = true
port = 54325
file_size_limit = "50MiB"

[functions]
enabled = true
port = 54326

[db]
enabled = true
port = 54322
shadow_port = 54320
major_version = 15
```

## SEED DATA & INITIALIZATION

### Bootstrap Data (db/seeds/001_minimal_bootstrap.sql)
```sql
-- Insert default permissions
INSERT INTO public.permissions (code, name, description, module) VALUES
('*', 'Super Admin', 'Full system access', 'system'),
('dashboard:view', 'View Dashboard', 'Access to dashboard', 'dashboard'),
('users:view', 'View Users', 'View user lists', 'users'),
('users:edit', 'Edit Users', 'Modify user data', 'users'),
('users:invite', 'Invite Users', 'Send user invitations', 'users'),
('locations:view', 'View Locations', 'View location data', 'locations'),
('locations:edit', 'Edit Locations', 'Modify location data', 'locations'),
('locations:create', 'Create Locations', 'Add new locations', 'locations'),
('admin:access', 'Admin Access', 'Access admin panels', 'admin'),
('invitations:view', 'View Invitations', 'See pending invitations', 'invitations'),
('invitations:send', 'Send Invitations', 'Create new invitations', 'invitations')
ON CONFLICT (code) DO NOTHING;

-- Create default organization
INSERT INTO public.organizations (id, name, slug, settings) VALUES 
(gen_random_uuid(), 'Default Organization', 'default', '{}')
ON CONFLICT DO NOTHING;

-- Create system roles
INSERT INTO public.roles (org_id, code, name, description, level, is_system) 
SELECT o.id, 'super_admin', 'Super Admin', 'Full system access', 100, true
FROM public.organizations o WHERE o.slug = 'default'
ON CONFLICT (org_id, code) DO NOTHING;

INSERT INTO public.roles (org_id, code, name, description, level, is_system) 
SELECT o.id, 'admin', 'Administrator', 'Organization admin', 90, true
FROM public.organizations o WHERE o.slug = 'default'
ON CONFLICT (org_id, code) DO NOTHING;

INSERT INTO public.roles (org_id, code, name, description, level, is_system) 
SELECT o.id, 'manager', 'Manager', 'Location manager', 50, true
FROM public.organizations o WHERE o.slug = 'default'
ON CONFLICT (org_id, code) DO NOTHING;

INSERT INTO public.roles (org_id, code, name, description, level, is_system) 
SELECT o.id, 'employee', 'Employee', 'Basic employee', 10, true
FROM public.organizations o WHERE o.slug = 'default'
ON CONFLICT (org_id, code) DO NOTHING;
```

### Permission Presets (db/seeds/002_permission_presets.sql)
```sql
-- Admin preset
INSERT INTO public.permission_presets (code, name, description) VALUES
('admin_full', 'Full Admin Access', 'Complete administrative permissions')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.permission_preset_items (preset_id, permission_id, allow)
SELECT pp.id, p.id, true
FROM public.permission_presets pp, public.permissions p
WHERE pp.code = 'admin_full' AND p.code != 'employee:*'
ON CONFLICT (preset_id, permission_id) DO NOTHING;

-- Manager preset
INSERT INTO public.permission_presets (code, name, description) VALUES
('manager_standard', 'Standard Manager', 'Typical manager permissions')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.permission_preset_items (preset_id, permission_id, allow)
SELECT pp.id, p.id, true
FROM public.permission_presets pp, public.permissions p
WHERE pp.code = 'manager_standard' 
AND p.code IN ('dashboard:view', 'users:view', 'locations:view', 'locations:edit')
ON CONFLICT (preset_id, permission_id) DO NOTHING;

-- Employee preset
INSERT INTO public.permission_presets (code, name, description) VALUES
('employee_basic', 'Basic Employee', 'Basic employee permissions')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.permission_preset_items (preset_id, permission_id, allow)
SELECT pp.id, p.id, true
FROM public.permission_presets pp, public.permissions p
WHERE pp.code = 'employee_basic' 
AND p.code IN ('dashboard:view')
ON CONFLICT (preset_id, permission_id) DO NOTHING;
```

## SECURITY CONSIDERATIONS

### Critical Security Rules
1. **Row Level Security (RLS)** enabled on ALL tables
2. **Multi-layer authentication** (JWT + RLS + API guards)
3. **Context validation** before any database operation
4. **Audit logging** for all sensitive operations
5. **Permission inheritance** with proper override logic
6. **Token-based invitations** with expiration
7. **Input validation** and sanitization
8. **CORS configuration** for production
9. **Rate limiting** on sensitive endpoints
10. **Secure session management**

### Performance Targets
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1
- **Time to Interactive**: < 3.5s
- **API Response Time**: < 200ms (95th percentile)
- **Database Query Time**: < 100ms average
- **Cache Hit Ratio**: > 85%

### Brand Identity
- **Colors**: Professional dark theme with HSL tokens
- **Typography**: Inter font family
- **Logo**: Klyra branding with consistent usage
- **Visual Language**: Clean, modern, enterprise-focused
- **Responsive Design**: Mobile-first approach
- **Accessibility**: WCAG 2.1 AA compliance

## CRITICAL SUCCESS FACTORS

1. **Multi-tenancy Isolation**: Perfect data separation between organizations
2. **Location Scoping**: Granular permissions per location within organizations  
3. **Performance**: Sub-second page loads with intelligent caching
4. **Security**: Enterprise-grade with comprehensive audit trails
5. **Scalability**: Handles thousands of users across hundreds of organizations
6. **Maintainability**: Clean architecture with comprehensive documentation
7. **Testing**: 90%+ test coverage with automated QA
8. **Monitoring**: Real-time performance and error tracking
9. **Deployment**: Zero-downtime deployments with rollback capability
10. **User Experience**: Intuitive interface with progressive enhancement

---

**EXECUTION NOTE**: This architecture implements a sophisticated enterprise SaaS platform with multi-tenant isolation, advanced RBAC/ABAC permissions, location-scoped access control, and performance optimizations. Every component is designed for scale, security, and maintainability. The system supports complex organizational hierarchies while maintaining strict data isolation and providing granular access control at the location level.