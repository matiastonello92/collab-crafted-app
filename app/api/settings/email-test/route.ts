import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { withRetry } from '@/lib/utils/retry'

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

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'Email service not configured' },
        { 
          status: 503,
          headers: { 'Cache-Control': 'no-store' }
        }
      )
    }

    const resend = new Resend(process.env.RESEND_API_KEY)
    
    // Send test email with retry logic
    const result = await withRetry(async () => {
      const { data, error } = await resend.emails.send({
        from: process.env.RESEND_FROM || 'noreply@klyra.fr',
        to: [user.email!],
        subject: 'Klyra • Test Email',
        html: `
          <html>
            <body style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
              <div style="max-width: 600px; margin: 0 auto;">
                <h1 style="color: #2563eb;">✅ Test Email Klyra</h1>
                <p>Questo è un test email dal sistema Klyra.</p>
                <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
                <p><strong>Dettagli:</strong></p>
                <ul style="background: #f9fafb; padding: 15px; border-radius: 5px;">
                  <li><strong>Orario invio:</strong> ${new Date().toLocaleString('it-IT')}</li>
                  <li><strong>User ID:</strong> ${user.id}</li>
                  <li><strong>Email destinatario:</strong> ${user.email}</li>
                </ul>
                <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                  Se hai ricevuto questa email, le impostazioni email sono configurate correttamente.
                </p>
              </div>
            </body>
          </html>
        `,
        replyTo: process.env.RESEND_REPLY_TO || undefined,
      })

      if (error) {
        throw new Error(error.message || String(error))
      }
      
      return data
    }, 3, 500) // 3 attempts with 500ms base delay

    // Log to audit_events
    if (orgId) {
      try {
        await supabase
          .from('audit_events')
          .insert({
            event_key: 'settings.updated',
            payload: {
              action: 'email_test',
              result: 'ok',
              message_id: result?.id || null
            },
            org_id: orgId,
            user_id: user.id
          })
      } catch (auditError) {
        console.error('Audit log failed:', auditError)
        // Don't fail the request if audit logging fails
      }
    }

    console.log('Test email sent successfully:', {
      messageId: result?.id,
      to: user.email,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json(
      { ok: true, messageId: result?.id || null },
      { 
        status: 200,
        headers: { 'Cache-Control': 'no-store' }
      }
    )

  } catch (error: any) {
    console.error('Send test email error:', error)
    
    // Handle specific Resend errors
    if (error.message?.includes('429')) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { 
          status: 429,
          headers: { 'Cache-Control': 'no-store' }
        }
      )
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to send test email' },
      { 
        status: 500,
        headers: { 'Cache-Control': 'no-store' }
      }
    )
  }
}