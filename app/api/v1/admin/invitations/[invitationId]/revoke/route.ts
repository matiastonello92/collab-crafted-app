import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAccess } from '@/lib/admin/guards'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function POST(
  request: NextRequest,
  { params }: { params: { invitationId: string } }
) {
  try {
    const { userId, hasAccess } = await checkAdminAccess()
    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { invitationId } = params
    const supabase = createSupabaseAdminClient()

    // Revoke the invitation
    const { error } = await supabase
      .from('invitations')
      .update({ 
        status: 'revoked',
        revoked_at: new Date().toISOString()
      })
      .eq('id', invitationId)

    if (error) {
      console.error('Error revoking invitation:', error)
      return NextResponse.json({ 
        error: 'Failed to revoke invitation' 
      }, { status: 500 })
    }

    // Revalidate invitations list
    revalidatePath('/admin/invitations')

    return NextResponse.json({ 
      message: 'Invitation revoked successfully' 
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}