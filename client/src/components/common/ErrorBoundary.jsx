import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('⚠️ [ErrorBoundary Caught Error]:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 bg-rose-900/40 border border-rose-500/50 rounded-2xl text-rose-200 text-xs">
          ⚠️ Map Rendering Error caught safely. Please refresh your browser.
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
