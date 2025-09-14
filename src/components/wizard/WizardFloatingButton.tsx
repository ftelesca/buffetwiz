import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bot } from "lucide-react";

import { WizardChat } from "../wizard/WizardChat";

export function WizardFloatingButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
        size="lg"
      >
        <Bot className="h-6 w-6" />
        <span className="sr-only">Abrir Assistente IA</span>
      </Button>

      {/* Chat Modal */}
      <WizardChat open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}