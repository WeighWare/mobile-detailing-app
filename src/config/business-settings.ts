import { BusinessSettings, Service } from '../types';
import { 
  BUSINESS_HOURS, 
  NOTIFICATION_SETTINGS, 
  PAYMENT_SETTINGS, 
  LOYALTY_SETTINGS,
  APP_CONFIG 
} from './constants';

// Default services configuration
export const DEFAULT_SERVICES: Service[] = [
  {
    id: 'exterior-basic',
    name: 'Basic Exterior Wash',
    description: 'Hand wash, dry, and tire shine',
    price: 50,
    duration: 60,
    category: 'exterior',
    isActive: true,
    popularityRank: 1,
    createdAt: new Date().toISOString(),
    requirements: ['Access to water', 'Parking space'],
    addOns: ['Tire shine', 'Window cleaning']
  },
  {
    id: 'exterior-premium',
    name: 'Premium Exterior Detail',
    description: 'Wash, clay bar, polish, wax, and tire shine',
    price: 120,
    duration: 180,
    category: 'exterior',
    isActive: true,
    popularityRank: 2,
    createdAt: new Date().toISOString(),
    requirements: ['Access to water', 'Parking space', 'Shade preferred'],
    addOns: ['Paint protection', 'Headlight restoration']
  },
  {
    id: 'interior-basic',
    name: 'Basic Interior Clean',
    description: 'Vacuum, wipe down surfaces, window cleaning',
    price: 60,
    duration: 90,
    category: 'interior',
    isActive: true,
    popularityRank: 3,
    createdAt: new Date().toISOString(),
    requirements: ['Access to vehicle interior'],
    addOns: ['Seat protection', 'Air freshener']
  },
  {
    id: 'interior-premium',
    name: 'Premium Interior Detail',
    description: 'Deep clean, leather conditioning, steam cleaning',
    price: 150,
    duration: 240,
    category: 'interior',
    isActive: true,
    popularityRank: 4,
    createdAt: new Date().toISOString(),
    requirements: ['Access to vehicle interior', 'Power outlet'],
    addOns: ['Leather protection', 'Fabric protection', 'Pet hair removal']
  },
  {
    id: 'full-detail',
    name: 'Complete Detail Package',
    description: 'Full interior and exterior detailing service',
    price: 250,
    duration: 360,
    category: 'full',
    isActive: true,
    popularityRank: 5,
    createdAt: new Date().toISOString(),
    requirements: ['Access to water', 'Power outlet', 'Full day availability'],
    addOns: ['Engine cleaning', 'Trunk organization']
  },
  {
    id: 'ceramic-coating',
    name: 'Ceramic Coating',
    description: 'Long-lasting paint protection',
    price: 500,
    duration: 480,
    category: 'addon',
    isActive: true,
    popularityRank: 6,
    createdAt: new Date().toISOString(),
    requirements: ['Covered area', 'Clean vehicle', '24-hour curing time'],
    addOns: ['Paint correction', 'Extended warranty']
  }
];

// Default business settings
export const DEFAULT_BUSINESS_SETTINGS: BusinessSettings = {
  businessHours: BUSINESS_HOURS.DEFAULT,
  services: DEFAULT_SERVICES,
  pricing: DEFAULT_SERVICES.reduce((acc, service) => ({ 
    ...acc, 
    [service.id]: service.price 
  }), {}),
  notifications: {
    smsEnabled: true,
    emailEnabled: true,
    reminderHours: NOTIFICATION_SETTINGS.DEFAULT_REMINDER_HOURS,
    automatedReminders: true,
    templates: {
      reminder: 'Hi {{customerName}}! Reminder: Your car detailing appointment is scheduled for {{date}} at {{time}}. We\'ll be there!',
      confirmation: 'Hi {{customerName}}! Your appointment for {{date}} at {{time}} has been confirmed. Total: ${{amount}}.',
      statusChange: 'Hi {{customerName}}! Your appointment status has been updated to: {{status}}.',
      delay: 'Hi {{customerName}}! We\'re running a bit behind. Your appointment may be delayed by {{delayMinutes}} minutes.'
    }
  },
  payment: {
    stripeEnabled: true,
    cashEnabled: true,
    depositRequired: true,
    depositPercentage: 25,
    acceptedCards: [...PAYMENT_SETTINGS.ACCEPTED_CARDS],
    refundPolicy: '24-hour cancellation policy for full refund',
    taxRate: PAYMENT_SETTINGS.DEFAULT_TAX_RATE
  },
  business: {
    name: APP_CONFIG.name,
    phone: '(555) 123-DETAIL',
    email: 'info@themobiledetailers.com',
    website: APP_CONFIG.website,
    address: '123 Business Ave, City, State 12345',
    serviceRadius: 25,
    minimumBookingAdvance: 2,
    maxConcurrentBookings: 5
  },
  loyalty: {
    pointsPerDollar: LOYALTY_SETTINGS.DEFAULT_POINTS_PER_DOLLAR,
    redemptionRate: LOYALTY_SETTINGS.DEFAULT_REDEMPTION_RATE,
    tierBenefits: {
      bronze: { 
        threshold: LOYALTY_SETTINGS.TIER_THRESHOLDS.bronze, 
        discount: LOYALTY_SETTINGS.TIER_DISCOUNTS.bronze,
        perks: ['Basic customer support', 'Service reminders']
      },
      silver: { 
        threshold: LOYALTY_SETTINGS.TIER_THRESHOLDS.silver, 
        discount: LOYALTY_SETTINGS.TIER_DISCOUNTS.silver,
        perks: ['Priority booking', '5% discount', 'Quarterly newsletter']
      },
      gold: { 
        threshold: LOYALTY_SETTINGS.TIER_THRESHOLDS.gold, 
        discount: LOYALTY_SETTINGS.TIER_DISCOUNTS.gold,
        perks: ['VIP support', '10% discount', 'Free annual detail', 'Exclusive events']
      }
    }
  },
  features: {
    enableBookingLimits: true,
    enableWeatherAlerts: true,
    enableCustomerReviews: true,
    enableLoyaltyProgram: true
  }
};