import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ClosureReportRequest {
  closure_id: string;
}

interface ClosureItem {
  payment_method_id: string;
  amount: number;
  notes?: string;
  payment_methods: {
    name: string;
  };
}

interface Closure {
  id: string;
  closure_date: string;
  total_amount: number;
  notes?: string;
  status: string;
  locations: {
    name: string;
    city?: string;
  };
  closure_items: ClosureItem[];
}

serve(async (req) => {
  let closure_id: string | null = null;

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const requestBody = await req.json() as ClosureReportRequest;
    closure_id = requestBody.closure_id;

    if (!closure_id) {
      throw new Error("closure_id is required");
    }

    // Fetch closure with items and payment methods
    const { data: closure, error: closureError } = await supabase
      .from("cash_closures")
      .select(`
        *,
        locations (name, city),
        closure_items (
          payment_method_id,
          amount,
          notes,
          payment_methods (name)
        )
      `)
      .eq("id", closure_id)
      .single();

    if (closureError || !closure) {
      throw new Error(`Failed to fetch closure: ${closureError?.message}`);
    }

    const typedClosure = closure as unknown as Closure;

    // Sprint 2: Fetch email recipients with improved query
    const { data: recipientsData, error: recipientsError } = await supabase
      .from("closure_email_recipients")
      .select("email, location_id")
      .eq("org_id", closure.org_id)
      .eq("is_active", true);

    if (recipientsError) {
      throw new Error(`Failed to fetch recipients: ${recipientsError.message}`);
    }

    // Filter for location-specific and global recipients
    const recipients = recipientsData?.filter(r => 
      r.location_id === closure.location_id || r.location_id === null
    ) || [];

    if (recipients.length === 0) {
      throw new Error("No active email recipients configured");
    }

    // Generate HTML email
    const emailHtml = generateClosureReportHtml(typedClosure);

    // Send email via Resend
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "Klyra Shifts <noreply@managementpn.services>",
      to: recipients.map(r => r.email),
      subject: `Chiusura di Cassa - ${typedClosure.locations.name} - ${new Date(typedClosure.closure_date).toLocaleDateString("it-IT")}`,
      html: emailHtml,
    });

    if (emailError) {
      throw new Error(`Failed to send email: ${emailError.message}`);
    }

    // Update closure status to 'sent'
    await supabase
      .from("cash_closures")
      .update({ status: "sent" })
      .eq("id", closure_id);

    console.log("✅ Closure report sent successfully:", emailData?.id);

    // Sprint 3: Log email in database
    try {
      const recipients_list = recipients.map(r => r.email).join(', ');
      
      await supabase.from('email_logs').insert({
        org_id: closure.org_id,
        user_id: closure.created_by,
        recipient_email: recipients[0].email,
        email_type: 'closure_report',
        subject: `Chiusura di Cassa - ${typedClosure.locations.name} - ${new Date(typedClosure.closure_date).toLocaleDateString("it-IT")}`,
        status: 'sent',
        provider_id: emailData?.id,
        sent_at: new Date().toISOString(),
        metadata: {
          closure_id: closure_id,
          location_id: closure.location_id,
          recipients_count: recipients.length,
          recipients_list,
          total_amount: closure.total_amount,
          closure_date: closure.closure_date
        }
      });
    } catch (logError) {
      console.error('Failed to log email in database:', logError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message_id: emailData?.id,
        recipients_count: recipients.length 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error("❌ Error in send-closure-report:", {
      message: errorMessage,
      stack: errorStack,
      closure_id: closure_id,
    });
    
    // Sprint 3: Log failed email attempt
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
      
      if (closure_id) {
        const { data: closure } = await supabase
        .from("cash_closures")
        .select("org_id, created_by")
          .eq("id", closure_id)
          .single();
        
        if (closure) {
          await supabase.from('email_logs').insert({
          org_id: closure.org_id,
          user_id: closure.created_by,
          recipient_email: 'unknown',
          email_type: 'closure_report',
          subject: `Chiusura di Cassa - Failed`,
          status: 'failed',
          error_message: errorMessage,
          metadata: { closure_id }
        });
        }
      }
    } catch (logErr) {
      console.error('Failed to log error:', logErr);
    }
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

function generateClosureReportHtml(closure: Closure): string {
  const closureDate = new Date(closure.closure_date).toLocaleDateString("it-IT", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const itemsHtml = closure.closure_items
    .map(
      (item) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.payment_methods.name}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">€ ${item.amount.toFixed(2)}</td>
    </tr>
  `
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Chiusura di Cassa</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                Chiusura di Cassa
              </h1>
              <p style="margin: 8px 0 0; color: #e5e7eb; font-size: 16px;">
                ${closure.locations.name}${closure.locations.city ? ` · ${closure.locations.city}` : ""}
              </p>
            </td>
          </tr>
          
          <!-- Date -->
          <tr>
            <td style="padding: 24px 32px 0;">
              <p style="margin: 0; color: #6b7280; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">
                Data chiusura
              </p>
              <p style="margin: 4px 0 0; color: #111827; font-size: 18px; font-weight: 600;">
                ${closureDate}
              </p>
            </td>
          </tr>

          <!-- Items Table -->
          <tr>
            <td style="padding: 24px 32px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
                <thead>
                  <tr style="background-color: #f9fafb;">
                    <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">
                      Metodo di pagamento
                    </th>
                    <th style="padding: 12px; text-align: right; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">
                      Importo
                    </th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
                <tfoot>
                  <tr style="background-color: #f9fafb;">
                    <td style="padding: 16px; font-size: 16px; font-weight: 700; color: #111827;">
                      TOTALE
                    </td>
                    <td style="padding: 16px; text-align: right; font-size: 20px; font-weight: 700; color: #10b981;">
                      € ${closure.total_amount.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </td>
          </tr>

          ${closure.notes ? `
          <!-- Notes -->
          <tr>
            <td style="padding: 0 32px 24px;">
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 4px;">
                <p style="margin: 0; color: #78350f; font-size: 14px; font-weight: 600;">Note:</p>
                <p style="margin: 8px 0 0; color: #92400e; font-size: 14px;">${closure.notes}</p>
              </div>
            </td>
          </tr>
          ` : ""}

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                Report generato automaticamente da Klyra Shifts
              </p>
              <p style="margin: 8px 0 0; color: #9ca3af; font-size: 12px;">
                ${new Date().toLocaleString("it-IT")}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}
