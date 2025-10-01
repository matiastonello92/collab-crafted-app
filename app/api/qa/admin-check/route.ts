import { NextResponse } from 'next/server'
import { checkPlatformAdmin } from '@/lib/admin/guards'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({
        userId: null,
        email: null,
        isPlatformAdmin: false
      })
    }

    const { hasAccess } = await checkPlatformAdmin()

    return NextResponse.json({
      userId: user.id,
      email: user.email,
      isPlatformAdmin: hasAccess
    })
  } catch (error) {
    console.error('Admin check error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}