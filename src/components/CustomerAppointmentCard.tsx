import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Textarea } from './ui/textarea';
import {
  Calendar, Clock, MapPin, CreditCard, Star, Truck,
  XCircle, MessageSquare, Receipt, CheckCircle
} from 'lucide-react';
import { Appointment } from '../App';
import { PaymentCheckout } from './PaymentCheckout';

interface CustomerAppointmentCardProps {
  appointment: Appointment;
  onCancel: () => void;
  onPaymentSuccess: (paymentIntentId: string) => void;
  onRate: (rating: number, review?: string) => void;
  isHistoryView?: boolean;
}

export function CustomerAppointmentCard({
  appointment,
  onCancel,
  onPaymentSuccess,
  onRate,
  isHistoryView = false
}: CustomerAppointmentCardProps) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');

  const appointmentDate = new Date(appointment.date);
  const isUpcoming = appointmentDate >= new Date() && appointment.status !== 'cancelled';
  const canCancel = isUpcoming && appointment.status !== 'in-progress';
  const canRate = appointment.status === 'completed' && !appointment.customerRating;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'in-progress': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handlePaymentClick = () => {
    setShowPaymentDialog(true);
  };

  const handlePaymentComplete = (paymentIntentId: string) => {
    onPaymentSuccess(paymentIntentId);
    setShowPaymentDialog(false);
  };

  const handleRateSubmit = () => {
    onRate(rating, review);
    setShowRatingDialog(false);
    setRating(0);
    setReview('');
  };

  const totalCost = appointment.services?.reduce((sum, service) => sum + service.price, 0) || 0;

  return (
    <>
      <Card className="transition-all duration-200 hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  {appointmentDate.toLocaleDateString()}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  {appointment.time}
                </div>
              </div>
              <Badge className={getStatusColor(appointment.status)}>
                {appointment.status.replace('-', ' ')}
              </Badge>
            </div>
            
            <div className="flex gap-2">
              {appointment.payment?.status === 'pending' && (
                <Button
                  size="sm"
                  onClick={handlePaymentClick}
                >
                  <CreditCard className="w-4 h-4 mr-1" />
                  Pay Now
                </Button>
              )}
              
              {canRate && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setShowRatingDialog(true)}
                >
                  <Star className="w-4 h-4 mr-1" />
                  Rate Service
                </Button>
              )}
              
              {canCancel && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setShowCancelDialog(true)}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Services */}
          <div>
            <h4 className="font-medium mb-2">Services</h4>
            <div className="space-y-2">
              {appointment.services?.map((service, index) => (
                <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                  <span>{service.name}</span>
                  <span className="font-medium">${service.price}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center mt-2 pt-2 border-t font-medium">
              <span>Total</span>
              <span>${totalCost}</span>
            </div>
          </div>

          {/* Vehicle & Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {appointment.vehicleInfo && (
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">
                  {appointment.vehicleInfo.year} {appointment.vehicleInfo.make} {appointment.vehicleInfo.model}
                </span>
              </div>
            )}
            
            {appointment.location && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{appointment.location.city}, {appointment.location.state}</span>
              </div>
            )}
          </div>

          {/* Rating Display */}
          {appointment.customerRating && (
            <div className="p-3 bg-yellow-50 rounded">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium">Your Rating:</span>
                <div className="flex">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star 
                      key={i} 
                      className={`w-4 h-4 ${
                        i < appointment.customerRating! ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                      }`} 
                    />
                  ))}
                </div>
              </div>
              {appointment.customerReview && (
                <p className="text-sm text-muted-foreground italic">
                  "{appointment.customerReview}"
                </p>
              )}
            </div>
          )}

          {/* Payment Status */}
          <div className="flex items-center justify-between p-2 bg-muted rounded">
            <span className="text-sm">Payment Status:</span>
            <Badge variant={appointment.payment?.status === 'paid' ? 'default' : 'secondary'}>
              {appointment.payment?.status || 'pending'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Cancel Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Appointment</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this appointment? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Keep Appointment
            </Button>
            <Button variant="destructive" onClick={() => {
              onCancel();
              setShowCancelDialog(false);
            }}>
              Cancel Appointment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rating Dialog */}
      <Dialog open={showRatingDialog} onOpenChange={setShowRatingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rate Your Service</DialogTitle>
            <DialogDescription>
              How was your car detailing experience?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-center gap-2">
              {Array.from({ length: 5 }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setRating(i + 1)}
                  className="p-1"
                >
                  <Star
                    className={`w-8 h-8 ${
                      i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            <Textarea
              placeholder="Share your experience (optional)"
              value={review}
              onChange={(e) => setReview(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowRatingDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleRateSubmit} disabled={rating === 0}>
                Submit Rating
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Checkout Dialog */}
      <PaymentCheckout
        appointment={appointment}
        isOpen={showPaymentDialog}
        onClose={() => setShowPaymentDialog(false)}
        onSuccess={handlePaymentComplete}
      />
    </>
  );
}