import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AccountPayable } from '../../types';
import { formatCurrency, formatDate, getTodayDateString } from '../../lib/utils';
import {
  ArrowUpRight,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  Check,
} from 'lucide-react';

export const AccountsPayableView: React.FC = () => {
  const {
    data,
    canEditOrDelete,
    selectedCompanyId,
    deleteAccountPayable,
    markPayableAsPaid,
    openQuickAction,
    requestDeleteConfirm,
  } = useApp();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'Pendente' | 'Pago' | 'Vencido'>('all');
  const today = getTodayDateString();

  const filteredItems = data.accountsPayable.filter((item) => {
    if (selectedCompanyId && item.company_id !== selectedCompanyId) return false;
    if (filterStatus !== 'all' && item.status !== filterStatus) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchDesc = item.description.toLowerCase().includes(q);
      const matchSupplier = item.supplier_name.toLowerCase().includes(q);
      if (!matchDesc && !matchSupplier) return false;
    }

    return true;
  });

  const totalPending = filteredItems
    .filter((i) => i.status === 'Pendente' || i.status === 'Vencido')
    .reduce((sum, i) => sum + Number(i.amount), 0);

  return (
    <div className="space-y-6 animate-fade-in pb-16 lg:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Contas a Pagar
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
              {filteredItems.length} registros
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Total pendente:{' '}
            <strong className="text-amber-600 dark:text-amber-400 font-extrabold">
              {formatCurrency(totalPending)}
            </strong>
          </p>
        </div>

        <button
          onClick={() => openQuickAction('payable')}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Nova Conta a Pagar</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar conta ou fornecedor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs text-slate-900 dark:text-white"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs font-semibold text-slate-900 dark:text-white"
        >
          <option value="all">Todos os Status</option>
          <option value="Pendente">Pendentes</option>
          <option value="Pago">Pagas</option>
          <option value="Vencido">Vencidas</option>
        </select>
      </div>

      {/* List */}
      {filteredItems.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center">
          <ArrowUpRight className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
            Nenhuma conta a pagar encontrada
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Mantenha suas obrigações e boletos organizados.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const comp = data.companies.find((c) => c.id === item.company_id);
            const isOverdue = item.status === 'Pendente' && item.due_date < today;
            const isDueToday = item.status === 'Pendente' && item.due_date === today;

            return (
              <div
                key={item.id}
                className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 sm:p-5 shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isOverdue
                    ? 'border-rose-300 dark:border-rose-900 bg-rose-50/20'
                    : isDueToday
                    ? 'border-amber-300 dark:border-amber-900 bg-amber-50/20'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-xs ${
                      item.status === 'Pago'
                        ? 'bg-emerald-600'
                        : isOverdue
                        ? 'bg-rose-600'
                        : 'bg-amber-600'
                    }`}
                  >
                    <ArrowUpRight className="w-5 h-5" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                        {item.description}
                      </h4>
                      {comp && (
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-md text-white"
                          style={{ backgroundColor: comp.color || '#4f46e5' }}
                        >
                          {comp.name}
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          item.status === 'Pago'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : isOverdue
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 animate-pulse'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {item.status === 'Pago' ? 'Pago' : isOverdue ? 'Vencida!' : 'Pendente'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Fornecedor: <strong>{item.supplier_name}</strong>
                    </p>

                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1 font-semibold">
                        <Clock className="w-3 h-3 text-amber-500" />
                        Vencimento: {formatDate(item.due_date)}{' '}
                        {isDueToday && <span className="text-amber-600 font-bold">(Hoje)</span>}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100 dark:border-slate-800">
                  <div className="text-left sm:text-right">
                    <span className="text-xs text-slate-400 block font-medium">Valor</span>
                    <span className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400">
                      {formatCurrency(item.amount)}
                    </span>
                  </div>

                  {item.status !== 'Pago' && (
                    <button
                      onClick={() => markPayableAsPaid(item.id)}
                      className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white dark:bg-emerald-950/60 dark:hover:bg-emerald-600 dark:text-emerald-300 text-xs font-bold transition-all flex items-center gap-1"
                      title="Marcar como pago e lançar despesa"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Baixar</span>
                    </button>
                  )}

                  {canEditOrDelete && (
                    <button
                      onClick={() => {
                        requestDeleteConfirm({
                          title: 'Excluir Conta a Pagar',
                          message: `Deseja realmente apagar a conta a pagar "${item.description}" (${formatCurrency(item.amount)})?`,
                          onConfirm: () => deleteAccountPayable(item.id),
                        });
                      }}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Excluir Conta"
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
