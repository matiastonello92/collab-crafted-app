import { createSupabaseServerActionClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const supabase = await createSupabaseServerActionClient();

    // Execute seed SQL
    const { error } = await supabase.rpc('exec_sql', {
      sql_query: `
        DO $$
        DECLARE
          org RECORD;
        BEGIN
          FOR org IN SELECT org_id FROM organizations LOOP
            INSERT INTO leave_types (org_id, key, label, color, requires_approval, is_active)
            VALUES 
              (org.org_id, 'annual_leave', 'Ferie', '#10b981', true, true),
              (org.org_id, 'sick_leave', 'Malattia', '#ef4444', false, true),
              (org.org_id, 'personal_leave', 'Permesso Personale', '#3b82f6', true, true),
              (org.org_id, 'unpaid_leave', 'Permesso Non Retribuito', '#6b7280', true, true),
              (org.org_id, 'study_leave', 'Permesso Studio', '#8b5cf6', true, true),
              (org.org_id, 'weekly_rest', 'Riposo Settimanale', '#06b6d4', false, true),
              (org.org_id, 'paid_leave', 'Congedo Retribuito', '#f59e0b', false, true)
            ON CONFLICT (org_id, key) DO NOTHING;
          END LOOP;
        END $$;
      `
    });

    if (error) {
      // If RPC doesn't exist, use direct insert
      const { data: orgs, error: orgError } = await supabase
        .from('organizations')
        .select('org_id');

      if (orgError) throw orgError;

      const leaveTypes = [
        { key: 'annual_leave', label: 'Ferie', color: '#10b981', requires_approval: true },
        { key: 'sick_leave', label: 'Malattia', color: '#ef4444', requires_approval: false },
        { key: 'personal_leave', label: 'Permesso Personale', color: '#3b82f6', requires_approval: true },
        { key: 'unpaid_leave', label: 'Permesso Non Retribuito', color: '#6b7280', requires_approval: true },
        { key: 'study_leave', label: 'Permesso Studio', color: '#8b5cf6', requires_approval: true },
        { key: 'weekly_rest', label: 'Riposo Settimanale', color: '#06b6d4', requires_approval: false },
        { key: 'paid_leave', label: 'Congedo Retribuito', color: '#f59e0b', requires_approval: false }
      ];

      for (const org of orgs || []) {
        for (const type of leaveTypes) {
          await supabase
            .from('leave_types')
            .upsert({
              org_id: org.org_id,
              ...type,
              is_active: true
            }, {
              onConflict: 'org_id,key',
              ignoreDuplicates: true
            });
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Leave types seeded successfully' 
    });

  } catch (err: any) {
    console.error('Seed error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to seed leave types' },
      { status: 500 }
    );
  }
}
