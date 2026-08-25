import { UnitType } from '../types';

export const UNIT_OPTIONS: { value: UnitType; label: string; shortLabel: string }[] = [
  { value: 'un', label: 'Unidade (un)', shortLabel: 'un' },
  { value: 'L', label: 'Litro (L)', shortLabel: 'L' },
  { value: 'ml', label: 'Mililitro (ml)', shortLabel: 'ml' },
  { value: 'kg', label: 'Quilograma (kg)', shortLabel: 'kg' },
  { value: 'g', label: 'Grama (g)', shortLabel: 'g' },
  { value: 'm', label: 'Metro (m)', shortLabel: 'm' },
  { value: 'cm', label: 'Centímetro (cm)', shortLabel: 'cm' },
  { value: 'cx', label: 'Caixa (cx)', shortLabel: 'cx' },
  { value: 'pct', label: 'Pacote (pct)', shortLabel: 'pct' },
  { value: 'outro', label: 'Outro', shortLabel: 'outro' },
];

export function getUnitLabel(unit: UnitType | string = 'un'): string {
  const found = UNIT_OPTIONS.find((u) => u.value === unit);
  return found ? found.label : unit;
}

export function getUnitShortLabel(unit: UnitType | string = 'un'): string {
  const found = UNIT_OPTIONS.find((u) => u.value === unit);
  return found ? found.shortLabel : unit;
}

/**
 * Cleanly formats a quantity number with its unit, properly handling decimals (e.g. 0.5 L, 1.25 kg, 250 ml, 2.5 m, 100 un).
 */
export function formatStockDisplay(
  quantity: number,
  unit: UnitType | string = 'un'
): string {
  const qty = Number(quantity) || 0;
  const unitStr = getUnitShortLabel(unit);

  const formattedNum = qty.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });

  return `${formattedNum} ${unitStr}`;
}

export function formatCompactStock(
  quantity: number,
  unit: UnitType | string = 'un'
): string {
  const qty = Number(quantity) || 0;
  const unitStr = getUnitShortLabel(unit);

  const formattedNum = qty.toLocaleString('pt-BR', {
    maximumFractionDigits: 2,
  });

  return `${formattedNum} ${unitStr}`;
}

/**
 * Helper to normalize units when converting between related units (e.g. L <-> ml, kg <-> g, m <-> cm).
 */
export function convertUnits(
  quantity: number,
  fromUnit: UnitType | string,
  toUnit: UnitType | string
): number {
  const qty = Number(quantity) || 0;
  if (fromUnit === toUnit) return qty;

  // Volume
  if (fromUnit === 'L' && toUnit === 'ml') return qty * 1000;
  if (fromUnit === 'ml' && toUnit === 'L') return qty / 1000;

  // Mass
  if (fromUnit === 'kg' && toUnit === 'g') return qty * 1000;
  if (fromUnit === 'g' && toUnit === 'kg') return qty / 1000;

  // Length
  if (fromUnit === 'm' && toUnit === 'cm') return qty * 100;
  if (fromUnit === 'cm' && toUnit === 'm') return qty / 100;

  return qty;
}

/**
 * Backward compatibility helper for legacy base unit operations.
 */
export function toBaseUnit(
  quantity: number,
  unit: UnitType | string = 'un'
): { baseQuantity: number; baseUnit: string } {
  return {
    baseQuantity: Number(quantity) || 0,
    baseUnit: String(unit || 'un'),
  };
}

export function calculatePurchaseCosts(
  totalCost: number,
  quantity: number,
  unit: UnitType | string = 'un'
): {
  costPerUnit: number;
  costPerBaseUnit: number;
  baseQuantity: number;
  baseUnit: string;
} {
  const cost = Math.max(0, Number(totalCost) || 0);
  const qty = Math.max(0.0001, Number(quantity) || 1);
  const costPerUnit = cost / qty;

  return {
    costPerUnit,
    costPerBaseUnit: costPerUnit,
    baseQuantity: qty,
    baseUnit: String(unit || 'un'),
  };
}
