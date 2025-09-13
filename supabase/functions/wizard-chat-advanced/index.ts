import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, sessionId, model = "gpt-4o-mini" } = await req.json();
    if (!message) throw new Error("Message is required");

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization header is required");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Invalid authentication");

    // Chamada OpenAI
    const openaiParams: any = {
      model,
      messages: [
        { role: "system", content: "Você é um assistente de buffet inteligente." },
        { role: "user", content: message },
      ],
      max_tokens: 2048,
      stream: false,
      user: user.id,
    };

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(openaiParams),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const assistantResponse =
      data.choices?.[0]?.message?.content?.trim() || "[⚠️ Nenhuma resposta recebida]";

    // Cria sessão se não existir
    let finalSessionId = sessionId;
    if (!sessionId) {
      const { data: newSession, error: sessionError } = await supabase
        .from("wizard_chats")
        .insert({
          user_id: user.id,
          title: message.substring(0, 50),
        })
        .select()
        .single();

      if (!sessionError) finalSessionId = newSession.id;
    }

    // Salva mensagens
    if (finalSessionId) {
      await supabase.from("wizard_messages").insert([
        { chat_id: finalSessionId, role: "user", content: message },
        { chat_id: finalSessionId, role: "assistant", content: assistantResponse },
      ]);

      await supabase.from("wizard_chats")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", finalSessionId);
    }

    // Busca histórico e sessões
    const { data: history } = await supabase
      .from("wizard_messages")
      .select("*")
      .eq("chat_id", finalSessionId)
      .order("created_at", { ascending: true });

    const { data: sessions } = await supabase
      .from("wizard_chats")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    return new Response(
      JSON.stringify({
        response: assistantResponse,
        sessionId: finalSessionId,
        messages: history || [],
        sessions: sessions || [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
