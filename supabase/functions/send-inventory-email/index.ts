import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InventoryEmailRequest {
  headerId: string;
  recipients: string[];
  subject: string;
  message: string;
  orgId: string;
  userId: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-inventory-email function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { headerId, recipients, subject, message, orgId, userId }: InventoryEmailRequest = await req.json();

    console.log("Sending inventory email:", { headerId, recipients });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch inventory header details
    const { data: header, error: headerError } = await supabase
      .from("inventory_headers")
      .select("*, location:locations(name)")
      .eq("id", headerId)
      .single();

    if (headerError || !header) {
      throw new Error("Inventory header not found");
    }

    // Send email to each recipient
    const results = [];
    for (const recipient of recipients) {
      try {
        const emailResponse = await resend.emails.send({
          from: Deno.env.get("RESEND_FROM") || "Klyra Shifts <noreply@managementpn.services>",
          to: [recipient],
          subject: subject || `Klyra • Report Inventario - ${header.location?.name || 'Sede'}`,
          html: `
            <html>
              <body style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <div style="max-width: 600px; margin: 0 auto;">
                  <h1 style="color: #2563eb;">📦 Report Inventario</h1>
                  <p><strong>Sede:</strong> ${header.location?.name || 'N/A'}</p>
                  <p><strong>Categoria:</strong> ${header.category}</p>
                  <p><strong>Data:</strong> ${new Date(header.started_at).toLocaleDateString('it-IT')}</p>
                  <p><strong>Valore totale:</strong> €${header.total_value?.toFixed(2) || '0.00'}</p>
                  <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
                  ${message ? `<p>${message}</p>` : ''}
                  <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                    Questo report è stato generato automaticamente dal sistema Klyra.
                  </p>
                </div>
              </body>
            </html>
          `,
          replyTo: Deno.env.get("RESEND_REPLY_TO") || undefined,
        });

        results.push({ recipient, success: true, messageId: emailResponse.id });
        console.log(`Email sent successfully to ${recipient}:`, emailResponse.id);
      } catch (emailError: any) {
        console.error(`Failed to send email to ${recipient}:`, emailError);
        results.push({ recipient, success: false, error: emailError.message });
      }
    }

    // Log to audit_events
    await supabase.from("audit_events").insert({
      event_key: "inventory.emailed",
      payload: {
        header_id: headerId,
        recipients,
        results,
      },
      org_id: orgId,
      user_id: userId,
    });

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    return new Response(
      JSON.stringify({ 
        success: failedCount === 0, 
        sent: successCount, 
        failed: failedCount,
        results 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-inventory-email function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
