import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { calculateMetrics, getCompanySummaries } from '../../lib/metrics';
import { PeriodSelector } from '../PeriodSelector';
import { formatCurrency, formatDate } from '../../lib/utils';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  Printer,
  Building2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart as PieIcon,
  Users,
  Boxes,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b'];

export const ReportsView: React.FC = () => {
  const {
    data,
    selectedCompanyId,
    setSelectedCompanyId,
    periodFilter,
    customDateRange,
    isMasterUser,
    allowedCompanies,
  } = useApp();

  const [filterCompany, setFilterCompany] = useState<string>(() => {
    if (isMasterUser) {
      return selectedCompanyId || 'all';
    }
    return selectedCompanyId || allowedCompanies[0]?.id || '';
  });
  const [reportType, setReportType] = useState<'geral' | 'dre' | 'produtos' | 'clientes' | 'despesas'>('geral');

  // Enforce company isolation: non-master cannot query 'all'
  const effectiveCompanyId = (isMasterUser && filterCompany === 'all')
    ? null
    : (filterCompany || allowedCompanies[0]?.id || null);

  const metrics = calculateMetrics(data, effectiveCompanyId, periodFilter, customDateRange);
  const rawCompanySummaries = getCompanySummaries(data, periodFilter, customDateRange);
  const companySummaries = isMasterUser
    ? (filterCompany === 'all' ? rawCompanySummaries : rawCompanySummaries.filter(c => c.company.id === filterCompany))
    : rawCompanySummaries.filter(c => allowedCompanies.some(ac => ac.id === c.company.id) && (filterCompany ? c.company.id === filterCompany : true));

  // Top Selling Products
  const productSalesMap: Record<string, { name: string; qty: number; total: number }> = {};
  metrics.salesList.forEach((s) => {
    if (!productSalesMap[s.product_service]) {
      productSalesMap[s.product_service] = { name: s.product_service, qty: 0, total: 0 };
    }
    productSalesMap[s.product_service].qty += Number(s.quantity);
    productSalesMap[s.product_service].total += Number(s.total_amount);
  });
  const topProducts = Object.values(productSalesMap).sort((a, b) => b.total - a.total);

  // Top Customers
  const customerSalesMap: Record<string, { name: string; count: number; total: number }> = {};
  metrics.salesList.forEach((s) => {
    if (!customerSalesMap[s.customer_name]) {
      customerSalesMap[s.customer_name] = { name: s.customer_name, count: 0, total: 0 };
    }
    customerSalesMap[s.customer_name].count += 1;
    customerSalesMap[s.customer_name].total += Number(s.total_amount);
  });
  const topCustomers = Object.values(customerSalesMap).sort((a, b) => b.total - a.total);

  // Expenses by Category
  const expenseCategoryMap: Record<string, number> = {};
  metrics.expensesList.forEach((e) => {
    expenseCategoryMap[e.category] = (expenseCategoryMap[e.category] || 0) + Number(e.amount);
  });
  const expensePieData = Object.entries(expenseCategoryMap).map(([name, value]) => ({
    name,
    value,
  }));

  // CSV Export Function
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';

    if (reportType === 'geral' || reportType === 'dre') {
      csvContent += 'Empresa,Faturamento,Despesas,Lucro Líquido,Margem %\n';
      companySummaries.forEach((c) => {
        const margin = c.faturamento > 0 ? (c.lucro / c.faturamento) * 100 : 0;
        csvContent += `"${c.company.name}",${c.faturamento},${c.despesas},${c.lucro},${margin.toFixed(1)}%\n`;
      });
    } else if (reportType === 'produtos') {
      csvContent += 'Produto/Serviço,Quantidade Vendida,Faturamento Total\n';
      topProducts.forEach((p) => {
        csvContent += `"${p.name}",${p.qty},${p.total}\n`;
      });
    } else if (reportType === 'clientes') {
      csvContent += 'Cliente,Quantidade de Compras,Total Gasto\n';
      topCustomers.forEach((c) => {
        csvContent += `"${c.name}",${c.count},${c.total}\n`;
      });
    } else if (reportType === 'despesas') {
      csvContent += 'Categoria de Despesa,Valor Total\n';
      expensePieData.forEach((e) => {
        csvContent += `"${e.name}",${e.value}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_omnigestao_${reportType}_${periodFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16 lg:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Relatórios e DRE
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
              Exportação CSV & Impressão
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Demonstrativo de Resultados, análise por categoria, produtos e clientes
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-transform active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar Excel / CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold shadow-xs transition-transform active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir / PDF</span>
          </button>
        </div>
      </div>

      {/* Filter and Mode Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <button
            onClick={() => setReportType('geral')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              reportType === 'geral'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            DRE Consolidado
          </button>
          <button
            onClick={() => setReportType('despesas')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              reportType === 'despesas'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            Despesas por Categoria
          </button>
          <button
            onClick={() => setReportType('produtos')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              reportType === 'produtos'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            Produtos Mais Vendidos
          </button>
          <button
            onClick={() => setReportType('clientes')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              reportType === 'clientes'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            Melhores Clientes
          </button>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={filterCompany}
            onChange={(e) => setFilterCompany(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs font-semibold text-slate-900 dark:text-white cursor-pointer"
          >
            {isMasterUser && <option value="all">Consolidado (Todas as 8 Empresas)</option>}
            {(isMasterUser ? data.companies : allowedCompanies).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <PeriodSelector />
        </div>
      </div>

      {/* DRE Consolidado Report */}
      {reportType === 'geral' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs overflow-x-auto">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-4">
              Demonstrativo de Resultado do Período (DRE Simplificado)
            </h3>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400">
                  <th className="py-3 px-3">Empresa</th>
                  <th className="py-3 px-3 text-right">Faturamento Bruto</th>
                  <th className="py-3 px-3 text-right">Despesas Operacionais</th>
                  <th className="py-3 px-3 text-right">Lucro Líquido</th>
                  <th className="py-3 px-3 text-right">Margem %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {companySummaries.map((c) => {
                  const margin = c.faturamento > 0 ? (c.lucro / c.faturamento) * 100 : 0;
                  return (
                    <tr key={c.company.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: c.company.color || '#4f46e5' }}
                        />
                        {c.company.name}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-700 dark:text-slate-300">
                        {formatCurrency(c.faturamento)}
                      </td>
                      <td className="py-3 px-3 text-right text-rose-600 dark:text-rose-400">
                        {formatCurrency(c.despesas)}
                      </td>
                      <td
                        className={`py-3 px-3 text-right font-bold ${
                          c.lucro >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {formatCurrency(c.lucro)}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold">{margin.toFixed(1)}%</td>
                    </tr>
                  );
                })}
                {/* Total Row */}
                <tr className="border-t-2 border-slate-300 dark:border-slate-700 font-bold bg-slate-50/50 dark:bg-slate-800/50">
                  <td className="py-3.5 px-3 text-slate-900 dark:text-white">
                    TOTAL CONSOLIDADO
                  </td>
                  <td className="py-3.5 px-3 text-right text-indigo-600 dark:text-indigo-400 font-black">
                    {formatCurrency(metrics.totalRevenue)}
                  </td>
                  <td className="py-3.5 px-3 text-right text-rose-600 dark:text-rose-400 font-black">
                    {formatCurrency(metrics.totalExpenses)}
                  </td>
                  <td
                    className={`py-3.5 px-3 text-right font-black ${
                      metrics.estimatedProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {formatCurrency(metrics.estimatedProfit)}
                  </td>
                  <td className="py-3.5 px-3 text-right font-bold">
                    {metrics.totalRevenue > 0
                      ? `${((metrics.estimatedProfit / metrics.totalRevenue) * 100).toFixed(1)}%`
                      : '0%'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Despesas por Categoria */}
      {reportType === 'despesas' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-4">
              Distribuição de Despesas por Categoria
            </h3>
            {expensePieData.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">Nenhuma despesa no período.</p>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expensePieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {expensePieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: any) => formatCurrency(Number(val))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2">
              Valores Detalhados por Categoria
            </h3>
            {expensePieData.map((e, idx) => (
              <div
                key={e.name}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                  />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{e.name}</span>
                </div>
                <span className="font-bold text-rose-600 dark:text-rose-400">
                  {formatCurrency(e.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Produtos Mais Vendidos */}
      {reportType === 'produtos' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-4">
            Ranking de Produtos e Serviços por Faturamento
          </h3>
          {topProducts.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">Nenhuma venda no período.</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, idx) => (
                <div
                  key={p.name}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">{p.name}</h4>
                      <span className="text-[11px] text-slate-400">
                        {p.qty} unidades comercializadas
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      {formatCurrency(p.total)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Melhores Clientes */}
      {reportType === 'clientes' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-4">
            Clientes com Maior Volume de Compras
          </h3>
          {topCustomers.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">Nenhuma venda no período.</p>
          ) : (
            <div className="space-y-3">
              {topCustomers.map((c, idx) => (
                <div
                  key={c.name}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-cyan-600 text-white font-bold flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">{c.name}</h4>
                      <span className="text-[11px] text-slate-400">{c.count} pedidos realizados</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-bold text-cyan-600 dark:text-cyan-400 text-sm">
                      {formatCurrency(c.total)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
