// POST /api/v1/compliance/violations/[id]/silence - Silence a violation

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { silenceViolationSchema } from '@/lib/shifts/compliance-validations'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔍 [API DEBUG] POST /api/v1/compliance/violations/[id]/silence', { violationId: params.id })
    
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.log('🔍 [API DEBUG] Auth failed:', authError)
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    console.log('🔍 [API DEBUG] Auth check:', { userId: user.id })

    const body = await req.json()
    const payload = silenceViolationSchema.parse(body)
    const violationId = params.id

    // Check if violation exists (RLS-protected)
    const { data: violation, error: fetchError } = await supabase
      .from('compliance_violations')
      .select('*')
      .eq('id', violationId)
      .single()

    if (fetchError || !violation) {
      return NextResponse.json({ error: 'Violation not found' }, { status: 404 })
    }

    // Silence the violation (RLS-protected)
    const { data, error } = await supabase
      .from('compliance_violations')
      .update({
        is_silenced: true,
        silenced_by: user.id,
        silenced_at: new Date().toISOString(),
        silence_reason: payload.reason
      })
      .eq('id', violationId)
      .select()
      .single()

    console.log('🔍 [API DEBUG] Violation silenced:', { success: !!data, error })

    if (error) throw error

    return NextResponse.json({ violation: data })
  } catch (err: any) {
    console.error('POST /api/v1/compliance/violations/[id]/silence error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
