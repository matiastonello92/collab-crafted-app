import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { closures, stats } = await req.json();
    const openAIKey = Deno.env.get('OPENAI_API_KEY');

    if (!openAIKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const dataContext = `
Analizza questi dati finanziari di una location:

STATISTICHE GENERALI:
- Totale incassato (30gg): €${stats.total.toFixed(2)}
- Media giornaliera: €${stats.average.toFixed(2)}
- Numero chiusure: ${stats.count}
- Trend settimanale: ${stats.trend.toFixed(1)}%

DATI GIORNALIERI:
${closures.map((c: any) => `${c.date}: €${c.amount.toFixed(2)}`).join('\n')}

Fornisci un'analisi concisa (max 200 parole) che includa:
1. Valutazione del trend
2. Giorni anomali (picchi o cali significativi)
3. Raccomandazioni operative concrete
4. Previsioni a breve termine

Rispondi in italiano, in modo professionale ma accessibile.
    `;

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
            content: 'Sei un consulente finanziario esperto che analizza dati di vendita retail/hospitality.' 
          },
          { role: 'user', content: dataContext }
        ],
        max_tokens: 400,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      throw new Error('Failed to generate AI insights');
    }

    const data = await response.json();
    const insights = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ insights }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in analyze-financial-data:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
