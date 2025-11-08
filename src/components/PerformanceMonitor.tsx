import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Activity, Cpu, Database, Wifi, AlertTriangle, CheckCircle,
  Clock, Zap, TrendingUp, TrendingDown 
} from 'lucide-react';

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  componentCount: number;
  lastUpdate: string;
  networkLatency: number;
  errorCount: number;
  cacheHitRate: number;
}

interface PerformanceMonitorProps {
  appointmentCount: number;
  customerCount: number;
  notificationCount: number;
  isAutomationActive: boolean;
}

export function PerformanceMonitor({
  appointmentCount,
  customerCount,
  notificationCount,
  isAutomationActive
}: PerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    memoryUsage: 0,
    componentCount: 0,
    lastUpdate: new Date().toISOString(),
    networkLatency: 0,
    errorCount: 0,
    cacheHitRate: 95
  });

  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show in development mode
    if (process.env.NODE_ENV === 'development') {
      setIsVisible(true);
      
      const updateMetrics = () => {
        setMetrics(prevMetrics => {
          // Simulate performance measurements
          return {
            renderTime: Math.random() * 16 + 2, // 2-18ms
            memoryUsage: (() => {
              try {
                // Safely access performance memory if available
                if (typeof window !== 'undefined' && 
                    window.performance && 
                    (window.performance as any).memory) {
                  return (window.performance as any).memory.usedJSHeapSize / 1024 / 1024;
                }
              } catch (e) {
                // Fallback if performance.memory is not available
              }
              return Math.random() * 50 + 10; // 10-60MB fallback
            })(),
            componentCount: appointmentCount + customerCount + 15, // Base components
            lastUpdate: new Date().toISOString(),
            networkLatency: Math.random() * 100 + 50, // 50-150ms
            errorCount: prevMetrics.errorCount + (Math.random() < 0.01 ? 1 : 0), // Occasional error
            cacheHitRate: Math.min(99, Math.max(85, prevMetrics.cacheHitRate + (Math.random() - 0.5) * 5))
          };
        });
      };

      // Update metrics every 5 seconds
      const interval = setInterval(updateMetrics, 5000);
      updateMetrics(); // Initial update

      return () => clearInterval(interval);
    }
  }, [appointmentCount, customerCount]);

  // Performance status calculation
  const getPerformanceStatus = () => {
    const score = (
      (metrics.renderTime < 16 ? 25 : metrics.renderTime < 32 ? 15 : 5) +
      (metrics.memoryUsage < 30 ? 25 : metrics.memoryUsage < 50 ? 15 : 5) +
      (metrics.networkLatency < 100 ? 25 : metrics.networkLatency < 200 ? 15 : 5) +
      (metrics.cacheHitRate > 90 ? 25 : metrics.cacheHitRate > 80 ? 15 : 5)
    );

    if (score >= 85) return { status: 'excellent', color: 'text-green-600', icon: CheckCircle };
    if (score >= 70) return { status: 'good', color: 'text-blue-600', icon: TrendingUp };
    if (score >= 50) return { status: 'fair', color: 'text-yellow-600', icon: Activity };
    return { status: 'poor', color: 'text-red-600', icon: AlertTriangle };
  };

  if (!isVisible) return null;

  const performanceStatus = getPerformanceStatus();
  const StatusIcon = performanceStatus.icon;

  return (
    <div className="fixed bottom-4 left-4 z-50 w-80">
      <Card className="bg-background/95 backdrop-blur border-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Performance Monitor
            <Badge variant="secondary" className="ml-auto">DEV</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Overall Status */}
          <div className="flex items-center justify-between p-2 bg-muted rounded">
            <div className="flex items-center gap-2">
              <StatusIcon className={`w-4 h-4 ${performanceStatus.color}`} />
              <span className="text-sm font-medium capitalize">{performanceStatus.status}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {new Date(metrics.lastUpdate).toLocaleTimeString()}
            </div>
          </div>

          {/* System Metrics */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Render Time</span>
              </div>
              <div className="flex justify-between">
                <span>{metrics.renderTime.toFixed(1)}ms</span>
                <span className={metrics.renderTime < 16 ? 'text-green-600' : 'text-yellow-600'}>
                  {metrics.renderTime < 16 ? '✓' : '⚠'}
                </span>
              </div>
              <Progress value={Math.min(100, (metrics.renderTime / 32) * 100)} className="h-1" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <Cpu className="w-3 h-3" />
                <span>Memory</span>
              </div>
              <div className="flex justify-between">
                <span>{metrics.memoryUsage.toFixed(1)}MB</span>
                <span className={metrics.memoryUsage < 50 ? 'text-green-600' : 'text-yellow-600'}>
                  {metrics.memoryUsage < 50 ? '✓' : '⚠'}
                </span>
              </div>
              <Progress value={Math.min(100, (metrics.memoryUsage / 100) * 100)} className="h-1" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <Wifi className="w-3 h-3" />
                <span>Network</span>
              </div>
              <div className="flex justify-between">
                <span>{metrics.networkLatency.toFixed(0)}ms</span>
                <span className={metrics.networkLatency < 150 ? 'text-green-600' : 'text-yellow-600'}>
                  {metrics.networkLatency < 150 ? '✓' : '⚠'}
                </span>
              </div>
              <Progress value={Math.min(100, (metrics.networkLatency / 300) * 100)} className="h-1" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <Database className="w-3 h-3" />
                <span>Cache Hit</span>
              </div>
              <div className="flex justify-between">
                <span>{metrics.cacheHitRate.toFixed(1)}%</span>
                <span className={metrics.cacheHitRate > 90 ? 'text-green-600' : 'text-yellow-600'}>
                  {metrics.cacheHitRate > 90 ? '✓' : '⚠'}
                </span>
              </div>
              <Progress value={metrics.cacheHitRate} className="h-1" />
            </div>
          </div>

          {/* Application Metrics */}
          <div className="border-t pt-3 space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Application State</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span>Appointments:</span>
                <span className="font-mono">{appointmentCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Customers:</span>
                <span className="font-mono">{customerCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Notifications:</span>
                <span className="font-mono">{notificationCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Automation:</span>
                <span className={`font-mono ${isAutomationActive ? 'text-green-600' : 'text-red-600'}`}>
                  {isAutomationActive ? 'ON' : 'OFF'}
                </span>
              </div>
            </div>
          </div>

          {/* Warnings */}
          {(metrics.renderTime > 16 || metrics.memoryUsage > 50 || metrics.errorCount > 0) && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-3 w-3" />
              <AlertDescription className="text-xs">
                {metrics.renderTime > 16 && 'Slow renders detected. '}
                {metrics.memoryUsage > 50 && 'High memory usage. '}
                {metrics.errorCount > 0 && `${metrics.errorCount} errors logged. `}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}