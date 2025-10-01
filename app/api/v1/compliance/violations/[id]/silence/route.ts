// POST /api/v1/compliance/violations/[id]/silence - Silence a violation

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { silenceViolationSchema } from '@/lib/shifts/compliance-validations'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json()
    const payload = silenceViolationSchema.parse(body)
    const violationId = params.id

    // Get current user from auth header
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    }

    // Check if violation exists
    const { data: violation, error: fetchError } = await supabaseAdmin
      .from('compliance_violations')
      .select('*')
      .eq('id', violationId)
      .single()

    if (fetchError || !violation) {
      return NextResponse.json({ error: 'Violation not found' }, { status: 404 })
    }

    // Silence the violation
    const { data, error } = await supabaseAdmin
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

    if (error) throw error

    return NextResponse.json({ violation: data })
  } catch (err: any) {
    console.error('POST /api/v1/compliance/violations/[id]/silence error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
