import React from 'react';
import { PeriodFilter } from '../types';
import { useApp } from '../context/AppContext';
import { Calendar, Filter } from 'lucide-react';

export const PeriodSelector: React.FC = () => {
  const { periodFilter, setPeriodFilter, customDateRange, setCustomDateRange } = useApp();

  const options: { id: PeriodFilter; label: string }[] = [
    { id: 'hoje', label: 'Hoje' },
    { id: '7dias', label: '7 dias' },
    { id: '30dias', label: '30 dias' },
    { id: 'esteMes', label: 'Este mês' },
    { id: 'mesAnterior', label: 'Mês anterior' },
    { id: 'personalizado', label: 'Personalizado' },
  ];

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full">
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-x-auto max-w-full no-scrollbar">
        <div className="px-2 text-slate-400">
          <Filter className="w-3.5 h-3.5" />
        </div>
        {options.map((opt) => {
          const isActive = periodFilter === opt.id;
          return (
            <button
              key={opt.id}
              id={`period-filter-${opt.id}`}
              onClick={() => setPeriodFilter(opt.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all touch-manipulation ${
                isActive
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {periodFilter === 'personalizado' && (
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
          <Calendar className="w-3.5 h-3.5 text-indigo-500 ml-1" />
          <input
            type="date"
            value={customDateRange.start}
            onChange={(e) =>
              setCustomDateRange({ ...customDateRange, start: e.target.value })
            }
            className="bg-transparent border-0 text-slate-700 dark:text-slate-200 focus:ring-0 p-0 text-xs"
          />
          <span className="text-slate-400">até</span>
          <input
            type="date"
            value={customDateRange.end}
            onChange={(e) =>
              setCustomDateRange({ ...customDateRange, end: e.target.value })
            }
            className="bg-transparent border-0 text-slate-700 dark:text-slate-200 focus:ring-0 p-0 text-xs"
          />
        </div>
      )}
    </div>
  );
};
