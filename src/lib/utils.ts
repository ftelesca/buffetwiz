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
