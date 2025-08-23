import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { Plus, Search, Filter, Edit, Trash2, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { MainLayout } from "@/components/layout/MainLayout"
import { EventForm } from "@/components/events/EventForm"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface Event {
  id: number;
  title: string;
  customer: number;
  date: string | null;
  time: string | null;
  location: string | null;
  type: string | null;
  status: string | null;
  numguests: number | null;
  valor: number | null;
  description: string | null;
  customer_info?: {
    name: string;
  };
}

export default function Events() {
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch events with customer info
  const { data: events, isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event")
        .select(`
          *,
          customer_info:customer(name)
        `)
        .order("date", { ascending: false });
      
      if (error) throw error;
      return data as Event[];
    }
  });

  // Delete event mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from("event")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast({
        title: "Evento excluído",
        description: "Evento removido com sucesso."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: "Erro ao excluir evento: " + error.message,
        variant: "destructive"
      });
    }
  });

  const filteredEvents = events?.filter(event =>
    event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.customer_info?.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleCreateEvent = () => {
    setEditingEvent(null);
    setIsDialogOpen(true);
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setIsDialogOpen(true);
  };

  const handleDeleteEvent = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este evento?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleFormSuccess = () => {
    setIsDialogOpen(false);
    setEditingEvent(null);
  };

  const getStatusBadgeVariant = (status: string | null) => {
    switch (status) {
      case "confirmado":
        return "default";
      case "concluido":
        return "secondary";
      case "cancelado":
        return "destructive";
      default:
        return "outline";
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="h-8 bg-muted animate-pulse rounded" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Eventos</h1>
            <p className="text-muted-foreground">Gerencie todos os seus eventos gastronômicos</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleCreateEvent}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Evento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingEvent ? "Editar Evento" : "Novo Evento"}
                </DialogTitle>
              </DialogHeader>
              <EventForm
                eventId={editingEvent?.id}
                onSuccess={handleFormSuccess}
                onCancel={() => setIsDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar eventos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => (
            <Card key={event.id} className="h-full">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{event.title}</CardTitle>
                    <CardDescription>
                      {event.customer_info?.name}
                    </CardDescription>
                  </div>
                  <Badge variant={getStatusBadgeVariant(event.status)}>
                    {event.status || "planejamento"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {event.date && (
                  <div className="text-sm">
                    <strong>Data:</strong> {format(new Date(event.date), "dd/MM/yyyy", { locale: ptBR })}
                    {event.time && ` às ${event.time}`}
                  </div>
                )}
                
                {event.location && (
                  <div className="text-sm">
                    <strong>Local:</strong> {event.location}
                  </div>
                )}
                
                {event.type && (
                  <div className="text-sm">
                    <strong>Tipo:</strong> {event.type}
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {event.numguests && (
                    <div>
                      <strong>Convidados:</strong> {event.numguests}
                    </div>
                  )}
                  {event.valor && (
                    <div>
                      <strong>Valor:</strong> R$ {event.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  )}
                </div>
                
                {event.description && (
                  <div className="text-sm text-muted-foreground">
                    {event.description}
                  </div>
                )}
                
                <div className="flex gap-2 pt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditEvent(event)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteEvent(event.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredEvents.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              {searchTerm ? `Nenhum evento encontrado para "${searchTerm}"` : "Nenhum evento cadastrado"}
            </p>
            <Button onClick={handleCreateEvent} variant="outline" className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              {searchTerm ? "Criar Novo Evento" : "Criar Primeiro Evento"}
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  )
}