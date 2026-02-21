import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { generateEmail } from '../_shared/email-generator.ts';
import { checkRateLimit, getClientIP, rateLimitExceededResponse } from '../_shared/rate-limiter.ts';
import { emailResetPwdSchema, validateRequest } from '../_shared/validation-schemas.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const normalizeDomain = (value?: string): string => {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const hasProtocol = /^https?:\/\//i.test(trimmed);
    const url = new URL(hasProtocol ? trimmed : `https://${trimmed}`);
    return url.hostname.toLowerCase();
  } catch {
    return trimmed
      .replace(/^https?:\/\//i, "")
      .split("/")[0]
      .split(":")[0]
      .toLowerCase();
  }
};

const successResponse = (corsHeaders: Record<string, string>) =>
  new Response(
    JSON.stringify({
      success: true,
      message: "If the email is registered, a reset link will be sent",
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );

const isUserNotFoundError = (message?: string) => {
  const normalized = (message || "").toLowerCase();
  return (
    normalized.includes("user not found") ||
    normalized.includes("no user found") ||
    normalized.includes("email not found")
  );
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

  const clientIP = getClientIP(req);
  const rateLimitResult = await checkRateLimit(clientIP, 'email-resetpwd');
  if (!rateLimitResult.allowed) {
    return rateLimitExceededResponse(rateLimitResult.resetAt, corsHeaders);
  }

  try {
    const rawBody = await req.json();
    const validation = validateRequest(emailResetPwdSchema, rawBody, corsHeaders);
    if (!validation.success) return validation.response;

    const { email, language, appName, appDesc, appLogoUrl, appUrl, appDomain } = validation.data;
    const normalizedEmail = email.trim().toLowerCase();

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

    const { data: tokenData, error: tokenError } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: normalizedEmail,
    });

    if (tokenError || !tokenData) {
      if (isUserNotFoundError(tokenError?.message)) {
        return successResponse(corsHeaders);
      }
      throw new Error(tokenError?.message || "Failed to generate reset link");
    }

    const properties = tokenData.properties as unknown as Record<string, string | undefined>;
    let tokenHash = properties?.hashed_token;

    if (!tokenHash && properties?.action_link) {
      const actionUrl = new URL(properties.action_link);
      tokenHash = actionUrl.searchParams.get("token_hash") || actionUrl.searchParams.get("token") || undefined;
    }

    if (!tokenHash) {
      throw new Error("Failed to extract reset token");
    }

    const resetUrl = `${appUrl}/auth/callback?type=recovery&token_hash=${encodeURIComponent(tokenHash)}`;
    const displayName = normalizedEmail.split("@")[0];
    const secretFromDomain =
      normalizeDomain(Deno.env.get("RESEND_FROM_DOMAIN")) ||
      normalizeDomain(Deno.env.get("YALT_RESEND_DOMAIN")) ||
      normalizeDomain(Deno.env.get("BUFFETWIZ_RESEND_DOMAIN"));
    const fromDomain = normalizeDomain(appDomain) || secretFromDomain || normalizeDomain(new URL(appUrl).hostname);
    if (!fromDomain) {
      throw new Error("Email sender domain is not configured");
    }

    const emailContent = generateEmail({
      language: language || 'en',
      functionName: 'email-resetpwd',
      variables: {
        userName: displayName,
        resetUrl,
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
        from: `${appName} <notifications@${fromDomain}>`,
        to: [normalizedEmail],
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      throw new Error(`Failed to send reset email: ${emailResponse.status} - ${errorData}`);
    }

    const result = await emailResponse.json();

    return new Response(
      JSON.stringify({ success: true, message: "Reset password email sent successfully", emailId: result.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to send reset password email";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
};

serve(handler);
