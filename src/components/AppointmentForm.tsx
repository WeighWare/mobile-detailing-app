import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Alert, AlertDescription } from './ui/alert';
import { Calendar as CalendarIcon, Clock, MapPin, CreditCard, AlertTriangle } from 'lucide-react';
import { Appointment, Service } from '../App';
import { checkTimeConflicts } from './CalendarUtils';

interface AppointmentFormProps {
  initialData?: Appointment | null;
  onSubmit: (data: Omit<Appointment, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
  isOwnerForm?: boolean;
  existingAppointments: Appointment[];
  services: Service[];
}

export function AppointmentForm({
  initialData,
  onSubmit,
  onCancel,
  isOwnerForm = false,
  existingAppointments,
  services
}: AppointmentFormProps) {
  const [formData, setFormData] = useState({
    customerName: initialData?.customerName || '',
    customerEmail: initialData?.customerEmail || '',
    customerPhone: initialData?.customerPhone || '',
    date: initialData?.date || '',
    time: initialData?.time || '',
    notes: initialData?.notes || '',
    status: initialData?.status || (isOwnerForm ? 'confirmed' : 'pending') as Appointment['status'],
    contactEmail: initialData?.contactEmail || '',
    contactPhone: initialData?.contactPhone || '',
    reminderSent: initialData?.reminderSent || false,
  });

  const [selectedServices, setSelectedServices] = useState<Service[]>(
    initialData?.services || []
  );

  const [vehicleInfo, setVehicleInfo] = useState({
    make: initialData?.vehicleInfo?.make || '',
    model: initialData?.vehicleInfo?.model || '',
    year: initialData?.vehicleInfo?.year || new Date().getFullYear(),
    color: initialData?.vehicleInfo?.color || '',
    licensePlate: initialData?.vehicleInfo?.licensePlate || '',
  });

  const [locationInfo, setLocationInfo] = useState({
    address: initialData?.location?.address || '',
    city: initialData?.location?.city || '',
    state: initialData?.location?.state || '',
    zipCode: initialData?.location?.zipCode || '',
  });

  const [paymentMethod, setPaymentMethod] = useState(
    initialData?.payment?.method || 'card'
  );

  const [errors, setErrors] = useState<string[]>([]);
  const [timeConflicts, setTimeConflicts] = useState<any[]>([]);

  // Calculate total duration and cost
  const totalDuration = selectedServices.reduce((sum, service) => sum + service.duration, 0);
  const subtotal = selectedServices.reduce((sum, service) => sum + service.price, 0);
  const tax = subtotal * 0.0875; // 8.75% tax
  const total = subtotal + tax;

  // Check for time conflicts when date/time changes
  useEffect(() => {
    if (formData.date && formData.time && selectedServices.length > 0) {
      const conflicts = checkTimeConflicts(
        formData.date,
        formData.time,
        totalDuration,
        existingAppointments.filter(apt => apt.id !== initialData?.id)
      );
      setTimeConflicts(conflicts);
    }
  }, [formData.date, formData.time, totalDuration, existingAppointments, initialData?.id]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => prev.filter(error => !error.includes(field)));
  };

  const handleServiceToggle = (service: Service, checked: boolean) => {
    if (checked) {
      setSelectedServices(prev => [...prev, service]);
    } else {
      setSelectedServices(prev => prev.filter(s => s.id !== service.id));
    }
  };

  const validateForm = () => {
    const newErrors: string[] = [];

    if (!formData.customerName.trim()) newErrors.push('Customer name is required');
    if (!formData.customerEmail.trim()) newErrors.push('Customer email is required');
    if (!formData.customerPhone.trim()) newErrors.push('Customer phone is required');
    if (!formData.date) newErrors.push('Date is required');
    if (!formData.time) newErrors.push('Time is required');
    if (selectedServices.length === 0) newErrors.push('At least one service must be selected');
    if (!vehicleInfo.make.trim()) newErrors.push('Vehicle make is required');
    if (!vehicleInfo.model.trim()) newErrors.push('Vehicle model is required');
    if (!locationInfo.address.trim()) newErrors.push('Address is required');
    if (!locationInfo.city.trim()) newErrors.push('City is required');
    if (!locationInfo.state.trim()) newErrors.push('State is required');
    if (!locationInfo.zipCode.trim()) newErrors.push('ZIP code is required');

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.customerEmail && !emailRegex.test(formData.customerEmail)) {
      newErrors.push('Invalid email format');
    }

    // Phone validation
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    const cleanPhone = formData.customerPhone.replace(/[^\d]/g, '');
    if (formData.customerPhone && (cleanPhone.length < 10 || cleanPhone.length > 15)) {
      newErrors.push('Phone number must be between 10-15 digits');
    }

    // Time conflicts
    if (timeConflicts.length > 0) {
      newErrors.push('Time slot conflicts with existing appointment');
    }

    // Date validation (no past dates for new appointments)
    if (!initialData && formData.date) {
      const selectedDate = new Date(formData.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        newErrors.push('Cannot schedule appointments in the past');
      }
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const appointmentData: Omit<Appointment, 'id' | 'createdAt'> = {
      ...formData,
      contactEmail: formData.customerEmail,
      contactPhone: formData.customerPhone,
      services: selectedServices,
      vehicleInfo: {
        make: vehicleInfo.make,
        model: vehicleInfo.model,
        year: vehicleInfo.year,
        color: vehicleInfo.color,
        licensePlate: vehicleInfo.licensePlate || undefined,
      },
      location: {
        address: locationInfo.address,
        city: locationInfo.city,
        state: locationInfo.state,
        zipCode: locationInfo.zipCode,
      },
      payment: {
        status: 'pending' as const,
        amount: total,
        method: paymentMethod as 'card' | 'cash' | 'bank_transfer',
      },
      estimatedDuration: totalDuration,
      loyaltyPointsEarned: Math.floor(total / 10), // 1 point per $10 spent
    };

    onSubmit(appointmentData);
  };

  // Get available time slots (mock - in real app, this would come from API)
  const getAvailableTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour <= 17; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(time);
      }
    }
    return slots;
  };

  const vehicleMakes = [
    'Acura', 'Audi', 'BMW', 'Buick', 'Cadillac', 'Chevrolet', 'Chrysler', 
    'Dodge', 'Ford', 'GMC', 'Honda', 'Hyundai', 'Infiniti', 'Jeep', 'Kia',
    'Lexus', 'Lincoln', 'Mazda', 'Mercedes-Benz', 'Nissan', 'Porsche',
    'Ram', 'Subaru', 'Tesla', 'Toyota', 'Volkswagen', 'Volvo'
  ];

  const vehicleColors = [
    'Black', 'White', 'Silver', 'Gray', 'Red', 'Blue', 'Green', 'Brown',
    'Orange', 'Yellow', 'Purple', 'Gold', 'Beige', 'Maroon'
  ];

  const states = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID',
    'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS',
    'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK',
    'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV',
    'WI', 'WY'
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error Display */}
      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Time Conflicts Warning */}
      {timeConflicts.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Warning: This time slot conflicts with existing appointments. Please choose a different time.
          </AlertDescription>
        </Alert>
      )}

      {/* Customer Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Customer Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="customerName">Full Name *</Label>
            <Input
              id="customerName"
              value={formData.customerName}
              onChange={(e) => handleInputChange('customerName', e.target.value)}
              placeholder="John Doe"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerEmail">Email Address *</Label>
            <Input
              id="customerEmail"
              type="email"
              value={formData.customerEmail}
              onChange={(e) => handleInputChange('customerEmail', e.target.value)}
              placeholder="john@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerPhone">Phone Number *</Label>
            <Input
              id="customerPhone"
              type="tel"
              value={formData.customerPhone}
              onChange={(e) => handleInputChange('customerPhone', e.target.value)}
              placeholder="(555) 123-4567"
            />
          </div>
        </CardContent>
      </Card>

      {/* Vehicle Information */}
      <Card>
        <CardHeader>
          <CardTitle>Vehicle Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="vehicleMake">Make *</Label>
            <Select value={vehicleInfo.make} onValueChange={(value) => 
              setVehicleInfo(prev => ({ ...prev, make: value }))
            }>
              <SelectTrigger>
                <SelectValue placeholder="Select make" />
              </SelectTrigger>
              <SelectContent>
                {vehicleMakes.map(make => (
                  <SelectItem key={make} value={make}>{make}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vehicleModel">Model *</Label>
            <Input
              id="vehicleModel"
              value={vehicleInfo.model}
              onChange={(e) => setVehicleInfo(prev => ({ ...prev, model: e.target.value }))}
              placeholder="Accord"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vehicleYear">Year *</Label>
            <Input
              id="vehicleYear"
              type="number"
              min="1990"
              max={new Date().getFullYear() + 1}
              value={vehicleInfo.year}
              onChange={(e) => setVehicleInfo(prev => ({ ...prev, year: parseInt(e.target.value) }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vehicleColor">Color *</Label>
            <Select value={vehicleInfo.color} onValueChange={(value) => 
              setVehicleInfo(prev => ({ ...prev, color: value }))
            }>
              <SelectTrigger>
                <SelectValue placeholder="Select color" />
              </SelectTrigger>
              <SelectContent>
                {vehicleColors.map(color => (
                  <SelectItem key={color} value={color}>{color}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="licensePlate">License Plate</Label>
            <Input
              id="licensePlate"
              value={vehicleInfo.licensePlate}
              onChange={(e) => setVehicleInfo(prev => ({ ...prev, licensePlate: e.target.value }))}
              placeholder="ABC123"
            />
          </div>
        </CardContent>
      </Card>

      {/* Service Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Services</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {services.map(service => (
              <div key={service.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                <Checkbox
                  id={service.id}
                  checked={selectedServices.some(s => s.id === service.id)}
                  onCheckedChange={(checked) => handleServiceToggle(service, checked as boolean)}
                />
                <div className="flex-1">
                  <label htmlFor={service.id} className="font-medium cursor-pointer">
                    {service.name}
                  </label>
                  <p className="text-sm text-muted-foreground">{service.description}</p>
                  <div className="flex justify-between items-center mt-2">
                    <Badge variant="secondary">{service.duration} min</Badge>
                    <span className="font-medium">${service.price}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {selectedServices.length > 0 && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Selected Services</h4>
              <div className="space-y-2">
                {selectedServices.map(service => (
                  <div key={service.id} className="flex justify-between">
                    <span>{service.name}</span>
                    <span>${service.price}</span>
                  </div>
                ))}
              </div>
              <Separator className="my-2" />
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (8.75%):</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Total:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Estimated duration: {totalDuration} minutes
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Appointment Scheduling */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Schedule & Location
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Time *</Label>
              <Select value={formData.time} onValueChange={(value) => handleInputChange('time', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableTimeSlots().map(time => (
                    <SelectItem key={time} value={time}>{time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="address">Address *</Label>
              <Input
                id="address"
                value={locationInfo.address}
                onChange={(e) => setLocationInfo(prev => ({ ...prev, address: e.target.value }))}
                placeholder="123 Main St"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={locationInfo.city}
                onChange={(e) => setLocationInfo(prev => ({ ...prev, city: e.target.value }))}
                placeholder="Anytown"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State *</Label>
              <Select value={locationInfo.state} onValueChange={(value) => 
                setLocationInfo(prev => ({ ...prev, state: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {states.map(state => (
                    <SelectItem key={state} value={state}>{state}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="zipCode">ZIP Code *</Label>
              <Input
                id="zipCode"
                value={locationInfo.zipCode}
                onChange={(e) => setLocationInfo(prev => ({ ...prev, zipCode: e.target.value }))}
                placeholder="12345"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Method */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payment Method
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="payment-card"
                name="payment"
                value="card"
                checked={paymentMethod === 'card'}
                onChange={(e) => setPaymentMethod(e.target.value)}
              />
              <Label htmlFor="payment-card">Credit/Debit Card</Label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="payment-cash"
                name="payment"
                value="cash"
                checked={paymentMethod === 'cash'}
                onChange={(e) => setPaymentMethod(e.target.value)}
              />
              <Label htmlFor="payment-cash">Cash (Pay on service)</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="Any special instructions, parking information, or additional details..."
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Owner-only Status */}
      {isOwnerForm && (
        <Card>
          <CardHeader>
            <CardTitle>Appointment Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={formData.status} onValueChange={(value) => 
              handleInputChange('status', value)
            }>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={selectedServices.length === 0 || timeConflicts.length > 0}>
          {initialData ? 'Update Appointment' : 'Schedule Appointment'}
        </Button>
      </div>
    </form>
  );
}