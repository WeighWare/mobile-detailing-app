import React, { useState, useEffect } from 'react';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Loader2, CreditCard, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { useStripePayment } from '../hooks/useStripePayment';
import { Appointment } from '../App';

interface PaymentCheckoutProps {
  appointment: Appointment;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (paymentIntentId: string) => void;
}

/**
 * Payment form component that uses Stripe Elements
 * This is the actual payment UI inside the Elements provider
 */
function PaymentForm({
  appointment,
  onSuccess,
  onError
}: {
  appointment: Appointment;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      setErrorMessage('Payment system not initialized. Please refresh and try again.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // Submit the payment form
      const { error: submitError } = await elements.submit();
      if (submitError) {
        throw new Error(submitError.message);
      }

      // Confirm the payment
      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          // Return to home page after 3D Secure authentication
          // Note: redirect only happens if 3D Secure is required (redirect: 'if_required')
          return_url: window.location.origin,
          payment_method_data: {
            billing_details: {
              name: appointment.customerName,
              email: appointment.customerEmail || '',
            },
          },
        },
        redirect: 'if_required',
      });

      if (confirmError) {
        throw new Error(confirmError.message || 'Payment confirmation failed');
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        onSuccess(paymentIntent.id);
      } else {
        throw new Error('Payment was not completed');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment failed. Please try again.';
      setErrorMessage(message);
      onError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const totalAmount = appointment.services?.reduce((sum, service) => sum + service.price, 0) || 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Payment summary */}
      <div className="bg-muted p-4 rounded-lg space-y-2">
        <div className="flex justify-between text-sm">
          <span>Appointment Date:</span>
          <span className="font-medium">
            {new Date(appointment.date).toLocaleDateString()} at {appointment.time}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Services:</span>
          <span className="font-medium">{appointment.services?.length || 0} service(s)</span>
        </div>
        <div className="flex justify-between text-lg font-bold pt-2 border-t">
          <span>Total Amount:</span>
          <span>${totalAmount.toFixed(2)}</span>
        </div>
      </div>

      {/* Stripe Payment Element */}
      <div className="border rounded-lg p-4 bg-background">
        <PaymentElement />
      </div>

      {/* Error message */}
      {errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* Security notice */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Lock className="w-3 h-3" />
        <span>Secured by Stripe. Your payment information is encrypted and secure.</span>
      </div>

      {/* Submit button */}
      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={!stripe || !elements || isProcessing}
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing Payment...
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4 mr-2" />
            Pay ${totalAmount.toFixed(2)}
          </>
        )}
      </Button>
    </form>
  );
}

/**
 * Main payment checkout component
 * Handles payment intent creation and Stripe Elements setup
 */
export function PaymentCheckout({
  appointment,
  isOpen,
  onClose,
  onSuccess
}: PaymentCheckoutProps) {
  const { stripePromise, createPaymentIntent, isLoading, error } = useStripePayment();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const totalAmount = appointment.services?.reduce((sum, service) => sum + service.price, 0) || 0;

  // Create payment intent when dialog opens
  useEffect(() => {
    if (isOpen && !clientSecret && stripePromise) {
      const initializePayment = async () => {
        setPaymentStatus('processing');
        setErrorMessage(null);

        const result = await createPaymentIntent(
          totalAmount,
          appointment.id,
          appointment.customerEmail || '',
          undefined,
          {
            customerName: appointment.customerName,
            appointmentDate: appointment.date,
            services: appointment.services?.map(s => s.name).join(', ') || '',
          }
        );

        if (result) {
          setClientSecret(result.clientSecret);
          setPaymentStatus('idle');
        } else {
          setPaymentStatus('error');
          setErrorMessage('Failed to initialize payment. Please try again.');
        }
      };

      initializePayment();
    }
    // Note: 'error' is intentionally excluded from deps to prevent infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, clientSecret, stripePromise, createPaymentIntent, totalAmount, appointment]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setClientSecret(null);
      setPaymentStatus('idle');
      setErrorMessage(null);
    }
  }, [isOpen]);

  const handlePaymentSuccess = (paymentIntentId: string) => {
    setPaymentStatus('success');
    setTimeout(() => {
      onSuccess(paymentIntentId);
      onClose();
    }, 2000);
  };

  const handlePaymentError = (error: string) => {
    setPaymentStatus('error');
    setErrorMessage(error);
  };

  // Stripe Elements options
  const elementsOptions = clientSecret ? {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#0066cc',
        borderRadius: '8px',
      },
    },
  } : undefined;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payment Checkout
          </DialogTitle>
          <DialogDescription>
            Complete your payment for the detailing appointment
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Loading state */}
          {paymentStatus === 'processing' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Initializing secure payment...</p>
            </div>
          )}

          {/* Success state */}
          {paymentStatus === 'success' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">Payment Successful!</h3>
                <p className="text-sm text-muted-foreground">
                  Your payment has been processed. You'll receive a confirmation email shortly.
                </p>
              </div>
            </div>
          )}

          {/* Error state */}
          {paymentStatus === 'error' && errorMessage && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {/* Stripe not configured warning */}
          {!stripePromise && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Payment system not configured.</strong><br />
                Please add your Stripe publishable key to the environment variables.
                See .env.example for instructions.
              </AlertDescription>
            </Alert>
          )}

          {/* Payment form */}
          {paymentStatus === 'idle' && clientSecret && stripePromise && (
            <Elements stripe={stripePromise} options={elementsOptions}>
              <PaymentForm
                appointment={appointment}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
              />
            </Elements>
          )}

          {/* Retry button for errors */}
          {paymentStatus === 'error' && (
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={() => {
                setClientSecret(null);
                setPaymentStatus('idle');
                setErrorMessage(null);
              }}>
                Try Again
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
