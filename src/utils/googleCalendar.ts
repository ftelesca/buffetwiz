export interface CalendarEvent {
  title: string;
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
      details: event.description || '',
      location: event.location || '',
      sf: 'true',
      output: 'xml'
    });
    
    return `${baseUrl}&${params.toString()}`;
  }
  
  private static formatDateTime(date: string, time?: string): string {
    // Convert YYYY-MM-DD and HH:MM to Google Calendar format (YYYYMMDDTHHMMSSZ)
    const dateObj = new Date(date + 'T' + (time || '12:00') + ':00');
    return dateObj.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }
  
  private static addHours(time: string, hours: number): string {
    const [hour, minute] = time.split(':').map(Number);
    const newHour = (hour + hours) % 24;
    return `${newHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }
  
  private static addMinutes(time: string, minutes: number): string {
    const [hour, minute] = time.split(':').map(Number);
    const totalMinutes = hour * 60 + minute + minutes;
    const newHour = Math.floor(totalMinutes / 60) % 24;
    const newMinute = totalMinutes % 60;
    return `${newHour.toString().padStart(2, '0')}:${newMinute.toString().padStart(2, '0')}`;
  }
  
  static openCalendarEvent(event: CalendarEvent): void {
    const url = this.generateCalendarUrl(event);
    window.open(url, '_blank', 'noopener,noreferrer');
  }
  
  static generateICSFile(event: CalendarEvent): string {
    const startDateTime = this.formatDateTime(event.startDate, event.startTime);
    const endDateTime = event.endTime 
      ? this.formatDateTime(event.endDate || event.startDate, event.endTime)
      : this.formatDateTime(
          event.endDate || event.startDate, 
          this.addMinutes(event.startTime || '12:00', event.duration || 120)
        );
    
    const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    
    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//BuffetWiz//BuffetWiz Event//PT',
      'BEGIN:VEVENT',
      `UID:${now}@buffetwiz.com`,
      `DTSTAMP:${now}`,
      `DTSTART:${startDateTime}`,
      `DTEND:${endDateTime}`,
      `SUMMARY:${event.title}`,
      `DESCRIPTION:${event.description || ''}`,
      `LOCATION:${event.location || ''}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
  }
  
  static downloadICSFile(event: CalendarEvent): void {
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
  }
}