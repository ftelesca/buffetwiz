"use client";

import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomOneLight } from "react-syntax-highlighter/dist/esm/styles/hljs";
import ChatSidebar from "./ChatSidebar";
import { supabase } from "@/lib/supabaseClient"; // ✅ usa o helper

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

// ... resto do código igual ...

      const functionUrl = `${(import.meta as any).env?.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/chat`;
      const r = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      });
