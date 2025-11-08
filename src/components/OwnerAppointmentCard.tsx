import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Separator } from './ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from './ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Progress } from './ui/progress';
import { 
  Calendar, Clock, MapPin, Phone, Mail, MoreVertical, 
  Edit, Trash2, MessageSquare, CreditCard, Star, Camera,
  CheckCircle, XCircle, PlayCircle, PauseCircle, AlertTriangle,
  DollarSign, Receipt, Truck
} from 'lucide-react';
import { Appointment, Service } from '../App';

interface OwnerAppointmentCardProps {
  appointment: Appointment;
  onEdit: () => void;
  onDelete: (id: string) => void;
  onSendReminder: () => void;
  onStatusChange: (status: Appointment['status']) => void;
  onDelayNotification?: () => void;
  onProcessPayment?: () => void;
  services: Service[];
}

export function OwnerAppointmentCard({
  appointment,
  onEdit,
  onDelete,
  onSendReminder,
  onStatusChange,
  onDelayNotification,
  onProcessPayment,
  services
}: OwnerAppointmentCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPhotosDialog, setShowPhotosDialog] = useState(false);

  const appointmentDate = new Date(appointment.date);
  const isToday = appointmentDate.toDateString() === new Date().toDateString();
  const isPast = appointmentDate < new Date() && !isToday;
  
  // Calculate service duration and total cost
  const totalDuration = appointment.services?.reduce((sum, service) => sum + service.duration, 0) || 0;
  const totalCost = appointment.services?.reduce((sum, service) => sum + service.price, 0) || 0;
  
  // Calculate estimated completion time
  const estimatedEndTime = new Date(`${appointment.date}T${appointment.time}`);
  estimatedEndTime.setMinutes(estimatedEndTime.getMinutes() + totalDuration);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'confirmed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in-progress': return 'bg-green-100 text-green-800 border-green-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'delayed': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'refunded': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    onDelete(appointment.id);
    setShowDeleteDialog(false);
  };

  return (
    <>
      <Card className={`transition-all duration-200 hover:shadow-md ${
        isToday ? 'ring-2 ring-blue-200' : ''
      } ${
        appointment.status === 'in-progress' ? 'ring-2 ring-green-200' : ''
      }`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <Avatar>
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {appointment.customerName.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-lg">{appointment.customerName}</h3>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {appointmentDate.toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {appointment.time}
                  </div>
                  {appointment.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {appointment.location.city}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(appointment.status)}>
                {appointment.status.replace('-', ' ')}
              </Badge>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={onEdit}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Appointment
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem onClick={onSendReminder}>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Send Reminder
                  </DropdownMenuItem>

                  {onDelayNotification && (
                    <DropdownMenuItem onClick={onDelayNotification}>
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Notify Delay
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuSeparator />

                  {appointment.status === 'pending' && (
                    <DropdownMenuItem onClick={() => onStatusChange('confirmed')}>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Confirm
                    </DropdownMenuItem>
                  )}

                  {appointment.status === 'confirmed' && (
                    <DropdownMenuItem onClick={() => onStatusChange('in-progress')}>
                      <PlayCircle className="w-4 h-4 mr-2" />
                      Start Service
                    </DropdownMenuItem>
                  )}

                  {appointment.status === 'in-progress' && (
                    <DropdownMenuItem onClick={() => onStatusChange('completed')}>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark Complete
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuItem onClick={() => onStatusChange('cancelled')}>
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancel
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem onClick={handleDeleteClick} className="text-red-600">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
                  <div>
                    <span className="font-medium">{service.name}</span>
                    <p className="text-sm text-muted-foreground">{service.duration} min</p>
                  </div>
                  <span className="font-medium">${service.price}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center mt-2 pt-2 border-t">
              <span className="font-medium">Total ({totalDuration} min)</span>
              <span className="font-bold text-lg">${totalCost}</span>
            </div>
          </div>

          {/* Vehicle Information */}
          {appointment.vehicleInfo && (
            <div>
              <h4 className="font-medium mb-2">Vehicle</h4>
              <div className="flex items-center gap-2 p-2 bg-muted rounded">
                <Truck className="w-4 h-4 text-muted-foreground" />
                <span>
                  {appointment.vehicleInfo.year} {appointment.vehicleInfo.make} {appointment.vehicleInfo.model}
                  {appointment.vehicleInfo.color && ` (${appointment.vehicleInfo.color})`}
                </span>
              </div>
            </div>
          )}

          {/* Contact Information */}
          <div>
            <h4 className="font-medium mb-2">Contact</h4>
            <div className="flex gap-2">
              {appointment.customerPhone && (
                <Button variant="outline" size="sm">
                  <Phone className="w-4 h-4 mr-1" />
                  {appointment.customerPhone}
                </Button>
              )}
              {appointment.customerEmail && (
                <Button variant="outline" size="sm">
                  <Mail className="w-4 h-4 mr-1" />
                  Email
                </Button>
              )}
            </div>
          </div>

          {/* Payment Information */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">Payment</h4>
              <Badge className={getPaymentStatusColor(appointment.payment?.status || 'pending')}>
                {appointment.payment?.status || 'pending'}
              </Badge>
            </div>
            
            <div className="flex justify-between items-center">
              <span>Amount: ${appointment.payment?.amount || totalCost}</span>
              <div className="flex gap-2">
                {appointment.payment?.status !== 'paid' && onProcessPayment && (
                  <Button variant="outline" size="sm" onClick={onProcessPayment}>
                    <CreditCard className="w-4 h-4 mr-1" />
                    Process Payment
                  </Button>
                )}
                {appointment.payment?.invoiceUrl && (
                  <Button variant="outline" size="sm">
                    <Receipt className="w-4 h-4 mr-1" />
                    Invoice
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Progress Tracking for In-Progress Appointments */}
          {appointment.status === 'in-progress' && (
            <div>
              <h4 className="font-medium mb-2">Service Progress</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Estimated completion</span>
                  <span>{estimatedEndTime.toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}</span>
                </div>
                <Progress value={65} className="h-2" />
                <p className="text-sm text-muted-foreground">
                  Currently washing exterior (Step 2 of 4)
                </p>
              </div>
            </div>
          )}

          {/* Customer Rating */}
          {appointment.customerRating && (
            <div>
              <h4 className="font-medium mb-2">Customer Feedback</h4>
              <div className="flex items-center gap-2">
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
                <span className="font-medium">{appointment.customerRating}/5</span>
              </div>
              {appointment.customerReview && (
                <p className="text-sm text-muted-foreground mt-1 italic">
                  "{appointment.customerReview}"
                </p>
              )}
            </div>
          )}

          {/* Photos */}
          {(appointment.beforePhotos?.length || appointment.afterPhotos?.length) && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Photos</h4>
                <Button variant="outline" size="sm" onClick={() => setShowPhotosDialog(true)}>
                  <Camera className="w-4 h-4 mr-1" />
                  View Gallery ({(appointment.beforePhotos?.length || 0) + (appointment.afterPhotos?.length || 0)})
                </Button>
              </div>
            </div>
          )}

          {/* Notes */}
          {appointment.notes && (
            <div>
              <h4 className="font-medium mb-2">Notes</h4>
              <p className="text-sm text-muted-foreground">{appointment.notes}</p>
            </div>
          )}

          {/* Loyalty Points */}
          {appointment.loyaltyPointsEarned && (
            <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium">Loyalty Points Earned</span>
              </div>
              <span className="font-bold text-blue-600">+{appointment.loyaltyPointsEarned}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Appointment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this appointment for {appointment.customerName}? 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete Appointment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Photos Gallery Dialog */}
      <Dialog open={showPhotosDialog} onOpenChange={setShowPhotosDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Service Photos</DialogTitle>
            <DialogDescription>
              Before and after photos for {appointment.customerName}'s appointment
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {appointment.beforePhotos?.length && (
              <div>
                <h4 className="font-medium mb-2">Before Photos</h4>
                <div className="grid grid-cols-2 gap-2">
                  {appointment.beforePhotos.map((photo, index) => (
                    <div key={index} className="aspect-square bg-gray-200 rounded flex items-center justify-center">
                      <Camera className="w-8 h-8 text-gray-400" />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {appointment.afterPhotos?.length && (
              <div>
                <h4 className="font-medium mb-2">After Photos</h4>
                <div className="grid grid-cols-2 gap-2">
                  {appointment.afterPhotos.map((photo, index) => (
                    <div key={index} className="aspect-square bg-gray-200 rounded flex items-center justify-center">
                      <Camera className="w-8 h-8 text-gray-400" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}