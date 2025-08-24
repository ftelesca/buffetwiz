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
    <div className="space-y-12 page-fade-in">
      {/* Hero Section with Enhanced Styling */}
      <div className="relative overflow-hidden">
        <div 
          className="h-64 rounded-2xl bg-cover bg-center relative overflow-hidden shadow-elegant"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="absolute inset-0 gradient-hero opacity-90" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/20 via-transparent to-transparent" />
          <div className="relative h-full flex items-center justify-between p-8">
            <div className="text-white space-y-3">
              <h1 className="text-4xl font-bold mb-2 tracking-tight">
                Bem-vindo ao <span className="text-gradient">BuffetWiz</span>
              </h1>
              <p className="text-xl opacity-95 font-medium">
                Gerencie seus eventos gastronômicos com excelência
              </p>
            </div>
            <Button 
              variant="secondary" 
              size="lg"
              onClick={handleCreateEvent}
              className="shadow-button hover-glow bg-primary/20 backdrop-blur-sm border-primary/30 text-primary-foreground hover:bg-primary/30"
            >
              <Plus className="h-5 w-5 mr-2" />
              Novo Evento
            </Button>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 stagger-children">
        {stats.map((stat, index) => (
          <Card key={index} className="gradient-card hover-lift shadow-card border-0 group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {stat.title}
              </CardTitle>
              <div className="p-2 rounded-lg bg-accent/50 group-hover:bg-primary/10 transition-colors">
                <stat.icon className={`h-5 w-5 ${stat.color} group-hover:scale-110 transition-transform`} />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-3xl font-bold tracking-tight">{stat.value}</div>
              <div className="flex items-center gap-1">
                <span className="text-sm text-success font-medium">{stat.change}</span>
                <span className="text-xs text-muted-foreground">vs mês anterior</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Enhanced Events Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Próximos Eventos</h2>
            <p className="text-muted-foreground mt-1">Acompanhe seus eventos mais importantes</p>
          </div>
          <Button variant="outline" className="hover-lift shadow-button">
            Ver Todos
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
          {events.map((event) => (
            <div key={event.id} className="hover-lift">
              <EventCard
                {...event}
                onEdit={handleEditEvent}
                onView={handleViewEvent}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}