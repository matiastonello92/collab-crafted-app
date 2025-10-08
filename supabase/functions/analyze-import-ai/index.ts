import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { importId } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Check if AI analysis already exists
    const { data: existingImport, error: fetchError } = await supabaseClient
      .from('financial_imports')
      .select('ai_summary, file_name, rows_imported')
      .eq('id', importId)
      .single();

    if (fetchError) throw fetchError;

    // If AI summary already exists, return it without re-analyzing
    if (existingImport.ai_summary && typeof existingImport.ai_summary === 'object' && existingImport.ai_summary.summary) {
      return new Response(
        JSON.stringify({ 
          summary: existingImport.ai_summary.summary,
          cached: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Call OpenAI for analysis
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Sei un assistente finanziario esperto. Analizza i dati di import finanziari e fornisci insights utili in italiano.'
          },
          {
            role: 'user',
            content: `Ho importato ${existingImport.rows_imported} transazioni finanziarie dal file ${existingImport.file_name}. 
            Fornisci un'analisi breve (max 150 parole) con insights chiave su: tendenze, anomalie potenziali, suggerimenti.`
          }
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI error:', error);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const aiData = await response.json();
    const summary = aiData.choices[0]?.message?.content || 'Nessuna analisi disponibile';

    // Save AI summary to database
    const { error: updateError } = await supabaseClient
      .from('financial_imports')
      .update({ 
        ai_summary: { 
          summary,
          analyzed_at: new Date().toISOString()
        } 
      })
      .eq('id', importId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ summary, cached: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in analyze-import-ai:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
