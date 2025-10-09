import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { headers, sampleRows } = await req.json();

    console.log('📊 Analyzing CSV with headers:', headers);
    console.log('📊 Sample rows:', sampleRows);

    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Target fields for financial imports - expanded for full sales data
    const targetFields = [
      { value: 'record_date', label: 'Data del record (YYYY-MM-DD o timestamp)', required: true },
      { value: 'datetime_from', label: 'Data/ora inizio periodo', required: false },
      { value: 'datetime_to', label: 'Data/ora fine periodo', required: false },
      { value: 'interval_title', label: 'Titolo intervallo (es: "day 1")', required: false },
      { value: 'net_sales_amount', label: 'Vendite nette', required: false },
      { value: 'gross_sales_amount', label: 'Vendite lorde', required: false },
      { value: 'total_amount', label: 'Totale importo', required: true },
      { value: 'covers', label: 'Coperti/Covers', required: false },
      { value: 'orders', label: 'Numero ordini', required: false },
      { value: 'taxes_amount', label: 'Tasse', required: false },
      { value: 'refunds_amount', label: 'Rimborsi', required: false },
      { value: 'voids_amount', label: 'Annullamenti', required: false },
      { value: 'discounts_amount', label: 'Sconti', required: false },
      { value: 'complimentary_amount', label: 'Omaggi', required: false },
      { value: 'losses_amount', label: 'Perdite', required: false },
      { value: 'tips_amount', label: 'Mance', required: false },
      { value: 'service_charges', label: 'Costi di servizio', required: false },
      { value: '_ignore', label: 'Ignora questa colonna', required: false }
    ];

    const prompt = `You are a CSV column mapping assistant for a restaurant financial system.

Analyze these CSV column headers and sample data rows, then suggest the BEST mapping to our target fields.

CSV Headers: ${JSON.stringify(headers)}
Sample Data: ${JSON.stringify(sampleRows)}

Target Fields Available:
${targetFields.map(f => `- ${f.value}: ${f.label}${f.required ? ' (REQUIRED)' : ''}`).join('\n')}

CRITICAL RULES:
1. You MUST map at least: record_date, total_amount
2. Map columns based on their CONTENT, not just names (check sample data!)
3. Detect language (English, Italian, Spanish, French, etc.)
4. If multiple columns could be "date", prefer the one with daily dates (not location_id!)
5. Use "_ignore" for columns that don't fit any target field (like location_id, location_name)
6. BE SMART: "covers" = coperti, "orders" = ordini/commande, "net_sales" = vendite nette, etc.

Return a COMPLETE mapping object where EVERY CSV header is mapped to a target field.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a helpful CSV mapping assistant. Always return valid JSON with the complete mapping.' },
          { role: 'user', content: prompt }
        ],
        functions: [{
          name: 'suggest_csv_mapping',
          description: 'Suggest mapping from CSV columns to target fields',
          parameters: {
            type: 'object',
            properties: {
              mapping: {
                type: 'object',
                description: 'Object where keys are CSV headers and values are target field names. MUST include ALL CSV headers.',
                additionalProperties: {
                  type: 'string',
                  enum: targetFields.map(f => f.value)
                }
              },
              confidence: {
                type: 'number',
                description: 'Confidence score from 0 to 1'
              },
              warnings: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of warning messages for the user'
              }
            },
            required: ['mapping', 'confidence', 'warnings']
          }
        }],
        function_call: { name: 'suggest_csv_mapping' }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ OpenAI response:', JSON.stringify(data, null, 2));

    const functionCall = data.choices?.[0]?.message?.function_call;
    if (!functionCall || !functionCall.arguments) {
      throw new Error('No function call in OpenAI response');
    }

    const result = JSON.parse(functionCall.arguments);

    // Validation: ensure required fields are mapped
    const hasDate = Object.values(result.mapping).includes('record_date');
    const hasAmount = Object.values(result.mapping).includes('total_amount');

    if (!hasDate || !hasAmount) {
      result.warnings = result.warnings || [];
      if (!hasDate) result.warnings.push('⚠️ Nessuna colonna mappata come "record_date" - RICHIESTO');
      if (!hasAmount) result.warnings.push('⚠️ Nessuna colonna mappata come "total_amount" - RICHIESTO');
    }

    console.log('✅ Final mapping:', result);

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in analyze-csv-columns:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
