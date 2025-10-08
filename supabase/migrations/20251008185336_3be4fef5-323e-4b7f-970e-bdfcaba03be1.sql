-- =====================================================
-- FINANCIAL MODULE: Cash Closures & Payment Methods
-- Sprint 1: Database Schema & RLS Policies
-- =====================================================

-- 1. PAYMENT METHODS (configurable by org admin)
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(org_id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key TEXT NOT NULL, -- e.g., 'cash', 'card', 'satispay', 'bank_transfer', 'customer_credit'
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(org_id, location_id, key)
);

-- 2. CASH CLOSURES (daily closure records)
CREATE TABLE IF NOT EXISTS public.cash_closures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(org_id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  closure_date DATE NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'sent')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ,
  confirmed_by UUID REFERENCES auth.users(id),
  UNIQUE(org_id, location_id, closure_date)
);

-- 3. CLOSURE ITEMS (payment method breakdown per closure)
CREATE TABLE IF NOT EXISTS public.closure_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  closure_id UUID NOT NULL REFERENCES public.cash_closures(id) ON DELETE CASCADE,
  payment_method_id UUID NOT NULL REFERENCES public.payment_methods(id) ON DELETE RESTRICT,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(closure_id, payment_method_id)
);

-- 4. EMAIL RECIPIENTS (configurable by org admin)
CREATE TABLE IF NOT EXISTS public.closure_email_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(org_id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(org_id, location_id, email)
);

-- 5. FINANCIAL IMPORTS (for CSV imports - Sprint 3)
CREATE TABLE IF NOT EXISTS public.financial_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(org_id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  rows_imported INTEGER NOT NULL DEFAULT 0,
  rows_failed INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  ai_summary JSONB,
  error_log JSONB,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_payment_methods_org_location ON public.payment_methods(org_id, location_id);
CREATE INDEX IF NOT EXISTS idx_cash_closures_org_location_date ON public.cash_closures(org_id, location_id, closure_date);
CREATE INDEX IF NOT EXISTS idx_closure_items_closure ON public.closure_items(closure_id);
CREATE INDEX IF NOT EXISTS idx_email_recipients_org_location ON public.closure_email_recipients(org_id, location_id);
CREATE INDEX IF NOT EXISTS idx_financial_imports_org_location ON public.financial_imports(org_id, location_id);

-- =====================================================
-- TRIGGERS (auto-update timestamps)
-- =====================================================

CREATE TRIGGER set_payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

CREATE TRIGGER set_cash_closures_updated_at
  BEFORE UPDATE ON public.cash_closures
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Payment Methods (org admin can CRUD, others can read)
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_methods_select" ON public.payment_methods
  FOR SELECT USING (
    is_platform_admin() OR 
    (user_in_org(org_id) AND (location_id IS NULL OR user_in_location(location_id)))
  );

CREATE POLICY "payment_methods_insert" ON public.payment_methods
  FOR INSERT WITH CHECK (
    is_platform_admin() OR 
    (user_in_org(org_id) AND user_has_permission(auth.uid(), 'manage_users'))
  );

CREATE POLICY "payment_methods_update" ON public.payment_methods
  FOR UPDATE USING (
    is_platform_admin() OR 
    (user_in_org(org_id) AND user_has_permission(auth.uid(), 'manage_users'))
  );

CREATE POLICY "payment_methods_delete" ON public.payment_methods
  FOR DELETE USING (
    is_platform_admin() OR 
    (user_in_org(org_id) AND user_has_permission(auth.uid(), 'manage_users'))
  );

-- Cash Closures (location users can CRUD their own, admins can view all)
ALTER TABLE public.cash_closures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cash_closures_select" ON public.cash_closures
  FOR SELECT USING (
    is_platform_admin() OR 
    (user_in_org(org_id) AND user_in_location(location_id))
  );

CREATE POLICY "cash_closures_insert" ON public.cash_closures
  FOR INSERT WITH CHECK (
    user_in_org(org_id) AND user_in_location(location_id)
  );

CREATE POLICY "cash_closures_update" ON public.cash_closures
  FOR UPDATE USING (
    is_platform_admin() OR 
    (user_in_org(org_id) AND user_in_location(location_id))
  );

CREATE POLICY "cash_closures_delete" ON public.cash_closures
  FOR DELETE USING (
    is_platform_admin() OR 
    (user_in_org(org_id) AND user_in_location(location_id) AND status = 'draft')
  );

-- Closure Items (same as parent closure)
ALTER TABLE public.closure_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "closure_items_select" ON public.closure_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.cash_closures cc
      WHERE cc.id = closure_items.closure_id
        AND (is_platform_admin() OR (user_in_org(cc.org_id) AND user_in_location(cc.location_id)))
    )
  );

CREATE POLICY "closure_items_insert" ON public.closure_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cash_closures cc
      WHERE cc.id = closure_items.closure_id
        AND user_in_org(cc.org_id) AND user_in_location(cc.location_id)
    )
  );

CREATE POLICY "closure_items_update" ON public.closure_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.cash_closures cc
      WHERE cc.id = closure_items.closure_id
        AND (is_platform_admin() OR (user_in_org(cc.org_id) AND user_in_location(cc.location_id)))
    )
  );

CREATE POLICY "closure_items_delete" ON public.closure_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.cash_closures cc
      WHERE cc.id = closure_items.closure_id
        AND (is_platform_admin() OR (user_in_org(cc.org_id) AND user_in_location(cc.location_id)))
    )
  );

-- Email Recipients (org admin can CRUD, others can read)
ALTER TABLE public.closure_email_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_recipients_select" ON public.closure_email_recipients
  FOR SELECT USING (
    is_platform_admin() OR 
    (user_in_org(org_id) AND (location_id IS NULL OR user_in_location(location_id)))
  );

CREATE POLICY "email_recipients_insert" ON public.closure_email_recipients
  FOR INSERT WITH CHECK (
    is_platform_admin() OR 
    (user_in_org(org_id) AND user_has_permission(auth.uid(), 'manage_users'))
  );

CREATE POLICY "email_recipients_update" ON public.closure_email_recipients
  FOR UPDATE USING (
    is_platform_admin() OR 
    (user_in_org(org_id) AND user_has_permission(auth.uid(), 'manage_users'))
  );

CREATE POLICY "email_recipients_delete" ON public.closure_email_recipients
  FOR DELETE USING (
    is_platform_admin() OR 
    (user_in_org(org_id) AND user_has_permission(auth.uid(), 'manage_users'))
  );

-- Financial Imports (location users can view/create, admins can manage)
ALTER TABLE public.financial_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "financial_imports_select" ON public.financial_imports
  FOR SELECT USING (
    is_platform_admin() OR 
    (user_in_org(org_id) AND user_in_location(location_id))
  );

CREATE POLICY "financial_imports_insert" ON public.financial_imports
  FOR INSERT WITH CHECK (
    user_in_org(org_id) AND user_in_location(location_id)
  );

CREATE POLICY "financial_imports_update" ON public.financial_imports
  FOR UPDATE USING (
    is_platform_admin() OR 
    (user_in_org(org_id) AND user_in_location(location_id))
  );

CREATE POLICY "financial_imports_delete" ON public.financial_imports
  FOR DELETE USING (
    is_platform_admin() OR 
    (user_in_org(org_id) AND user_in_location(location_id))
  );

-- =====================================================
-- SEED DATA: Default Payment Methods
-- =====================================================

-- Insert default payment methods for all existing organizations
INSERT INTO public.payment_methods (org_id, location_id, name, key, sort_order)
SELECT 
  o.org_id,
  NULL, -- org-wide payment methods
  pm.name,
  pm.key,
  pm.sort_order
FROM public.organizations o
CROSS JOIN (
  VALUES 
    ('Contanti', 'cash', 1),
    ('Carte', 'card', 2),
    ('Satispay', 'satispay', 3),
    ('Bonifico', 'bank_transfer', 4),
    ('Credito Cliente', 'customer_credit', 5)
) AS pm(name, key, sort_order)
ON CONFLICT (org_id, location_id, key) DO NOTHING;