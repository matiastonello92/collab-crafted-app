import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

interface RequestBody {
  token: string
  email: string
  password: string
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json()
    const { token, email, password } = body

    if (!token || !email || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabaseAdmin = createSupabaseAdminClient()

    // Validate token first
    const { data: validationData, error: validationError } = await supabaseAdmin
      .rpc('invitation_validate_v2', { p_token: token })

    if (validationError || !validationData || validationData.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation' },
        { status: 400 }
      )
    }

    const inviteData = validationData[0]
    if (!inviteData.is_valid) {
      return NextResponse.json(
        { error: 'Invitation is not valid' },
        { status: 400 }
      )
    }

    // Check if email matches invitation
    if (inviteData.email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json(
        { error: 'Email mismatch' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const { data: userList } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = userList.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())
    
    if (!existingUser) {
      // Create user with confirmed email
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      })

      if (createError) {
        console.error('Error creating user:', createError)
        // Don't leak specific error details
        return NextResponse.json(
          { error: 'Failed to create user account' },
          { status: 500 }
        )
      }

      console.log('User created successfully:', newUser.user?.id)
    }

    return NextResponse.json({ ok: true })

  } catch (error: any) {
    console.error('Error in invite accept route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}