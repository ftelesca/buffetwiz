import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { generateEmail } from '../_shared/email-generator.ts';
import { emailChangeSchema, validateRequest } from '../_shared/validation-schemas.ts';

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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized - No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized - Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawBody = await req.json();
    const validation = validateRequest(emailChangeSchema, rawBody, corsHeaders);
    if (!validation.success) return validation.response;

    const {
      newEmail,
      fullName,
      language,
      appName,
      appDesc,
      appLogoUrl,
      appUrl,
      appDomain,
    } = validation.data;

    const userId = user.id;
    const currentEmail = user.email;
    if (!currentEmail) {
      throw new Error("User email not found");
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(JSON.stringify({ success: false, error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    if (currentEmail.toLowerCase() === newEmail.toLowerCase()) {
      return new Response(JSON.stringify({ success: false, error: "New email is the same as current email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabaseAdmin
      .from("email_change_tokens")
      .delete()
      .eq("user_id", userId)
      .in("status", ["pending_authorization", "authorized"]);

    const { data: tokenRecord, error: tokenError } = await supabaseAdmin
      .from("email_change_tokens")
      .insert({
        user_id: userId,
        old_email: currentEmail,
        new_email: newEmail,
        status: "pending_authorization",
      })
      .select()
      .single();

    if (tokenError || !tokenRecord) {
      throw new Error("Failed to create email change token");
    }

    const siteUrl = appUrl;
    const authorizationUrl = `${siteUrl}/auth/callback?type=email_change_auth&token=${tokenRecord.token}`;
    const displayName = fullName || currentEmail.split("@")[0];

    const emailContent = generateEmail({
      language: language || 'en',
      functionName: 'email-change',
      variables: {
        userName: displayName,
        oldEmail: currentEmail,
        newEmail,
        authorizationUrl,
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
        to: [currentEmail],
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      throw new Error(`Failed to send authorization email: ${emailResponse.status} - ${errorData}`);
    }

    const result = await emailResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        message: "Authorization email sent to your current email address",
        emailId: result.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to initiate email change";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
};

serve(handler);
