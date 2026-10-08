import React from 'react';
import { AlertTriangle, RefreshCw, LayoutDashboard } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full p-6 my-4 rounded-xl bg-surface-2 border border-error-container/50 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-error-container/30 border border-error-container flex items-center justify-center text-neon-rose shrink-0">
              <AlertTriangle className="w-5 h-5 text-neon-rose" />
            </div>
            <div>
              <h3 className="font-headline-md text-base font-bold text-neon-rose tracking-tight">
                {this.props.title || 'Komponen Mengalami Kendala Tampilan'}
              </h3>
              <p className="font-mono text-xs text-text-muted mt-0.5">
                Terjadi kesalahan JavaScript saat merender modul ini. Sistem telah mengisolasi error agar konsol tetap aktif.
              </p>
            </div>
          </div>

          {this.state.error && (
            <div className="p-3 rounded-lg bg-surface-1 border border-border-base font-mono text-xs text-neon-rose overflow-x-auto whitespace-pre-wrap">
              {this.state.error.toString()}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-surface-container-high hover:bg-surface-3 text-primary-fixed text-xs font-mono font-semibold flex items-center gap-2 border border-border-base transition-colors"
              type="button"
            >
              <RefreshCw className="w-3.5 h-3.5 text-neon-cyan" />
              <span>Muat Ulang Halaman</span>
            </button>
            <button
              onClick={this.handleReset}
              className="px-4 py-2 rounded-lg bg-secondary text-surface text-xs font-mono font-semibold hover:bg-secondary-fixed transition-colors flex items-center gap-2 shadow-sm"
              type="button"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Coba Render Ulang</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
