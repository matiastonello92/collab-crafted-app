import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerActionClient } from '@/utils/supabase/server';
import { getEmailService } from '@/lib/email/email-service';
import { leaveDecisionTemplate } from '@/lib/email/templates/leave-decision';
import { format } from 'date-fns';
import { it, fr } from 'date-fns/locale';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { leaveRequestId } = body;

    if (!leaveRequestId) {
      return NextResponse.json({ error: 'Missing leaveRequestId' }, { status: 400 });
    }

    // Fetch leave request details
    const { data: leaveRequest, error: leaveError } = await supabase
      .from('leave_requests')
      .select(`
        *,
        type:leave_types!inner(label),
        approver:profiles!leave_requests_approver_id_fkey(full_name)
      `)
      .eq('id', leaveRequestId)
      .single();

    if (leaveError || !leaveRequest) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
    }

    if (!['approved', 'rejected'].includes(leaveRequest.status)) {
      return NextResponse.json({ 
        error: 'Leave request status must be approved or rejected' 
      }, { status: 400 });
    }

    // Fetch requester profile and email
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, locale')
      .eq('id', leaveRequest.user_id)
      .single();

    const { data: authUser } = await supabase.auth.admin.getUserById(leaveRequest.user_id);
    
    if (!authUser.user?.email) {
      return NextResponse.json({ error: 'User email not found' }, { status: 404 });
    }

    // Prepare email
    const locale = (profile?.locale as 'it' | 'fr') || 'it';
    const dateLocale = locale === 'it' ? it : fr;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.klyra.com';

    const startDate = format(new Date(leaveRequest.start_at), 'dd MMM yyyy', { locale: dateLocale });
    const endDate = format(new Date(leaveRequest.end_at), 'dd MMM yyyy', { locale: dateLocale });

    const { subject, html } = leaveDecisionTemplate({
      userName: profile?.full_name || 'Team',
      leaveType: (leaveRequest.type as any).label,
      startDate,
      endDate,
      status: leaveRequest.status as 'approved' | 'rejected',
      approverName: (leaveRequest.approver as any)?.full_name,
      reason: leaveRequest.notes || undefined,
      appUrl
    }, locale);

    // Send email
    const emailService = getEmailService();
    const success = await emailService.sendEmail({
      to: authUser.user.email,
      subject,
      html,
      emailType: 'leave_decision',
      userId: leaveRequest.user_id,
      orgId: leaveRequest.org_id,
      metadata: { 
        leaveRequestId, 
        status: leaveRequest.status,
        leaveTypeId: leaveRequest.type_id
      }
    });

    return NextResponse.json({ 
      success, 
      recipient: authUser.user.email 
    });

  } catch (error) {
    console.error('Error sending leave decision email:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
