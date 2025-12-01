/**
 * ErrorBoundary
 * React Error Boundary for catching and displaying errors gracefully
 */

import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={styles.container}>
          <div style={styles.content}>
            <div style={styles.icon}>!</div>
            <h2 style={styles.title}>Something went wrong</h2>
            <p style={styles.message}>
              An error occurred while rendering this component.
            </p>

            {this.state.error && (
              <div style={styles.errorBox}>
                <strong>Error:</strong>
                <pre style={styles.errorText}>{this.state.error.message}</pre>
              </div>
            )}

            {this.state.errorInfo && (
              <details style={styles.details}>
                <summary style={styles.summary}>Stack Trace</summary>
                <pre style={styles.stackTrace}>
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            <div style={styles.actions}>
              <button onClick={this.handleRetry} style={styles.retryButton}>
                Try Again
              </button>
              <button onClick={() => window.location.reload()} style={styles.reloadButton}>
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    padding: '24px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  content: {
    maxWidth: '600px',
    textAlign: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: '12px',
    padding: '32px',
    border: '1px solid #FECACA'
  },
  icon: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#EF4444',
    color: '#fff',
    fontSize: '24px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px'
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#991B1B',
    margin: '0 0 8px'
  },
  message: {
    fontSize: '14px',
    color: '#B91C1C',
    margin: '0 0 16px'
  },
  errorBox: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '16px',
    textAlign: 'left',
    border: '1px solid #FECACA'
  },
  errorText: {
    fontSize: '12px',
    color: '#DC2626',
    margin: '8px 0 0',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    fontFamily: 'monospace'
  },
  details: {
    textAlign: 'left',
    marginBottom: '16px'
  },
  summary: {
    cursor: 'pointer',
    fontSize: '13px',
    color: '#991B1B',
    fontWeight: 500,
    padding: '8px 0'
  },
  stackTrace: {
    fontSize: '11px',
    color: '#6B7280',
    backgroundColor: '#fff',
    borderRadius: '6px',
    padding: '12px',
    overflow: 'auto',
    maxHeight: '200px',
    whiteSpace: 'pre-wrap',
    fontFamily: 'monospace',
    margin: '8px 0 0'
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center'
  },
  retryButton: {
    padding: '10px 20px',
    backgroundColor: '#EF4444',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer'
  },
  reloadButton: {
    padding: '10px 20px',
    backgroundColor: '#fff',
    color: '#374151',
    border: '1px solid #D1D5DB',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer'
  }
};

export default ErrorBoundary;
