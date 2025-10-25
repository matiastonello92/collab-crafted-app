import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RecurringTemplate {
  id: string;
  org_id: string;
  location_id: string;
  name: string;
  description: string;
  task_type: string;
  checklist_items: any;
  recurrence_type: string;
  recurrence_interval: number;
  execution_window_minutes: number;
  priority: string;
  requires_signature: boolean;
  requires_photo: boolean;
  equipment_id: string | null;
  area: string | null;
  assigned_role: string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔄 HACCP Scheduler: Starting task generation...');

    const now = new Date();
    const hourStart = new Date(now);
    hourStart.setMinutes(0, 0, 0);
    const hourEnd = new Date(hourStart);
    hourEnd.setHours(hourEnd.getHours() + 1);

    // Fetch active templates
    const { data: templates, error: templatesError } = await supabase
      .from('haccp_templates')
      .select('*')
      .eq('active', true)
      .not('recurrence_type', 'is', null);

    if (templatesError) {
      console.error('Error fetching templates:', templatesError);
      throw templatesError;
    }

    console.log(`📋 Found ${templates?.length || 0} active recurring templates`);

    let tasksCreated = 0;
    const errors: string[] = [];

    for (const template of templates || []) {
      try {
        const shouldCreateTask = await checkShouldCreateTask(
          supabase,
          template,
          now
        );

        if (shouldCreateTask) {
          const dueAt = calculateDueTime(template, now);
          
          // Check if task already exists for this time slot
          const { data: existingTask } = await supabase
            .from('haccp_tasks')
            .select('id')
            .eq('template_id', template.id)
            .eq('due_at', dueAt.toISOString())
            .single();

          if (!existingTask) {
            const { error: insertError } = await supabase
              .from('haccp_tasks')
              .insert({
                org_id: template.org_id,
                location_id: template.location_id,
                template_id: template.id,
                name: template.name,
                description: template.description,
                task_type: template.task_type,
                checklist_items: template.checklist_items,
                due_at: dueAt.toISOString(),
                execution_window_minutes: template.execution_window_minutes,
                priority: template.priority,
                equipment_id: template.equipment_id,
                area: template.area,
                status: 'pending'
              });

            if (insertError) {
              console.error(`Error creating task for template ${template.id}:`, insertError);
              errors.push(`Template ${template.name}: ${insertError.message}`);
            } else {
              tasksCreated++;
              console.log(`✅ Created task: ${template.name} (due: ${dueAt.toISOString()})`);
            }
          } else {
            console.log(`⏭️  Task already exists for ${template.name} at ${dueAt.toISOString()}`);
          }
        }
      } catch (err) {
        console.error(`Error processing template ${template.id}:`, err);
        errors.push(`Template ${template.name}: ${err.message}`);
      }
    }

    // Update overdue tasks status
    const { error: updateError } = await supabase
      .from('haccp_tasks')
      .update({ status: 'overdue' })
      .eq('status', 'pending')
      .lt('due_at', now.toISOString());

    if (updateError) {
      console.error('Error updating overdue tasks:', updateError);
    }

    console.log(`✅ Scheduler completed: ${tasksCreated} tasks created`);

    return new Response(
      JSON.stringify({
        success: true,
        tasksCreated,
        errors: errors.length > 0 ? errors : undefined,
        timestamp: now.toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Scheduler error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

function checkShouldCreateTask(
  supabase: any,
  template: RecurringTemplate,
  now: Date
): boolean {
  const hour = now.getHours();
  const dayOfWeek = now.getDay();
  const dayOfMonth = now.getDate();

  switch (template.recurrence_type) {
    case 'hourly':
      // Create task every N hours
      return hour % (template.recurrence_interval || 1) === 0;
    
    case 'daily':
      // Create task once per day at specific hour (default: 6 AM)
      return hour === 6;
    
    case 'weekly':
      // Create task once per week on Monday at 6 AM
      return dayOfWeek === 1 && hour === 6;
    
    case 'monthly':
      // Create task on first day of month at 6 AM
      return dayOfMonth === 1 && hour === 6;
    
    default:
      return false;
  }
}

function calculateDueTime(template: RecurringTemplate, baseTime: Date): Date {
  const dueTime = new Date(baseTime);
  
  switch (template.recurrence_type) {
    case 'hourly':
      // Due at the start of the hour
      dueTime.setMinutes(0, 0, 0);
      break;
    
    case 'daily':
      // Due at 12:00 PM same day
      dueTime.setHours(12, 0, 0, 0);
      break;
    
    case 'weekly':
      // Due at end of week (Sunday)
      const daysUntilSunday = (7 - dueTime.getDay()) % 7;
      dueTime.setDate(dueTime.getDate() + daysUntilSunday);
      dueTime.setHours(23, 59, 0, 0);
      break;
    
    case 'monthly':
      // Due at end of month
      dueTime.setMonth(dueTime.getMonth() + 1, 0);
      dueTime.setHours(23, 59, 0, 0);
      break;
  }
  
  return dueTime;
}
