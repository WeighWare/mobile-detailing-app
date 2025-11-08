import { 
  Appointment, 
  AppointmentFormData, 
  AppointmentFilters, 
  AppointmentStats,
  BusinessSettings,
  Service
} from '../types';
import { StorageService } from './storage-service';
import { generateId, createErrorHandler } from '../lib/utils';
import { DateUtils } from '../lib/date-utils';

export class AppointmentService {
  private static instance: AppointmentService;
  private storage: StorageService;
  private errorHandler = createErrorHandler('AppointmentService');

  constructor() {
    this.storage = StorageService.getInstance();
  }

  static getInstance(): AppointmentService {
    if (!this.instance) {
      this.instance = new AppointmentService();
    }
    return this.instance;
  }

  // CRUD Operations
  async getAllAppointments(): Promise<Appointment[]> {
    try {
      return this.storage.getAppointments();
    } catch (error) {
      this.errorHandler(error as Error);
      return [];
    }
  }

  async getAppointmentById(id: string): Promise<Appointment | null> {
    try {
      const appointments = this.storage.getAppointments();
      return appointments.find(apt => apt.id === id) || null;
    } catch (error) {
      this.errorHandler(error as Error);
      return null;
    }
  }

  async getFilteredAppointments(filters: AppointmentFilters): Promise<Appointment[]> {
    try {
      let appointments = this.storage.getAppointments();

      // Apply filters
      if (filters.status?.length) {
        appointments = appointments.filter(apt => filters.status!.includes(apt.status));
      }

      if (filters.dateFrom) {
        appointments = appointments.filter(apt => apt.date >= filters.dateFrom!);
      }

      if (filters.dateTo) {
        appointments = appointments.filter(apt => apt.date <= filters.dateTo!);
      }

      if (filters.customerId) {
        appointments = appointments.filter(apt => 
          apt.customerEmail === filters.customerId || 
          apt.contactEmail === filters.customerId
        );
      }

      if (filters.serviceIds?.length) {
        appointments = appointments.filter(apt =>
          apt.services?.some(service => filters.serviceIds!.includes(service.id))
        );
      }

      if (filters.search) {
        const search = filters.search.toLowerCase();
        appointments = appointments.filter(apt =>
          apt.customerName.toLowerCase().includes(search) ||
          apt.customerEmail?.toLowerCase().includes(search) ||
          apt.customerPhone?.includes(search) ||
          apt.notes?.toLowerCase().includes(search)
        );
      }

      return appointments;
    } catch (error) {
      this.errorHandler(error as Error);
      return [];
    }
  }

  async createAppointment(
    data: AppointmentFormData, 
    businessSettings: BusinessSettings
  ): Promise<{ success: boolean; appointment?: Appointment; error?: string }> {
    try {
      // Validate appointment time
      const date = new Date(data.date);
      const totalDuration = data.services.reduce((sum, service) => sum + service.duration, 0);
      
      const validation = DateUtils.isValidAppointmentTime(
        date,
        data.time,
        totalDuration,
        businessSettings.businessHours,
        businessSettings.business.minimumBookingAdvance
      );

      if (!validation.isValid) {
        return { success: false, error: validation.reason };
      }

      // Check for conflicts
      const conflict = await this.checkTimeConflicts(data.date, data.time, totalDuration);
      if (conflict) {
        return { success: false, error: 'This time slot conflicts with another appointment' };
      }

      // Calculate pricing
      const totalAmount = data.services.reduce((sum, service) => sum + service.price, 0);
      const loyaltyPoints = Math.floor(totalAmount * businessSettings.loyalty.pointsPerDollar);

      // Create appointment
      const appointment: Appointment = {
        id: generateId(),
        ...data,
        status: 'pending',
        createdAt: new Date().toISOString(),
        payment: {
          id: generateId(),
          appointmentId: '', // Will be set after creation
          amount: totalAmount,
          currency: 'USD',
          status: 'pending',
          method: 'card',
          subtotal: totalAmount,
          tax: totalAmount * (businessSettings.payment.taxRate || 0),
          discount: 0,
          createdAt: new Date().toISOString()
        },
        loyaltyPointsEarned: loyaltyPoints,
        estimatedDuration: totalDuration
      };

      // Set payment appointment ID
      if (appointment.payment) {
        appointment.payment.appointmentId = appointment.id;
      }

      // Save appointment
      const appointments = this.storage.getAppointments();
      appointments.push(appointment);
      
      const saved = this.storage.saveAppointments(appointments);
      if (!saved) {
        return { success: false, error: 'Failed to save appointment' };
      }

      return { success: true, appointment };
    } catch (error) {
      this.errorHandler(error as Error);
      return { success: false, error: 'Failed to create appointment' };
    }
  }

  async updateAppointment(
    id: string, 
    updates: Partial<Appointment>
  ): Promise<{ success: boolean; appointment?: Appointment; error?: string }> {
    try {
      const appointments = this.storage.getAppointments();
      const index = appointments.findIndex(apt => apt.id === id);
      
      if (index === -1) {
        return { success: false, error: 'Appointment not found' };
      }

      const updatedAppointment = {
        ...appointments[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };

      appointments[index] = updatedAppointment;
      
      const saved = this.storage.saveAppointments(appointments);
      if (!saved) {
        return { success: false, error: 'Failed to save appointment' };
      }

      return { success: true, appointment: updatedAppointment };
    } catch (error) {
      this.errorHandler(error as Error);
      return { success: false, error: 'Failed to update appointment' };
    }
  }

  async deleteAppointment(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const appointments = this.storage.getAppointments();
      const filteredAppointments = appointments.filter(apt => apt.id !== id);
      
      if (filteredAppointments.length === appointments.length) {
        return { success: false, error: 'Appointment not found' };
      }

      const saved = this.storage.saveAppointments(filteredAppointments);
      if (!saved) {
        return { success: false, error: 'Failed to delete appointment' };
      }

      return { success: true };
    } catch (error) {
      this.errorHandler(error as Error);
      return { success: false, error: 'Failed to delete appointment' };
    }
  }

  // Business Logic
  async checkTimeConflicts(
    date: string, 
    time: string, 
    duration: number, 
    excludeId?: string
  ): Promise<boolean> {
    try {
      const appointments = this.storage.getAppointments();
      const appointmentStart = DateUtils.timeStringToMinutes(time);
      const appointmentEnd = appointmentStart + duration;

      return appointments.some(apt => {
        if (apt.id === excludeId) return false;
        if (apt.date !== date) return false;
        if (apt.status === 'cancelled') return false;

        const existingStart = DateUtils.timeStringToMinutes(apt.time);
        const existingDuration = apt.estimatedDuration || 
          apt.services?.reduce((sum, service) => sum + service.duration, 0) || 60;
        const existingEnd = existingStart + existingDuration;

        // Check for overlap
        return (appointmentStart < existingEnd && appointmentEnd > existingStart);
      });
    } catch (error) {
      this.errorHandler(error as Error);
      return true; // Assume conflict on error for safety
    }
  }

  async getAppointmentStats(): Promise<AppointmentStats> {
    try {
      const appointments = this.storage.getAppointments();
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const thisWeekStart = new Date(now);
      thisWeekStart.setDate(now.getDate() - now.getDay());
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const stats: AppointmentStats = {
        total: appointments.length,
        byStatus: {
          pending: 0,
          confirmed: 0,
          'in-progress': 0,
          completed: 0,
          cancelled: 0,
          delayed: 0
        },
        upcomingCount: 0,
        todayCount: 0,
        thisWeekRevenue: 0,
        thisMonthRevenue: 0,
        averageRating: 0
      };

      let totalRating = 0;
      let ratingCount = 0;

      appointments.forEach(apt => {
        // Status counts
        stats.byStatus[apt.status]++;

        // Today's appointments
        if (apt.date === today && apt.status !== 'cancelled') {
          stats.todayCount++;
        }

        // Upcoming appointments
        const aptDate = new Date(`${apt.date}T${apt.time}`);
        if (aptDate >= now && apt.status !== 'cancelled') {
          stats.upcomingCount++;
        }

        // Revenue calculations
        const revenue = apt.services?.reduce((sum, service) => sum + service.price, 0) || 0;
        const aptDateTime = new Date(apt.createdAt);

        if (aptDateTime >= thisWeekStart && apt.status === 'completed') {
          stats.thisWeekRevenue += revenue;
        }

        if (aptDateTime >= thisMonthStart && apt.status === 'completed') {
          stats.thisMonthRevenue += revenue;
        }

        // Rating calculation
        if (apt.customerRating) {
          totalRating += apt.customerRating;
          ratingCount++;
        }
      });

      stats.averageRating = ratingCount > 0 ? totalRating / ratingCount : 0;

      return stats;
    } catch (error) {
      this.errorHandler(error as Error);
      return {
        total: 0,
        byStatus: { pending: 0, confirmed: 0, 'in-progress': 0, completed: 0, cancelled: 0, delayed: 0 },
        upcomingCount: 0,
        todayCount: 0,
        thisWeekRevenue: 0,
        thisMonthRevenue: 0,
        averageRating: 0
      };
    }
  }

  async getAvailableTimeSlots(
    date: string, 
    duration: number, 
    businessSettings: BusinessSettings
  ): Promise<string[]> {
    try {
      const appointmentDate = new Date(date);
      const allSlots = DateUtils.getTimeSlots(
        appointmentDate,
        businessSettings.businessHours,
        30, // 30-minute slots
        15  // 15-minute buffer
      );

      // Filter out conflicting slots
      const availableSlots: string[] = [];
      
      for (const slot of allSlots) {
        const hasConflict = await this.checkTimeConflicts(date, slot, duration);
        if (!hasConflict) {
          availableSlots.push(slot);
        }
      }

      return availableSlots;
    } catch (error) {
      this.errorHandler(error as Error);
      return [];
    }
  }
}