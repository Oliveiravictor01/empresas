import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Clock, ShieldAlert, LogOut, RefreshCw, CheckCircle2, Building2 } from 'lucide-react';

export const PendingApprovalView: React.FC = () => {
  const { user, logout, showToast, refreshData } = useApp();
  const [isChecking, setIsChecking] = useState(false);

  const handleCheckStatus = async () => {
    setIsChecking(true);
    try {
      await refreshData();
      showToast('Status da conta atualizado.', 'info');
    } catch {
      showToast('Não foi possível verificar no momento.', 'error');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 text-center">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shadow-lg shadow-amber-500/10 mb-4">
          <Clock className="w-8 h-8 animate-pulse" />
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold uppercase tracking-wider mb-3">
          <ShieldAlert className="w-3.5 h-3.5" />
          Aguardando Aprovação
        </div>

        {/* Heading */}
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Acesso Pendente
        </h2>

        <p className="text-slate-400 text-sm mt-3 leading-relaxed">
          Olá, <strong className="text-white">{user?.name || user?.email}</strong>. Sua conta foi criada com sucesso, porém o acesso aos módulos e empresas requer autorização do <strong className="text-indigo-400">Administrador Master</strong>.
        </p>

        {/* Info card */}
        <div className="mt-6 p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-left text-xs space-y-2.5 text-slate-300">
          <div className="flex items-center gap-2 text-slate-200 font-semibold">
            <Building2 className="w-4 h-4 text-indigo-400" />
            <span>Próximos passos:</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
            <span>O Administrador Master deve vincular sua conta a pelo menos uma empresa.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
            <span>Suas permissões operacionais ou gerenciais serão configuradas.</span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 space-y-3">
          <button
            onClick={handleCheckStatus}
            disabled={isChecking}
            className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'Verificando...' : 'Verificar se fui aprovado'}</span>
          </button>

          <button
            onClick={logout}
            className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair / Entrar com outra conta</span>
          </button>
        </div>
      </div>
    </div>
  );
};
