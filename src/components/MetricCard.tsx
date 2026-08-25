import React from 'react';
import { LucideIcon } from 'lucide-react';
import { formatCurrency } from '../lib/utils';

interface MetricCardProps {
  id?: string;
  title: string;
  value: number | string;
  isCurrency?: boolean;
  subtitle?: string;
  icon: LucideIcon;
  colorScheme?: 'emerald' | 'rose' | 'indigo' | 'amber' | 'cyan' | 'slate';
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  id,
  title,
  value,
  isCurrency = true,
  subtitle,
  icon: Icon,
  colorScheme = 'indigo',
  trend,
  onClick,
}) => {
  const colorStyles = {
    indigo: {
      bg: 'bg-indigo-50/70 dark:bg-indigo-950/30',
      border: 'border-indigo-100 dark:border-indigo-900/40',
      iconBg: 'bg-indigo-600 text-white',
      valueText: 'text-indigo-950 dark:text-indigo-100',
    },
    emerald: {
      bg: 'bg-emerald-50/70 dark:bg-emerald-950/30',
      border: 'border-emerald-100 dark:border-emerald-900/40',
      iconBg: 'bg-emerald-600 text-white',
      valueText: 'text-emerald-950 dark:text-emerald-100',
    },
    rose: {
      bg: 'bg-rose-50/70 dark:bg-rose-950/30',
      border: 'border-rose-100 dark:border-rose-900/40',
      iconBg: 'bg-rose-600 text-white',
      valueText: 'text-rose-950 dark:text-rose-100',
    },
    amber: {
      bg: 'bg-amber-50/70 dark:bg-amber-950/30',
      border: 'border-amber-100 dark:border-amber-900/40',
      iconBg: 'bg-amber-600 text-white',
      valueText: 'text-amber-950 dark:text-amber-100',
    },
    cyan: {
      bg: 'bg-cyan-50/70 dark:bg-cyan-950/30',
      border: 'border-cyan-100 dark:border-cyan-900/40',
      iconBg: 'bg-cyan-600 text-white',
      valueText: 'text-cyan-950 dark:text-cyan-100',
    },
    slate: {
      bg: 'bg-slate-50 dark:bg-slate-900/50',
      border: 'border-slate-200 dark:border-slate-800',
      iconBg: 'bg-slate-700 text-white',
      valueText: 'text-slate-900 dark:text-slate-100',
    },
  };

  const currentStyle = colorStyles[colorScheme] || colorStyles.indigo;
  const displayValue = typeof value === 'number' && isCurrency ? formatCurrency(value) : value;

  return (
    <div
      id={id}
      onClick={onClick}
      className={`relative p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border ${currentStyle.border} shadow-xs transition-all ${
        onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 leading-tight">
          {title}
        </span>
        <div className={`p-2 sm:p-2.5 rounded-xl ${currentStyle.iconBg} shadow-xs shrink-0`}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
      </div>

      <div className="mt-3">
        <div className={`text-xl sm:text-2xl font-bold tracking-tight ${currentStyle.valueText}`}>
          {displayValue}
        </div>
        {subtitle && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">
            {subtitle}
          </p>
        )}
      </div>

      {trend && (
        <div className="mt-2 flex items-center gap-1.5 text-xs font-medium">
          <span
            className={
              trend.isPositive
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }
          >
            {trend.value}
          </span>
        </div>
      )}
    </div>
  );
};
