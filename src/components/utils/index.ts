import { Appointment, Service, CustomerProfile } from '../../App';

// Date and time utilities
export const formatDate = (date: string | Date, format: 'short' | 'long' | 'relative' = 'short') => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  switch (format) {
    case 'long':
      return dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    case 'relative':
      const now = new Date();
      const diffTime = dateObj.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Tomorrow';
      if (diffDays === -1) return 'Yesterday';
      if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;
      if (diffDays < -1 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;
      
      return dateObj.toLocaleDateString();
    default:
      return dateObj.toLocaleDateString();
  }
};

export const formatTime = (time: string) => {
  return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

export const addMinutesToTime = (time: string, minutes: number): string => {
  const [hours, mins] = time.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMinutes / 60);
  const newMins = totalMinutes % 60;
  return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
};

export const getTimeSlots = (startHour = 8, endHour = 18, intervalMinutes = 30) => {
  const slots: string[] = [];
  
  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += intervalMinutes) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      slots.push(time);
    }
  }
  
  return slots;
};

// Currency and number utilities
export const formatCurrency = (amount: number, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2
  }).format(amount);
};

export const calculateTax = (amount: number, taxRate = 0.0875) => {
  return amount * taxRate;
};

export const calculateTotal = (services: Service[], taxRate = 0.0875) => {
  const subtotal = services.reduce((sum, service) => sum + service.price, 0);
  const tax = calculateTax(subtotal, taxRate);
  return {
    subtotal,
    tax,
    total: subtotal + tax
  };
};

// String utilities
export const capitalizeWords = (str: string) => {
  return str.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

export const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text;
  return text.substr(0, maxLength).trim() + '...';
};

export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

// Validation utilities
export const isValidEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhone = (phone: string) => {
  const cleanPhone = phone.replace(/\D/g, '');
  return cleanPhone.length >= 10 && cleanPhone.length <= 15;
};

export const isValidZipCode = (zipCode: string) => {
  const zipRegex = /^\d{5}(-\d{4})?$/;
  return zipRegex.test(zipCode);
};

// Business logic utilities
export const getAppointmentStatusColor = (status: Appointment['status']) => {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
    'in-progress': 'bg-green-100 text-green-800 border-green-200',
    completed: 'bg-green-100 text-green-800 border-green-200',
    cancelled: 'bg-red-100 text-red-800 border-red-200',
    delayed: 'bg-orange-100 text-orange-800 border-orange-200'
  };
  return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
};

export const getPaymentStatusColor = (status: string) => {
  const colors = {
    paid: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    failed: 'bg-red-100 text-red-800',
    refunded: 'bg-blue-100 text-blue-800'
  };
  return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
};

export const calculateLoyaltyPoints = (amount: number, pointsPerDollar = 1) => {
  return Math.floor(amount * pointsPerDollar);
};

export const getLoyaltyTier = (points: number) => {
  if (points >= 2500) return 'gold';
  if (points >= 1000) return 'silver';
  return 'bronze';
};

// Array utilities
export const sortAppointmentsByDate = (appointments: Appointment[]) => {
  return [...appointments].sort((a, b) => {
    const dateTimeA = new Date(`${a.date}T${a.time}`);
    const dateTimeB = new Date(`${b.date}T${b.time}`);
    return dateTimeA.getTime() - dateTimeB.getTime();
  });
};

export const groupAppointmentsByDate = (appointments: Appointment[]) => {
  return appointments.reduce((groups, appointment) => {
    const date = appointment.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(appointment);
    return groups;
  }, {} as Record<string, Appointment[]>);
};

export const filterAppointmentsByStatus = (appointments: Appointment[], status: Appointment['status']) => {
  return appointments.filter(apt => apt.status === status);
};

// Search utilities
export const searchItems = <T extends Record<string, any>>(
  items: T[],
  query: string,
  searchFields: (keyof T)[]
): T[] => {
  const lowercaseQuery = query.toLowerCase().trim();
  
  if (!lowercaseQuery) return items;
  
  return items.filter(item =>
    searchFields.some(field => {
      const value = item[field];
      if (typeof value === 'string') {
        return value.toLowerCase().includes(lowercaseQuery);
      }
      if (typeof value === 'number') {
        return value.toString().includes(lowercaseQuery);
      }
      return false;
    })
  );
};

// Local storage utilities with error handling
export const safeLocalStorage = {
  getItem: (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return null;
    }
  },
  
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error('Error writing to localStorage:', error);
      return false;
    }
  },
  
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Error removing from localStorage:', error);
      return false;
    }
  }
};

// Performance utilities
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Export all utilities as a default object for convenience
export default {
  formatDate,
  formatTime,
  addMinutesToTime,
  getTimeSlots,
  formatCurrency,
  calculateTax,
  calculateTotal,
  capitalizeWords,
  truncateText,
  generateId,
  isValidEmail,
  isValidPhone,
  isValidZipCode,
  getAppointmentStatusColor,
  getPaymentStatusColor,
  calculateLoyaltyPoints,
  getLoyaltyTier,
  sortAppointmentsByDate,
  groupAppointmentsByDate,
  filterAppointmentsByStatus,
  searchItems,
  safeLocalStorage,
  debounce,
  throttle
};