-- Create missing permissions for all organizations
-- Using conditional INSERT to avoid conflicts

DO $$
DECLARE
    org_record RECORD;
    permissions_added INTEGER := 0;
    manage_users_added INTEGER := 0;
    view_settings_added INTEGER := 0;
    report_text TEXT := '';
    perm_exists BOOLEAN;
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
        
        -- Check and add manage_users permission
        SELECT EXISTS(
            SELECT 1 FROM permissions 
            WHERE org_id = org_record.org_id AND name = 'manage_users'
        ) INTO perm_exists;
        
        IF NOT perm_exists THEN
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
            );
            
            manage_users_added := manage_users_added + 1;
            permissions_added := permissions_added + 1;
            report_text := report_text || '  ✓ Added: manage_users' || E'\n';
            RAISE NOTICE '  ✓ Added manage_users permission for %', org_record.name;
        ELSE
            report_text := report_text || '  - manage_users already exists' || E'\n';
            RAISE NOTICE '  - manage_users already exists for %', org_record.name;
        END IF;
        
        -- Check and add view_settings permission
        SELECT EXISTS(
            SELECT 1 FROM permissions 
            WHERE org_id = org_record.org_id AND name = 'view_settings'
        ) INTO perm_exists;
        
        IF NOT perm_exists THEN
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
            );
            
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
    
    -- Show summary table
    RAISE NOTICE '=== SUMMARY TABLE ===';
    FOR org_record IN 
        SELECT 
            o.org_id,
            o.name as org_name,
            CASE WHEN EXISTS(SELECT 1 FROM permissions WHERE org_id = o.org_id AND name = 'manage_users') 
                 THEN '✓' ELSE '✗' END as manage_users_exists,
            CASE WHEN EXISTS(SELECT 1 FROM permissions WHERE org_id = o.org_id AND name = 'view_settings') 
                 THEN '✓' ELSE '✗' END as view_settings_exists
        FROM organizations o
        ORDER BY o.name
    LOOP
        RAISE NOTICE '%: manage_users[%] view_settings[%]', 
            org_record.org_name, 
            org_record.manage_users_exists, 
            org_record.view_settings_exists;
    END LOOP;
    
END $$;