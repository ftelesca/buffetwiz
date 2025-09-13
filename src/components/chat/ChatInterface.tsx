import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AdvancedMarkdownRenderer } from "./AdvancedMarkdownRenderer";
import { ChatSidebar } from "./ChatSidebar";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { EmbeddingsManager } from "./EmbeddingsManager";
import { 
  Send, 
  Bot, 
  User, 
  Menu,
  Plus,
  Settings,
  Sparkles
} from "lucide-react";

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

interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  summary?: string;
  embedding?: number[];
}

interface ChatInterfaceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChatInterface({ open, onOpenChange }: ChatInterfaceProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [embeddingsManager] = useState(() => new EmbeddingsManager());
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Load sessions on mount
  useEffect(() => {
    if (open && user) {
      loadSessions();
      embeddingsManager.initialize();
    }
  }, [open, user]);

  const loadSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('wizard_chats')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const sessionsWithMessages = await Promise.all(
        (data || []).map(async (session) => {
          const { data: messagesData } = await supabase
            .from('wizard_messages')
            .select('*')
            .eq('chat_id', session.id)
            .order('created_at');

          return {
            id: session.id,
            title: session.title,
            createdAt: session.created_at,
            updatedAt: session.updated_at,
            messages: (messagesData || []).map(msg => ({
              id: msg.id,
              role: msg.role as 'user' | 'assistant',
              content: msg.content,
              timestamp: msg.created_at,
              metadata: (msg.metadata as any) || {}
            }))
          };
        })
      );

      setSessions(sessionsWithMessages);
      
      // Auto-select most recent session
      if (sessionsWithMessages.length > 0 && !currentSession) {
        selectSession(sessionsWithMessages[0]);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar conversas",
        variant: "destructive",
      });
    }
  };

  const selectSession = (session: ChatSession) => {
    setCurrentSession(session);
    setMessages(session.messages);
  };

  const createNewSession = async () => {
    const newSession: ChatSession = {
      id: `temp-${Date.now()}`,
      title: "Nova Conversa",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: []
    };
    
    setCurrentSession(newSession);
    setMessages([]);
    setSidebarOpen(false);
    inputRef.current?.focus();
  };

  const findRelevantContext = async (query: string): Promise<string[]> => {
    try {
      // Get embedding for the query
      const queryEmbedding = await embeddingsManager.getEmbedding(query);
      
      // Search through all previous messages to find relevant context
      const allMessages = sessions.flatMap(session => session.messages);
      const relevantMessages: Array<{ message: ChatMessage; similarity: number }> = [];

      for (const message of allMessages) {
        if (message.metadata?.embedding) {
          const similarity = embeddingsManager.cosineSimilarity(
            queryEmbedding,
            message.metadata.embedding
          );
          
          if (similarity > 0.7) { // Threshold for relevance
            relevantMessages.push({ message, similarity });
          }
        }
      }

      // Sort by similarity and return top 5 contexts
      return relevantMessages
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 5)
        .map(item => `${item.message.role}: ${item.message.content.substring(0, 200)}...`);
        
    } catch (error) {
      console.error('Error finding relevant context:', error);
      return [];
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date().toISOString(),
      metadata: {}
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);
    setIsTyping(true);

    try {
      // Get embedding for user message (with safety check)
      const userEmbedding = userMessage.content ? await embeddingsManager.getEmbedding(userMessage.content) : [];
      if (userEmbedding.length > 0) {
        userMessage.metadata!.embedding = userEmbedding;
      }

      // Find relevant context from conversation history
      const relevantContext = await findRelevantContext(userMessage.content);
      
      // Check cache first
      const cachedResponse = await embeddingsManager.getCachedResponse(userMessage.content);
      
      if (cachedResponse) {
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: cachedResponse.content,
          timestamp: new Date().toISOString(),
          metadata: {
            cached: true,
            embedding: cachedResponse.embedding,
            relevantContext
          },
          isTyping: true
        };

        setMessages(prev => [...prev, assistantMessage]);
        
        // Simulate typing effect for cached responses
        setTimeout(() => {
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessage.id ? { ...msg, isTyping: false } : msg
          ));
          setIsTyping(false);
        }, 1000);
        
        return;
      }

      // Send to AI backend with context
      const { data, error } = await supabase.functions.invoke('wizard-chat-advanced', {
        body: {
          message: userMessage.content,
          sessionId: currentSession?.id.startsWith('temp-') ? null : currentSession?.id,
          context: relevantContext,
          model: 'gpt-5-2025-08-07'
        }
      });

      if (error) throw error;

      const assistantContent = data.response || data.generatedText || data.answer;
      const assistantEmbedding = assistantContent ? await embeddingsManager.getEmbedding(assistantContent) : [];

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date().toISOString(),
        metadata: {
          model: data.model || 'gpt-5-2025-08-07',
          tokens: data.tokens,
          embedding: assistantEmbedding.length > 0 ? assistantEmbedding : undefined,
          relevantContext
        },
        isTyping: true
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Cache the response (with safety check)
      if (assistantContent && assistantEmbedding.length > 0) {
        await embeddingsManager.cacheResponse(
          userMessage.content,
          assistantContent,
          assistantEmbedding
        );
      }

      // Update or create session
      if (currentSession?.id.startsWith('temp-')) {
        const sessionId = data.sessionId;
        if (sessionId) {
          const updatedSession = {
            ...currentSession,
            id: sessionId,
            title: userMessage.content.substring(0, 50) + '...'
          };
          setCurrentSession(updatedSession);
          setSessions(prev => [updatedSession, ...prev.filter(s => s.id !== currentSession.id)]);
        }
      }

      // Simulate typing effect
      setTimeout(() => {
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessage.id ? { ...msg, isTyping: false } : msg
        ));
        setIsTyping(false);
      }, Math.min(assistantContent.length * 20, 3000));

    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.slice(0, -1)); // Remove user message on error
      toast({
        title: "Erro",
        description: "Falha ao enviar mensagem",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!user) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <div className="sr-only">
            <DialogTitle>Assistente IA</DialogTitle>
            <DialogDescription>Janela de chat do assistente</DialogDescription>
          </div>
          <div className="text-center py-8">
            <Bot className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Faça login para continuar</h3>
            <p className="text-muted-foreground">
              É necessário estar logado para usar o chat IA
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[90vh] max-h-[90vh] p-0 gap-0 overflow-hidden">
        <div className="sr-only">
          <DialogTitle>Assistente IA</DialogTitle>
          <DialogDescription>Janela de chat do assistente</DialogDescription>
        </div>
        <div className="flex h-full max-h-full overflow-hidden">
          {/* Sidebar */}
          <ChatSidebar
            open={sidebarOpen}
            sessions={sessions}
            currentSession={currentSession}
            onSessionSelect={selectSession}
            onNewSession={createNewSession}
            onClose={() => setSidebarOpen(false)}
          />

          {/* Divider */}
          <div className="w-px bg-border self-stretch relative z-10" aria-hidden="true" />

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col min-w-0 max-h-full overflow-hidden">
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                  <Menu className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold">
                    {currentSession?.title || "BuffetWiz IA"}
                  </h2>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={createNewSession}>
                  <Plus className="h-4 w-4" />
                  Nova
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 min-h-0 overflow-auto">
              <div className="max-w-4xl mx-auto p-4 space-y-6">
                {messages.length === 0 ? (
                  <div className="text-center py-12">
                    <Bot className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-xl font-semibold mb-2">
                      Como posso ajudar você hoje?
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      Pergunte sobre custos, receitas, eventos ou qualquer análise do seu buffet
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                      {[
                        "Analise a rentabilidade dos últimos eventos",
                        "Calcule o custo das receitas principais",
                        "Sugira melhorias para reduzir despesas",
                        "Compare preços com a concorrência"
                      ].map((suggestion, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          className="p-4 h-auto text-left justify-start whitespace-normal"
                          onClick={() => setInputValue(suggestion)}
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((message) => (
                      <MessageBubble key={message.id} message={message} />
                    ))}
                    {isTyping && <TypingIndicator />}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="flex-shrink-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="max-w-4xl mx-auto p-4">
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <Input
                      ref={inputRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Digite sua mensagem... (Enter para enviar)"
                      className="pr-12 min-h-[44px] resize-none"
                      disabled={isLoading}
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={!inputValue.trim() || isLoading}
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-2 text-center">
                  IA pode cometer erros. Verifique informações importantes.
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}