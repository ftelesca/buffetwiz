import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { TypingAnimation } from "@/components/ui/typing-animation";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

import html2pdf from "html2pdf.js";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

import { 
  Send, 
  Bot, 
  User, 
  Download, 
  History, 
  Trash2, 
  MessageSquare,
  Sparkles,
  Clock,
  ChevronLeft
} from "lucide-react";

interface WizardChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  metadata?: any;
  isTyping?: boolean;
}

interface Chat {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export function WizardChat({ open, onOpenChange }: WizardChatProps) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Load chat history
  useEffect(() => {
    if (open && user) {
      loadChatHistory();
    }
  }, [open, user]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const loadChatHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('wizard_chats')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setChats(data || []);
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const loadChatMessages = async (chatId: string) => {
    try {
      const { data, error } = await supabase
        .from('wizard_messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at');

      if (error) throw error;
      setMessages((data || []).map(msg => ({
        ...msg,
        role: msg.role as 'user' | 'assistant'
      })));
      setCurrentChatId(chatId);
      setShowHistory(false);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar mensagens",
        variant: "destructive",
      });
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || isLoading || !user) return;

    const userMessage = message.trim();
    setMessage("");
    setIsLoading(true);

    // Add user message to UI immediately
    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMessage]);

    try {
      const { data, error } = await supabase.functions.invoke('wizard-chat', {
        body: {
          message: userMessage,
          chatId: currentChatId
        }
      });

      if (error) throw error;

      // Resolve chat id and refresh history if it's a brand new chat
      const resolvedChatId = (data as any)?.chatId || currentChatId;
      if (!currentChatId && resolvedChatId) {
        setCurrentChatId(resolvedChatId);
        await loadChatHistory();
      }

      // Optimistic UI: show assistant response immediately with typing animation
      if (resolvedChatId) {
        const immediateText = (data as any)?.response || (data as any)?.generatedText || (data as any)?.answer || (data as any)?.output;
        if (immediateText) {
          const tempAssistantId = `temp-assistant-${Date.now()}`;
          const tempAssistant: Message = {
            id: tempAssistantId,
            role: 'assistant',
            content: immediateText,
            created_at: new Date().toISOString(),
            isTyping: true,
          };
          setMessages(prev => {
            const filtered = prev.filter(m => m.id !== tempUserMessage.id);
            return [
              ...filtered,
              { ...tempUserMessage, id: `user-${Date.now()}` },
              tempAssistant,
            ];
          });
          setTypingMessageId(tempAssistantId);
        }
        await loadChatMessages(resolvedChatId);
        setTypingMessageId(null);
      }


    } catch (error) {
      console.error('Error sending message:', error);
      
      // Remove the temporary message
      setMessages(prev => prev.filter(m => m.id !== tempUserMessage.id));
      
      toast({
        title: "Erro na consulta",
        description: "Falha ao enviar mensagem. Verifique a OPENAI_API_KEY nas Secrets do Supabase ou tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteChat = async (chatId: string) => {
    try {
      const { error } = await supabase
        .from('wizard_chats')
        .delete()
        .eq('id', chatId);

      if (error) throw error;

      setChats(prev => prev.filter(chat => chat.id !== chatId));
      if (currentChatId === chatId) {
        setCurrentChatId(null);
        setMessages([]);
      }

      toast({
        title: "Chat deletado",
        description: "Conversa removida com sucesso",
      });
    } catch (error) {
      console.error('Error deleting chat:', error);
      toast({
        title: "Erro",
        description: "Falha ao deletar conversa",
        variant: "destructive",
      });
    }
  };

  const exportToPDF = async (chatId: string) => {
  try {
    setIsLoading(true);

    const { data, error } = await supabase.functions.invoke("wizard-export-pdf", {
      body: { chatId },
    });
    if (error) throw error;

    const element = document.createElement("div");
    element.innerHTML = data.html;

    const opt = {
      margin: 0.5,
      filename: data.filename,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
    };

    await html2pdf().set(opt).from(element).save();

    toast({
      title: "PDF exportado",
      description: "Relatório baixado com sucesso",
    });
  } catch (error) {
    console.error("Error exporting PDF:", error);
    toast({
      title: "Erro no export",
      description: "Falha ao gerar PDF",
      variant: "destructive",
    });
  } finally {
    setIsLoading(false);
  }
};

  const startNewChat = () => {
    setCurrentChatId(null);
    setMessages([]);
    setShowHistory(false);
  };

  if (!user) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl h-[80vh]">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Bot className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg">Faça login para usar o Assistente IA</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] p-0">
        <div className="flex h-full">
          {/* Sidebar - Chat History */}
          <div className={`${showHistory ? 'w-80' : 'w-0'} transition-all duration-300 border-r bg-muted/30 overflow-hidden`}>
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Histórico</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHistory(false)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="h-[calc(100%-4rem)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              <div className="p-2">
                {chats.map((chat) => (
                  <Card
                    key={chat.id}
                    className={`p-3 mb-2 cursor-pointer hover:bg-accent transition-colors ${
                      currentChatId === chat.id ? 'bg-accent' : ''
                    }`}
                    onClick={() => loadChatMessages(chat.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{chat.title}</p>
                        <p className="text-xs text-muted-foreground flex items-center mt-1">
                          <Clock className="h-3 w-3 mr-1" />
                          {(() => {
                            const chatDate = new Date(chat.updated_at);
                            const today = new Date();
                            const yesterday = new Date(today);
                            yesterday.setDate(yesterday.getDate() - 1);
                            
                            const isToday = chatDate.toDateString() === today.toDateString();
                            const isYesterday = chatDate.toDateString() === yesterday.toDateString();
                            
                            if (isToday) {
                              return `Hoje ${chatDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
                            } else if (isYesterday) {
                              return `Ontem ${chatDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
                            } else {
                              return `${chatDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ${chatDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
                            }
                          })()}
                        </p>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            exportToPDF(chat.id);
                          }}
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteChat(chat.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <DialogHeader className="p-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <DialogTitle>Assistente BuffetWiz</DialogTitle>
                  <Badge variant="secondary" className="text-xs">GPT-5 Premium</Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowHistory(!showHistory)}
                  >
                    <History className="h-4 w-4 mr-1" />
                    Histórico
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={startNewChat}
                  >
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Nova Conversa
                  </Button>
                </div>
              </div>
              <DialogDescription className="sr-only">Converse com o assistente IA do BuffetWiz para análises e otimizações.</DialogDescription>
            </DialogHeader>

            {/* Messages */}
            <div className="flex-1 p-4 max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100" ref={scrollAreaRef}>
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Bot className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    🧙‍♂️ Olá! Sou seu Assistente IA
                  </h3>
                  <p className="text-muted-foreground mb-4 max-w-md">
                    Posso ajudar com análises de custos, otimização de cardápios, 
                    sugestões de preços e insights do seu negócio.
                  </p>
                  <div className="grid grid-cols-1 gap-2 max-w-md">
                    <Card className="p-3 text-left cursor-pointer hover:bg-accent transition-colors"
                          onClick={() => setMessage("Analise a rentabilidade dos meus últimos eventos")}>
                      <p className="text-sm">💰 Analise a rentabilidade dos meus últimos eventos</p>
                    </Card>
                    <Card className="p-3 text-left cursor-pointer hover:bg-accent transition-colors"
                          onClick={() => setMessage("Sugira otimizações para reduzir custos")}>
                      <p className="text-sm">📊 Sugira otimizações para reduzir custos</p>
                    </Card>
                    <Card className="p-3 text-left cursor-pointer hover:bg-accent transition-colors"
                          onClick={() => setMessage("Quais produtos têm maior margem de lucro?")}>
                      <p className="text-sm">📈 Quais produtos têm maior margem de lucro?</p>
                    </Card>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${
                        msg.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center">
                            <Bot className="h-4 w-4 text-white" />
                          </div>
                        </div>
                      )}
                      
                       <Card className={`max-w-[85%] ${
                         msg.role === 'user' 
                           ? 'bg-primary text-primary-foreground' 
                           : 'bg-card border shadow-sm'
                       }`}>
                         <div className={`${msg.role === 'user' ? 'p-4' : 'p-0'}`}>
                           {msg.role === 'user' ? (
                             <div className="whitespace-pre-wrap text-sm leading-relaxed break-words">
                               {msg.content}
                             </div>
                           ) : (
                             <div className="p-4">
                                {msg.isTyping && typingMessageId === msg.id ? (
                                  <TypingAnimation 
                                    text={msg.content}
                                    speed={25}
                                    enableMarkdown={true}
                                    onComplete={() => setTypingMessageId(null)}
                                    className="prose prose-sm max-w-none dark:prose-invert text-foreground/90"
                                  />
                                ) : (
                                  <MarkdownRenderer 
                                    content={msg.content}
                                    className="prose prose-sm max-w-none dark:prose-invert text-foreground/90 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                                  />
                                )}
                             </div>
                           )}
                           
                           <div className={`flex items-center justify-between mt-2 pt-2 border-t border-border/20 ${
                             msg.role === 'user' ? '' : 'mx-4 pb-4'
                           }`}>
                             <span className="text-xs opacity-70">
                               {new Date(msg.created_at).toLocaleTimeString('pt-BR')}
                             </span>
                             {msg.metadata?.tokens_used && (
                               <Badge variant="outline" className="text-xs">
                                 {msg.metadata.tokens_used} tokens
                               </Badge>
                             )}
                           </div>
                         </div>
                       </Card>

                      {msg.role === 'user' && (
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                            <User className="h-4 w-4" />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Faça sua pergunta sobre o negócio..."
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button 
                  onClick={sendMessage} 
                  disabled={isLoading || !message.trim()}
                  className="px-6"
                >
                  {isLoading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {currentChatId && (
                <div className="mt-2 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => exportToPDF(currentChatId)}
                    disabled={isLoading}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Exportar PDF
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}