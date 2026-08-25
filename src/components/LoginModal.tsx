import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { DEFAULT_ADMIN_USER } from '../lib/storage';
import { Lock, Mail, User, ShieldCheck, Check, KeyRound, LogOut, X } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { user, isAuthenticated, login, logout, updateUser } = useApp();

  const [mode, setMode] = useState<'login' | 'recover' | 'profile'>('profile');
  const [email, setEmail] = useState(user.email || DEFAULT_ADMIN_USER.email);
  const [password, setPassword] = useState('••••••••');
  const [name, setName] = useState(user.name);
  const [rememberMe, setRememberMe] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login(email, password);
    setMessage('Sessão autenticada como Administrador Geral!');
    setTimeout(() => {
      setMessage(null);
      onClose();
    }, 800);
  };

  const handleRecover = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(`Instruções de recuperação enviadas para: ${email}`);
    setTimeout(() => {
      setMode('login');
      setMessage(null);
    }, 2000);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser({ name, email });
    setMessage('Perfil atualizado com sucesso!');
    setTimeout(() => {
      setMessage(null);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Autenticação & Controle de Acesso</h3>
              <p className="text-[11px] text-indigo-100">Painel Administrativo Master</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          {message && (
            <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs rounded-xl flex items-center gap-2 font-medium">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          {/* Profile / Active Session View */}
          {mode === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs">{user.name}</h4>
                    <p className="text-[11px] text-slate-500">{user.email}</p>
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                      Nível: Administrador Master (8 Empresas)
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nome do Administrador
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  E-mail de Acesso
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors"
                >
                  Salvar Alterações
                </button>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="text-xs text-slate-600 dark:text-slate-400 hover:underline"
                  >
                    Trocar de Conta
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setMode('login');
                    }}
                    className="text-xs text-rose-600 font-semibold flex items-center gap-1 hover:underline"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sair da Sessão
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Login Form */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 text-slate-600 dark:text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Manter sessão ativa</span>
                </label>
                <button
                  type="button"
                  onClick={() => setMode('recover')}
                  className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                >
                  Recuperar senha
                </button>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-colors"
              >
                Entrar no Sistema
              </button>

              <p className="text-[11px] text-center text-slate-400">
                Acesso unificado com privilégio de administração em todas as empresas.
              </p>
            </form>
          )}

          {/* Password Recovery */}
          {mode === 'recover' && (
            <form onSubmit={handleRecover} className="space-y-4">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-xs text-indigo-800 dark:text-indigo-300">
                Digite seu e-mail cadastrado para receber o link de redefinição de senha.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  E-mail
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="w-1/2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs"
                >
                  Enviar Link
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
