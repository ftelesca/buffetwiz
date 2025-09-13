import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdvancedMarkdownRenderer } from "./AdvancedMarkdownRenderer";
import { TypingAnimation } from "@/components/ui/typing-animation";
import { 
  Bot, 
  User, 
  Copy, 
  Check,
  MoreHorizontal,
  ThumbsUp,
  ThumbsDown,
  RotateCcw
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    model?: string;
    tokens?: number;
    cached?: boolean;
    embedding?: number[];
    relevantContext?: string[];
  };
  isTyping?: boolean;
}

interface MessageBubbleProps {
  message: ChatMessage;
  onRegenerate?: () => void;
  onFeedback?: (positive: boolean) => void;
}

export function MessageBubble({ message, onRegenerate, onFeedback }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copiado!",
        description: "Mensagem copiada para a área de transferência",
      });
    } catch (error) {
      console.error('Error copying message:', error);
      toast({
        title: "Erro",
        description: "Falha ao copiar mensagem",
        variant: "destructive",
      });
    }
  };

  const formatTime = (timestamp: string) => {
    return formatDistanceToNow(new Date(timestamp), {
      addSuffix: true
    });
  };

  if (message.role === 'user') {
    return (
      <div className="flex justify-end group">
        <div className="flex items-start gap-3 max-w-[80%]">
          <div className="flex-1">
            <div 
              className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-3 shadow-sm"
              onMouseEnter={() => setShowActions(true)}
              onMouseLeave={() => setShowActions(false)}
            >
              <div className="whitespace-pre-wrap text-sm leading-relaxed break-words">
                {message.content}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-1 px-2">
              <span className="text-xs text-muted-foreground">
                {formatTime(message.timestamp)}
              </span>
              {(showActions || copied) && (
                <Button
                  onClick={copyToClipboard}
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-green-600" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              )}
            </div>
          </div>
          <Avatar className="h-8 w-8 mt-1">
            <AvatarFallback className="bg-primary text-primary-foreground">
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start group">
      <div className="flex items-start gap-3 max-w-[85%]">
        <Avatar className="h-8 w-8 mt-1">
          <AvatarFallback className="bg-gradient-to-r from-primary to-secondary text-white">
            <Bot className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div 
            className="bg-muted/60 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-border/40"
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
          >
            {message.isTyping ? (
              <TypingAnimation 
                text={message.content}
                speed={25}
                enableMarkdown={true}
                className="text-foreground/90"
              />
            ) : message.content && message.content.trim() ? (
              <AdvancedMarkdownRenderer 
                content={message.content}
                className="text-foreground/90 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
              />
            ) : (
              <div className="text-muted-foreground italic text-sm">
                Resposta vazia recebida
              </div>
            )}
          </div>
          
          {/* Message metadata and actions */}
          <div className="flex items-center justify-between mt-2 px-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {formatTime(message.timestamp)}
              </span>
              {message.metadata?.model && (
                <Badge variant="outline" className="text-xs h-4">
                  {message.metadata.model}
                </Badge>
              )}
              {message.metadata?.cached && (
                <Badge variant="secondary" className="text-xs h-4">
                  Cache
                </Badge>
              )}
              {message.metadata?.tokens && (
                <span className="text-xs text-muted-foreground">
                  {message.metadata.tokens} tokens
                </span>
              )}
            </div>
            
            {(showActions || copied) && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  onClick={copyToClipboard}
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  title="Copiar mensagem"
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-green-600" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
                
                {onRegenerate && (
                  <Button
                    onClick={onRegenerate}
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    title="Regenerar resposta"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                )}

                {onFeedback && (
                  <>
                    <Button
                      onClick={() => onFeedback(true)}
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      title="Resposta útil"
                    >
                      <ThumbsUp className="h-3 w-3" />
                    </Button>
                    <Button
                      onClick={() => onFeedback(false)}
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      title="Resposta não útil"
                    >
                      <ThumbsDown className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Relevant context indicator */}
          {message.metadata?.relevantContext && message.metadata.relevantContext.length > 0 && (
            <div className="mt-2 px-2">
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer hover:text-foreground transition-colors">
                  Baseado em {message.metadata.relevantContext.length} contexto(s) relevante(s)
                </summary>
                <div className="mt-1 pl-2 border-l-2 border-border/40">
                  {message.metadata.relevantContext.map((context, index) => (
                    <div key={index} className="mt-1 text-xs truncate">
                      {context}
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}