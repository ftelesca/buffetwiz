import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MarkdownRenderer } from "@/components/chat/MarkdownRenderer";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

import { Bot, ChevronLeft, Clock, Download, Edit, History, MessageSquare, Send, Trash2, User } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// NOTE: Esta versão foi reescrita do zero para uma arquitetura mais simples e confiável,
// mantendo: histórico, envio, renderização markdown com botões de download e exportação em PDF.
// Problema de download: qualquer link export:... nas respostas é transformado em botão
// pelo MarkdownRenderer, que usa handleExportClick por baixo dos panos.

interface WizardChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ChatRow {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface MessageRow {
  id: string;
  chat_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  metadata?: any;
}

export function WizardChat({ open, onOpenChange }: WizardChatProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [chats, setChats] = useState<ChatRow[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatCaptureRef = useRef<HTMLDivElement>(null);

  // Auto-scroll para o fim ao receber mensagens
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // Focar no input após resposta da IA
  useEffect(() => {
    if (messages.length > 0 && messages[messages.length - 1]?.role === "assistant" && !isLoading) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [messages, isLoading]);

  // Carregar histórico quando abrir
  useEffect(() => {
    if (open && user) void loadChats();
  }, [open, user]);

  const loadChats = async () => {
    try {
      const { data, error } = await supabase
        .from("wizard_chats")
        .select("id, title, created_at, updated_at")
        .order("updated_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      setChats(data || []);
    } catch (err) {
      console.error("Erro carregando histórico:", err);
      toast({ title: "Erro", description: "Falha ao carregar histórico", variant: "destructive" });
    }
  };

  const loadMessages = async (chatId: string) => {
    try {
      const { data, error } = await supabase
        .from("wizard_messages")
        .select("id, chat_id, role, content, created_at, metadata")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      setMessages((data || []).map((m) => ({ ...m, role: m.role as MessageRow["role"] })));
      setCurrentChatId(chatId);
      setShowHistory(false);
    } catch (err) {
      console.error("Erro carregando mensagens:", err);
      toast({ title: "Erro", description: "Falha ao carregar mensagens", variant: "destructive" });
    }
  };

  const startNewChat = () => {
    setCurrentChatId(null);
    setMessages([]);
    setShowHistory(false);
  };

  const sendMessage = async () => {
    if (!user || !message.trim() || isLoading) return;
    const userText = message.trim();
    setMessage("");
    setIsLoading(true);

    // Otimista: adiciona a mensagem do usuário imediatamente
    const tempId = `temp-${Date.now()}`;
    const optimistic: MessageRow = {
      id: tempId,
      chat_id: currentChatId || "",
      role: "user",
      content: userText,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const { data, error } = await supabase.functions.invoke("wizard-chat", {
        body: { message: userText, chatId: currentChatId },
      });
      if (error) throw error;

      const resolvedChatId = (data as any)?.chatId || currentChatId;
      if (!currentChatId && resolvedChatId) {
        setCurrentChatId(resolvedChatId);
        await loadChats();
      }

      if (resolvedChatId) await loadMessages(resolvedChatId);
    } catch (err) {
      console.error("Erro enviando mensagem:", err);
      // Remove a otimista
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      toast({
        title: "Falha ao enviar",
        description: "Verifique as secrets no Supabase e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteChat = async (chatId: string) => {
    try {
      const { error } = await supabase.from("wizard_chats").delete().eq("id", chatId);
      if (error) throw error;
      setChats((prev) => prev.filter((c) => c.id !== chatId));
      if (currentChatId === chatId) startNewChat();
      toast({ title: "Chat deletado", description: "Conversa removida com sucesso" });
    } catch (err) {
      console.error("Erro deletando chat:", err);
      toast({ title: "Erro", description: "Não foi possível deletar", variant: "destructive" });
    }
  };

  const updateChatTitle = async (chatId: string, newTitle: string) => {
    if (!newTitle.trim()) return;

    try {
      const { error } = await supabase
        .from("wizard_chats")
        .update({ title: newTitle.trim() })
        .eq("id", chatId);
      
      if (error) throw error;
      
      setChats((prev) => prev.map((c) => 
        c.id === chatId ? { ...c, title: newTitle.trim() } : c
      ));
      
      setEditingChatId(null);
      setEditValue("");
      
      toast({ title: "Título atualizado", description: "Nome da conversa alterado com sucesso" });
    } catch (err) {
      console.error("Erro atualizando título:", err);
      toast({ title: "Erro", description: "Não foi possível atualizar o título", variant: "destructive" });
    }
  };

  const startEditingChat = (chatId: string, currentTitle: string) => {
    setEditingChatId(chatId);
    setEditValue(currentTitle);
  };

  const cancelEditing = () => {
    setEditingChatId(null);
    setEditValue("");
  };

  const handleEditKeyDown = (e: React.KeyboardEvent, chatId: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      updateChatTitle(chatId, editValue);
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEditing();
    }
  };

  const exportConversationToPDF = async () => {
    try {
      if (!currentChatId || messages.length === 0) {
        toast({ title: "Nenhuma conversa", description: "Não há mensagens para exportar", variant: "destructive" });
        return;
      }

      setIsLoading(true);

      const currentChat = chats.find(c => c.id === currentChatId);
      const chatTitle = currentChat?.title || "Conversa BuffetWiz";

      // Build default filename as fallback
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0].substring(0, 5).replace(':', '-');
      const fallbackFilename = `Assistente_BuffetWiz_${dateStr}_${timeStr}.pdf`;

      // Get auth token
      const { data: sessionData } = await supabase.auth.getSession();
      const jwt = sessionData?.session?.access_token;
      if (!jwt) throw new Error('Sessão inválida. Faça login novamente.');

      // Call edge function directly to support binary response
      const url = `https://bvubvqckuygqibjtmyhv.supabase.co/functions/v1/wizard-export-pdf`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json',
          'apikey': jwt,
        },
        body: JSON.stringify({ chatId: currentChatId, messages, chatTitle })
      });

      const contentType = res.headers.get('Content-Type') || '';

      if (!res.ok) {
        let msg = `Falha ao gerar PDF (${res.status})`;
        try { const j = await res.json(); if (j?.error) msg = j.error; } catch {}
        throw new Error(msg);
      }

      if (contentType.includes('application/pdf')) {
        // Download binary PDF
        const blob = await res.blob();
        const cd = res.headers.get('Content-Disposition') || '';
        const match = cd.match(/filename="?([^";]+)"?/i);
        const filename = match?.[1] || fallbackFilename;
        const urlObj = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = urlObj;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(urlObj);
        toast({ title: 'PDF gerado', description: 'PDF gerado no servidor com sucesso!' });
        return;
      }

      // JSON fallback with HTML string -> generate client-side
      const json = await res.json();
      const html = json?.html as string;
      const filename = (json?.filename as string) || fallbackFilename;
      if (!html) throw new Error('Resposta inválida do servidor');

      // Ensure html2pdf is available
      const ensureHtml2pdf = async () => {
        if ((window as any).html2pdf) return (window as any).html2pdf;
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.12.0/html2pdf.bundle.min.js';
          s.onload = () => resolve();
          s.onerror = () => reject(new Error('Falha ao carregar html2pdf'));
          document.body.appendChild(s);
        });
        return (window as any).html2pdf;
      };

      const html2pdf = await ensureHtml2pdf();
      await html2pdf()
        .set({
          filename,
          margin: [10,10,10,10],
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, letterRendering: true, backgroundColor: '#ffffff' },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true },
        })
        .from(html)
        .save();

      toast({ title: 'PDF gerado', description: 'PDF gerado no navegador (fallback)!' });

    } catch (err) {
      console.error('Erro no export:', err);
      toast({ title: 'Erro no export', description: err instanceof Error ? err.message : 'Falha ao gerar PDF', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to extract event details from chat messages
  const extractEventDetailsFromMessages = (msgs: MessageRow[]) => {
    let eventDetails = null;
    
    // Look for event-related information in the messages
    for (const message of msgs) {
      if (message.content.toLowerCase().includes('evento') || 
          message.content.toLowerCase().includes('buffet') ||
          message.content.toLowerCase().includes('festa')) {
        
        // Try to extract event details using regex patterns
        const titleMatch = message.content.match(/(?:evento|festa|celebração|buffet)[\s:]*(.+?)(?:\n|$)/i);
        const dateMatch = message.content.match(/(?:data|quando|em)[\s:]*(\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2} de \w+ de \d{4})/i);
        const locationMatch = message.content.match(/(?:local|onde|endereço)[\s:]*(.+?)(?:\n|$)/i);
        const guestsMatch = message.content.match(/(?:convidados|pessoas|participantes)[\s:]*(\d+)/i);
        
        if (titleMatch || dateMatch || locationMatch || guestsMatch) {
          eventDetails = {
            title: titleMatch?.[1]?.trim() || 'Evento',
            date: dateMatch?.[1]?.trim() || 'Não informada',
            location: locationMatch?.[1]?.trim() || 'Não informado',
            numguests: guestsMatch?.[1] || 'Não informado'
          };
          break;
        }
      }
    }
    
    return eventDetails;
  };

  const emptyStateSuggestions = useMemo(
    () => [
      "Analise a rentabilidade dos meus últimos eventos",
      "Sugira otimizações para reduzir custos",
      "Quais produtos têm maior margem de lucro?",
    ],
    []
  );

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
      <DialogContent className="max-w-4xl h-[80vh] p-0 flex flex-col">
        <div className="flex h-full min-h-0">
          {/* Sidebar de histórico */}
          <div className={`${showHistory ? "w-96" : "w-0"} transition-all duration-300 border-r bg-muted/30 overflow-hidden flex flex-col`}>
            <div className="p-4 border-b flex-shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Histórico</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-muted/40 min-h-0">
              <div className="p-2">
                <TooltipProvider>
                  {chats.map((chat) => (
                    <Card
                      key={chat.id}
                      className={`p-3 mb-2 cursor-pointer hover:bg-accent transition-colors ${currentChatId === chat.id ? "bg-accent" : ""}`}
                      onClick={() => editingChatId !== chat.id && loadMessages(chat.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          {editingChatId === chat.id ? (
                            <Input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => handleEditKeyDown(e, chat.id)}
                              onBlur={() => updateChatTitle(chat.id, editValue)}
                              className="text-sm font-medium h-auto p-1 border-none bg-transparent focus:bg-background focus:border-input"
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <p className="text-sm font-medium truncate cursor-pointer">{chat.title}</p>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="max-w-xs">
                                <p className="whitespace-normal break-words">{chat.title}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          <p className="text-xs text-muted-foreground flex items-center mt-1">
                            <Clock className="h-3 w-3 mr-1" />
                            {(() => {
                              const d = new Date(chat.updated_at);
                              const today = new Date();
                              const y = new Date();
                              y.setDate(today.getDate() - 1);
                              const isToday = d.toDateString() === today.toDateString();
                              const isYesterday = d.toDateString() === y.toDateString();
                              if (isToday) return `Hoje ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
                              if (isYesterday) return `Ontem ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
                              return `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
                            })()}
                          </p>
                        </div>
                        <div className="flex gap-0.5 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditingChat(chat.id, chat.title);
                            }}
                            aria-label="Renomear conversa"
                            className="opacity-60 hover:opacity-100 h-6 w-6 p-0"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteChat(chat.id);
                            }}
                            aria-label="Deletar conversa"
                            className="opacity-60 hover:opacity-100 h-6 w-6 p-0"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </TooltipProvider>
              </div>
            </div>
          </div>

          {/* Área principal */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Header */}
            <DialogHeader className="p-4 pr-12 border-b flex-shrink-0">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 min-w-0">
                  <Bot className="h-5 w-5 text-primary flex-shrink-0" />
                  <DialogTitle className="truncate">Assistente BuffetWiz</DialogTitle>
                  <Badge variant="secondary" className="text-xs flex-shrink-0">GPT-5 Premium</Badge>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button variant="outline" size="sm" onClick={() => setShowHistory((s) => !s)}>
                    <History className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Histórico</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={startNewChat}>
                    <MessageSquare className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Nova Conversa</span>
                  </Button>
                </div>
              </div>
              <DialogDescription className="sr-only">
                Converse com o assistente IA do BuffetWiz para análises e otimizações.
              </DialogDescription>
            </DialogHeader>

            {/* Mensagens */}
            <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-muted/40 min-h-0">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Bot className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">🧙‍♂️ Olá! Sou seu Assistente IA</h3>
                  <p className="text-muted-foreground mb-4 max-w-md">
                    Posso ajudar com análises de custos, otimização de cardápios, sugestões de preços e insights do seu negócio.
                  </p>
                  <div className="grid grid-cols-1 gap-2 max-w-md">
                    {emptyStateSuggestions.map((s) => (
                      <Card key={s} className="p-3 text-left cursor-pointer hover:bg-accent transition-colors" onClick={() => setMessage(s)}>
                        <p className="text-sm">{s}</p>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <div ref={chatCaptureRef} id="bw-chat-capture" className="space-y-4">
                  {messages.map((msg) => (
                    <div key={msg.id} data-pdf-message className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      {msg.role === "assistant" && (
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                            <Bot className="h-4 w-4" />
                          </div>
                        </div>
                      )}

                      <Card className={`max-w-[85%] ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border shadow-sm"}`}>
                        <div className={`${msg.role === "user" ? "p-4" : "p-0"}`}>
                          {msg.role === "user" ? (
                            <div className="whitespace-pre-wrap text-sm leading-relaxed break-words">{msg.content}</div>
                          ) : (
                            <div className="p-4">
                              <MarkdownRenderer
                                content={msg.content}
                                className="prose prose-sm max-w-none dark:prose-invert text-foreground/90 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                                enableExports
                              />
                            </div>
                          )}

                          <div className={`flex items-center justify-between mt-2 pt-2 border-t border-border/20 ${msg.role === "user" ? "" : "mx-4 pb-4"}`}>
                            <span className="text-xs opacity-70">
                              {new Date(msg.created_at).toLocaleTimeString("pt-BR")}
                            </span>
                            {msg.metadata?.tokens_used && (
                              <Badge variant="outline" className="text-xs">{msg.metadata.tokens_used} tokens</Badge>
                            )}
                          </div>
                        </div>
                      </Card>

                      {msg.role === "user" && (
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 rounded-full bg-muted text-foreground flex items-center justify-center">
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
                  ref={inputRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Faça sua pergunta sobre o negócio..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void sendMessage();
                    }
                  }}
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button onClick={sendMessage} disabled={isLoading || !message.trim()} className="px-6">
                  {isLoading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {currentChatId && messages.length > 0 && (
                <div className="mt-2 flex justify-end">
                  <Button variant="ghost" size="sm" onClick={exportConversationToPDF} disabled={isLoading}>
                    <Download className="h-3 w-3 mr-1" />
                    Exportar Conversa (PDF)
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
