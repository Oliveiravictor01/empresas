import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, ItemType, UnitType, ItemComposition } from '../../types';
import { formatCurrency, formatCnpjCpf } from '../../lib/utils';
import { formatStockDisplay, formatCompactStock, UNIT_OPTIONS } from '../../lib/unitConversion';
import { calculateItemCost, calculateItemCapacity } from '../../lib/inventoryEngine';
import {
  Package,
  Plus,
  Search,
  Trash2,
  Edit2,
  Layers,
  Sparkles,
  X,
  Check,
  Building2,
  Tag,
  Boxes,
  Percent,
  TrendingUp,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

export const ProductsServicesView: React.FC = () => {
  const {
    data,
    canEditOrDelete,
    selectedCompanyId,
    addProduct,
    updateProduct,
    deleteProduct,
    requestDeleteConfirm,
  } = useApp();

  const [search, setSearch] = useState('');
  const [filterCompany, setFilterCompany] = useState<string>(selectedCompanyId || 'all');
  const [filterType, setFilterType] = useState<'all' | 'Produto' | 'Serviço' | 'com_ficha'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form States
  const defaultComp = selectedCompanyId || (data.companies[0]?.id || '');
  const [formCompanyId, setFormCompanyId] = useState(defaultComp);
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formType, setFormType] = useState<ItemType>('Produto');
  const [formCategory, setFormCategory] = useState('Geral');
  const [formSalePrice, setFormSalePrice] = useState('');
  const [formCostPrice, setFormCostPrice] = useState('');
  const [formUnit, setFormUnit] = useState<UnitType>('un');
  const [formTrackStock, setFormTrackStock] = useState(true);
  const [formQuantity, setFormQuantity] = useState('0');
  const [formMinQuantity, setFormMinQuantity] = useState('10');
  const [formMaxQuantity, setFormMaxQuantity] = useState('100');
  const [formLocation, setFormLocation] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formComposition, setFormComposition] = useState<ItemComposition[]>([]);

  // Filtered List
  const filteredItems = useMemo(() => {
    return data.products.filter((p) => {
      if (filterCompany !== 'all' && p.company_id !== filterCompany) return false;
      if (filterType === 'Produto' && p.type !== 'Produto') return false;
      if (filterType === 'Serviço' && p.type !== 'Serviço') return false;
      if (filterType === 'com_ficha' && (!p.composition || p.composition.length === 0)) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchSku = p.sku?.toLowerCase().includes(q);
        const matchCat = p.category?.toLowerCase().includes(q);
        if (!matchName && !matchSku && !matchCat) return false;
      }

      return true;
    });
  }, [data.products, filterCompany, filterType, search]);

  // Available stock items for composition selection in form
  const availableComponentProducts = useMemo(() => {
    return data.products.filter(
      (p) => p.company_id === formCompanyId && p.id !== editingProduct?.id
    );
  }, [data.products, formCompanyId, editingProduct]);

  // Live composition cost calculation inside modal
  const modalCompositionCost = useMemo(() => {
    return formComposition.reduce((sum, comp) => {
      const matched = availableComponentProducts.find((p) => p.id === comp.product_id);
      const cost = matched ? Number(matched.cost_price) || 0 : (comp.unit_cost_estimate || 0);
      return sum + (Number(comp.quantity) || 0) * cost;
    }, 0);
  }, [formComposition, availableComponentProducts]);

  const openNewModal = (type: ItemType = 'Produto') => {
    setEditingProduct(null);
    setFormCompanyId(selectedCompanyId || (data.companies[0]?.id || ''));
    setFormName('');
    setFormSku('');
    setFormType(type);
    setFormCategory(type === 'Produto' ? 'Produtos' : 'Serviços');
    setFormSalePrice('');
    setFormCostPrice('');
    setFormUnit('un');
    setFormTrackStock(type === 'Produto');
    setFormQuantity('0');
    setFormMinQuantity('5');
    setFormMaxQuantity('50');
    setFormLocation('');
    setFormNotes('');
    setFormComposition([]);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormCompanyId(p.company_id);
    setFormName(p.name);
    setFormSku(p.sku || '');
    setFormType(p.type || 'Produto');
    setFormCategory(p.category || 'Geral');
    setFormSalePrice(p.sale_price ? String(p.sale_price) : '');
    setFormCostPrice(p.cost_price ? String(p.cost_price) : '');
    setFormUnit(p.unit || 'un');
    setFormTrackStock(p.track_stock !== false);
    setFormQuantity(p.quantity !== undefined ? String(p.quantity) : '0');
    setFormMinQuantity(p.min_quantity !== undefined ? String(p.min_quantity) : '5');
    setFormMaxQuantity(p.max_quantity !== undefined ? String(p.max_quantity) : '50');
    setFormLocation(p.location || '');
    setFormNotes(p.notes || '');
    setFormComposition(p.composition ? [...p.composition] : []);
    setIsModalOpen(true);
  };

  const handleAddCompositionItem = () => {
    if (availableComponentProducts.length === 0) return;
    const first = availableComponentProducts[0];
    setFormComposition((prev) => [
      ...prev,
      {
        product_id: first.id,
        product_name: first.name,
        quantity: 1,
        unit: first.unit || 'un',
        unit_cost_estimate: Number(first.cost_price) || 0,
      },
    ]);
  };

  const handleUpdateCompositionItem = (index: number, updates: Partial<ItemComposition>) => {
    setFormComposition((prev) => {
      const next = [...prev];
      if (updates.product_id) {
        const matched = availableComponentProducts.find((p) => p.id === updates.product_id);
        if (matched) {
          updates.product_name = matched.name;
          updates.unit = matched.unit || 'un';
          updates.unit_cost_estimate = Number(matched.cost_price) || 0;
        }
      }
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  const handleRemoveCompositionItem = (index: number) => {
    setFormComposition((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCompanyId) {
      alert('Preencha os campos obrigatórios (Empresa e Nome).');
      return;
    }

    const salePriceNum = Number(formSalePrice) || 0;
    const costPriceNum = formComposition.length > 0 ? modalCompositionCost : (Number(formCostPrice) || 0);

    const productPayload: Omit<Product, 'id' | 'created_at'> = {
      company_id: formCompanyId,
      name: formName.trim(),
      sku: formSku.trim() || undefined,
      type: formType,
      category: formCategory.trim() || 'Geral',
      sale_price: salePriceNum,
      cost_price: costPriceNum,
      unit: formUnit,
      track_stock: formType === 'Produto' && formTrackStock,
      quantity: formType === 'Produto' && formTrackStock ? Number(formQuantity) || 0 : 0,
      min_quantity: formType === 'Produto' && formTrackStock ? Number(formMinQuantity) || 0 : 0,
      max_quantity: formType === 'Produto' && formTrackStock ? Number(formMaxQuantity) || 0 : undefined,
      status: 'Ativo',
      location: formLocation.trim() || undefined,
      notes: formNotes.trim() || undefined,
      composition: formComposition.length > 0 ? formComposition : undefined,
    };

    if (editingProduct) {
      updateProduct(editingProduct.id, productPayload);
    } else {
      addProduct(productPayload);
    }

    setIsModalOpen(false);
  };

  // KPIs
  const totalItems = filteredItems.length;
  const productsCount = filteredItems.filter((p) => p.type === 'Produto').length;
  const servicesCount = filteredItems.filter((p) => p.type === 'Serviço').length;
  const withCompositionCount = filteredItems.filter((p) => p.composition && p.composition.length > 0).length;

  return (
    <div className="space-y-6 animate-fade-in pb-16 lg:pb-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Produtos e Serviços
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
              {totalItems} {totalItems === 1 ? 'item' : 'itens'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Catálogo completo de mercadorias, serviços prestados e fichas técnicas de composição
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-add-product"
            onClick={() => openNewModal('Produto')}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Novo Produto</span>
          </button>
          <button
            id="btn-add-service"
            onClick={() => openNewModal('Serviço')}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Novo Serviço</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
            Total Cadastrado
          </span>
          <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">
            {totalItems}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Itens no catálogo
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
            Produtos
          </span>
          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
            {productsCount}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Mercadorias / Insumos
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
            Serviços
          </span>
          <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1 block">
            {servicesCount}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Atividades / Atendimentos
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
            Com Ficha Técnica
          </span>
          <span className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 block">
            {withCompositionCount}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Consomem componentes
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome do produto, serviço, código SKU ou categoria..."
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
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as any)}
          className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs font-semibold text-slate-900 dark:text-white"
        >
          <option value="all">Todos os Tipos</option>
          <option value="Produto">Apenas Produtos</option>
          <option value="Serviço">Apenas Serviços</option>
          <option value="com_ficha">Apenas com Ficha Técnica</option>
        </select>
      </div>

      {/* Products & Services Grid / List */}
      {filteredItems.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
            Nenhum produto ou serviço encontrado
          </h3>
          <p className="text-xs text-slate-400 mt-1 mb-4">
            Cadastre os itens comercializados pelas suas empresas para registrar vendas e controlar estoque.
          </p>
          <button
            onClick={() => openNewModal('Produto')}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-sm"
          >
            + Cadastrar Primeiro Item
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const comp = data.companies.find((c) => c.id === item.company_id);
            const costInfo = calculateItemCost(item, data.products);
            const capacityInfo = calculateItemCapacity(item, data.products);
            const hasComposition = item.composition && item.composition.length > 0;

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all"
              >
                <div>
                  {/* Card Header: Type Badge, Company Tag & Actions */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          item.type === 'Produto'
                            ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                            : 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300'
                        }`}
                      >
                        {item.type}
                      </span>
                      {hasComposition && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 flex items-center gap-1">
                          <Layers className="w-2.5 h-2.5" />
                          Ficha Técnica ({item.composition?.length})
                        </span>
                      )}
                    </div>

                    {canEditOrDelete && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                          title="Editar Item"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            requestDeleteConfirm({
                              title: 'Excluir Item do Catálogo',
                              message: `Deseja realmente apagar o item "${item.name}" do catálogo da empresa?`,
                              onConfirm: () => deleteProduct(item.id),
                            });
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer"
                          title="Excluir Item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Title & SKU */}
                  <div className="mb-2">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-2 leading-snug">
                      {item.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                      {item.sku && <span>SKU: {item.sku}</span>}
                      <span>•</span>
                      <span>Cat: {item.category}</span>
                    </div>
                  </div>

                  {/* Company Tag */}
                  {comp && (
                    <div className="flex items-center gap-1.5 mb-3 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: comp.color || '#4f46e5' }}
                      />
                      <span className="truncate">{comp.name}</span>
                    </div>
                  )}

                  {/* Price & Cost Breakdown Block */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl space-y-1.5 text-xs mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-[11px]">Preço de Venda:</span>
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                        {formatCurrency(item.sale_price)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-[11px]">
                        {hasComposition ? 'Custo dos Componentes (CMV):' : 'Custo Unitário:'}
                      </span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {formatCurrency(costInfo.totalCost)}
                      </span>
                    </div>

                    {item.sale_price > 0 && (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
                        <span className="text-slate-500 text-[11px]">Margem Bruta Prevista:</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">
                          {formatCurrency(costInfo.grossMargin)} ({costInfo.marginPercentage.toFixed(1)}%)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Composition details if exists */}
                  {hasComposition && (
                    <div className="mb-3 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Componentes Consumidos por Unidade:
                      </span>
                      <div className="space-y-1 bg-amber-50/50 dark:bg-amber-950/20 p-2.5 rounded-xl border border-amber-200/50 dark:border-amber-900/30">
                        {item.composition?.map((compItem, idx) => (
                          <div key={idx} className="flex items-center justify-between text-[11px] text-slate-700 dark:text-slate-300">
                            <span className="line-clamp-1 flex-1 pr-2">
                              • {compItem.product_name}
                            </span>
                            <span className="font-semibold shrink-0 text-amber-700 dark:text-amber-300">
                              {formatCompactStock(compItem.quantity, compItem.unit)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Footer: Stock status / Capacity */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  {item.track_stock ? (
                    <div className="flex items-center justify-between w-full">
                      <span className="text-slate-400 text-[11px]">Estoque Atual:</span>
                      <span
                        className={`font-bold ${
                          Number(item.quantity) <= Number(item.min_quantity)
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {formatStockDisplay(item.quantity, item.unit)}
                      </span>
                    </div>
                  ) : hasComposition ? (
                    <div className="flex items-center justify-between w-full">
                      <span className="text-slate-400 text-[11px]">Capacidade Produção:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {capacityInfo.maxPossibleUnits > 0
                          ? `Até ${capacityInfo.maxPossibleUnits} un`
                          : 'Estoque insuficiente'}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between w-full">
                      <span className="text-slate-400 text-[11px]">Tipo de Operação:</span>
                      <span className="font-semibold text-slate-600 dark:text-slate-400">
                        Sem controle físico
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Cadastro / Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-fade-in my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {editingProduct ? 'Editar Item' : `Novo ${formType}`}
                </h3>
                <p className="text-xs text-slate-400">
                  Preencha as informações do produto ou serviço e suas regras de estoque
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Type Switcher & Company */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tipo do Item *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFormType('Produto');
                        setFormTrackStock(true);
                      }}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                        formType === 'Produto'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Produto / Mercadoria
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormType('Serviço');
                        setFormTrackStock(false);
                      }}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                        formType === 'Serviço'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Serviço Prestado
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Empresa Vinculada *
                  </label>
                  <select
                    value={formCompanyId}
                    onChange={(e) => setFormCompanyId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    {data.companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Name & SKU */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nome do {formType} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={`Ex: ${formType === 'Produto' ? 'Caixa Kraft 30x20cm ou Cabo USB-C' : 'Sessão de Consultoria ou Instalação'}`}
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Código / SKU
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: PROD-001"
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Category, Unit & Pricing */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Categoria
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Embalagens, Eletrônicos, Serviços"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Unidade de Medida
                  </label>
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value as UnitType)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    {UNIT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Prices: Sale & Cost */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Preço de Venda (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formSalePrice}
                    onChange={(e) => setFormSalePrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-emerald-600 dark:text-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {formComposition.length > 0
                      ? 'Custo Calculado da Ficha Técnica (R$)'
                      : 'Custo Unitário Direto (R$)'}
                  </label>
                  {formComposition.length > 0 ? (
                    <div className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200">
                      {formatCurrency(modalCompositionCost)} (Automático)
                    </div>
                  ) : (
                    <input
                      type="number"
                      step="0.0001"
                      min="0"
                      placeholder="0.00"
                      value={formCostPrice}
                      onChange={(e) => setFormCostPrice(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                    />
                  )}
                </div>
              </div>

              {/* Stock Tracking Toggle for Products */}
              {formType === 'Produto' && (
                <div className="space-y-3 p-4 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        Controlar Estoque Físico deste Produto?
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Habilita baixa automática na venda e avisos de reposição
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={formTrackStock}
                      onChange={(e) => setFormTrackStock(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded-md cursor-pointer"
                    />
                  </div>

                  {formTrackStock && (
                    <div className="grid grid-cols-3 gap-3 pt-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          Estoque Atual ({formUnit})
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={formQuantity}
                          onChange={(e) => setFormQuantity(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          Estoque Mínimo
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={formMinQuantity}
                          onChange={(e) => setFormMinQuantity(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          Estoque Máximo
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={formMaxQuantity}
                          onChange={(e) => setFormMaxQuantity(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Ficha Técnica / Composição Section */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-amber-500" />
                      Composição / Ficha Técnica (Opcional)
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Defina os insumos ou materiais desta empresa que são consumidos ao vender 1 unidade deste item
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddCompositionItem}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Componente</span>
                  </button>
                </div>

                {formComposition.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic py-1">
                    Nenhum componente vinculado. Se este for um item simples ou serviço sem consumo de insumos, deixe vazio.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {formComposition.map((comp, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col sm:flex-row items-center gap-2 p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700"
                      >
                        <select
                          value={comp.product_id}
                          onChange={(e) => handleUpdateCompositionItem(idx, { product_id: e.target.value })}
                          className="flex-1 w-full sm:w-auto px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border-0 text-xs font-medium text-slate-900 dark:text-white"
                        >
                          {availableComponentProducts.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.unit}) - {formatCurrency(p.cost_price)}/{p.unit}
                            </option>
                          ))}
                        </select>

                        <div className="flex items-center gap-1 w-full sm:w-auto">
                          <input
                            type="number"
                            step="any"
                            min="0.0001"
                            placeholder="Qtd"
                            value={comp.quantity}
                            onChange={(e) =>
                              handleUpdateCompositionItem(idx, { quantity: Number(e.target.value) || 0 })
                            }
                            className="w-20 px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border-0 text-xs font-bold text-slate-900 dark:text-white text-center"
                          />
                          <span className="text-xs font-semibold text-slate-500 px-1">
                            {comp.unit}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleRemoveCompositionItem(idx)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer ml-auto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    <div className="p-2 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-xs flex items-center justify-between text-amber-900 dark:text-amber-200">
                      <span>Custo total dos componentes:</span>
                      <span className="font-extrabold">{formatCurrency(modalCompositionCost)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Observações Internas
                </label>
                <textarea
                  rows={2}
                  placeholder="Informações complementares sobre este item..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs text-slate-900 dark:text-white"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  {editingProduct ? 'Salvar Alterações' : 'Cadastrar Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
