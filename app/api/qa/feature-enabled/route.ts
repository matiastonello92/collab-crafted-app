import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseUserClient } from '@/lib/supabase/clients'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseUserClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')
    const org = searchParams.get('org')

    if (!key || !org) {
      return NextResponse.json({ error: 'Missing key or org parameter' }, { status: 400 })
    }

    const { data, error } = await supabase.rpc('feature_enabled', { 
      p_org: org, 
      p_feature_key: key 
    })

    if (error) {
      console.error('Feature check error:', error)
      return NextResponse.json({ enabled: false })
    }

    return NextResponse.json({ enabled: !!data })
  } catch (error) {
    console.error('Feature check API error:', error)
    return NextResponse.json({ enabled: false })
  }
}