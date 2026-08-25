import React from 'react';
import { Company } from '../types';
import { formatCurrency } from '../lib/utils';
import { Building2, ArrowRight, TrendingUp, TrendingDown, ShoppingBag } from 'lucide-react';

interface CompanyCardProps {
  company: Company;
  faturamento: number;
  despesas: number;
  lucro: number;
  vendasCount: number;
  onEnter: (companyId: string) => void;
  index: number;
}

export const CompanyCard: React.FC<CompanyCardProps> = ({
  company,
  faturamento,
  despesas,
  lucro,
  vendasCount,
  onEnter,
  index,
}) => {
  const isPositive = lucro >= 0;

  return (
    <div
      id={`company-card-${company.id}`}
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
    >
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-xs"
              style={{ backgroundColor: company.color || '#4f46e5' }}
            >
              {index + 1}
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-base group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                {company.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                {company.category || 'Geral'}
              </p>
            </div>
          </div>
          <span
            className={`text-[11px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider ${
              company.status === 'active'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {company.status === 'active' ? 'Ativa' : 'Inativa'}
          </span>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-2.5 my-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
              Faturamento
            </span>
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              {formatCurrency(faturamento)}
            </span>
          </div>
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
              Despesas
            </span>
            <span className="text-sm font-semibold text-rose-600 dark:text-rose-400">
              {formatCurrency(despesas)}
            </span>
          </div>
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block flex items-center gap-1">
              Resultado
              {isPositive ? (
                <TrendingUp className="w-3 h-3 text-emerald-500" />
              ) : (
                <TrendingDown className="w-3 h-3 text-rose-500" />
              )}
            </span>
            <span
              className={`text-sm font-bold ${
                isPositive
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatCurrency(lucro)}
            </span>
          </div>
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block flex items-center gap-1">
              <ShoppingBag className="w-3 h-3 text-slate-400" />
              Vendas
            </span>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {vendasCount} {vendasCount === 1 ? 'venda' : 'vendas'}
            </span>
          </div>
        </div>
      </div>

      {/* Button: Entrar na empresa */}
      <button
        id={`btn-enter-company-${company.id}`}
        onClick={() => onEnter(company.id)}
        className="w-full mt-2 py-2.5 px-4 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white dark:bg-indigo-950/60 dark:hover:bg-indigo-600 dark:text-indigo-300 dark:hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-2 group/btn"
      >
        <span>Entrar na empresa</span>
        <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
      </button>
    </div>
  );
};
