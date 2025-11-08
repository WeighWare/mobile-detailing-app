import { useState, useCallback, useMemo } from 'react';
import { Appointment, Service } from '../../App';

export const useAppointments = (initialAppointments: Appointment[] = []) => {
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);

  // Memoized filtered appointments
  const filteredAppointments = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return {
      upcoming: appointments.filter(apt => {
        const aptDate = new Date(`${apt.date}T${apt.time}`);
        return aptDate >= now && apt.status !== 'cancelled';
      }),
      
      today: appointments.filter(apt => {
        const aptDate = new Date(apt.date);
        return aptDate.toDateString() === today.toDateString() && apt.status !== 'cancelled';
      }),
      
      pending: appointments.filter(apt => apt.status === 'pending'),
      
      inProgress: appointments.filter(apt => apt.status === 'in-progress'),
      
      completed: appointments.filter(apt => apt.status === 'completed'),
      
      cancelled: appointments.filter(apt => apt.status === 'cancelled'),
      
      overdue: appointments.filter(apt => {
        const aptDate = new Date(`${apt.date}T${apt.time}`);
        return aptDate < now && apt.status === 'confirmed';
      })
    };
  }, [appointments]);

  // Statistics
  const stats = useMemo(() => {
    const thisMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const completedThisMonth = appointments.filter(apt => 
      apt.status === 'completed' && new Date(apt.createdAt) >= thisMonth
    );

    const revenue = completedThisMonth.reduce((sum, apt) => 
      sum + (apt.services?.reduce((s, service) => s + service.price, 0) || 0), 0
    );

    const averageRating = appointments
      .filter(apt => apt.customerRating)
      .reduce((sum, apt, _, arr) => sum + (apt.customerRating || 0) / arr.length, 0);

    return {
      totalAppointments: appointments.length,
      thisMonthCompleted: completedThisMonth.length,
      thisMonthRevenue: revenue,
      averageRating: averageRating || 0,
      uniqueCustomers: new Set(appointments.map(apt => apt.customerEmail)).size
    };
  }, [appointments]);

  // CRUD operations
  const addAppointment = useCallback((appointment: Appointment) => {
    setAppointments(prev => [...prev, { ...appointment, createdAt: new Date().toISOString() }]);
  }, []);

  const updateAppointment = useCallback((id: string, updates: Partial<Appointment>) => {
    setAppointments(prev => prev.map(apt => 
      apt.id === id 
        ? { ...apt, ...updates, updatedAt: new Date().toISOString() }
        : apt
    ));
  }, []);

  const deleteAppointment = useCallback((id: string) => {
    setAppointments(prev => prev.filter(apt => apt.id !== id));
  }, []);

  const updateAppointmentStatus = useCallback((id: string, status: Appointment['status']) => {
    updateAppointment(id, { status });
  }, [updateAppointment]);

  // Bulk operations
  const bulkUpdateStatus = useCallback((ids: string[], status: Appointment['status']) => {
    setAppointments(prev => prev.map(apt => 
      ids.includes(apt.id) 
        ? { ...apt, status, updatedAt: new Date().toISOString() }
        : apt
    ));
  }, []);

  // Search and filter
  const searchAppointments = useCallback((query: string) => {
    const lowercaseQuery = query.toLowerCase();
    return appointments.filter(apt => 
      apt.customerName.toLowerCase().includes(lowercaseQuery) ||
      apt.customerEmail?.toLowerCase().includes(lowercaseQuery) ||
      apt.notes?.toLowerCase().includes(lowercaseQuery) ||
      apt.vehicleInfo?.make.toLowerCase().includes(lowercaseQuery) ||
      apt.vehicleInfo?.model.toLowerCase().includes(lowercaseQuery)
    );
  }, [appointments]);

  return {
    appointments,
    setAppointments,
    filteredAppointments,
    stats,
    addAppointment,
    updateAppointment,
    deleteAppointment,
    updateAppointmentStatus,
    bulkUpdateStatus,
    searchAppointments
  };
};

export const useAppointmentValidation = () => {
  const validateAppointment = useCallback((appointment: Partial<Appointment>) => {
    const errors: string[] = [];

    if (!appointment.customerName?.trim()) {
      errors.push('Customer name is required');
    }

    if (!appointment.customerEmail?.trim()) {
      errors.push('Customer email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(appointment.customerEmail)) {
      errors.push('Invalid email format');
    }

    if (!appointment.customerPhone?.trim()) {
      errors.push('Customer phone is required');
    }

    if (!appointment.date) {
      errors.push('Date is required');
    } else {
      const selectedDate = new Date(appointment.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        errors.push('Cannot schedule appointments in the past');
      }
    }

    if (!appointment.time) {
      errors.push('Time is required');
    }

    if (!appointment.services || appointment.services.length === 0) {
      errors.push('At least one service must be selected');
    }

    if (!appointment.vehicleInfo?.make?.trim()) {
      errors.push('Vehicle make is required');
    }

    if (!appointment.vehicleInfo?.model?.trim()) {
      errors.push('Vehicle model is required');
    }

    if (!appointment.location?.address?.trim()) {
      errors.push('Address is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }, []);

  return { validateAppointment };
};