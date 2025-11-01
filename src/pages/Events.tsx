import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { Plus, Search, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useNavigate, useSearchParams } from "react-router-dom"
import { MainLayout } from "@/components/layout/MainLayout"
import { PageHeader } from "@/components/ui/page-header"
import { EventForm } from "@/components/events/EventForm"
import { EventMenu } from "@/components/events/EventMenu"
import { EventCard } from "@/components/ui/event-card"
import { useToast } from "@/hooks/use-toast"
import { getDeletedMessage } from "@/lib/utils"
import { getSupabaseErrorMessage } from "@/lib/errorHandler"

interface Event {
  id: string;
  title: string;
  customer: string;
  date: string | null;
  time: string | null;
  duration: number | null;
  location: string | null;
  type: string | null;
  status: string | null;
  numguests: number | null;
  cost: number | null;
  price: number | null;
  description: string | null;
  customer_info?: {
    name: string;
  };
}

export default function Events() {
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isMenuDialogOpen, setIsMenuDialogOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [selectedEventForMenu, setSelectedEventForMenu] = useState<Event | null>(null)
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

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
      return data as any[];
    }
  });

  // Delete event mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // First delete event_menu items in cascade
      const { error: menuError } = await supabase
        .from("event_menu")
        .delete()
        .eq("event", id);
      
      if (menuError) throw menuError;

      // Then delete the event
      const { error } = await supabase
        .from("event")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      // Force refresh of all event-related queries
      queryClient.refetchQueries({ queryKey: ["events"] });
      queryClient.refetchQueries({ queryKey: ["dashboard-events"] });
      toast({
        title: getDeletedMessage("evento", "m")
      });
    },
    onError: (error: any) => {
      const friendlyError = getSupabaseErrorMessage(error);
      toast({
        title: friendlyError.title,
        description: friendlyError.description,
        variant: "destructive"
      });
    }
  });

  // Handle URL query parameters for edit mode
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && events) {
      const eventToEdit = events.find(event => event.id.toString() === editId);
      if (eventToEdit) {
        setEditingEvent(eventToEdit);
        setIsDialogOpen(true);
        // Clear the edit parameter from URL
        setSearchParams({});
      }
    }
  }, [events, searchParams, setSearchParams]);

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

  const handleDeleteEvent = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleOpenMenu = (event: Event) => {
    setSelectedEventForMenu(event);
    setIsMenuDialogOpen(true);
  };

  const handleFormSuccess = () => {
    setIsDialogOpen(false);
    setEditingEvent(null);
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
        <PageHeader
          title="Eventos"
          subtitle="Gerencie eventos gastronômicos"
        >
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
                onCancel={() => {
                  setIsDialogOpen(false);
                  setEditingEvent(null);
                }}
              />
            </DialogContent>
          </Dialog>
        </PageHeader>

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
            <EventCard
              key={event.id}
              id={event.id.toString()}
              title={event.title}
              date={event.date || ''}
              time={event.time}
              location={event.location}
              guests={event.numguests}
              budget={event.price}
              cost={event.cost}
              status={event.status as "confirmado" | "planejamento" | "concluido" | "cancelado"}
              description={event.description}
              duration={event.duration}
              customerName={event.customer_info?.name}
              onEdit={(id) => handleEditEvent(event)}
              onDelete={(id) => handleDeleteEvent(event.id)}
              onMenu={(id) => handleOpenMenu(event)}
            />
          ))}
        </div>

        {filteredEvents.length === 0 && !isLoading && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              {searchTerm ? `Nenhum evento encontrado para "${searchTerm}"` : "Nenhum evento cadastrado"}
            </p>
            <Button onClick={handleCreateEvent} variant="outline" className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              {searchTerm ? "Criar Novo Evento" : "Adicionar primeiro evento"}
            </Button>
          </div>
        )}

        {/* Menu Dialog */}
        <Dialog open={isMenuDialogOpen} onOpenChange={setIsMenuDialogOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Menu do Evento</DialogTitle>
            </DialogHeader>
            {selectedEventForMenu && (
              <EventMenu
                eventId={selectedEventForMenu.id}
                eventTitle={selectedEventForMenu.title}
                eventDescription={selectedEventForMenu.description || undefined}
                customerName={selectedEventForMenu.customer_info?.name}
                eventDate={selectedEventForMenu.date}
                eventTime={selectedEventForMenu.time}
                eventDuration={selectedEventForMenu.duration}
                eventLocation={selectedEventForMenu.location}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  )
}