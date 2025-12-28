import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { emailChangeCompleteSchema, validateRequest } from '../_shared/validation-schemas.ts';

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
    const validation = validateRequest(emailChangeCompleteSchema, rawBody, corsHeaders);
    if (!validation.success) return validation.response;

    const { tokenId } = validation.data;

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

    const { user_id, new_email } = tokenRecord;

    const { data: existingUsers, error: checkError } = await supabaseAdmin.auth.admin.listUsers();
    if (checkError) {
      throw new Error("Failed to verify email availability");
    }

    const emailExists = existingUsers.users.some(
      (u) => u.email?.toLowerCase() === new_email.toLowerCase() && u.id !== user_id
    );

    if (emailExists) {
      throw new Error("This email address is already in use by another account");
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user_id, { email: new_email });
    if (updateError) {
      throw new Error(`Failed to update email: ${updateError.message}`);
    }

    const { error: tokenUpdateError } = await supabaseAdmin
      .from("email_change_tokens")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", tokenId);

    if (tokenUpdateError) {
      console.error("Error updating token status:", tokenUpdateError);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Email changed successfully", newEmail: new_email }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to complete email change";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
};

serve(handler);
