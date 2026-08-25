import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { PaymentMethod, ExpenseCategory, UnitType, ItemType } from '../types';
import { formatCurrency, getTodayDateString } from '../lib/utils';
import { formatCompactStock, formatStockDisplay, UNIT_OPTIONS } from '../lib/unitConversion';
import { calculateItemCost } from '../lib/inventoryEngine';
import {
  X,
  PlusCircle,
  ShoppingBag,
  TrendingDown,
  ArrowDownLeft,
  ArrowUpRight,
  PackagePlus,
  PackageMinus,
  Sliders,
  Check,
  Building2,
  Sparkles,
  Layers,
  Info,
} from 'lucide-react';

export const QuickActionModal: React.FC = () => {
  const {
    data,
    allowedCompanies,
    selectedCompanyId,
    quickAction,
    closeQuickAction,
    addSale,
    addExpense,
    addAccountReceivable,
    addAccountPayable,
    addStockMovement,
    recordStockPurchase,
    recordManualAdjustment,
  } = useApp();

  const [activeType, setActiveType] = useState<
    'sale' | 'expense' | 'receivable' | 'payable' | 'stock_in' | 'stock_out' | 'stock_adjust'
  >(quickAction.defaultType || 'sale');

  // Default company: current selected company or first in allowed companies list
  const defaultCompId =
    selectedCompanyId || (allowedCompanies.length > 0 ? allowedCompanies[0].id : '');
  const [companyId, setCompanyId] = useState<string>(defaultCompId);

  // Form states - Venda
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [productService, setProductService] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('');
  const [discount, setDiscount] = useState('0');
  const [salePaymentMethod, setSalePaymentMethod] = useState<PaymentMethod>('Pix');
  const [saleStatus, setSaleStatus] = useState<'Pago' | 'Pendente'>('Pago');
  const [saleDate, setSaleDate] = useState(getTodayDateString());
  const [saleNotes, setSaleNotes] = useState('');
  const [autoDeductStock, setAutoDeductStock] = useState(true);

  // Form states - Despesa
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>('Fornecedores');
  const [expenseSupplier, setExpenseSupplier] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expensePaymentMethod, setExpensePaymentMethod] = useState<PaymentMethod>('Pix');
  const [expenseDate, setExpenseDate] = useState(getTodayDateString());
  const [expenseDueDate, setExpenseDueDate] = useState(getTodayDateString());
  const [expenseStatus, setExpenseStatus] = useState<'Pago' | 'Pendente'>('Pago');
  const [expenseNotes, setExpenseNotes] = useState('');

  // Form states - Recebimento
  const [recCustomer, setRecCustomer] = useState('');
  const [recDesc, setRecDesc] = useState('');
  const [recAmount, setRecAmount] = useState('');
  const [recDueDate, setRecDueDate] = useState(getTodayDateString());

  // Form states - Pagamento
  const [paySupplier, setPaySupplier] = useState('');
  const [payDesc, setPayDesc] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payDueDate, setPayDueDate] = useState(getTodayDateString());

  // Form states - Entrada de Estoque / Compra
  const [stockProductId, setStockProductId] = useState('');
  const [stockPurchaseQty, setStockPurchaseQty] = useState('1');
  const [stockPurchaseUnit, setStockPurchaseUnit] = useState<UnitType>('un');
  const [stockTotalCost, setStockTotalCost] = useState('');
  const [stockSupplier, setStockSupplier] = useState('');
  const [createExpenseFromStock, setCreateExpenseFromStock] = useState(true);
  const [stockPurchaseDate, setStockPurchaseDate] = useState(getTodayDateString());
  const [stockPurchaseNotes, setStockPurchaseNotes] = useState('');

  // Form states - Saída de Estoque
  const [stockOutProductId, setStockOutProductId] = useState('');
  const [stockOutQty, setStockOutQty] = useState('1');
  const [stockOutUnit, setStockOutUnit] = useState<UnitType>('un');
  const [stockOutReason, setStockOutReason] = useState('Consumo / Uso Interno');
  const [stockOutNotes, setStockOutNotes] = useState('');

  // Form states - Ajuste / Balanço
  const [adjustProductId, setAdjustProductId] = useState('');
  const [adjustCountedQty, setAdjustCountedQty] = useState('');
  const [adjustReasonCat, setAdjustReasonCat] = useState('Balanço Físico / Contagem');
  const [adjustNotes, setAdjustNotes] = useState('');

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Available items for the selected company
  const companyProducts = useMemo(
    () => data.products.filter((p) => p.company_id === companyId),
    [data.products, companyId]
  );

  const companySuppliers = useMemo(
    () => data.suppliers.filter((s) => s.company_id === companyId),
    [data.suppliers, companyId]
  );

  // Selected item metadata for sale
  const selectedProductItem = useMemo(
    () => companyProducts.find((p) => p.id === selectedProductId),
    [companyProducts, selectedProductId]
  );

  const itemCostInfo = useMemo(() => {
    if (!selectedProductItem) return null;
    return calculateItemCost(selectedProductItem, data.products);
  }, [selectedProductItem, data.products]);

  // Selected product for purchase
  const currentPurchaseProduct = useMemo(
    () => companyProducts.find((p) => p.id === stockProductId),
    [companyProducts, stockProductId]
  );

  // Selected product for adjust
  const currentAdjustProduct = useMemo(
    () => companyProducts.find((p) => p.id === adjustProductId),
    [companyProducts, adjustProductId]
  );

  // Selected product for stock out
  const currentStockOutProduct = useMemo(
    () => companyProducts.find((p) => p.id === stockOutProductId),
    [companyProducts, stockOutProductId]
  );

  if (!quickAction.isOpen) return null;

  const showSuccess = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
      closeQuickAction();
    }, 900);
  };

  const handleSelectCatalogItem = (itemId: string) => {
    setSelectedProductId(itemId);
    const found = companyProducts.find((p) => p.id === itemId);
    if (found) {
      setProductService(found.name);
      setUnitPrice(String(found.sale_price || ''));
    }
  };

  // Calculations for Sale
  const qtyNum = parseFloat(quantity) || 0;
  const priceNum = parseFloat(unitPrice) || 0;
  const discNum = parseFloat(discount) || 0;
  const totalSaleAmount = Math.max(0, qtyNum * priceNum - discNum);

  // Submit Handlers
  const handleSaveSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) {
      alert('Selecione uma empresa primeiro.');
      return;
    }
    if (!productService.trim() || totalSaleAmount <= 0) {
      alert('Informe o produto/serviço e um valor válido.');
      return;
    }

    addSale({
      company_id: companyId,
      customer_name: customerName.trim() || 'Cliente Avulso',
      product_service: productService.trim(),
      quantity: qtyNum,
      unit_price: priceNum,
      discount: discNum,
      total_amount: totalSaleAmount,
      payment_method: salePaymentMethod,
      status: saleStatus,
      date: saleDate,
      notes: saleNotes,
      auto_stock_deducted: autoDeductStock,
      items: selectedProductItem
        ? [
            {
              product_id: selectedProductItem.id,
              name: selectedProductItem.name,
              type: selectedProductItem.type,
              quantity: qtyNum,
              unit_price: priceNum,
              discount: discNum,
              total_price: totalSaleAmount,
              unit_cost: Number(selectedProductItem.cost_price) || 0,
              total_cost: (Number(selectedProductItem.cost_price) || 0) * qtyNum,
              unit: selectedProductItem.unit || 'un',
            },
          ]
        : undefined,
    });

    showSuccess('Venda lançada com sucesso!');
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) {
      alert('Selecione uma empresa primeiro.');
      return;
    }
    const amt = parseFloat(expenseAmount) || 0;
    if (!expenseDesc.trim() || amt <= 0) {
      alert('Informe a descrição e valor da despesa.');
      return;
    }

    addExpense({
      company_id: companyId,
      description: expenseDesc.trim(),
      category: expenseCategory,
      supplier_name: expenseSupplier.trim() || 'Fornecedor Diversos',
      amount: amt,
      payment_method: expensePaymentMethod,
      date: expenseDate,
      due_date: expenseDueDate,
      status: expenseStatus,
      notes: expenseNotes,
    });

    showSuccess('Despesa lançada com sucesso!');
  };

  const handleSaveReceivable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) {
      alert('Selecione uma empresa.');
      return;
    }
    const amt = parseFloat(recAmount) || 0;
    if (!recDesc.trim() || amt <= 0) {
      alert('Informe a descrição e valor a receber.');
      return;
    }

    addAccountReceivable({
      company_id: companyId,
      customer_name: recCustomer.trim() || 'Cliente Diversos',
      description: recDesc.trim(),
      amount: amt,
      due_date: recDueDate,
      status: 'Pendente',
    });

    showSuccess('Conta a receber cadastrada!');
  };

  const handleSavePayable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) {
      alert('Selecione uma empresa.');
      return;
    }
    const amt = parseFloat(payAmount) || 0;
    if (!payDesc.trim() || amt <= 0) {
      alert('Informe a descrição e valor a pagar.');
      return;
    }

    addAccountPayable({
      company_id: companyId,
      supplier_name: paySupplier.trim() || 'Fornecedor Diversos',
      description: payDesc.trim(),
      amount: amt,
      due_date: payDueDate,
      status: 'Pendente',
    });

    showSuccess('Conta a pagar cadastrada!');
  };

  const handleSaveStockPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !stockProductId) {
      alert('Selecione a empresa e o produto/insumo.');
      return;
    }
    const qty = parseFloat(stockPurchaseQty) || 0;
    const cost = parseFloat(stockTotalCost) || 0;
    if (qty <= 0 || cost <= 0) {
      alert('Informe a quantidade e o custo total da compra.');
      return;
    }

    recordStockPurchase({
      companyId,
      productId: stockProductId,
      purchaseQty: qty,
      purchaseUnit: stockPurchaseUnit,
      totalCost: cost,
      supplierName: stockSupplier.trim() || undefined,
      date: stockPurchaseDate,
      notes: stockPurchaseNotes.trim() || undefined,
      createExpense: createExpenseFromStock,
    });

    showSuccess('Entrada de estoque realizada com sucesso!');
  };

  const handleSaveStockOut = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !stockOutProductId) {
      alert('Selecione o produto/insumo.');
      return;
    }
    const qty = parseFloat(stockOutQty) || 0;
    if (qty <= 0) {
      alert('Informe a quantidade de saída.');
      return;
    }

    addStockMovement(
      companyId,
      stockOutProductId,
      'saida',
      qty,
      `${stockOutReason}${stockOutNotes ? `: ${stockOutNotes}` : ''}`,
      undefined,
      stockOutUnit
    );

    showSuccess('Baixa de estoque registrada!');
  };

  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !adjustProductId) {
      alert('Selecione o produto/insumo.');
      return;
    }
    const counted = parseFloat(adjustCountedQty);
    if (isNaN(counted) || counted < 0) {
      alert('Informe a quantidade real contada (zero ou superior).');
      return;
    }

    recordManualAdjustment({
      companyId,
      productId: adjustProductId,
      newQuantityBase: counted,
      reasonCategory: adjustReasonCat,
      notes: adjustNotes.trim() || undefined,
    });

    showSuccess('Ajuste de estoque salvo com sucesso!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl animate-fade-in my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Lançamento Rápido
            </h3>
          </div>
          <button
            onClick={closeQuickAction}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Alert */}
        {toastMessage && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-2 text-emerald-800 dark:text-emerald-200 text-xs font-bold animate-fade-in">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Transaction Type Buttons */}
        <div className="px-6 pt-4 pb-2 border-b border-slate-100 dark:border-slate-800 overflow-x-auto">
          <div className="flex items-center gap-1.5 min-w-max">
            <button
              type="button"
              onClick={() => setActiveType('sale')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                activeType === 'sale'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Venda</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveType('expense')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                activeType === 'expense'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5" />
              <span>Despesa</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveType('stock_in')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                activeType === 'stock_in'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              <PackagePlus className="w-3.5 h-3.5" />
              <span>+ Entrada Estoque</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveType('stock_out')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                activeType === 'stock_out'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              <PackageMinus className="w-3.5 h-3.5" />
              <span>- Baixa Manual</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveType('stock_adjust')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                activeType === 'stock_adjust'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Ajuste / Balanço</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveType('receivable')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                activeType === 'receivable'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>A Receber</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveType('payable')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                activeType === 'payable'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>A Pagar</span>
            </button>
          </div>
        </div>

        {/* Company Selector Header */}
        <div className="px-6 pt-3">
          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
            Empresa Vinculada *
          </label>
          <select
            value={companyId}
            onChange={(e) => {
              setCompanyId(e.target.value);
              setSelectedProductId('');
              setStockProductId('');
              setStockOutProductId('');
              setAdjustProductId('');
            }}
            className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs font-semibold text-slate-900 dark:text-white"
          >
            {allowedCompanies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Form Body based on activeType */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 1. FORM: VENDA */}
          {activeType === 'sale' && (
            <form onSubmit={handleSaveSale} className="space-y-4">
              {/* Predefined Item Catalog Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Selecionar do Catálogo (Opcional)
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => handleSelectCatalogItem(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs font-semibold text-slate-900 dark:text-white"
                >
                  <option value="">-- Selecionar item cadastrado ou digitar abaixo --</option>
                  {companyProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.type}] {p.name} - {formatCurrency(p.sale_price)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Customer & Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nome do Cliente
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Ana Silva ou Empresa X"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Descrição do Item / Serviço *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Produto A ou Serviço B"
                    value={productService}
                    onChange={(e) => setProductService(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Quantity, Unit Price & Discount */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Quantidade
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs text-slate-900 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Preço Unitário (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs text-slate-900 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Desconto (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Payment Method, Date & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Forma de Pagamento
                  </label>
                  <select
                    value={salePaymentMethod}
                    onChange={(e) => setSalePaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="Pix">Pix</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Cartão de Débito">Cartão de Débito</option>
                    <option value="Boleto">Boleto</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Transferência">Transferência</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Data da Venda
                  </label>
                  <input
                    type="date"
                    value={saleDate}
                    onChange={(e) => setSaleDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={saleStatus}
                    onChange={(e) => setSaleStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="Pago">Pago / Concluído</option>
                    <option value="Pendente">Pendente / A Prazo</option>
                  </select>
                </div>
              </div>

              {/* Ficha Técnica / Stock Deduction Preview */}
              {selectedProductItem && selectedProductItem.composition && selectedProductItem.composition.length > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-900/40 text-xs space-y-1.5">
                  <span className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-amber-600" />
                    Baixa Automática de Ficha Técnica ({selectedProductItem.composition.length} insumos):
                  </span>
                  <div className="space-y-1">
                    {selectedProductItem.composition.map((ci, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[11px] text-amber-800 dark:text-amber-300">
                        <span>• {ci.product_name}</span>
                        <span className="font-bold">
                          {formatCompactStock((Number(ci.quantity) || 0) * qtyNum, ci.unit)}
                        </span>
                      </div>
                    ))}
                  </div>
                  {itemCostInfo && (
                    <div className="pt-1 border-t border-amber-200 dark:border-amber-900 flex items-center justify-between font-bold text-amber-950 dark:text-amber-100 text-[11px]">
                      <span>Custo Total Estimado (CMV):</span>
                      <span>{formatCurrency(itemCostInfo.totalCost * qtyNum)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Summary Bar */}
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded-2xl flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-800 dark:text-emerald-200">
                  Total Líquido da Venda:
                </span>
                <span className="text-base font-black text-emerald-700 dark:text-emerald-300">
                  {formatCurrency(totalSaleAmount)}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeQuickAction}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all active:scale-95"
                >
                  Salvar Venda
                </button>
              </div>
            </form>
          )}

          {/* 2. FORM: DESPESA */}
          {activeType === 'expense' && (
            <form onSubmit={handleSaveExpense} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Descrição da Despesa *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Aluguel, Compra de Mercadoria, Energia"
                    value={expenseDesc}
                    onChange={(e) => setExpenseDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Categoria
                  </label>
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value as ExpenseCategory)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="Fornecedores">Fornecedores</option>
                    <option value="Estoque">Estoque / Mercadorias</option>
                    <option value="Operacional">Operacional</option>
                    <option value="Folha de Pagamento">Folha de Pagamento</option>
                    <option value="Aluguel">Aluguel & Infraestrutura</option>
                    <option value="Marketing">Marketing & Vendas</option>
                    <option value="Impostos">Impostos & Taxas</option>
                    <option value="Manutenção">Manutenção</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Valor (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0.00"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs text-rose-600 dark:text-rose-400 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Fornecedor
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Nome da Distribuidora"
                    value={expenseSupplier}
                    onChange={(e) => setExpenseSupplier(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Forma de Pagamento
                  </label>
                  <select
                    value={expensePaymentMethod}
                    onChange={(e) => setExpensePaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="Pix">Pix</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Boleto">Boleto</option>
                    <option value="Transferência">Transferência</option>
                    <option value="Dinheiro">Dinheiro</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Data da Despesa
                  </label>
                  <input
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={expenseStatus}
                    onChange={(e) => setExpenseStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="Pago">Pago</option>
                    <option value="Pendente">Pendente (Gera Conta a Pagar)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeQuickAction}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-all active:scale-95"
                >
                  Salvar Despesa
                </button>
              </div>
            </form>
          )}

          {/* 3. FORM: ENTRADA DE ESTOQUE / COMPRA */}
          {activeType === 'stock_in' && (
            <form onSubmit={handleSaveStockPurchase} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Produto / Insumo *
                </label>
                <select
                  required
                  value={stockProductId}
                  onChange={(e) => {
                    setStockProductId(e.target.value);
                    const prod = companyProducts.find((p) => p.id === e.target.value);
                    if (prod) {
                      setStockPurchaseUnit(prod.unit || 'un');
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs font-semibold text-slate-900 dark:text-white"
                >
                  <option value="">-- Selecione o item --</option>
                  {companyProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Saldo Atual: {formatStockDisplay(p.quantity, p.unit)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Quantidade Comprada *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.001"
                    required
                    value={stockPurchaseQty}
                    onChange={(e) => setStockPurchaseQty(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Unidade
                  </label>
                  <select
                    value={stockPurchaseUnit}
                    onChange={(e) => setStockPurchaseUnit(e.target.value as UnitType)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    {UNIT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Custo Total da Compra (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0.00"
                    value={stockTotalCost}
                    onChange={(e) => setStockTotalCost(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Fornecedor
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Distribuidora Central"
                    value={stockSupplier}
                    onChange={(e) => setStockSupplier(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Data da Entrada
                  </label>
                  <input
                    type="date"
                    value={stockPurchaseDate}
                    onChange={(e) => setStockPurchaseDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl flex items-center justify-between text-xs">
                <span className="font-semibold text-indigo-900 dark:text-indigo-200">
                  Lançar automaticamente como Despesa Financeira?
                </span>
                <input
                  type="checkbox"
                  checked={createExpenseFromStock}
                  onChange={(e) => setCreateExpenseFromStock(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeQuickAction}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md transition-all active:scale-95"
                >
                  Registrar Entrada
                </button>
              </div>
            </form>
          )}

          {/* 4. FORM: BAIXA MANUAL */}
          {activeType === 'stock_out' && (
            <form onSubmit={handleSaveStockOut} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Produto / Insumo *
                </label>
                <select
                  required
                  value={stockOutProductId}
                  onChange={(e) => {
                    setStockOutProductId(e.target.value);
                    const prod = companyProducts.find((p) => p.id === e.target.value);
                    if (prod) setStockOutUnit(prod.unit || 'un');
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs font-semibold text-slate-900 dark:text-white"
                >
                  <option value="">-- Selecione o item --</option>
                  {companyProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Saldo: {formatStockDisplay(p.quantity, p.unit)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Quantidade de Baixa *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.001"
                    required
                    value={stockOutQty}
                    onChange={(e) => setStockOutQty(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Motivo da Saída
                  </label>
                  <select
                    value={stockOutReason}
                    onChange={(e) => setStockOutReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="Consumo / Uso Interno">Consumo / Uso Interno</option>
                    <option value="Avaria / Quebra">Avaria / Quebra</option>
                    <option value="Validade Vencida">Validade Vencida</option>
                    <option value="Devolução a Fornecedor">Devolução a Fornecedor</option>
                    <option value="Ajuste de Inventário">Ajuste de Inventário</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeQuickAction}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-all active:scale-95"
                >
                  Confirmar Baixa
                </button>
              </div>
            </form>
          )}

          {/* 5. FORM: AJUSTE / BALANÇO */}
          {activeType === 'stock_adjust' && (
            <form onSubmit={handleSaveAdjustment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Produto / Insumo *
                </label>
                <select
                  required
                  value={adjustProductId}
                  onChange={(e) => {
                    setAdjustProductId(e.target.value);
                    const prod = companyProducts.find((p) => p.id === e.target.value);
                    if (prod) setAdjustCountedQty(String(prod.quantity || 0));
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs font-semibold text-slate-900 dark:text-white"
                >
                  <option value="">-- Selecione o item --</option>
                  {companyProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Saldo no Sistema: {formatStockDisplay(p.quantity, p.unit)})
                    </option>
                  ))}
                </select>
              </div>

              {currentAdjustProduct && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs flex items-center justify-between">
                  <span className="text-slate-500">Saldo Atual no Sistema:</span>
                  <span className="font-extrabold text-slate-900 dark:text-white">
                    {formatStockDisplay(currentAdjustProduct.quantity, currentAdjustProduct.unit)}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nova Quantidade Real Contada *
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  placeholder="Informe o saldo real físico"
                  value={adjustCountedQty}
                  onChange={(e) => setAdjustCountedQty(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs font-bold text-indigo-600 dark:text-indigo-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Motivo do Ajuste
                </label>
                <input
                  type="text"
                  placeholder="Ex: Contagem de inventário de fim de mês"
                  value={adjustReasonCat}
                  onChange={(e) => setAdjustReasonCat(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeQuickAction}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-all active:scale-95"
                >
                  Salvar Ajuste Físico
                </button>
              </div>
            </form>
          )}

          {/* 6. FORM: A RECEBER */}
          {activeType === 'receivable' && (
            <form onSubmit={handleSaveReceivable} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Cliente / Devedor
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Nome do cliente"
                    value={recCustomer}
                    onChange={(e) => setRecCustomer(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Descrição *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Parcela 1/3 Contrato"
                    value={recDesc}
                    onChange={(e) => setRecDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Valor a Receber (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0.00"
                    value={recAmount}
                    onChange={(e) => setRecAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs font-bold text-emerald-600 dark:text-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Data de Vencimento
                  </label>
                  <input
                    type="date"
                    value={recDueDate}
                    onChange={(e) => setRecDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeQuickAction}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all active:scale-95"
                >
                  Salvar Conta a Receber
                </button>
              </div>
            </form>
          )}

          {/* 7. FORM: A PAGAR */}
          {activeType === 'payable' && (
            <form onSubmit={handleSavePayable} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Fornecedor / Credor
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Nome do Fornecedor"
                    value={paySupplier}
                    onChange={(e) => setPaySupplier(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Descrição *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Boleto Mercadorias"
                    value={payDesc}
                    onChange={(e) => setPayDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Valor a Pagar (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0.00"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs font-bold text-rose-600 dark:text-rose-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Data de Vencimento
                  </label>
                  <input
                    type="date"
                    value={payDueDate}
                    onChange={(e) => setPayDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeQuickAction}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-all active:scale-95"
                >
                  Salvar Conta a Pagar
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
