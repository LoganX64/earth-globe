import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /**
   * Rendered in place of the subtree after it throws. Pass `null` for chrome
   * that sits on top of the globe: losing a panel is an annoyance, losing the
   * globe is a broken page, and a boundary with `null` here keeps the latter
   * from being taken down by the former.
   */
  fallback?: React.ReactNode;
  /** Lets a host surface the failure instead of only writing to the console. */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Changing this clears a captured error, e.g. when the panel is reopened. */
  resetKey?: unknown;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches render/lifecycle errors thrown by a subtree.
 *
 * The app previously had none, so any throw during render unmounted the whole
 * tree and left a blank page with no recovery and no diagnostic. Errors thrown
 * inside the canvas render loop are NOT caught here — that code runs in a
 * requestAnimationFrame callback, outside React's rendering, and a throw there
 * surfaces through the window's error handler instead.
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.props.onError?.(error, errorInfo);
    console.error('ErrorBoundary caught a render error:', error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (this.state.error !== null && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render(): React.ReactNode {
    if (this.state.error !== null) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}

export default ErrorBoundary;