import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function toTitleCase(str: string): string {
  return str.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  )
}

export function formatDateWithoutTimezone(dateString: string): string {
  // Parse date string and ensure it's treated as local date without timezone conversion
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day); // month is 0-indexed
  return date.toLocaleDateString('pt-BR');
}

export function formatTimeWithoutSeconds(timeString: string): string {
  // Remove seconds from time string (HH:mm:ss -> HH:mm)
  return timeString.substring(0, 5);
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCurrencyWithCents(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatCurrencyInput(value: string): string {
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, '');
  
  // Convert to number and format
  if (!digits) return '';
  
  const number = parseInt(digits) / 100;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(number);
}

export function parseCurrency(formattedValue: string): number {
  // Remove currency symbol and formatting, convert to number
  const cleanValue = formattedValue.replace(/[^\d,]/g, '').replace(',', '.');
  return parseFloat(cleanValue) || 0;
}
