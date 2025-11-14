import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import { 
  Calendar, Clock, MapPin, Plus, Star, CreditCard, Phone, Mail,
  CheckCircle, XCircle, Truck, Award, Gift, MessageSquare, Receipt
} from 'lucide-react';
import { CustomerBookingForm } from './CustomerBookingForm';
import { CustomerAppointmentCard } from './CustomerAppointmentCard';
import { Appointment, Service, BusinessSettings } from '../App';

interface CustomerPortalProps {
  appointments: Appointment[];
  customerEmail: string;
  onAppointmentsUpdate: (appointments: Appointment[]) => void;
  services: Service[];
  businessSettings: BusinessSettings;
}

export function CustomerPortal({
  appointments,
  customerEmail,
  onAppointmentsUpdate,
  services,
  businessSettings
}: CustomerPortalProps) {
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('appointments');

  // Filter appointments for this customer
  const customerAppointments = appointments.filter(apt => 
    apt.customerEmail === customerEmail
  );

  const upcomingAppointments = customerAppointments.filter(apt => {
    const appointmentDate = new Date(`${apt.date}T${apt.time}`);
    return appointmentDate >= new Date() && apt.status !== 'cancelled';
  });

  const pastAppointments = customerAppointments.filter(apt => {
    const appointmentDate = new Date(`${apt.date}T${apt.time}`);
    return appointmentDate < new Date() || apt.status === 'completed';
  });

  const pendingPayments = customerAppointments.filter(apt => 
    apt.payment?.status === 'pending' && apt.status !== 'cancelled'
  );

  // Calculate customer stats
  const totalSpent = customerAppointments
    .filter(apt => apt.status === 'completed')
    .reduce((sum, apt) => sum + (apt.payment?.amount || 0), 0);

  const loyaltyPoints = customerAppointments
    .reduce((sum, apt) => sum + (apt.loyaltyPointsEarned || 0), 0);

  const averageRating = customerAppointments
    .filter(apt => apt.customerRating)
    .reduce((sum, apt, _, arr) => sum + (apt.customerRating || 0) / arr.length, 0);

  const handleNewBooking = (appointmentData: Omit<Appointment, 'id' | 'createdAt'>) => {
    const newAppointment: Appointment = {
      ...appointmentData,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
      customerEmail: customerEmail,
      contactEmail: customerEmail,
    };
    onAppointmentsUpdate([...appointments, newAppointment]);
    setIsBookingOpen(false);
  };

  const handleCancelAppointment = (appointmentId: string) => {
    const updatedAppointments = appointments.map(apt =>
      apt.id === appointmentId
        ? { ...apt, status: 'cancelled' as const }
        : apt
    );
    onAppointmentsUpdate(updatedAppointments);
  };

  const createPaymentSuccessHandler = (appointmentId: string) => (paymentIntentId: string) => {
    const updatedAppointments = appointments.map(apt =>
      apt.id === appointmentId
        ? {
            ...apt,
            payment: {
              ...apt.payment!,
              status: 'paid' as const,
              stripePaymentIntentId: paymentIntentId
            },
            updatedAt: new Date().toISOString()
          }
        : apt
    );
    onAppointmentsUpdate(updatedAppointments);
  };

  const handleRateService = (appointmentId: string, rating: number, review?: string) => {
    const updatedAppointments = appointments.map(apt =>
      apt.id === appointmentId
        ? { ...apt, customerRating: rating, customerReview: review }
        : apt
    );
    onAppointmentsUpdate(updatedAppointments);
  };

  return (
    <div className="space-y-6">
      {/* Customer Welcome Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Welcome back!</h2>
            <p className="text-muted-foreground mt-1">
              Manage your car detailing appointments and track your service history
            </p>
          </div>
          <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
            <DialogTrigger asChild>
              <Button size="lg">
                <Plus className="w-4 h-4 mr-2" />
                Book Service
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Book a New Service</DialogTitle>
                <DialogDescription>
                  Choose your services and schedule your next car detailing appointment.
                </DialogDescription>
              </DialogHeader>
              <CustomerBookingForm
                services={services}
                existingAppointments={appointments}
                businessSettings={businessSettings}
                onSubmit={handleNewBooking}
                onCancel={() => setIsBookingOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingAppointments.length}</div>
            <p className="text-xs text-muted-foreground">
              {upcomingAppointments.length === 1 ? 'appointment' : 'appointments'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalSpent.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">
              {customerAppointments.filter(apt => apt.status === 'completed').length} services
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Loyalty Points</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loyaltyPoints}</div>
            <p className="text-xs text-muted-foreground">
              Earn 1 point per $10 spent
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {averageRating > 0 ? averageRating.toFixed(1) : '--'}
            </div>
            <p className="text-xs text-muted-foreground">
              Your service ratings
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Payments Alert */}
      {pendingPayments.length > 0 && (
        <Alert>
          <CreditCard className="h-4 w-4" />
          <AlertDescription>
            You have {pendingPayments.length} appointment{pendingPayments.length > 1 ? 's' : ''} with pending payments.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="loyalty">Rewards</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
        </TabsList>

        <TabsContent value="appointments" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Your Appointments</h3>
          </div>

          {upcomingAppointments.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No upcoming appointments</h3>
                <p className="text-muted-foreground mb-4">
                  Ready to give your car some love? Book your next detailing service.
                </p>
                <Button onClick={() => setIsBookingOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Book Your First Service
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {upcomingAppointments.map(appointment => (
                <CustomerAppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  onCancel={() => handleCancelAppointment(appointment.id)}
                  onPaymentSuccess={createPaymentSuccessHandler(appointment.id)}
                  onRate={(rating, review) => handleRateService(appointment.id, rating, review)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <h3 className="text-xl font-semibold">Service History</h3>
          {pastAppointments.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No service history yet</h3>
                <p className="text-muted-foreground">
                  Your completed services will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pastAppointments.slice(0, 10).map(appointment => (
                <CustomerAppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  onCancel={() => handleCancelAppointment(appointment.id)}
                  onPaymentSuccess={createPaymentSuccessHandler(appointment.id)}
                  onRate={(rating, review) => handleRateService(appointment.id, rating, review)}
                  isHistoryView={true}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="loyalty" className="space-y-6">
          <h3 className="text-xl font-semibold">Loyalty Rewards</h3>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                Your Points Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-4">
                <div className="text-4xl font-bold text-primary">{loyaltyPoints}</div>
                <p className="text-muted-foreground">Available Points</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress to next reward (500 points)</span>
                    <span>{loyaltyPoints}/500</span>
                  </div>
                  <Progress value={(loyaltyPoints / 500) * 100} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact" className="space-y-4">
          <h3 className="text-xl font-semibold">Contact Information</h3>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">(555) 123-DETAIL</p>
                    <p className="text-sm text-muted-foreground">Call us for immediate assistance</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">info@themobiledetailers.com</p>
                    <p className="text-sm text-muted-foreground">Email us your questions</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Mobile Service Area</p>
                    <p className="text-sm text-muted-foreground">We come to you within 25 miles</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}