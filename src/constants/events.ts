/**
 * Event-related constants and type definitions
 */

// Event Types
export const EVENT_TYPES = [
  "Casamento",
  "Aniversário",
  "Corporativo",
  "Formatura",
  "Confraternização",
  "Outro"
] as const;

export type EventType = typeof EVENT_TYPES[number];

// Event Statuses
export const EVENT_STATUSES = [
  "planejamento",
  "confirmado",
  "concluido",
  "cancelado"
] as const;

export type EventStatus = typeof EVENT_STATUSES[number];

// Default values
export const DEFAULT_EVENT_STATUS: EventStatus = "planejamento";
export const DEFAULT_EVENT_DURATION = "02:00"; // 2 hours in HH:MM format

// Status labels for display (Portuguese)
export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  planejamento: "Planejamento",
  confirmado: "Confirmado",
  concluido: "Concluído",
  cancelado: "Cancelado"
};

// Status colors for UI
export const EVENT_STATUS_COLORS: Record<EventStatus, string> = {
  planejamento: "bg-yellow-100 text-yellow-800",
  confirmado: "bg-green-100 text-green-800",
  concluido: "bg-blue-100 text-blue-800",
  cancelado: "bg-red-100 text-red-800"
};
