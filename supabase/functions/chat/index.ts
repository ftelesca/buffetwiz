import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Supabase admin client
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// OpenAI
const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, sessionId } = await req.json();

    // Autenticação do usuário
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization header required");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Invalid authentication");

    // 🔹 INIT → listar sessões + carregar última
    if (message === "__init__") {
      const { data: sessions } = await supabase
        .from("wizard_chats")
        .select("id, title, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      let messages: any[] = [];
      let currentSessionId: string | null = null;

      if (sessions && sessions.length) {
        currentSessionId = sessions[0].id;
        const { data: msgs } = await supabase
          .from("wizard_messages")
          .select("*")
          .eq("chat_id", currentSessionId)
          .order("created_at", { ascending: true });
        messages = msgs || [];
      }

      return jsonResponse({
        sessions: sessions || [],
        messages,
        sessionId: currentSessionId,
      });
    }

    // 🔹 LOAD → carregar mensagens de uma sessão específica
    if (message === "__load__" && sessionId) {
      const { data: msgs } = await supabase
        .from("wizard_messages")
        .select("*")
        .eq("chat_id", sessionId)
        .order("created_at", { ascending: true });

      return jsonResponse({ messages: msgs || [], sessionId });
    }

    // 🔹 DELETE → apagar sessão e mensagens
    if (message === "__delete__" && sessionId) {
      await supabase.from("wizard_messages").delete().eq("chat_id", sessionId);
      await supabase.from("wizard_chats").delete().eq("id", sessionId);

      return jsonResponse({ deleted: true, sessionId });
    }

    // 🔹 Fluxo normal: enviar pergunta ao modelo
    if (!message) throw new Error("Message is required");

    let finalSessionId = sessionId;

    // Criar sessão se necessário
    if (!finalSessionId) {
      const { data: newSession, error: sessionError } = await supabase
        .from("wizard_chats")
        .insert({
          user_id: user.id,
          title: message.substring(0, 50),
        })
        .select()
        .single();

      if (sessionError) throw sessionError;
      finalSessionId = newSession.id;
    }

    // Montar mensagens (últimos 10 do histórico)
    const { data: history } = await supabase
      .from("wizard_messages")
      .select("role, content")
      .eq("chat_id", finalSessionId)
      .order("created_at", { ascending: true })
      .limit(10);

    const messagesForModel = [
      { role: "system", content: "Você é o BuffetWiz IA, ajude o usuário em gestão de eventos e catering." },
      ...(history || []),
      { role: "user", content: message },
    ];

    // Chamar OpenAI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: messagesForModel,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI error: ${err}`);
    }

    const data = await response.json();
    const assistantResponse = data.choices[0].message.content;

    // Salvar no banco
    const messagesToSave = [
      {
        chat_id: finalSessionId,
        role: "user",
        content: message,
      },
      {
        chat_id: finalSessionId,
        role: "assistant",
        content: assistantResponse,
      },
    ];

    await supabase.from("wizard_messages").insert(messagesToSave);

    // Atualizar updated_at da sessão
    await supabase
      .from("wizard_chats")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", finalSessionId);

    // Recarregar tudo para devolver ao frontend
    const { data: sessions } = await supabase
      .from("wizard_chats")
      .select("id, title, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    const { data: msgs } = await supabase
      .from("wizard_messages")
      .select("*")
      .eq("chat_id", finalSessionId)
      .order("created_at", { ascending: true });

    return jsonResponse({
      response: assistantResponse,
      sessionId: finalSessionId,
      messages: msgs || [],
      sessions: sessions || [],
    });
  } catch (e: any) {
    console.error("❌ Function error:", e);
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

function jsonResponse(data: any) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
