import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, PeriodFilter } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import {
  formatStockDisplay,
  formatCompactStock,
} from '../../lib/unitConversion';
import {
  getProductHealthInfo,
  calculateItemCapacity,
  calculateItemCost,
  calculateConsumptionAnalytics,
} from '../../lib/inventoryEngine';
import {
  Boxes,
  Plus,
  PackagePlus,
  PackageMinus,
  Sliders,
  Search,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Clock,
  Layers,
  Calendar,
  Building2,
  ArrowDownRight,
  ArrowUpRight,
  Filter,
  ShoppingCart,
} from 'lucide-react';

export const InventoryView: React.FC = () => {
  const {
    data,
    selectedCompanyId,
    openQuickAction,
    setActiveTab,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'balance' | 'capacity' | 'replenishment' | 'movements'>('balance');
  const [search, setSearch] = useState('');
  const [filterCompany, setFilterCompany] = useState<string>(selectedCompanyId || 'all');
  const [filterHealth, setFilterHealth] = useState<'all' | 'low_critical' | 'empty' | 'normal'>('all');
  const [consumptionPeriod, setConsumptionPeriod] = useState<PeriodFilter>('30dias');

  // Filtered tracked products
  const trackedProducts = useMemo(() => {
    return data.products.filter((p) => {
      if (!p.track_stock && p.type !== 'Produto') return false;
      if (filterCompany !== 'all' && p.company_id !== filterCompany) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchSku = p.sku?.toLowerCase().includes(q);
        const matchCat = p.category?.toLowerCase().includes(q);
        if (!matchName && !matchSku && !matchCat) return false;
      }

      const health = getProductHealthInfo(p);
      if (filterHealth === 'low_critical' && health.status !== 'low' && health.status !== 'critical') return false;
      if (filterHealth === 'empty' && health.status !== 'empty') return false;
      if (filterHealth === 'normal' && health.status !== 'normal') return false;

      return true;
    });
  }, [data.products, filterCompany, filterHealth, search]);

  // Composite products / services with Ficha Técnica (Composição)
  const compositeItems = useMemo(() => {
    return data.products.filter((p) => {
      if (!p.composition || p.composition.length === 0) return false;
      if (filterCompany !== 'all' && p.company_id !== filterCompany) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [data.products, filterCompany, search]);

  // Total stock value (CMV imobilizado)
  const totalStockValue = useMemo(() => {
    return trackedProducts.reduce((sum, p) => {
      const qty = Number(p.quantity) || 0;
      const cost = Number(p.cost_price) || 0;
      return sum + qty * cost;
    }, 0);
  }, [trackedProducts]);

  const lowStockCount = trackedProducts.filter((p) => {
    const h = getProductHealthInfo(p);
    return h.status === 'low' || h.status === 'critical' || h.status === 'empty';
  }).length;

  // Filtered Inventory Movements
  const filteredMovements = useMemo(() => {
    return data.inventoryMovements.filter((m) => {
      if (filterCompany !== 'all' && m.company_id !== filterCompany) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          m.product_name.toLowerCase().includes(q) ||
          m.reason.toLowerCase().includes(q) ||
          m.type.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [data.inventoryMovements, filterCompany, search]);

  // Analytics
  const consumptionAnalytics = useMemo(() => {
    return calculateConsumptionAnalytics(
      data.inventoryMovements,
      data.products,
      filterCompany === 'all' ? null : filterCompany,
      consumptionPeriod
    );
  }, [data.inventoryMovements, data.products, filterCompany, consumptionPeriod]);

  return (
    <div className="space-y-6 animate-fade-in pb-16 lg:pb-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Controle de Estoque
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
              {trackedProducts.length} itens controlados
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gestão de saldos, entradas, saídas automáticas por venda e balanço físico
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="btn-stock-in"
            onClick={() => openQuickAction('stock_in')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <PackagePlus className="w-4 h-4" />
            <span>+ Entrada / Compra</span>
          </button>

          <button
            id="btn-stock-out"
            onClick={() => openQuickAction('stock_out')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <PackageMinus className="w-4 h-4" />
            <span>- Baixa Manual</span>
          </button>

          <button
            id="btn-stock-adjust"
            onClick={() => openQuickAction('stock_adjust')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Sliders className="w-4 h-4" />
            <span>Balanço / Ajuste</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
            Valor Imobilizado (Custo)
          </span>
          <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 block">
            {formatCurrency(totalStockValue)}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Capital em mercadorias e insumos
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
            Alertas de Reposição
          </span>
          <span
            className={`text-xl sm:text-2xl font-black mt-1 block ${
              lowStockCount > 0
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {lowStockCount} {lowStockCount === 1 ? 'item' : 'itens'}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Abaixo do estoque mínimo
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
            Composições / Fichas
          </span>
          <span className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 block">
            {compositeItems.length}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Produtos/Serviços com receita
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
            Movimentações Registradas
          </span>
          <span className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1 block">
            {data.inventoryMovements.length}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Rastreabilidade total
          </span>
        </div>
      </div>

      {/* Sub-Tabs Selector */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl w-full max-w-2xl overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('balance')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeSubTab === 'balance'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Saldo de Estoque
        </button>

        <button
          onClick={() => setActiveSubTab('capacity')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeSubTab === 'capacity'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Fichas Técnicas & Capacidade
        </button>

        <button
          onClick={() => setActiveSubTab('replenishment')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeSubTab === 'replenishment'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Previsão & Reposição
        </button>

        <button
          onClick={() => setActiveSubTab('movements')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeSubTab === 'movements'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Histórico de Movimentações
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por produto, insumo, SKU ou categoria..."
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

        {activeSubTab === 'balance' && (
          <select
            value={filterHealth}
            onChange={(e) => setFilterHealth(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs font-semibold text-slate-900 dark:text-white"
          >
            <option value="all">Todos os Status</option>
            <option value="low_critical">Apenas Baixo / Crítico</option>
            <option value="empty">Apenas Zerados</option>
            <option value="normal">Apenas Normais</option>
          </select>
        )}
      </div>

      {/* TAB 1: SALDO DE ESTOQUE */}
      {activeSubTab === 'balance' && (
        <div className="space-y-4">
          {trackedProducts.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center">
              <Boxes className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                Nenhum produto com controle de estoque
              </h3>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                Acesse "Produtos e Serviços" para cadastrar mercadorias com estoque ativado.
              </p>
              <button
                onClick={() => setActiveTab('products-services')}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs"
              >
                Ir para Produtos e Serviços
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trackedProducts.map((product) => {
                const comp = data.companies.find((c) => c.id === product.company_id);
                const health = getProductHealthInfo(product);
                const itemTotalValue = (Number(product.quantity) || 0) * (Number(product.cost_price) || 0);

                return (
                  <div
                    key={product.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      {/* Status Badge & Company */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${health.badgeBg}`}>
                          {health.statusLabel}
                        </span>

                        {comp && (
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-md text-white shrink-0"
                            style={{ backgroundColor: comp.color || '#4f46e5' }}
                          >
                            {comp.name.split('-')[0]}
                          </span>
                        )}
                      </div>

                      {/* Product Name & Details */}
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-2 mb-1">
                        {product.name}
                      </h4>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-3">
                        {product.sku && <span>SKU: {product.sku}</span>}
                        <span>•</span>
                        <span>{product.category}</span>
                      </div>

                      {/* Quantities Progress Bar & Figures */}
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl space-y-2 mb-3">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 text-xs">Saldo em Estoque:</span>
                          <span className="font-black text-slate-900 dark:text-white text-base">
                            {formatStockDisplay(product.quantity, product.unit)}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              health.status === 'empty'
                                ? 'w-0'
                                : health.status === 'critical'
                                ? 'bg-rose-500'
                                : health.status === 'low'
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{
                              width: `${Math.min(100, Math.max(5, (Number(product.quantity) / (Number(product.max_quantity) || Number(product.min_quantity) * 3 || 100)) * 100))}%`,
                            }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                          <span>Mín: {formatCompactStock(product.min_quantity, product.unit)}</span>
                          <span>Máx: {formatCompactStock(product.max_quantity || product.min_quantity * 3, product.unit)}</span>
                        </div>
                      </div>

                      {/* Cost & Valor Imobilizado */}
                      <div className="grid grid-cols-2 gap-2 text-xs py-1">
                        <div>
                          <span className="text-[11px] text-slate-400 block">Custo Unitário:</span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            {formatCurrency(product.cost_price)}/{product.unit}
                          </span>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-400 block">Total Imobilizado:</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(itemTotalValue)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Adjustment Actions */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 mt-2">
                      <button
                        onClick={() => openQuickAction('stock_in')}
                        className="flex-1 py-1.5 px-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] transition-all text-center cursor-pointer"
                      >
                        + Entrada
                      </button>
                      <button
                        onClick={() => openQuickAction('stock_out')}
                        className="flex-1 py-1.5 px-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold text-[11px] transition-all text-center cursor-pointer"
                      >
                        - Baixa
                      </button>
                      <button
                        onClick={() => openQuickAction('stock_adjust')}
                        className="py-1.5 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px] transition-all text-center cursor-pointer"
                      >
                        Ajustar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: FICHAS TÉCNICAS & CAPACIDADE DE PRODUÇÃO/SERVIÇO */}
      {activeSubTab === 'capacity' && (
        <div className="space-y-4">
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-4 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
            <Layers className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm">Capacidade de Produção & Consumo de Insumos</h4>
              <p className="mt-0.5 text-amber-800 dark:text-amber-300">
                O sistema calcula em tempo real quantas unidades de cada produto composto ou serviço sua empresa consegue entregar com base no saldo atual dos componentes em estoque.
              </p>
            </div>
          </div>

          {compositeItems.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center">
              <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                Nenhuma ficha técnica / composição cadastrada
              </h3>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                Cadastre a composição de insumos nos seus produtos ou serviços para ver a capacidade máxima de atendimento.
              </p>
              <button
                onClick={() => setActiveTab('products-services')}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs"
              >
                Cadastrar Ficha Técnica
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {compositeItems.map((item) => {
                const comp = data.companies.find((c) => c.id === item.company_id);
                const capacity = calculateItemCapacity(item, data.products);
                const costBreakdown = calculateItemCost(item, data.products);

                return (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                              {item.type}
                            </span>
                            {comp && (
                              <span className="text-[11px] font-semibold text-slate-400">
                                {comp.name}
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-slate-900 dark:text-white text-sm mt-1">
                            {item.name}
                          </h4>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">
                            Capacidade Atual
                          </span>
                          <span
                            className={`text-xl font-black ${
                              capacity.maxPossibleUnits > 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {capacity.maxPossibleUnits} un
                          </span>
                        </div>
                      </div>

                      {/* Bottleneck Warning */}
                      {capacity.bottleneckProduct && capacity.maxPossibleUnits < 10 && (
                        <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900/40 text-xs text-rose-800 dark:text-rose-300 mb-3 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>
                            Gargalo: <strong>{capacity.bottleneckProduct.productName}</strong> (saldo atual permite apenas {capacity.bottleneckProduct.possibleWithThisProduct} unidades).
                          </span>
                        </div>
                      )}

                      {/* Components Breakdown Table */}
                      <div className="space-y-1.5 mb-3">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Consumo de Componentes por Unidade Vendida:
                        </span>
                        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3 space-y-2 text-xs">
                          {capacity.componentCapacities.map((cc) => (
                            <div
                              key={cc.productId}
                              className={`flex items-center justify-between p-2 rounded-xl ${
                                cc.isBottleneck
                                  ? 'bg-rose-100/70 dark:bg-rose-950/60 font-semibold'
                                  : 'bg-white dark:bg-slate-900'
                              }`}
                            >
                              <div className="truncate pr-2">
                                <span className="text-slate-900 dark:text-white block truncate">
                                  {cc.productName}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  Consumo: {formatCompactStock(cc.requiredPerUnit, cc.unit)} / un
                                </span>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                                  {formatCompactStock(cc.currentStock, cc.unit)} em estoque
                                </span>
                                <span
                                  className={`text-[10px] ${
                                    cc.isBottleneck ? 'text-rose-600 font-bold' : 'text-slate-400'
                                  }`}
                                >
                                  Dá para {cc.possibleUnits} un
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Financial Summary */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-slate-400 text-[11px] block">Preço de Venda:</span>
                        <span className="font-black text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(costBreakdown.salePrice)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 text-[11px] block">Custo Total Insumos:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {formatCurrency(costBreakdown.totalCost)} ({costBreakdown.marginPercentage.toFixed(1)}% margem)
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PREVISÃO & REPOSIÇÃO */}
      {activeSubTab === 'replenishment' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                Cálculo de Consumo Médio & Sugestão de Compra
              </h4>
              <p className="text-xs text-slate-400">
                Baseado no histórico de saídas reais dos insumos nas vendas realizadas
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Período de Análise:</span>
              <select
                value={consumptionPeriod}
                onChange={(e) => setConsumptionPeriod(e.target.value as PeriodFilter)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs font-bold text-slate-900 dark:text-white"
              >
                <option value="7dias">Últimos 7 dias</option>
                <option value="30dias">Últimos 30 dias</option>
                <option value="esteMes">Este Mês</option>
              </select>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase text-[10px] tracking-wider font-bold">
                  <tr>
                    <th className="py-3.5 px-4">Produto / Insumo</th>
                    <th className="py-3.5 px-4">Empresa</th>
                    <th className="py-3.5 px-4 text-right">Saldo Atual</th>
                    <th className="py-3.5 px-4 text-right">Consumo Período</th>
                    <th className="py-3.5 px-4 text-right">Média / Dia</th>
                    <th className="py-3.5 px-4 text-right">Dias Restantes</th>
                    <th className="py-3.5 px-4 text-right">Sugestão Compra</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {consumptionAnalytics.items.map((item) => {
                    const comp = data.companies.find((c) => c.id === item.product.company_id);

                    return (
                      <tr key={item.product.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                          {item.product.name}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {comp ? comp.name.split('-')[0] : '-'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold text-slate-900 dark:text-white">
                          {formatStockDisplay(item.product.quantity, item.unit)}
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-600 dark:text-slate-300">
                          {formatCompactStock(item.totalQuantityConsumed, item.unit)}
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-600 dark:text-slate-300 font-mono">
                          {item.dailyAverage.toFixed(2)} {item.unit}/dia
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span
                            className={`font-bold px-2 py-0.5 rounded-md ${
                              item.daysRemaining < 5
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                : item.daysRemaining < 15
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                : 'text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {item.daysRemaining > 365 ? '> 1 ano' : `${item.daysRemaining} dias`}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {item.recommendedBuyQty > 0 ? (
                            <span>
                              +{formatCompactStock(item.recommendedBuyQty, item.unit)} ({formatCurrency(item.estimatedBuyCost)})
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal">Estoque suficiente</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: HISTÓRICO DE MOVIMENTAÇÕES */}
      {activeSubTab === 'movements' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
          {filteredMovements.length === 0 ? (
            <div className="p-12 text-center">
              <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                Nenhuma movimentação registrada
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Todas as vendas, entradas e ajustes de estoque são auditados automaticamente nesta aba.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase text-[10px] tracking-wider font-bold">
                  <tr>
                    <th className="py-3.5 px-4">Data</th>
                    <th className="py-3.5 px-4">Empresa</th>
                    <th className="py-3.5 px-4">Tipo</th>
                    <th className="py-3.5 px-4">Produto / Insumo</th>
                    <th className="py-3.5 px-4 text-right">Quantidade</th>
                    <th className="py-3.5 px-4 text-right">Saldo Anterior → Novo</th>
                    <th className="py-3.5 px-4">Motivo / Referência</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredMovements.map((mov) => {
                    const comp = data.companies.find((c) => c.id === mov.company_id);

                    return (
                      <tr key={mov.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-500">
                          {formatDate(mov.date)}
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
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              mov.type === 'entrada'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                : mov.type === 'saida'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {mov.type === 'entrada' ? 'Entrada' : mov.type === 'saida' ? 'Saída' : 'Ajuste'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                          {mov.product_name}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-slate-900 dark:text-white">
                          {mov.type === 'entrada' ? '+' : mov.type === 'saida' ? '-' : ''}
                          {formatCompactStock(mov.quantity, mov.unit)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-[11px] text-slate-500">
                          {formatCompactStock(mov.previous_quantity, mov.unit)} →{' '}
                          <strong className="text-slate-900 dark:text-white">
                            {formatCompactStock(mov.new_quantity, mov.unit)}
                          </strong>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                          {mov.reason}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
