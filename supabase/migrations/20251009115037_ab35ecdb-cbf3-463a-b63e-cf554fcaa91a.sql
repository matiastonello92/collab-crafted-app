-- Create sales_records table for storing imported financial data
CREATE TABLE IF NOT EXISTS public.sales_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  location_id UUID NOT NULL,
  import_id UUID REFERENCES public.financial_imports(id) ON DELETE CASCADE,
  
  -- Date fields
  record_date DATE NOT NULL,
  datetime_from TIMESTAMPTZ,
  datetime_to TIMESTAMPTZ,
  interval_title TEXT,
  
  -- Sales metrics
  net_sales_amount NUMERIC(12,2) DEFAULT 0,
  gross_sales_amount NUMERIC(12,2) DEFAULT 0,
  total_amount NUMERIC(12,2) DEFAULT 0,
  
  -- Customer metrics
  covers INTEGER DEFAULT 0,
  orders INTEGER DEFAULT 0,
  
  -- Financial breakdown
  taxes_amount NUMERIC(12,2) DEFAULT 0,
  refunds_amount NUMERIC(12,2) DEFAULT 0,
  voids_amount NUMERIC(12,2) DEFAULT 0,
  discounts_amount NUMERIC(12,2) DEFAULT 0,
  complimentary_amount NUMERIC(12,2) DEFAULT 0,
  losses_amount NUMERIC(12,2) DEFAULT 0,
  tips_amount NUMERIC(12,2) DEFAULT 0,
  service_charges NUMERIC(12,2) DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.sales_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "sales_records_select"
  ON public.sales_records FOR SELECT
  USING (
    is_platform_admin() 
    OR (user_in_org(org_id) AND user_in_location(location_id) AND user_has_permission(auth.uid(), 'finance:view'))
  );

CREATE POLICY "sales_records_insert"
  ON public.sales_records FOR INSERT
  WITH CHECK (
    user_in_org(org_id) AND user_in_location(location_id) AND user_has_permission(auth.uid(), 'finance:create')
  );

CREATE POLICY "sales_records_update"
  ON public.sales_records FOR UPDATE
  USING (
    is_platform_admin() 
    OR (user_in_org(org_id) AND user_in_location(location_id) AND user_has_permission(auth.uid(), 'finance:create'))
  );

CREATE POLICY "sales_records_delete"
  ON public.sales_records FOR DELETE
  USING (
    is_platform_admin() 
    OR (user_in_org(org_id) AND user_in_location(location_id) AND user_has_permission(auth.uid(), 'finance:create'))
  );

-- Indexes for performance
CREATE INDEX idx_sales_records_org ON public.sales_records(org_id);
CREATE INDEX idx_sales_records_location ON public.sales_records(location_id);
CREATE INDEX idx_sales_records_import ON public.sales_records(import_id);
CREATE INDEX idx_sales_records_date ON public.sales_records(record_date);
CREATE INDEX idx_sales_records_org_location_date ON public.sales_records(org_id, location_id, record_date);

-- Trigger for updated_at
CREATE TRIGGER sales_records_updated_at
  BEFORE UPDATE ON public.sales_records
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();