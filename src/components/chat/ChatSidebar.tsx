"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";

interface ChatSession {
  id: string;
  title: string | null;
}

interface ChatSidebarProps {
  sessions: ChatSession[];
  activeSessionId?: string | null;
  onSelect: (chatId: string) => void;
  onDelete: (chatId: string) => void;
}

export default function ChatSidebar({
  sessions,
  activeSessionId,
  onSelect,
  onDelete,
}: ChatSidebarProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div className="p-3 border-r h-full w-64 overflow-y-auto">
      <h2 className="font-bold mb-3">Histórico</h2>

      {sessions.length === 0 && (
        <p className="text-gray-500 text-sm">Nenhuma conversa ainda</p>
      )}

      {sessions.map((chat) => (
        <div
          key={chat.id}
          className={`flex items-center justify-between p-2 rounded cursor-pointer ${
            activeSessionId === chat.id ? "bg-gray-100" : "hover:bg-gray-50"
          }`}
          onMouseEnter={() => setHoveredId(chat.id)}
          onMouseLeave={() => setHoveredId(null)}
        >
          {/* título do chat */}
          <span
            className="truncate flex-1"
            onClick={() => onSelect(chat.id)}
          >
            {chat.title ?? "Sem título"}
          </span>

          {/* ícone de apagar aparece só no hover */}
          {hoveredId === chat.id && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(chat.id);
              }}
              className="text-red-500 hover:text-red-700"
              title="Apagar chat"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
