import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

interface RouteParams {
  params: {
    headerId: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    console.log('🔍 [API DEBUG] GET /api/v1/inventory/[headerId]/export called', { headerId: params.headerId })
    
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';
    const { headerId } = params;

    // Use server client with RLS
    const { createSupabaseServerClient } = await import('@/utils/supabase/server');
    const supabase = await createSupabaseServerClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.log('❌ [API DEBUG] Auth failed')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ [API DEBUG] User authenticated:', user.id, 'format:', format)

    // Get inventory header with details (RLS will enforce access)
    const { data: header, error: headerError } = await supabase
      .from('inventory_headers')
      .select(`
        *,
        locations(name, city),
        profiles:started_by(full_name),
        approver:approved_by(full_name)
      `)
      .eq('id', headerId)
      .single();

    if (headerError || !header) {
      console.log('❌ [API DEBUG] Inventory not found or access denied')
      return NextResponse.json({ error: 'Inventory not found' }, { status: 404 });
    }

    console.log('✅ [API DEBUG] Inventory found:', header.id)

    // Get inventory lines
    const { data: lines, error: linesError } = await supabase
      .from('inventory_lines')
      .select('*')
      .eq('header_id', headerId)
      .order('name_snapshot');

    if (linesError) {
      console.error('❌ [API DEBUG] Error fetching inventory lines:', linesError);
      return NextResponse.json({ error: linesError.message }, { status: 500 });
    }

    console.log('✅ [API DEBUG] Lines fetched:', lines?.length || 0)

    if (format === 'csv') {
      // Generate CSV
      const csvHeader = 'Article,UoM,Quantity,Unit Price (€),Line Value (€)\n';
      const csvRows = lines?.map((line: any) => 
        `"${line.name_snapshot}","${line.uom_snapshot}",${line.qty},${line.unit_price_snapshot},${line.line_value}`
      ).join('\n') || '';
      const csvFooter = `\n\nTotal Value,,,,"${header.total_value}"\nLocation,,,,"${header.locations?.name}"\nCategory,,,,"${header.category}"\nDate,,,,"${new Date(header.started_at).toLocaleDateString('it-IT')}"\nStatus,,,,"${header.status}"`;
      
      const csv = csvHeader + csvRows + csvFooter;

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="inventory_${header.category}_${new Date(header.started_at).toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    if (format === 'pdf') {
      // For PDF generation, we'll use a simple HTML approach
      // In a real implementation, you might want to use a library like puppeteer or jsPDF
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Inventory Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .info { margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .total { font-weight: bold; }
            .footer { margin-top: 30px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Inventory Report</h1>
            <h2>${header.category.charAt(0).toUpperCase() + header.category.slice(1)} - ${header.locations?.name}</h2>
          </div>
          
          <div class="info">
            <p><strong>Date:</strong> ${new Date(header.started_at).toLocaleDateString('it-IT')}</p>
            <p><strong>Status:</strong> ${header.status}</p>
            <p><strong>Started by:</strong> ${header.profiles?.full_name || 'N/A'}</p>
            ${header.approver?.full_name ? `<p><strong>Approved by:</strong> ${header.approver.full_name}</p>` : ''}
            ${header.approved_at ? `<p><strong>Approved at:</strong> ${new Date(header.approved_at).toLocaleDateString('it-IT')}</p>` : ''}
          </div>

          <table>
            <thead>
              <tr>
                <th>Article</th>
                <th>UoM</th>
                <th>Quantity</th>
                <th>Unit Price (€)</th>
                <th>Line Value (€)</th>
              </tr>
            </thead>
            <tbody>
              ${lines?.map((line: any) => `
                <tr>
                  <td>${line.name_snapshot}</td>
                  <td>${line.uom_snapshot}</td>
                  <td>${line.qty}</td>
                  <td>${Number(line.unit_price_snapshot).toFixed(2)}</td>
                  <td>${Number(line.line_value).toFixed(2)}</td>
                </tr>
              `).join('') || ''}
            </tbody>
            <tfoot>
              <tr class="total">
                <td colspan="4"><strong>Total Value</strong></td>
                <td><strong>€${Number(header.total_value).toFixed(2)}</strong></td>
              </tr>
            </tfoot>
          </table>

          <div class="footer">
            <p>Generated on ${new Date().toLocaleDateString('it-IT')} at ${new Date().toLocaleTimeString('it-IT')}</p>
          </div>
        </body>
        </html>
      `;

      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html',
          'Content-Disposition': `attachment; filename="inventory_${header.category}_${new Date(header.started_at).toISOString().split('T')[0]}.html"`,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid format. Use csv or pdf' }, { status: 400 });
  } catch (error) {
    console.error('Error in export:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}