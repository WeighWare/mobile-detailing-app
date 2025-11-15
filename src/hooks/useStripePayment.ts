import { useState, useCallback } from 'react';
import { loadStripe } from '@stripe/stripe-js';

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

if (!stripePublishableKey) {
  console.warn(
    '⚠️  Stripe publishable key not found. Payment processing will not work.\n' +
    'Please add VITE_STRIPE_PUBLISHABLE_KEY to your .env.local file.\n' +
    'See .env.example for details.'
  );
}

// Initialize Stripe
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

export interface PaymentIntentResult {
  clientSecret: string;
  paymentIntentId: string;
}

export function useStripePayment() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Create a payment intent on the backend
   */
  const createPaymentIntent = useCallback(async (
    amount: number,
    appointmentId: string,
    customerEmail: string,
    customerId?: string,
    metadata?: Record<string, string>
  ): Promise<PaymentIntentResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          appointmentId,
          customerEmail,
          customerId,
          metadata,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create payment intent');
      }

      const data = await response.json();
      return {
        clientSecret: data.clientSecret,
        paymentIntentId: data.paymentIntentId,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error creating payment intent:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    stripePromise,
    isLoading,
    error,
    createPaymentIntent,
  };
}
