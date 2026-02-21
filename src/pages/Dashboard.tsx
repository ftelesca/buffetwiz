import { useEffect, useState } from "react"
import { Plus, Calendar, Users, DollarSign, TrendingUp, ChefHat, ShoppingCart, UserRound, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EventCard } from "@/components/ui/event-card"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useNavigate } from "react-router-dom"
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EventMenu } from "@/components/events/EventMenu"
import { EventStatus, DEFAULT_EVENT_STATUS } from "@/constants/events"
import { formatCurrency } from "@/lib/utils"

interface Event {
  id: string
  title: string
  date: string
  time: string | null
  location: string | null
  guests: number
  budget: number
  cost: number
  status: EventStatus
  description: string | null
  duration: number | null
  customerName?: string
}

interface DashboardStats {
  eventsThisMonth: number
  eventsLastMonth: number
  totalGuests: number
  previousGuests: number
  totalRevenue: number
  previousRevenue: number
}

// Helper functions
const calculatePercentageChange = (current: number, previous: number) => {
  if (previous === 0) return current > 0 ? "+100%" : "0%"
  const change = ((current - previous) / previous) * 100
  return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [isMenuDialogOpen, setIsMenuDialogOpen] = useState(false)
  const [selectedEventForMenu, setSelectedEventForMenu] = useState<Event | null>(null)

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
        id: (event as any).id.toString(),
        title: (event as any).title || 'Evento sem título',
        date: (event as any).date || '',
        time: (event as any).time,
        location: (event as any).location || 'Local não definido',
        guests: (event as any).numguests || 0,
        budget: (event as any).price || 0,
        cost: (event as any).cost || 0, // Exibindo diretamente event.cost
        status: ((event as any).status as EventStatus) || DEFAULT_EVENT_STATUS,
        description: (event as any).description || '',
        duration: (event as any).duration || null,
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

      // Total guests for events this month (entire month)
      const { data: guestsThisMonth } = await supabase
        .from('event')
        .select('numguests')
        .gte('date', format(currentMonthStart, 'yyyy-MM-dd'))
        .lte('date', format(currentMonthEnd, 'yyyy-MM-dd'))

      // Total guests for events last month
      const { data: guestsLastMonth } = await supabase
        .from('event')
        .select('numguests')
        .gte('date', format(lastMonthStart, 'yyyy-MM-dd'))
        .lte('date', format(lastMonthEnd, 'yyyy-MM-dd'))

      // Revenue this month (completed events)
      const { data: revenueThisMonth } = await supabase
        .from('event')
        .select('price')
        .gte('date', format(currentMonthStart, 'yyyy-MM-dd'))
        .lte('date', format(currentMonthEnd, 'yyyy-MM-dd'))

      // Revenue last month
      const { data: revenueLastMonth } = await supabase
        .from('event')
        .select('price')
        .gte('date', format(lastMonthStart, 'yyyy-MM-dd'))
        .lte('date', format(lastMonthEnd, 'yyyy-MM-dd'))

      const totalGuests = guestsThisMonth?.reduce((sum, event) => sum + (event.numguests || 0), 0) || 0
      const previousGuests = guestsLastMonth?.reduce((sum, event) => sum + (event.numguests || 0), 0) || 0
      const totalRevenue = (revenueThisMonth || []).reduce((sum: number, e: any) => sum + (e?.price ? Number(e.price) : 0), 0) || 0
      const previousRevenue = (revenueLastMonth || []).reduce((sum: number, e: any) => sum + (e?.price ? Number(e.price) : 0), 0) || 0

      return {
        eventsThisMonth: eventsThisMonth?.length || 0,
        eventsLastMonth: eventsLastMonth?.length || 0,
        totalGuests,
        previousGuests,
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

  const handleDeleteEvent = (id: string) => {
    navigate(`/eventos?delete=${id}`)
  }

  const handleOpenMenu = (id: string) => {
    const event = events?.find(e => e.id === id)
    if (event) {
      setSelectedEventForMenu(event)
      setIsMenuDialogOpen(true)
    }
  }

  const handleCreateEvent = () => {
    navigate('/eventos')
  }

  const handleViewAllEvents = () => {
    navigate('/eventos')
  }
  const quickActions = [
    {
      title: "Novo Cliente",
      subtitle: "Cadastre contatos e histórico",
      icon: UserRound,
      onClick: () => navigate("/clientes"),
    },
    {
      title: "Novo Produto",
      subtitle: "Monte cardápios e rendimentos",
      icon: ChefHat,
      onClick: () => navigate("/cardapios"),
    },
    {
      title: "Gerir Insumos",
      subtitle: "Atualize custo e estoque base",
      icon: ShoppingCart,
      onClick: () => navigate("/insumos"),
    },
  ]

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
      change: calculatePercentageChange(stats.totalGuests, stats.previousGuests),
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
      <div className="relative overflow-hidden rounded-3xl border border-border/50 p-8 md:p-10 gradient-hero shadow-elegant">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_90%_10%,hsl(var(--background)/0.25),transparent_45%)]" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="text-primary-foreground space-y-3">
            <p className="text-xs uppercase tracking-[0.18em] text-primary-foreground/80">Cockpit</p>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Bem-vindo ao BuffetWiz
            </h1>
            <p className="text-lg font-medium text-primary-foreground/90">
              Planeje, precifique e acompanhe seus eventos com clareza.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="lg"
              onClick={handleCreateEvent}
              className="bg-background/15 border border-background/40 text-primary-foreground hover:bg-background/25"
            >
              <Plus className="h-5 w-5 mr-2" />
              Novo Evento
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {quickActions.map((action) => (
          <button
            key={action.title}
            onClick={action.onClick}
            className="text-left rounded-2xl border border-border/60 bg-card/90 p-5 shadow-card transition-smooth hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card"
          >
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent/70">
              <action.icon className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-base font-semibold">{action.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{action.subtitle}</p>
            <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary">
              Abrir <ArrowRight className="h-4 w-4" />
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 stagger-children">
        {dashboardStats.map((stat, index) => (
          <Card key={index} className="hover-lift shadow-card border-border/60 bg-card/85 group rounded-2xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {stat.title}
              </CardTitle>
              <div className="p-2 rounded-lg bg-accent/65 group-hover:bg-primary/10 transition-colors">
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

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Próximos Eventos</h2>
            <p className="text-muted-foreground mt-1">Acompanhe seus eventos mais importantes</p>
          </div>
          <Button 
            variant="outline" 
            className="hover-lift"
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
                onMenu={handleOpenMenu}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Menu Dialog */}
      <Dialog open={isMenuDialogOpen} onOpenChange={setIsMenuDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto glass-effect">
          <DialogHeader>
            <DialogTitle className="text-2xl">Menu do Evento</DialogTitle>
          </DialogHeader>
          {selectedEventForMenu && (
            <EventMenu
              eventId={selectedEventForMenu.id}
              eventTitle={selectedEventForMenu.title}
              eventDescription={selectedEventForMenu.description || undefined}
              customerName={selectedEventForMenu.customerName}
              eventDate={selectedEventForMenu.date}
              eventTime={selectedEventForMenu.time}
              eventDuration={selectedEventForMenu.duration}
              eventLocation={selectedEventForMenu.location}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
