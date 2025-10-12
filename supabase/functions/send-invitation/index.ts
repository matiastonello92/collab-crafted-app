import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitationEmailRequest {
  to: string;
  firstName: string;
  lastName: string;
  inviteUrl: string;
  roleNames?: string[];
  locationNames?: string[];
  notes?: string;
  expiresAt: string;
  inviterName?: string;
  orgId: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-invitation function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      to,
      firstName,
      lastName,
      inviteUrl,
      roleNames = [],
      locationNames = [],
      notes,
      expiresAt,
      inviterName,
      orgId,
    }: InvitationEmailRequest = await req.json();

    console.log("Sending invitation email to:", to);

    const emailResponse = await resend.emails.send({
      from: Deno.env.get("RESEND_FROM") || "Klyra Shifts <noreply@managementpn.services>",
      to: [to],
      subject: "Klyra • Invito alla piattaforma",
      html: `
        <html>
          <body style="font-family: Arial, sans-serif; padding: 20px; color: #333; line-height: 1.6;">
            <div style="max-width: 600px; margin: 0 auto;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #2563eb; margin-bottom: 10px;">Benvenuto in Klyra!</h1>
                <p style="color: #6b7280; margin: 0;">
                  ${inviterName ? `<strong>${inviterName}</strong> ti ha invitato` : 'Sei stato invitato'} a far parte della piattaforma
                </p>
              </div>
              
              <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="color: #374151; margin-top: 0;">Dettagli dell'invito</h2>
                <p><strong>Nome:</strong> ${firstName} ${lastName}</p>
                <p><strong>Email:</strong> ${to}</p>
                ${roleNames.length > 0 ? `<p><strong>Ruoli assegnati:</strong><br/>${roleNames.join('<br/>')}</p>` : ''}
                ${locationNames.length > 0 ? `<p><strong>Sedi:</strong><br/>${locationNames.join('<br/>')}</p>` : ''}
                ${notes ? `<p><strong>Note:</strong> ${notes}</p>` : ''}
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${inviteUrl}" 
                   style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
                  Accetta l'invito
                </a>
              </div>
              
              <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
                <p style="color: #6b7280; font-size: 14px; margin: 0;">
                  Questo invito scadrà il ${new Date(expiresAt).toLocaleDateString('it-IT')}.<br/>
                  Se non riesci a cliccare il pulsante, copia e incolla questo link: <a href="${inviteUrl}">${inviteUrl}</a>
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
      replyTo: Deno.env.get("RESEND_REPLY_TO") || undefined,
    });

    console.log("Invitation email sent successfully:", emailResponse);

    // Log to email_logs table
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase.from("email_logs").insert({
      org_id: orgId,
      recipient_email: to,
      email_type: "invitation",
      subject: "Klyra • Invito alla piattaforma",
      status: "sent",
      provider_id: emailResponse.id,
      sent_at: new Date().toISOString(),
      metadata: {
        firstName,
        lastName,
        roleNames,
        locationNames,
      },
    });

    return new Response(
      JSON.stringify({ success: true, messageId: emailResponse.id }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-invitation function:", error);

    // Try to log error
    try {
      const { to, orgId } = await req.json();
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      await supabase.from("email_logs").insert({
        org_id: orgId,
        recipient_email: to,
        email_type: "invitation",
        subject: "Klyra • Invito alla piattaforma",
        status: "failed",
        error_message: error.message,
      });
    } catch (logError) {
      console.error("Failed to log error:", logError);
    }

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
