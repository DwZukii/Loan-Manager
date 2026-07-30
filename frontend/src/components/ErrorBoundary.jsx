import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service here
    console.error("App crashed, caught by ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded shadow-xl max-w-md w-full text-center border border-slate-100 animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-800 mb-3">Connection Lost or Update Required</h1>
            <p className="text-slate-500 mb-8 leading-relaxed text-sm">
              The application encountered an unexpected error. This usually happens when a new version is deployed and the old files are no longer available.
            </p>
            <button
              onClick={() => window.location.reload(true)}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-200"
            >
              <RefreshCw className="w-5 h-5" />
              Refresh Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
