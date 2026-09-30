import { BusinessSettings, CartItem, Customer, Product, SellingTier } from '../types';

export interface TierOption {
  tier: SellingTier;
  packageTierId?: string; // Optional reference to specific package tier
  name: string; // e.g., 'Full Carton', '¾ Carton', 'Half Carton', 'Quarter Carton', 'Single Piece'
  multiplier: number; // physical base units deducted: e.g. 24, 18, 12, 6, 1
  fraction: number; // 1, 0.75, 0.5, 0.25, or 0 (piece)
  priceUSD: number;
  priceLRD: number;
  label: string; // formatted label with price
  shortBadge: string; // e.g., "Full Carton (24 pcs)", "¾ Carton (18 pcs)"
  pieceCountLabel: string; // e.g., "24 pcs"
  isCustomPrice: boolean;
}

/**
 * Validates whether a fraction (e.g. 0.75, 0.5, 0.25) produces a mathematically
 * valid physical quantity of base units. If allowFractions is false (e.g. discrete
 * bottles/cans/pieces), the resulting base units must be a whole integer.
 */
export function isValidFractionQuantity(
  multiplier: number,
  fraction: number,
  allowFractions: boolean = false
): { isValid: boolean; units: number } {
  const rawUnits = multiplier * fraction;
  if (rawUnits <= 0) return { isValid: false, units: 0 };
  if (allowFractions) {
    return { isValid: true, units: Math.round(rawUnits * 100) / 100 };
  }
  // For discrete units (bottles, sachets, pieces), rawUnits must be a whole number
  const isWhole = Math.abs(rawUnits - Math.round(rawUnits)) < 0.001;
  return {
    isValid: isWhole,
    units: Math.round(rawUnits),
  };
}

/**
 * Returns available selling tiers (Full, ¾, ½, ¼, Piece) for a product.
 * Automatically HIDES or DISABLES any fraction that produces an invalid physical
 * base unit quantity (e.g. 10 bottles * 0.75 = 7.5 bottles -> INVALID for discrete goods).
 * Respects manual price overrides set on the product if present, or suggests
 * mathematically proportional defaults.
 */
export function getSellingTiers(
  product: Product,
  exchangeRate: number,
  selectedPackageTierId?: string
): TierOption[] {
  const rate = exchangeRate > 0 ? exchangeRate : 195;
  const basePriceUSD = product.sellingPriceUSD || 0;
  const basePriceLRD = product.sellingPriceLRD || Math.round(basePriceUSD * rate);
  const allowFractions = Boolean(product.allowFractions);

  // Check if product has flexible package tiers configured
  const activePackageTier = product.packageTiers && product.packageTiers.length > 0
    ? (selectedPackageTierId
        ? product.packageTiers.find((t) => t.id === selectedPackageTierId) || product.packageTiers[0]
        : product.packageTiers[0])
    : null;

  const mult = activePackageTier
    ? activePackageTier.multiplier
    : (product.packageMultiplier || 1);
  const pkgName = activePackageTier
    ? activePackageTier.name
    : ((product.packageUnitName || 'Carton').trim());

  // If product does not have any package unit defined or multiplier is <= 1, return single piece only
  if ((!product.hasPackageUnit && !activePackageTier) || mult <= 1) {
    return [
      {
        tier: 'PIECE',
        name: 'Single Piece',
        multiplier: 1,
        fraction: 0,
        priceUSD: basePriceUSD,
        priceLRD: basePriceLRD,
        label: `Single Piece (1 pc) — $${basePriceUSD.toFixed(2)} / L$ ${basePriceLRD.toLocaleString()}`,
        shortBadge: '1 pc',
        pieceCountLabel: '1 pc',
        isCustomPrice: false,
      },
    ];
  }

  // 1. FULL TIER (fraction = 1.0)
  const fullPriceUSD = activePackageTier
    ? (activePackageTier.packagePriceUSD || Math.round(basePriceUSD * mult * 0.9 * 100) / 100)
    : (typeof product.packagePriceUSD === 'number' && product.packagePriceUSD > 0
        ? product.packagePriceUSD
        : Math.round(basePriceUSD * mult * 0.9 * 100) / 100);
  const fullPriceLRD = activePackageTier && activePackageTier.packagePriceLRD
    ? activePackageTier.packagePriceLRD
    : (typeof product.packagePriceLRD === 'number' && product.packagePriceLRD > 0
        ? product.packagePriceLRD
        : Math.round(fullPriceUSD * rate));

  const tiers: TierOption[] = [
    {
      tier: 'FULL',
      packageTierId: activePackageTier?.id,
      name: `Full ${pkgName}`,
      multiplier: mult,
      fraction: 1.0,
      priceUSD: fullPriceUSD,
      priceLRD: fullPriceLRD,
      label: `Full ${pkgName} (${mult} pcs) — $${fullPriceUSD.toFixed(2)} / L$ ${fullPriceLRD.toLocaleString()}`,
      shortBadge: `Full ${pkgName} (${mult} pcs)`,
      pieceCountLabel: `${mult} pcs`,
      isCustomPrice: Boolean(activePackageTier ? activePackageTier.packagePriceUSD : product.packagePriceUSD),
    },
  ];

  // 2. THREE-QUARTERS TIER (fraction = 0.75)
  // Check if 0.75 * mult produces a valid physical integer (e.g., 12 * 0.75 = 9 -> VALID; 10 * 0.75 = 7.5 -> INVALID)
  const threeQuarterCheck = isValidFractionQuantity(mult, 0.75, allowFractions);
  if (threeQuarterCheck.isValid && threeQuarterCheck.units < mult && threeQuarterCheck.units > 0) {
    const isCustomThreeQuarter = typeof product.threeQuarterPackagePriceUSD === 'number' && product.threeQuarterPackagePriceUSD > 0;
    const threeQuarterPriceUSD = isCustomThreeQuarter
      ? product.threeQuarterPackagePriceUSD!
      : Math.round((fullPriceUSD * 0.75) * 100) / 100;
    const threeQuarterPriceLRD = typeof product.threeQuarterPackagePriceLRD === 'number' && product.threeQuarterPackagePriceLRD > 0
      ? product.threeQuarterPackagePriceLRD
      : Math.round(threeQuarterPriceUSD * rate);

    tiers.push({
      tier: 'THREE_QUARTERS',
      packageTierId: activePackageTier?.id,
      name: `¾ ${pkgName}`,
      multiplier: threeQuarterCheck.units,
      fraction: 0.75,
      priceUSD: threeQuarterPriceUSD,
      priceLRD: threeQuarterPriceLRD,
      label: `¾ ${pkgName} (${threeQuarterCheck.units} pcs) — $${threeQuarterPriceUSD.toFixed(2)} / L$ ${threeQuarterPriceLRD.toLocaleString()}`,
      shortBadge: `¾ ${pkgName} (${threeQuarterCheck.units} pcs)`,
      pieceCountLabel: `${threeQuarterCheck.units} pcs`,
      isCustomPrice: isCustomThreeQuarter,
    });
  }

  // 3. HALF TIER (fraction = 0.50)
  // Check if 0.50 * mult produces a valid physical integer (e.g., 12 * 0.5 = 6 -> VALID; 10 * 0.5 = 5 -> VALID)
  const halfCheck = isValidFractionQuantity(mult, 0.50, allowFractions);
  if (halfCheck.isValid && halfCheck.units < mult && halfCheck.units > 0) {
    const isCustomHalf = typeof product.halfPackagePriceUSD === 'number' && product.halfPackagePriceUSD > 0;
    const halfPriceUSD = isCustomHalf
      ? product.halfPackagePriceUSD!
      : Math.round((fullPriceUSD * 0.50) * 100) / 100;
    const halfPriceLRD = typeof product.halfPackagePriceLRD === 'number' && product.halfPackagePriceLRD > 0
      ? product.halfPackagePriceLRD
      : Math.round(halfPriceUSD * rate);

    tiers.push({
      tier: 'HALF',
      packageTierId: activePackageTier?.id,
      name: `½ ${pkgName}`,
      multiplier: halfCheck.units,
      fraction: 0.50,
      priceUSD: halfPriceUSD,
      priceLRD: halfPriceLRD,
      label: `½ ${pkgName} (${halfCheck.units} pcs) — $${halfPriceUSD.toFixed(2)} / L$ ${halfPriceLRD.toLocaleString()}`,
      shortBadge: `½ ${pkgName} (${halfCheck.units} pcs)`,
      pieceCountLabel: `${halfCheck.units} pcs`,
      isCustomPrice: isCustomHalf,
    });
  }

  // 4. QUARTER TIER (fraction = 0.25)
  // Check if 0.25 * mult produces a valid physical integer (e.g., 12 * 0.25 = 3 -> VALID; 10 * 0.25 = 2.5 -> INVALID)
  const quarterCheck = isValidFractionQuantity(mult, 0.25, allowFractions);
  if (quarterCheck.isValid && quarterCheck.units < mult && quarterCheck.units > 0 && quarterCheck.units !== halfCheck.units) {
    const isCustomQuarter = typeof product.quarterPackagePriceUSD === 'number' && product.quarterPackagePriceUSD > 0;
    const quarterPriceUSD = isCustomQuarter
      ? product.quarterPackagePriceUSD!
      : Math.round((fullPriceUSD * 0.25) * 100) / 100;
    const quarterPriceLRD = typeof product.quarterPackagePriceLRD === 'number' && product.quarterPackagePriceLRD > 0
      ? product.quarterPackagePriceLRD
      : Math.round(quarterPriceUSD * rate);

    tiers.push({
      tier: 'QUARTER',
      packageTierId: activePackageTier?.id,
      name: `¼ ${pkgName}`,
      multiplier: quarterCheck.units,
      fraction: 0.25,
      priceUSD: quarterPriceUSD,
      priceLRD: quarterPriceLRD,
      label: `¼ ${pkgName} (${quarterCheck.units} pcs) — $${quarterPriceUSD.toFixed(2)} / L$ ${quarterPriceLRD.toLocaleString()}`,
      shortBadge: `¼ ${pkgName} (${quarterCheck.units} pcs)`,
      pieceCountLabel: `${quarterCheck.units} pcs`,
      isCustomPrice: isCustomQuarter,
    });
  }

  // 5. SINGLE PIECE (always available so cashier can sell individual loose units directly)
  tiers.push({
    tier: 'PIECE',
    name: 'Single Piece',
    multiplier: 1,
    fraction: 0,
    priceUSD: basePriceUSD,
    priceLRD: basePriceLRD,
    label: `Single Piece (1 pc) — $${basePriceUSD.toFixed(2)} / L$ ${basePriceLRD.toLocaleString()}`,
    shortBadge: '1 pc',
    pieceCountLabel: '1 pc',
    isCustomPrice: false,
  });

  return tiers;
}

/**
 * Human-friendly stock formatter:
 * Displays base units AND carton breakdown without changing the underlying base-unit value.
 * Example: 111 bottles with 12-multiplier -> "111 Bottles (Equivalent: 9 Cartons + 3 Bottles)"
 */
export function formatStockWithCartons(
  currentStock: number,
  multiplier?: number,
  packageUnitName: string = 'Carton',
  baseSymbol: string = 'Bottles'
): {
  baseStock: number;
  baseFormatted: string;
  cartonCount: number;
  remainderCount: number;
  breakdownFormatted: string | null;
  equivalentText: string;
  fullDisplay: string;
} {
  const stock = Number(currentStock) || 0;
  const baseFormatted = `${stock.toLocaleString()} ${baseSymbol}`;

  if (!multiplier || multiplier <= 1) {
    return {
      baseStock: stock,
      baseFormatted,
      cartonCount: 0,
      remainderCount: stock,
      breakdownFormatted: null,
      equivalentText: baseFormatted,
      fullDisplay: baseFormatted,
    };
  }

  const pkgSingular = packageUnitName.toLowerCase().replace(/s$/, '').trim() || 'carton';
  const pkgCapital = pkgSingular.charAt(0).toUpperCase() + pkgSingular.slice(1);
  const pkgPlural = pkgSingular.endsWith('x') || pkgSingular.endsWith('ch') || pkgSingular.endsWith('sh')
    ? `${pkgCapital}es`
    : `${pkgCapital}s`;

  if (stock <= 0) {
    return {
      baseStock: stock,
      baseFormatted,
      cartonCount: 0,
      remainderCount: 0,
      breakdownFormatted: `0 ${pkgPlural}`,
      equivalentText: `Equivalent: 0 ${pkgPlural}`,
      fullDisplay: `${baseFormatted} (Equivalent: 0 ${pkgPlural})`,
    };
  }

  const cartons = Math.floor(stock / multiplier);
  const remainder = stock % multiplier;

  let breakdownFormatted = '';
  if (cartons > 0 && remainder > 0) {
    const unitLabel = cartons === 1 ? pkgCapital : pkgPlural;
    breakdownFormatted = `${cartons} ${unitLabel} + ${remainder} ${baseSymbol}`;
  } else if (cartons > 0 && remainder === 0) {
    const unitLabel = cartons === 1 ? pkgCapital : pkgPlural;
    breakdownFormatted = `${cartons} ${unitLabel}`;
  } else {
    breakdownFormatted = `${remainder} ${baseSymbol}`;
  }

  const equivalentText = `Equivalent: ${breakdownFormatted}`;

  return {
    baseStock: stock,
    baseFormatted,
    cartonCount: cartons,
    remainderCount: remainder,
    breakdownFormatted,
    equivalentText,
    fullDisplay: `${baseFormatted} (${equivalentText})`,
  };
}

export interface TaxCalculationResult {
  taxEnabled: boolean;
  taxName: string;
  taxRatePercent: number;
  taxCalculationType: 'EXCLUSIVE' | 'INCLUSIVE';
  subtotalUSD: number;
  subtotalLRD: number;
  discountUSD: number;
  netSubtotalUSD: number;
  taxableAmountUSD: number;
  taxableAmountLRD: number;
  exemptAmountUSD: number;
  zeroRatedAmountUSD: number;
  taxUSD: number;
  taxLRD: number;
  grandTotalUSD: number;
  grandTotalLRD: number;
  customerTaxExemptApplied: boolean;
}

/**
 * Line-aware tax computation:
 * Correctly computes Tax-Exclusive and Tax-Inclusive taxes, respecting:
 * - Product taxStatus ('TAXABLE', 'ZERO_RATED', 'EXEMPT')
 * - Customer deliberate tax exemption
 * - Proportionate discount deduction before tax
 * - Precision rounding in USD and LRD
 */
export function calculateOrderTax(params: {
  items: CartItem[];
  overallDiscountUSD: number;
  settings: BusinessSettings;
  exchangeRate: number;
  customerTaxExempt?: boolean;
}): TaxCalculationResult {
  const { items, overallDiscountUSD, settings, exchangeRate, customerTaxExempt } = params;

  const rate = exchangeRate > 0 ? exchangeRate : 195;
  const taxEnabled = Boolean(settings.taxEnabled);
  const taxName = (settings.taxName || 'GST').trim();
  const taxRatePercent = typeof settings.taxRatePercent === 'number' && settings.taxRatePercent >= 0
    ? settings.taxRatePercent
    : 10;
  const taxCalculationType: 'EXCLUSIVE' | 'INCLUSIVE' =
    settings.taxCalculationType === 'INCLUSIVE' ? 'INCLUSIVE' : 'EXCLUSIVE';

  const subtotalUSD = Math.round(items.reduce((sum, it) => sum + (it.totalUSD || 0), 0) * 100) / 100;
  const discountUSD = Math.min(subtotalUSD, Math.max(0, overallDiscountUSD || 0));
  const netSubtotalUSD = Math.max(0, subtotalUSD - discountUSD);

  // Proportional discount ratio to allocate discount across each line item
  const discountRatio = subtotalUSD > 0 ? (netSubtotalUSD / subtotalUSD) : 1;

  let taxableGrossUSD = 0;
  let exemptGrossUSD = 0;
  let zeroRatedGrossUSD = 0;

  items.forEach((item) => {
    const lineTotal = item.totalUSD || 0;
    const lineNet = Math.round(lineTotal * discountRatio * 10000) / 10000;

    // If customer has deliberate exemption applied, line is exempt
    if (customerTaxExempt) {
      exemptGrossUSD += lineNet;
      return;
    }

    const status = item.taxStatus || item.product?.taxStatus || 'TAXABLE';
    if (status === 'EXEMPT') {
      exemptGrossUSD += lineNet;
    } else if (status === 'ZERO_RATED') {
      zeroRatedGrossUSD += lineNet;
    } else {
      // TAXABLE
      taxableGrossUSD += lineNet;
    }
  });

  let taxUSD = 0;
  let taxableAmountUSD = 0;
  let grandTotalUSD = 0;

  if (!taxEnabled || taxRatePercent <= 0) {
    taxUSD = 0;
    taxableAmountUSD = 0;
    grandTotalUSD = netSubtotalUSD;
  } else if (taxCalculationType === 'INCLUSIVE') {
    // TAX-INCLUSIVE:
    // Prices ALREADY contain the tax!
    // Example: $100 price with 10% tax -> Net Base = $90.91, Tax = $9.09, Total = $100.00
    // Tax formula: tax = taxableGross - (taxableGross / (1 + rate/100))
    const taxFactor = 1 + (taxRatePercent / 100);
    const netBaseTaxable = taxableGrossUSD > 0 ? (taxableGrossUSD / taxFactor) : 0;
    taxUSD = Math.round((taxableGrossUSD - netBaseTaxable) * 100) / 100;
    taxableAmountUSD = Math.round(netBaseTaxable * 100) / 100;

    // Grand total stays equal to netSubtotalUSD because tax was already inside the selling price!
    grandTotalUSD = netSubtotalUSD;
  } else {
    // TAX-EXCLUSIVE:
    // Tax is ADDED on top of the taxable amount.
    // Example: $100 net + 10% tax = $110.00 total.
    taxableAmountUSD = Math.round(taxableGrossUSD * 100) / 100;
    taxUSD = Math.round(taxableAmountUSD * (taxRatePercent / 100) * 100) / 100;
    grandTotalUSD = Math.round((netSubtotalUSD + taxUSD) * 100) / 100;
  }

  const subtotalLRD = Math.round(subtotalUSD * rate);
  const taxLRD = Math.round(taxUSD * rate);
  const grandTotalLRD = Math.round(grandTotalUSD * rate);
  const taxableAmountLRD = Math.round(taxableAmountUSD * rate);

  return {
    taxEnabled,
    taxName,
    taxRatePercent,
    taxCalculationType,
    subtotalUSD,
    subtotalLRD,
    discountUSD,
    netSubtotalUSD,
    taxableAmountUSD,
    taxableAmountLRD,
    exemptAmountUSD: Math.round(exemptGrossUSD * 100) / 100,
    zeroRatedAmountUSD: Math.round(zeroRatedGrossUSD * 100) / 100,
    taxUSD,
    taxLRD,
    grandTotalUSD,
    grandTotalLRD,
    customerTaxExemptApplied: Boolean(customerTaxExempt),
  };
}
