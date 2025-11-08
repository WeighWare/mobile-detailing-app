import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // In production, you would send this to your error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error, { extra: errorInfo });
      console.log('Error would be sent to monitoring service:', {
        error: error.toString(),
        componentStack: errorInfo.componentStack,
        errorId: this.state.errorId
      });
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                Something went wrong
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <Bug className="h-4 w-4" />
                <AlertDescription>
                  The application encountered an unexpected error and couldn't recover.
                  <br />
                  <span className="text-xs font-mono mt-2 block">
                    Error ID: {this.state.errorId}
                  </span>
                </AlertDescription>
              </Alert>

              {/* Error Details (Development Only) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="space-y-2">
                  <details className="group">
                    <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                      Show technical details
                    </summary>
                    <div className="mt-2 p-3 bg-muted rounded-md text-xs font-mono overflow-auto max-h-40">
                      <div className="text-red-600 font-bold mb-2">
                        {this.state.error.name}: {this.state.error.message}
                      </div>
                      {this.state.error.stack && (
                        <pre className="whitespace-pre-wrap text-xs">
                          {this.state.error.stack}
                        </pre>
                      )}
                      {this.state.errorInfo?.componentStack && (
                        <div className="mt-2 pt-2 border-t">
                          <div className="font-bold mb-1">Component Stack:</div>
                          <pre className="whitespace-pre-wrap text-xs">
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={this.handleReset} variant="default" className="flex-1">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Button onClick={this.handleReload} variant="outline" className="flex-1">
                  <Home className="w-4 h-4 mr-2" />
                  Reload Page
                </Button>
              </div>

              {/* User Guidance */}
              <div className="text-sm text-muted-foreground space-y-2">
                <p>If this problem persists, try:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Refreshing the page</li>
                  <li>Clearing your browser cache</li>
                  <li>Trying a different browser</li>
                  <li>Contacting support with Error ID: <code className="font-mono">{this.state.errorId}</code></li>
                </ul>
              </div>

              {/* Contact Information */}
              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground">
                  Need help? Contact{' '}
                  <a 
                    href="mailto:support@themobiledetailers.com" 
                    className="text-primary hover:underline"
                  >
                    support@themobiledetailers.com
                  </a>
                  {' '}with the Error ID above.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export function useErrorHandler() {
  return (error: Error, errorInfo?: { componentStack: string }) => {
    console.error('Manual error report:', error, errorInfo);
    
    // In production, send to error monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error, { extra: errorInfo });
    }
  };
}

// Higher-order component for wrapping components with error boundary
export function withErrorBoundary<T extends object>(
  Component: React.ComponentType<T>,
  fallback?: ReactNode
) {
  const WrappedComponent = (props: T) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}