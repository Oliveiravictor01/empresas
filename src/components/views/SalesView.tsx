import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Sale, PaymentMethod, TransactionStatus } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import { formatCompactStock } from '../../lib/unitConversion';
import {
  TrendingUp,
  Plus,
  Search,
  Trash2,
  XCircle,
  Eye,
  Building2,
  Calendar,
  DollarSign,
  Percent,
  CheckCircle2,
  Clock,
  Layers,
  X,
  RotateCcw,
  ShoppingBag,
} from 'lucide-react';

export const SalesView: React.FC = () => {
  const {
    data,
    canEditOrDelete,
    selectedCompanyId,
    openQuickAction,
    cancelSale,
    deleteSale,
    requestDeleteConfirm,
  } = useApp();

  const [search, setSearch] = useState('');
  const [filterCompany, setFilterCompany] = useState<string>(selectedCompanyId || 'all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPayment, setFilterPayment] = useState<string>('all');
  const [selectedSaleDetail, setSelectedSaleDetail] = useState<Sale | null>(null);

  // Filtered Sales
  const filteredSales = useMemo(() => {
    return data.sales.filter((sale) => {
      if (filterCompany !== 'all' && sale.company_id !== filterCompany) return false;
      if (filterStatus !== 'all' && sale.status !== filterStatus) return false;
      if (filterPayment !== 'all' && sale.payment_method !== filterPayment) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchCustomer = sale.customer_name.toLowerCase().includes(q);
        const matchItem = (sale.product_service || '').toLowerCase().includes(q);
        const matchId = sale.id.toLowerCase().includes(q);
        if (!matchCustomer && !matchItem && !matchId) return false;
      }

      return true;
    });
  }, [data.sales, filterCompany, filterStatus, filterPayment, search]);

  // Financial KPIs
  const kpis = useMemo(() => {
    let totalRevenue = 0;
    let totalCost = 0;
    let completedCount = 0;
    let canceledCount = 0;

    filteredSales.forEach((sale) => {
      if (sale.status !== 'Cancelada') {
        totalRevenue += Number(sale.total_amount) || 0;
        totalCost += Number(sale.total_cost || sale.supplies_cost) || 0;
        completedCount++;
      } else {
        canceledCount++;
      }
    });

    const grossProfit = totalRevenue - totalCost;
    const marginPercent = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalCost,
      grossProfit,
      marginPercent,
      completedCount,
      canceledCount,
    };
  }, [filteredSales]);

  return (
    <div className="space-y-6 animate-fade-in pb-16 lg:pb-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Vendas e Faturamento
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
              {filteredSales.length} {filteredSales.length === 1 ? 'registro' : 'registros'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gestão de pedidos, cálculo de custo das mercadorias/insumos (CMV) e margem bruta
          </p>
        </div>

        <button
          id="btn-new-sale"
          onClick={() => openQuickAction('sale')}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Nova Venda / Pedido</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
            Faturamento Bruto
          </span>
          <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
            {formatCurrency(kpis.totalRevenue)}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            {kpis.completedCount} vendas ativas
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
            Custo dos Itens (CMV)
          </span>
          <span className="text-xl sm:text-2xl font-black text-slate-700 dark:text-slate-300 mt-1 block">
            {formatCurrency(kpis.totalCost)}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Insumos e mercadorias
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
            Lucro Bruto Real
          </span>
          <span className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1 block">
            {formatCurrency(kpis.grossProfit)}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Receita (-) Custo dos Itens
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
            Margem Bruta Média
          </span>
          <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 block">
            {kpis.marginPercent.toFixed(1)}%
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Rentabilidade sobre vendas
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por cliente, produto/serviço ou ID da venda..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs text-slate-900 dark:text-white placeholder-slate-400"
          />
        </div>

        <select
          value={filterCompany}
          onChange={(e) => setFilterCompany(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs font-semibold text-slate-900 dark:text-white"
        >
          <option value="all">Todas as 8 Empresas</option>
          {data.companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs font-semibold text-slate-900 dark:text-white"
        >
          <option value="all">Todos os Status</option>
          <option value="Pago">Pago / Concluído</option>
          <option value="Pendente">Pendente / A Prazo</option>
          <option value="Cancelada">Cancelada / Estornada</option>
        </select>

        <select
          value={filterPayment}
          onChange={(e) => setFilterPayment(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs font-semibold text-slate-900 dark:text-white"
        >
          <option value="all">Todos os Pagamentos</option>
          <option value="Pix">Pix</option>
          <option value="Cartão de Crédito">Cartão de Crédito</option>
          <option value="Cartão de Débito">Cartão de Débito</option>
          <option value="Boleto">Boleto</option>
          <option value="Dinheiro">Dinheiro</option>
          <option value="Transferência">Transferência</option>
        </select>
      </div>

      {/* Sales Table / Cards */}
      {filteredSales.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center">
          <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
            Nenhuma venda registrada com os filtros selecionados
          </h3>
          <p className="text-xs text-slate-400 mt-1 mb-4">
            Registre uma nova venda para dar baixa automática no estoque e atualizar seus relatórios financeiros.
          </p>
          <button
            onClick={() => openQuickAction('sale')}
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-sm"
          >
            + Registrar Primeira Venda
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase text-[10px] tracking-wider font-bold">
                <tr>
                  <th className="py-3.5 px-4">Data</th>
                  <th className="py-3.5 px-4">Empresa</th>
                  <th className="py-3.5 px-4">Cliente</th>
                  <th className="py-3.5 px-4">Itens / Descrição</th>
                  <th className="py-3.5 px-4">Pagamento</th>
                  <th className="py-3.5 px-4 text-right">Valor Total</th>
                  <th className="py-3.5 px-4 text-right">Custo (CMV)</th>
                  <th className="py-3.5 px-4 text-right">Margem Bruta</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredSales.map((sale) => {
                  const comp = data.companies.find((c) => c.id === sale.company_id);
                  const cost = Number(sale.total_cost || sale.supplies_cost) || 0;
                  const revenue = Number(sale.total_amount) || 0;
                  const margin = Number(sale.gross_margin) || revenue - cost;
                  const hasCompositionDeduction = sale.consumed_items && sale.consumed_items.length > 0;

                  return (
                    <tr
                      key={sale.id}
                      className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors ${
                        sale.status === 'Cancelada' ? 'opacity-60 bg-slate-50/30' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        {formatDate(sale.date)}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {comp ? (
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded text-white"
                            style={{ backgroundColor: comp.color || '#4f46e5' }}
                          >
                            {comp.name.split('-')[0]}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white max-w-xs truncate">
                        {sale.customer_name}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate">{sale.product_service || 'Itens diversos'}</span>
                          {hasCompositionDeduction && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 shrink-0">
                              Baixa Auto
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-500">
                        {sale.payment_method}
                      </td>

                      <td className="py-3.5 px-4 text-right font-black text-slate-900 dark:text-white">
                        {formatCurrency(sale.total_amount)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-semibold text-slate-500 font-mono">
                        {formatCurrency(cost)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        {formatCurrency(margin)}
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                            sale.status === 'Pago'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : sale.status === 'Pendente'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {sale.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setSelectedSaleDetail(sale)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                            title="Ver Detalhes e Insumos"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {canEditOrDelete && sale.status !== 'Cancelada' && (
                            <button
                              onClick={() => {
                                requestDeleteConfirm({
                                  title: 'Estornar Venda e Devolver Estoque',
                                  message: `Deseja realmente estornar a venda #${sale.id.slice(0, 5)} (${sale.customer_name})? Os insumos consumidos serão automaticamente reincorporados ao estoque.`,
                                  onConfirm: () => cancelSale(sale.id),
                                });
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-all cursor-pointer"
                              title="Estornar Venda e Devolver Estoque"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}

                          {canEditOrDelete && (
                            <button
                              onClick={() => {
                                requestDeleteConfirm({
                                  title: 'Excluir Venda',
                                  message: `Deseja realmente excluir permanentemente a venda de ${formatCurrency(sale.total_amount)} (${sale.customer_name})?`,
                                  onConfirm: () => deleteSale(sale.id),
                                });
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer"
                              title="Excluir Venda"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Detalhes da Venda & Insumos Consumidos */}
      {selectedSaleDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Detalhes da Venda #{selectedSaleDetail.id.slice(0, 8)}
                </h3>
                <p className="text-xs text-slate-400">
                  {formatDate(selectedSaleDetail.date)} • {selectedSaleDetail.customer_name}
                </p>
              </div>
              <button
                onClick={() => setSelectedSaleDetail(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Financials Overview */}
            <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl text-center">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Venda</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                  {formatCurrency(selectedSaleDetail.total_amount)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Custo Itens</span>
                <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                  {formatCurrency(selectedSaleDetail.total_cost || selectedSaleDetail.supplies_cost || 0)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Margem</span>
                <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-sm">
                  {formatCurrency(selectedSaleDetail.gross_margin || 0)}
                </span>
              </div>
            </div>

            {/* Items Sold */}
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1.5">
                Itens Comercializados:
              </span>
              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3 space-y-1.5 text-xs">
                {selectedSaleDetail.items && selectedSaleDetail.items.length > 0 ? (
                  selectedSaleDetail.items.map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span>
                        {it.quantity}x {it.name}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {formatCurrency(it.total_price)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-between">
                    <span>{selectedSaleDetail.product_service}</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {formatCurrency(selectedSaleDetail.total_amount)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Insumos / Componentes Baixados */}
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1.5 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-500" />
                Insumos Baixados no Estoque (Ficha Técnica):
              </span>
              {selectedSaleDetail.consumed_items && selectedSaleDetail.consumed_items.length > 0 ? (
                <div className="bg-amber-50/60 dark:bg-amber-950/30 rounded-xl p-3 space-y-1.5 text-xs border border-amber-200/50 dark:border-amber-900/30">
                  {selectedSaleDetail.consumed_items.map((ci, idx) => (
                    <div key={idx} className="flex items-center justify-between text-amber-900 dark:text-amber-200">
                      <span>• {ci.product_name}</span>
                      <span className="font-bold">
                        {formatCompactStock(ci.quantity, ci.unit)} ({formatCurrency(ci.total_cost)})
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  Nenhum insumo ou produto foi deduzido do estoque nesta venda.
                </p>
              )}
            </div>

            {/* Notes */}
            {selectedSaleDetail.notes && (
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                  Observações:
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl">
                  {selectedSaleDetail.notes}
                </p>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedSaleDetail(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-xs text-slate-700 dark:text-slate-200"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
