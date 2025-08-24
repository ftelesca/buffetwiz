import { Calendar, MapPin, Users, DollarSign } from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface EventCardProps {
  id: string
  title: string
  date: string
  location: string
  guests: number
  budget: number
  status: "planejamento" | "confirmado" | "concluido" | "cancelado"
  description?: string
  onEdit?: (id: string) => void
  onView?: (id: string) => void
}

const statusConfig = {
  planejamento: { label: "Planejamento", className: "bg-warning text-warning-foreground" },
  confirmado: { label: "Confirmado", className: "bg-primary text-primary-foreground" },
  concluido: { label: "Concluído", className: "bg-success text-success-foreground" },
  cancelado: { label: "Cancelado", className: "bg-destructive text-destructive-foreground" },
}

export function EventCard({ 
  id, 
  title, 
  date, 
  location, 
  guests, 
  budget, 
  status, 
  description,
  onEdit,
  onView 
}: EventCardProps) {
  const statusInfo = statusConfig[status]

  return (
    <Card className="hover:shadow-card transition-all duration-300 border-border/50 hover:border-primary/30">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
            {description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
            )}
          </div>
          <Badge className={statusInfo.className}>
            {statusInfo.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{new Date(date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>{location}</span>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-primary" />
            <span>{guests} convidados</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="h-4 w-4 text-secondary" />
            <span>R$ {budget.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-3 gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1"
          onClick={() => onView?.(id)}
        >
          Visualizar
        </Button>
        <Button 
          variant="default" 
          size="sm" 
          className="flex-1"
          onClick={() => onEdit?.(id)}
        >
          Editar
        </Button>
      </CardFooter>
    </Card>
  )
}