import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { cn, formatCurrencyInput, parseCurrency, formatCurrencyWithCents } from "@/lib/utils";
import { SaveCancelButtons } from "@/components/ui/save-cancel-buttons";
import { useToast } from "@/hooks/use-toast";
import { CalendarIntegration } from "./CalendarIntegration";
import { getSupabaseErrorMessage } from "@/lib/errorHandler";
import { EVENT_TYPES, EVENT_STATUSES, DEFAULT_EVENT_STATUS, DEFAULT_EVENT_DURATION, EVENT_STATUS_LABELS } from "@/constants/events";

interface EventFormProps {
  eventId?: string;
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

// Helper function to convert minutes to HH:MM format
const minutesToTimeFormat = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

// Helper function to convert HH:MM format to minutes
const timeFormatToMinutes = (timeString: string): number => {
  if (!timeString) return 0;
  const [hours, minutes] = timeString.split(':').map(Number);
  return (hours * 60) + minutes;
};

// Helper function to format time from database (HH:MM:SS -> HH:MM)
const formatTimeFromDatabase = (timeString: string | null): string => {
  if (!timeString) return '';
  // Time from database comes as "HH:MM:SS", we need "HH:MM"
  return timeString.substring(0, 5);
};

// Helper function to format time input as HH:MM
const formatTimeInput = (value: string): string => {
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, '');
  
  // Limit to 4 digits max
  const limited = digits.slice(0, 4);
  
  if (limited.length === 0) return '';
  if (limited.length <= 2) return limited;
  
  // Format as HH:MM
  return `${limited.slice(0, 2)}:${limited.slice(2)}`;
};

export const EventForm = ({ eventId, onSuccess, onCancel }: EventFormProps) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<EventFormData>({
    title: "",
    customer: "",
    date: undefined,
    time: "",
    duration: "",
    location: "",
    type: "",
    status: DEFAULT_EVENT_STATUS,
    numguests: "",
    cost: "",
    price: "",
    description: ""
  });
  

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
        customer: (eventData as any).customer?.toString() || "",
        date: eventData.date ? new Date(eventData.date + 'T00:00:00') : undefined,
        time: formatTimeFromDatabase(eventData.time),
        duration: (eventData as any).duration ? minutesToTimeFormat((eventData as any).duration) : "",
        location: eventData.location || "",
        type: eventData.type || "",
        status: eventData.status || "planejamento",
        numguests: (eventData as any).numguests?.toString() || "",
        cost: (eventData as any).cost ? ((eventData as any).cost).toFixed(2).replace('.', ',') : "",
        price: (eventData as any).price ? ((eventData as any).price).toFixed(2).replace('.', ',') : "",
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
      const friendlyError = getSupabaseErrorMessage(error);
      toast({
        title: friendlyError.title,
        description: friendlyError.description,
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
      const friendlyError = getSupabaseErrorMessage(error);
      toast({
        title: friendlyError.title,
        description: friendlyError.description,
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const submitData = {
      title: formData.title,
      customer: formData.customer,
      date: formData.date ? format(formData.date, "yyyy-MM-dd") : null,
      time: formData.time || null,
      duration: timeFormatToMinutes(formData.duration),
      location: formData.location || null,
      type: formData.type || null,
      status: formData.status,
      numguests: formData.numguests ? parseInt(formData.numguests) : null,
      price: formData.price ? parseFloat(formData.price.replace(',', '.')) : null,
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
          onInvalid={(e) => e.currentTarget.setCustomValidity("Por favor preencha este campo")}
          onInput={(e) => e.currentTarget.setCustomValidity("")}
        />
      </div>

      <div>
        <Label htmlFor="customer">Cliente *</Label>
        <select
          id="customer"
          value={formData.customer}
          onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
          required
          onInvalid={(e) => e.currentTarget.setCustomValidity("Por favor preencha este campo")}
          onInput={(e) => e.currentTarget.setCustomValidity("")}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
        >
          <option value="">Selecione um cliente</option>
          {customers?.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="date">Data *</Label>
          <Input
            id="date"
            type="date"
            value={formData.date ? format(formData.date, "yyyy-MM-dd") : ""}
            onChange={(e) => setFormData({ 
              ...formData, 
              date: e.target.value ? new Date(e.target.value + 'T00:00:00') : undefined 
            })}
            required
            onInvalid={(e) => e.currentTarget.setCustomValidity("Por favor preencha este campo")}
            onInput={(e) => e.currentTarget.setCustomValidity("")}
          />
        </div>

        <div>
          <Label htmlFor="time">Horário *</Label>
          <Input
            id="time"
            type="text"
            value={formData.time}
            onChange={(e) => setFormData({ ...formData, time: formatTimeInput(e.target.value) })}
            placeholder="HH:MM"
            pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$"
            title="Formato válido: HH:MM (ex: 14:30)"
            maxLength={5}
            required
            onInvalid={(e) => {
              if (e.currentTarget.validity.patternMismatch) {
                e.currentTarget.setCustomValidity("Formato inválido. Use HH:MM (ex: 14:30)");
              } else {
                e.currentTarget.setCustomValidity("Por favor preencha este campo");
              }
            }}
            onInput={(e) => e.currentTarget.setCustomValidity("")}
          />
        </div>

        <div>
          <Label htmlFor="duration">Duração (hh:mm) *</Label>
          <Input
            id="duration"
            type="text"
            value={formData.duration}
            onChange={(e) => setFormData({ ...formData, duration: formatTimeInput(e.target.value) })}
            placeholder="HH:MM"
            pattern="^[0-9]{2}:[0-5][0-9]$"
            title="Formato válido: HH:MM (ex: 02:30)"
            maxLength={5}
            required
            onInvalid={(e) => {
              if (e.currentTarget.validity.patternMismatch) {
                e.currentTarget.setCustomValidity("Formato inválido. Use HH:MM (ex: 02:30)");
              } else {
                e.currentTarget.setCustomValidity("Por favor preencha este campo");
              }
            }}
            onInput={(e) => e.currentTarget.setCustomValidity("")}
          />
        </div>
      </div>
      
      <div>
        <Label htmlFor="location">Local *</Label>
        <Input
          id="location"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          placeholder="Local do evento"
          required
          onInvalid={(e) => e.currentTarget.setCustomValidity("Por favor preencha este campo")}
          onInput={(e) => e.currentTarget.setCustomValidity("")}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="type">Tipo *</Label>
          <select
            id="type"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            required
            onInvalid={(e) => e.currentTarget.setCustomValidity("Por favor preencha este campo")}
            onInput={(e) => e.currentTarget.setCustomValidity("")}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
          >
            <option value="">Tipo de evento</option>
            {EVENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="status">Status *</Label>
          <select
            id="status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            required
            onInvalid={(e) => e.currentTarget.setCustomValidity("Por favor preencha este campo")}
            onInput={(e) => e.currentTarget.setCustomValidity("")}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
          >
            {EVENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {EVENT_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="numguests">Número de Convidados *</Label>
          <Input
            id="numguests"
            type="number"
            value={formData.numguests}
            onChange={(e) => setFormData({ ...formData, numguests: e.target.value })}
            placeholder="Quantidade"
            min="1"
            required
            onInvalid={(e) => e.currentTarget.setCustomValidity("Por favor preencha este campo")}
            onInput={(e) => e.currentTarget.setCustomValidity("")}
          />
        </div>

        <div>
          <Label htmlFor="cost">Custo</Label>
          <Input
            id="cost"
            value={formData.cost}
            readOnly
            placeholder="0,00"
            className="bg-muted"
          />
        </div>

        <div>
          <Label htmlFor="price">Preço</Label>
          <Input
            id="price"
            value={formData.price}
            onChange={(e) => {
              // Format as number with comma decimal separator, no currency symbol
              const value = e.target.value.replace(/\D/g, '');
              if (!value) {
                setFormData({ ...formData, price: '' });
                return;
              }
              const number = parseInt(value) / 100;
              const formatted = number.toFixed(2).replace('.', ',');
              setFormData({ ...formData, price: formatted });
            }}
            placeholder="0,00"
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
        <SaveCancelButtons
          onSave={() => {}} // Form submission handled by type="submit"
          onCancel={onCancel}
          isLoading={isLoading}
        />
      </div>
    </form>
  );
};