import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { 
  Bell, BellOff, Send, Clock, CheckCircle, XCircle, 
  Smartphone, Mail, TrendingUp, Settings, AlertTriangle,
  Play, Pause, RotateCcw
} from 'lucide-react';
import { NotificationService, NotificationLog } from './NotificationService';
import { Appointment, BusinessSettings } from '../App';

interface NotificationCenterProps {
  notificationService: NotificationService;
  appointments: Appointment[];
  businessSettings: BusinessSettings;
  onSettingsUpdate: (settings: Partial<BusinessSettings>) => void;
}

export function NotificationCenter({
  notificationService,
  appointments,
  businessSettings,
  onSettingsUpdate
}: NotificationCenterProps) {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [stats, setStats] = useState<any>({});
  const [isAutomationEnabled, setIsAutomationEnabled] = useState(true);
  const [pendingReminders, setPendingReminders] = useState(0);
  const [isSendingBulk, setIsSendingBulk] = useState(false);

  useEffect(() => {
    const refreshData = () => {
      setLogs(notificationService.getNotificationLogs(100));
      setStats(notificationService.getNotificationStats(30));
      setIsAutomationEnabled(notificationService.isAutomationEnabled());
      setPendingReminders(notificationService.getPendingRemindersCount());
    };

    refreshData();
    const interval = setInterval(refreshData, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [notificationService]);

  const handleAutomationToggle = (enabled: boolean) => {
    if (enabled) {
      notificationService.enableAutomation();
    } else {
      notificationService.disableAutomation();
    }
    setIsAutomationEnabled(enabled);
  };

  const handleBulkReminders = async () => {
    setIsSendingBulk(true);
    try {
      // Get appointments that might need reminders (upcoming, not cancelled)
      const upcomingAppointments = appointments.filter(apt => {
        const aptDate = new Date(`${apt.date}T${apt.time}`);
        const now = new Date();
        const hoursUntil = (aptDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        return hoursUntil > 0 && hoursUntil <= 48 && apt.status !== 'cancelled';
      });

      const result = await notificationService.sendBulkReminders(
        upcomingAppointments, 
        'Manual bulk reminder - system catch-up'
      );

      // Refresh data after bulk send
      setLogs(notificationService.getNotificationLogs(100));
      setStats(notificationService.getNotificationStats(30));

      alert(`Bulk reminders complete: ${result.sent} sent, ${result.failed} failed, ${result.skipped} skipped`);
    } catch (error) {
      console.error('Bulk reminder error:', error);
      alert('Error sending bulk reminders. Please try again.');
    } finally {
      setIsSendingBulk(false);
    }
  };

  const handleSettingsChange = (key: string, value: any) => {
    const newSettings = {
      ...businessSettings,
      notifications: {
        ...businessSettings.notifications,
        [key]: value
      }
    };
    onSettingsUpdate(newSettings);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'sms': return <Smartphone className="w-4 h-4" />;
      case 'email': return <Mail className="w-4 h-4" />;
      case 'both': return (
        <div className="flex">
          <Smartphone className="w-4 h-4" />
          <Mail className="w-4 h-4 -ml-1" />
        </div>
      );
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const successRate = stats.total > 0 ? (stats.sent / stats.total) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Automation Status Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {isAutomationEnabled ? (
                <Bell className="w-5 h-5 text-green-500" />
              ) : (
                <BellOff className="w-5 h-5 text-red-500" />
              )}
              Notification Center
            </CardTitle>
            <div className="flex items-center gap-4">
              {pendingReminders > 0 && (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  {pendingReminders} pending
                </Badge>
              )}
              <div className="flex items-center gap-2">
                <Label htmlFor="automation-toggle" className="text-sm">
                  Automation
                </Label>
                <Switch
                  id="automation-toggle"
                  checked={isAutomationEnabled}
                  onCheckedChange={handleAutomationToggle}
                />
                {isAutomationEnabled ? (
                  <Play className="w-4 h-4 text-green-500" />
                ) : (
                  <Pause className="w-4 h-4 text-red-500" />
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium">Success Rate</span>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold">{successRate.toFixed(1)}%</div>
                <Progress value={successRate} className="h-2" />
                <div className="text-xs text-muted-foreground">
                  {stats.sent}/{stats.total} delivered (30 days)
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium">SMS Sent</span>
              </div>
              <div className="text-2xl font-bold">{stats.byMethod?.sms || 0}</div>
              <div className="text-xs text-muted-foreground">Last 30 days</div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-medium">Emails Sent</span>
              </div>
              <div className="text-2xl font-bold">{stats.byMethod?.email || 0}</div>
              <div className="text-xs text-muted-foreground">Last 30 days</div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-medium">Auto Reminders</span>
              </div>
              <div className="text-2xl font-bold">{stats.byType?.reminder || 0}</div>
              <div className="text-xs text-muted-foreground">Automated sends</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Alert */}
      {!isAutomationEnabled && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Automated reminders are currently disabled. Customers will not receive automatic appointment reminders.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="activity" className="space-y-4">
        <TabsList>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          <TabsTrigger value="settings">Automation Settings</TabsTrigger>
          <TabsTrigger value="manual">Manual Actions</TabsTrigger>
        </TabsList>

        {/* Recent Activity */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No notifications sent yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {logs.slice(0, 10).map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(log.status)}
                        {getMethodIcon(log.method)}
                        <div>
                          <p className="font-medium text-sm">
                            {log.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            {log.reminderHours && ` (${log.reminderHours}h before)`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Appointment {log.appointmentId.slice(-6)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {formatTime(log.sentAt)}
                        </p>
                        {log.status === 'failed' && log.errorMessage && (
                          <p className="text-xs text-red-500 max-w-32 truncate">
                            {log.errorMessage}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Automation Settings */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Automation Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="auto-reminders">Automated Reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Send reminders automatically based on business hours
                    </p>
                  </div>
                  <Switch
                    id="auto-reminders"
                    checked={businessSettings.notifications.automatedReminders}
                    onCheckedChange={(checked) => handleSettingsChange('automatedReminders', checked)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Reminder Schedule</Label>
                  <p className="text-sm text-muted-foreground">
                    Currently sending reminders {businessSettings.notifications.reminderHours.join(' and ')} hours before appointments
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {businessSettings.notifications.reminderHours.map((hours, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">{hours} hours before</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="sms-enabled">SMS Notifications</Label>
                      <p className="text-xs text-muted-foreground">Text message alerts</p>
                    </div>
                    <Switch
                      id="sms-enabled"
                      checked={businessSettings.notifications.smsEnabled}
                      onCheckedChange={(checked) => handleSettingsChange('smsEnabled', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="email-enabled">Email Notifications</Label>
                      <p className="text-xs text-muted-foreground">Email alerts</p>
                    </div>
                    <Switch
                      id="email-enabled"
                      checked={businessSettings.notifications.emailEnabled}
                      onCheckedChange={(checked) => handleSettingsChange('emailEnabled', checked)}
                    />
                  </div>
                </div>
              </div>

              <Alert>
                <Bell className="h-4 w-4" />
                <AlertDescription>
                  Automated reminders respect individual customer notification preferences. 
                  Customers can opt out of reminders in their profile settings.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manual Actions */}
        <TabsContent value="manual" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5" />
                Manual Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Manual actions should only be used for system catch-up or emergency situations. 
                  Regular reminders are handled automatically.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-medium">Bulk Reminder Catch-Up</h4>
                      <p className="text-sm text-muted-foreground">
                        Send reminders to all upcoming appointments (useful if system was down)
                      </p>
                    </div>
                    <Button
                      onClick={handleBulkReminders}
                      disabled={isSendingBulk}
                      variant="outline"
                    >
                      {isSendingBulk ? (
                        <>
                          <Clock className="w-4 h-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Send Bulk Reminders
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    This will send reminders to appointments in the next 48 hours that haven't received 
                    a reminder in the last 2 hours.
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-medium">System Maintenance</h4>
                      <p className="text-sm text-muted-foreground">
                        Clear old notification logs and reset counters
                      </p>
                    </div>
                    <Button
                      onClick={() => {
                        notificationService.clearOldLogs(90);
                        setLogs(notificationService.getNotificationLogs(100));
                        setStats(notificationService.getNotificationStats(30));
                      }}
                      variant="outline"
                      size="sm"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Clear Old Logs
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Removes notification logs older than 90 days to keep the system clean.
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