import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Calendar, Download, ExternalLink } from "lucide-react";
import { GoogleCalendarUtils } from "@/utils/googleCalendar";
import { useToast } from "@/hooks/use-toast";
import { formatTimeWithoutSeconds } from "@/lib/utils";

interface CalendarIntegrationProps {
  event: {
    title: string;
    client?: string;
    description?: string | null;
    location?: string | null;
    startDate: string;
    startTime?: string;
    duration?: number | null; // in minutes
  };
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
}

export function CalendarIntegration({ event, variant = "outline", size = "sm" }: CalendarIntegrationProps) {
  const { toast } = useToast();

  const handleGoogleCalendar = () => {
    if (!event.startDate) {
      toast({
        title: "Data necessária",
        description: "O evento precisa ter uma data para ser adicionado ao calendário.",
        variant: "destructive"
      });
      return;
    }

    try {
      GoogleCalendarUtils.openCalendarEvent({
        title: event.title,
        client: event.client,
        description: event.description || undefined,
        location: event.location || undefined,
        startDate: event.startDate,
        startTime: event.startTime ? formatTimeWithoutSeconds(event.startTime) : undefined,
        duration: event.duration || undefined
      });
      
      toast({
        title: "Calendário aberto",
        description: "O Google Calendar foi aberto em uma nova aba."
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao abrir o Google Calendar.",
        variant: "destructive"
      });
    }
  };

  const handleDownloadICS = () => {
    if (!event.startDate) {
      toast({
        title: "Data necessária",
        description: "O evento precisa ter uma data para gerar o arquivo de calendário.",
        variant: "destructive"
      });
      return;
    }

    try {
      GoogleCalendarUtils.downloadICSFile({
        title: event.title,
        client: event.client,
        description: event.description || undefined,
        location: event.location || undefined,
        startDate: event.startDate,
        startTime: event.startTime ? formatTimeWithoutSeconds(event.startTime) : undefined,
        duration: event.duration || undefined
      });
      
      toast({
        title: "Arquivo baixado",
        description: "Arquivo .ics baixado com sucesso. Você pode importá-lo em qualquer aplicativo de calendário."
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao gerar arquivo de calendário.",
        variant: "destructive"
      });
    }
  };

  if (!event.startDate) {
    return (
      <Button variant="ghost" size={size} disabled className="opacity-50 px-2">
        <Calendar className="h-4 w-4 mr-0.5" />
        Sem data
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className="hover-lift px-2">
          <Calendar className="h-4 w-4 mr-0.5" />
          Agendar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="glass-effect">
        <DropdownMenuItem onClick={handleGoogleCalendar} className="cursor-pointer">
          <ExternalLink className="h-4 w-4 mr-2" />
          Google Calendar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDownloadICS} className="cursor-pointer">
          <Download className="h-4 w-4 mr-2" />
          Baixar arquivo .ics
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}