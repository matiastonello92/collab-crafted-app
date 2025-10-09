import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { headers, sampleRows } = await req.json();

    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    console.log('📊 Analyzing CSV columns:', headers);
    console.log('📝 Sample data (first 3 rows):', sampleRows);

    const prompt = `Analizza queste colonne CSV e suggerisci il mapping ai campi target.

COLONNE CSV RICEVUTE:
${headers.join(', ')}

DATI DI ESEMPIO (prime 3 righe):
${sampleRows.map((row: string[]) => row.join(' | ')).join('\n')}

CAMPI TARGET disponibili:
- "data" (data/timestamp - formati: YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY, ISO8601)
- "importo" (numero decimale - es: 125.50, 1.250,00, $125.50)
- "metodo_pagamento" (testo - es: Contanti, Cash, POS, Card, Bonifico, Transfer)
- "note" (testo opzionale - qualsiasi altra informazione)

REGOLE:
1. Mappa ogni colonna CSV a UNO dei campi target
2. Se una colonna non corrisponde a nessun campo, mappala a "_ignore"
3. Almeno "data" e "importo" devono essere mappati
4. Rileva la lingua delle colonne (italiano, inglese, spagnolo, francese, ecc.)
5. Fornisci un confidence score (0.0-1.0) basato su quanto sei sicuro del mapping
6. Aggiungi warnings se rilevi problemi (es: formato data ambiguo, valuta diversa, ecc.)

Rispondi SEMPRE con la funzione suggest_csv_mapping.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'Sei un esperto di analisi dati CSV. Il tuo compito è mappare colonne CSV a campi predefiniti in modo intelligente, rilevando la lingua e il formato dei dati.' 
          },
          { role: 'user', content: prompt }
        ],
        tools: [{
          type: "function",
          function: {
            name: "suggest_csv_mapping",
            description: "Suggerisci il mapping delle colonne CSV ai campi target",
            parameters: {
              type: "object",
              properties: {
                mapping: {
                  type: "object",
                  description: "Mappa ogni colonna CSV al campo target corrispondente",
                  additionalProperties: { 
                    type: "string",
                    enum: ["data", "importo", "metodo_pagamento", "note", "_ignore"]
                  }
                },
                confidence: { 
                  type: "number",
                  description: "Livello di confidenza del mapping (0.0-1.0)",
                  minimum: 0,
                  maximum: 1
                },
                warnings: { 
                  type: "array",
                  description: "Lista di warning su possibili problemi rilevati",
                  items: { type: "string" }
                }
              },
              required: ["mapping", "confidence"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { 
          type: "function", 
          function: { name: "suggest_csv_mapping" } 
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ OpenAI response:', JSON.stringify(data, null, 2));

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call in OpenAI response');
    }

    const result = JSON.parse(toolCall.function.arguments);
    
    // Validate that at least 'data' and 'importo' are mapped
    const mappedFields = Object.values(result.mapping);
    if (!mappedFields.includes('data') || !mappedFields.includes('importo')) {
      result.warnings = result.warnings || [];
      result.warnings.push('⚠️ Mapping incompleto: servono almeno "data" e "importo"');
      result.confidence = Math.min(result.confidence, 0.5);
    }

    console.log('🎯 Final mapping result:', result);

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Error in analyze-csv-columns:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        mapping: {},
        confidence: 0,
        warnings: [`Errore durante l'analisi: ${error.message}`]
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
