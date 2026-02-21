import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const getOrigin = (value?: string | null): string | null => {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.origin;
  } catch {
    return null;
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // 1. Parse request body
    const payload = await req.json();
    const code = typeof payload?.code === "string" ? payload.code : null;
    const state = typeof payload?.state === "string" ? payload.state : undefined;
    const appUrl = typeof payload?.appUrl === "string" ? payload.appUrl : null;

    if (!code) {
      return new Response(JSON.stringify({ error: "No authorization code provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const appOrigin = getOrigin(appUrl) || getOrigin(req.headers.get("origin"));
    if (!appOrigin) {
      return new Response(JSON.stringify({ error: "Invalid appUrl" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const redirectUri = `${appOrigin}/auth/google/callback`;

    // 2. Get environment variables
    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!clientId || !clientSecret || !supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Missing required environment variables");
    }

    // 3. Exchange authorization code for tokens (Google API)
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      return new Response(JSON.stringify({ error: "Token exchange failed", details: errorData }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tokens = await tokenResponse.json();
    // tokens = { access_token, id_token, refresh_token, expires_in }

    // 4. Create Supabase admin client
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // 5. Sign in with Google ID token
    const { data: authData, error: authError } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: tokens.id_token, // ⚠️ Use ID token, not access token
    });

    if (authError) {
      return new Response(JSON.stringify({ error: "Authentication failed", details: authError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. Return session tokens to frontend
    return new Response(
      JSON.stringify({
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in google-oauth-callback:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
