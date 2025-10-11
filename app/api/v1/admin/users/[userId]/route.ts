import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId: targetUserId } = await params
  try {
    console.log('🔍 [API DEBUG] DELETE /api/v1/admin/users/[userId] called')
    
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.log('❌ [API DEBUG] Auth failed')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ [API DEBUG] User authenticated:', user.id)

    // Use admin client only for auth.admin operations
    const supabaseAdmin = createSupabaseAdminClient()
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(targetUserId)
    
    if (!authUser.user) {
      console.log('❌ [API DEBUG] Target user not found')
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    console.log('✅ [API DEBUG] Target user verified:', targetUserId)

    const body = await request.json()
    const { confirmEmail } = body

    if (confirmEmail !== authUser.user.email) {
      console.log('❌ [API DEBUG] Email confirmation mismatch')
      return NextResponse.json({ 
        error: 'Email confirmation does not match' 
      }, { status: 400 })
    }

    console.log('🔍 [API DEBUG] Cleaning up user data...')
    
    // Clean up related data using RLS-enforced client
    await Promise.all([
      supabase.from('user_roles_locations').delete().eq('user_id', targetUserId),
      supabase.from('user_permissions').delete().eq('user_id', targetUserId),
      supabase.from('user_job_tags').delete().eq('user_id', targetUserId),
      supabase.from('location_admins').delete().eq('user_id', targetUserId),
      supabase.from('profiles').delete().eq('id', targetUserId),
    ])

    console.log('✅ [API DEBUG] User data cleaned up')

    // Delete the auth user using admin client
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId)
    
    if (deleteError) {
      console.error('❌ [API DEBUG] Auth deletion error:', deleteError)
      return NextResponse.json({ 
        error: 'Failed to delete user' 
      }, { status: 500 })
    }

    console.log('✅ [API DEBUG] User deleted:', targetUserId)
    revalidatePath('/admin/users')

    return NextResponse.json({ 
      message: 'User deleted successfully' 
    })
  } catch (error) {
    console.error('❌ [API DEBUG] Unexpected error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
