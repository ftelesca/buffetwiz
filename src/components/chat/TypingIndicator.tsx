import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot } from "lucide-react";

export function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-start gap-3">
        <Avatar className="h-8 w-8 mt-1">
          <AvatarFallback className="bg-gradient-to-r from-primary to-secondary text-white">
            <Bot className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
        <div className="bg-muted/60 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-border/40">
          <div className="flex items-center space-x-1">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce"></div>
            </div>
            <span className="text-xs text-muted-foreground ml-2">Escrevendo...</span>
          </div>
        </div>
      </div>
    </div>
  );
}