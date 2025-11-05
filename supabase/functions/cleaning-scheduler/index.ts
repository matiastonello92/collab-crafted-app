import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CleaningArea {
  id: string;
  org_id: string;
  location_id: string;
  name: string;
  cleaning_frequency: 'daily' | 'weekly' | 'monthly';
  frequency_times: Array<{ day?: string; times?: string[] }>;
  is_active: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🧹 Starting cleaning scheduler...');

    // Fetch all active cleaning areas
    const { data: areas, error: areasError } = await supabase
      .from('haccp_cleaning_areas')
      .select('*')
      .eq('is_active', true);

    if (areasError) {
      console.error('Error fetching cleaning areas:', areasError);
      throw areasError;
    }

    if (!areas || areas.length === 0) {
      console.log('No active cleaning areas found');
      return new Response(
        JSON.stringify({ success: true, message: 'No areas to schedule', scheduled: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${areas.length} active cleaning areas`);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    let scheduledCount = 0;

    for (const area of areas as CleaningArea[]) {
      console.log(`Processing area: ${area.name} (${area.cleaning_frequency})`);

      const scheduledDates: Date[] = [];

      // Generate scheduled dates based on frequency
      if (area.cleaning_frequency === 'daily') {
        // Schedule for today and tomorrow
        scheduledDates.push(new Date(today), new Date(tomorrow));
      } else if (area.cleaning_frequency === 'weekly') {
        // Schedule for next 7 days
        for (let i = 0; i < 7; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() + i);
          scheduledDates.push(date);
        }
      } else if (area.cleaning_frequency === 'monthly') {
        // Schedule for today only
        scheduledDates.push(new Date(today));
      }

      // For each scheduled date, check if completion already exists
      for (const scheduledDate of scheduledDates) {
        const scheduledFor = scheduledDate.toISOString();

        // Check if already exists
        const { data: existing } = await supabase
          .from('haccp_cleaning_completions')
          .select('id')
          .eq('area_id', area.id)
          .gte('scheduled_for', scheduledFor)
          .lt('scheduled_for', new Date(scheduledDate.getTime() + 24 * 60 * 60 * 1000).toISOString())
          .limit(1);

        if (existing && existing.length > 0) {
          console.log(`  ⏭️  Skipping ${scheduledFor} - already exists`);
          continue;
        }

        // Create new completion
        const { error: insertError } = await supabase
          .from('haccp_cleaning_completions')
          .insert({
            area_id: area.id,
            org_id: area.org_id,
            location_id: area.location_id,
            scheduled_for: scheduledFor,
            status: 'pending',
          });

        if (insertError) {
          console.error(`  ❌ Error scheduling for ${scheduledFor}:`, insertError);
        } else {
          console.log(`  ✅ Scheduled for ${scheduledFor}`);
          scheduledCount++;
        }
      }
    }

    // Update overdue completions
    const { data: overdueUpdated } = await supabase.rpc('update_overdue_cleaning_completions');
    console.log(`Updated ${overdueUpdated || 0} overdue completions`);

    console.log(`✅ Cleaning scheduler completed: ${scheduledCount} completions scheduled`);

    return new Response(
      JSON.stringify({
        success: true,
        scheduled: scheduledCount,
        areas_processed: areas.length,
        overdue_updated: overdueUpdated || 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Cleaning scheduler error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
