import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { generateEmail } from '../_shared/email-generator.ts';
import { checkRateLimit, getClientIP, rateLimitExceededResponse } from '../_shared/rate-limiter.ts';
import { emailValidationSchema, validateRequest } from '../_shared/validation-schemas.ts';

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

  const clientIP = getClientIP(req);
  const rateLimitResult = await checkRateLimit(clientIP, 'email-validation');
  if (!rateLimitResult.allowed) {
    return rateLimitExceededResponse(rateLimitResult.resetAt, corsHeaders);
  }

  try {
    const rawBody = await req.json();
    const validation = validateRequest(emailValidationSchema, rawBody, corsHeaders);
    if (!validation.success) return validation.response;

    const {
      email,
      password,
      fullName,
      userId,
      isResend,
      language,
      appName,
      appDesc,
      appLogoUrl,
      appUrl,
      appDomain,
    } = validation.data;

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

    const normalizeLanguage = (lang: string): string => {
      const langLower = lang.toLowerCase();
      if (langLower === 'pt' || langLower === 'pt-br') return 'pt-BR';
      if (langLower === 'es') return 'es';
      return 'en';
    };
    const normalizedLanguage = normalizeLanguage(language || 'en');

    if (!isResend) {
      const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password: password!,
        email_confirm: false,
        user_metadata: {
          full_name: fullName || normalizedEmail.split("@")[0],
          preferred_language: normalizedLanguage,
          email: normalizedEmail,
        },
      });

      if (createError) {
        throw new Error(`Failed to create user: ${createError.message}`);
      }

      if (userData?.user) {
        await supabaseAdmin.from('profiles').upsert({
          id: userData.user.id,
          email: normalizedEmail,
          full_name: fullName || normalizedEmail.split("@")[0],
          preferred_language: normalizedLanguage,
        }, { onConflict: 'id' });

        const { data: existingRoles } = await supabaseAdmin
          .from('user_roles')
          .select('id')
          .limit(1);

        const role = (!existingRoles || existingRoles.length === 0) ? 'admin' : 'user';

        await supabaseAdmin.from('user_roles').upsert({
          user_id: userData.user.id,
          role,
        }, { onConflict: 'user_id' });
      }
    }

    let displayFullName = fullName;
    if (isResend) {
      let foundName = null;
      let foundUserId = userId;

      const { data: userData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      if (userData?.users) {
        const existingUser = userData.users.find((u) => u.email?.toLowerCase() === normalizedEmail);
        if (existingUser) {
          foundUserId = existingUser.id;
          foundName = existingUser.user_metadata?.full_name || existingUser.user_metadata?.name;
        }
      }

      if (!foundName && foundUserId) {
        const { data: profileData } = await supabaseAdmin
          .from('profiles')
          .select('full_name')
          .eq('id', foundUserId)
          .maybeSingle();
        if (profileData?.full_name) {
          foundName = profileData.full_name;
        }
      }

      displayFullName = foundName || fullName || normalizedEmail.split("@")[0];
    }

    const { data: tokenData, error: tokenError } = await supabaseAdmin.auth.admin.generateLink({
      type: "signup",
      email: normalizedEmail,
      password: crypto.randomUUID(),
    });

    if (tokenError || !tokenData) {
      throw new Error("Failed to generate verification link");
    }

    const actionLink = tokenData.properties.action_link;
    const actionUrl = new URL(actionLink);
    const tokenHash = actionUrl.searchParams.get('token');

    if (!tokenHash) {
      throw new Error("Failed to extract verification token");
    }

    const verificationUrl = `${appUrl}/auth/callback?type=signup&token_hash=${tokenHash}`;
    const displayName = displayFullName || normalizedEmail.split("@")[0];

    const emailContent = generateEmail({
      language: language || 'en',
      functionName: 'email-validation',
      variables: {
        userName: displayName,
        verificationUrl,
        isResend: isResend ? 'true' : 'false',
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
        to: [email],
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
        message: "Verification email sent successfully",
        emailId: result.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to send verification email";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
};

serve(handler);
