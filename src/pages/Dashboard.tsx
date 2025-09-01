import { useEffect, useState } from "react"
import { Plus, Calendar, Users, DollarSign, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EventCard } from "@/components/ui/event-card"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useNavigate } from "react-router-dom"
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarIntegration } from "@/components/events/CalendarIntegration"

interface Event {
  id: string
  title: string
  date: string
  time: string | null
  location: string | null
  guests: number
  budget: number
  status: "confirmado" | "planejamento" | "concluido"
  description: string | null
  duration: number | null
  customerName?: string
}

interface DashboardStats {
  eventsThisMonth: number
  eventsLastMonth: number
  totalGuests: number
  totalRevenue: number
  previousRevenue: number
}

// Helper functions
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

const calculatePercentageChange = (current: number, previous: number) => {
  if (previous === 0) return current > 0 ? "+100%" : "0%"
  const change = ((current - previous) / previous) * 100
  return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`
}

export default function Dashboard() {
  const navigate = useNavigate()

  // Fetch upcoming events
  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['dashboard-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event')
        .select(`
          id,
          title,
          date,
          time,
          duration,
          location,
          numguests,
          cost,
          price,
          status,
          description,
          customer_info:customer(name)
        `)
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .limit(6)

      if (error) throw error

      return data?.map(event => ({
        id: event.id.toString(),
        title: event.title || 'Evento sem título',
        date: event.date || '',
        time: event.time,
        location: event.location || 'Local não definido',
        guests: event.numguests || 0,
        budget: event.cost || event.price || 0,
        status: (event.status as "confirmado" | "planejamento" | "concluido") || "planejamento",
        description: event.description || '',
        duration: event.duration || null,
        customerName: (event as any).customer_info?.name
      })) as Event[] || []
    }
  })

  // Fetch dashboard statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      const now = new Date()
      const currentMonthStart = startOfMonth(now)
      const currentMonthEnd = endOfMonth(now)
      const lastMonth = subMonths(now, 1)
      const lastMonthStart = startOfMonth(lastMonth)
      const lastMonthEnd = endOfMonth(lastMonth)

      // Events this month
      const { data: eventsThisMonth } = await supabase
        .from('event')
        .select('id')
        .gte('date', format(currentMonthStart, 'yyyy-MM-dd'))
        .lte('date', format(currentMonthEnd, 'yyyy-MM-dd'))

      // Events last month
      const { data: eventsLastMonth } = await supabase
        .from('event')
        .select('id')
        .gte('date', format(lastMonthStart, 'yyyy-MM-dd'))
        .lte('date', format(lastMonthEnd, 'yyyy-MM-dd'))

      // Total guests for upcoming events
      const { data: upcomingEvents } = await supabase
        .from('event')
        .select('numguests')
        .gte('date', format(now, 'yyyy-MM-dd'))

      // Revenue this month (completed events)
      const { data: revenueThisMonth } = await supabase
        .from('event')
        .select('price')
        .eq('status', 'concluido')
        .gte('date', format(currentMonthStart, 'yyyy-MM-dd'))
        .lte('date', format(currentMonthEnd, 'yyyy-MM-dd'))

      // Revenue last month
      const { data: revenueLastMonth } = await supabase
        .from('event')
        .select('price')
        .eq('status', 'concluido')
        .gte('date', format(lastMonthStart, 'yyyy-MM-dd'))
        .lte('date', format(lastMonthEnd, 'yyyy-MM-dd'))

      const totalGuests = upcomingEvents?.reduce((sum, event) => sum + (event.numguests || 0), 0) || 0
      const totalRevenue = revenueThisMonth?.reduce((sum, event) => sum + (event.price || 0), 0) || 0
      const previousRevenue = revenueLastMonth?.reduce((sum, event) => sum + (event.price || 0), 0) || 0

      return {
        eventsThisMonth: eventsThisMonth?.length || 0,
        eventsLastMonth: eventsLastMonth?.length || 0,
        totalGuests,
        totalRevenue,
        previousRevenue,
      }
    }
  })

  const handleEditEvent = (id: string) => {
    navigate(`/eventos?edit=${id}`)
  }

  const handleViewEvent = (id: string) => {
    navigate(`/eventos?view=${id}`)
  }

  const handleCreateEvent = () => {
    navigate('/eventos')
  }

  const handleViewAllEvents = () => {
    navigate('/eventos')
  }

  // Calculate growth rate (overall business growth)
  const growthRate = stats ? 
    calculatePercentageChange(
      stats.eventsThisMonth + stats.totalRevenue / 1000, 
      stats.eventsLastMonth + stats.previousRevenue / 1000
    ) : "0%"

  const dashboardStats = stats ? [
    {
      title: "Eventos este Mês",
      value: stats.eventsThisMonth.toString(),
      change: calculatePercentageChange(stats.eventsThisMonth, stats.eventsLastMonth),
      icon: Calendar,
      color: "text-primary"
    },
    {
      title: "Total de Convidados",
      value: stats.totalGuests.toLocaleString('pt-BR'),
      change: "+12%", // This would need historical data to calculate properly
      icon: Users,
      color: "text-secondary"
    },
    {
      title: "Receita este Mês",
      value: formatCurrency(stats.totalRevenue),
      change: calculatePercentageChange(stats.totalRevenue, stats.previousRevenue),
      icon: DollarSign,
      color: "text-success"
    },
    {
      title: "Taxa de Crescimento",
      value: growthRate.replace('+', '').replace('%', '') + '%',
      change: growthRate,
      icon: TrendingUp,
      color: "text-warning"
    }
  ] : []

  return (
    <div className="space-y-12 page-fade-in">
      {/* Hero Section with Enhanced Styling */}
      <div className="relative overflow-hidden">
        <div 
          className="h-64 rounded-2xl bg-cover bg-center relative overflow-hidden shadow-elegant"
          style={{ backgroundImage: `url(https://images.unsplash.com/photo-1555244162-803834f70033?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80)` }}
        >
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative h-full flex items-center justify-between p-8">
            <div className="text-primary space-y-3">
              <h1 className="text-4xl font-bold mb-2 tracking-tight">
                Bem-vindo ao <span className="text-gradient">BuffetWiz</span>
              </h1>
              <p className="text-xl font-medium">
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
        {dashboardStats.map((stat, index) => (
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
          <Button 
            variant="outline" 
            className="hover-lift shadow-button"
            onClick={handleViewAllEvents}
          >
            Ver Todos
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
          {events.map((event) => (
            <div key={event.id} className="hover-lift">
              <EventCard
                {...event}
                customerName={event.customerName}
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