import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';
import { queryClient } from '@/lib/queryClient';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[GlobalErrorBoundary]', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    try { localStorage.clear(); } catch {}
    try { sessionStorage.clear(); } catch {}
    try { queryClient.clear(); } catch {}
    window.location.assign('/');
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
          <div className="w-full max-w-md rounded-lg border bg-white p-8 shadow-lg">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-7 w-7 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                Error inesperado
              </h2>
              <p className="text-sm text-gray-500">
                La aplicación ha encontrado un error crítico. Puedes intentar recargar o limpiar el estado guardado.
              </p>
              {this.state.error && (
                <pre className="w-full overflow-auto rounded bg-gray-100 p-3 text-left text-xs text-gray-600">
                  {this.state.error.message}
                </pre>
              )}
              <div className="flex w-full flex-col gap-2 pt-2">
                <button
                  onClick={this.handleReload}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <RefreshCw className="h-4 w-4" />
                  Recargar página
                </button>
                <button
                  onClick={this.handleReset}
                  className="flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Reset app state
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
