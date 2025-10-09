import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { csvContent, importId, orgId, locationId, columnMapping } = await req.json();
    
    console.log('📊 Processing import with mapping:', columnMapping);
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const lines = csvContent.split('\n').filter((l: string) => l.trim());
    const headers = lines[0].split(',').map((h: string) => h.trim());
    
    const dataRows = lines.slice(1);
    let rowsProcessed = 0;
    let errors = 0;

    const salesToInsert: any[] = [];

    // Helper: parse date from various formats
    const parseDate = (val: string): string | null => {
      if (!val || val.trim() === '') return null;
      
      // Try ISO format first (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SSZ)
      const isoMatch = val.match(/^(\d{4}-\d{2}-\d{2})/);
      if (isoMatch) return isoMatch[1];
      
      // Try DD/MM/YYYY
      const ddmmyyyy = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (ddmmyyyy) {
        const [_, day, month, year] = ddmmyyyy;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      
      return null;
    };

    // Helper: parse numeric value
    const parseNumeric = (val: string): number => {
      if (!val || val.trim() === '') return 0;
      const cleaned = val.replace(/[^\d.-]/g, '');
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : num;
    };

    // Helper: parse integer
    const parseInt = (val: string): number => {
      if (!val || val.trim() === '') return 0;
      const num = Number.parseInt(val);
      return isNaN(num) ? 0 : num;
    };

    for (const line of dataRows) {
      const values = line.split(',').map((v: string) => v.trim());
      if (values.length < headers.length) {
        errors++;
        continue;
      }

      const row: any = {
        org_id: orgId,
        location_id: locationId,
        import_id: importId
      };
      
      // Map CSV columns to database fields
      headers.forEach((header, idx) => {
        const targetField = columnMapping[header];
        if (!targetField || targetField === '_ignore') return;
        
        const value = values[idx];
        
        // Field-specific parsing
        if (targetField === 'record_date' || targetField === 'datetime_from' || targetField === 'datetime_to') {
          const parsed = parseDate(value);
          if (parsed) row[targetField] = parsed;
        } else if (targetField === 'covers' || targetField === 'orders') {
          row[targetField] = parseInt(value);
        } else if (targetField === 'interval_title') {
          row[targetField] = value;
        } else {
          // All amount fields
          row[targetField] = parseNumeric(value);
        }
      });

      // Validate required fields
      if (!row.record_date || !row.total_amount) {
        errors++;
        console.log('⚠️ Skipping row - missing required fields:', row);
        continue;
      }

      salesToInsert.push(row);
      rowsProcessed++;
    }

    console.log(`✅ Parsed ${rowsProcessed} rows, ${errors} errors`);
    console.log('📦 Sample data to insert:', salesToInsert.slice(0, 2));

    // Batch insert sales records
    if (salesToInsert.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('sales_records')
        .insert(salesToInsert);

      if (insertError) {
        console.error('❌ Error inserting sales records:', insertError);
        throw insertError;
      }

      console.log(`✅ Inserted ${salesToInsert.length} sales records`);
    }

    // Update import record
    await supabaseClient
      .from('financial_imports')
      .update({
        status: 'completed',
        rows_imported: rowsProcessed,
        rows_failed: errors,
        completed_at: new Date().toISOString()
      })
      .eq('id', importId);

    return new Response(
      JSON.stringify({
        success: true,
        rowsProcessed,
        errors
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in process-financial-import:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
