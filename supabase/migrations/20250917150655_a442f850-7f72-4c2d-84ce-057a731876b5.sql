-- Create missing permissions for all organizations
-- This script adds 'manage_users' and 'view_settings' permissions where they don't exist

DO $$
DECLARE
    org_record RECORD;
    permissions_added INTEGER := 0;
    manage_users_added INTEGER := 0;
    view_settings_added INTEGER := 0;
    report_text TEXT := '';
BEGIN
    -- Log start
    RAISE NOTICE 'Starting permission creation for all organizations...';
    
    -- Loop through all organizations
    FOR org_record IN 
        SELECT org_id, name 
        FROM organizations 
        ORDER BY name
    LOOP
        RAISE NOTICE 'Processing organization: % (ID: %)', org_record.name, org_record.org_id;
        report_text := report_text || format('Organization: %s (ID: %s)' || E'\n', org_record.name, org_record.org_id);
        
        -- Add manage_users permission if not exists
        INSERT INTO permissions (
            name, 
            display_name, 
            category, 
            description, 
            org_id
        ) 
        VALUES (
            'manage_users',
            'Gestione Utenti',
            'Utenti',
            'Permesso per gestire utenti, ruoli e assegnazioni',
            org_record.org_id
        )
        ON CONFLICT (org_id, name) DO NOTHING;
        
        -- Check if manage_users was actually inserted
        IF FOUND THEN
            manage_users_added := manage_users_added + 1;
            permissions_added := permissions_added + 1;
            report_text := report_text || '  ✓ Added: manage_users' || E'\n';
            RAISE NOTICE '  ✓ Added manage_users permission for %', org_record.name;
        ELSE
            report_text := report_text || '  - manage_users already exists' || E'\n';
            RAISE NOTICE '  - manage_users already exists for %', org_record.name;
        END IF;
        
        -- Add view_settings permission if not exists
        INSERT INTO permissions (
            name, 
            display_name, 
            category, 
            description, 
            org_id
        ) 
        VALUES (
            'view_settings',
            'Visualizzazione Impostazioni',
            'Impostazioni',
            'Permesso per visualizzare le impostazioni dell''organizzazione',
            org_record.org_id
        )
        ON CONFLICT (org_id, name) DO NOTHING;
        
        -- Check if view_settings was actually inserted
        IF FOUND THEN
            view_settings_added := view_settings_added + 1;
            permissions_added := permissions_added + 1;
            report_text := report_text || '  ✓ Added: view_settings' || E'\n';
            RAISE NOTICE '  ✓ Added view_settings permission for %', org_record.name;
        ELSE
            report_text := report_text || '  - view_settings already exists' || E'\n';
            RAISE NOTICE '  - view_settings already exists for %', org_record.name;
        END IF;
        
        report_text := report_text || E'\n';
    END LOOP;
    
    -- Final summary
    RAISE NOTICE '=== PERMISSION CREATION SUMMARY ===';
    RAISE NOTICE 'Total permissions added: %', permissions_added;
    RAISE NOTICE 'manage_users permissions added: %', manage_users_added;
    RAISE NOTICE 'view_settings permissions added: %', view_settings_added;
    RAISE NOTICE 'Organizations processed: %', (SELECT COUNT(*) FROM organizations);
    
    -- Log the detailed report
    RAISE NOTICE 'DETAILED REPORT:';
    RAISE NOTICE '%', report_text;
    
    -- Verify final state
    RAISE NOTICE '=== VERIFICATION ===';
    RAISE NOTICE 'Total manage_users permissions now: %', (
        SELECT COUNT(*) FROM permissions WHERE name = 'manage_users'
    );
    RAISE NOTICE 'Total view_settings permissions now: %', (
        SELECT COUNT(*) FROM permissions WHERE name = 'view_settings'
    );
    
END $$;