import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught Error in Component Tree:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6 text-center">
          <div className="bg-zinc-950 border border-purple-900/30 p-8 rounded-3xl max-w-md w-full shadow-2xl space-y-4">
            <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto text-red-400">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-white">Something went wrong</h2>
            <p className="text-xs text-gray-400 leading-relaxed">
              An unexpected display issue occurred while rendering this component.
            </p>

            {this.state.error && (
              <div className="bg-black/60 border border-red-500/20 p-3 rounded-xl text-left font-mono text-[11px] text-red-300 max-h-36 overflow-y-auto break-words space-y-1">
                <div className="font-bold text-red-400">{this.state.error.name || 'Error'}: {this.state.error.message}</div>
                {this.state.error.stack && (
                  <div className="text-[9px] text-gray-500 whitespace-pre-wrap">{this.state.error.stack.slice(0, 300)}...</div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                }}
                className="flex-1 py-3 px-3 bg-zinc-900 hover:bg-zinc-800 text-gray-300 hover:text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-colors border border-purple-900/20 cursor-pointer"
              >
                Try Again
              </button>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="flex-1 py-3 px-3 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-purple-600/20"
              >
                <RefreshCw className="w-3.5 h-3.5" />
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

export default ErrorBoundary;
