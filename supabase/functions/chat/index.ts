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

// === Helpers de arquivo / download ===
type ExportPayload = {
  type: "csv" | "json" | "xlsx";
  data: unknown;
  filename?: string;
};

function sanitizeFilename(name: string) {
  return name.replace(/[^\w.\-]+/g, "_").slice(0, 120);
}

function objectsToCSV(rows: Array<Record<string, unknown>>): string {
  if (!rows || rows.length === 0) return "";
  // pega o conjunto de colunas (união de chaves)
  const cols = Array.from(
    rows.reduce((set, r) => {
      Object.keys(r ?? {}).forEach((k) => set.add(k));
      return set;
    }, new Set<string>())
  );

  const esc = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    // escapa aspas e separadores
    if (/[,"\n;]/.test(s)) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const header = cols.map(esc).join(",");
  const body = rows.map((r) => cols.map((c) => esc((r as any)[c])).join(",")).join("\n");
  return `${header}\n${body}`;
}

async function uploadToStorage(userId: string, blob: Blob, desiredName: string) {
  const bucket = "chat-files";
  const path = `exports/${userId}/${sanitizeFilename(desiredName)}`;
  const { error: upErr } = await supabase.storage.from(bucket).upload(path, blob, {
    upsert: true,
    contentType: blob.type || "application/octet-stream",
  });
  if (upErr) throw upErr;

  const { data: signed, error: signErr } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 10); // 10 minutos
  if (signErr) throw signErr;
  return signed.signedUrl as string;
}

async function materializeExport(userId: string, payload: ExportPayload) {
  // Normaliza filename
  const base = sanitizeFilename(payload.filename || `export_${Date.now()}`);
  try {
    if (payload.type === "json") {
      const json = JSON.stringify(payload.data, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = await uploadToStorage(userId, blob, base.endsWith(".json") ? base : `${base}.json`);
      return { url, filename: base.endsWith(".json") ? base : `${base}.json`, note: null as string | null };
    }

    if (payload.type === "csv" || payload.type === "xlsx") {
      // Para Edge Functions (Deno) sem libs de XLSX, geramos CSV.
      // Se o tipo pedido for "xlsx", geramos CSV equivalente e deixamos uma observação.
      const rows = Array.isArray(payload.data) ? (payload.data as Array<Record<string, unknown>>) : [];
      const csv = objectsToCSV(rows);
      const blob = new Blob([csv], { type: "text/csv" });
      const filenameCsv =
        payload.type === "csv"
          ? (base.endsWith(".csv") ? base : `${base}.csv`)
          : // pediu xlsx -> entregamos CSV equivalente
            (base.endsWith(".csv") ? base : `${base.replace(/\.xlsx$/i, "")}.csv`);

      const url = await uploadToStorage(userId, blob, filenameCsv);
      const note =
        payload.type === "xlsx"
          ? "Obs.: Geramos CSV equivalente pois XLSX não é suportado nesta função Edge. Baixe e abra no Excel normalmente."
          : null;

      return { url, filename: filenameCsv, note };
    }

    // fallback
    const txt = typeof payload.data === "string" ? payload.data : JSON.stringify(payload.data);
    const blob = new Blob([txt], { type: "text/plain" });
    const url = await uploadToStorage(userId, blob, `${base}.txt`);
    return { url, filename: `${base}.txt`, note: null as string | null };
  } catch (e) {
    console.error("Erro ao materializar export:", e);
    return null;
  }
}

function replaceExportMarkers(userId: string, content: string) {
  // Detecta padrões do tipo:
  // [🔗 Baixar algo](export:{"type":"csv","data":[...],"filename":"nome"})
  // ou apenas: export:{"type":"csv","data":[...]}
  const regex = /export:\s*(\{[\s\S]*?\})/g;
  const tasks: Array<Promise<{ original: string; replacement: string } | null>> = [];
  const matches: Array<{ full: string; json: string }> = [];

  let m: RegExpExecArray | null;
  while ((m = regex.exec(content)) !== null) {
    matches.push({ full: m[0], json: m[1] });
  }

  for (const match of matches) {
    tasks.push(
      (async () => {
        try {
          const payload = JSON.parse(match.json) as ExportPayload;
          const done = await materializeExport(userId, payload);
          if (!done) return null;

          // Monta um markdown de download real
          const label = payload.filename || done.filename || "arquivo";
          const link = `[📥 Baixar ${label}](${done.url})`;
          const note = done.note ? `\n\n> ${done.note}` : "";
          return { original: match.full, replacement: link + note };
        } catch {
          return null;
        }
      })()
    );
  }

  return Promise.all(tasks);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, sessionId, context = [], model = "gpt-4o-mini" } = await req.json();
    if (!message) throw new Error("Message is required");

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization header is required");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Invalid authentication");

    // System prompt (pode ser ajustado conforme sua necessidade)
    const systemPrompt =
      "Você é o BuffetWiz IA. Responda em PT-BR com markdown claro. Para exportar dados, você pode sugerir um bloco 'export:{\"type\":\"csv\",\"data\":[...],\"filename\":\"nome\"}'. Nós converteremos em link real.";

    // Chamada OpenAI (sem streaming aqui; se quiser, podemos adaptar)
    const openaiParams: any = {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        ...(context?.length ? [{ role: "system", content: `Contexto: ${context.join("\n")}` }] : []),
        { role: "user", content: message },
      ],
      max_tokens: 2048,
      stream: false,
      user: user.id,
    };

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(openaiParams),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    let assistantResponse =
      data.choices?.[0]?.message?.content?.trim() || "[⚠️ Nenhuma resposta recebida]";

    // === CORREÇÃO: materializa downloads ===
    const replacements = await replaceExportMarkers(user.id, assistantResponse);
    if (replacements && replacements.length) {
      for (const r of replacements) {
        if (r) {
          assistantResponse = assistantResponse.replace(r.original, r.replacement);
        }
      }
    }

    // === Cria sessão se não existir ===
    let finalSessionId = sessionId;
    if (!sessionId) {
      const { data: newSession, error: sessionError } = await supabase
        .from("wizard_chats")
        .insert({
          user_id: user.id,
          title: message.substring(0, 50) + (message.length > 50 ? "..." : ""),
        })
        .select()
        .single();

      if (!sessionError) finalSessionId = newSession.id;
    }

    // === Salva mensagens e mantém roles consistentes ===
    if (finalSessionId) {
      const { error: insErr } = await supabase.from("wizard_messages").insert([
        { chat_id: finalSessionId, role: "user", content: message },
        { chat_id: finalSessionId, role: "assistant", content: assistantResponse || "[resposta]" },
      ]);
      if (insErr) console.error("Erro ao salvar mensagens:", insErr);

      await supabase
        .from("wizard_chats")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", finalSessionId);
    }

    // === Retorna histórico e sessões para corrigir exibição no painel ===
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
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("❌ Function error:", error);
    return new Response(
      JSON.stringify({
        error: error.message ?? "Internal error",
        details: "Check function logs for more information",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
