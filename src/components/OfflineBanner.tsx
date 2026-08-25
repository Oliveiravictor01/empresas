import React, { useState, useEffect } from 'react';
import { WifiOff, AlertTriangle, RefreshCw } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetryConnection = async () => {
    setIsChecking(true);
    try {
      // Test actual connectivity to internet
      const res = await fetch('https://www.google.com/favicon.ico', { mode: 'no-cors', cache: 'no-store' });
      setIsOnline(true);
    } catch {
      setIsOnline(navigator.onLine);
    } finally {
      setTimeout(() => setIsChecking(false), 800);
    }
  };

  if (isOnline) {
    return null;
  }

  return (
    <div
      id="offline-connectivity-guard"
      className="sticky top-0 z-50 bg-rose-600 text-white px-4 py-2.5 shadow-md flex items-center justify-between gap-3 text-xs sm:text-sm font-medium animate-slide-down"
    >
      <div className="flex items-center gap-2.5">
        <div className="p-1 bg-white/20 rounded-lg">
          <WifiOff className="w-4 h-4 text-white animate-pulse" />
        </div>
        <div>
          <span className="font-bold">Sem conexão com a internet: </span>
          <span>É necessário estar conectado à internet para utilizar o sistema e sincronizar os dados.</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleRetryConnection}
        disabled={isChecking}
        className="px-3 py-1 bg-white text-rose-700 hover:bg-rose-50 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs shrink-0 cursor-pointer disabled:opacity-50"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
        <span>{isChecking ? 'Verificando...' : 'Reconectar'}</span>
      </button>
    </div>
  );
};
