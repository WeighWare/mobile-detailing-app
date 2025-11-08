import { VALIDATION_RULES, ERROR_MESSAGES } from './constants';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean;
  message?: string;
}

export interface ValidationSchema {
  [key: string]: ValidationRule;
}

// Email validation pattern
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Phone validation pattern (supports various formats)
const PHONE_PATTERN = /^[\+]?[(]?[\d\s\-\(\)]{10,}$/;

// Common validation schemas
export const CUSTOMER_VALIDATION_SCHEMA: ValidationSchema = {
  name: {
    required: true,
    minLength: VALIDATION_RULES.CUSTOMER_NAME.MIN_LENGTH,
    maxLength: VALIDATION_RULES.CUSTOMER_NAME.MAX_LENGTH,
    message: ERROR_MESSAGES.REQUIRED_FIELD
  },
  email: {
    pattern: EMAIL_PATTERN,
    maxLength: VALIDATION_RULES.EMAIL.MAX_LENGTH,
    message: ERROR_MESSAGES.INVALID_EMAIL
  },
  phone: {
    pattern: PHONE_PATTERN,
    minLength: VALIDATION_RULES.PHONE_NUMBER.MIN_LENGTH,
    maxLength: VALIDATION_RULES.PHONE_NUMBER.MAX_LENGTH,
    message: ERROR_MESSAGES.INVALID_PHONE
  }
};

export const APPOINTMENT_VALIDATION_SCHEMA: ValidationSchema = {
  customerName: {
    required: true,
    minLength: VALIDATION_RULES.CUSTOMER_NAME.MIN_LENGTH,
    maxLength: VALIDATION_RULES.CUSTOMER_NAME.MAX_LENGTH,
    message: ERROR_MESSAGES.REQUIRED_FIELD
  },
  date: {
    required: true,
    custom: (value: string) => {
      const date = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date >= today;
    },
    message: ERROR_MESSAGES.PAST_DATE
  },
  time: {
    required: true,
    pattern: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
    message: ERROR_MESSAGES.INVALID_TIME
  },
  services: {
    required: true,
    custom: (value: any[]) => Array.isArray(value) && value.length > 0,
    message: 'At least one service must be selected'
  },
  notes: {
    maxLength: VALIDATION_RULES.APPOINTMENT_NOTES.MAX_LENGTH,
    message: 'Notes are too long'
  }
};

export const VEHICLE_VALIDATION_SCHEMA: ValidationSchema = {
  make: {
    required: true,
    minLength: 2,
    maxLength: 30,
    message: 'Vehicle make is required'
  },
  model: {
    required: true,
    minLength: 1,
    maxLength: 30,
    message: 'Vehicle model is required'
  },
  year: {
    required: true,
    custom: (value: number) => {
      const currentYear = new Date().getFullYear();
      return value >= 1900 && value <= currentYear + 1;
    },
    message: 'Please enter a valid year'
  },
  color: {
    required: true,
    minLength: 3,
    maxLength: 20,
    message: 'Vehicle color is required'
  }
};

export const PAYMENT_VALIDATION_SCHEMA: ValidationSchema = {
  amount: {
    required: true,
    custom: (value: number) => value > 0,
    message: 'Amount must be greater than 0'
  },
  method: {
    required: true,
    custom: (value: string) => ['card', 'cash', 'bank_transfer', 'loyalty_points'].includes(value),
    message: 'Invalid payment method'
  }
};

// Validation helper functions
export function validateField(value: any, rule: ValidationRule): string | null {
  if (rule.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
    return rule.message || ERROR_MESSAGES.REQUIRED_FIELD;
  }
  
  if (value && rule.minLength && value.length < rule.minLength) {
    return rule.message || `Minimum length is ${rule.minLength} characters`;
  }
  
  if (value && rule.maxLength && value.length > rule.maxLength) {
    return rule.message || `Maximum length is ${rule.maxLength} characters`;
  }
  
  if (value && rule.pattern && !rule.pattern.test(value)) {
    return rule.message || ERROR_MESSAGES.VALIDATION_FAILED;
  }
  
  if (value && rule.custom && !rule.custom(value)) {
    return rule.message || ERROR_MESSAGES.VALIDATION_FAILED;
  }
  
  return null;
}

export function validateObject(data: any, schema: ValidationSchema): Record<string, string> {
  const errors: Record<string, string> = {};
  
  Object.keys(schema).forEach(key => {
    const error = validateField(data[key], schema[key]);
    if (error) {
      errors[key] = error;
    }
  });
  
  return errors;
}

export function hasValidationErrors(errors: Record<string, string>): boolean {
  return Object.keys(errors).length > 0;
}