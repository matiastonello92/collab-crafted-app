import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { randomBytes } from 'crypto'
import { Resend } from 'resend'
import { withRetry } from '@/lib/utils/retry'

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

    // Get invitations with their roles and permissions (filtered by org)
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

    // Create invitation (force org_id from authenticated user)
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

    // Send invitation email with Resend
    let emailStatus = 'pending'
    let emailMessageId = null
    
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY)
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
        const inviteUrl = `${appUrl}/invite/${token}`
        
        // Get role and location names for the email
        let roleNames: string[] = []
        let locationNames: string[] = []
        
        if (validatedData.locationRoles && validatedData.locationRoles.length > 0) {
          for (const lr of validatedData.locationRoles) {
            const { data: role } = await supabaseAdmin
              .from('roles')
              .select('display_name')
              .eq('id', lr.roleId)
              .single()
            
            const { data: location } = await supabaseAdmin
              .from('locations')
              .select('name')
              .eq('id', lr.locationId)
              .single()
            
            if (role) roleNames.push(role.display_name)
            if (location) locationNames.push(location.name)
          }
        }

        if (validatedData.globalRoleId) {
          const { data: globalRole } = await supabaseAdmin
            .from('roles')
            .select('display_name')
            .eq('id', validatedData.globalRoleId)
            .single()
          
          if (globalRole) roleNames.push(`${globalRole.display_name} (Globale)`)
        }

        // Send email with retry logic
        const result = await withRetry(async () => {
          const { data, error } = await resend.emails.send({
            from: process.env.RESEND_FROM || 'noreply@klyra.fr',
            to: [validatedData.email],
            subject: 'Klyra • Invito alla piattaforma',
            html: `
              <html>
                <body style="font-family: Arial, sans-serif; padding: 20px; color: #333; line-height: 1.6;">
                  <div style="max-width: 600px; margin: 0 auto;">
                    <div style="text-align: center; margin-bottom: 30px;">
                      <h1 style="color: #2563eb; margin-bottom: 10px;">Benvenuto in Klyra!</h1>
                      <p style="color: #6b7280; margin: 0;">Sei stato invitato a far parte della piattaforma</p>
                    </div>
                    
                    <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                      <h2 style="color: #374151; margin-top: 0;">Dettagli dell'invito</h2>
                      <p><strong>Nome:</strong> ${validatedData.firstName} ${validatedData.lastName}</p>
                      <p><strong>Email:</strong> ${validatedData.email}</p>
                      ${roleNames.length > 0 ? `<p><strong>Ruoli assegnati:</strong><br/>${roleNames.join('<br/>')}</p>` : ''}
                      ${locationNames.length > 0 ? `<p><strong>Sedi:</strong><br/>${locationNames.join('<br/>')}</p>` : ''}
                      ${validatedData.notes ? `<p><strong>Note:</strong> ${validatedData.notes}</p>` : ''}
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${inviteUrl}" 
                         style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
                        Accetta l'invito
                      </a>
                    </div>
                    
                    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
                      <p style="color: #6b7280; font-size: 14px; margin: 0;">
                        Questo invito scadrà il ${expiresAt.toLocaleDateString('it-IT')}.<br/>
                        Se non riesci a cliccare il pulsante, copia e incolla questo link: <a href="${inviteUrl}">${inviteUrl}</a>
                      </p>
                    </div>
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

        emailStatus = 'sent'
        emailMessageId = result?.id || null

        console.log('Invitation email sent successfully:', {
          invitationId: invitation.id,
          email: validatedData.email,
          messageId: emailMessageId
        })

      } catch (emailError: any) {
        console.error('Failed to send invitation email:', emailError)
        emailStatus = 'error'
      }
    } else {
      console.warn('RESEND_API_KEY not configured, skipping email send')
      emailStatus = 'not_configured'
    }

    // Update invitation status based on email result
    if (emailStatus !== 'pending') {
      await supabaseAdmin
        .from('invitations')
        .update({ 
          status: emailStatus === 'sent' ? 'sent' : 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', invitation.id)
    }

    // Log audit event
    try {
      // Get user's org_id for audit log
      const { data: membership } = await supabaseAdmin
        .from('memberships')
        .select('org_id')
        .eq('user_id', user.id)
        .single()

      if (membership?.org_id) {
        await supabaseAdmin
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
            org_id: membership.org_id,
            user_id: user.id
          })
      }
    } catch (auditError) {
      console.error('Failed to log audit event:', auditError)
      // Don't fail the invitation creation if audit logging fails
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