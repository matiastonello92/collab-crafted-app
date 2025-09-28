import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

// Temporary placeholder - Resend integration disabled for build
const resend = {
  emails: {
    send: async (data: any) => {
      console.log('Mock email send:', data);
      return { id: 'mock-email-id', success: true };
    }
  }
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitationEmailRequest {
  to: string;
  name: string;
  inviteUrl: string;
  inviterName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-invitation function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, name, inviteUrl, inviterName }: InvitationEmailRequest = await req.json();

    console.log("Sending invitation email to:", to);

    const emailResponse = await resend.emails.send({
      from: "Pecora App <invites@resend.dev>",
      to: [to],
      subject: "Invito a Pecora App",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Invito a Pecora App</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8f9fa; padding: 30px 20px; border-radius: 0 0 8px 8px; }
            .cta-button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; font-size: 14px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🐑 Pecora App</h1>
            <p>Sei stato invitato a far parte del team!</p>
          </div>
          
          <div class="content">
            <h2>Ciao ${name}!</h2>
            
            <p>${inviterName ? `<strong>${inviterName}</strong> ti ha invitato` : 'Sei stato invitato'} a unirti a <strong>Pecora App</strong>, la piattaforma di gestione per il nostro team.</p>
            
            <p>Per completare la registrazione e accedere alla piattaforma, clicca sul pulsante qui sotto:</p>
            
            <div style="text-align: center;">
              <a href="${inviteUrl}" class="cta-button">Accetta Invito</a>
            </div>
            
            <p><strong>Nota:</strong> Questo invito scadrà tra 7 giorni. Se hai bisogno di assistenza, contatta il tuo amministratore.</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
            
            <p style="font-size: 14px; color: #666;">
              Se il pulsante non funziona, copia e incolla questo link nel tuo browser:<br>
              <a href="${inviteUrl}" style="color: #667eea; word-break: break-all;">${inviteUrl}</a>
            </p>
          </div>
          
          <div class="footer">
            <p>Pecora App - Gestione Semplificata</p>
            <p style="font-size: 12px;">Se non hai richiesto questo invito, puoi ignorare questa email.</p>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-invitation function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);