export interface CalendarEvent {
  title: string;
  client?: string;
  description?: string;
  location?: string;
  startDate: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  duration?: number; // in minutes
}

export class GoogleCalendarUtils {
  static generateCalendarUrl(event: CalendarEvent): string {
    const baseUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
    
    // Create detailed description with client and event details
    let description = '';
    if (event.client) {
      description += `Cliente: ${event.client}`;
    }
    if (event.description) {
      description += event.client ? `\n\nDescrição: ${event.description}` : `Descrição: ${event.description}`;
    }
    if (event.location) {
      description += `\n\nLocal: ${event.location}`;
    }
    
    // Format dates for Google Calendar
    const startDateTime = this.formatDateTime(event.startDate, event.startTime);
    const endDateTime = event.endTime 
      ? this.formatDateTime(event.endDate || event.startDate, event.endTime)
      : this.formatDateTime(
          event.endDate || event.startDate, 
          this.addMinutes(event.startTime || '12:00', event.duration || 120)
        );
    
    const params = new URLSearchParams({
      text: event.title,
      dates: `${startDateTime}/${endDateTime}`,
      details: description.trim(),
      location: event.location || '',
      sf: 'true',
      output: 'xml'
    });
    
    return `${baseUrl}&${params.toString()}`;
  }
  
  private static formatDateTime(date: string, time?: string): string {
    try {
      // Ensure we have a valid date string in YYYY-MM-DD format
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new Error('Invalid date format');
      }
      
      // Use default time if not provided
      const timeToUse = time || '12:00';
      
      // Validate time format
      if (!/^\d{2}:\d{2}$/.test(timeToUse)) {
        throw new Error('Invalid time format');
      }
      
      // Create date object in local timezone
      const [year, month, day] = date.split('-').map(Number);
      const [hour, minute] = timeToUse.split(':').map(Number);
      
      // Create date in local timezone
      const dateObj = new Date(year, month - 1, day, hour, minute);
      
      // Format for Google Calendar (YYYYMMDDTHHMMSS)
      const formatNumber = (num: number, digits: number = 2) => 
        num.toString().padStart(digits, '0');
      
      return `${formatNumber(dateObj.getFullYear(), 4)}${formatNumber(dateObj.getMonth() + 1)}${formatNumber(dateObj.getDate())}T${formatNumber(dateObj.getHours())}${formatNumber(dateObj.getMinutes())}00`;
    } catch (error) {
      console.error('Error formatting date time:', error);
      // Fallback to current date/time
      const now = new Date();
      const formatNumber = (num: number, digits: number = 2) => 
        num.toString().padStart(digits, '0');
      
      return `${formatNumber(now.getFullYear(), 4)}${formatNumber(now.getMonth() + 1)}${formatNumber(now.getDate())}T${formatNumber(now.getHours())}${formatNumber(now.getMinutes())}00`;
    }
  }
  
  private static addMinutes(time: string, minutes: number): string {
    try {
      if (!time || !/^\d{2}:\d{2}$/.test(time)) {
        time = '12:00'; // Default fallback
      }
      
      const [hour, minute] = time.split(':').map(Number);
      const totalMinutes = hour * 60 + minute + minutes;
      const newHour = Math.floor(totalMinutes / 60) % 24;
      const newMinute = totalMinutes % 60;
      return `${newHour.toString().padStart(2, '0')}:${newMinute.toString().padStart(2, '0')}`;
    } catch (error) {
      console.error('Error adding minutes:', error);
      return '14:00'; // Default 2 hours later
    }
  }
  
  static openCalendarEvent(event: CalendarEvent): void {
    try {
      const url = this.generateCalendarUrl(event);
      
      // Validate URL before opening
      if (!url || !url.startsWith('https://calendar.google.com')) {
        throw new Error('Invalid calendar URL generated');
      }
      
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error opening calendar event:', error);
      throw new Error('Erro ao abrir o Google Calendar. Verifique se o evento tem data válida.');
    }
  }
  
  static generateICSFile(event: CalendarEvent): string {
    try {
      // Create detailed description with client and event details
      let description = '';
      if (event.client) {
        description += `Cliente: ${event.client}`;
      }
      if (event.description) {
        description += event.client ? `\\n\\nDescrição: ${event.description}` : `Descrição: ${event.description}`;
      }
      if (event.location) {
        description += `\\n\\nLocal: ${event.location}`;
      }
      
      const startDateTime = this.formatDateTime(event.startDate, event.startTime);
      const endDateTime = event.endTime 
        ? this.formatDateTime(event.endDate || event.startDate, event.endTime)
        : this.formatDateTime(
            event.endDate || event.startDate, 
            this.addMinutes(event.startTime || '12:00', event.duration || 120)
          );
      
      const now = new Date();
      const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}T${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
      
      return [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//BuffetWiz//BuffetWiz Event//PT',
        'BEGIN:VEVENT',
        `UID:${timestamp}@buffetwiz.com`,
        `DTSTAMP:${timestamp}`,
        `DTSTART:${startDateTime}`,
        `DTEND:${endDateTime}`,
        `SUMMARY:${event.title}`,
        `DESCRIPTION:${description.trim()}`,
        `LOCATION:${event.location || ''}`,
        'END:VEVENT',
        'END:VCALENDAR'
      ].join('\r\n');
    } catch (error) {
      console.error('Error generating ICS file:', error);
      throw new Error('Erro ao gerar arquivo de calendário. Verifique se o evento tem data válida.');
    }
  }
  
  static downloadICSFile(event: CalendarEvent): void {
    try {
      const icsContent = this.generateICSFile(event);
      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading ICS file:', error);
      throw new Error('Erro ao baixar arquivo de calendário. Tente novamente.');
    }
  }
}