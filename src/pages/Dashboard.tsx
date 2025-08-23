import { useState } from "react"
import { Plus, Calendar, Users, DollarSign, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EventCard } from "@/components/ui/event-card"
import heroImage from "@/assets/hero-buffet.jpg"

// Mock data - will be replaced with real data later
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
  }
]

const stats = [
  {
    title: "Eventos este Mês",
    value: "12",
    change: "+20%",
    icon: Calendar,
    color: "text-primary"
  },
  {
    title: "Total de Convidados",
    value: "1,847",
    change: "+12%", 
    icon: Users,
    color: "text-secondary"
  },
  {
    title: "Receita Total",
    value: "R$ 287.5K",
    change: "+18%",
    icon: DollarSign,
    color: "text-success"
  },
  {
    title: "Taxa de Crescimento",
    value: "15.3%",
    change: "+3%",
    icon: TrendingUp,
    color: "text-warning"
  }
]

export default function Dashboard() {
  const [events] = useState(mockEvents)

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
    <div className="space-y-8">
      {/* Header Section */}
      <div className="relative">
        <div 
          className="h-48 rounded-xl bg-cover bg-center relative overflow-hidden"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-secondary/80" />
          <div className="relative h-full flex items-center justify-between p-8">
            <div className="text-white">
              <h1 className="text-3xl font-bold mb-2">Bem-vindo ao BuffetWiz</h1>
              <p className="text-lg opacity-90">Gerencie seus eventos gastronômicos com excelência</p>
            </div>
            <Button 
              variant="hero" 
              size="lg"
              onClick={handleCreateEvent}
              className="shadow-2xl"
            >
              <Plus className="h-5 w-5" />
              Novo Evento
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="hover:shadow-card transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-success">
                {stat.change} em relação ao mês anterior
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Events Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Próximos Eventos</h2>
          <Button variant="outline">
            Ver Todos
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <EventCard
              key={event.id}
              {...event}
              onEdit={handleEditEvent}
              onView={handleViewEvent}
            />
          ))}
        </div>
      </div>
    </div>
  )
}