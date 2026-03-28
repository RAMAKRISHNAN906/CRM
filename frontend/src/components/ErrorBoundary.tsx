import React from 'react';

interface State { error: Error | null }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-8" style={{ background: '#111113' }}>
          <div className="max-w-xl w-full rounded-2xl border border-red-500/30 bg-red-500/5 p-6 space-y-4">
            <h2 className="text-red-400 text-lg font-semibold">Runtime Error</h2>
            <pre className="text-xs text-red-300 whitespace-pre-wrap break-all bg-red-950/30 rounded-lg p-4 max-h-80 overflow-y-auto">
              {this.state.error.message}
              {'\n\n'}
              {this.state.error.stack}
            </pre>
            <button
              onClick={() => { this.setState({ error: null }); window.location.href = '/dashboard'; }}
              className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
