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
import { jsPDF } from "jspdf";

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
      console.log('[WizardChat] Enviando mensagem para wizard-chat...', { userText, currentChatId });
      
      const { data, error } = await supabase.functions.invoke("wizard-chat", {
        body: { message: userText, chatId: currentChatId },
      });
      
      console.log('[WizardChat] Resposta recebida:', { data, error });
      if (error) throw error;

      const resolvedChatId = (data as any)?.chatId || currentChatId;
      if (!currentChatId && resolvedChatId) {
        setCurrentChatId(resolvedChatId);
        await loadChats();
      }

      if (resolvedChatId) await loadMessages(resolvedChatId);
    } catch (err: any) {
      console.error('[WizardChat] ERRO COMPLETO:', err);
      console.error('[WizardChat] Tipo do erro:', typeof err, err?.constructor?.name);
      console.error('[WizardChat] Mensagem:', err?.message);
      console.error('[WizardChat] Stack:', err?.stack);
      
      // Remove a otimista
      setMessages((prev) => prev.filter((m) => m.id !== tempId));

      const errorMsg = err?.message || String(err);
      const isNetworkError = errorMsg.toLowerCase().includes('failed to fetch') || 
                            errorMsg.toLowerCase().includes('network') ||
                            err?.name === 'TypeError';
      
      const description = isNetworkError
        ? `Erro de rede ao chamar wizard-chat. Verifique: (1) Se a função está implantada no Supabase, (2) Se OPENAI_API_KEY está configurada nas Secrets, (3) Logs da função para mais detalhes. Erro: ${errorMsg}`
        : `Erro: ${errorMsg}`;

      toast({
        title: "Falha ao enviar",
        description,
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

  const generateChatPDF = async () => {
    if (messages.length === 0) {
      toast({ 
        title: "Nenhuma conversa", 
        description: "Não há mensagens para exportar", 
        variant: "destructive" 
      });
      return;
    }

    try {
      setIsLoading(true);

      // Preparar dados do chat
      const currentChat = chats.find(c => c.id === currentChatId);
      const chatTitle = currentChat?.title || "Conversa";
      const now = new Date();
      const dateStr = now.toLocaleDateString('pt-BR');
      const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      // Criar documento PDF (100% client-side, sem chamadas externas)
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 15;
      const contentWidth = pageWidth - (2 * margin);
      let yPosition = margin;

      // Cabeçalho
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('BuffetWiz', margin, yPosition);
      yPosition += 8;

      doc.setFontSize(14);
      doc.text(chatTitle, margin, yPosition);
      yPosition += 6;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(`${dateStr} ${timeStr}`, margin, yPosition);
      yPosition += 10;

      // Linha separadora
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;

      // Mensagens
      for (const msg of messages) {
        // Nova página se necessário
        if (yPosition > pageHeight - 30) {
          doc.addPage();
          yPosition = margin;
        }

        // Papel do remetente (sem ícones)
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(msg.role === 'user' ? 'Você:' : 'Assistente:', margin, yPosition);
        yPosition += 6;

        // Conteúdo
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);

        if (msg.content.includes('|')) {
          // Tabelas em markdown
          yPosition = renderMarkdownTables(
            doc,
            msg.content,
            margin + 5,
            yPosition,
            contentWidth - 10,
            pageHeight,
            margin
          );
        } else {
          // Texto normal com quebra de linha automática
          const lines = doc.splitTextToSize(msg.content, contentWidth - 10);
          doc.text(lines, margin + 5, yPosition);
          yPosition += (lines.length * 5) + 5;
        }

        yPosition += 3; // Espaço entre mensagens (reduzido)
      }

      // Salvar PDF
      const safeTitle = chatTitle.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '_');
      const filename = `BuffetWiz_${safeTitle}_${dateStr.replace(/\//g, '-')}.pdf`;
      doc.save(filename);

      toast({ title: 'PDF exportado', description: `${filename} foi baixado com sucesso` });
    } catch (err) {
      console.error('❌ Erro ao gerar PDF:', err);
      toast({ 
        title: 'Erro ao exportar', 
        description: 'Não foi possível gerar o PDF', 
        variant: 'destructive' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  function renderMarkdownTables(
    doc: any,
    content: string,
    x: number,
    y: number,
    maxWidth: number,
    pageHeight: number,
    margin: number
  ): number {
    let currentY = y;
    
    // Dividir conteúdo em blocos (texto normal vs tabelas)
    const lines = content.split('\n');
    let currentBlock: string[] = [];
    let isTable = false;
    
    for (const line of lines) {
      const isTableLine = line.trim().startsWith('|');
      
      if (isTableLine && !isTable) {
        // Renderizar texto acumulado antes da tabela
        if (currentBlock.length > 0) {
          const text = currentBlock.join(' ');
          const textLines = doc.splitTextToSize(text, maxWidth);
          doc.text(textLines, x, currentY);
          currentY += (textLines.length * 5) + 5;
          currentBlock = [];
        }
        isTable = true;
      } else if (!isTableLine && isTable) {
        // Fim da tabela, renderizar
        if (currentBlock.length > 0) {
          currentY = renderTable(doc, currentBlock, x, currentY, maxWidth, pageHeight, margin);
          currentBlock = [];
        }
        isTable = false;
      }
      
      currentBlock.push(line);
    }
    
    // Renderizar bloco final
    if (currentBlock.length > 0) {
      if (isTable) {
        currentY = renderTable(doc, currentBlock, x, currentY, maxWidth, pageHeight, margin);
      } else {
        const text = currentBlock.join(' ');
        const textLines = doc.splitTextToSize(text, maxWidth);
        doc.text(textLines, x, currentY);
        currentY += (textLines.length * 5) + 5;
      }
    }
    
    return currentY;
  }

  function renderTable(
    doc: any,
    tableLines: string[],
    x: number,
    y: number,
    maxWidth: number,
    pageHeight: number,
    margin: number
  ): number {
    // Parse tabela markdown
    const rows: string[][] = [];
    let headerRow: string[] = [];
    
    for (let i = 0; i < tableLines.length; i++) {
      const line = tableLines[i].trim();
      if (!line.startsWith('|')) continue;
      
      // Remover pipes do início/fim e dividir
      const cells = line
        .slice(1, -1)
        .split('|')
        .map(c => c.trim());
      
      if (i === 0) {
        headerRow = cells;
      } else if (i === 1) {
        // Linha separadora, ignorar
        continue;
      } else {
        rows.push(cells);
      }
    }
    
    if (headerRow.length === 0) return y;
    
    // Calcular largura das colunas
    const colWidth = maxWidth / headerRow.length;
    let currentY = y;
    
    // Verificar se precisa nova página
    if (currentY > pageHeight - 40) {
      doc.addPage();
      currentY = margin;
    }
    
    // Header com fundo cinza
    doc.setFillColor(240, 240, 240);
    doc.rect(x, currentY - 4, maxWidth, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    
    headerRow.forEach((cell, i) => {
      doc.text(cell, x + (i * colWidth) + 2, currentY);
    });
    currentY += 8;
    
    // Linhas de dados
    doc.setFont('helvetica', 'normal');
    const tableStartY = y - 4;
    rows.forEach(row => {
      // Verificar se precisa nova página
      if (currentY > pageHeight - 20) {
        doc.addPage();
        currentY = margin;
      }
      
      row.forEach((cell, i) => {
        doc.text(cell, x + (i * colWidth) + 2, currentY);
      });
      currentY += 6;
    });
    
    // Borda da tabela (somente se não houve quebra de página)
    if (currentY < pageHeight - 20) {
      doc.setDrawColor(200, 200, 200);
      doc.rect(x, tableStartY, maxWidth, currentY - tableStartY + 4);
    }
    
    return currentY + 5;
  }

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
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
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
                  <Button variant="ghost" size="sm" onClick={generateChatPDF} disabled={isLoading}>
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
