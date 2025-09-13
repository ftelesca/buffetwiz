import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS for web usage
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Supabase client inside Edge Runtime
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

serve(async (req) => {
  // Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, chatId, model } = await req.json();

    // Authentication (verify_jwt=true in config.toml)
    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("No authorization header");

    const jwt = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !userData?.user) throw new Error("Invalid authorization");

    const userId = userData.user.id;
    if (!message || typeof message !== "string" || !message.trim()) {
      return new Response(
        JSON.stringify({ error: "Mensagem vazia" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // API key (no org/project headers anywhere)
    const OPENAI_API_KEY = (Deno.env.get("OPENAI_API_KEY") ?? "").trim();
    const hasKey = OPENAI_API_KEY.length > 0;
    console.log("wizard-chat:init", { hasKey });

    if (!hasKey) {
      console.error("Missing OPENAI_API_KEY secret");
      return new Response(
        JSON.stringify({
          error: "OPENAI_API_KEY não configurada nas Secrets das Edge Functions.",
          hint: "Defina em Settings > Functions > Secrets",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cache key (per user + question + model)
    const defaultModel = "gpt-5-2025-08-07";
    let selectedModel = typeof model === "string" && model.trim() ? model.trim() : defaultModel;
    const hashSource = `${userId}|${selectedModel}|${message}`;
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(hashSource));
    const queryHash = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");

    // Try cache
    let isCacheHit = false;
    let assistantResponse = "";
    let tokensUsed = 0;
    let cachedMeta: any = null;

    const { data: cached } = await supabase
      .from("wizard_cache")
      .select("*")
      .eq("user_id", userId)
      .eq("query_hash", queryHash)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (cached) {
      isCacheHit = true;
      const rd = cached.response_data || {};
      assistantResponse = rd.response || rd.generatedText || rd.answer || rd.output || "";
      tokensUsed = rd.metadata?.tokens_used || 0;
      cachedMeta = rd.metadata || null;
    }

    // If not cached, collect RAG context and call OpenAI
    if (!isCacheHit) {
      // Load business context
      const [eventsRes, recipesRes, itemsRes, customersRes] = await Promise.all([
        supabase
          .from("event")
          .select(
            `*,
            customer:customer(name,email,phone),
            event_menu(qty, recipe:recipe(description,efficiency))`
          )
          .eq("user_id", userId)
          .limit(50),
        supabase
          .from("recipe")
          .select(
            `*,
            recipe_item(qty, item:item(description,cost, unit_use:unit!item_unit_use_fkey(description)))`
          )
          .eq("user_id", userId)
          .limit(100),
        supabase.from("item").select("*").eq("user_id", userId).limit(200),
        supabase.from("customer").select("*").eq("user_id", userId).limit(50),
      ]);

      if (eventsRes.error) throw eventsRes.error;
      if (recipesRes.error) throw recipesRes.error;
      if (itemsRes.error) throw itemsRes.error;
      if (customersRes.error) throw customersRes.error;

      const context = {
        events: eventsRes.data || [],
        recipes: recipesRes.data || [],
        items: itemsRes.data || [],
        customers: customersRes.data || [],
      };

      // System prompt (PT-BR)
      const businessContext = `
CONTEXTO DO NEGÓCIO - BUFFETWIZ:
Você é um assistente especialista em custos, cardápio e eventos.

TERMINOLOGIA (use sempre estes termos nas respostas):
- "produto" (em vez de receita/recipe)
- "insumo" (em vez de item/ingrediente)

REGRAS DE COMUNICAÇÃO:
- Sempre use nomes/descrições, nunca IDs.
- Você pode analisar, comparar, filtrar e calcular com base nos dados abaixo.

FUNÇÕES DISPONÍVEIS PARA CÁLCULOS:
- calculate_recipe_unit_cost(product_id)
- calculate_recipe_base_cost(product_id)
- calculate_event_cost(event_id)

DADOS DO USUÁRIO:
EVENTOS (${context.events.length}):
${context.events
  .map(
    (e: any) => `• "${e.title}" - ${e.date} (${e.numguests} convidados)\n  Cliente: ${e.customer?.name || "N/A"}\n  Custo: R$ ${e.cost || "N/A"} | Preço: R$ ${e.price || "N/A"}\n  Menu: ${e.event_menu?.map((m: any) => `${m.recipe?.description} (${m.qty})`).join(", ") || "Vazio"}`
  )
  .join("\n")}

PRODUTOS (${context.recipes.length}):
${context.recipes
  .map(
    (r: any) => `• "${r.description}" (Rendimento: ${r.efficiency || 1})\n  Insumos: ${r.recipe_item?.map((ri: any) => `${ri.item?.description} (${ri.qty} ${ri.item?.unit_use?.description || "un"})`).join(", ") || "N/A"}`
  )
  .join("\n")}

INSUMOS (${context.items.length}):
${context.items
  .map((i: any) => `• "${i.description}": R$ ${i.cost || "N/A"} por ${i.unit_use?.description || "unidade"}`)
  .join("\n")}

CLIENTES (${context.customers.length}):
${context.customers
  .map((c: any) => `• "${c.name}" - ${c.email || "N/A"} | ${c.phone || "N/A"}`)
  .join("\n")}

INSTRUÇÕES:
1) Use os dados acima para responder. 2) Quando precisar de custos precisos, peça/executarei as funções de cálculo. 3) Responda em PT-BR de forma objetiva.
`;

      // Build payload according to model family
      const isNewModel = /^(gpt-5|gpt-4\.1|o3|o4)/.test(selectedModel);
      console.log("wizard-chat:model", { selectedModel, isNewModel });

      const payload: Record<string, unknown> = {
        model: selectedModel,
        messages: [
          { role: "system", content: businessContext },
          { role: "user", content: message },
        ],
      };
      if (isNewModel) payload.max_completion_tokens = 2000;
      else payload.max_tokens = 2000;

      const callOpenAI = async (payl: Record<string, unknown>) =>
        fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payl),
        });

      let openAIResponse = await callOpenAI(payload);

      if (!openAIResponse.ok) {
        let errorText = await openAIResponse.text();
        try {
          const j = JSON.parse(errorText);
          errorText = j.error?.message || JSON.stringify(j);
        } catch {}
        console.error("OpenAI error", { status: openAIResponse.status, errorText });

        // Fallback when model is invalid/unavailable
        const shouldFallback =
          (openAIResponse.status === 404 || openAIResponse.status === 400) &&
          /model|not found|does not exist|unknown/i.test(errorText);
        if (shouldFallback) {
          selectedModel = "gpt-4.1-2025-04-14";
          const fbPayload: Record<string, unknown> = {
            model: selectedModel,
            messages: payload.messages as any,
            max_completion_tokens: 2000,
          };
          const fbResp = await callOpenAI(fbPayload);
          if (!fbResp.ok) {
            let fbText = await fbResp.text();
            try { const j = JSON.parse(fbText); fbText = j.error?.message || JSON.stringify(j); } catch {}
            return new Response(
              JSON.stringify({ error: "Falha na OpenAI", details: errorText, fallback_details: fbText }),
              { status: fbResp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          openAIResponse = fbResp;
        } else if (openAIResponse.status === 401) {
          return new Response(
            JSON.stringify({ error: "OPENAI_API_KEY inválida ou sem permissão.", details: errorText }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else if (openAIResponse.status === 429) {
          return new Response(
            JSON.stringify({ error: "Cota da OpenAI excedida", details: errorText }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else if (openAIResponse.status === 400 && /max_tokens|max_completion_tokens|temperature/i.test(errorText)) {
          return new Response(
            JSON.stringify({
              error: "Parâmetros incompatíveis com o modelo.",
              hint: "GPT‑5/4.1/o3/o4 usam max_completion_tokens; 4o/4o‑mini usam max_tokens.",
              details: errorText,
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          return new Response(
            JSON.stringify({ error: "Falha na chamada à OpenAI", details: errorText }),
            { status: openAIResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      const aiData = await openAIResponse.json();
      assistantResponse = aiData?.choices?.[0]?.message?.content || aiData?.choices?.[0]?.text || "";
      tokensUsed = aiData?.usage?.total_tokens ?? aiData?.usage?.output_tokens ?? 0;

      // Execute calculation RPCs if requested inside the response text
      if (assistantResponse && assistantResponse.includes("calculate_")) {
        try {
          const matches = assistantResponse.match(/calculate_\w+\((\d+)\)/g);
          if (matches) {
            let updated = assistantResponse;
            for (const m of matches) {
              const [fn, paramStr] = m.split("(");
              const param = parseInt(paramStr.replace(")", ""));
              if (isNaN(param)) continue;

              let result: number | null = null;
              if (fn === "calculate_recipe_unit_cost") {
                const { data, error } = await supabase.rpc("calculate_recipe_unit_cost", { recipe_id_param: param });
                if (!error) result = data as number;
              } else if (fn === "calculate_recipe_base_cost") {
                const { data, error } = await supabase.rpc("calculate_recipe_base_cost", { recipe_id_param: param });
                if (!error) result = data as number;
              } else if (fn === "calculate_event_cost") {
                const { data, error } = await supabase.rpc("calculate_event_cost", { event_id_param: param });
                if (!error) result = data as number;
              }

              if (result !== null) {
                updated = updated.replace(m, `${m} = R$ ${Number(result).toFixed(2)}`);
              }
            }
            assistantResponse = updated;
          }
        } catch (calcErr) {
          console.error("calc-fn error", calcErr);
        }
      }

      // Cache for 1h
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      const responseToCache = {
        response: assistantResponse,
        chatId,
        metadata: {
          model: selectedModel,
          tokens_used: tokensUsed,
          context_summary: {
            events: context.events.length,
            recipes: context.recipes.length,
            items: context.items.length,
            customers: context.customers.length,
          },
        },
      };

      await supabase.from("wizard_cache").insert({
        user_id: userId,
        query_hash: queryHash,
        response_data: responseToCache,
        expires_at: expiresAt.toISOString(),
      });
    }

    // If still empty, provide friendly fallback
    if (!assistantResponse || !assistantResponse.trim()) {
      assistantResponse = "Não foi possível gerar uma resposta no momento. Tente novamente.";
    }

    // Ensure there is a chat id (create if needed)
    let currentChatId = chatId as string | null;
    if (!currentChatId) {
      const { data: newChat, error: chatErr } = await supabase
        .from("wizard_chats")
        .insert({
          user_id: userId,
          title: message.substring(0, 50) + (message.length > 50 ? "..." : ""),
        })
        .select()
        .single();
      if (chatErr) throw chatErr;
      currentChatId = newChat.id;
    }

    // Save user message
    const { error: userMsgErr } = await supabase.from("wizard_messages").insert({
      chat_id: currentChatId,
      role: "user",
      content: message,
    });
    if (userMsgErr) throw userMsgErr;

    // Save assistant message
    const { error: aiMsgErr } = await supabase.from("wizard_messages").insert({
      chat_id: currentChatId,
      role: "assistant",
      content: assistantResponse,
      metadata: cachedMeta ?? {
        model: selectedModel,
        tokens_used: tokensUsed,
        context_items: { events: 0, recipes: 0, items: 0, customers: 0 },
      },
    });
    if (aiMsgErr) throw aiMsgErr;

    // Touch chat timestamp
    const { error: updErr } = await supabase
      .from("wizard_chats")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", currentChatId);
    if (updErr) console.warn("chat timestamp update failed", updErr);

    // Final response
    return new Response(
      JSON.stringify({
        response: assistantResponse,
        chatId: currentChatId,
        metadata: cachedMeta ?? { model: selectedModel, tokens_used: tokensUsed, cached: isCacheHit },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("wizard-chat fatal", err);
    return new Response(
      JSON.stringify({ error: err?.message || "Internal error", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
