import { useState } from "react"
import { Plus, Search, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { EventCard } from "@/components/ui/event-card"
import { MainLayout } from "@/components/layout/MainLayout"

// Extended mock data
const mockEvents = [
  {
    id: "1",
    title: "Casamento Silva & Santos",
    date: "2024-09-15",
    location: "Quinta da Baronesa, São Paulo",
    guests: 150,
    budget: 25000,
    status: "confirmado" as const,
    description: "Cerimônia e recepção com cardápio executivo e open bar premium"
  },
  {
    id: "2", 
    title: "Festa de Aniversário - 50 Anos",
    date: "2024-09-22",
    location: "Clube Athletico, Rio de Janeiro",
    guests: 80,
    budget: 12000,
    status: "planejamento" as const,
    description: "Festa temática anos 80 com DJ e cardápio de finger foods"
  },
  {
    id: "3",
    title: "Evento Corporativo - Tech Summit",
    date: "2024-08-28",
    location: "Centro de Convenções, Brasília",
    guests: 300,
    budget: 45000,
    status: "concluido" as const,
    description: "Coffee break, almoço executivo e cocktail de encerramento"
  },
  {
    id: "4",
    title: "Formatura Medicina UFRJ",
    date: "2024-10-05",
    location: "Hotel Copacabana Palace, Rio de Janeiro",
    guests: 200,
    budget: 38000,
    status: "confirmado" as const,
    description: "Jantar de gala com menu degustação e show musical"
  },
  {
    id: "5",
    title: "Confraternização Empresa XYZ",
    date: "2024-12-15",
    location: "Espaço Villa Country, São Paulo",
    guests: 120,
    budget: 18000,
    status: "planejamento" as const,
    description: "Festa de fim de ano com churrasco premium e apresentações"
  }
]

export default function Events() {
  const [events] = useState(mockEvents)
  const [searchTerm, setSearchTerm] = useState("")

  const filteredEvents = events.filter(event =>
    event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.location.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleEditEvent = (id: string) => {
    console.log("Edit event:", id)
    // TODO: Navigate to edit page
  }

  const handleViewEvent = (id: string) => {
    console.log("View event:", id)
    // TODO: Navigate to event details
  }

  const handleCreateEvent = () => {
    console.log("Create new event")
    // TODO: Navigate to create event page
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Eventos</h1>
            <p className="text-muted-foreground">Gerencie todos os seus eventos gastronômicos</p>
          </div>
          <Button onClick={handleCreateEvent} variant="premium">
            <Plus className="h-4 w-4" />
            Novo Evento
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar eventos por nome ou local..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline">
            <Filter className="h-4 w-4" />
            Filtros
          </Button>
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => (
            <EventCard
              key={event.id}
              {...event}
              onEdit={handleEditEvent}
              onView={handleViewEvent}
            />
          ))}
        </div>

        {filteredEvents.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">Nenhum evento encontrado</p>
            <Button onClick={handleCreateEvent} variant="outline" className="mt-4">
              Criar Primeiro Evento
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  )
}