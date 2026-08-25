import React from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        const isWarning = toast.type === 'warning';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-2xl shadow-xl border backdrop-blur-md transition-all duration-300 transform translate-y-0 text-xs font-semibold ${
              isSuccess
                ? 'bg-emerald-950/90 text-emerald-100 border-emerald-700/60 shadow-emerald-950/30'
                : isError
                ? 'bg-rose-950/90 text-rose-100 border-rose-700/60 shadow-rose-950/30'
                : isWarning
                ? 'bg-amber-950/90 text-amber-100 border-amber-700/60 shadow-amber-950/30'
                : 'bg-slate-900/95 text-slate-100 border-slate-700 shadow-slate-950/40'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
              {isError && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
              {isWarning && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
              {!isSuccess && !isError && !isWarning && <Info className="w-4 h-4 text-indigo-400 shrink-0" />}
              <span className="truncate">{toast.message}</span>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
