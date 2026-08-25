import {
  AppData,
  Company,
  Sale,
  Expense,
  AccountPayable,
  AccountReceivable,
  Product,
  PeriodFilter,
} from '../types';
import { getTodayDateString } from './utils';

export interface FilteredMetrics {
  totalRevenue: number;
  totalExpenses: number;
  estimatedProfit: number;
  totalSalesCount: number;
  totalPayablesPending: number;
  totalReceivablesPending: number;
  lowStockCount: number;
  salesList: Sale[];
  expensesList: Expense[];
  payablesList: AccountPayable[];
  receivablesList: AccountReceivable[];
  chartData: Array<{
    date: string;
    label: string;
    faturamento: number;
    despesas: number;
    lucro: number;
  }>;
}

export function isDateInPeriod(
  dateStr: string,
  filter: PeriodFilter,
  customRange?: { start: string; end: string }
): boolean {
  if (!dateStr) return false;
  const dateOnly = dateStr.split('T')[0];
  const today = getTodayDateString();

  if (filter === 'hoje') {
    return dateOnly === today;
  }

  const dateObj = new Date(dateOnly + 'T12:00:00');
  const now = new Date();

  if (filter === '7dias') {
    const diffTime = now.getTime() - dateObj.getTime();
    const diffDays = diffTime / (1000 * 3600 * 24);
    return diffDays >= -1 && diffDays <= 7;
  }

  if (filter === '30dias') {
    const diffTime = now.getTime() - dateObj.getTime();
    const diffDays = diffTime / (1000 * 3600 * 24);
    return diffDays >= -1 && diffDays <= 30;
  }

  if (filter === 'esteMes') {
    const [y, m] = dateOnly.split('-');
    const currentYear = String(now.getFullYear());
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    return y === currentYear && m === currentMonth;
  }

  if (filter === 'mesAnterior') {
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevYear = String(prevMonthDate.getFullYear());
    const prevMonth = String(prevMonthDate.getMonth() + 1).padStart(2, '0');
    const [y, m] = dateOnly.split('-');
    return y === prevYear && m === prevMonth;
  }

  if (filter === 'personalizado' && customRange) {
    return dateOnly >= customRange.start && dateOnly <= customRange.end;
  }

  return true;
}

export function calculateMetrics(
  data: AppData,
  companyId: string | null,
  periodFilter: PeriodFilter,
  customRange?: { start: string; end: string },
  allowedCompanyIds?: string[]
): FilteredMetrics {
  // Filter by company or allowed companies
  const filterByAllowed = <T extends { company_id: string }>(items: T[]): T[] => {
    if (companyId) {
      return items.filter((item) => item.company_id === companyId);
    }
    if (allowedCompanyIds && allowedCompanyIds.length > 0 && !allowedCompanyIds.includes('*')) {
      return items.filter((item) => allowedCompanyIds.includes(item.company_id));
    }
    return items;
  };

  const salesByCompany = filterByAllowed(data.sales);
  const expensesByCompany = filterByAllowed(data.expenses);
  const payablesByCompany = filterByAllowed(data.accountsPayable);
  const receivablesByCompany = filterByAllowed(data.accountsReceivable);
  const productsByCompany = filterByAllowed(data.products);

  // Filter by period
  const filteredSales = salesByCompany.filter((s) =>
    isDateInPeriod(s.date, periodFilter, customRange)
  );

  const filteredExpenses = expensesByCompany.filter((e) =>
    isDateInPeriod(e.date, periodFilter, customRange)
  );

  // Totals
  const totalRevenue = filteredSales
    .filter((s) => s.status !== 'Cancelada')
    .reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);

  const totalExpenses = filteredExpenses.reduce(
    (sum, e) => sum + (Number(e.amount) || 0),
    0
  );

  const estimatedProfit = totalRevenue - totalExpenses;
  const totalSalesCount = filteredSales.filter((s) => s.status !== 'Cancelada').length;

  const totalPayablesPending = payablesByCompany
    .filter((p) => p.status === 'Pendente' || p.status === 'Vencido')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const totalReceivablesPending = receivablesByCompany
    .filter((r) => r.status === 'Pendente' || r.status === 'Atrasado')
    .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  const lowStockCount = productsByCompany.filter(
    (p) => Number(p.quantity) <= Number(p.min_quantity)
  ).length;

  // Generate chart data grouped by date or day
  const dateMap = new Map<string, { faturamento: number; despesas: number }>();

  filteredSales.forEach((s) => {
    if (s.status === 'Cancelada') return;
    const d = s.date?.split('T')[0] || getTodayDateString();
    const current = dateMap.get(d) || { faturamento: 0, despesas: 0 };
    current.faturamento += Number(s.total_amount) || 0;
    dateMap.set(d, current);
  });

  filteredExpenses.forEach((e) => {
    const d = e.date?.split('T')[0] || getTodayDateString();
    const current = dateMap.get(d) || { faturamento: 0, despesas: 0 };
    current.despesas += Number(e.amount) || 0;
    dateMap.set(d, current);
  });

  // Sort dates
  const sortedDates = Array.from(dateMap.keys()).sort();
  const chartData = sortedDates.map((d) => {
    const val = dateMap.get(d)!;
    const [year, month, day] = d.split('-');
    const label = day && month ? `${day}/${month}` : d;
    return {
      date: d,
      label,
      faturamento: val.faturamento,
      despesas: val.despesas,
      lucro: val.faturamento - val.despesas,
    };
  });

  // If chartData is empty, add at least today with zero so charts render cleanly
  if (chartData.length === 0) {
    const today = getTodayDateString();
    const [year, month, day] = today.split('-');
    chartData.push({
      date: today,
      label: `${day}/${month}`,
      faturamento: 0,
      despesas: 0,
      lucro: 0,
    });
  }

  return {
    totalRevenue,
    totalExpenses,
    estimatedProfit,
    totalSalesCount,
    totalPayablesPending,
    totalReceivablesPending,
    lowStockCount,
    salesList: filteredSales,
    expensesList: filteredExpenses,
    payablesList: payablesByCompany,
    receivablesList: receivablesByCompany,
    chartData,
  };
}

export interface CompanySummary {
  company: Company;
  faturamento: number;
  despesas: number;
  lucro: number;
  vendasCount: number;
  marginPercent: number;
}

export function getCompanySummaries(
  data: AppData,
  periodFilter: PeriodFilter,
  customRange?: { start: string; end: string },
  companiesList?: Company[]
): CompanySummary[] {
  const targetCompanies = companiesList && companiesList.length > 0 ? companiesList : data.companies;
  return targetCompanies.map((company) => {
    const sales = data.sales.filter(
      (s) =>
        s.company_id === company.id &&
        s.status !== 'Cancelada' &&
        isDateInPeriod(s.date, periodFilter, customRange)
    );
    const expenses = data.expenses.filter(
      (e) =>
        e.company_id === company.id &&
        isDateInPeriod(e.date, periodFilter, customRange)
    );

    const faturamento = sales.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);
    const despesas = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const lucro = faturamento - despesas;
    const vendasCount = sales.length;
    const marginPercent = faturamento > 0 ? (lucro / faturamento) * 100 : 0;

    return {
      company,
      faturamento,
      despesas,
      lucro,
      vendasCount,
      marginPercent,
    };
  });
}
