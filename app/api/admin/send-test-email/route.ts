import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { requireOrgAdmin } from '@/lib/admin/guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: NextRequest) {
  try {
    await requireOrgAdmin()

    const body = await request.json()
    
    if (!body.to || typeof body.to !== 'string') {
      return NextResponse.json(
        { error: 'Missing "to"' },
        { 
          status: 400,
          headers: { 'Cache-Control': 'no-store' }
        }
      )
    }

    const resend = new Resend(process.env.RESEND_API_KEY!)
    
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM!,
      to: [body.to],
      subject: 'Test email — Pecora APP',
      html: '<p>It works! ✅</p>',
      replyTo: process.env.RESEND_REPLY_TO || undefined,
    })

    if (error) {
      // Surface the error so it's visible in toast
      return NextResponse.json(
        { error: error.message || String(error) },
        { 
          status: 502,
          headers: { 'Cache-Control': 'no-store' }
        }
      )
    }

    return NextResponse.json(
      { id: data?.id ?? null },
      { 
        status: 200,
        headers: { 'Cache-Control': 'no-store' }
      }
    )

  } catch (error: any) {
    console.error('Send test email error:', error)
    
    return NextResponse.json(
      { error: error.message || 'Unknown error' },
      { 
        status: 500,
        headers: { 'Cache-Control': 'no-store' }
      }
    )
  }
}