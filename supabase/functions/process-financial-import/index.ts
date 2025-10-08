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

    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    let aiSummary = "";

    if (openAIKey && parsedData.length > 0) {
      const total = parsedData.reduce((sum, r) => sum + parseFloat(r.importo || 0), 0);
      const avg = total / parsedData.length;
      
      const summaryPrompt = `
Analizza questo import di dati finanziari:

- Righe importate: ${rowsProcessed}
- Totale importo: €${total.toFixed(2)}
- Media per transazione: €${avg.toFixed(2)}
- Periodo: dal ${parsedData[0].data} al ${parsedData[parsedData.length - 1].data}

Fornisci un'analisi breve (max 150 parole) con:
1. Valutazione generale dei dati
2. Pattern interessanti
3. Suggerimenti per ottimizzazione

Rispondi in italiano, tono professionale.
      `;

      try {
        const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'Sei un analista finanziario esperto.' },
              { role: 'user', content: summaryPrompt }
            ],
            max_tokens: 300,
            temperature: 0.7,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          aiSummary = aiData.choices[0].message.content;
        }
      } catch (aiError) {
        console.error('AI analysis error:', aiError);
      }
    }

    await supabaseClient
      .from('financial_imports')
      .update({
        status: 'completed',
        rows_imported: rowsProcessed,
        rows_failed: errors,
        completed_at: new Date().toISOString(),
        ai_summary: aiSummary ? { summary: aiSummary } : null
      })
      .eq('id', importId);

    return new Response(
      JSON.stringify({
        success: true,
        rowsProcessed,
        errors,
        aiSummary
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
