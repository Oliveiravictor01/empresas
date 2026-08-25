import {
  Product,
  ItemComposition,
  SaleItem,
  ConsumedItemRecord,
  InventoryMovement,
  PeriodFilter,
  UnitType,
} from '../types';
import { formatCompactStock, formatStockDisplay, convertUnits } from './unitConversion';
import { isDateInPeriod } from './metrics';

export interface ItemCostBreakdown {
  totalCost: number;
  salePrice: number;
  grossMargin: number;
  marginPercentage: number;
  components: Array<{
    productId: string;
    productName: string;
    quantityRequired: number;
    unit: UnitType | string;
    unitCost: number;
    totalItemCost: number;
    shareOfCostPercentage: number;
    availableStock: number;
    stockStatus: 'ok' | 'low' | 'empty';
  }>;
}

// Backward compatibility alias
export type ServiceCostBreakdown = ItemCostBreakdown & { totalSupplyCost: number; items?: any[] };

export interface ItemCapacityResult {
  itemId: string;
  itemName: string;
  maxPossibleUnits: number;
  isAvailable: boolean;
  bottleneckProduct: {
    productId: string;
    productName: string;
    currentStock: number;
    unit: UnitType | string;
    baseUnit?: UnitType | string;
    requiredPerUnit: number;
    possibleWithThisProduct: number;
  } | null;
  componentCapacities: Array<{
    productId: string;
    productName: string;
    requiredPerUnit: number;
    currentStock: number;
    unit: UnitType | string;
    possibleUnits: number;
    isBottleneck: boolean;
  }>;
  statusMessage: string;
}

// Backward compatibility alias
export type ServiceCapacityResult = ItemCapacityResult;

export type StockHealthStatus = 'normal' | 'low' | 'critical' | 'empty';

export interface ProductHealthInfo {
  status: StockHealthStatus;
  statusLabel: string;
  statusColor: string;
  badgeBg: string;
  percentage: number;
  repositionNeeded: number;
  formattedCurrent: string;
  formattedMin: string;
  formattedMax: string;
}

/**
 * Calculates the exact cost and gross profit margin of a product or service.
 * If the item has a composition (Ficha Técnica), calculates the sum of all components.
 * If not, uses its direct cost_price.
 */
export function calculateItemCost(
  item: Product | { sale_price: number; cost_price?: number; composition?: ItemComposition[]; items?: ItemComposition[] },
  allProducts: Product[]
): ItemCostBreakdown {
  const salePrice = Number(item.sale_price) || 0;
  const composition = (item as any).composition || (item as any).items || [];

  if (composition.length === 0) {
    const directCost = Number((item as any).cost_price) || 0;
    const grossMargin = salePrice - directCost;
    const marginPercentage = salePrice > 0 ? (grossMargin / salePrice) * 100 : 0;

    return {
      totalCost: directCost,
      salePrice,
      grossMargin,
      marginPercentage,
      components: [],
    };
  }

  let totalCost = 0;
  const components = composition.map((compItem: ItemComposition) => {
    const matchedProduct = allProducts.find((p) => p.id === compItem.product_id);
    const qtyRequired = Number(compItem.quantity) || 0;
    const unitCost = matchedProduct ? Number(matchedProduct.cost_price || (matchedProduct as any).cost_per_base_unit) || 0 : (compItem.unit_cost_estimate || 0);
    const totalItemCost = qtyRequired * unitCost;
    totalCost += totalItemCost;

    const availableStock = matchedProduct ? Number(matchedProduct.quantity) || 0 : 0;
    let stockStatus: 'ok' | 'low' | 'empty' = 'ok';
    if (availableStock <= 0) stockStatus = 'empty';
    else if (availableStock < qtyRequired * 3) stockStatus = 'low';

    return {
      productId: compItem.product_id,
      productName: matchedProduct ? matchedProduct.name : compItem.product_name,
      quantityRequired: qtyRequired,
      unit: compItem.unit || 'un',
      unitCost,
      totalItemCost,
      shareOfCostPercentage: 0,
      availableStock,
      stockStatus,
    };
  });

  components.forEach((c: any) => {
    c.shareOfCostPercentage = totalCost > 0 ? (c.totalItemCost / totalCost) * 100 : 0;
  });

  const grossMargin = salePrice - totalCost;
  const marginPercentage = salePrice > 0 ? (grossMargin / salePrice) * 100 : 0;

  return {
    totalCost,
    salePrice,
    grossMargin,
    marginPercentage,
    components,
  };
}

// Backward compatibility function
export function calculateServiceCost(
  service: any,
  products: Product[]
): ServiceCostBreakdown {
  const result = calculateItemCost(service, products);
  return {
    ...result,
    totalSupplyCost: result.totalCost,
    items: result.components.map((c) => ({
      ...c,
      quantityRequired: c.quantityRequired,
      costPerBaseUnit: c.unitCost,
    })),
  };
}

/**
 * Calculates max possible capacity (how many units can be delivered) based on available stock of components or direct inventory.
 */
export function calculateItemCapacity(
  item: Product,
  allProducts: Product[]
): ItemCapacityResult {
  const composition = item.composition || (item as any).items || [];

  if (composition.length === 0) {
    if (!item.track_stock) {
      return {
        itemId: item.id,
        itemName: item.name,
        maxPossibleUnits: 9999,
        isAvailable: true,
        bottleneckProduct: null,
        componentCapacities: [],
        statusMessage: 'Item sem controle de estoque (capacidade contínua)',
      };
    }

    const available = Number(item.quantity) || 0;
    return {
      itemId: item.id,
      itemName: item.name,
      maxPossibleUnits: available,
      isAvailable: available > 0,
      bottleneckProduct: available <= 0 ? {
        productId: item.id,
        productName: item.name,
        currentStock: available,
        unit: item.unit,
        baseUnit: item.unit,
        requiredPerUnit: 1,
        possibleWithThisProduct: available,
      } : null,
      componentCapacities: [],
      statusMessage: available > 0 ? `${formatStockDisplay(available, item.unit)} disponíveis` : 'Estoque esgotado',
    };
  }

  let minCapacity = Infinity;
  let bottleneck: ItemCapacityResult['bottleneckProduct'] = null;

  const componentCapacities = composition.map((compItem) => {
    const matchedProduct = allProducts.find((p) => p.id === compItem.product_id);
    const required = Math.max(0.0001, Number(compItem.quantity) || 1);
    const currentStock = matchedProduct ? Number(matchedProduct.quantity) || 0 : 0;
    const possible = Math.floor(currentStock / required);

    if (possible < minCapacity) {
      minCapacity = possible;
      bottleneck = {
        productId: compItem.product_id,
        productName: matchedProduct ? matchedProduct.name : compItem.product_name,
        currentStock,
        unit: compItem.unit || (matchedProduct ? matchedProduct.unit : 'un'),
        baseUnit: compItem.unit || (matchedProduct ? matchedProduct.unit : 'un'),
        requiredPerUnit: required,
        possibleWithThisProduct: possible,
      };
    }

    return {
      productId: compItem.product_id,
      productName: matchedProduct ? matchedProduct.name : compItem.product_name,
      requiredPerUnit: required,
      currentStock,
      unit: compItem.unit || (matchedProduct ? matchedProduct.unit : 'un'),
      possibleUnits: possible,
      isBottleneck: false,
    };
  });

  const maxPossible = minCapacity === Infinity ? 0 : Math.max(0, minCapacity);

  componentCapacities.forEach((cc) => {
    if (bottleneck && cc.productId === bottleneck.productId) {
      cc.isBottleneck = true;
    }
  });

  return {
    itemId: item.id,
    itemName: item.name,
    maxPossibleUnits: maxPossible,
    isAvailable: maxPossible > 0,
    bottleneckProduct: bottleneck,
    componentCapacities,
    statusMessage:
      maxPossible > 0
        ? `Capacidade para ${maxPossible} unidade(s)`
        : `Estoque insuficiente de ${bottleneck?.productName || 'componente'}`,
  };
}

// Backward compatibility alias
export function calculateServiceCapacity(service: any, products: Product[]): ServiceCapacityResult {
  return calculateItemCapacity(service as Product, products);
}

/**
 * Health assessment of a product's current stock level relative to min/max thresholds.
 */
export function getProductHealthInfo(product: Product): ProductHealthInfo {
  const current = Number(product.quantity) || 0;
  const min = Number(product.min_quantity) || 0;
  const max = Number(product.max_quantity) || (min > 0 ? min * 3 : 100);
  const unit = product.unit || product.control_unit || 'un';

  let status: StockHealthStatus = 'normal';
  let statusLabel = 'Estoque Normal';
  let statusColor = 'text-emerald-600 dark:text-emerald-400';
  let badgeBg = 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300';

  if (current <= 0) {
    status = 'empty';
    statusLabel = 'Estoque Zerado';
    statusColor = 'text-rose-600 dark:text-rose-400 font-extrabold';
    badgeBg = 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900';
  } else if (current < min * 0.5) {
    status = 'critical';
    statusLabel = 'Estoque Crítico';
    statusColor = 'text-rose-500 dark:text-rose-400';
    badgeBg = 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300';
  } else if (current <= min) {
    status = 'low';
    statusLabel = 'Estoque Baixo';
    statusColor = 'text-amber-500 dark:text-amber-400';
    badgeBg = 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300';
  }

  const percentage = min > 0 ? (current / min) * 100 : 100;
  const repositionNeeded = Math.max(0, max - current);

  return {
    status,
    statusLabel,
    statusColor,
    badgeBg,
    percentage,
    repositionNeeded,
    formattedCurrent: formatStockDisplay(current, unit),
    formattedMin: formatCompactStock(min, unit),
    formattedMax: formatCompactStock(max, unit),
  };
}

/**
 * Calculates stock deductions and consumed component records for a list of sold items.
 */
export function calculateSaleDeductions(
  saleItems: SaleItem[],
  allProducts: Product[]
): {
  consumedRecords: ConsumedItemRecord[];
  stockUpdates: Map<string, { newQty: number; deductQty: number; product: Product }>;
  totalCost: number;
} {
  const consumedRecords: ConsumedItemRecord[] = [];
  const stockUpdates = new Map<string, { newQty: number; deductQty: number; product: Product }>();
  let totalCost = 0;

  saleItems.forEach((saleItem) => {
    const matched = allProducts.find((p) => p.id === saleItem.product_id);
    const saleQty = Number(saleItem.quantity) || 0;
    if (saleQty <= 0) return;

    const composition = matched?.composition || [];

    if (composition.length > 0) {
      // Item has composition (Ficha Técnica) -> deduct each component
      composition.forEach((comp) => {
        const compProd = allProducts.find((p) => p.id === comp.product_id);
        const compDeductQty = (Number(comp.quantity) || 0) * saleQty;
        const compUnitCost = compProd ? Number(compProd.cost_price) || 0 : (comp.unit_cost_estimate || 0);
        const compTotalCost = compDeductQty * compUnitCost;
        totalCost += compTotalCost;

        consumedRecords.push({
          product_id: comp.product_id,
          product_name: compProd ? compProd.name : comp.product_name,
          quantity: compDeductQty,
          unit: comp.unit || (compProd ? compProd.unit : 'un'),
          unit_cost: compUnitCost,
          total_cost: compTotalCost,
        });

        if (compProd && compProd.track_stock) {
          const currentEntry = stockUpdates.get(compProd.id);
          const prevDeduct = currentEntry ? currentEntry.deductQty : 0;
          const newDeduct = prevDeduct + compDeductQty;
          stockUpdates.set(compProd.id, {
            newQty: (Number(compProd.quantity) || 0) - newDeduct,
            deductQty: newDeduct,
            product: compProd,
          });
        }
      });
    } else if (matched && matched.type === 'Produto' && matched.track_stock) {
      // Direct product with stock control -> deduct product stock
      const prodCost = Number(matched.cost_price) || 0;
      const itemCost = saleQty * prodCost;
      totalCost += itemCost;

      consumedRecords.push({
        product_id: matched.id,
        product_name: matched.name,
        quantity: saleQty,
        unit: matched.unit || 'un',
        unit_cost: prodCost,
        total_cost: itemCost,
      });

      const currentEntry = stockUpdates.get(matched.id);
      const prevDeduct = currentEntry ? currentEntry.deductQty : 0;
      const newDeduct = prevDeduct + saleQty;
      stockUpdates.set(matched.id, {
        newQty: (Number(matched.quantity) || 0) - newDeduct,
        deductQty: newDeduct,
        product: matched,
      });
    } else if (matched) {
      // Service or product without stock control
      const prodCost = Number(matched.cost_price) || 0;
      totalCost += saleQty * prodCost;
    }
  });

  return {
    consumedRecords,
    stockUpdates,
    totalCost,
  };
}

/**
 * Calculates consumption analytics per product across a given time window.
 */
export function calculateConsumptionAnalytics(
  movements: InventoryMovement[],
  products: Product[],
  companyId: string | null = null,
  period: PeriodFilter = '30dias'
) {
  const filteredProducts = products.filter((p) => {
    if (companyId && p.company_id !== companyId) return false;
    return p.track_stock;
  });

  const periodMovements = movements.filter((m) => {
    if (companyId && m.company_id !== companyId) return false;
    if (m.type !== 'saida') return false;
    return isDateInPeriod(m.date, period);
  });

  let daysInPeriod = 30;
  if (period === '7dias') daysInPeriod = 7;
  else if (period === 'hoje') daysInPeriod = 1;

  let totalPeriodCost = 0;

  const items = filteredProducts.map((product) => {
    const prodMovements = periodMovements.filter((m) => m.product_id === product.id);
    const totalQuantityConsumed = prodMovements.reduce((sum, m) => sum + Number(m.quantity || 0), 0);
    const unitCost = Number(product.cost_price) || 0;
    const totalCostConsumed = totalQuantityConsumed * unitCost;
    totalPeriodCost += totalCostConsumed;

    const dailyAverage = totalQuantityConsumed / daysInPeriod;
    const currentStock = Number(product.quantity) || 0;
    const daysRemaining = dailyAverage > 0 ? Math.floor(currentStock / dailyAverage) : 999;

    const maxStock = Number(product.max_quantity) || Number(product.min_quantity) * 3 || 100;
    const recommendedBuyQty = Math.max(0, maxStock - currentStock);
    const estimatedBuyCost = recommendedBuyQty * unitCost;

    return {
      product,
      unit: product.unit || 'un',
      baseUnit: product.unit || 'un',
      totalQuantityConsumed,
      totalCostConsumed,
      dailyAverage,
      daysRemaining,
      recommendedBuyQty,
      estimatedBuyCost,
    };
  });

  return {
    period,
    daysInPeriod,
    totalPeriodCost,
    items,
  };
}
