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
        <div className="w-full p-6 my-4 rounded-2xl bg-white border border-rose-200 shadow-[0_4px_20px_-2px_rgba(244,63,94,0.1),0_2px_4px_rgba(0,0,0,0.03)] flex flex-col gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0 shadow-sm">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-rose-700 tracking-tight">
                {this.props.title || 'Komponen Mengalami Kendala Tampilan'}
              </h3>
              <p className="font-mono text-xs text-slate-500 mt-0.5">
                Terjadi kesalahan JavaScript saat merender modul ini. Sistem telah mengisolasi error agar konsol tetap aktif.
              </p>
            </div>
          </div>

          {this.state.error && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs text-rose-600 overflow-x-auto whitespace-pre-wrap shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]">
              {this.state.error.toString()}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-mono font-semibold flex items-center gap-2 border border-slate-200 shadow-[0_2px_0_#cbd5e1,0_2px_4px_rgba(0,0,0,0.03)] active:translate-y-0.5 transition-all"
              type="button"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
              <span>Muat Ulang Halaman</span>
            </button>
            <button
              onClick={this.handleReset}
              className="px-4 py-2 rounded-xl bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-xs font-mono font-semibold flex items-center gap-2 shadow-[0_2px_0_#1d4ed8,0_4px_10px_rgba(37,99,235,0.25)] active:translate-y-0.5 transition-all"
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
