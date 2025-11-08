import { Appointment } from '../App';

export interface PaymentResult {
  success: boolean;
  paymentIntentId?: string;
  clientSecret?: string;
  error?: string;
  invoiceUrl?: string;
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'succeeded' | 'canceled';
  clientSecret: string;
}

export class PaymentService {
  // NOTE: These keys should be moved to environment variables!
  // - VITE_STRIPE_PUBLISHABLE_KEY for frontend (safe to expose)
  // - STRIPE_SECRET_KEY for backend only (NEVER expose in frontend code)
  // See .env.example for configuration instructions
  private readonly STRIPE_PUBLISHABLE_KEY = 'pk_test_YOUR_STRIPE_PUBLISHABLE_KEY_HERE';
  private readonly STRIPE_SECRET_KEY = 'sk_test_YOUR_STRIPE_SECRET_KEY_HERE'; // BACKEND ONLY - Remove from frontend!
  private stripe: any = null;

  constructor() {
    // In a real implementation, initialize Stripe here
    console.log('PaymentService initialized (Demo Mode)');
    
    /* Real Stripe initialization:
    if (typeof window !== 'undefined') {
      // Client-side Stripe initialization
      this.stripe = window.Stripe(this.STRIPE_PUBLISHABLE_KEY);
    }
    */
  }

  /**
   * Create a payment intent for an appointment
   * NOTE: This should be done on the backend in production
   */
  async createPaymentIntent(appointment: Appointment, amount: number): Promise<PaymentResult> {
    try {
      // Mock payment intent creation - replace with actual Stripe backend call
      console.log(`💳 Creating payment intent for $${amount} (Appointment: ${appointment.id})`);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const mockPaymentIntent: PaymentIntent = {
        id: `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        amount: amount * 100, // Stripe uses cents
        currency: 'usd',
        status: 'requires_payment_method',
        clientSecret: `pi_${Date.now()}_secret_${Math.random().toString(36).substr(2, 9)}`
      };

      return {
        success: true,
        paymentIntentId: mockPaymentIntent.id,
        clientSecret: mockPaymentIntent.clientSecret
      };

      /* Real Stripe backend implementation:
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount * 100, // Convert to cents
          currency: 'usd',
          appointmentId: appointment.id,
          customerEmail: appointment.customerEmail,
          metadata: {
            customerName: appointment.customerName,
            appointmentDate: appointment.date,
            services: appointment.services?.map(s => s.name).join(', ')
          }
        }),
      });
      
      if (!response.ok) throw new Error('Failed to create payment intent');
      
      const { clientSecret, paymentIntentId } = await response.json();
      return { success: true, paymentIntentId, clientSecret };
      */

    } catch (error) {
      console.error('Payment intent creation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown payment error'
      };
    }
  }

  /**
   * Process a payment for an appointment
   */
  async processPayment(appointment: Appointment, amount: number, paymentMethodId?: string): Promise<PaymentResult> {
    try {
      console.log(`💰 Processing payment for $${amount} (Appointment: ${appointment.id})`);
      
      // Create payment intent first
      const intentResult = await this.createPaymentIntent(appointment, amount);
      if (!intentResult.success) {
        return intentResult;
      }

      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock successful payment
      const success = Math.random() > 0.1; // 90% success rate for demo
      
      if (success) {
        const invoiceUrl = await this.generateInvoice(appointment, amount, intentResult.paymentIntentId!);
        
        return {
          success: true,
          paymentIntentId: intentResult.paymentIntentId,
          invoiceUrl
        };
      } else {
        return {
          success: false,
          error: 'Payment was declined. Please try a different payment method.'
        };
      }

      /* Real Stripe payment processing:
      const { error, paymentIntent } = await this.stripe.confirmCardPayment(
        intentResult.clientSecret,
        {
          payment_method: paymentMethodId || {
            card: cardElement,
            billing_details: {
              name: appointment.customerName,
              email: appointment.customerEmail,
            },
          }
        }
      );

      if (error) {
        return { success: false, error: error.message };
      }

      if (paymentIntent.status === 'succeeded') {
        const invoiceUrl = await this.generateInvoice(appointment, amount, paymentIntent.id);
        return { 
          success: true, 
          paymentIntentId: paymentIntent.id,
          invoiceUrl 
        };
      }

      return { success: false, error: 'Payment not completed' };
      */

    } catch (error) {
      console.error('Payment processing failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown payment error'
      };
    }
  }

  /**
   * Process a refund for an appointment
   */
  async processRefund(appointment: Appointment, amount?: number): Promise<PaymentResult> {
    try {
      if (!appointment.payment?.stripePaymentIntentId) {
        return { success: false, error: 'No payment found to refund' };
      }

      console.log(`💸 Processing refund for appointment ${appointment.id}`);
      
      // Simulate refund processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock successful refund
      return {
        success: true,
        paymentIntentId: `re_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };

      /* Real Stripe refund processing:
      const response = await fetch('/api/create-refund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentIntentId: appointment.payment.stripePaymentIntentId,
          amount: amount ? amount * 100 : undefined, // Full refund if amount not specified
          reason: 'requested_by_customer'
        }),
      });

      if (!response.ok) throw new Error('Failed to process refund');
      
      const { refundId } = await response.json();
      return { success: true, paymentIntentId: refundId };
      */

    } catch (error) {
      console.error('Refund processing failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown refund error'
      };
    }
  }

  /**
   * Calculate pricing with tax and fees
   */
  calculatePricing(services: Array<{ price: number }>, discountPercent: number = 0): {
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
  } {
    const subtotal = services.reduce((sum, service) => sum + service.price, 0);
    const discount = subtotal * (discountPercent / 100);
    const taxableAmount = subtotal - discount;
    const tax = taxableAmount * 0.0875; // 8.75% tax rate (adjust for your location)
    const total = taxableAmount + tax;

    return {
      subtotal,
      discount,
      tax,
      total: Math.round(total * 100) / 100 // Round to 2 decimal places
    };
  }

  /**
   * Generate invoice URL
   * NOTE: In production, this would create a PDF invoice and store it
   */
  private async generateInvoice(appointment: Appointment, amount: number, paymentIntentId: string): Promise<string> {
    // Mock invoice generation
    const invoiceId = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`📄 Generated invoice ${invoiceId} for payment ${paymentIntentId}`);
    
    // In production, you would:
    // 1. Generate a PDF invoice using a library like PDFKit or jsPDF
    // 2. Store it in cloud storage (AWS S3, Google Cloud Storage, etc.)
    // 3. Return the public URL
    
    return `https://invoices.themobiledetailers.com/${invoiceId}.pdf`;
  }

  /**
   * Get supported payment methods
   */
  getSupportedPaymentMethods(): string[] {
    return ['card', 'apple_pay', 'google_pay', 'ach_debit'];
  }

  /**
   * Validate card information (basic client-side validation)
   */
  validateCardInfo(cardNumber: string, expiryMonth: string, expiryYear: string, cvc: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Remove spaces and validate card number
    const cleanCardNumber = cardNumber.replace(/\s/g, '');
    if (!/^\d{13,19}$/.test(cleanCardNumber)) {
      errors.push('Invalid card number');
    }

    // Validate expiry month
    const month = parseInt(expiryMonth);
    if (month < 1 || month > 12) {
      errors.push('Invalid expiry month');
    }

    // Validate expiry year
    const year = parseInt(expiryYear);
    const currentYear = new Date().getFullYear();
    if (year < currentYear || year > currentYear + 20) {
      errors.push('Invalid expiry year');
    }

    // Validate CVC
    if (!/^\d{3,4}$/.test(cvc)) {
      errors.push('Invalid CVC');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get card brand from card number
   */
  getCardBrand(cardNumber: string): string {
    const cleanNumber = cardNumber.replace(/\s/g, '');
    
    if (/^4/.test(cleanNumber)) return 'visa';
    if (/^5[1-5]/.test(cleanNumber)) return 'mastercard';
    if (/^3[47]/.test(cleanNumber)) return 'amex';
    if (/^6(?:011|5)/.test(cleanNumber)) return 'discover';
    
    return 'unknown';
  }

  /**
   * Format card number with spaces
   */
  formatCardNumber(cardNumber: string): string {
    const cleanNumber = cardNumber.replace(/\s/g, '');
    const groups = cleanNumber.match(/.{1,4}/g) || [];
    return groups.join(' ');
  }
}