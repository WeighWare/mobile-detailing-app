import { Appointment, BusinessSettings, CustomerProfile } from '../App';

export interface NotificationLog {
  id: string;
  appointmentId: string;
  type: 'reminder' | 'status_change' | 'delay' | 'confirmation' | 'cancellation';
  method: 'sms' | 'email' | 'both';
  sentAt: string;
  status: 'sent' | 'failed' | 'pending';
  reminderHours?: number; // How many hours before appointment
  retryCount: number;
  errorMessage?: string;
}

export interface ReminderSchedule {
  appointmentId: string;
  reminderTimes: Date[];
  customerPreferences: {
    sms: boolean;
    email: boolean;
    reminders: boolean;
  };
}

export class NotificationService {
  private notificationLogs: NotificationLog[] = [];
  private reminderSchedules: ReminderSchedule[] = [];
  private automationEnabled: boolean = true;

  constructor() {
    this.loadNotificationLogs();
    this.initializeAutomation();
  }

  // Load notification history from localStorage
  private loadNotificationLogs() {
    try {
      const saved = localStorage.getItem('mobile-detailers-notifications');
      if (saved) {
        this.notificationLogs = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Error loading notification logs:', error);
    }
  }

  // Save notification logs to localStorage
  private saveNotificationLogs() {
    try {
      localStorage.setItem('mobile-detailers-notifications', JSON.stringify(this.notificationLogs));
    } catch (error) {
      console.error('Error saving notification logs:', error);
    }
  }

  // Initialize the automated reminder system
  private initializeAutomation() {
    // Check for pending reminders every minute
    setInterval(() => {
      if (this.automationEnabled) {
        this.processPendingReminders();
      }
    }, 60000); // 1 minute

    console.log('Automated reminder system initialized');
  }

  // Schedule reminders for an appointment
  public scheduleReminders(
    appointment: Appointment, 
    businessSettings: BusinessSettings,
    customerProfile?: CustomerProfile
  ) {
    const appointmentDateTime = new Date(`${appointment.date}T${appointment.time}`);
    const reminderTimes: Date[] = [];

    // Get customer preferences or use defaults
    const customerPreferences = customerProfile?.notifications || {
      reminders: true,
      promotions: true,
      statusUpdates: true,
      newsletter: false
    };

    // Only schedule if customer wants reminders
    if (!customerPreferences.reminders) {
      console.log(`Reminders disabled for customer ${appointment.customerEmail}`);
      return;
    }

    // Calculate reminder times based on business settings
    businessSettings.notifications.reminderHours.forEach(hours => {
      const reminderTime = new Date(appointmentDateTime.getTime() - (hours * 60 * 60 * 1000));
      
      // Only schedule future reminders
      if (reminderTime > new Date()) {
        reminderTimes.push(reminderTime);
      }
    });

    // Store the schedule
    const schedule: ReminderSchedule = {
      appointmentId: appointment.id,
      reminderTimes,
      customerPreferences: {
        sms: customerPreferences.reminders && appointment.customerPhone !== undefined,
        email: customerPreferences.reminders && appointment.customerEmail !== undefined,
        reminders: customerPreferences.reminders
      }
    };

    // Remove existing schedule for this appointment
    this.reminderSchedules = this.reminderSchedules.filter(s => s.appointmentId !== appointment.id);
    
    // Add new schedule
    this.reminderSchedules.push(schedule);

    console.log(`Scheduled ${reminderTimes.length} reminders for appointment ${appointment.id}`);
    return schedule;
  }

  // Process reminders that are due
  private async processPendingReminders() {
    const now = new Date();
    
    for (const schedule of this.reminderSchedules) {
      for (const reminderTime of schedule.reminderTimes) {
        // Check if reminder time has passed and hasn't been sent yet
        if (reminderTime <= now) {
          const alreadySent = this.notificationLogs.some(log => 
            log.appointmentId === schedule.appointmentId && 
            log.type === 'reminder' &&
            Math.abs(new Date(log.sentAt).getTime() - reminderTime.getTime()) < 60000 // Within 1 minute
          );

          if (!alreadySent) {
            try {
              // Get the appointment data (in real app, this would come from database)
              const appointment = this.getAppointmentById(schedule.appointmentId);
              if (appointment && appointment.status !== 'cancelled') {
                await this.sendAutomatedReminder(appointment, schedule, reminderTime);
              }
            } catch (error) {
              console.error('Error sending automated reminder:', error);
            }
          }
        }
      }
    }
  }

  // Send an automated reminder
  private async sendAutomatedReminder(
    appointment: Appointment, 
    schedule: ReminderSchedule,
    scheduledTime: Date
  ) {
    const logId = this.generateId();
    const appointmentDateTime = new Date(`${appointment.date}T${appointment.time}`);
    const hoursUntil = Math.round((appointmentDateTime.getTime() - new Date().getTime()) / (1000 * 60 * 60));

    // Create notification log entry
    const notificationLog: NotificationLog = {
      id: logId,
      appointmentId: appointment.id,
      type: 'reminder',
      method: schedule.customerPreferences.sms && schedule.customerPreferences.email ? 'both' : 
              schedule.customerPreferences.sms ? 'sms' : 'email',
      sentAt: new Date().toISOString(),
      status: 'pending',
      reminderHours: hoursUntil,
      retryCount: 0
    };

    try {
      // Send SMS if enabled and customer has phone
      if (schedule.customerPreferences.sms && appointment.customerPhone) {
        await this.sendSMS(appointment, 'reminder');
      }

      // Send email if enabled and customer has email
      if (schedule.customerPreferences.email && appointment.customerEmail) {
        await this.sendEmail(appointment, 'reminder');
      }

      notificationLog.status = 'sent';
      console.log(`✅ Automated reminder sent for appointment ${appointment.id} (${hoursUntil}h before)`);

    } catch (error) {
      notificationLog.status = 'failed';
      notificationLog.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to send automated reminder:', error);
    }

    // Save log
    this.notificationLogs.push(notificationLog);
    this.saveNotificationLogs();

    // Remove this reminder time from schedule
    const scheduleIndex = this.reminderSchedules.findIndex(s => s.appointmentId === appointment.id);
    if (scheduleIndex !== -1) {
      this.reminderSchedules[scheduleIndex].reminderTimes = 
        this.reminderSchedules[scheduleIndex].reminderTimes.filter(time => time !== scheduledTime);
    }
  }

  // Manual reminder sending (for catch-up or special cases)
  public async sendManualReminder(appointment: Appointment, type: 'sms' | 'email' | 'both' = 'both') {
    const logId = this.generateId();
    
    const notificationLog: NotificationLog = {
      id: logId,
      appointmentId: appointment.id,
      type: 'reminder',
      method: type,
      sentAt: new Date().toISOString(),
      status: 'pending',
      retryCount: 0
    };

    try {
      if (type === 'sms' || type === 'both') {
        await this.sendSMS(appointment, 'reminder');
      }

      if (type === 'email' || type === 'both') {
        await this.sendEmail(appointment, 'reminder');
      }

      notificationLog.status = 'sent';
      console.log(`✅ Manual reminder sent for appointment ${appointment.id}`);

    } catch (error) {
      notificationLog.status = 'failed';
      notificationLog.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to send manual reminder:', error);
    }

    this.notificationLogs.push(notificationLog);
    this.saveNotificationLogs();

    return notificationLog;
  }

  // Send bulk reminders (for catch-up scenarios)
  public async sendBulkReminders(
    appointments: Appointment[], 
    reason: string = 'System catch-up'
  ) {
    console.log(`📮 Starting bulk reminder process for ${appointments.length} appointments: ${reason}`);
    
    const results = {
      sent: 0,
      failed: 0,
      skipped: 0
    };

    for (const appointment of appointments) {
      try {
        // Skip if recently reminded (within last 2 hours)
        const recentReminder = this.notificationLogs.find(log => 
          log.appointmentId === appointment.id && 
          log.type === 'reminder' &&
          new Date().getTime() - new Date(log.sentAt).getTime() < 2 * 60 * 60 * 1000
        );

        if (recentReminder) {
          results.skipped++;
          continue;
        }

        await this.sendManualReminder(appointment);
        results.sent++;

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        results.failed++;
        console.error(`Failed to send bulk reminder for ${appointment.id}:`, error);
      }
    }

    console.log(`📮 Bulk reminder complete: ${results.sent} sent, ${results.failed} failed, ${results.skipped} skipped`);
    return results;
  }

  // Get pending reminders count
  public getPendingRemindersCount(): number {
    const now = new Date();
    return this.reminderSchedules.reduce((count, schedule) => {
      return count + schedule.reminderTimes.filter(time => time <= now).length;
    }, 0);
  }

  // Get notification statistics
  public getNotificationStats(days: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const recentLogs = this.notificationLogs.filter(log => 
      new Date(log.sentAt) >= cutoffDate
    );

    return {
      total: recentLogs.length,
      sent: recentLogs.filter(log => log.status === 'sent').length,
      failed: recentLogs.filter(log => log.status === 'failed').length,
      byType: {
        reminder: recentLogs.filter(log => log.type === 'reminder').length,
        status_change: recentLogs.filter(log => log.type === 'status_change').length,
        delay: recentLogs.filter(log => log.type === 'delay').length
      },
      byMethod: {
        sms: recentLogs.filter(log => log.method === 'sms' || log.method === 'both').length,
        email: recentLogs.filter(log => log.method === 'email' || log.method === 'both').length
      }
    };
  }

  // Legacy methods for compatibility (now enhanced)
  public async sendSMS(appointment: Appointment, type: 'reminder' | 'status_change' | 'delay') {
    // Simulate SMS sending
    console.log(`📱 Sending SMS to ${appointment.customerPhone}:`, this.getSMSContent(appointment, type));
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
    
    // Simulate occasional failures in demo
    if (Math.random() < 0.05) {
      throw new Error('SMS delivery failed - network timeout');
    }
    
    return { success: true, messageId: `sms_${Date.now()}` };
  }

  public async sendEmail(appointment: Appointment, type: 'reminder' | 'status_change' | 'delay') {
    // Simulate email sending
    console.log(`📧 Sending email to ${appointment.customerEmail}:`, this.getEmailContent(appointment, type));
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1500 + 700));
    
    // Simulate occasional failures in demo
    if (Math.random() < 0.03) {
      throw new Error('Email delivery failed - recipient not found');
    }
    
    return { success: true, messageId: `email_${Date.now()}` };
  }

  // Content generation methods
  private getSMSContent(appointment: Appointment, type: string): string {
    const date = new Date(appointment.date).toLocaleDateString();
    const time = appointment.time;
    
    switch (type) {
      case 'reminder':
        const hoursUntil = Math.round((new Date(`${appointment.date}T${appointment.time}`).getTime() - new Date().getTime()) / (1000 * 60 * 60));
        return `Hi ${appointment.customerName}! Reminder: Your car detailing appointment is in ${hoursUntil} hours on ${date} at ${time}. We'll be there! Reply STOP to opt out.`;
      case 'status_change':
        return `Hi ${appointment.customerName}! Your appointment status has been updated to: ${appointment.status}. Date: ${date} at ${time}.`;
      case 'delay':
        return `Hi ${appointment.customerName}! We're running a bit behind. Your appointment on ${date} may be delayed. We'll keep you updated!`;
      default:
        return `Hi ${appointment.customerName}! Update about your car detailing appointment on ${date} at ${time}.`;
    }
  }

  private getEmailContent(appointment: Appointment, type: string): string {
    const date = new Date(appointment.date).toLocaleDateString();
    const time = appointment.time;
    
    switch (type) {
      case 'reminder':
        const hoursUntil = Math.round((new Date(`${appointment.date}T${appointment.time}`).getTime() - new Date().getTime()) / (1000 * 60 * 60));
        return `Subject: Upcoming Car Detailing Appointment - ${hoursUntil}h\n\nHi ${appointment.customerName},\n\nThis is a friendly reminder that your car detailing appointment is scheduled for ${date} at ${time}.\n\nServices: ${appointment.services?.map(s => s.name).join(', ')}\nLocation: ${appointment.location?.address}\n\nWe're excited to make your car shine!\n\nBest regards,\nThe Mobile Detailers`;
      case 'status_change':
        return `Subject: Appointment Status Update\n\nHi ${appointment.customerName},\n\nYour appointment status has been updated to: ${appointment.status}\n\nAppointment Details:\nDate: ${date} at ${time}\nServices: ${appointment.services?.map(s => s.name).join(', ')}\n\nIf you have any questions, please don't hesitate to contact us.\n\nBest regards,\nThe Mobile Detailers`;
      case 'delay':
        return `Subject: Appointment Delay Notification\n\nHi ${appointment.customerName},\n\nWe're writing to inform you that we're running a bit behind schedule today. Your appointment on ${date} may experience a slight delay.\n\nReason: ${appointment.delayReason || 'Previous appointment running longer than expected'}\n\nWe apologize for any inconvenience and will keep you updated.\n\nBest regards,\nThe Mobile Detailers`;
      default:
        return `Subject: Appointment Update\n\nHi ${appointment.customerName},\n\nWe have an update regarding your car detailing appointment on ${date} at ${time}.\n\nBest regards,\nThe Mobile Detailers`;
    }
  }

  // Helper methods
  private getAppointmentById(id: string): Appointment | null {
    // In a real app, this would query the database
    // For demo, we'll try to get from localStorage
    try {
      const saved = localStorage.getItem('mobile-detailers-appointments');
      if (saved) {
        const appointments: Appointment[] = JSON.parse(saved);
        return appointments.find(apt => apt.id === id) || null;
      }
    } catch (error) {
      console.error('Error getting appointment:', error);
    }
    return null;
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  // Control methods
  public enableAutomation() {
    this.automationEnabled = true;
    console.log('✅ Automated reminders enabled');
  }

  public disableAutomation() {
    this.automationEnabled = false;
    console.log('⏸️ Automated reminders disabled');
  }

  public isAutomationEnabled(): boolean {
    return this.automationEnabled;
  }

  // Get logs for admin interface
  public getNotificationLogs(limit: number = 50): NotificationLog[] {
    return this.notificationLogs
      .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
      .slice(0, limit);
  }

  // Clear old logs (for maintenance)
  public clearOldLogs(daysOld: number = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const initialCount = this.notificationLogs.length;
    this.notificationLogs = this.notificationLogs.filter(log => 
      new Date(log.sentAt) >= cutoffDate
    );
    
    this.saveNotificationLogs();
    console.log(`🧹 Cleared ${initialCount - this.notificationLogs.length} old notification logs`);
  }
}