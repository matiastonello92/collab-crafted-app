import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { randomBytes } from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const inviteSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  notes: z.string().optional(),
  globalRoleId: z.string().optional(),
  locationRoles: z.array(z.object({
    locationId: z.string(),
    roleId: z.string(),
  })).optional(),
})

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user can manage users
    const supabaseAdmin = createSupabaseAdminClient()
    const { data: isAdmin } = await supabaseAdmin.rpc('user_is_admin', { p_user: user.id })
    
    if (!isAdmin) {
      // Check if user has users:manage permission
      const { data: hasPermission } = await supabaseAdmin.rpc('user_has_permission', { 
        p_user: user.id, 
        p_permission: 'manage_users' 
      })
      
      if (!hasPermission) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }
    }

    // Get invitations with their roles and permissions
    const { data: invitations, error } = await supabaseAdmin
      .from('invitations')
      .select(`
        *,
        invitation_roles_locations(
          location_id,
          role_id,
          locations(name),
          roles(name, display_name)
        ),
        invitation_permissions(
          location_id,
          permission_id,
          locations(name),
          permissions(name, display_name)
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching invitations:', error)
      return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 })
    }

    return NextResponse.json({ invitations })
  } catch (error) {
    console.error('Error in GET /api/v1/admin/invitations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions
    const supabaseAdmin = createSupabaseAdminClient()
    const { data: isAdmin } = await supabaseAdmin.rpc('user_is_admin', { p_user: user.id })
    
    if (!isAdmin) {
      const { data: hasPermission } = await supabaseAdmin.rpc('user_has_permission', { 
        p_user: user.id, 
        p_permission: 'manage_users' 
      })
      
      if (!hasPermission) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }
    }

    const body = await request.json()
    const validatedData = inviteSchema.parse(body)

    // Check for duplicate active invitation
    const { data: existingInvite, error: checkError } = await supabaseAdmin
      .from('invitations')
      .select('id, token')
      .eq('email', validatedData.email.toLowerCase())
      .eq('status', 'pending')
      .is('revoked_at', null)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (!checkError && existingInvite) {
      return NextResponse.json({ 
        error: 'Invito già presente',
        code: 'DUPLICATE_INVITATION',
        actions: {
          copyLink: true,
          revokeFirst: true
        },
        existingToken: existingInvite.token
      }, { status: 409 })
    }

    // Generate invitation token
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days from now

    // Create invitation
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from('invitations')
      .insert({
        email: validatedData.email,
        first_name: validatedData.firstName,
        last_name: validatedData.lastName,
        notes: validatedData.notes,
        token,
        expires_at: expiresAt.toISOString(),
        invited_by: user.id,
        status: 'pending',
      })
      .select()
      .single()

    if (inviteError) {
      console.error('Error creating invitation:', inviteError)
      if (inviteError.code === '23505') {
        return NextResponse.json({ error: 'Un invito per questa email esiste già' }, { status: 400 })
      }
      return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
    }

    // Add location roles if provided
    if (validatedData.locationRoles && validatedData.locationRoles.length > 0) {
      const locationRoleInserts = validatedData.locationRoles.map(lr => ({
        invitation_id: invitation.id,
        location_id: lr.locationId,
        role_id: lr.roleId,
      }))

      const { error: rolesError } = await supabaseAdmin
        .from('invitation_roles_locations')
        .insert(locationRoleInserts)

      if (rolesError) {
        console.error('Error adding invitation roles:', rolesError)
        // We could rollback the invitation here, but for now just log
      }
    }

    // Add global role if provided
    if (validatedData.globalRoleId) {
      const { error: globalRoleError } = await supabaseAdmin
        .from('invitation_roles_locations')
        .insert({
          invitation_id: invitation.id,
          location_id: null, // null means global
          role_id: validatedData.globalRoleId,
        })

      if (globalRoleError) {
        console.error('Error adding global role:', globalRoleError)
      }
    }

    // Send invitation email via edge function
    try {
      const inviteUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/accept-invitation?token=${token}`
      
      const emailPayload = {
        to: validatedData.email,
        name: `${validatedData.firstName} ${validatedData.lastName}`,
        inviteUrl,
        inviterName: user.user_metadata?.full_name || user.email,
      }

      // Call send-invitation edge function
      const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-invitation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify(emailPayload),
      })

      if (!emailResponse.ok) {
        console.error('Failed to send invitation email:', await emailResponse.text())
        // Don't fail the invitation creation, just log the error
      }
    } catch (emailError) {
      console.error('Error sending invitation email:', emailError)
      // Don't fail the invitation creation
    }

    // Revalidate and redirect on success
    revalidatePath('/admin/invitations')
    
    return NextResponse.json({ 
      invitation,
      message: 'Invito creato con successo',
    }, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/v1/admin/invitations:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Dati non validi', 
        details: error.issues 
      }, { status: 400 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}