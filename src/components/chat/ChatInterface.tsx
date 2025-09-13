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

function ChatInterface() {
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
                </S
