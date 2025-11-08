// Centralized utility functions
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Date utilities
export const formatAppointmentDateTime = (date: string, time: string) => {
  const appointmentDate = new Date(`${date}T${time}`);
  
  return {
    date: appointmentDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    time: appointmentDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }),
    dateTime: appointmentDate,
    isToday: appointmentDate.toDateString() === new Date().toDateString(),
    isTomorrow: (() => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return appointmentDate.toDateString() === tomorrow.toDateString();
    })(),
    isPast: appointmentDate < new Date()
  };
};

export const formatCurrency = (amount: number, currency = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount);
};

export const formatPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  return phone;
};

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

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

// Array utilities
export const groupBy = <T, K extends keyof any>(
  array: T[],
  key: (item: T) => K
): Record<K, T[]> => {
  return array.reduce((result, item) => {
    const group = key(item);
    (result[group] = result[group] || []).push(item);
    return result;
  }, {} as Record<K, T[]>);
};

export const sortBy = <T>(
  array: T[],
  key: keyof T | ((item: T) => any),
  direction: 'asc' | 'desc' = 'asc'
): T[] => {
  return [...array].sort((a, b) => {
    const aVal = typeof key === 'function' ? key(a) : a[key];
    const bVal = typeof key === 'function' ? key(b) : b[key];
    
    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });
};

// Validation utilities
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^[\+]?[(]?[\d\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

export const validateContactInfo = (email?: string, phone?: string) => {
  const errors: { email?: string; phone?: string; general?: string } = {};
  
  if (!email && !phone) {
    errors.general = 'Either email or phone number is required';
    return errors;
  }
  
  if (email && !isValidEmail(email)) {
    errors.email = 'Please enter a valid email address';
  }
  
  if (phone && !isValidPhone(phone)) {
    errors.phone = 'Please enter a valid phone number';
  }
  
  return errors;
};

// Storage utilities
export const safeJSONParse = <T>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

export const safeLocalStorageGet = <T>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  return safeJSONParse(localStorage.getItem(key), fallback);
};

export const safeLocalStorageSet = (key: string, value: any): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

// Performance utilities
export const measurePerformance = <T>(
  operation: () => T,
  name?: string
): { result: T; duration: number } => {
  const start = performance.now();
  const result = operation();
  const duration = performance.now() - start;
  
  if (name && process.env.NODE_ENV === 'development') {
    console.log(`${name} took ${duration.toFixed(2)}ms`);
  }
  
  return { result, duration };
};

// Error handling utilities
export const createErrorHandler = (context: string) => {
  return (error: Error, additionalInfo?: any) => {
    console.error(`Error in ${context}:`, error, additionalInfo);
    
    // In production, send to error monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error, { extra: additionalInfo, tags: { context } });
    }
  };
};

export const retry = async <T>(
  operation: () => Promise<T>,
  attempts: number,
  delay: number = 1000
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    if (attempts <= 1) throw error;
    
    await new Promise(resolve => setTimeout(resolve, delay));
    return retry(operation, attempts - 1, delay);
  }
};