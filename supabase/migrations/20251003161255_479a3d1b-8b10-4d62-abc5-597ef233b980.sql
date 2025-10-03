-- Add audit columns to rotas table for tracking who created/updated
ALTER TABLE public.rotas 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.rotas 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_rotas_created_by ON public.rotas(created_by);
CREATE INDEX IF NOT EXISTS idx_rotas_updated_by ON public.rotas(updated_by);

-- Backfill created_by from first shift of each rota (best effort)
UPDATE public.rotas r
SET created_by = (
  SELECT s.created_by 
  FROM public.shifts s 
  WHERE s.rota_id = r.id 
  ORDER BY s.created_at ASC
  LIMIT 1
)
WHERE created_by IS NULL;