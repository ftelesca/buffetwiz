import { Calendar, Users, DollarSign, ChefHat, Edit } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatDateWithoutTimezone, formatCurrency } from "@/lib/utils"
import { formatTimeWithoutSeconds } from "@/lib/utils"
import { CalendarIntegration } from "@/components/events/CalendarIntegration"
import { EventDeleteConfirmation } from "@/components/events/EventDeleteConfirmation"
import { EventStatus, EVENT_STATUS_LABELS, DEFAULT_EVENT_STATUS } from "@/constants/events"

interface EventCardProps {
  id: string
  title: string
  date: string
  time?: string
  location?: string
  guests?: number
  budget: number
  cost?: number
  status: EventStatus
  description?: string
  duration?: number
  customerName?: string
  onEdit?: (id: string) => void
  onView?: (id: string) => void
  onDelete?: (id: string) => void
  onMenu?: (id: string) => void
}

const getStatusBadgeVariant = (status: string) => {
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
}

export function EventCard({ 
  id, 
  title, 
  date, 
  time,
  location, 
  guests, 
  budget,
  cost,
  status, 
  description,
  duration,
  customerName,
  onEdit,
  onView,
  onDelete,
  onMenu 
}: EventCardProps) {
  const formatDuration = (minutes?: number) => {
    if (!minutes) return null;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}min`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h${mins}min`;
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">
              {title}
            </CardTitle>
            <CardDescription className="font-medium truncate">
              {customerName}
            </CardDescription>
          </div>
          <Badge
            variant={getStatusBadgeVariant(status)}
          >
            {EVENT_STATUS_LABELS[status || DEFAULT_EVENT_STATUS]}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {date && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-primary" />
            <span>
              {formatDateWithoutTimezone(date)}
              {time && ` às ${formatTimeWithoutSeconds(time)}`}
              {duration && (
                <span className="ml-2 text-xs bg-accent/50 px-2 py-1 rounded">
                  {formatDuration(duration)}
                </span>
              )}
            </span>
          </div>
        )}
        
        {location && (
          <div className="flex items-center gap-2 text-sm">
            <div className="h-4 w-4 rounded-full bg-accent flex items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-primary" />
            </div>
            <span>{location}</span>
          </div>
        )}
        
        <div className="grid grid-cols-3 gap-3 text-sm">
          {guests && (
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3 text-primary" />
              <span>{guests}</span>
            </div>
          )}
          {cost && (
            <div className="flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-destructive" />
              <span>
                {formatCurrency(cost)}
              </span>
            </div>
          )}
          {budget && (
            <div className="flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-success" />
              <span>
                {formatCurrency(budget)}
              </span>
            </div>
          )}
        </div>
        
        {description && (
          <div className="text-sm text-muted-foreground bg-accent/30 p-3 rounded-lg">
            {description}
          </div>
        )}
        
        <div className="flex gap-2 pt-2 justify-end">
          {onMenu && (
            <Button
              size="sm"
              onClick={() => onMenu(id)}
              className="min-w-20"
            >
              <ChefHat className="h-3 w-3 mr-0.5" />
              Menu
            </Button>
          )}
          
          <CalendarIntegration 
            event={{
              title,
              client: customerName,
              description,
              location,
              startDate: date,
              startTime: time,
              duration
            }}
            size="sm"
            variant="outline"
          />

          {onView && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onView(id)}
              className="min-w-20"
            >
              Visualizar
            </Button>
          )}

          <div className="flex gap-1 justify-center">
            {onEdit && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onEdit(id)}
                title="Editar"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            
            {onDelete && (
              <EventDeleteConfirmation
                eventName={title}
                onDelete={() => onDelete(id)}
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}