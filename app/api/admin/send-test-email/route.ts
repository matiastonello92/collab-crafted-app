import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { requireAdmin } from '@/lib/admin/guards'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: NextRequest) {
  try {
    // Admin guard - redirects if not authorized
    await requireAdmin()

    const resend = new Resend(process.env.RESEND_API_KEY!)
    const body = await request.json()
    
    if (!body.to || typeof body.to !== 'string') {
      return NextResponse.json(
        { error: 'Field "to" is required and must be a string' },
        { 
          status: 400,
          headers: { 'Cache-Control': 'no-store' }
        }
      )
    }

    const emailData = {
      from: process.env.RESEND_FROM!,
      to: body.to,
      subject: 'Test email — Pecora APP',
      text: 'If you received this, outbound email works. ✅'
    }

    // Add reply_to if configured
    if (process.env.RESEND_REPLY_TO) {
      (emailData as any).reply_to = process.env.RESEND_REPLY_TO
    }

    const result = await resend.emails.send(emailData)

    return NextResponse.json(
      { success: true, messageId: result.data?.id },
      { 
        status: 200,
        headers: { 'Cache-Control': 'no-store' }
      }
    )

  } catch (error: any) {
    console.error('Send test email error:', error)
    
    return NextResponse.json(
      { 
        error: error.message || 'Failed to send test email',
        details: error.response?.data || null
      },
      { 
        status: 500,
        headers: { 'Cache-Control': 'no-store' }
      }
    )
  }
}