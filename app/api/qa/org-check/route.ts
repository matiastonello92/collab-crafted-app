import { NextResponse } from 'next/server'
import { checkOrgAdmin } from '@/lib/admin/guards'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({
        userId: null,
        email: null,
        orgId: null,
        isOrgAdmin: false
      })
    }

    const { hasAccess, orgId } = await checkOrgAdmin()

    return NextResponse.json({
      userId: user.id,
      email: user.email,
      orgId,
      isOrgAdmin: hasAccess
    })
  } catch (error) {
    console.error('Org check error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}