import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// CORS headers for web calls
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Minimal shim to stop legacy calls from failing CORS
  try {
    const { method, url } = req;
    console.log("[wizard-export-pdf] Incoming request", { method, url });

    const message = {
      error: "Endpoint descontinuado",
      message:
        "O endpoint wizard-export-pdf foi desativado. As exportações são feitas no cliente. Atualize para a versão mais recente do app.",
    };

    return new Response(JSON.stringify(message), {
      status: 410, // Gone
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[wizard-export-pdf] Unexpected error", e);
    const errMsg = e instanceof Error ? e.message : "unknown";
    return new Response(JSON.stringify({ error: errMsg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});