import { Appointment } from '../App';

export interface TimeSlot {
  time: string;
  available: boolean;
  appointmentId?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  location?: string;
}

export interface TimeConflict {
  appointmentId: string;
  customerName: string;
  conflictTime: string;
}

// Time slots for appointments (8 AM to 6 PM)
export const AVAILABLE_TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30'
];

// Service duration in minutes
export const SERVICE_DURATIONS = {
  'basic-wash': 60,
  'full-detail': 180,
  'interior-only': 90,
  'exterior-only': 90,
  'premium-package': 240,
  'maintenance-wash': 45
};

export function getServiceDuration(service: string): number {
  return SERVICE_DURATIONS[service as keyof typeof SERVICE_DURATIONS] || 90;
}

export function addMinutesToTime(time: string, minutes: number): string {
  const [hours, mins] = time.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMinutes / 60);
  const newMins = totalMinutes % 60;
  return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
}

export function isTimeConflict(
  startTime1: string,
  endTime1: string,
  startTime2: string,
  endTime2: string
): boolean {
  const start1 = timeToMinutes(startTime1);
  const end1 = timeToMinutes(endTime1);
  const start2 = timeToMinutes(startTime2);
  const end2 = timeToMinutes(endTime2);

  return start1 < end2 && start2 < end1;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function checkDoubleBooking(
  appointments: Appointment[],
  newDate: string,
  newTime: string,
  service: string,
  excludeId?: string
): { hasConflict: boolean; conflictingAppointment?: Appointment } {
  const serviceDuration = getServiceDuration(service);
  const newEndTime = addMinutesToTime(newTime, serviceDuration);

  const conflictingAppointment = appointments.find(apt => {
    if (apt.id === excludeId) return false;
    if (apt.date !== newDate) return false;
    if (apt.status === 'cancelled') return false;

    const existingDuration = apt.services?.reduce((sum, s) => sum + s.duration, 0) || 
                            getServiceDuration(apt.notes?.toLowerCase().includes('full') ? 'full-detail' : 'basic-wash');
    const existingEndTime = addMinutesToTime(apt.time, existingDuration);

    return isTimeConflict(newTime, newEndTime, apt.time, existingEndTime);
  });

  return {
    hasConflict: !!conflictingAppointment,
    conflictingAppointment
  };
}

// New function for checking time conflicts with multiple appointments
export function checkTimeConflicts(
  date: string,
  time: string,
  duration: number,
  existingAppointments: Appointment[],
  excludeId?: string
): TimeConflict[] {
  const conflicts: TimeConflict[] = [];
  const endTime = addMinutesToTime(time, duration);

  for (const appointment of existingAppointments) {
    // Skip if it's the same appointment (when editing)
    if (appointment.id === excludeId) continue;
    
    // Skip if different date
    if (appointment.date !== date) continue;
    
    // Skip cancelled appointments
    if (appointment.status === 'cancelled') continue;

    // Calculate existing appointment duration
    const existingDuration = appointment.services?.reduce((sum, service) => sum + service.duration, 0) || 
                            appointment.estimatedDuration || 
                            getServiceDuration('basic-wash');
    
    const existingEndTime = addMinutesToTime(appointment.time, existingDuration);

    // Check if times overlap
    if (isTimeConflict(time, endTime, appointment.time, existingEndTime)) {
      conflicts.push({
        appointmentId: appointment.id,
        customerName: appointment.customerName,
        conflictTime: `${appointment.time} - ${existingEndTime}`
      });
    }
  }

  return conflicts;
}

export function getAvailableTimeSlots(
  appointments: Appointment[],
  date: string
): TimeSlot[] {
  return AVAILABLE_TIME_SLOTS.map(time => {
    const conflictCheck = checkDoubleBooking(appointments, date, time, 'basic-wash');
    return {
      time,
      available: !conflictCheck.hasConflict,
      appointmentId: conflictCheck.conflictingAppointment?.id
    };
  });
}

export function generateCalendarEvent(appointment: Appointment): CalendarEvent {
  const startDate = new Date(`${appointment.date}T${appointment.time}`);
  const serviceDuration = appointment.services?.reduce((sum, service) => sum + service.duration, 0) || 
                         appointment.estimatedDuration ||
                         getServiceDuration(appointment.notes?.toLowerCase().includes('full') ? 'full-detail' : 'basic-wash');
  const endDate = new Date(startDate.getTime() + serviceDuration * 60000);

  const serviceNames = appointment.services?.map(s => s.name).join(', ') || 'Car detailing service';

  return {
    id: appointment.id,
    title: `${serviceNames} - ${appointment.customerName}`,
    start: startDate,
    end: endDate,
    description: appointment.notes || serviceNames,
    location: appointment.location ? 
      `${appointment.location.address}, ${appointment.location.city}, ${appointment.location.state}` :
      'Customer Location (Mobile Service)'
  };
}

export function generateICalEvent(appointment: Appointment): string {
  const event = generateCalendarEvent(appointment);
  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const icalData = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//The Mobile Detailers//EN',
    'BEGIN:VEVENT',
    `UID:${event.id}@mobiledetailers.com`,
    `DTSTART:${formatDate(event.start)}`,
    `DTEND:${formatDate(event.end)}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${event.description}`,
    `LOCATION:${event.location}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  return icalData;
}

export function downloadICalEvent(appointment: Appointment): void {
  const icalData = generateICalEvent(appointment);
  const blob = new Blob([icalData], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `appointment-${appointment.id}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function generateGoogleCalendarUrl(appointment: Appointment): string {
  const event = generateCalendarEvent(appointment);
  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatDate(event.start)}/${formatDate(event.end)}`,
    details: event.description || '',
    location: event.location || ''
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function generateOutlookCalendarUrl(appointment: Appointment): string {
  const event = generateCalendarEvent(appointment);
  
  const params = new URLSearchParams({
    subject: event.title,
    startdt: event.start.toISOString(),
    enddt: event.end.toISOString(),
    body: event.description || '',
    location: event.location || ''
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

// Utility function for business hours validation
export function isWithinBusinessHours(time: string, businessHours: any): boolean {
  const timeMinutes = timeToMinutes(time);
  const startMinutes = timeToMinutes(businessHours.start);
  const endMinutes = timeToMinutes(businessHours.end);
  
  return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
}

// Function to get next available time slot
export function getNextAvailableSlot(
  appointments: Appointment[],
  date: string,
  preferredTime?: string
): string | null {
  const availableSlots = getAvailableTimeSlots(appointments, date);
  
  if (preferredTime) {
    const preferredSlot = availableSlots.find(slot => slot.time === preferredTime && slot.available);
    if (preferredSlot) return preferredTime;
  }
  
  const nextAvailable = availableSlots.find(slot => slot.available);
  return nextAvailable ? nextAvailable.time : null;
}