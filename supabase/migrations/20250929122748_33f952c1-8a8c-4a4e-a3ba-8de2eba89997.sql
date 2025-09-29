-- FASE 1: Template-First Inventory System
-- Creo le nuove tabelle per i template di inventario

-- 1. Tabella inventory_templates
CREATE TABLE IF NOT EXISTS public.inventory_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL,
    location_id UUID NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('kitchen', 'bar', 'cleaning')),
    name TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(org_id, location_id, category, name, version)
);

-- 2. Tabella inventory_template_items  
CREATE TABLE IF NOT EXISTS public.inventory_template_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL,
    location_id UUID NOT NULL,
    template_id UUID NOT NULL REFERENCES public.inventory_templates(id) ON DELETE CASCADE,
    catalog_item_id UUID NOT NULL REFERENCES public.inventory_catalog_items(id),
    section TEXT CHECK (section IN ('pantry', 'fridge', 'freezer')),
    sort_order INTEGER NOT NULL DEFAULT 0,
    uom_override TEXT,
    unit_price_override NUMERIC(12,4),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(template_id, catalog_item_id)
);

-- 3. Estendo inventory_headers con campi template
ALTER TABLE public.inventory_headers 
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.inventory_templates(id),
ADD COLUMN IF NOT EXISTS template_version INTEGER,
ADD COLUMN IF NOT EXISTS creation_mode TEXT CHECK (creation_mode IN ('template', 'last', 'empty'));

-- 4. RLS per inventory_templates
ALTER TABLE public.inventory_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "templates_select" ON public.inventory_templates
FOR SELECT USING (
    is_platform_admin() OR 
    (user_in_org(org_id) AND EXISTS (
        SELECT 1 FROM user_roles_locations url
        JOIN locations l ON l.id = url.location_id
        WHERE url.user_id = auth.uid() 
        AND l.id = inventory_templates.location_id 
        AND COALESCE(url.is_active, true)
    ))
);

CREATE POLICY "templates_insert" ON public.inventory_templates
FOR INSERT WITH CHECK (
    user_can_manage_inventory(org_id, location_id)
);

CREATE POLICY "templates_update" ON public.inventory_templates
FOR UPDATE USING (
    user_can_manage_inventory(org_id, location_id)
);

CREATE POLICY "templates_delete" ON public.inventory_templates
FOR DELETE USING (
    user_can_manage_inventory(org_id, location_id)
);

-- 5. RLS per inventory_template_items
ALTER TABLE public.inventory_template_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "template_items_select" ON public.inventory_template_items
FOR SELECT USING (
    is_platform_admin() OR 
    (user_in_org(org_id) AND EXISTS (
        SELECT 1 FROM user_roles_locations url
        JOIN locations l ON l.id = url.location_id
        WHERE url.user_id = auth.uid() 
        AND l.id = inventory_template_items.location_id 
        AND COALESCE(url.is_active, true)
    ))
);

CREATE POLICY "template_items_insert" ON public.inventory_template_items
FOR INSERT WITH CHECK (
    user_can_manage_inventory(org_id, location_id)
);

CREATE POLICY "template_items_update" ON public.inventory_template_items
FOR UPDATE USING (
    user_can_manage_inventory(org_id, location_id)
);

CREATE POLICY "template_items_delete" ON public.inventory_template_items
FOR DELETE USING (
    user_can_manage_inventory(org_id, location_id)
);

-- 6. Trigger per updated_at sui template
CREATE TRIGGER trigger_templates_updated_at
    BEFORE UPDATE ON public.inventory_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.tg_touch_updated_at();

-- 7. Trigger per coerenza org/location sui template items
CREATE TRIGGER trigger_template_items_coherence
    BEFORE INSERT OR UPDATE ON public.inventory_template_items
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_org_location_coherence();