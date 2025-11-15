import { useEffect, useState } from 'react';
import { useStripePayment } from '../hooks/useStripePayment';
import { Alert, AlertDescription } from './ui/alert';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface PaymentReturnHandlerProps {
  onPaymentSuccess: (paymentIntentId: string) => void;
}

/**
 * Handles the return flow from 3D Secure authentication
 *
 * When a payment requires 3D Secure (or other authentication), Stripe redirects
 * the user to authenticate, then redirects back to the app with payment_intent
 * and payment_intent_client_secret in the URL query params.
 *
 * This component:
 * 1. Checks URL params for payment_intent
 * 2. Retrieves the payment intent from Stripe
 * 3. Shows success/error feedback
 * 4. Updates appointment payment status
 * 5. Cleans up URL params
 */
export function PaymentReturnHandler({ onPaymentSuccess }: PaymentReturnHandlerProps) {
  const { stripePromise } = useStripePayment();
  const [status, setStatus] = useState<'idle' | 'processing' | 'succeeded' | 'failed'>('idle');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    const handlePaymentReturn = async () => {
      // Check if we're returning from a payment redirect
      const urlParams = new URLSearchParams(window.location.search);
      const paymentIntentClientSecret = urlParams.get('payment_intent_client_secret');
      const paymentIntentId = urlParams.get('payment_intent');

      if (!paymentIntentClientSecret || !stripePromise) {
        return;
      }

      setStatus('processing');

      try {
        const stripe = await stripePromise;
        if (!stripe) {
          throw new Error('Stripe failed to initialize');
        }

        // Retrieve the PaymentIntent to check its status
        const { paymentIntent, error } = await stripe.retrievePaymentIntent(
          paymentIntentClientSecret
        );

        if (error) {
          throw new Error(error.message);
        }

        if (!paymentIntent) {
          throw new Error('Payment intent not found');
        }

        // Handle different payment statuses
        switch (paymentIntent.status) {
          case 'succeeded':
            setStatus('succeeded');
            setMessage('Payment successful! Your appointment has been confirmed.');
            onPaymentSuccess(paymentIntent.id);
            break;

          case 'processing':
            setStatus('processing');
            setMessage('Payment is processing. We\'ll update you when payment is received.');
            break;

          case 'requires_payment_method':
            setStatus('failed');
            setMessage('Payment failed. Please try again with a different payment method.');
            break;

          default:
            setStatus('failed');
            setMessage('Payment was not completed. Please try again.');
        }
      } catch (err) {
        console.error('Error handling payment return:', err);
        setStatus('failed');
        setMessage(
          err instanceof Error
            ? err.message
            : 'An error occurred while processing your payment.'
        );
      } finally {
        // Clean up URL params after processing
        const url = new URL(window.location.href);
        url.searchParams.delete('payment_intent');
        url.searchParams.delete('payment_intent_client_secret');
        url.searchParams.delete('redirect_status');
        window.history.replaceState({}, '', url.toString());
      }
    };

    handlePaymentReturn();
  }, [stripePromise, onPaymentSuccess]);

  // Don't render anything if we're not handling a payment return
  if (status === 'idle') {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md animate-in slide-in-from-top">
      {status === 'processing' && (
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertDescription>
            Processing your payment...
          </AlertDescription>
        </Alert>
      )}

      {status === 'succeeded' && (
        <Alert className="border-green-200 bg-green-50 text-green-900">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {message}
          </AlertDescription>
        </Alert>
      )}

      {status === 'failed' && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            {message}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
