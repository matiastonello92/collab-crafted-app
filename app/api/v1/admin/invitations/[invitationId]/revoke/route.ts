import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function POST(
  request: NextRequest,
  { params }: { params: { invitationId: string } }
) {
  try {
    console.log('🔍 [API DEBUG] POST /api/v1/admin/invitations/[invitationId]/revoke called')
    
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.log('❌ [API DEBUG] Auth failed')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ [API DEBUG] User authenticated:', user.id)

    const { invitationId } = params

    // Update invitation (RLS policies enforce permissions)
    const { error } = await supabase
      .from('invitations')
      .update({ 
        status: 'revoked',
        revoked_at: new Date().toISOString()
      })
      .eq('id', invitationId)

    if (error) {
      console.error('❌ [API DEBUG] Update error:', error)
      return NextResponse.json({ 
        error: 'Failed to revoke invitation' 
      }, { status: 500 })
    }

    console.log('✅ [API DEBUG] Invitation revoked:', invitationId)
    revalidatePath('/admin/invitations')

    return NextResponse.json({ 
      message: 'Invitation revoked successfully' 
    })
  } catch (error) {
    console.error('❌ [API DEBUG] Unexpected error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
