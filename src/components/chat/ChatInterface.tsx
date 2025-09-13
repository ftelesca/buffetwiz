"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { createClient } from "@supabase/supabase-js";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomOneLight } from "react-syntax-highlighter/dist/esm/styles/hljs";
import ChatSidebar from "./ChatSidebar";

const supabase =
  typeof window !== "undefined"
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
    : (null as any);

type Session = {
  id: string;
  title: string | null;
  updated_at?: string | null;
};

type Message = {
  id?: string;
  chat_id: string;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
};

export default function ChatInterface() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto scroll
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Carrega sessões do usuário ao montar
  useEffect(() => {
    (async () => {
      if (!supabase) return;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("wizard_chats")
        .select("id, title, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      setSessions((data ?? []) as Session[]);
      // se houver sessão, seleciona a primeira
      if (data && data.length) {
        setCurrentSessionId(data[0].id);
        // carrega mensagens desta sessão
        const { data: msgs } = await supabase
          .from("wizard_messages")
          .select("*")
          .eq("chat_id", data[0].id)
          .order("created_at", { ascending: true });
        setMessages((msgs ?? []) as Message[]);
      }
    })();
  }, []);

  // Render de mensagem com Markdown + highlight
  const renderMessage = (m: Message, i: number) => {
    const isUser = m.role === "user";
    return (
      <div
        key={`${m.id ?? i}-${m.created_at ?? i}`}
        className={`max-w-[85%] whitespace-pre-wrap rounded-lg p-3 shadow ${
          isUser ? "self-end bg-blue-100 text-right" : "self-start bg-white"
        }`}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || "");
              return match ? (
                <SyntaxHighlighter style={atomOneLight} language={match[1]} PreTag="div" {...props}>
                  {String(children).replace(/\n$/, "")}
                </SyntaxHighlighter>
              ) : (
                <code className="rounded bg-gray-200 px-1" {...props}>
                  {children}
                </code>
              );
            },
            a({ href, children }) {
              // links de download assinados funcionam normalmente
              return (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline hover:no-underline"
                >
                  {children}
                </a>
              );
            },
          }}
        >
          {m.content?.trim() || (isUser ? "" : "[⚠️ Resposta vazia]")}
        </ReactMarkdown>
      </div>
    );
  };

  async function handleSend() {
    if (!input.trim() || sending) return;
    setSending(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Sessão inválida.");

      const body = {
        message: input.trim(),
        sessionId: currentSessionId, // pode ser null para criar nova
      };

      // Otimismo: mostra mensagem do usuário imediatamente
      const optimisticUser: Message = {
        chat_id: currentSessionId || "__pending__",
        role: "user",
        content: input.trim(),
      };
      setMessages((prev) => [...prev, optimisticUser]);
      setInput("");

      const r = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await r.json();

      if (!r.ok) {
        // rollback da última mensagem do usuário
        setMessages((prev) => prev.slice(0, -1));
        throw new Error(data?.error || "Falha ao enviar mensagem");
      }

      // Atualiza sessão corrente
      setCurrentSessionId(data.sessionId || null);

      // Corrige exibição no painel: usa mensagens/sessões retornadas do backend
      setMessages(data.messages || []);
      setSessions(data.sessions || []);
    } catch (e: any) {
      console.error(e);
      alert(e.message ?? "Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
  }

  async function handleSelectSession(chatId: string) {
    setCurrentSessionId(chatId);
    // Carrega mensagens dessa sessão
    const { data: msgs } = await supabase
      .from("wizard_messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });
    setMessages((msgs ?? []) as Message[]);
  }

  async function handleDeleteSession(chatId: string) {
    if (!confirm("Deseja apagar este chat?")) return;
    try {
      // Deleta direto via RLS, assumindo política por user_id (mais simples que criar outra Function)
      const {
        data: { user, session },
      } = await supabase.auth.getUser().then(async (u) => ({
        data: { user: u.data.user, session: (await supabase.auth.getSession()).data.session },
      }));

      if (!user?.id) throw new Error("Usuário não autenticado.");
      // Apaga mensagens + sessão (somente do próprio user)
      await supabase.from("wizard_messages").delete().eq("chat_id", chatId);
      await supabase.from("wizard_chats").delete().eq("id", chatId);

      // Atualiza lista local de sessões
      setSessions((prev) => prev.filter((s) => s.id !== chatId));

      // Se estava aberta, limpa painel
      if (currentSessionId === chatId) {
        setCurrentSessionId(null);
        setMessages([]);
      }
    } catch (e: any) {
      console.error(e);
      alert(e.message ?? "Falha ao apagar chat");
    }
  }

  return (
    <div className="flex h-full w-full">
      {/* Sidebar do histórico */}
      <ChatSidebar
        sessions={sessions}
        activeSessionId={currentSessionId}
        onSelect={handleSelectSession}
        onDelete={handleDeleteSession}
      />

      {/* Área do chat */}
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Header simples */}
        <div className="border-b p-3">
          <h1 className="text-lg font-semibold">Assistente BuffetWiz</h1>
        </div>

        {/* Mensagens */}
        <div className="flex-1 space-y-2 overflow-y-auto bg-gray-50 p-3">
          {messages.map((m, i) => renderMessage(m, i))}
          <div ref={scrollRef} />
        </div>

        {/* Input */}
        <div className="border-t p-3">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Digite sua mensagem..."
              className="flex-1 rounded border px-3 py-2 outline-none focus:ring"
            />
            <button
              onClick={handleSend}
              disabled={sending || !input.trim()}
              className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {sending ? "Enviando..." : "Enviar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
