import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';
import { getEmailService } from '@/lib/email/email-service';
import { shiftAssignmentTemplate } from '@/lib/email/templates/shift-assignment';
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
    const { shiftId, userId, changeType } = body;

    if (!shiftId || !userId || !changeType) {
      return NextResponse.json({ 
        error: 'Missing required fields: shiftId, userId, changeType' 
      }, { status: 400 });
    }

    if (!['assigned', 'modified', 'cancelled'].includes(changeType)) {
      return NextResponse.json({ 
        error: 'Invalid changeType. Must be: assigned, modified, or cancelled' 
      }, { status: 400 });
    }

    // Fetch shift details
    const { data: shift, error: shiftError } = await supabase
      .from('shifts')
      .select(`
        *,
        location:locations!inner(*),
        job_tag:job_tags(name)
      `)
      .eq('id', shiftId)
      .single();

    if (shiftError || !shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
    }

    // Fetch user profile and email
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, locale')
      .eq('id', userId)
      .single();

    const { data: authUser } = await supabase.auth.admin.getUserById(userId);
    
    if (!authUser.user?.email) {
      return NextResponse.json({ error: 'User email not found' }, { status: 404 });
    }

    // Prepare email
    const locale = (profile?.locale as 'it' | 'fr') || 'it';
    const dateLocale = locale === 'it' ? it : fr;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.klyra.com';

    const shiftDate = format(new Date(shift.start_at), 'dd MMMM yyyy', { locale: dateLocale });
    const shiftStart = format(new Date(shift.start_at), 'HH:mm');
    const shiftEnd = format(new Date(shift.end_at), 'HH:mm');

    const { subject, html } = shiftAssignmentTemplate({
      userName: profile?.full_name || 'Team',
      shiftDate,
      shiftStart,
      shiftEnd,
      locationName: (shift.location as any).name,
      roleName: (shift.job_tag as any)?.name,
      changeType,
      appUrl
    }, locale);

    // Send email
    const emailService = getEmailService();
    const success = await emailService.sendEmail({
      to: authUser.user.email,
      subject,
      html,
      emailType: 'shift_assignment_change',
      userId,
      orgId: shift.org_id,
      metadata: { shiftId, changeType, locationId: shift.location_id }
    });

    return NextResponse.json({ 
      success, 
      recipient: authUser.user.email 
    });

  } catch (error) {
    console.error('Error sending shift assignment email:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
