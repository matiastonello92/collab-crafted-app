-- ============================================
-- SISTEMA GESTIONE CONTRATTI HR COMPLETO
-- Tables: contract_amendments, transport_allowances, bonuses_advances
-- ============================================

-- ============================================
-- 1. TABELLA CONTRACT_AMENDMENTS (Avenant)
-- ============================================
CREATE TABLE IF NOT EXISTS public.contract_amendments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  location_id uuid NOT NULL,
  user_id uuid NOT NULL,
  contract_id uuid NOT NULL,
  
  -- Metadati emendamento
  amendment_date date NOT NULL,
  effective_date date NOT NULL,
  amendment_type text NOT NULL CHECK (amendment_type IN ('salary_change', 'hours_change', 'position_change', 'other')),
  
  -- Dettagli modifiche (JSON per flessibilità)
  previous_values jsonb NOT NULL DEFAULT '{}',
  new_values jsonb NOT NULL DEFAULT '{}',
  
  -- Documentazione
  reason text,
  notes text,
  document_url text,
  
  -- Approvazione
  approved_by uuid,
  approved_at timestamptz,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'superseded')),
  
  -- Audit
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indici per contract_amendments
CREATE INDEX IF NOT EXISTS idx_amendments_contract ON public.contract_amendments(contract_id);
CREATE INDEX IF NOT EXISTS idx_amendments_user ON public.contract_amendments(user_id);
CREATE INDEX IF NOT EXISTS idx_amendments_org ON public.contract_amendments(org_id);
CREATE INDEX IF NOT EXISTS idx_amendments_dates ON public.contract_amendments(amendment_date, effective_date);

-- RLS per contract_amendments
ALTER TABLE public.contract_amendments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "amendments_select" ON public.contract_amendments
  FOR SELECT USING (
    is_platform_admin() OR 
    user_id = auth.uid() OR 
    (user_in_org(org_id) AND user_in_location(location_id) AND user_has_permission(auth.uid(), 'users:manage_contracts'))
  );

CREATE POLICY "amendments_insert" ON public.contract_amendments
  FOR INSERT WITH CHECK (
    user_in_org(org_id) AND user_in_location(location_id) AND 
    user_has_permission(auth.uid(), 'users:manage_contracts')
  );

CREATE POLICY "amendments_update" ON public.contract_amendments
  FOR UPDATE USING (
    is_platform_admin() OR 
    (user_in_org(org_id) AND user_in_location(location_id) AND user_has_permission(auth.uid(), 'users:manage_contracts'))
  );

CREATE POLICY "amendments_delete" ON public.contract_amendments
  FOR DELETE USING (
    is_platform_admin() OR 
    (user_in_org(org_id) AND user_in_location(location_id) AND user_has_permission(auth.uid(), 'users:manage_contracts'))
  );

-- Trigger updated_at per contract_amendments
CREATE TRIGGER tg_amendments_updated_at
  BEFORE UPDATE ON public.contract_amendments
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================
-- 2. TABELLA TRANSPORT_ALLOWANCES
-- ============================================
CREATE TABLE IF NOT EXISTS public.transport_allowances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  location_id uuid NOT NULL,
  user_id uuid NOT NULL,
  
  -- Dettagli dispositivo
  allowance_name text NOT NULL,
  allowance_type text NOT NULL CHECK (allowance_type IN ('public_transport', 'personal_vehicle', 'bike', 'other')),
  
  -- Importo
  monthly_amount numeric(10,2) NOT NULL CHECK (monthly_amount >= 0),
  employer_contribution_pct numeric(5,2) DEFAULT 50.00 CHECK (employer_contribution_pct >= 0 AND employer_contribution_pct <= 100),
  employee_contribution_pct numeric(5,2) DEFAULT 50.00 CHECK (employee_contribution_pct >= 0 AND employee_contribution_pct <= 100),
  
  -- Periodo applicazione
  start_date date NOT NULL,
  end_date date,
  
  -- Stato
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'terminated')),
  
  -- Documentazione
  justification_document_url text,
  notes text,
  
  -- Audit
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT check_transport_dates CHECK (end_date IS NULL OR end_date >= start_date),
  CONSTRAINT check_transport_contributions CHECK (employer_contribution_pct + employee_contribution_pct = 100)
);

-- Indici per transport_allowances
CREATE INDEX IF NOT EXISTS idx_transport_user ON public.transport_allowances(user_id);
CREATE INDEX IF NOT EXISTS idx_transport_org ON public.transport_allowances(org_id);
CREATE INDEX IF NOT EXISTS idx_transport_location ON public.transport_allowances(location_id);
CREATE INDEX IF NOT EXISTS idx_transport_dates ON public.transport_allowances(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_transport_status ON public.transport_allowances(status) WHERE status = 'active';

-- RLS per transport_allowances
ALTER TABLE public.transport_allowances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transport_select" ON public.transport_allowances
  FOR SELECT USING (
    is_platform_admin() OR 
    user_id = auth.uid() OR 
    (user_in_org(org_id) AND user_in_location(location_id) AND user_has_permission(auth.uid(), 'users:manage_contracts'))
  );

CREATE POLICY "transport_insert" ON public.transport_allowances
  FOR INSERT WITH CHECK (
    user_in_org(org_id) AND user_in_location(location_id) AND 
    user_has_permission(auth.uid(), 'users:manage_contracts')
  );

CREATE POLICY "transport_update" ON public.transport_allowances
  FOR UPDATE USING (
    is_platform_admin() OR 
    (user_in_org(org_id) AND user_in_location(location_id) AND user_has_permission(auth.uid(), 'users:manage_contracts'))
  );

CREATE POLICY "transport_delete" ON public.transport_allowances
  FOR DELETE USING (
    is_platform_admin() OR 
    (user_in_org(org_id) AND user_in_location(location_id) AND user_has_permission(auth.uid(), 'users:manage_contracts'))
  );

-- Trigger updated_at per transport_allowances
CREATE TRIGGER tg_transport_updated_at
  BEFORE UPDATE ON public.transport_allowances
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================
-- 3. TABELLA BONUSES_ADVANCES
-- ============================================
CREATE TABLE IF NOT EXISTS public.bonuses_advances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  location_id uuid NOT NULL,
  user_id uuid NOT NULL,
  
  -- Tipo transazione
  transaction_type text NOT NULL CHECK (transaction_type IN ('bonus', 'advance', 'commission', 'other')),
  
  -- Dettagli
  description text NOT NULL,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'EUR',
  
  -- Date
  transaction_date date NOT NULL,
  payment_date date,
  
  -- Riferimenti
  related_month text,
  related_period_start date,
  related_period_end date,
  
  -- Stato
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  
  -- Approvazione
  approved_by uuid,
  approved_at timestamptz,
  
  -- Audit
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT check_advance_amount CHECK (
    transaction_type != 'advance' OR 
    (amount > 0 AND amount <= 10000)
  )
);

-- Indici per bonuses_advances
CREATE INDEX IF NOT EXISTS idx_bonuses_user ON public.bonuses_advances(user_id);
CREATE INDEX IF NOT EXISTS idx_bonuses_org ON public.bonuses_advances(org_id);
CREATE INDEX IF NOT EXISTS idx_bonuses_location ON public.bonuses_advances(location_id);
CREATE INDEX IF NOT EXISTS idx_bonuses_dates ON public.bonuses_advances(transaction_date, payment_date);
CREATE INDEX IF NOT EXISTS idx_bonuses_status ON public.bonuses_advances(status);
CREATE INDEX IF NOT EXISTS idx_bonuses_type ON public.bonuses_advances(transaction_type);

-- RLS per bonuses_advances
ALTER TABLE public.bonuses_advances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bonuses_select" ON public.bonuses_advances
  FOR SELECT USING (
    is_platform_admin() OR 
    user_id = auth.uid() OR 
    (user_in_org(org_id) AND user_in_location(location_id) AND user_has_permission(auth.uid(), 'users:manage_contracts'))
  );

CREATE POLICY "bonuses_insert" ON public.bonuses_advances
  FOR INSERT WITH CHECK (
    user_in_org(org_id) AND user_in_location(location_id) AND 
    user_has_permission(auth.uid(), 'users:manage_contracts')
  );

CREATE POLICY "bonuses_update" ON public.bonuses_advances
  FOR UPDATE USING (
    is_platform_admin() OR 
    (user_in_org(org_id) AND user_in_location(location_id) AND user_has_permission(auth.uid(), 'users:manage_contracts'))
  );

CREATE POLICY "bonuses_delete" ON public.bonuses_advances
  FOR DELETE USING (
    is_platform_admin() OR 
    (user_in_org(org_id) AND user_in_location(location_id) AND user_has_permission(auth.uid(), 'users:manage_contracts'))
  );

-- Trigger updated_at per bonuses_advances
CREATE TRIGGER tg_bonuses_updated_at
  BEFORE UPDATE ON public.bonuses_advances
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();