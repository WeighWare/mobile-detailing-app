import React, { useState } from 'react';
import { Calendar } from './ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Calendar as CalendarIcon, Clock, Users, AlertTriangle, Download, ExternalLink } from 'lucide-react';
import { Appointment } from '../App';
import { getAvailableTimeSlots, generateGoogleCalendarUrl, generateOutlookCalendarUrl, downloadICalEvent } from './CalendarUtils';

interface CalendarViewProps {
  appointments: Appointment[];
  onDateSelect?: (date: Date) => void;
  onTimeSlotSelect?: (date: string, time: string) => void;
  showTimeSlots?: boolean;
  selectedDate?: Date;
}

export function CalendarView({ 
  appointments, 
  onDateSelect, 
  onTimeSlotSelect, 
  showTimeSlots = false,
  selectedDate 
}: CalendarViewProps) {
  const [selected, setSelected] = useState<Date | undefined>(selectedDate);
  const [viewMode, setViewMode] = useState<'calendar' | 'agenda'>('calendar');

  const handleDateSelect = (date: Date | undefined) => {
    setSelected(date);
    if (date && onDateSelect) {
      onDateSelect(date);
    }
  };

  const getAppointmentsForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return appointments.filter(apt => apt.date === dateString && apt.status !== 'cancelled');
  };

  const formatDateForDisplay = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getUpcomingAppointments = () => {
    const now = new Date();
    return appointments
      .filter(apt => {
        const aptDate = new Date(`${apt.date}T${apt.time}`);
        return aptDate >= now && apt.status !== 'cancelled';
      })
      .sort((a, b) => {
        const dateTimeA = new Date(`${a.date}T${a.time}`);
        const dateTimeB = new Date(`${b.date}T${b.time}`);
        return dateTimeA.getTime() - dateTimeB.getTime();
      })
      .slice(0, 5);
  };

  const renderDayContent = (date: Date) => {
    const dayAppointments = getAppointmentsForDate(date);
    if (dayAppointments.length === 0) return null;

    return (
      <div className="flex flex-col items-center gap-1 mt-1">
        <div className="flex gap-1 flex-wrap justify-center">
          {dayAppointments.slice(0, 3).map((apt, index) => (
            <div
              key={apt.id}
              className={`w-1.5 h-1.5 rounded-full ${
                apt.status === 'confirmed' ? 'bg-green-500' :
                apt.status === 'pending' ? 'bg-yellow-500' : 'bg-blue-500'
              }`}
            />
          ))}
          {dayAppointments.length > 3 && (
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
          )}
        </div>
        {dayAppointments.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {dayAppointments.length}
          </span>
        )}
      </div>
    );
  };

  const selectedDateAppointments = selected ? getAppointmentsForDate(selected) : [];
  const timeSlots = selected ? getAvailableTimeSlots(appointments, selected.toISOString().split('T')[0]) : [];

  return (
    <div className="space-y-6">
      {/* View Mode Toggle */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Calendar View</h3>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'calendar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('calendar')}
          >
            <CalendarIcon className="w-4 h-4 mr-2" />
            Calendar
          </Button>
          <Button
            variant={viewMode === 'agenda' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('agenda')}
          >
            <Clock className="w-4 h-4 mr-2" />
            Agenda
          </Button>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" />
                Appointment Calendar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selected}
                onSelect={handleDateSelect}
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                className="rounded-md border"
                components={{
                  DayContent: ({ date }) => (
                    <div className="relative w-full h-full flex flex-col items-center justify-center">
                      <span>{date.getDate()}</span>
                      {renderDayContent(date)}
                    </div>
                  )
                }}
              />
              
              {/* Legend */}
              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span>Confirmed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  <span>Pending</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>Completed</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Selected Date Details */}
          <div className="space-y-4">
            {selected && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {formatDateForDisplay(selected)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedDateAppointments.length > 0 ? (
                    <div className="space-y-3">
                      {selectedDateAppointments.map((apt) => (
                        <div key={apt.id} className="p-3 border rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium">{apt.customerName}</p>
                              <p className="text-sm text-muted-foreground">{apt.time}</p>
                            </div>
                            <Badge variant={
                              apt.status === 'confirmed' ? 'default' :
                              apt.status === 'pending' ? 'secondary' : 'outline'
                            }>
                              {apt.status}
                            </Badge>
                          </div>
                          {apt.notes && (
                            <p className="text-sm text-muted-foreground">{apt.notes}</p>
                          )}
                          
                          {/* Calendar Export Options */}
                          <div className="flex gap-2 mt-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <ExternalLink className="w-3 h-3 mr-1" />
                                  Export
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Export Appointment</DialogTitle>
                                  <DialogDescription>
                                    Add this appointment to your calendar
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-3">
                                  <Button
                                    className="w-full justify-start"
                                    variant="outline"
                                    onClick={() => window.open(generateGoogleCalendarUrl(apt), '_blank')}
                                  >
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Add to Google Calendar
                                  </Button>
                                  <Button
                                    className="w-full justify-start"
                                    variant="outline"
                                    onClick={() => window.open(generateOutlookCalendarUrl(apt), '_blank')}
                                  >
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Add to Outlook
                                  </Button>
                                  <Button
                                    className="w-full justify-start"
                                    variant="outline"
                                    onClick={() => downloadICalEvent(apt)}
                                  >
                                    <Download className="w-4 h-4 mr-2" />
                                    Download .ics file
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <CalendarIcon className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No appointments scheduled</p>
                      {showTimeSlots && onTimeSlotSelect && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Select a time slot below to book
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Time Slots (if enabled) */}
            {showTimeSlots && selected && onTimeSlotSelect && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Available Time Slots</CardTitle>
                  {timeSlots.some(slot => !slot.available) && (
                    <div className="flex items-center gap-2 text-sm text-yellow-600">
                      <AlertTriangle className="w-4 h-4" />
                      Some slots unavailable due to conflicts
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {timeSlots.map((slot) => (
                      <Button
                        key={slot.time}
                        variant={slot.available ? 'outline' : 'ghost'}
                        disabled={!slot.available}
                        className={`text-sm ${!slot.available ? 'opacity-50' : ''}`}
                        onClick={() => slot.available && onTimeSlotSelect(selected.toISOString().split('T')[0], slot.time)}
                      >
                        {slot.time}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      ) : (
        /* Agenda View */
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Upcoming Appointments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {getUpcomingAppointments().length > 0 ? (
              <div className="space-y-4">
                {getUpcomingAppointments().map((apt) => (
                  <div key={apt.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-medium">{apt.customerName}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(apt.date).toLocaleDateString()} at {apt.time}
                          </p>
                        </div>
                        <Badge variant={
                          apt.status === 'confirmed' ? 'default' :
                          apt.status === 'pending' ? 'secondary' : 'outline'
                        }>
                          {apt.status}
                        </Badge>
                      </div>
                      {apt.notes && (
                        <p className="text-sm text-muted-foreground mt-1">{apt.notes}</p>
                      )}
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Export
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Export Appointment</DialogTitle>
                          <DialogDescription>
                            Add this appointment to your calendar
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-3">
                          <Button
                            className="w-full justify-start"
                            variant="outline"
                            onClick={() => window.open(generateGoogleCalendarUrl(apt), '_blank')}
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Add to Google Calendar
                          </Button>
                          <Button
                            className="w-full justify-start"
                            variant="outline"
                            onClick={() => window.open(generateOutlookCalendarUrl(apt), '_blank')}
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Add to Outlook
                          </Button>
                          <Button
                            className="w-full justify-start"
                            variant="outline"
                            onClick={() => downloadICalEvent(apt)}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download .ics file
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CalendarIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No upcoming appointments</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}