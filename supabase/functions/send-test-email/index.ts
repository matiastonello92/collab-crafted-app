import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TestEmailRequest {
  to: string;
  userId: string;
  orgId: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-test-email function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, userId, orgId }: TestEmailRequest = await req.json();

    console.log("Sending test email to:", to);

    const emailResponse = await resend.emails.send({
      from: Deno.env.get("RESEND_FROM") || "Klyra Shifts <noreply@managementpn.services>",
      to: [to],
      subject: "Klyra • Test Email",
      html: `
        <html>
          <body style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <div style="max-width: 600px; margin: 0 auto;">
              <h1 style="color: #2563eb;">✅ Test Email Klyra</h1>
              <p>Questo è un test email dal sistema Klyra.</p>
              <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
              <p><strong>Dettagli:</strong></p>
              <ul style="background: #f9fafb; padding: 15px; border-radius: 5px;">
                <li><strong>Orario invio:</strong> ${new Date().toLocaleString('it-IT')}</li>
                <li><strong>User ID:</strong> ${userId}</li>
                <li><strong>Email destinatario:</strong> ${to}</li>
              </ul>
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                Se hai ricevuto questa email, le impostazioni email sono configurate correttamente.
              </p>
            </div>
          </body>
        </html>
      `,
      replyTo: Deno.env.get("RESEND_REPLY_TO") || undefined,
    });

    console.log("Test email sent successfully:", emailResponse);

    // Log to audit_events
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase.from("audit_events").insert({
      event_key: "settings.updated",
      payload: {
        action: "email_test",
        result: "ok",
        message_id: emailResponse.id,
      },
      org_id: orgId,
      user_id: userId,
    });

    return new Response(
      JSON.stringify({ success: true, messageId: emailResponse.id }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-test-email function:", error);
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
