import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { Plus, Search, Filter, Edit, Trash2, Eye, Calendar, Users, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { MainLayout } from "@/components/layout/MainLayout"
import { EventForm } from "@/components/events/EventForm"
import { useToast } from "@/hooks/use-toast"
import { formatDateWithoutTimezone, formatTimeWithoutSeconds, formatCurrency } from "@/lib/utils"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

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
  price: number | null;
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
    deleteMutation.mutate(id);
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
      <div className="space-y-8 page-fade-in">
        {/* Enhanced Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">Eventos</h1>
            <p className="text-muted-foreground text-lg">Gerencie eventos gastronômicos</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleCreateEvent} className="shadow-button hover-glow">
                <Plus className="h-4 w-4 mr-2" />
                Novo Evento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto glass-effect">
              <DialogHeader>
                <DialogTitle className="text-2xl">
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

        {/* Enhanced Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar eventos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 glass-effect border-primary/20 focus:border-primary/40 focus:shadow-glow"
          />
        </div>

        {/* Enhanced Events Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
          {filteredEvents.map((event) => (
            <Card key={event.id} className="h-full gradient-card hover-lift shadow-card border-0 group">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">
                      {event.title}
                    </CardTitle>
                    <CardDescription className="font-medium">
                      {event.customer_info?.name}
                    </CardDescription>
                  </div>
                  <Badge 
                    variant={getStatusBadgeVariant(event.status)}
                    className="shadow-sm"
                  >
                    {event.status || "planejamento"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {event.date && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="font-medium">
                      {formatDateWithoutTimezone(event.date)}
                      {event.time && ` às ${formatTimeWithoutSeconds(event.time)}`}
                    </span>
                  </div>
                )}
                
                {event.location && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-4 w-4 rounded-full bg-accent flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    </div>
                    <span>{event.location}</span>
                  </div>
                )}
                
                {event.type && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Tipo:</span>{" "}
                    <span className="font-medium">{event.type}</span>
                  </div>
                )}
                
                <div className="grid grid-cols-3 gap-3 text-sm">
                  {event.numguests && (
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-primary" />
                      <span className="font-medium">{event.numguests}</span>
                    </div>
                  )}
                  {event.valor && (
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3 text-success" />
                      <span className="font-medium">
                        {formatCurrency(event.valor)}
                      </span>
                    </div>
                  )}
                  {event.price && (
                    <div className="flex items-center gap-1 text-primary">
                      <DollarSign className="h-3 w-3" />
                      <span className="font-medium">
                        {formatCurrency(event.price)}
                      </span>
                    </div>
                  )}
                </div>
                
                {event.description && (
                  <div className="text-sm text-muted-foreground bg-accent/30 p-3 rounded-lg">
                    {event.description}
                  </div>
                )}
                
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditEvent(event)}
                    className="flex-1 hover:bg-primary/10 hover:border-primary/40"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={deleteMutation.isPending}
                        className="hover:bg-destructive/10 hover:border-destructive/40 hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                         <AlertDialogDescription>
                           Tem certeza que deseja excluir o evento "{event.title}"? Esta ação não pode ser desfeita.
                         </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteEvent(event.id)}>
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredEvents.length === 0 && !isLoading && (
          <div className="text-center py-16 space-y-4">
            <div className="w-16 h-16 rounded-full bg-accent/30 flex items-center justify-center mx-auto">
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="text-muted-foreground text-lg font-medium">
                {searchTerm ? `Nenhum evento encontrado para "${searchTerm}"` : "Nenhum evento cadastrado"}
              </p>
              <p className="text-sm text-muted-foreground/60 mt-1">
                {searchTerm ? "Tente buscar com outros termos" : "Comece criando seu primeiro evento"}
              </p>
            </div>
            <Button onClick={handleCreateEvent} variant="outline" className="mt-6 hover-lift shadow-button">
              <Plus className="h-4 w-4 mr-2" />
              {searchTerm ? "Criar Novo Evento" : "Criar Primeiro Evento"}
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  )
}