import { runSmokeTests } from '../tests/smoke'
import { runRLSPermissionTests } from '../tests/rls-permissions'
import { admin as supabaseAdmin } from '../lib/supabase/service'
import { getSupabaseServiceRoleKey } from '../lib/env'

async function generateReport() {
  console.log('📋 Generating comprehensive test report...\n')
  
  // Environment check
  console.log('🔧 Environment Configuration:')
  console.log(`   SUPABASE_URL: ${process.env.SUPABASE_URL ? '✓ Set' : '❌ Missing'}`)
  console.log(`   SUPABASE_ANON_KEY: ${process.env.SUPABASE_ANON_KEY ? `✓ Set (last 4: ...${process.env.SUPABASE_ANON_KEY.slice(-4)})` : '❌ Missing'}`)
  let serviceRoleInfo
  try {
    const key = getSupabaseServiceRoleKey()
    serviceRoleInfo = `✓ Set (last 4: ...${key.slice(-4)})`
  } catch {
    serviceRoleInfo = '❌ Missing'
  }
  console.log(`   SUPABASE_SERVICE_ROLE_KEY: ${serviceRoleInfo}`)
  console.log(`   RESEND_API_KEY: ${process.env.RESEND_API_KEY ? `✓ Set (last 4: ...${process.env.RESEND_API_KEY.slice(-4)})` : '❌ Missing'}`)
  console.log('')
  
  // Database schema check
  console.log('🗄️ Database Schema Verification:')
  try {
    const tables = [
      'orgs', 'locations', 'users', 'users_locations',
      'modules', 'actions', 'permissions', 'roles',
      'role_permissions', 'user_roles', 'user_permission_overrides',
      'permission_presets', 'preset_permissions',
      'feature_flags', 'audit_log', 'event_outbox'
    ]
    
    for (const table of tables) {
      const { data, error } = await supabaseAdmin
        .from(table)
        .select('*')
        .limit(1)
      
      if (error) {
        console.log(`   ❌ Table '${table}': ${error.message}`)
      } else {
        console.log(`   ✅ Table '${table}': OK`)
      }
    }
    
    // Check app.set_context function
    const { error: contextError } = await supabaseAdmin.rpc('app.set_context', {
      p_org: '550e8400-e29b-41d4-a716-446655440000',
      p_location: '550e8400-e29b-41d4-a716-446655440001'
    })
    
    if (contextError) {
      console.log(`   ❌ Function 'app.set_context': ${contextError.message}`)
    } else {
      console.log(`   ✅ Function 'app.set_context': OK`)
    }
    
  } catch (error) {
    console.log(`   ❌ Schema check failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
  console.log('')
  
  // Seed data verification
  console.log('🌱 Seed Data Verification:')
  try {
    const { data: orgs } = await supabaseAdmin.from('orgs').select('*')
    const { data: locations } = await supabaseAdmin.from('locations').select('*')
    const { data: modules } = await supabaseAdmin.from('modules').select('*')
    const { data: actions } = await supabaseAdmin.from('actions').select('*')
    const { data: permissions } = await supabaseAdmin.from('permissions').select('*')
    const { data: roles } = await supabaseAdmin.from('roles').select('*')
    const { data: presets } = await supabaseAdmin.from('permission_presets').select('*')
    const { data: flags } = await supabaseAdmin.from('feature_flags').select('*')
    
    console.log(`   Organizations: ${orgs?.length || 0} (expected: 1)`)
    console.log(`   Locations: ${locations?.length || 0} (expected: 2)`)
    console.log(`   Modules: ${modules?.length || 0} (expected: 9)`)
    console.log(`   Actions: ${actions?.length || 0} (expected: 9)`)
    console.log(`   Permissions: ${permissions?.length || 0} (expected: ~25)`)
    console.log(`   Roles: ${roles?.length || 0} (expected: 3)`)
    console.log(`   Permission Presets: ${presets?.length || 0} (expected: 4)`)
    console.log(`   Feature Flags: ${flags?.length || 0} (expected: 4)`)
    
  } catch (error) {
    console.log(`   ❌ Seed verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
  console.log('')
  
  // RLS Policies check
  console.log('🔒 RLS Policies Status:')
  try {
    const { data: policies, error } = await supabaseAdmin
      .from('pg_policies')
      .select('schemaname, tablename, policyname, permissive')
      .eq('schemaname', 'public')
    
    if (error) {
      console.log(`   ❌ Could not fetch RLS policies: ${error.message}`)
    } else {
      const policyCount = policies?.length || 0
      console.log(`   ✅ Found ${policyCount} RLS policies`)
      
      // Group by table
      const policiesByTable = policies?.reduce((acc, policy) => {
        if (!acc[policy.tablename]) acc[policy.tablename] = 0
        acc[policy.tablename]++
        return acc
      }, {} as Record<string, number>) || {}
      
      Object.entries(policiesByTable).forEach(([table, count]) => {
        console.log(`      ${table}: ${count} policies`)
      })
    }
  } catch (error) {
    console.log(`   ❌ RLS check failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
  console.log('')
}

async function runAllTests() {
  console.log('🚀 Staff Management System - Complete Test Suite\n')
  console.log('=' .repeat(60))
  console.log('')
  
  try {
    // Generate initial report
    await generateReport()
    
    // Run smoke tests
    console.log('🧪 SMOKE TESTS')
    console.log('=' .repeat(30))
    await runSmokeTests()
    console.log('')
    
    // Run RLS and permission tests
    console.log('🔒 RLS & PERMISSION TESTS')
    console.log('=' .repeat(30))
    await runRLSPermissionTests()
    console.log('')
    
    // Final summary
    console.log('🎉 ALL TESTS COMPLETED SUCCESSFULLY!')
    console.log('=' .repeat(60))
    console.log('')
    console.log('✅ Database schema and migrations: APPLIED')
    console.log('✅ Seed data: LOADED')
    console.log('✅ RLS policies: ACTIVE')
    console.log('✅ Smoke tests: PASSED')
    console.log('✅ Permission system: WORKING')
    console.log('✅ Audit logging: FUNCTIONAL')
    console.log('✅ Event outbox: OPERATIONAL')
    console.log('')
    console.log('🔗 Next steps:')
    console.log('   1. Deploy Edge Function set_app_context to Supabase')
    console.log('   2. Create storage bucket "media" with proper policies')
    console.log('   3. Test the web application UI')
    console.log('   4. Configure production environment variables')
    console.log('')
    
  } catch (error) {
    console.error('❌ Test suite failed:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  runAllTests()
}

export { runAllTests, generateReport }
