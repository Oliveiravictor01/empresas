import React from 'react';
import { useApp } from '../context/AppContext';
import { ActiveTab } from '../types';
import {
  LayoutDashboard,
  Building2,
  ShoppingBag,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  Boxes,
  Package,
  Users,
  Truck,
  CheckSquare,
  BarChart3,
  Scale,
  Database,
  PlusCircle,
  ChevronRight,
  AlertTriangle,
  UserCheck,
  ShieldCheck,
  History,
  HardDrive,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    selectedCompanyId,
    setSelectedCompanyId,
    data,
    users,
    openQuickAction,
    canAccessTab,
    isMasterUser,
  } = useApp();

  const lowStockTotal = data.products.filter(
    (p) => p.track_stock && Number(p.quantity) <= Number(p.min_quantity)
  ).length;

  const pendingPayablesTotal = data.accountsPayable.filter(
    (p) => p.status === 'Pendente' || p.status === 'Vencido'
  ).length;

  const allNavItems: {
    id: ActiveTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | string;
    badgeColor?: string;
  }[] = isMasterUser
    ? [
        {
          id: 'overview',
          label: 'Visão Geral (8 Empresas)',
          icon: LayoutDashboard,
        },
        {
          id: 'companies-manage',
          label: 'Minhas 8 Empresas',
          icon: Building2,
          badge: `${data.companies.length}/8`,
          badgeColor: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
        },
        {
          id: 'comparison',
          label: 'Matriz Comparativa',
          icon: Scale,
        },
        {
          id: 'sales',
          label: 'Vendas & Faturamento',
          icon: ShoppingBag,
          badge: data.sales.length > 0 ? data.sales.length : undefined,
        },
        {
          id: 'products-services',
          label: 'Produtos & Serviços',
          icon: Package,
          badge: data.products.length > 0 ? data.products.length : undefined,
        },
        {
          id: 'inventory',
          label: 'Controle de Estoque',
          icon: Boxes,
          badge: lowStockTotal > 0 ? `${lowStockTotal} alerta` : undefined,
          badgeColor: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
        },
        {
          id: 'expenses',
          label: 'Despesas & Custos',
          icon: TrendingDown,
        },
        {
          id: 'accounts-payable',
          label: 'Contas a Pagar',
          icon: ArrowUpRight,
          badge: pendingPayablesTotal > 0 ? pendingPayablesTotal : undefined,
          badgeColor: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
        },
        {
          id: 'accounts-receivable',
          label: 'Contas a Receber',
          icon: ArrowDownLeft,
        },
        {
          id: 'customers',
          label: 'Clientes',
          icon: Users,
        },
        {
          id: 'suppliers',
          label: 'Fornecedores',
          icon: Truck,
        },
        {
          id: 'tasks',
          label: 'Tarefas & Prazos',
          icon: CheckSquare,
          badge: data.tasks.filter((t) => t.status !== 'Concluída').length || undefined,
        },
        {
          id: 'reports',
          label: 'Relatórios & DRE',
          icon: BarChart3,
        },
        {
          id: 'users',
          label: 'Usuários & Permissões',
          icon: UserCheck,
          badge: users.length > 0 ? users.length : undefined,
          badgeColor: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
        },
        {
          id: 'activity-logs',
          label: 'Histórico & Auditoria',
          icon: History,
        },
        {
          id: 'google-drive',
          label: 'Google Drive & Backup',
          icon: HardDrive,
          badge: 'Nuvem',
          badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
        },
        {
          id: 'database-settings',
          label: 'Banco & Supabase',
          icon: Database,
        },
      ]
    : [
        {
          id: 'company-detail',
          label: 'Painel da Empresa',
          icon: LayoutDashboard,
        },
        {
          id: 'sales',
          label: 'Vendas & Faturamento',
          icon: ShoppingBag,
          badge: data.sales.length > 0 ? data.sales.length : undefined,
        },
        {
          id: 'products-services',
          label: 'Produtos & Serviços',
          icon: Package,
          badge: data.products.length > 0 ? data.products.length : undefined,
        },
        {
          id: 'inventory',
          label: 'Controle de Estoque',
          icon: Boxes,
          badge: lowStockTotal > 0 ? `${lowStockTotal} alerta` : undefined,
          badgeColor: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
        },
        {
          id: 'expenses',
          label: 'Despesas & Custos',
          icon: TrendingDown,
        },
        {
          id: 'accounts-payable',
          label: 'Contas a Pagar',
          icon: ArrowUpRight,
          badge: pendingPayablesTotal > 0 ? pendingPayablesTotal : undefined,
          badgeColor: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
        },
        {
          id: 'accounts-receivable',
          label: 'Contas a Receber',
          icon: ArrowDownLeft,
        },
        {
          id: 'customers',
          label: 'Clientes',
          icon: Users,
        },
        {
          id: 'suppliers',
          label: 'Fornecedores',
          icon: Truck,
        },
        {
          id: 'tasks',
          label: 'Tarefas & Prazos',
          icon: CheckSquare,
          badge: data.tasks.filter((t) => t.status !== 'Concluída').length || undefined,
        },
        {
          id: 'reports',
          label: 'Relatórios da Empresa',
          icon: BarChart3,
        },
      ];

  // Filter items based on user permissions
  const navItems = allNavItems.filter((item) => canAccessTab(item.id));

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4 min-h-[calc(100vh-4rem)]">
      {/* Quick Action Button in Sidebar */}
      <button
        id="btn-sidebar-quick-action"
        onClick={() => openQuickAction()}
        className="w-full mb-4 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 touch-manipulation"
      >
        <PlusCircle className="w-4 h-4" />
        <span>+ NOVA MOVIMENTAÇÃO</span>
      </button>

      {/* Navigation List */}
      <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`sidebar-nav-${item.id}`}
              onClick={() => {
                setActiveTab(item.id);
                if (item.id === 'overview' && isMasterUser) {
                  setSelectedCompanyId(null);
                }
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    item.badgeColor || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Quick Status Box */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
        <div className="flex items-center justify-between font-semibold">
          <span>{isMasterUser ? 'Sistema Multiempresa' : 'Acesso Operacional'}</span>
          <span className="text-emerald-600 font-bold">
            {isMasterUser ? `${data.companies.length} ativas` : 'Autorizado'}
          </span>
        </div>
        <p className="mt-1 text-[10px] text-slate-400">
          {isMasterUser
            ? 'Controle centralizado de até 8 empresas e segmentos.'
            : 'Visualização restrita à empresa autorizada.'}
        </p>
      </div>
    </aside>
  );
};
