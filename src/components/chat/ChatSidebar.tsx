import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  X, 
  Search, 
  Plus, 
  MessageSquare,
  Clock,
  Trash2,
  Download,
  Star,
  Archive
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: any[];
  summary?: string;
  embedding?: number[];
}

interface ChatSidebarProps {
  open: boolean;
  sessions: ChatSession[];
  currentSession: ChatSession | null;
  onSessionSelect: (session: ChatSession) => void;
  onNewSession: () => void;
  onClose: () => void;
  onDeleteSession?: (sessionId: string) => void;
  onExportSession?: (sessionId: string) => void;
  onArchiveSession?: (sessionId: string) => void;
}

export function ChatSidebar({
  open,
  sessions,
  currentSession,
  onSessionSelect,
  onNewSession,
  onClose,
  onDeleteSession,
  onExportSession,
  onArchiveSession
}: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);

  const filteredSessions = sessions.filter(session =>
    session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    session.summary?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedSessions = {
    today: filteredSessions.filter(s => isToday(s.updatedAt)),
    yesterday: filteredSessions.filter(s => isYesterday(s.updatedAt)),
    thisWeek: filteredSessions.filter(s => isThisWeek(s.updatedAt) && !isToday(s.updatedAt) && !isYesterday(s.updatedAt)),
    older: filteredSessions.filter(s => !isThisWeek(s.updatedAt))
  };

  function isToday(date: string) {
    const today = new Date();
    const sessionDate = new Date(date);
    return sessionDate.toDateString() === today.toDateString();
  }

  function isYesterday(date: string) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const sessionDate = new Date(date);
    return sessionDate.toDateString() === yesterday.toDateString();
  }

  function isThisWeek(date: string) {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const sessionDate = new Date(date);
    return sessionDate > weekAgo;
  }

  function formatTime(timestamp: string) {
    return formatDistanceToNow(new Date(timestamp), {
      addSuffix: true
    });
  }

  function getMessageCount(session: ChatSession) {
    return session.messages?.length || 0;
  }

  function getLastMessage(session: ChatSession) {
    const messages = session.messages || [];
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return "";
    
    const content = lastMessage.content;
    return content.length > 60 ? content.substring(0, 60) + "..." : content;
  }

  if (!open) return null;

  return (
    <div className="flex-none shrink-0 w-80 bg-background border-r border-border flex flex-col h-full min-h-0 overflow-hidden relative z-0">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b bg-background/50">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm">Conversas</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <Button
          onClick={onNewSession}
          className="w-full mb-3"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova Conversa
        </Button>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar conversas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-8 text-sm"
          />
        </div>
      </div>

      {/* Sessions List */}
      <div className="flex-1 min-h-0 overflow-y-auto relative z-0">
        <div className="p-2">
          {filteredSessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Nenhuma conversa encontrada</p>
            </div>
          ) : (
            <>
              {Object.entries(groupedSessions).map(([period, periodSessions]) => {
                if (periodSessions.length === 0) return null;
                
                const periodLabels = {
                  today: "Hoje",
                  yesterday: "Ontem", 
                  thisWeek: "Esta semana",
                  older: "Mais antigas"
                };

                return (
                  <ul className="space-y-2">
                    {periodSessions.map((session) => (
                      <li key={session.id} className="list-none">
                        <button
                          type="button"
                          onClick={() => onSessionSelect(session)}
                          className={cn(
                            "w-full box-border text-left rounded-md border border-border/40 bg-card hover:bg-accent/50 transition-colors p-3 overflow-hidden",
                            currentSession?.id === session.id && "bg-accent border-border/60"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm truncate mb-1">
                                {session.title}
                              </h4>
                              {getLastMessage(session) && (
                                <p className="text-xs text-muted-foreground truncate mb-2">
                                  {getLastMessage(session)}
                                </p>
                              )}
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground flex items-center whitespace-nowrap">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {formatTime(session.updatedAt)}
                                </span>
                                {getMessageCount(session) > 0 && (
                                  <Badge variant="secondary" className="text-xs h-4">
                                    {getMessageCount(session)}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {onExportSession && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onExportSession(session.id);
                                  }}
                                  title="Exportar conversa"
                                >
                                  <Download className="h-3 w-3" />
                                </Button>
                              )}
                              {onArchiveSession && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onArchiveSession(session.id);
                                  }}
                                  title="Arquivar conversa"
                                >
                                  <Archive className="h-3 w-3" />
                                </Button>
                              )}
                              {onDeleteSession && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteSession(session.id);
                                  }}
                                  title="Excluir conversa"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 p-3 border-t bg-background/50">
        <div className="text-xs text-muted-foreground text-center">
          {sessions.length} conversa{sessions.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
}