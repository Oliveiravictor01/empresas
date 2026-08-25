import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Expense, ExpenseCategory, PaymentMethod } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import {
  TrendingDown,
  Plus,
  Search,
  Filter,
  Trash2,
  Calendar,
  CreditCard,
  Building2,
  Tag,
  Edit2,
} from 'lucide-react';

export const ExpensesView: React.FC = () => {
  const {
    data,
    canEditOrDelete,
    selectedCompanyId,
    deleteExpense,
    openQuickAction,
    requestDeleteConfirm,
  } = useApp();

  const [search, setSearch] = useState('');
  const [filterCompany, setFilterCompany] = useState<string>(selectedCompanyId || 'all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredExpenses = data.expenses.filter((e) => {
    if (filterCompany !== 'all' && e.company_id !== filterCompany) return false;
    if (filterCategory !== 'all' && e.category !== filterCategory) return false;
    if (filterStatus !== 'all' && e.status !== filterStatus) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchDesc = e.description.toLowerCase().includes(q);
      const matchSupplier = e.supplier_name?.toLowerCase().includes(q);
      const matchNotes = e.notes?.toLowerCase().includes(q);
      if (!matchDesc && !matchSupplier && !matchNotes) return false;
    }

    return true;
  });

  const totalValue = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div className="space-y-6 animate-fade-in pb-16 lg:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Despesas e Custos
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
              {filteredExpenses.length} lançamentos
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Total filtrado:{' '}
            <strong className="text-rose-600 dark:text-rose-400 font-extrabold">
              {formatCurrency(totalValue)}
            </strong>
          </p>
        </div>

        <button
          id="btn-new-expense"
          onClick={() => openQuickAction('expense')}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Nova Despesa</span>
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar descrição, fornecedor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs text-slate-900 dark:text-white"
            />
          </div>

          {/* Company Filter */}
          <div className="relative">
            <select
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs font-semibold text-slate-900 dark:text-white"
            >
              <option value="all">Todas as Empresas</option>
              {data.companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="relative">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs font-semibold text-slate-900 dark:text-white"
            >
              <option value="all">Todas as Categorias</option>
              <option value="Estoque">Estoque</option>
              <option value="Fornecedor">Fornecedor</option>
              <option value="Funcionários">Funcionários</option>
              <option value="Aluguel">Aluguel</option>
              <option value="Energia">Energia</option>
              <option value="Internet">Internet</option>
              <option value="Transporte">Transporte</option>
              <option value="Marketing">Marketing</option>
              <option value="Impostos">Impostos</option>
              <option value="Equipamentos">Equipamentos</option>
              <option value="Outros">Outros</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs font-semibold text-slate-900 dark:text-white"
            >
              <option value="all">Todos os Status</option>
              <option value="Pago">Pago</option>
              <option value="Pendente">Pendente</option>
              <option value="Agendado">Agendado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Expenses List */}
      {filteredExpenses.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center">
          <TrendingDown className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
            Nenhuma despesa encontrada
          </h3>
          <p className="text-xs text-slate-400 mt-1 mb-4">
            Registre despesas para manter o controle de custos das suas 8 empresas.
          </p>
          <button
            onClick={() => openQuickAction('expense')}
            className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs shadow-xs"
          >
            + Lançar Despesa
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredExpenses.map((expense) => {
            const comp = data.companies.find((c) => c.id === expense.company_id);
            return (
              <div
                key={expense.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-xs"
                    style={{ backgroundColor: comp?.color || '#f43f5e' }}
                  >
                    <TrendingDown className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                        {expense.description}
                      </h4>
                      {comp && (
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-md text-white"
                          style={{ backgroundColor: comp.color || '#4f46e5' }}
                        >
                          {comp.name}
                        </span>
                      )}
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {expense.category}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          expense.status === 'Pago'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {expense.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Fornecedor: <strong>{expense.supplier_name || 'Não informado'}</strong> •
                      Forma: {expense.payment_method}
                    </p>

                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(expense.date)}
                      </span>
                      {expense.notes && <span className="italic">"{expense.notes}"</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100 dark:border-slate-800">
                  <div className="text-left sm:text-right">
                    <span className="text-xs text-slate-400 block font-medium">Valor</span>
                    <span className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400">
                      {formatCurrency(expense.amount)}
                    </span>
                  </div>

                  {canEditOrDelete && (
                    <button
                      onClick={() => {
                        requestDeleteConfirm({
                          title: 'Excluir Despesa',
                          message: `Deseja realmente apagar o lançamento de despesa "${expense.description}" (${formatCurrency(expense.amount)})?`,
                          onConfirm: () => deleteExpense(expense.id),
                        });
                      }}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Excluir despesa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
