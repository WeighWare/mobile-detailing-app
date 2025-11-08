import React from 'react';
import { Card, CardContent, CardHeader } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { Calendar, Clock, Phone, Mail, Edit, Trash2, Send, User, FileText } from 'lucide-react';
import { Appointment } from '../App';

interface AppointmentCardProps {
  appointment: Appointment;
  onEdit: () => void;
  onDelete: () => void;
  onSendReminder: () => void;
}

export function AppointmentCard({ appointment, onEdit, onDelete, onSendReminder }: AppointmentCardProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const isToday = (date: string) => {
    const appointmentDate = new Date(date);
    const today = new Date();
    return appointmentDate.toDateString() === today.toDateString();
  };

  const isTomorrow = (date: string) => {
    const appointmentDate = new Date(date);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return appointmentDate.toDateString() === tomorrow.toDateString();
  };

  const getDateBadge = (date: string) => {
    if (isToday(date)) {
      return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Today</Badge>;
    }
    if (isTomorrow(date)) {
      return <Badge variant="secondary">Tomorrow</Badge>;
    }
    return null;
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{appointment.customerName}</span>
            </div>
            {getDateBadge(appointment.date)}
            {appointment.reminderSent && (
              <Badge variant="outline" className="text-green-600 border-green-600">
                <Send className="w-3 h-3 mr-1" />
                Reminder Sent
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              className="h-8 px-2"
            >
              <Edit className="w-4 h-4" />
              <span className="sr-only sm:not-sr-only sm:ml-1">Edit</span>
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="sr-only sm:not-sr-only sm:ml-1">Delete</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Appointment</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete the appointment for {appointment.customerName} on {formatDate(appointment.date)}? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Date and Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span>{formatDate(appointment.date)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span>{formatTime(appointment.time)}</span>
          </div>
        </div>

        {/* Contact Information */}
        <div className="space-y-2">
          {appointment.contactEmail && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <a 
                href={`mailto:${appointment.contactEmail}`}
                className="text-primary hover:underline"
              >
                {appointment.contactEmail}
              </a>
            </div>
          )}
          {appointment.contactPhone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <a 
                href={`tel:${appointment.contactPhone}`}
                className="text-primary hover:underline"
              >
                {appointment.contactPhone}
              </a>
            </div>
          )}
        </div>

        {/* Notes */}
        {appointment.notes && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="w-4 h-4" />
              <span>Service Notes:</span>
            </div>
            <p className="text-sm pl-6 text-muted-foreground bg-muted/30 p-2 rounded">
              {appointment.notes}
            </p>
          </div>
        )}

        {/* Send Reminder Button */}
        <div className="pt-2 border-t">
          <Button
            variant={appointment.reminderSent ? "outline" : "default"}
            size="sm"
            onClick={onSendReminder}
            className="w-full sm:w-auto"
            disabled={!appointment.contactEmail && !appointment.contactPhone}
          >
            <Send className="w-4 h-4 mr-2" />
            {appointment.reminderSent ? 'Send Another Reminder' : 'Send Reminder'}
          </Button>
          {appointment.reminderSent && (
            <p className="text-xs text-muted-foreground mt-1">
              Last reminder sent successfully
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}