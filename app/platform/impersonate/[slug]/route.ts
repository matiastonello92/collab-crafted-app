import { NextRequest, NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/admin/guards'
import { createSupabaseServerClient } from '@/utils/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    // Platform admin guard
    await requirePlatformAdmin()

    const { slug } = params
    if (!slug) {
      return NextResponse.json({ error: 'MISSING_SLUG' }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()

    // Find org by slug
    const { data: org, error } = await supabase
      .from('organizations')
      .select('org_id')
      .eq('slug', slug)
      .single()

    if (error || !org) {
      return NextResponse.json({ error: 'ORG_NOT_FOUND' }, { status: 404 })
    }

    // Call edge function to set app context
    const host = request.headers.get('host') || 'localhost:3000'
    const protocol = request.headers.get('x-forwarded-proto') || 'http'
    const edgeUrl = `${protocol}://${host}/functions/v1/set_app_context`

    try {
      await fetch(edgeUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('cookie') || ''
        },
        body: JSON.stringify({
          org_id: org.org_id,
          location_id: null
        })
      })
    } catch (edgeError) {
      console.warn('[IMPERSONATE] Edge function call failed:', edgeError)
      // Continue anyway - context setting is best effort
    }

    return NextResponse.json({ 
      ok: true, 
      orgId: org.org_id,
      message: `Impersonating org: ${slug}` 
    })

  } catch (error) {
    console.error('[IMPERSONATE] Error:', error)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}