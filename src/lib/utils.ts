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

export function parseSpreadsheetCurrency(value: string | number): number {
  if (typeof value === 'number') return value;
  if (!value || typeof value !== 'string') return 0;
  
  // Remove currency symbols and spaces
  let cleanValue = value.toString().replace(/[R$\s]/g, '');
  
  // If no decimal separators, it's a whole number
  if (!/[.,]/.test(cleanValue)) {
    return parseFloat(cleanValue) || 0;
  }
  
  // Find the last occurrence of comma or period
  const lastCommaIndex = cleanValue.lastIndexOf(',');
  const lastPeriodIndex = cleanValue.lastIndexOf('.');
  
  // Determine which is the decimal separator based on position and context
  if (lastCommaIndex > lastPeriodIndex) {
    // Comma is the decimal separator (e.g., "1.234,99")
    // Check if it has exactly 2 digits after comma (typical for currency)
    const afterComma = cleanValue.substring(lastCommaIndex + 1);
    if (afterComma.length <= 2) {
      cleanValue = cleanValue.replace(/\./g, '').replace(',', '.');
    } else {
      // Comma is thousands separator
      cleanValue = cleanValue.replace(/,/g, '');
    }
  } else if (lastPeriodIndex > lastCommaIndex) {
    // Period is the decimal separator (e.g., "1,234.99")
    const afterPeriod = cleanValue.substring(lastPeriodIndex + 1);
    if (afterPeriod.length <= 2) {
      cleanValue = cleanValue.replace(/,/g, '');
    } else {
      // Period is thousands separator (unlikely but handle it)
      cleanValue = cleanValue.replace(/\./g, '');
    }
  }
  
  return parseFloat(cleanValue) || 0;
}

export function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

export function getCountText(
  totalCount: number,
  filteredCount: number,
  hasSearchQuery: boolean,
  entitySingular: string,
  entityPlural: string,
  registeredSingular: string,
  registeredPlural: string,
  foundSingular: string = "encontrado",
  foundPlural: string = "encontrados"
): string {
  if (hasSearchQuery) {
    const totalText = pluralize(totalCount, entitySingular, entityPlural);
    const foundText = pluralize(filteredCount, foundSingular, foundPlural);
    return `${filteredCount} de ${totalCount} ${totalText} ${foundText}`;
  } else {
    const countText = pluralize(totalCount, registeredSingular, registeredPlural);
    return `${totalCount} ${countText}`;
  }
}
