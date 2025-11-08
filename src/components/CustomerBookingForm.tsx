import React, { useState } from 'react';
import { AppointmentForm } from './AppointmentForm';
import { Appointment, Service, BusinessSettings } from '../App';

interface CustomerBookingFormProps {
  services: Service[];
  existingAppointments: Appointment[];
  businessSettings: BusinessSettings;
  onSubmit: (data: Omit<Appointment, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}

export function CustomerBookingForm({
  services,
  existingAppointments,
  businessSettings,
  onSubmit,
  onCancel
}: CustomerBookingFormProps) {
  return (
    <AppointmentForm
      initialData={null}
      onSubmit={onSubmit}
      onCancel={onCancel}
      isOwnerForm={false}
      existingAppointments={existingAppointments}
      services={services}
    />
  );
}