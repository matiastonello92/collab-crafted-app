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
    const { csvContent, importId, orgId, locationId } = await req.json();
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const lines = csvContent.split('\n').filter((l: string) => l.trim());
    const headers = lines[0].split(',').map((h: string) => h.trim().toLowerCase());
    
    const dataRows = lines.slice(1);
    let rowsProcessed = 0;
    let errors = 0;

    const parsedData: any[] = [];

    for (const line of dataRows) {
      const values = line.split(',').map((v: string) => v.trim());
      if (values.length < headers.length) {
        errors++;
        continue;
      }

      const row: any = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx];
      });

      if (row.data && row.importo) {
        parsedData.push(row);
        rowsProcessed++;
      } else {
        errors++;
      }
    }

    // Update import record - NO AI HERE
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
