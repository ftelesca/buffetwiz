"use client";

import React, { useState } from "react";
import { ChatInterface } from "../chat/ChatInterface";

export default function WizardFloatingButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Botão flutuante */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-4 right-4 rounded-full bg-blue-600 p-4 text-white shadow-lg hover:bg-blue-700"
        >
          💬
        </button>
      )}

      {/* Janela do chat */}
      {open && (
        <div className="fixed bottom-16 right-4 w-[400px] h-[600px] bg-white border shadow-lg rounded-lg overflow-hidden flex flex-col">
          <ChatInterface open={open} onOpenChange={setOpen} />
        </div>
      )}
    </>
  );
}
