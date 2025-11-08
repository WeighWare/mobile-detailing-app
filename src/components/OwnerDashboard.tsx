import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { 
  Calendar, Clock, Plus, TrendingUp, Users, CheckCircle, MessageSquare, 
  CreditCard, Star, Camera, AlertTriangle, Settings, DollarSign,
  Phone, Mail, MapPin, Timer, Award, BarChart3, Bell, BellOff
} from 'lucide-react';
import { AppointmentForm } from './AppointmentForm';
import { OwnerAppointmentCard } from './OwnerAppointmentCard';
import { CalendarView } from './CalendarView';
import { NotificationCenter } from './NotificationCenter';
import { NotificationService } from './NotificationService';
import { Appointment, Service, CustomerProfile, BusinessSettings } from '../App';

interface OwnerDashboardProps {
  appointments: Appointment[];
  onAppointmentsUpdate: (appointments: Appointment[]) => void;
  services: Service[];
  customerProfiles: CustomerProfile[];
  businessSettings: BusinessSettings;
  onBusinessSettingsUpdate: (settings: Partial<BusinessSettings>) => void;
  onSendNotification: (appointment: Appointment, type: 'reminder' | 'status_change' | 'delay') => Promise<void>;
  onProcessPayment: (appointment: Appointment, amount: number) => Promise<any>;
  notificationService: NotificationService;
}

export function OwnerDashboard({ 
  appointments, 
  onAppointmentsUpdate,
  services,
  customerProfiles,
  businessSettings,
  onBusinessSettingsUpdate,
  onSendNotification,
  onProcessPayment,
  notificationService
}: OwnerDashboardProps) {
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<Date | undefined>();
  const [delayReason, setDelayReason] = useState('');
  const [showDelayDialog, setShowDelayDialog] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Reset form state when component mounts or unmounts
  useEffect(() => {
    return () => {
      setEditingAppointment(null);
      setIsFormOpen(false);
    };
  }, []);

  // Analytics calculations with improved performance
  const analytics = React.useMemo(() => {
    const today = new Date();
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const todayAppointments = appointments.filter(apt => {
      const aptDate = new Date(apt.date);
      return aptDate.toDateString() === today.toDateString() && apt.status !== 'cancelled';
    });

    const upcomingAppointments = appointments.filter(appointment => {
      const appointmentDateTime = new Date(`${appointment.date}T${appointment.time}`);
      return appointmentDateTime >= new Date() && appointment.status !== 'cancelled';
    });

    const completedThisMonth = appointments.filter(apt => 
      apt.status === 'completed' && new Date(apt.createdAt) >= thisMonth
    );

    const pendingAppointments = appointments.filter(apt => apt.status === 'pending');
    const inProgressAppointments = appointments.filter(apt => apt.status === 'in-progress');

    // Revenue calculations
    const thisMonthRevenue = completedThisMonth.reduce((sum, apt) => 
      sum + (apt.services?.reduce((s, service) => s + service.price, 0) || 0), 0
    );

    const averageRating = appointments
      .filter(apt => apt.customerRating)
      .reduce((sum, apt, _, arr) => sum + (apt.customerRating || 0) / arr.length, 0);

    // Customer satisfaction
    const reviewedAppointments = appointments.filter(apt => apt.customerRating);
    const satisfactionRate = reviewedAppointments.length > 0 
      ? (reviewedAppointments.filter(apt => (apt.customerRating || 0) >= 4).length / reviewedAppointments.length) * 100 
      : 0;

    return {
      todayAppointments,
      upcomingAppointments,
      completedThisMonth,
      pendingAppointments,
      inProgressAppointments,
      thisMonthRevenue,
      averageRating,
      satisfactionRate,
      reviewedAppointments
    };
  }, [appointments]);

  // Filtered customers for search
  const filteredCustomers = React.useMemo(() => {
    const customerMap = new Map();
    
    appointments.forEach(apt => {
      if (apt.customerEmail && !customerMap.has(apt.customerEmail)) {
        const customerAppointments = appointments.filter(a => a.customerEmail === apt.customerEmail);
        const totalSpent = customerAppointments
          .filter(a => a.status === 'completed')
          .reduce((sum, a) => sum + (a.services?.reduce((s, service) => s + service.price, 0) || 0), 0);
        const avgRating = customerAppointments
          .filter(a => a.customerRating)
          .reduce((sum, a, _, arr) => sum + (a.customerRating || 0) / arr.length, 0);

        customerMap.set(apt.customerEmail, {
          email: apt.customerEmail,
          name: apt.customerName,
          phone: apt.customerPhone,
          appointments: customerAppointments,
          totalSpent,
          avgRating
        });
      }
    });

    const customers = Array.from(customerMap.values());
    
    if (!searchQuery) return customers;
    
    return customers.filter(customer => 
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone?.includes(searchQuery)
    );
  }, [appointments, searchQuery]);

  const handleStatusChange = async (appointmentId: string, newStatus: Appointment['status']) => {
    const appointment = appointments.find(apt => apt.id === appointmentId);
    if (!appointment) return;

    const updatedAppointments = appointments.map(apt => 
      apt.id === appointmentId 
        ? { 
            ...apt, 
            status: newStatus,
            actualStartTime: newStatus === 'in-progress' ? new Date().toISOString() : apt.actualStartTime,
            actualEndTime: newStatus === 'completed' ? new Date().toISOString() : apt.actualEndTime,
            updatedAt: new Date().toISOString()
          }
        : apt
    );
    
    onAppointmentsUpdate(updatedAppointments);
    
    // Send notification about status change
    await onSendNotification(appointment, 'status_change');
  };

  const handleSendReminder = async (appointment: Appointment) => {
    await onSendNotification(appointment, 'reminder');
    
    // Update reminder sent status
    const updatedAppointments = appointments.map(apt => 
      apt.id === appointment.id ? { ...apt, reminderSent: true, updatedAt: new Date().toISOString() } : apt
    );
    onAppointmentsUpdate(updatedAppointments);
  };

  const handleDelayNotification = async (appointmentId: string) => {
    const appointment = appointments.find(apt => apt.id === appointmentId);
    if (!appointment) return;

    // Update appointment with delay reason
    const updatedAppointments = appointments.map(apt => 
      apt.id === appointmentId 
        ? { ...apt, delayReason, status: 'delayed' as const, updatedAt: new Date().toISOString() }
        : apt
    );
    onAppointmentsUpdate(updatedAppointments);

    // Send delay notification
    await onSendNotification({ ...appointment, delayReason }, 'delay');
    
    setShowDelayDialog(false);
    setDelayReason('');
    setSelectedAppointmentId(null);
  };

  const openDelayDialog = (appointmentId: string) => {
    setSelectedAppointmentId(appointmentId);
    setShowDelayDialog(true);
  };

  const handlePaymentProcess = async (appointmentId: string) => {
    const appointment = appointments.find(apt => apt.id === appointmentId);
    if (!appointment) return;

    const totalAmount = appointment.services?.reduce((sum, service) => sum + service.price, 0) || 0;
    const result = await onProcessPayment(appointment, totalAmount);
    
    if (result.success) {
      // Update appointment with payment success
      const updatedAppointments = appointments.map(apt => 
        apt.id === appointmentId 
          ? { 
              ...apt, 
              payment: { 
                ...apt.payment,
                status: 'paid' as const,
                stripePaymentIntentId: result.paymentIntentId 
              },
              updatedAt: new Date().toISOString()
            }
          : apt
      );
      onAppointmentsUpdate(updatedAppointments);
    }
  };

  const handleAddAppointment = (appointmentData: Omit<Appointment, 'id' | 'createdAt'>) => {
    const newAppointment: Appointment = {
      ...appointmentData,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
    };
    onAppointmentsUpdate([...appointments, newAppointment]);
    setIsFormOpen(false);
  };

  const handleEditAppointment = (appointmentData: Omit<Appointment, 'id' | 'createdAt'>) => {
    if (editingAppointment) {
      const updatedAppointments = appointments.map(apt => 
        apt.id === editingAppointment.id 
          ? { 
              ...appointmentData, 
              id: editingAppointment.id, 
              createdAt: editingAppointment.createdAt,
              updatedAt: new Date().toISOString()
            }
          : apt
      );
      onAppointmentsUpdate(updatedAppointments);
      setEditingAppointment(null);
      setIsFormOpen(false);
    }
  };

  const handleDeleteAppointment = (id: string) => {
    const updatedAppointments = appointments.filter(apt => apt.id !== id);
    onAppointmentsUpdate(updatedAppointments);
  };

  const openAddForm = () => {
    setEditingAppointment(null);
    setIsFormOpen(true);
  };

  const openEditForm = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Dashboard Overview */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.todayAppointments.length}</div>
                <p className="text-xs text-muted-foreground">
                  {analytics.inProgressAppointments.length} in progress
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.pendingAppointments.length}</div>
                <p className="text-xs text-muted-foreground">
                  Need immediate attention
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${analytics.thisMonthRevenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {analytics.completedThisMonth.length} services completed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Customer Satisfaction</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.averageRating.toFixed(1)}/5</div>
                <p className="text-xs text-muted-foreground">
                  {analytics.satisfactionRate.toFixed(0)}% satisfaction rate
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full" onClick={openAddForm}>
                      <Plus className="w-4 h-4 mr-2" />
                      Schedule Appointment
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingAppointment ? 'Edit Appointment' : 'Schedule New Appointment'}
                      </DialogTitle>
                      <DialogDescription>
                        {editingAppointment 
                          ? 'Update the appointment details below.' 
                          : 'Fill in the details to schedule a new appointment.'
                        }
                      </DialogDescription>
                    </DialogHeader>
                    <AppointmentForm
                      initialData={editingAppointment}
                      onSubmit={editingAppointment ? handleEditAppointment : handleAddAppointment}
                      onCancel={() => setIsFormOpen(false)}
                      isOwnerForm={true}
                      existingAppointments={appointments}
                      services={services}
                    />
                  </DialogContent>
                </Dialog>
                
                <Button variant="outline" className="w-full" onClick={() => setActiveTab('notifications')}>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Notification Center
                </Button>
                
                <Button variant="outline" className="w-full">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Generate Report
                </Button>
              </CardContent>
            </Card>

            {/* Today's Schedule */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Today's Schedule</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {analytics.todayAppointments.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No appointments today</p>
                ) : (
                  analytics.todayAppointments.slice(0, 3).map(apt => (
                    <div key={apt.id} className="flex items-center justify-between p-2 bg-muted rounded">
                      <div>
                        <p className="font-medium text-sm">{apt.customerName}</p>
                        <p className="text-xs text-muted-foreground">{apt.time}</p>
                      </div>
                      <Badge variant={apt.status === 'confirmed' ? 'default' : 'secondary'}>
                        {apt.status}
                      </Badge>
                    </div>
                  ))
                )}
                {analytics.todayAppointments.length > 3 && (
                  <p className="text-sm text-muted-foreground">
                    +{analytics.todayAppointments.length - 3} more appointments
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  {businessSettings.notifications.automatedReminders ? (
                    <Bell className="w-4 h-4 text-green-500" />
                  ) : (
                    <BellOff className="w-4 h-4 text-red-500" />
                  )}
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {analytics.pendingAppointments.length > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {analytics.pendingAppointments.length} pending appointment{analytics.pendingAppointments.length > 1 ? 's' : ''} need approval
                    </AlertDescription>
                  </Alert>
                )}
                
                {analytics.inProgressAppointments.length > 0 && (
                  <Alert>
                    <Timer className="h-4 w-4" />
                    <AlertDescription>
                      {analytics.inProgressAppointments.length} service{analytics.inProgressAppointments.length > 1 ? 's' : ''} currently in progress
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Auto-reminders:</span>
                    <span className={businessSettings.notifications.automatedReminders ? 'text-green-600' : 'text-red-600'}>
                      {businessSettings.notifications.automatedReminders ? '✓ Active' : '✗ Disabled'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>SMS notifications:</span>
                    <span className={businessSettings.notifications.smsEnabled ? 'text-green-600' : 'text-red-600'}>
                      {businessSettings.notifications.smsEnabled ? '✓ Enabled' : '✗ Disabled'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Email notifications:</span>
                    <span className={businessSettings.notifications.emailEnabled ? 'text-green-600' : 'text-red-600'}>
                      {businessSettings.notifications.emailEnabled ? '✓ Enabled' : '✗ Disabled'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Appointments Management */}
        <TabsContent value="appointments" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Appointment Management</h2>
            <Button onClick={openAddForm}>
              <Plus className="w-4 h-4 mr-2" />
              New Appointment
            </Button>
          </div>

          <Tabs defaultValue="upcoming" className="space-y-4">
            <TabsList>
              <TabsTrigger value="upcoming">Upcoming ({analytics.upcomingAppointments.length})</TabsTrigger>
              <TabsTrigger value="pending">Pending ({analytics.pendingAppointments.length})</TabsTrigger>
              <TabsTrigger value="in-progress">In Progress ({analytics.inProgressAppointments.length})</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="space-y-4">
              {analytics.upcomingAppointments.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No upcoming appointments</h3>
                    <p className="text-muted-foreground mb-4">
                      Get started by scheduling your first appointment.
                    </p>
                    <Button onClick={openAddForm}>
                      <Plus className="w-4 h-4 mr-2" />
                      Schedule Appointment
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                analytics.upcomingAppointments.map(appointment => (
                  <OwnerAppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    onEdit={() => openEditForm(appointment)}
                    onDelete={() => handleDeleteAppointment(appointment.id)}
                    onSendReminder={() => handleSendReminder(appointment)}
                    onStatusChange={(status) => handleStatusChange(appointment.id, status)}
                    onDelayNotification={() => openDelayDialog(appointment.id)}
                    onProcessPayment={() => handlePaymentProcess(appointment.id)}
                    services={services}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="pending" className="space-y-4">
              {analytics.pendingAppointments.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
                    <h3 className="text-lg font-medium mb-2">All caught up!</h3>
                    <p className="text-muted-foreground">No pending appointment requests to review.</p>
                  </CardContent>
                </Card>
              ) : (
                analytics.pendingAppointments.map(appointment => (
                  <OwnerAppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    onEdit={() => openEditForm(appointment)}
                    onDelete={() => handleDeleteAppointment(appointment.id)}
                    onSendReminder={() => handleSendReminder(appointment)}
                    onStatusChange={(status) => handleStatusChange(appointment.id, status)}
                    onDelayNotification={() => openDelayDialog(appointment.id)}
                    onProcessPayment={() => handlePaymentProcess(appointment.id)}
                    services={services}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="in-progress" className="space-y-4">
              {analytics.inProgressAppointments.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Timer className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No services in progress</h3>
                    <p className="text-muted-foreground">Active services will appear here.</p>
                  </CardContent>
                </Card>
              ) : (
                analytics.inProgressAppointments.map(appointment => (
                  <OwnerAppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    onEdit={() => openEditForm(appointment)}
                    onDelete={() => handleDeleteAppointment(appointment.id)}
                    onSendReminder={() => handleSendReminder(appointment)}
                    onStatusChange={(status) => handleStatusChange(appointment.id, status)}
                    onDelayNotification={() => openDelayDialog(appointment.id)}
                    onProcessPayment={() => handlePaymentProcess(appointment.id)}
                    services={services}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              {appointments.filter(apt => apt.status === 'completed').length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <CheckCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No completed services yet</h3>
                    <p className="text-muted-foreground">Completed appointments will appear here.</p>
                  </CardContent>
                </Card>
              ) : (
                appointments.filter(apt => apt.status === 'completed').slice(0, 10).map(appointment => (
                  <OwnerAppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    onEdit={() => openEditForm(appointment)}
                    onDelete={() => handleDeleteAppointment(appointment.id)}
                    onSendReminder={() => handleSendReminder(appointment)}
                    onStatusChange={(status) => handleStatusChange(appointment.id, status)}
                    onDelayNotification={() => openDelayDialog(appointment.id)}
                    onProcessPayment={() => handlePaymentProcess(appointment.id)}
                    services={services}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Calendar View */}
        <TabsContent value="calendar" className="space-y-4">
          <CalendarView 
            appointments={appointments}
            onDateSelect={setCalendarSelectedDate}
            selectedDate={calendarSelectedDate}
          />
        </TabsContent>

        {/* Customer Management */}
        <TabsContent value="customers" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Customer Management</h2>
            <div className="flex gap-2">
              <Input 
                placeholder="Search customers..." 
                className="w-64" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button variant="outline">Export</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCustomers.map(customer => (
              <Card key={customer.email}>
                <CardHeader>
                  <CardTitle className="text-lg">{customer.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{customer.email}</p>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total Appointments:</span>
                    <span className="font-medium">{customer.appointments.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total Spent:</span>
                    <span className="font-medium">${customer.totalSpent}</span>
                  </div>
                  {customer.avgRating > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Avg Rating:</span>
                      <span className="font-medium">{customer.avgRating.toFixed(1)}/5</span>
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      <Phone className="w-3 h-3 mr-1" />
                      Call
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      <Mail className="w-3 h-3 mr-1" />
                      Email
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Notification Center */}
        <TabsContent value="notifications" className="space-y-4">
          <NotificationCenter
            notificationService={notificationService}
            appointments={appointments}
            businessSettings={businessSettings}
            onSettingsUpdate={onBusinessSettingsUpdate}
          />
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics" className="space-y-6">
          <h2 className="text-2xl font-bold">Business Analytics</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">${analytics.thisMonthRevenue.toLocaleString()}</div>
                <p className="text-sm text-muted-foreground">This month</p>
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Target: $5,000</span>
                    <span>{((analytics.thisMonthRevenue / 5000) * 100).toFixed(0)}%</span>
                  </div>
                  <Progress value={(analytics.thisMonthRevenue / 5000) * 100} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Service Popularity</CardTitle>
              </CardHeader>
              <CardContent>
                {services.map(service => {
                  const count = appointments.filter(apt => 
                    apt.services?.some(s => s.id === service.id)
                  ).length;
                  const percentage = appointments.length > 0 ? (count / appointments.length) * 100 : 0;
                  
                  return (
                    <div key={service.id} className="mb-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span>{service.name}</span>
                        <span>{count} bookings</span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Customer Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold">{new Set(appointments.map(apt => apt.customerEmail)).size}</div>
                    <p className="text-sm text-muted-foreground">Total Customers</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{(analytics.thisMonthRevenue / Math.max(analytics.completedThisMonth.length, 1)).toFixed(0)}</div>
                    <p className="text-sm text-muted-foreground">Avg Order Value</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{analytics.satisfactionRate.toFixed(0)}%</div>
                    <p className="text-sm text-muted-foreground">Satisfaction Rate</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{analytics.reviewedAppointments.length}</div>
                    <p className="text-sm text-muted-foreground">Reviews Given</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Settings */}
        <TabsContent value="settings" className="space-y-4">
          <h2 className="text-2xl font-bold">Business Settings</h2>
          <Card>
            <CardHeader>
              <CardTitle>Coming Soon</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Business settings configuration will be available in the next update.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delay Dialog */}
      <Dialog open={showDelayDialog} onOpenChange={setShowDelayDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notify Customer of Delay</DialogTitle>
            <DialogDescription>
              Send a notification to the customer about the appointment delay.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="delay-reason">Reason for delay</Label>
              <Textarea
                id="delay-reason"
                value={delayReason}
                onChange={(e) => setDelayReason(e.target.value)}
                placeholder="Previous appointment running longer than expected..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDelayDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => selectedAppointmentId && handleDelayNotification(selectedAppointmentId)}>
                Send Notification
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}