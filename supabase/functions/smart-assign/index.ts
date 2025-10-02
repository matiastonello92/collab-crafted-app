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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { shift_id } = await req.json();

    if (!shift_id) {
      return new Response(JSON.stringify({ error: 'shift_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch shift details
    const { data: shift, error: shiftError } = await supabase
      .from('shifts')
      .select('*, job_tags(key, label_it), locations(timezone)')
      .eq('id', shift_id)
      .single();

    if (shiftError || !shift) {
      return new Response(JSON.stringify({ error: 'Shift not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get all users in the org with their job tags and recent shifts
    const { data: users } = await supabase
      .from('profiles')
      .select(`
        id, full_name, email,
        user_job_tags(job_tags(key, label_it)),
        user_roles_locations!inner(location_id, is_active)
      `)
      .eq('org_id', shift.org_id)
      .eq('user_roles_locations.location_id', shift.location_id)
      .eq('user_roles_locations.is_active', true);

    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ candidates: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get availability for the shift day
    const shiftDate = new Date(shift.start_at);
    const weekday = shiftDate.getDay();
    
    const { data: availabilities } = await supabase
      .from('availability')
      .select('user_id, preference, time_range')
      .eq('org_id', shift.org_id)
      .eq('weekday', weekday);

    // Get recent shifts for each user (last 7 days)
    const sevenDaysAgo = new Date(shiftDate);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data: recentAssignments } = await supabase
      .from('shift_assignments')
      .select('user_id, shifts(start_at, end_at, break_minutes)')
      .gte('shifts.start_at', sevenDaysAgo.toISOString())
      .eq('status', 'assigned');

    // Calculate hours worked per user
    const hoursWorked: Record<string, number> = {};
    if (recentAssignments) {
      recentAssignments.forEach(sa => {
        if (sa.shifts && sa.shifts.start_at && sa.shifts.end_at) {
          const start = new Date(sa.shifts.start_at);
          const end = new Date(sa.shifts.end_at);
          const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
          const netHours = hours - ((sa.shifts.break_minutes || 0) / 60);
          hoursWorked[sa.user_id] = (hoursWorked[sa.user_id] || 0) + netHours;
        }
      });
    }

    // Build context for AI
    const candidates = users.map(user => {
      const userJobTags = user.user_job_tags?.map((ujt: any) => ujt.job_tags?.key) || [];
      const hasRequiredTag = shift.job_tag_id ? userJobTags.includes(shift.job_tags?.key) : true;
      
      const userAvailability = availabilities?.find(a => a.user_id === user.id);
      const availabilityScore = userAvailability 
        ? (userAvailability.preference === 'preferred' ? 100 : userAvailability.preference === 'ok' ? 70 : 30)
        : 50;

      const recentHours = hoursWorked[user.id] || 0;
      const workloadScore = Math.max(0, 100 - (recentHours * 5)); // Penalize heavy workload

      return {
        user_id: user.id,
        name: user.full_name || user.email,
        has_required_tag: hasRequiredTag,
        job_tags: userJobTags,
        availability_preference: userAvailability?.preference || 'unknown',
        availability_score: availabilityScore,
        recent_hours: Math.round(recentHours * 10) / 10,
        workload_score: Math.round(workloadScore),
      };
    });

    // Use Lovable AI to score candidates
    const prompt = `Sei un assistente HR che assegna turni. Analizza questi candidati per il turno:

Turno: ${new Date(shift.start_at).toLocaleString('it-IT')} - ${new Date(shift.end_at).toLocaleString('it-IT')}
Ruolo richiesto: ${shift.job_tags?.label_it || 'Nessuno'}
Pausa: ${shift.break_minutes} minuti

Candidati:
${JSON.stringify(candidates, null, 2)}

Per ogni candidato, assegna uno score 0-100 considerando:
- Competenza (has_required_tag): peso 40%
- Disponibilità (availability_score): peso 30%
- Bilanciamento carico (workload_score): peso 30%

Rispondi SOLO con un array JSON di oggetti con: user_id, score, reason (breve motivazione in italiano).`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are an HR scheduling assistant. Respond only with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      console.error('AI error:', await aiResponse.text());
      // Fallback: simple scoring
      const fallbackResults = candidates
        .map(c => ({
          user_id: c.user_id,
          name: c.name,
          score: Math.round((c.has_required_tag ? 40 : 0) + (c.availability_score * 0.3) + (c.workload_score * 0.3)),
          reason: `Competenza: ${c.has_required_tag ? '✓' : '✗'}, Disponibilità: ${c.availability_preference}, Ore recenti: ${c.recent_hours}h`,
          details: c
        }))
        .sort((a, b) => b.score - a.score);

      return new Response(JSON.stringify({ candidates: fallbackResults }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const aiData = await aiResponse.json();
    const aiScores = JSON.parse(aiData.choices[0].message.content);

    // Merge AI scores with candidate details
    const results = aiScores.map((ai: any) => {
      const candidate = candidates.find(c => c.user_id === ai.user_id);
      return {
        user_id: ai.user_id,
        name: candidate?.name || 'Unknown',
        score: ai.score,
        reason: ai.reason,
        details: candidate
      };
    }).sort((a: any, b: any) => b.score - a.score);

    return new Response(JSON.stringify({ candidates: results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Smart assign error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
