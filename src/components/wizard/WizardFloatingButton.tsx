"use client";

import React, { useState } from "react";
import { ChatInterface } from "../chat/ChatInterface";

function WizardFloatingButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Botão flutuante para abrir o chat */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-4 right-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-2xl text-white shadow-lg hover:bg-blue-700 focus:outline-none"
          title="Abrir Assistente"
        >
          💬
        </button>
      )}

      {/* Janela de chat */}
      {open && (
        <div className="fixed bottom-16 right-4 z-50 flex h-[600px] w-[400px] flex-col overflow-hidden rounded-lg border bg-white shadow-xl">
          <ChatInterface open={open} onOpenChange={setOpen} />
        </div>
      )}
    </>
  );
}

export default WizardFloatingButton;
export { WizardFloatingButton };
