import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from './components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Switch } from './components/ui/switch';
import { Calendar, Users, Settings } from 'lucide-react';
import { OwnerDashboard } from './components/OwnerDashboard';
import { CustomerPortal } from './components/CustomerPortal';
import { NotificationService } from './components/NotificationService';
import { PaymentService } from './components/PaymentService';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PerformanceMonitor } from './components/PerformanceMonitor';

// Enhanced service types with better organization
export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number; // in minutes
  category: 'exterior' | 'interior' | 'full' | 'addon';
  isActive: boolean;
  popularityRank?: number;
}

// Enhanced appointment interface with better TypeScript typing
export interface Appointment {
  id: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  date: string;
  time: string;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
  reminderSent?: boolean;
  status: 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'delayed';
  createdAt: string;
  updatedAt?: string;
  // Enhanced fields
  services: Service[];
  vehicleInfo?: {
    make: string;
    model: string;
    year: number;
    color: string;
    licensePlate?: string;
    size?: 'compact' | 'midsize' | 'large' | 'suv' | 'truck';
  };
  location?: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    coordinates?: { lat: number; lng: number };
    parkingInstructions?: string;
  };
  payment?: {
    status: 'pending' | 'paid' | 'refunded' | 'failed';
    amount: number;
    method: 'card' | 'cash' | 'bank_transfer';
    stripePaymentIntentId?: string;
    invoiceUrl?: string;
    refundReason?: string;
    depositAmount?: number;
  };
  beforePhotos?: string[];
  afterPhotos?: string[];
  customerRating?: number;
  customerReview?: string;
  estimatedDuration?: number;
  actualStartTime?: string;
  actualEndTime?: string;
  delayReason?: string;
  loyaltyPointsEarned?: number;
  assignedTechnician?: string;
  equipmentUsed?: string[];
  weatherConditions?: string;
  completionNotes?: string;
}

// Customer profile interface with enhanced features
export interface CustomerProfile {
  id: string;
  email: string;
  name: string;
  phone: string;
  preferredContactMethod: 'email' | 'sms' | 'both';
  loyaltyPoints: number;
  totalBookings: number;
  averageRating: number;
  createdAt: string;
  lastBookingDate?: string;
  vehicleHistory: Array<{
    make: string;
    model: string;
    year: number;
    color: string;
    licensePlate?: string;
    size?: string;
  }>;
  preferences: {
    preferredServices: string[];
    preferredTimes: string[];
    preferredDays: string[];
  };
  notifications: {
    reminders: boolean;
    promotions: boolean;
    statusUpdates: boolean;
    newsletter: boolean;
  };
  addresses: Array<{
    id: string;
    label: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    isDefault: boolean;
  }>;
}

// Business settings interface with enhanced configuration
export interface BusinessSettings {
  businessHours: {
    [key: string]: { start: string; end: string; isOpen: boolean };
  };
  services: Service[];
  pricing: {
    [serviceId: string]: number;
  };
  notifications: {
    smsEnabled: boolean;
    emailEnabled: boolean;
    reminderHours: number[];
    automatedReminders: boolean;
  };
  payment: {
    stripeEnabled: boolean;
    cashEnabled: boolean;
    depositRequired: boolean;
    depositPercentage: number;
    acceptedCards: string[];
    refundPolicy: string;
  };
  business: {
    name: string;
    phone: string;
    email: string;
    website?: string;
    logo?: string;
    serviceRadius: number; // miles
    minimumBookingAdvance: number; // hours
  };
  loyalty: {
    pointsPerDollar: number;
    redemptionRate: number; // points per dollar discount
    tierBenefits: {
      bronze: { threshold: number; discount: number };
      silver: { threshold: number; discount: number };
      gold: { threshold: number; discount: number };
    };
  };
}

// Default services with enhanced data
const DEFAULT_SERVICES: Service[] = [
  {
    id: 'exterior-basic',
    name: 'Basic Exterior Wash',
    description: 'Hand wash, dry, and tire shine',
    price: 50,
    duration: 60,
    category: 'exterior',
    isActive: true,
    popularityRank: 1
  },
  {
    id: 'exterior-premium',
    name: 'Premium Exterior Detail',
    description: 'Wash, clay bar, polish, wax, and tire shine',
    price: 120,
    duration: 180,
    category: 'exterior',
    isActive: true,
    popularityRank: 2
  },
  {
    id: 'interior-basic',
    name: 'Basic Interior Clean',
    description: 'Vacuum, wipe down surfaces, window cleaning',
    price: 60,
    duration: 90,
    category: 'interior',
    isActive: true,
    popularityRank: 3
  },
  {
    id: 'interior-premium',
    name: 'Premium Interior Detail',
    description: 'Deep clean, leather conditioning, steam cleaning',
    price: 150,
    duration: 240,
    category: 'interior',
    isActive: true,
    popularityRank: 4
  },
  {
    id: 'full-detail',
    name: 'Complete Detail Package',
    description: 'Full interior and exterior detailing service',
    price: 250,
    duration: 360,
    category: 'full',
    isActive: true,
    popularityRank: 5
  },
  {
    id: 'ceramic-coating',
    name: 'Ceramic Coating',
    description: 'Long-lasting paint protection',
    price: 500,
    duration: 480,
    category: 'addon',
    isActive: true,
    popularityRank: 6
  }
];

type UserRole = 'owner' | 'customer';

function AppContent() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [userRole, setUserRole] = useState<UserRole>('owner');
  const [customerEmail, setCustomerEmail] = useState('john.doe@example.com');
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [services] = useState<Service[]>(DEFAULT_SERVICES);
  const [customerProfiles, setCustomerProfiles] = useState<CustomerProfile[]>([]);
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings>({
    businessHours: {
      monday: { start: '08:00', end: '18:00', isOpen: true },
      tuesday: { start: '08:00', end: '18:00', isOpen: true },
      wednesday: { start: '08:00', end: '18:00', isOpen: true },
      thursday: { start: '08:00', end: '18:00', isOpen: true },
      friday: { start: '08:00', end: '18:00', isOpen: true },
      saturday: { start: '09:00', end: '17:00', isOpen: true },
      sunday: { start: '10:00', end: '16:00', isOpen: false },
    },
    services: DEFAULT_SERVICES,
    pricing: DEFAULT_SERVICES.reduce((acc, service) => ({ ...acc, [service.id]: service.price }), {}),
    notifications: {
      smsEnabled: true,
      emailEnabled: true,
      reminderHours: [24, 2],
      automatedReminders: true,
    },
    payment: {
      stripeEnabled: true,
      cashEnabled: true,
      depositRequired: true,
      depositPercentage: 25,
      acceptedCards: ['visa', 'mastercard', 'amex', 'discover'],
      refundPolicy: '24-hour cancellation policy',
    },
    business: {
      name: 'The Mobile Detailers',
      phone: '(555) 123-DETAIL',
      email: 'info@themobiledetailers.com',
      serviceRadius: 25,
      minimumBookingAdvance: 2,
    },
    loyalty: {
      pointsPerDollar: 1,
      redemptionRate: 100, // 100 points = $1
      tierBenefits: {
        bronze: { threshold: 0, discount: 0 },
        silver: { threshold: 1000, discount: 5 },
        gold: { threshold: 2500, discount: 10 },
      },
    },
  });

  // Memoized service instances for better performance
  const notificationService = useMemo(() => new NotificationService(), []);
  const paymentService = useMemo(() => new PaymentService(), []);

  // Memoized calculations for better performance
  const activeServices = useMemo(() => 
    services.filter(service => service.isActive), [services]
  );

  const customerCount = useMemo(() => 
    new Set(appointments.map(a => a.customerEmail)).size, [appointments]
  );

  const notificationStats = useMemo(() => 
    notificationService.getNotificationStats(7), [notificationService]
  );

  // Load data with comprehensive error handling
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingError(null);
        
        // Load appointments with error handling
        const savedAppointments = localStorage.getItem('mobile-detailers-appointments');
        if (savedAppointments) {
          const parsed = JSON.parse(savedAppointments);
          const migratedAppointments = parsed.map((apt: any) => ({
            ...apt,
            status: apt.status || 'confirmed',
            createdAt: apt.createdAt || new Date().toISOString(),
            updatedAt: apt.updatedAt || new Date().toISOString(),
            customerEmail: apt.customerEmail || apt.contactEmail,
            customerPhone: apt.customerPhone || apt.contactPhone,
            services: apt.services || [DEFAULT_SERVICES[0]],
            payment: apt.payment || { status: 'pending', amount: 50, method: 'card' },
          }));
          setAppointments(migratedAppointments);

          // Schedule automated reminders for existing appointments
          migratedAppointments.forEach((appointment: Appointment) => {
            if (appointment.status === 'confirmed' || appointment.status === 'pending') {
              const customerProfile = customerProfiles.find(p => p.email === appointment.customerEmail);
              notificationService.scheduleReminders(appointment, businessSettings, customerProfile);
            }
          });
        } else {
          // Enhanced sample data
          const sampleAppointments: Appointment[] = [
            {
              id: '1',
              customerName: 'John Doe',
              customerEmail: 'john.doe@example.com',
              customerPhone: '(555) 123-4567',
              date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
              time: '10:00',
              contactEmail: 'john.doe@example.com',
              contactPhone: '(555) 123-4567',
              notes: 'Full exterior detail for 2020 Honda Accord',
              reminderSent: false,
              status: 'confirmed',
              createdAt: new Date().toISOString(),
              services: [DEFAULT_SERVICES[1]],
              vehicleInfo: {
                make: 'Honda',
                model: 'Accord',
                year: 2020,
                color: 'Silver',
                licensePlate: 'ABC123',
                size: 'midsize'
              },
              location: {
                address: '123 Main St',
                city: 'Anytown',
                state: 'CA',
                zipCode: '12345',
                parkingInstructions: 'Park in driveway'
              },
              payment: {
                status: 'paid',
                amount: 120,
                method: 'card',
                stripePaymentIntentId: 'pi_demo123'
              },
              loyaltyPointsEarned: 12,
              assignedTechnician: 'Mike Johnson'
            },
            {
              id: '2',
              customerName: 'Sarah Johnson',
              customerEmail: 'sarah.j@email.com',
              customerPhone: '(555) 987-6543',
              date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
              time: '14:30',
              contactEmail: 'sarah.j@email.com',
              contactPhone: '(555) 987-6543',
              notes: 'Interior and exterior cleaning for SUV',
              reminderSent: true,
              status: 'confirmed',
              createdAt: new Date(Date.now() - 86400000).toISOString(),
              services: [DEFAULT_SERVICES[4]],
              vehicleInfo: {
                make: 'Toyota',
                model: 'RAV4',
                year: 2019,
                color: 'Blue',
                size: 'suv'
              },
              payment: {
                status: 'pending',
                amount: 250,
                method: 'card'
              }
            }
          ];
          setAppointments(sampleAppointments);
          
          // Schedule reminders for sample appointments
          sampleAppointments.forEach(appointment => {
            notificationService.scheduleReminders(appointment, businessSettings);
          });
        }

        // Load customer profiles
        const savedProfiles = localStorage.getItem('mobile-detailers-customers');
        if (savedProfiles) {
          setCustomerProfiles(JSON.parse(savedProfiles));
        }

        // Load business settings
        const savedSettings = localStorage.getItem('mobile-detailers-settings');
        if (savedSettings) {
          setBusinessSettings(prev => ({ ...prev, ...JSON.parse(savedSettings) }));
        }

      } catch (error) {
        console.error('Error loading data:', error);
        setLoadingError('Failed to load application data. Using defaults.');
        setAppointments([]);
        setCustomerProfiles([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [notificationService, businessSettings, customerProfiles]);

  // Optimized save functions with error handling
  useEffect(() => {
    if (!isLoading && appointments.length > 0) {
      const timeoutId = setTimeout(() => {
        try {
          localStorage.setItem('mobile-detailers-appointments', JSON.stringify(appointments));
        } catch (error) {
          console.error('Failed to save appointments:', error);
        }
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [appointments, isLoading]);

  useEffect(() => {
    if (!isLoading && customerProfiles.length > 0) {
      const timeoutId = setTimeout(() => {
        try {
          localStorage.setItem('mobile-detailers-customers', JSON.stringify(customerProfiles));
        } catch (error) {
          console.error('Failed to save customer profiles:', error);
        }
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [customerProfiles, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      const timeoutId = setTimeout(() => {
        try {
          localStorage.setItem('mobile-detailers-settings', JSON.stringify(businessSettings));
        } catch (error) {
          console.error('Failed to save business settings:', error);
        }
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [businessSettings, isLoading]);

  // Optimized callback functions
  const handleAppointmentUpdate = useCallback((updatedAppointments: Appointment[]) => {
    setAppointments(updatedAppointments);
    
    // Schedule reminders for new or updated appointments
    updatedAppointments.forEach(appointment => {
      if (appointment.status === 'confirmed' || appointment.status === 'pending') {
        const customerProfile = customerProfiles.find(p => p.email === appointment.customerEmail);
        notificationService.scheduleReminders(appointment, businessSettings, customerProfile);
      }
    });
  }, [notificationService, businessSettings, customerProfiles]);

  const handleRoleSwitch = useCallback((isOwner: boolean) => {
    const newRole = isOwner ? 'owner' : 'customer';
    setUserRole(newRole);
    console.log('Role switched to:', newRole);
  }, []);

  // Enhanced notification handler with automated scheduling
  const handleSendNotification = useCallback(async (
    appointment: Appointment, 
    type: 'reminder' | 'status_change' | 'delay'
  ) => {
    try {
      if (type === 'reminder') {
        // For manual reminders, use the notification service directly
        await notificationService.sendManualReminder(appointment);
      } else {
        // For status changes and delays, send immediately
        const promises: Promise<any>[] = [];
        
        if (businessSettings.notifications.smsEnabled && appointment.customerPhone) {
          promises.push(notificationService.sendSMS(appointment, type));
        }
        
        if (businessSettings.notifications.emailEnabled && appointment.customerEmail) {
          promises.push(notificationService.sendEmail(appointment, type));
        }

        await Promise.allSettled(promises);
      }
    } catch (error) {
      console.error('Error sending notifications:', error);
    }
  }, [businessSettings.notifications, notificationService]);

  // Enhanced payment handler with better error handling
  const handlePaymentProcess = useCallback(async (appointment: Appointment, amount: number) => {
    if (!businessSettings.payment.stripeEnabled) {
      return { success: false, error: 'Payment processing not enabled' };
    }

    try {
      const result = await paymentService.processPayment(appointment, amount);
      
      if (result.success) {
        const updatedAppointments = appointments.map(apt =>
          apt.id === appointment.id
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
        handleAppointmentUpdate(updatedAppointments);
      }
      
      return result;
    } catch (error) {
      console.error('Payment processing error:', error);
      return { success: false, error: 'Payment processing failed' };
    }
  }, [businessSettings.payment.stripeEnabled, paymentService, appointments, handleAppointmentUpdate]);

  // Business settings update handler
  const handleBusinessSettingsUpdate = useCallback((newSettings: Partial<BusinessSettings>) => {
    setBusinessSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  // Show enhanced loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Loading The Mobile Detailers</h2>
            <p className="text-muted-foreground">Initializing intelligent systems...</p>
            {loadingError && (
              <p className="text-yellow-600 text-sm">{loadingError}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Enhanced Header */}
      <header className="bg-primary text-primary-foreground shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{businessSettings.business.name}</h1>
              <p className="text-primary-foreground/80 text-sm">
                {userRole === 'owner' ? 'Business Dashboard' : 'Customer Portal'}
              </p>
            </div>
            
            {/* Enhanced Role Switcher */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm bg-primary-foreground/10 rounded-lg px-3 py-2">
                <Users className="w-4 h-4" />
                <span className={userRole === 'customer' ? 'font-medium' : 'opacity-70'}>Customer</span>
                <Switch
                  checked={userRole === 'owner'}
                  onCheckedChange={handleRoleSwitch}
                  aria-label="Switch between customer and owner view"
                  className="data-[state=checked]:bg-primary-foreground data-[state=unchecked]:bg-primary-foreground/20"
                />
                <span className={userRole === 'owner' ? 'font-medium' : 'opacity-70'}>Owner</span>
                <Settings className="w-4 h-4" />
              </div>
              
              <Badge variant="secondary" className="hidden sm:flex bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30">
                {userRole === 'owner' ? 'Admin Access' : customerEmail}
              </Badge>
            </div>
          </div>
          
          {/* Enhanced Demo Notice */}
          <div className="mt-3 p-3 bg-primary-foreground/10 rounded-lg text-sm">
            <div className="flex items-center justify-between">
              <div>
                <strong>🤖 Intelligent Demo:</strong> 
                <span className="ml-2">Automated reminders • Smart notifications • Real-time analytics • Performance monitoring</span>
              </div>
              <div className="text-xs opacity-75 hidden md:block">
                {appointments.length} appointments • {customerCount} customers • 
                {businessSettings.notifications.automatedReminders ? ' 🟢 Auto-reminders ON' : ' 🔴 Auto-reminders OFF'}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {userRole === 'owner' ? (
          <OwnerDashboard 
            key="owner-dashboard"
            appointments={appointments}
            onAppointmentsUpdate={handleAppointmentUpdate}
            services={activeServices}
            customerProfiles={customerProfiles}
            businessSettings={businessSettings}
            onBusinessSettingsUpdate={handleBusinessSettingsUpdate}
            onSendNotification={handleSendNotification}
            onProcessPayment={handlePaymentProcess}
            notificationService={notificationService}
          />
        ) : (
          <CustomerPortal
            key="customer-portal"
            appointments={appointments}
            customerEmail={customerEmail}
            onAppointmentsUpdate={handleAppointmentUpdate}
            services={activeServices}
            businessSettings={businessSettings}
          />
        )}
      </main>

      {/* Performance Monitor (Development Only) */}
      <PerformanceMonitor
        appointmentCount={appointments.length}
        customerCount={customerCount}
        notificationCount={notificationStats.total || 0}
        isAutomationActive={businessSettings.notifications.automatedReminders}
      />

      {/* Enhanced Development Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-black/90 text-white p-3 rounded-lg text-xs max-w-sm border border-white/20">
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Role:</span>
              <span className="font-mono">{userRole}</span>
            </div>
            <div className="flex justify-between">
              <span>Appointments:</span>
              <span className="font-mono">{appointments.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Auto-Reminders:</span>
              <span className={`font-mono ${businessSettings.notifications.automatedReminders ? 'text-green-400' : 'text-red-400'}`}>
                {businessSettings.notifications.automatedReminders ? 'ON' : 'OFF'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>SMS:</span>
              <span className={`font-mono ${businessSettings.notifications.smsEnabled ? 'text-green-400' : 'text-red-400'}`}>
                {businessSettings.notifications.smsEnabled ? 'ON' : 'OFF'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Payments:</span>
              <span className={`font-mono ${businessSettings.payment.stripeEnabled ? 'text-green-400' : 'text-red-400'}`}>
                {businessSettings.payment.stripeEnabled ? 'ON' : 'OFF'}
              </span>
            </div>
            <div className="text-xs text-gray-400 pt-1 border-t border-white/20">
              Build: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}