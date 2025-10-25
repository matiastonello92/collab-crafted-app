-- Seed test HACCP data for Mitron Bakery (or any first bakery location)

-- Insert test equipment (only for first bakery location found)
WITH first_bakery AS (
  SELECT l.org_id, l.id
  FROM locations l
  WHERE l.name ILIKE '%mitron%' OR l.name ILIKE '%bakery%'
  LIMIT 1
)
INSERT INTO public.haccp_equipment (org_id, location_id, name, equipment_type, code, temperature_min, temperature_max, status, created_by)
SELECT 
  fb.org_id,
  fb.id,
  equipment.name,
  equipment.equipment_type,
  equipment.code,
  equipment.temp_min,
  equipment.temp_max,
  'active',
  (SELECT id FROM profiles WHERE org_id = fb.org_id LIMIT 1)
FROM first_bakery fb
CROSS JOIN (VALUES
  ('Walk-in Fridge', 'refrigerator', 'REF-001', 0, 4),
  ('Walk-in Freezer', 'freezer', 'FRZ-001', -22, -18),
  ('Display Fridge', 'refrigerator', 'REF-002', 2, 6),
  ('Main Oven', 'oven', 'OVN-001', NULL, NULL)
) AS equipment(name, equipment_type, code, temp_min, temp_max)
ON CONFLICT DO NOTHING;

-- Insert test templates (only for first bakery location found)
WITH first_bakery AS (
  SELECT l.org_id, l.id
  FROM locations l
  WHERE l.name ILIKE '%mitron%' OR l.name ILIKE '%bakery%'
  LIMIT 1
)
INSERT INTO public.haccp_templates (
  org_id, location_id, name, description, task_type, 
  recurrence_type, recurrence_interval, checklist_items, priority, active, created_by
)
SELECT 
  fb.org_id,
  fb.id,
  template.name,
  template.description,
  template.task_type,
  template.recurrence_type,
  1,
  template.checklist_items::jsonb,
  template.priority,
  true,
  (SELECT id FROM profiles WHERE org_id = fb.org_id LIMIT 1)
FROM first_bakery fb
CROSS JOIN (VALUES
  ('Morning Temperature Check', 'Check all refrigeration equipment temperatures', 'temperature', 'daily', '[{"text":"Check walk-in fridge temperature","required":true},{"text":"Check walk-in freezer temperature","required":true},{"text":"Check display fridge temperature","required":true}]', 'high'),
  ('Weekly Deep Clean', 'Deep cleaning of food prep areas', 'cleaning', 'weekly', '[{"text":"Clean all prep surfaces","required":true},{"text":"Sanitize all equipment","required":true},{"text":"Check and clean drains","required":true}]', 'medium'),
  ('Delivery Inspection', 'Inspect incoming food deliveries', 'receiving', 'on_demand', '[{"text":"Check temperature of refrigerated goods","required":true},{"text":"Verify packaging integrity","required":true},{"text":"Check expiry dates","required":true}]', 'high')
) AS template(name, description, task_type, recurrence_type, checklist_items, priority)
ON CONFLICT DO NOTHING;

-- Insert test tasks for today and next few days (only for first bakery location found)
WITH first_bakery AS (
  SELECT l.org_id, l.id
  FROM locations l
  WHERE l.name ILIKE '%mitron%' OR l.name ILIKE '%bakery%'
  LIMIT 1
)
INSERT INTO public.haccp_tasks (
  org_id, location_id, template_id, equipment_id, name, description, task_type, 
  checklist_items, due_at, execution_window_minutes, priority, area, status
)
SELECT 
  fb.org_id,
  fb.id,
  t.id,
  (SELECT id FROM haccp_equipment WHERE location_id = fb.id AND equipment_type = 'refrigerator' LIMIT 1),
  t.name,
  t.description,
  t.task_type,
  t.checklist_items,
  CASE 
    WHEN t.name ILIKE '%morning%' THEN date_trunc('day', now() + interval '0 days') + interval '8 hours'
    WHEN t.name ILIKE '%weekly%' THEN date_trunc('day', now() + interval '1 days') + interval '10 hours'
    ELSE date_trunc('day', now() + interval '0 days') + interval '14 hours'
  END as due_at,
  60,
  t.priority,
  'Kitchen',
  'pending'
FROM first_bakery fb
CROSS JOIN haccp_templates t
WHERE t.location_id = fb.id
ON CONFLICT DO NOTHING;

-- Log results
DO $$
DECLARE
  equipment_count INTEGER;
  templates_count INTEGER;
  tasks_count INTEGER;
  location_name TEXT;
BEGIN
  SELECT l.name, COUNT(e.id), COUNT(DISTINCT t.id), COUNT(DISTINCT tk.id)
  INTO location_name, equipment_count, templates_count, tasks_count
  FROM locations l
  LEFT JOIN haccp_equipment e ON e.location_id = l.id
  LEFT JOIN haccp_templates t ON t.location_id = l.id
  LEFT JOIN haccp_tasks tk ON tk.location_id = l.id
  WHERE l.name ILIKE '%mitron%' OR l.name ILIKE '%bakery%'
  GROUP BY l.name
  LIMIT 1;
  
  RAISE NOTICE '✅ HACCP Test Data Seeded for: %', COALESCE(location_name, 'No location found');
  RAISE NOTICE '   Equipment: %', COALESCE(equipment_count, 0);
  RAISE NOTICE '   Templates: %', COALESCE(templates_count, 0);
  RAISE NOTICE '   Tasks: %', COALESCE(tasks_count, 0);
END $$;