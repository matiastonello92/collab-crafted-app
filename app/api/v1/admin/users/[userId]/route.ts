import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAccess } from '@/lib/admin/guards'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId, hasAccess } = await checkAdminAccess()
    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId: targetUserId } = params
    const supabase = createSupabaseAdminClient()

    // Get user email for confirmation
    const { data: authUser } = await supabase.auth.admin.getUserById(targetUserId)
    if (!authUser.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Parse request body for confirmation
    const body = await request.json()
    const { confirmEmail } = body

    if (confirmEmail !== authUser.user.email) {
      return NextResponse.json({ 
        error: 'Email confirmation does not match' 
      }, { status: 400 })
    }

    // Clean up related data first (if no CASCADE)
    console.log('Cleaning up user data for:', targetUserId)
    
    await Promise.all([
      supabase.from('user_roles_locations').delete().eq('user_id', targetUserId),
      supabase.from('user_permissions').delete().eq('user_id', targetUserId),
      supabase.from('user_job_tags').delete().eq('user_id', targetUserId),
      supabase.from('location_admins').delete().eq('user_id', targetUserId),
      supabase.from('user_profiles').delete().eq('id', targetUserId),
    ])

    // Delete the auth user
    const { error: deleteError } = await supabase.auth.admin.deleteUser(targetUserId)
    
    if (deleteError) {
      console.error('Error deleting user:', deleteError)
      return NextResponse.json({ 
        error: 'Failed to delete user' 
      }, { status: 500 })
    }

    // Revalidate users list
    revalidatePath('/admin/users')

    return NextResponse.json({ 
      message: 'User deleted successfully' 
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}