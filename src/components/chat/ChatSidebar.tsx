"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

type ChatSession = {
  id: string;
  title: string | null;
};

interface Props {
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
}: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <aside className="h-full w-64 overflow-y-auto border-r p-3">
      <h2 className="mb-3 font-bold">Histórico</h2>

      {(!sessions || sessions.length === 0) && (
        <p className="text-sm text-gray-500">Nenhuma conversa ainda</p>
      )}

      {sessions?.map((chat) => (
        <div
          key={chat.id}
          className={`flex cursor-pointer items-center justify-between rounded p-2 ${
            activeSessionId === chat.id ? "bg-gray-100" : "hover:bg-gray-50"
          }`}
          onMouseEnter={() => setHoveredId(chat.id)}
          onMouseLeave={() => setHoveredId(null)}
        >
          <span className="flex-1 truncate" onClick={() => onSelect(chat.id)} title={chat.title ?? ""}>
            {chat.title ?? "Sem título"}
          </span>

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
    </aside>
  );
}
