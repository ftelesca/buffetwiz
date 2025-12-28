import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { generateEmail } from '../_shared/email-generator.ts';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { validateRequest } from '../_shared/validation-schemas.ts';

const emailChangeVerifyInputSchema = z.object({
  tokenId: z.string().uuid("Invalid token format"),
  language: z.string().max(10).optional().default('pt-BR'),
  appName: z.string().max(100).optional().default("BuffetWiz"),
  appDesc: z.string().max(500).optional().default("Gestao de buffet"),
  appLogoUrl: z.string().url().max(2048).optional(),
  appUrl: z.string().trim().url("Invalid URL format").max(2048),
  appDomain: z.string().trim().min(1).max(255),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const rawBody = await req.json();
    const validation = validateRequest(emailChangeVerifyInputSchema, rawBody, corsHeaders);
    if (!validation.success) return validation.response;

    const { tokenId, language, appName, appDesc, appLogoUrl, appUrl, appDomain } = validation.data;

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(JSON.stringify({ success: false, error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: tokenRecord, error: fetchError } = await supabaseAdmin
      .from("email_change_tokens")
      .select("*")
      .eq("id", tokenId)
      .eq("status", "authorized")
      .single();

    if (fetchError || !tokenRecord) {
      throw new Error("Invalid or expired token");
    }

    if (new Date(tokenRecord.expires_at) < new Date()) {
      throw new Error("Token has expired");
    }

    const { old_email, new_email, user_id } = tokenRecord;

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", user_id)
      .single();

    const siteUrl = appUrl;
    const verificationUrl = `${siteUrl}/auth/callback?type=email_change_verify&token=${tokenId}`;
    const displayName = profile?.full_name || new_email.split("@")[0];

    const emailContent = generateEmail({
      language: language || 'en',
      functionName: 'email-change-verify',
      variables: {
        userName: displayName,
        oldEmail: old_email,
        newEmail: new_email,
        verificationUrl,
      },
      appName: appName || 'BuffetWiz',
      appDesc: appDesc || 'Gestao de buffet',
      appLogoUrl: appLogoUrl || '',
      appUrl,
    });

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${appName} <notifications@${appDomain}>`,
        to: [new_email],
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      throw new Error(`Failed to send verification email: ${emailResponse.status} - ${errorData}`);
    }

    const result = await emailResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        message: "Verification email sent to new email address",
        emailId: result.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to send verification email";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
};

serve(handler);
