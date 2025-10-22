-- =====================================================
-- FIX LEAVE TYPES: Consolidamento e correzione
-- Migra annual_leave -> paid_leave e auto-approva leave types senza approvazione
-- =====================================================

DO $$
DECLARE
  org RECORD;
  annual_leave_id uuid;
  paid_leave_id uuid;
BEGIN
  -- Loop per ogni organizzazione
  FOR org IN SELECT org_id FROM organizations LOOP
    
    -- 1. Trova gli ID di annual_leave e paid_leave per questa org
    SELECT id INTO annual_leave_id 
    FROM leave_types 
    WHERE org_id = org.org_id AND key = 'annual_leave' 
    LIMIT 1;
    
    SELECT id INTO paid_leave_id 
    FROM leave_types 
    WHERE org_id = org.org_id AND key = 'paid_leave' 
    LIMIT 1;
    
    -- 2. Migra tutte le leave_requests da annual_leave → paid_leave
    IF annual_leave_id IS NOT NULL AND paid_leave_id IS NOT NULL THEN
      UPDATE leave_requests
      SET 
        type_id = paid_leave_id,
        notes = COALESCE(notes || ' ', '') || '[Migrato da Ferie]'
      WHERE type_id = annual_leave_id;
      
      RAISE NOTICE 'Org %: Migrate leave_requests da annual_leave a paid_leave', org.org_id;
    END IF;
    
    -- 3. Disattiva annual_leave (non eliminare per FK integrity)
    UPDATE leave_types
    SET is_active = false
    WHERE org_id = org.org_id AND key = 'annual_leave';
    
    -- 4. Aggiorna paid_leave: requires_approval = TRUE
    UPDATE leave_types
    SET requires_approval = true
    WHERE org_id = org.org_id AND key = 'paid_leave';
    
    RAISE NOTICE 'Org %: paid_leave ora richiede approvazione', org.org_id;
    
  END LOOP;
  
  -- 5. Auto-approva tutte le leave_requests pending per tipi senza approvazione
  UPDATE leave_requests lr
  SET 
    status = 'approved',
    approver_id = lr.user_id,
    approved_at = NOW(),
    notes = COALESCE(notes || ' ', '') || '[Auto-approvato: tipo non richiede approvazione]'
  FROM leave_types lt
  WHERE lr.type_id = lt.id
    AND lt.requires_approval = false
    AND lr.status = 'pending';
  
  RAISE NOTICE 'Auto-approvate tutte le leave_requests pending per tipi senza approvazione richiesta';
  
END $$;
