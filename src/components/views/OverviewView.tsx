import React from 'react';
import { useApp } from '../../context/AppContext';
import { calculateMetrics, getCompanySummaries } from '../../lib/metrics';
import { MetricCard } from '../MetricCard';
import { CompanyCard } from '../CompanyCard';
import { PeriodSelector } from '../PeriodSelector';
import { formatCurrency } from '../../lib/utils';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingBag,
  ArrowUpRight,
  ArrowDownLeft,
  Building2,
  Plus,
  BarChart2,
  Sparkles,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

export const OverviewView: React.FC = () => {
  const {
    data,
    periodFilter,
    customDateRange,
    setSelectedCompanyId,
    setActiveTab,
    allowedCompanies,
    isMasterUser,
  } = useApp();

  const allowedCompanyIds = allowedCompanies.map((c) => c.id);

  // Metrics across all permitted companies consolidated
  const metrics = calculateMetrics(data, null, periodFilter, customDateRange, allowedCompanyIds);
  const companySummaries = getCompanySummaries(data, periodFilter, customDateRange, allowedCompanies);

  const handleEnterCompany = (companyId: string) => {
    setSelectedCompanyId(companyId);
    setActiveTab('company-detail');
  };

  const totalCountLabel = isMasterUser
    ? `${data.companies.length} de 8 empresas cadastradas no seu ecossistema`
    : `${allowedCompanies.length} ${allowedCompanies.length === 1 ? 'empresa vinculada' : 'empresas vinculadas'} ao seu perfil`;

  return (
    <div className="space-y-6 animate-fade-in pb-16 lg:pb-8">
      {/* Header with Title and Period Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Visão Geral
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              {isMasterUser ? `Consolidado (${data.companies.length} Empresas)` : `Minhas Empresas (${allowedCompanies.length})`}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Resultados consolidados em tempo real com gestão individual por empresa
          </p>
        </div>

        <div className="w-full md:w-auto">
          <PeriodSelector />
        </div>
      </div>

      {/* Metric Cards Grid (Faturamento, Despesas, Lucro, Vendas, Contas a Pagar, Contas a Receber) */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {/* 1. Faturamento Total */}
        <MetricCard
          id="metric-total-revenue"
          title="Faturamento Total"
          value={metrics.totalRevenue}
          icon={TrendingUp}
          colorScheme="indigo"
          subtitle={`${metrics.totalSalesCount} vendas no período`}
        />

        {/* 2. Despesas Totais */}
        <MetricCard
          id="metric-total-expenses"
          title="Despesas Totais"
          value={metrics.totalExpenses}
          icon={TrendingDown}
          colorScheme="rose"
          subtitle={`${metrics.expensesList.length} lançamentos`}
        />

        {/* 3. Lucro Estimado */}
        <MetricCard
          id="metric-estimated-profit"
          title="Lucro Estimado"
          value={metrics.estimatedProfit}
          icon={DollarSign}
          colorScheme={metrics.estimatedProfit >= 0 ? 'emerald' : 'rose'}
          subtitle={
            metrics.totalRevenue > 0
              ? `Margem: ${((metrics.estimatedProfit / metrics.totalRevenue) * 100).toFixed(1)}%`
              : 'Sem faturamento'
          }
        />

        {/* 4. Vendas Realizadas */}
        <MetricCard
          id="metric-sales-count"
          title="Vendas Realizadas"
          value={metrics.totalSalesCount}
          isCurrency={false}
          icon={ShoppingBag}
          colorScheme="cyan"
          subtitle="Nas empresas permitidas"
        />

        {/* 5. Contas a Pagar */}
        <MetricCard
          id="metric-accounts-payable"
          title="Contas a Pagar"
          value={metrics.totalPayablesPending}
          icon={ArrowUpRight}
          colorScheme="amber"
          subtitle="Pendentes / Vencendo"
          onClick={() => setActiveTab('accounts-payable')}
        />

        {/* 6. Contas a Receber */}
        <MetricCard
          id="metric-accounts-receivable"
          title="Contas a Receber"
          value={metrics.totalReceivablesPending}
          icon={ArrowDownLeft}
          colorScheme="slate"
          subtitle="A receber de clientes"
          onClick={() => setActiveTab('accounts-receivable')}
        />
      </div>

      {/* Faturamento e Despesas Chart Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Evolução Financeira Consolidada
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Faturamento vs Despesas no período selecionado
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-indigo-600" />
              <span className="text-slate-600 dark:text-slate-300">Faturamento</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500" />
              <span className="text-slate-600 dark:text-slate-300">Despesas</span>
            </div>
          </div>
        </div>

        <div className="h-64 sm:h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={metrics.chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorFaturamento" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorDespesas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
              <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                tickFormatter={(val) => `R$${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`}
              />
              <Tooltip
                formatter={(val: any) => [formatCurrency(Number(val) || 0), '']}
                labelFormatter={(label) => `Data: ${label}`}
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
                fill="url(#colorFaturamento)"
              />
              <Area
                type="monotone"
                dataKey="despesas"
                name="Despesas"
                stroke="#f43f5e"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorDespesas)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Minhas Empresas Section */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {isMasterUser ? 'Minhas Empresas' : 'Empresas Autorizadas'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {totalCountLabel}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {allowedCompanies.length > 1 && (
              <button
                onClick={() => setActiveTab('comparison')}
                className="hidden sm:inline-flex px-3 py-2 rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors"
              >
                Ver Tabela Comparativa
              </button>
            )}
            {isMasterUser && (
              <button
                id="btn-cadastrar-empresa-overview"
                onClick={() => setActiveTab('companies-manage')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Gerenciar / Adicionar</span>
              </button>
            )}
          </div>
        </div>

        {/* Empty State */}
        {allowedCompanies.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
              <Building2 className="w-8 h-8" />
            </div>
            <div className="max-w-md mx-auto">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isMasterUser ? 'Nenhuma empresa cadastrada ainda' : 'Nenhuma empresa vinculada ao seu usuário'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {isMasterUser
                  ? 'Cadastre cada uma das suas 8 empresas com CNPJ, razão social e cor personalizada para iniciar a gestão.'
                  : 'Solicite ao Administrador Master que vincule uma ou mais empresas à sua conta para liberar seu acesso operacional.'}
              </p>
            </div>
            {isMasterUser && (
              <div className="flex items-center justify-center pt-2">
                <button
                  onClick={() => setActiveTab('companies-manage')}
                  className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-colors"
                >
                  + Cadastrar Primeira Empresa
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {companySummaries.map((summary, index) => (
              <CompanyCard
                key={summary.company.id}
                company={summary.company}
                faturamento={summary.faturamento}
                despesas={summary.despesas}
                lucro={summary.lucro}
                vendasCount={summary.vendasCount}
                onEnter={handleEnterCompany}
                index={index}
              />
            ))}

            {/* Empty slots placeholders if master and less than 8 companies */}
            {isMasterUser &&
              Array.from({ length: Math.max(0, 8 - data.companies.length) }).map((_, i) => (
                <div
                  key={`empty-slot-${i}`}
                  onClick={() => setActiveTab('companies-manage')}
                  className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:bg-indigo-50/30 group min-h-[220px]"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 flex items-center justify-center mb-2 transition-colors">
                    <Plus className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 group-hover:text-indigo-600 transition-colors">
                    Empresa {data.companies.length + i + 1}
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5">
                    Slot disponível para cadastro
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};
