import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn, formatCurrencyInput, parseCurrency } from "@/lib/utils";
import { SaveCancelButtons } from "@/components/ui/save-cancel-buttons";
import { useToast } from "@/hooks/use-toast";
import { CalendarIntegration } from "./CalendarIntegration";

interface EventFormProps {
  eventId?: number;
  onSuccess: () => void;
  onCancel: () => void;
}

interface EventFormData {
  title: string;
  customer: string;
  date: Date | undefined;
  time: string;
  duration: string;
  location: string;
  type: string;
  status: string;
  numguests: string;
  cost: string;
  price: string;
  description: string;
}

const eventTypes = [
  "Casamento",
  "Aniversário", 
  "Corporativo",
  "Formatura",
  "Confraternização",
  "Outro"
];

const eventStatuses = [
  "planejamento",
  "confirmado", 
  "concluido",
  "cancelado"
];

export const EventForm = ({ eventId, onSuccess, onCancel }: EventFormProps) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<EventFormData>({
    title: "",
    customer: "",
    date: undefined,
    time: "",
    duration: "120", // Default 2 hours
    location: "",
    type: "",
    status: "planejamento",
    numguests: "",
    cost: "",
    price: "",
    description: ""
  });
  
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch customers for dropdown
  const { data: customers } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch event data if editing
  const { data: eventData } = useQuery({
    queryKey: ["event", eventId],
    queryFn: async () => {
      if (!eventId) return null;
      
      const { data, error } = await supabase
        .from("event")
        .select("*")
        .eq("id", eventId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!eventId
  });

  // Populate form when editing
  useEffect(() => {
    if (eventData) {
      setFormData({
        title: eventData.title || "",
        customer: eventData.customer?.toString() || "",
        date: eventData.date ? new Date(eventData.date + 'T00:00:00') : undefined,
        time: eventData.time || "",
        duration: eventData.duration?.toString() || "120",
        location: eventData.location || "",
        type: eventData.type || "",
        status: eventData.status || "planejamento",
        numguests: eventData.numguests?.toString() || "",
        cost: eventData.cost ? formatCurrencyInput((eventData.cost * 100).toString()) : "",
        price: eventData.price ? formatCurrencyInput((eventData.price * 100).toString()) : "",
        description: eventData.description || ""
      });
    }
  }, [eventData]);

  // Create event mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const { data: result, error } = await supabase
        .from("event")
        .insert([data])
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast({
        title: "Evento criado",
        description: "Evento adicionado com sucesso."
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: "Erro ao criar evento: " + error.message,
        variant: "destructive"
      });
    }
  });

  // Update event mutation
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const { data: result, error } = await supabase
        .from("event")
        .update(data)
        .eq("id", eventId)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      toast({
        title: "Evento atualizado com sucesso"
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar evento: " + error.message,
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast({
        title: "Erro",
        description: "Título é obrigatório.",
        variant: "destructive"
      });
      return;
    }

    if (!formData.customer) {
      toast({
        title: "Erro",
        description: "Cliente é obrigatório.",
        variant: "destructive"
      });
      return;
    }

    const submitData = {
      title: formData.title,
      customer: parseInt(formData.customer),
      date: formData.date ? format(formData.date, "yyyy-MM-dd") : null,
      time: formData.time || null,
      duration: formData.duration ? parseInt(formData.duration) : 120,
      location: formData.location || null,
      type: formData.type || null,
      status: formData.status,
      numguests: formData.numguests ? parseInt(formData.numguests) : null,
      cost: formData.cost ? parseCurrency(formData.cost) : null,
      price: formData.price ? parseCurrency(formData.price) : null,
      description: formData.description || null,
      ...(eventId ? {} : { user_id: user?.id })
    };

    if (eventId) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Título *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Nome do evento"
          required
        />
      </div>

      <div>
        <Label htmlFor="customer">Cliente *</Label>
        <Select value={formData.customer} onValueChange={(value) => setFormData({ ...formData, customer: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione um cliente" />
          </SelectTrigger>
          <SelectContent>
            {customers?.map((customer) => (
              <SelectItem key={customer.id} value={customer.id.toString()}>
                {customer.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Data</Label>
          <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formData.date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.date ? format(formData.date, "dd/MM/yyyy") : "Selecionar data"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={formData.date}
                onSelect={(date) => {
                  setFormData({ ...formData, date });
                  setIsDatePickerOpen(false);
                }}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <Label htmlFor="time">Horário</Label>
          <Input
            id="time"
            type="time"
            value={formData.time}
            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="duration">Duração (minutos)</Label>
        <Input
          id="duration"
          type="number"
          value={formData.duration}
          onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
          placeholder="120"
          min="15"
          step="15"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Duração em minutos (ex: 120 = 2 horas)
        </p>
      </div>
      <div>
        <Label htmlFor="location">Local</Label>
        <Input
          id="location"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          placeholder="Local do evento"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="type">Tipo</Label>
          <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Tipo de evento" />
            </SelectTrigger>
            <SelectContent>
              {eventTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="status">Status</Label>
          <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Status do evento" />
            </SelectTrigger>
            <SelectContent>
              {eventStatuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="numguests">Número de Convidados</Label>
          <Input
            id="numguests"
            type="number"
            value={formData.numguests}
            onChange={(e) => setFormData({ ...formData, numguests: e.target.value })}
            placeholder="Quantidade"
            min="1"
          />
        </div>

        <div>
          <Label htmlFor="cost">Custo</Label>
          <Input
            id="cost"
            value={formData.cost}
            onChange={(e) => {
              const formattedValue = formatCurrencyInput(e.target.value);
              setFormData({ ...formData, cost: formattedValue });
            }}
            placeholder="R$ 0,00"
          />
        </div>

        <div>
          <Label htmlFor="price">Preço</Label>
          <Input
            id="price"
            value={formData.price}
            onChange={(e) => {
              const formattedValue = formatCurrencyInput(e.target.value);
              setFormData({ ...formData, price: formattedValue });
            }}
            placeholder="R$ 0,00"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Detalhes do evento"
          rows={3}
        />
      </div>

      <div className="pt-4">
        {eventData && (
          <div className="mb-4 p-4 bg-accent/20 rounded-lg w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-medium mb-1">Agendar no Calendário</h4>
                <p className="text-sm text-muted-foreground">
                  Adicione este evento ao seu Google Calendar ou baixe um arquivo .ics
                </p>
              </div>
              <div className="flex-shrink-0">
                <CalendarIntegration 
                event={{
                  title: formData.title,
                  client: customers?.find(c => c.id.toString() === formData.customer)?.name,
                  description: formData.description,
                  location: formData.location,
                  date: formData.date ? format(formData.date, "yyyy-MM-dd") : null,
                  time: formData.time,
                  duration: formData.duration ? parseInt(formData.duration) : 120
                }}
                variant="default"
                size="default"
                />
              </div>
            </div>
          </div>
        )}
        <SaveCancelButtons
          onSave={() => {}} // Form submission handled by type="submit"
          onCancel={onCancel}
          isLoading={isLoading}
        />
      </div>
    </form>
  );
};