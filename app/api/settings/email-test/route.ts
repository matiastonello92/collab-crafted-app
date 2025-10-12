import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/utils/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { 
          status: 401,
          headers: { 'Cache-Control': 'no-store' }
        }
      )
    }

    // Get user's org_id from membership
    const { data: membership } = await supabase
      .from('memberships')
      .select('org_id')
      .eq('user_id', user.id)
      .single()

    const orgId = membership?.org_id
    if (!orgId) {
      return NextResponse.json(
        { error: 'No organization found' },
        { 
          status: 400,
          headers: { 'Cache-Control': 'no-store' }
        }
      )
    }

    // Check branding feature for email test
    const { data: canBranding } = await supabase.rpc('feature_enabled', { 
      p_org: orgId, 
      p_feature_key: 'branding' 
    })
    
    if (!canBranding) {
      return NextResponse.json(
        { error: 'FEATURE_NOT_ENABLED' },
        { 
          status: 403,
          headers: { 'Cache-Control': 'no-store' }
        }
      )
    }

    // Send test email via Supabase Edge Function
    const { data: emailResult, error: emailError } = await supabase.functions.invoke(
      'send-test-email',
      {
        body: {
          to: user.email!,
          userId: user.id,
          orgId,
        },
      }
    )

    if (emailError || !emailResult?.success) {
      console.error('Edge Function error:', emailError || emailResult?.error)
      return NextResponse.json(
        { error: emailError?.message || emailResult?.error || 'Failed to send test email' },
        { 
          status: 500,
          headers: { 'Cache-Control': 'no-store' }
        }
      )
    }

    console.log('Test email sent successfully:', {
      messageId: emailResult.messageId,
      to: user.email,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json(
      { ok: true, messageId: emailResult.messageId },
      { 
        status: 200,
        headers: { 'Cache-Control': 'no-store' }
      }
    )

  } catch (error: any) {
    console.error('Send test email error:', error)
    
    return NextResponse.json(
      { error: error.message || 'Failed to send test email' },
      { 
        status: 500,
        headers: { 'Cache-Control': 'no-store' }
      }
    )
  }
}