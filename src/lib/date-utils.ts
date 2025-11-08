// Specialized date utilities for appointment scheduling
import { BusinessHours } from '../types';

export class DateUtils {
  static isBusinessDay(date: Date, businessHours: BusinessHours): boolean {
    const dayName = date.toLocaleDateString('en-US', { weekday: 'lowercase' });
    return businessHours[dayName]?.isOpen ?? false;
  }

  static isWithinBusinessHours(
    date: Date, 
    time: string, 
    businessHours: BusinessHours
  ): boolean {
    const dayName = date.toLocaleDateString('en-US', { weekday: 'lowercase' });
    const hours = businessHours[dayName];
    
    if (!hours?.isOpen) return false;
    
    const appointmentTime = this.timeStringToMinutes(time);
    const startTime = this.timeStringToMinutes(hours.start);
    const endTime = this.timeStringToMinutes(hours.end);
    
    return appointmentTime >= startTime && appointmentTime <= endTime;
  }

  static timeStringToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  static minutesToTimeString(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  static addMinutes(timeString: string, minutesToAdd: number): string {
    const minutes = this.timeStringToMinutes(timeString) + minutesToAdd;
    return this.minutesToTimeString(minutes);
  }

  static getTimeSlots(
    date: Date,
    businessHours: BusinessHours,
    slotDuration: number = 30,
    bufferTime: number = 15
  ): string[] {
    if (!this.isBusinessDay(date, businessHours)) return [];
    
    const dayName = date.toLocaleDateString('en-US', { weekday: 'lowercase' });
    const hours = businessHours[dayName];
    
    const slots: string[] = [];
    const startMinutes = this.timeStringToMinutes(hours.start);
    const endMinutes = this.timeStringToMinutes(hours.end);
    
    for (let minutes = startMinutes; minutes <= endMinutes - slotDuration; minutes += slotDuration + bufferTime) {
      slots.push(this.minutesToTimeString(minutes));
    }
    
    return slots;
  }

  static isValidAppointmentTime(
    date: Date,
    time: string,
    duration: number,
    businessHours: BusinessHours,
    minimumAdvanceHours: number = 2
  ): { isValid: boolean; reason?: string } {
    // Check if it's in the past
    const appointmentDateTime = new Date(`${date.toISOString().split('T')[0]}T${time}`);
    const now = new Date();
    const minimumTime = new Date(now.getTime() + minimumAdvanceHours * 60 * 60 * 1000);
    
    if (appointmentDateTime < minimumTime) {
      return { 
        isValid: false, 
        reason: `Appointments must be scheduled at least ${minimumAdvanceHours} hours in advance` 
      };
    }
    
    // Check if it's a business day
    if (!this.isBusinessDay(date, businessHours)) {
      return { isValid: false, reason: 'Selected date is not a business day' };
    }
    
    // Check if within business hours
    if (!this.isWithinBusinessHours(date, time, businessHours)) {
      return { isValid: false, reason: 'Selected time is outside business hours' };
    }
    
    // Check if appointment would end within business hours
    const endTime = this.addMinutes(time, duration);
    if (!this.isWithinBusinessHours(date, endTime, businessHours)) {
      return { isValid: false, reason: 'Appointment would extend beyond business hours' };
    }
    
    return { isValid: true };
  }

  static formatDateRange(startDate: Date, endDate: Date): string {
    const start = startDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
    const end = endDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
    
    if (startDate.getFullYear() === endDate.getFullYear() && 
        startDate.getMonth() === endDate.getMonth()) {
      return `${start} - ${end}`;
    }
    
    return `${start} - ${end}`;
  }

  static getBusinessDaysInRange(startDate: Date, endDate: Date, businessHours: BusinessHours): Date[] {
    const days: Date[] = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      if (this.isBusinessDay(current, businessHours)) {
        days.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  }

  static getNextBusinessDay(date: Date, businessHours: BusinessHours): Date {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    
    while (!this.isBusinessDay(nextDay, businessHours)) {
      nextDay.setDate(nextDay.getDate() + 1);
    }
    
    return nextDay;
  }

  static formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;
    if (diffDays < -1 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  }
}