import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { z } from 'zod';

const emailSchema = z.object({
  to: z.string().email(),
  format: z.enum(['csv', 'pdf']),
  subject: z.string().optional(),
  message: z.string().optional(),
});

interface RouteParams {
  params: {
    headerId: string;
  };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    console.log('🔍 [API DEBUG] POST /api/v1/inventory/[headerId]/email called', { headerId: params.headerId })
    
    const body = await request.json();
    const validated = emailSchema.parse(body);
    const { headerId } = params;

    // Use server client with RLS
    const { createSupabaseServerClient } = await import('@/utils/supabase/server');
    const supabase = await createSupabaseServerClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.log('❌ [API DEBUG] Auth failed')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ [API DEBUG] User authenticated:', user.id)

    // Get inventory header (RLS will enforce access)
    const { data: header, error: headerError } = await supabase
      .from('inventory_headers')
      .select(`
        *,
        locations(name, city),
        profiles:started_by(full_name)
      `)
      .eq('id', headerId)
      .single();

    if (headerError || !header) {
      console.log('❌ [API DEBUG] Inventory not found or access denied')
      return NextResponse.json({ error: 'Inventory not found' }, { status: 404 });
    }

    console.log('✅ [API DEBUG] Inventory found:', header.id)

    // Check if email provider is configured
    // For now, we'll return a success response but note that email isn't actually sent
    // In a real implementation, you would use Resend or another email service here
    
    const subject = validated.subject || 
      `Inventory Report - ${header.category} - ${header.locations?.name} - ${new Date(header.started_at).toLocaleDateString('it-IT')}`;
    
    const message = validated.message || 
      `Please find attached the inventory report for ${header.category} at ${header.locations?.name}.`;

    // Log the email attempt for audit purposes
    console.log('Email would be sent:', {
      to: validated.to,
      subject,
      message,
      format: validated.format,
      headerId,
      timestamp: new Date().toISOString(),
    });

    // In a real implementation, you would:
    // 1. Generate the export file (CSV/PDF)
    // 2. Send email with attachment using Resend or similar service
    // 3. Log the action in audit_events table
    
    // For now, return a message indicating email service is not configured
    return NextResponse.json({
      success: false,
      message: 'Email service is not configured. The export file can be downloaded directly from the inventory page.',
      note: 'To enable email functionality, please configure an email provider (e.g., Resend) in your environment.'
    });

    // Uncomment and modify when email service is configured:
    /*
    // Generate export file
    const exportResponse = await fetch(
      `${process.env.NEXT_PUBLIC_URL}/api/v1/inventory/${headerId}/export?format=${validated.format}`,
      { method: 'GET' }
    );
    
    if (!exportResponse.ok) {
      throw new Error('Failed to generate export file');
    }
    
    const exportData = await exportResponse.blob();
    
    // Send email with Resend
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    await resend.emails.send({
      from: 'inventory@yourdomain.com',
      to: validated.to,
      subject,
      text: message,
      attachments: [{
        filename: `inventory_${header.category}_${new Date(header.started_at).toISOString().split('T')[0]}.${validated.format}`,
        content: Buffer.from(await exportData.arrayBuffer()),
      }],
    });

    return NextResponse.json({ success: true, message: 'Email sent successfully' });
    */
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error in email:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}