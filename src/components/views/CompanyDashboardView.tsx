import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { calculateMetrics } from '../../lib/metrics';
import { MetricCard } from '../MetricCard';
import { PeriodSelector } from '../PeriodSelector';
import { formatCurrency, formatDate } from '../../lib/utils';
import {
  Building2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingBag,
  ArrowUpRight,
  ArrowDownLeft,
  AlertTriangle,
  Clock,
  ArrowLeft,
  Boxes,
  Plus,
  BarChart3,
  Calendar,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

export const CompanyDashboardView: React.FC = () => {
  const {
    data,
    selectedCompanyId,
    setSelectedCompanyId,
    setActiveTab,
    periodFilter,
    customDateRange,
    openQuickAction,
    isMasterUser,
    allowedCompanies,
  } = useApp();

  const [activeChartTab, setActiveChartTab] = useState<'financas' | 'vendas'>('financas');

  const targetCompanyId = selectedCompanyId || (!isMasterUser && allowedCompanies[0]?.id) || null;
  const company = data.companies.find((c) => c.id === targetCompanyId);

  if (!company) {
    return (
      <div className="text-center py-16">
        <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">
          Nenhuma empresa selecionada
        </h2>
        <p className="text-xs text-slate-500 mt-1 mb-4">
          {isMasterUser
            ? 'Selecione uma empresa na Visão Geral para abrir seu painel individual.'
            : 'Sua conta ainda não possui empresa vinculada ou autorizada.'}
        </p>
        {isMasterUser && (
          <button
            onClick={() => {
              setSelectedCompanyId(null);
              setActiveTab('overview');
            }}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs cursor-pointer"
          >
            Voltar para Visão Geral
          </button>
        )}
      </div>
    );
  }

  // Calculate metrics strictly for this company
  const metrics = calculateMetrics(data, company.id, periodFilter, customDateRange);

  // Products with low stock for this company
  const lowStockProducts = data.products.filter(
    (p) => p.company_id === company.id && Number(p.quantity) <= Number(p.min_quantity)
  );

  // Recent activities for this company (Combined sales, expenses, stock movements)
  const recentSales = metrics.salesList.slice(0, 5).map((s) => ({
    id: s.id,
    type: 'venda',
    title: `Venda: ${s.product_service}`,
    subtitle: `Cliente: ${s.customer_name} • ${s.payment_method}`,
    amount: s.total_amount,
    date: s.date,
    isPositive: true,
  }));

  const recentExpenses = metrics.expensesList.slice(0, 5).map((e) => ({
    id: e.id,
    type: 'despesa',
    title: `Despesa: ${e.description}`,
    subtitle: `Cat: ${e.category} • ${e.supplier_name || 'Diversos'}`,
    amount: e.amount,
    date: e.date,
    isPositive: false,
  }));

  const combinedActivities = [...recentSales, ...recentExpenses]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8);

  return (
    <div className="space-y-6 animate-fade-in pb-16 lg:pb-8">
      {/* Top Banner with Company Info & Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3.5">
          {isMasterUser && (
            <button
              onClick={() => {
                setSelectedCompanyId(null);
                setActiveTab('overview');
              }}
              className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="Voltar para todas as empresas"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-xs shrink-0"
            style={{ backgroundColor: company.color || '#4f46e5' }}
          >
            <Building2 className="w-6 h-6" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {company.name}
              </h1>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                  company.status === 'active'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {company.status === 'active' ? 'Ativa' : 'Inativa'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {company.trade_name || company.category || 'Painel de Gestão Exclusivo'} • CNPJ:{' '}
              {company.cnpj || 'Não informado'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => openQuickAction()}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-transform active:scale-95 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Lançar nesta Empresa</span>
          </button>
        </div>
      </div>

      {/* Period Filter Bar */}
      <div className="flex items-center justify-between">
        <PeriodSelector />
      </div>

      {/* Metric Cards (Faturamento, Despesas, Lucro, Vendas, Contas a Pagar, Contas a Receber, Estoque Baixo) */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3 sm:gap-4">
        {/* 1. Faturamento */}
        <MetricCard
          title="Faturamento"
          value={metrics.totalRevenue}
          icon={TrendingUp}
          colorScheme="indigo"
          subtitle="Total de vendas"
        />

        {/* 2. Despesas */}
        <MetricCard
          title="Despesas"
          value={metrics.totalExpenses}
          icon={TrendingDown}
          colorScheme="rose"
          subtitle="Custos operacionais"
        />

        {/* 3. Lucro */}
        <MetricCard
          title="Lucro Líquido"
          value={metrics.estimatedProfit}
          icon={DollarSign}
          colorScheme={metrics.estimatedProfit >= 0 ? 'emerald' : 'rose'}
          subtitle={
            metrics.totalRevenue > 0
              ? `Margem: ${((metrics.estimatedProfit / metrics.totalRevenue) * 100).toFixed(1)}%`
              : 'Sem receita'
          }
        />

        {/* 4. Vendas */}
        <MetricCard
          title="Vendas"
          value={metrics.totalSalesCount}
          isCurrency={false}
          icon={ShoppingBag}
          colorScheme="cyan"
          subtitle="Pedidos concluídos"
        />

        {/* 5. Contas a Pagar */}
        <MetricCard
          title="Contas a Pagar"
          value={metrics.totalPayablesPending}
          icon={ArrowUpRight}
          colorScheme="amber"
          subtitle="Compromissos"
          onClick={() => setActiveTab('accounts-payable')}
        />

        {/* 6. Contas a Receber */}
        <MetricCard
          title="Contas a Receber"
          value={metrics.totalReceivablesPending}
          icon={ArrowDownLeft}
          colorScheme="slate"
          subtitle="Valores pendentes"
          onClick={() => setActiveTab('accounts-receivable')}
        />

        {/* 7. Estoque Baixo */}
        <MetricCard
          title="Estoque Baixo"
          value={metrics.lowStockCount}
          isCurrency={false}
          icon={Boxes}
          colorScheme={metrics.lowStockCount > 0 ? 'rose' : 'slate'}
          subtitle={metrics.lowStockCount > 0 ? 'Requer reposição!' : 'Nenhum alerta'}
          onClick={() => setActiveTab('inventory')}
        />
      </div>

      {/* Main Charts & Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Interactive Financial & Sales Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Desempenho da {company.name}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Acompanhamento gráfico no período filtrado
              </p>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setActiveChartTab('financas')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeChartTab === 'financas'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Faturamento & Lucro
              </button>
              <button
                onClick={() => setActiveChartTab('vendas')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeChartTab === 'vendas'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Despesas & Custos
              </button>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {activeChartTab === 'financas' ? (
                <AreaChart
                  data={metrics.chartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="compFaturamento" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="compLucro" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(v) => `R$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`}
                  />
                  <Tooltip
                    formatter={(val: any) => [formatCurrency(Number(val) || 0), '']}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '12px',
                      border: 'none',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="faturamento"
                    name="Faturamento"
                    stroke="#4f46e5"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#compFaturamento)"
                  />
                  <Area
                    type="monotone"
                    dataKey="lucro"
                    name="Lucro"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#compLucro)"
                  />
                </AreaChart>
              ) : (
                <BarChart
                  data={metrics.chartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(v) => `R$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`}
                  />
                  <Tooltip
                    formatter={(val: any) => [formatCurrency(Number(val) || 0), '']}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '12px',
                      border: 'none',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Bar
                    dataKey="despesas"
                    name="Despesas"
                    fill="#f43f5e"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Low Stock Alert & Recent Activities (1 col) */}
        <div className="space-y-6">
          {/* Low Stock Widget */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                  Alerta de Estoque Baixo
                </h3>
              </div>
              <button
                onClick={() => setActiveTab('inventory')}
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >
                Ver Estoque
              </button>
            </div>

            {lowStockProducts.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center">
                Todos os produtos com estoque regular.
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {lowStockProducts.map((p) => (
                  <div
                    key={p.id}
                    className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 flex items-center justify-between text-xs"
                  >
                    <div className="truncate mr-2">
                      <span className="font-bold text-slate-900 dark:text-white block truncate">
                        {p.name}
                      </span>
                      <span className="text-[10px] text-slate-500">Mín: {p.min_quantity} un</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white font-bold text-[11px] shrink-0">
                      {p.quantity} un
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity Feed */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-500" />
                <h3 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                  Atividades Recentes
                </h3>
              </div>
            </div>

            {combinedActivities.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                Nenhuma movimentação registrada no período.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {combinedActivities.map((act) => (
                  <div
                    key={act.id}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="truncate mr-2">
                      <span className="font-semibold text-slate-900 dark:text-white block truncate">
                        {act.title}
                      </span>
                      <span className="text-[10px] text-slate-400 block truncate">
                        {act.subtitle}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className={`font-bold block ${
                          act.isPositive
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {act.isPositive ? '+' : '-'} {formatCurrency(act.amount)}
                      </span>
                      <span className="text-[10px] text-slate-400">{formatDate(act.date)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
