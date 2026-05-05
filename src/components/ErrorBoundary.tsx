import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ScoutFleurDeLis } from './ScoutIcons';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="app-shell flex min-h-[60vh] items-center justify-center px-6">
          <div className="text-center max-w-md">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-100 text-stone-400">
              <ScoutFleurDeLis className="h-7 w-7" />
            </div>
            <h2 className="mb-2 text-2xl font-semibold text-stone-800">
              Something went wrong
            </h2>
            <p className="mb-6 text-sm leading-relaxed text-stone-500">
              An unexpected error occurred. Your data is safe — try refreshing the page or click below to retry.
            </p>
            {this.state.error && (
              <details className="mb-6 rounded-xl border border-stone-200 bg-stone-50 p-4 text-left">
                <summary className="cursor-pointer text-xs font-medium text-stone-400">
                  Error details
                </summary>
                <pre className="mt-2 overflow-x-auto text-xs text-stone-600">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <div className="flex justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="rounded-xl border border-stone-100 bg-white  px-5 py-2.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-stone-800"
              >
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
