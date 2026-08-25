import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { getCompanySummaries } from '../../lib/metrics';
import { PeriodSelector } from '../PeriodSelector';
import { formatCurrency } from '../../lib/utils';
import {
  Scale,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingBag,
  ArrowUpDown,
  Trophy,
  Building2,
  ExternalLink,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

type SortOption = 'faturamento' | 'lucro' | 'vendas' | 'menorDespesa';

export const ComparisonMatrixView: React.FC = () => {
  const {
    data,
    periodFilter,
    customDateRange,
    setSelectedCompanyId,
    setActiveTab,
  } = useApp();

  const [sortBy, setSortBy] = useState<SortOption>('faturamento');

  const summaries = getCompanySummaries(data, periodFilter, customDateRange);

  // Sorted list
  const sortedSummaries = [...summaries].sort((a, b) => {
    if (sortBy === 'faturamento') return b.faturamento - a.faturamento;
    if (sortBy === 'lucro') return b.lucro - a.lucro;
    if (sortBy === 'vendas') return b.vendasCount - a.vendasCount;
    if (sortBy === 'menorDespesa') return a.despesas - b.despesas;
    return 0;
  });

  // Chart data
  const chartData = sortedSummaries.map((s) => ({
    name: s.company.name.length > 14 ? s.company.name.slice(0, 14) + '...' : s.company.name,
    faturamento: s.faturamento,
    despesas: s.despesas,
    lucro: s.lucro,
  }));

  return (
    <div className="space-y-6 animate-fade-in pb-16 lg:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Matriz Comparativa das 8 Empresas
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
              {data.companies.length} empresas
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Compare o faturamento, lucro, margens e desempenho lado a lado
          </p>
        </div>

        <PeriodSelector />
      </div>

      {/* Sorting Control Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
          <ArrowUpDown className="w-4 h-4 text-indigo-600" />
          <span>Classificar empresas por:</span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
          <button
            onClick={() => setSortBy('faturamento')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              sortBy === 'faturamento'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            Maior Faturamento
          </button>
          <button
            onClick={() => setSortBy('lucro')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              sortBy === 'lucro'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            Maior Lucro
          </button>
          <button
            onClick={() => setSortBy('vendas')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              sortBy === 'vendas'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            Mais Vendas
          </button>
          <button
            onClick={() => setSortBy('menorDespesa')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              sortBy === 'menorDespesa'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            Menor Despesa
          </button>
        </div>
      </div>

      {/* Comparative Bar Chart */}
      {summaries.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
            Comparativo Visual: Faturamento vs Lucro vs Despesas
          </h3>
          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
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
                <Legend />
                <Bar dataKey="faturamento" name="Faturamento" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                <Bar dataKey="despesas" name="Despesas" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="lucro" name="Lucro" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Side-by-side Detailed Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {sortedSummaries.map((s, index) => {
          const margin = s.faturamento > 0 ? (s.lucro / s.faturamento) * 100 : 0;
          const ticketMedio = s.vendasCount > 0 ? s.faturamento / s.vendasCount : 0;

          return (
            <div
              key={s.company.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex flex-col justify-between relative overflow-hidden"
            >
              {/* Ranking badge */}
              <div className="absolute top-4 right-4 flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                {index === 0 && <Trophy className="w-3.5 h-3.5 text-amber-500" />}
                <span>#{index + 1}</span>
              </div>

              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold text-sm shadow-xs"
                    style={{ backgroundColor: s.company.color || '#4f46e5' }}
                  >
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1">
                      {s.company.name}
                    </h3>
                    <span className="text-[11px] text-slate-400 block truncate">
                      {s.company.category || 'Geral'}
                    </span>
                  </div>
                </div>

                {/* Metrics Table */}
                <div className="space-y-2.5 text-xs py-2 border-y border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">
                      Faturamento:
                    </span>
                    <strong className="text-slate-900 dark:text-white font-bold">
                      {formatCurrency(s.faturamento)}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Despesas:</span>
                    <strong className="text-rose-600 dark:text-rose-400 font-bold">
                      {formatCurrency(s.despesas)}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">
                      Lucro Líquido:
                    </span>
                    <strong
                      className={`font-black ${
                        s.lucro >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {formatCurrency(s.lucro)}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">
                      Margem de Lucro:
                    </span>
                    <span
                      className={`font-bold px-1.5 py-0.5 rounded-md text-[11px] ${
                        margin >= 20
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : margin >= 0
                          ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {margin.toFixed(1)}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">
                      Ticket Médio:
                    </span>
                    <strong className="text-slate-700 dark:text-slate-300 font-semibold">
                      {formatCurrency(ticketMedio)}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">
                      Vendas Realizadas:
                    </span>
                    <span className="font-bold text-cyan-600 dark:text-cyan-400">
                      {s.vendasCount} vendas
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedCompanyId(s.company.id);
                  setActiveTab('company-detail');
                }}
                className="mt-4 w-full py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white dark:bg-indigo-950/60 dark:hover:bg-indigo-600 dark:text-indigo-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <span>Acessar Painel</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
