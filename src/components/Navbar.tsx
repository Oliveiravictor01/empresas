import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Building2,
  Plus,
  Search,
  UserCheck,
  ChevronDown,
  Layers,
  Sparkles,
  RotateCcw,
  SlidersHorizontal,
  ShieldCheck,
  ShieldAlert,
  UserCheck2,
  LogOut,
  RotateCw,
} from 'lucide-react';

interface NavbarProps {
  onOpenLogin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenLogin }) => {
  const {
    data,
    user,
    isMasterUser,
    canEditOrDelete,
    allowedCompanies,
    selectedCompanyId,
    setSelectedCompanyId,
    setActiveTab,
    openQuickAction,
    loadDemoData,
    resetAllData,
    searchQuery,
    setSearchQuery,
    switchUserMode,
    logout,
    isImpersonating,
    exitImpersonation,
  } = useApp();

  const [showCompanyMenu, setShowCompanyMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const activeCompany = data.companies.find((c) => c.id === selectedCompanyId);

  return (
    <>
      {isImpersonating && (
        <div className="bg-indigo-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-sm z-40 sticky top-0">
          <div className="flex items-center gap-2 max-w-[75%] truncate">
            <span className="bg-white/20 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
              Simulação de Visão
            </span>
            <span className="truncate">
              Visualizando como <strong>{user.name}</strong> ({user.role}) — {allowedCompanies.length} {allowedCompanies.length === 1 ? 'empresa vinculada' : 'empresas vinculadas'}
            </span>
          </div>
          <button
            id="btn-exit-impersonation"
            onClick={exitImpersonation}
            className="flex items-center gap-1.5 px-3 py-1 bg-white text-indigo-700 hover:bg-indigo-50 font-bold rounded-lg text-xs transition-colors shadow-xs shrink-0 cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Voltar para Master</span>
          </button>
        </div>
      )}
      <header className={`${isImpersonating ? '' : 'sticky top-0'} z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors`}>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Brand & Multi-Company Switcher */}
          <div className="flex items-center gap-3">
            <div
              onClick={() => {
                if (isMasterUser) {
                  setSelectedCompanyId(null);
                  setActiveTab('overview');
                } else {
                  if (allowedCompanies.length > 0) {
                    setSelectedCompanyId(allowedCompanies[0].id);
                  }
                  setActiveTab('company-detail');
                }
              }}
              className="flex items-center gap-2 cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
                <Layers className="w-5 h-5" />
              </div>
              <div className="hidden sm:block">
                <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Omni<span className="text-indigo-600 dark:text-indigo-400">Gestão</span>
                </span>
                <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  {isMasterUser ? 'Painel 8 Empresas' : `Acesso ${user?.role || 'Operador'}`}
                </span>
              </div>
            </div>

            {/* Company Dropdown Switcher */}
            <div className="relative">
              <button
                id="company-switcher-btn"
                onClick={() => {
                  if (isMasterUser || allowedCompanies.length > 0) {
                    setShowCompanyMenu(!showCompanyMenu);
                  }
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all border border-slate-200/60 dark:border-slate-700/60 ${
                  isMasterUser || allowedCompanies.length > 0
                    ? 'hover:bg-slate-200 dark:hover:bg-slate-750 cursor-pointer'
                    : 'cursor-default'
                }`}
              >
                {activeCompany ? (
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: activeCompany.color || '#4f46e5' }}
                    />
                    <span className="truncate max-w-[120px] sm:max-w-[160px]">
                      {activeCompany.name}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>{isMasterUser ? 'Visão Geral (Todas)' : (allowedCompanies[0]?.name || 'Minha Empresa')}</span>
                  </div>
                )}
                {(isMasterUser || allowedCompanies.length > 0) && (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>

              {/* Dropdown Menu */}
              {showCompanyMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowCompanyMenu(false)}
                  />
                  <div className="absolute left-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 z-50 p-2 text-xs animate-fade-in">
                    <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Selecionar Visão
                    </div>

                    {isMasterUser && (
                      <button
                        onClick={() => {
                          setSelectedCompanyId(null);
                          setActiveTab('overview');
                          setShowCompanyMenu(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold transition-all ${
                          selectedCompanyId === null
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-indigo-500" />
                          <span>Visão Geral Consolidada (8 Empresas)</span>
                        </div>
                      </button>
                    )}

                    {isMasterUser && <div className="my-1 border-t border-slate-100 dark:border-slate-800" />}

                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                      <span>Empresas Liberadas ({allowedCompanies.length})</span>
                      {isMasterUser && (
                        <button
                          onClick={() => {
                            setActiveTab('companies-manage');
                            setShowCompanyMenu(false);
                          }}
                          className="text-indigo-600 hover:underline"
                        >
                          Gerenciar
                        </button>
                      )}
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-1">
                      {allowedCompanies.length === 0 ? (
                        <div className="px-3 py-3 text-center text-slate-400 text-[11px]">
                          Nenhuma empresa disponível.
                        </div>
                      ) : (
                        allowedCompanies.map((c, i) => (
                          <button
                            key={c.id}
                            onClick={() => {
                              setSelectedCompanyId(c.id);
                              setActiveTab('company-detail');
                              setShowCompanyMenu(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all ${
                              selectedCompanyId === c.id
                                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold'
                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              <span
                                className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] text-white font-bold shrink-0"
                                style={{ backgroundColor: c.color || '#4f46e5' }}
                              >
                                {i + 1}
                              </span>
                              <span className="truncate">{c.name}</span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Center Search */}
          <div className="hidden md:flex items-center flex-1 max-w-xs mx-4">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar vendas, itens, despesas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Action Button (+ Lançar) */}
            <button
              id="btn-quick-action-header"
              onClick={() => openQuickAction()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-transform active:scale-95 touch-manipulation cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nova Movimentação</span>
              <span className="sm:hidden">Lançar</span>
            </button>

            {/* User Profile & Role Indicator */}
            <div className="relative">
              <button
                id="btn-user-profile"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <div className={`w-8 h-8 rounded-xl font-bold flex items-center justify-center text-xs border ${
                  isMasterUser
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}>
                  {isMasterUser ? <ShieldCheck className="w-4 h-4" /> : user.name.charAt(0) || 'U'}
                </div>
              </button>

              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                  <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 z-50 p-3 text-xs animate-fade-in">
                    <div className="border-b border-slate-100 dark:border-slate-800 pb-2.5 mb-2">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <p className="font-bold text-slate-900 dark:text-white truncate">{user.name}</p>
                        {isMasterUser ? (
                          <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        ) : (
                          <ShieldAlert className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                      
                      <div className="mt-2">
                        {isMasterUser ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-[10px]">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Administrador Master</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[10px]">
                            <span>{user.role}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      {isMasterUser && (
                        <button
                          onClick={() => {
                            setActiveTab('users');
                            setShowUserMenu(false);
                          }}
                          className="w-full text-left px-2.5 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium flex items-center gap-2 cursor-pointer"
                        >
                          <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Gestão de Usuários & Acessos</span>
                        </button>
                      )}

                      {isMasterUser && (
                        <button
                          onClick={() => {
                            setActiveTab('database-settings');
                            setShowUserMenu(false);
                          }}
                          className="w-full text-left px-2.5 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium flex items-center gap-2 cursor-pointer"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Banco de Dados & Supabase</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          onOpenLogin();
                          setShowUserMenu(false);
                        }}
                        className="w-full text-left px-2.5 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium flex items-center gap-2 cursor-pointer"
                      >
                        <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                        <span>Gerenciar Sessão / Trocar Usuário</span>
                      </button>

                      <div className="pt-1 mt-1 border-t border-slate-100 dark:border-slate-800">
                        <button
                          onClick={() => {
                            logout();
                            setShowUserMenu(false);
                          }}
                          className="w-full text-left px-2.5 py-2 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-medium flex items-center gap-2 cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5 text-rose-500" />
                          <span>Sair da Conta (Logout)</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
    </>
  );
};
