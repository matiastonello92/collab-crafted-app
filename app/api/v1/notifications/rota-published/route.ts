import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getEmailService } from '@/lib/email/email-service';
import { rotaPublishedTemplate } from '@/lib/email/templates/rota-published';
import { format } from 'date-fns';
import { it, fr } from 'date-fns/locale';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { rotaId } = body;

    if (!rotaId) {
      return NextResponse.json({ error: 'Missing rotaId' }, { status: 400 });
    }

    // Fetch rota details with location
    const { data: rota, error: rotaError } = await supabase
      .from('rotas')
      .select('*, location:locations!inner(*)')
      .eq('id', rotaId)
      .single();

    if (rotaError || !rota) {
      return NextResponse.json({ error: 'Rota not found' }, { status: 404 });
    }

    // Fetch all shifts and assignments for this rota
    const { data: shifts, error: shiftsError } = await supabase
      .from('shifts')
      .select(`
        *,
        assignments:shift_assignments!inner(
          user_id,
          status
        )
      `)
      .eq('rota_id', rotaId)
      .eq('assignments.status', 'published');

    if (shiftsError || !shifts) {
      return NextResponse.json({ error: 'Failed to fetch shifts' }, { status: 500 });
    }

    // Group shifts by user
    const userShifts = new Map<string, number>();
    shifts.forEach((shift: any) => {
      shift.assignments?.forEach((assignment: any) => {
        const count = userShifts.get(assignment.user_id) || 0;
        userShifts.set(assignment.user_id, count + 1);
      });
    });

    // Fetch user profiles and emails
    const userIds = Array.from(userShifts.keys());
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, locale')
      .in('id', userIds);

    if (profilesError || !profiles) {
      return NextResponse.json({ error: 'Failed to fetch user profiles' }, { status: 500 });
    }

    // Fetch auth emails
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const emailMap = new Map(authUsers.users.map(u => [u.id, u.email]));

    // Send emails
    const emailService = getEmailService();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.klyra.com';
    
    const recipients = profiles
      .filter(p => emailMap.has(p.id))
      .map(profile => {
        const locale = (profile.locale as 'it' | 'fr') || 'it';
        const dateLocale = locale === 'it' ? it : fr;
        
        const weekStart = format(new Date(rota.week_start_date), 'dd MMM yyyy', { locale: dateLocale });
        const weekEnd = format(new Date(rota.week_start_date), 'dd MMM yyyy', { locale: dateLocale });

        const { subject, html } = rotaPublishedTemplate({
          userName: profile.full_name || 'Team',
          weekStart,
          weekEnd,
          locationName: (rota.location as any).name,
          shiftsCount: userShifts.get(profile.id) || 0,
          appUrl
        }, locale);

        return {
          email: emailMap.get(profile.id)!,
          userId: profile.id,
          subject,
          html
        };
      });

    // Send bulk emails
    let sent = 0;
    let failed = 0;

    for (const recipient of recipients) {
      const success = await emailService.sendEmail({
        to: recipient.email,
        subject: recipient.subject,
        html: recipient.html,
        emailType: 'rota_published',
        userId: recipient.userId,
        orgId: rota.org_id,
        metadata: { rotaId, locationId: rota.location_id }
      });

      if (success) sent++;
      else failed++;
    }

    return NextResponse.json({ 
      success: true, 
      sent, 
      failed,
      totalRecipients: recipients.length 
    });

  } catch (error) {
    console.error('Error sending rota published emails:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
