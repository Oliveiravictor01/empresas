import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ActiveTab } from '../types';
import {
  LayoutDashboard,
  Building2,
  Plus,
  BarChart3,
  Menu,
  X,
  ShoppingBag,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  Boxes,
  Users,
  Truck,
  CheckSquare,
  Scale,
  Database,
  UserCheck,
  History,
  LogOut,
  ShieldCheck,
  HardDrive,
} from 'lucide-react';

export const BottomNav: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    setSelectedCompanyId,
    openQuickAction,
    data,
    canAccessTab,
    user,
    logout,
    isMasterUser,
    allowedCompanies,
  } = useApp();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = React.useRef(0);

  React.useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY || document.documentElement.scrollTop || 0;
      
      // Sempre visível no topo da página
      if (currentScrollY <= 40) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY.current + 8) {
        // Rolando para BAIXO -> Esconde a barra de funções no mobile
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY.current - 8) {
        // Rolando para CIMA -> Mostra a barra de funções
        setIsVisible(true);
      }
      
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const allMenuItems: { id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'sales', label: 'Vendas', icon: ShoppingBag },
    { id: 'expenses', label: 'Despesas', icon: TrendingDown },
    { id: 'accounts-payable', label: 'Contas a Pagar', icon: ArrowUpRight },
    { id: 'accounts-receivable', label: 'Contas a Receber', icon: ArrowDownLeft },
    { id: 'inventory', label: 'Estoque & Produtos', icon: Boxes },
    { id: 'customers', label: 'Clientes', icon: Users },
    { id: 'suppliers', label: 'Fornecedores', icon: Truck },
    { id: 'tasks', label: 'Tarefas & Prazos', icon: CheckSquare },
    { id: 'comparison', label: 'Matriz Comparativa', icon: Scale },
    { id: 'users', label: 'Usuários', icon: Users },
    { id: 'activity-logs', label: 'Histórico & Logs', icon: History },
    { id: 'google-drive', label: 'Google Drive & Backup', icon: HardDrive },
    { id: 'database-settings', label: 'Banco & Supabase', icon: Database },
  ];

  const menuItems = allMenuItems.filter((item) => canAccessTab(item.id));

  return (
    <>
      {/* Mobile Drawer Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl p-5 border-t border-slate-200 dark:border-slate-800 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <span className="font-bold text-slate-900 dark:text-white text-sm">
                Todos os Módulos de Gestão
              </span>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMenuOpen(false);
                    }}
                    className={`flex items-center gap-2.5 p-3 rounded-xl text-left text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold'
                        : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-indigo-500" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* User Session & Logout in Mobile Drawer */}
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 truncate">
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="truncate">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {user?.name || 'Usuário'}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                    <span className="font-semibold text-indigo-600">{user?.role || 'OPERADOR'}</span>
                    <span>•</span>
                    <span>{user?.email}</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  logout();
                }}
                className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 hover:bg-rose-100 text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Bar */}
      <nav
        id="mobile-bottom-navigation"
        className={`fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 lg:hidden px-2 py-1.5 safe-area-pb transition-transform duration-300 ease-in-out ${
          isVisible ? 'translate-y-0' : 'translate-y-full pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-around">
          {/* 1. Início */}
          <button
            id="bottom-nav-overview"
            onClick={() => {
              if (isMasterUser) {
                setActiveTab('overview');
                setSelectedCompanyId(null);
              } else {
                if (allowedCompanies.length > 0) {
                  setSelectedCompanyId(allowedCompanies[0].id);
                }
                setActiveTab('company-detail');
              }
            }}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
              (isMasterUser && activeTab === 'overview') || (!isMasterUser && activeTab === 'company-detail')
                ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Início</span>
          </button>

          {/* 2. Empresas (Master: Minhas 8 Empresas / Não-Master: Painel Empresa) */}
          <button
            id="bottom-nav-companies"
            onClick={() => {
              if (isMasterUser) {
                setActiveTab('companies-manage');
              } else {
                if (allowedCompanies.length > 0) {
                  setSelectedCompanyId(allowedCompanies[0].id);
                }
                setActiveTab('company-detail');
              }
            }}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
              (isMasterUser && (activeTab === 'companies-manage' || activeTab === 'company-detail')) ||
              (!isMasterUser && activeTab === 'company-detail')
                ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Building2 className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">{isMasterUser ? 'Empresas' : 'Empresa'}</span>
          </button>

          {/* 3. Central Big Action Button: + Lançar */}
          <button
            id="bottom-nav-quick-action"
            onClick={() => openQuickAction()}
            className="flex flex-col items-center justify-center -top-3 relative group"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 group-active:scale-90 transition-transform">
              <Plus className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              Lançar
            </span>
          </button>

          {/* 4. Relatórios */}
          <button
            id="bottom-nav-reports"
            onClick={() => setActiveTab('reports')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
              activeTab === 'reports'
                ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Relatórios</span>
          </button>

          {/* 5. Menu Completo */}
          <button
            id="bottom-nav-more"
            onClick={() => setIsMenuOpen(true)}
            className="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-slate-500 dark:text-slate-400"
          >
            <Menu className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Menu</span>
          </button>
        </div>
      </nav>
    </>
  );
};
