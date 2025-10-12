import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationEmailRequest {
  to: string | string[];
  subject: string;
  html: string;
  emailType: string;
  userId?: string;
  orgId: string;
  metadata?: Record<string, any>;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-notification-email function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, html, emailType, userId, orgId, metadata }: NotificationEmailRequest = await req.json();

    console.log("Sending notification email:", { to, emailType, userId, orgId });

    // Initialize Supabase admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check user preferences if userId provided
    if (userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email_preferences")
        .eq("id", userId)
        .single();

      const prefs = (profile?.email_preferences as Record<string, boolean>) || {};
      if (prefs[emailType] === false) {
        console.log(`User ${userId} has opted out of ${emailType}`);
        
        // Log as skipped
        await supabase.from("email_logs").insert({
          org_id: orgId,
          user_id: userId,
          recipient_email: Array.isArray(to) ? to[0] : to,
          email_type: emailType,
          subject,
          status: "pending",
          error_message: "User opted out",
          metadata: metadata || {},
        });

        return new Response(
          JSON.stringify({ success: false, reason: "User opted out" }),
          {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
    }

    // Send email
    const emailResponse = await resend.emails.send({
      from: Deno.env.get("RESEND_FROM") || "Klyra Shifts <noreply@managementpn.services>",
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      replyTo: Deno.env.get("RESEND_REPLY_TO") || undefined,
    });

    console.log("Email sent successfully:", emailResponse);

    // Log to email_logs table
    await supabase.from("email_logs").insert({
      org_id: orgId,
      user_id: userId,
      recipient_email: Array.isArray(to) ? to[0] : to,
      email_type: emailType,
      subject,
      status: "sent",
      provider_id: emailResponse.id,
      sent_at: new Date().toISOString(),
      metadata: metadata || {},
    });

    return new Response(
      JSON.stringify({ success: true, messageId: emailResponse.id }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-notification-email function:", error);

    // Try to log error to database
    try {
      const { orgId, userId, to, subject, emailType, metadata } = await req.json();
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      await supabase.from("email_logs").insert({
        org_id: orgId,
        user_id: userId,
        recipient_email: Array.isArray(to) ? to[0] : to,
        email_type: emailType,
        subject,
        status: "failed",
        error_message: error.message,
        metadata: metadata || {},
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
