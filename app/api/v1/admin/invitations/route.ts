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

    // Get user's org_id
    const { data: membership } = await supabase
      .from('memberships')
      .select('org_id')
      .eq('user_id', user.id)
      .single()

    const orgId = membership?.org_id
    if (!orgId) {
      return NextResponse.json({ error: 'No organization' }, { status: 400 })
    }

    // Check invitations feature
    const { data: canInvite } = await supabase.rpc('feature_enabled', { 
      p_org: orgId, 
      p_feature_key: 'invitations' 
    })
    
    if (!canInvite) {
      return NextResponse.json({ error: 'FEATURE_NOT_ENABLED' }, { status: 403 })
    }

    // Get invitations with their roles and permissions (RLS will filter by org)
    const { data: invitations, error } = await supabase
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
      .eq('org_id', orgId)
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

    // Get user's org_id
    const { data: membership } = await supabase
      .from('memberships')
      .select('org_id')
      .eq('user_id', user.id)
      .single()

    const orgId = membership?.org_id
    if (!orgId) {
      return NextResponse.json({ error: 'No organization' }, { status: 400 })
    }

    // Check invitations feature
    const { data: canInvite } = await supabase.rpc('feature_enabled', { 
      p_org: orgId, 
      p_feature_key: 'invitations' 
    })
    
    if (!canInvite) {
      return NextResponse.json({ error: 'FEATURE_NOT_ENABLED' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = inviteSchema.parse(body)

    // Check for duplicate active invitation (RLS will filter by org)
    const { data: existingInvite, error: checkError } = await supabase
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

    // Create invitation (RLS will enforce org_id)
    const { data: invitation, error: inviteError } = await supabase
      .from('invitations')
      .insert({
        email: validatedData.email,
        first_name: validatedData.firstName,
        last_name: validatedData.lastName,
        notes: validatedData.notes,
        token,
        expires_at: expiresAt.toISOString(),
        invited_by: user.id,
        org_id: orgId,
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
        org_id: orgId,
      }))

      const { error: rolesError } = await supabase
        .from('invitation_roles_locations')
        .insert(locationRoleInserts)

      if (rolesError) {
        console.error('Error adding invitation roles:', rolesError)
        // We could rollback the invitation here, but for now just log
      }
    }

    // Add global role if provided
    if (validatedData.globalRoleId) {
      const { error: globalRoleError } = await supabase
        .from('invitation_roles_locations')
        .insert({
          invitation_id: invitation.id,
          location_id: null, // null means global
          role_id: validatedData.globalRoleId,
          org_id: orgId,
        })

      if (globalRoleError) {
        console.error('Error adding global role:', globalRoleError)
      }
    }

    // Send invitation email via Supabase Edge Function
    let emailStatus = 'pending'
    let emailMessageId = null
    let emailErrorMessage: string | null = null
    
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
      const inviteUrl = `${appUrl}/invite/${token}`
      
      // Get role and location names for the email
      let roleNames: string[] = []
      let locationNames: string[] = []
      
      if (validatedData.locationRoles && validatedData.locationRoles.length > 0) {
        for (const lr of validatedData.locationRoles) {
          const { data: role } = await supabase
            .from('roles')
            .select('display_name')
            .eq('id', lr.roleId)
            .single()
          
          const { data: location } = await supabase
            .from('locations')
            .select('name')
            .eq('id', lr.locationId)
            .single()
          
          if (role) roleNames.push(role.display_name)
          if (location) locationNames.push(location.name)
        }
      }

      if (validatedData.globalRoleId) {
        const { data: globalRole } = await supabase
          .from('roles')
          .select('display_name')
          .eq('id', validatedData.globalRoleId)
          .single()
        
        if (globalRole) roleNames.push(`${globalRole.display_name} (Globale)`)
      }

      // Get inviter name
      const inviterName = user.user_metadata?.full_name || user.email

      // Send via Edge Function
      const { data: emailResult, error: emailError } = await supabase.functions.invoke(
        'send-invitation',
        {
          body: {
            to: validatedData.email,
            firstName: validatedData.firstName,
            lastName: validatedData.lastName,
            inviteUrl,
            roleNames,
            locationNames,
            notes: validatedData.notes,
            expiresAt: expiresAt.toISOString(),
            inviterName,
            orgId,
          },
        }
      )

      if (emailError || !emailResult?.success) {
        emailStatus = 'error'
        emailErrorMessage = emailError?.message || emailResult?.error || 'Edge Function error'
        console.error('Failed to send invitation email:', emailErrorMessage)
      } else {
        emailStatus = 'sent'
        emailMessageId = emailResult.messageId
        console.log('Invitation email sent successfully:', {
          invitationId: invitation.id,
          email: validatedData.email,
          messageId: emailMessageId
        })
      }
    } catch (emailError: any) {
      console.error('Failed to send invitation email:', emailError)
      console.error('Error details:', {
        message: emailError.message,
        name: emailError.name,
        stack: emailError.stack,
      })
      emailStatus = 'error'
      emailErrorMessage = emailError.message || String(emailError)
    }

    // Update invitation status based on email result
    if (emailStatus !== 'pending') {
      await supabase
        .from('invitations')
        .update({ 
          status: emailStatus === 'sent' ? 'sent' : 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', invitation.id)
    }

    // Log email attempt in email_logs
    try {
      await supabase
        .from('email_logs')
        .insert({
          org_id: orgId,
          recipient_email: validatedData.email,
          email_type: 'invitation',
          subject: 'Klyra • Invito alla piattaforma',
          status: emailStatus === 'sent' ? 'sent' : 'failed',
          provider_id: emailMessageId,
          error_message: 
            emailStatus === 'error' ? (emailErrorMessage || 'Edge Function error') : null,
          sent_at: emailStatus === 'sent' ? new Date().toISOString() : null,
        })
    } catch (logError) {
      console.error('Failed to log email attempt:', logError)
      // Don't fail the invitation if logging fails
    }

    // Log audit event
    try {
      await supabase
        .from('audit_events')
        .insert({
          event_key: 'user.invited',
          payload: {
            invitation_id: invitation.id,
            email: validatedData.email,
            role_ids: [
              ...(validatedData.locationRoles?.map(lr => lr.roleId) || []),
              ...(validatedData.globalRoleId ? [validatedData.globalRoleId] : [])
            ],
            location_ids: validatedData.locationRoles?.map(lr => lr.locationId) || [],
            email_status: emailStatus,
            message_id: emailMessageId
          },
          org_id: orgId,
          user_id: user.id
        })
    } catch (auditError) {
      console.error('Failed to log audit event:', auditError)
      // Don't fail the invitation creation if audit logging fails
    }

    // Revalidate and redirect on success
    revalidatePath('/admin/invitations')
    
    return NextResponse.json({ 
      invitation,
      message: 'Invito creato con successo',
      emailStatus,
      warning: emailStatus !== 'sent' 
        ? `Invito creato ma email non inviata. ${emailErrorMessage || 'Verificare configurazione email.'}` 
        : undefined
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