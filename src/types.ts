export interface BusinessSettings {
  id: string;
  name: string;
  logoUrl?: string;
  phone: string;
  address: string;
  email: string;
  primaryCurrency: 'USD' | 'LRD';
  secondaryCurrency: 'USD' | 'LRD';
  exchangeRate: number; // e.g., 1 USD = 195 LRD
  lastExchangeRateReviewDate?: string; // e.g., "2026-09-18"
  exchangeRateLastConfirmedDate?: string;
  taxEnabled: boolean;
  taxName?: string; // e.g. "GST", "VAT", "Sales Tax" - configurable, defaults to "GST"
  taxRatePercent: number; // e.g. 10
  taxCalculationType?: 'EXCLUSIVE' | 'INCLUSIVE'; // defaults to 'EXCLUSIVE'
  storeTIN?: string; // Business / Store Tax Identification Number
  receiptHeader: string;
  receiptFooter: string;
  lowStockThresholdDefault: number;
  defaultThermalPaperSize: '58mm' | '80mm';
  darkMode?: boolean;
  updatedAt?: string;
  trialExpiresAt?: string; // ISO timestamp when the 30-day evaluation ends
  trialStartedAt?: string; // ISO timestamp when the trial started
  licenseStatus?: 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'LIFETIME';
  licensedTo?: string; // Name of the store or client
}

export type UserRole = 'superadmin' | 'owner' | 'manager' | 'cashier';
export type AppModuleId = 'pos' | 'inventory' | 'orders' | 'reports' | 'settings';

export interface User {
  id: string;
  name: string;
  username: string;
  email?: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
  pin?: string;
  createdAt: string;
  trialExpiresAt?: string; // Optional trial expiration date
  allowedModules?: AppModuleId[];
  canApplyDiscount?: boolean;
  canProcessRefund?: boolean;
  canViewCostProfit?: boolean;
  canAdjustInventory?: boolean;
  canReceiveStock?: boolean;
  canManageUsers?: boolean;
  canEditSettings?: boolean;
}

export interface PermissionSet {
  viewDashboard: boolean;
  viewCostAndProfit: boolean;
  manageProducts: boolean;
  adjustInventory: boolean;
  receiveStock: boolean;
  performStockCount: boolean;
  createSale: boolean;
  applyDiscount: boolean;
  processRefund: boolean;
  manageCustomers: boolean;
  manageCreditRepayments: boolean;
  manageSuppliers: boolean;
  manageUsers: boolean;
  manageSettings: boolean;
  viewAuditLogs: boolean;
  manageCashDrawer: boolean;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface Unit {
  id: string;
  name: string;
  symbol: string;
  allowFractions: boolean;
}

export interface PackageDefinition {
  id: string;
  name: string; // e.g. "Pack", "Carton", "Dozen", "Crate", "Box", "Bundle"
  multiplier: number; // e.g. 12 for Dozen, 24 for Crate, 50 for Box
  description?: string;
  isDefault?: boolean;
}

export type SellingTier = 'FULL' | 'THREE_QUARTERS' | 'HALF' | 'QUARTER' | 'PIECE';

export interface ProductPackageTier {
  id: string;
  name: string; // e.g. "Pack of 6", "Carton of 12", "Box of 24"
  multiplier: number; // e.g. 6, 12, 24 base units
  barcode?: string; // unique package barcode
  packagePriceUSD?: number; // wholesale selling price in USD
  packagePriceLRD?: number; // wholesale selling price in LRD
  packageCostUSD?: number; // wholesale cost per pack
}

export interface Product {
  id: string;
  sku: string;
  barcode: string;
  alternativeBarcodes: string[];
  name: string;
  description?: string;
  imageUrl?: string;
  categoryId: string;
  unitId: string;
  sellingPriceUSD: number;
  sellingPriceLRD: number;
  pricingCurrency?: 'USD' | 'LRD' | 'DUAL'; // 'USD' for USD-only, 'LRD' for LRD-only, 'DUAL' for both
  costPriceUSD: number; // restricted for regular cashier
  costPriceLRD?: number;
  minStockLevel: number;
  targetStockLevel: number;
  currentStock: number;
  allowFractions: boolean;
  trackBatches: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Wholesale & Bulk Package Configuration (Primary package definition)
  hasPackageUnit?: boolean;
  packageUnitName?: string; // e.g., 'Pack of 12', 'Carton', 'Crate'
  packageMultiplier?: number; // e.g., 24 (1 carton = 24 bottles)
  packageBarcode?: string; // Outer carton barcode if available
  packagePriceUSD?: number; // Wholesale selling price in USD
  packagePriceLRD?: number; // Wholesale selling price in LRD
  packageCostUSD?: number; // Cost per pack from distributor

  // Fractional Package Selling Tiers (Manual price overrides)
  threeQuarterPackagePriceUSD?: number;
  threeQuarterPackagePriceLRD?: number;
  halfPackagePriceUSD?: number;
  halfPackagePriceLRD?: number;
  quarterPackagePriceUSD?: number;
  quarterPackagePriceLRD?: number;

  // Flexible Multi-Package Tiers (Support for multiple packaging sizes e.g. Pack of 6, Carton of 12, Box of 24)
  packageTiers?: ProductPackageTier[];

  // Tax Classification
  taxStatus?: 'TAXABLE' | 'ZERO_RATED' | 'EXEMPT'; // Defaults to 'TAXABLE'
}

export interface StockBatch {
  id: string;
  productId: string;
  batchNumber: string;
  supplierId?: string;
  receivedDate: string;
  expiryDate?: string;
  quantityReceived: number;
  quantityRemaining: number;
  unitCostUSD: number;
}

export type StockMovementType = 
  | 'PURCHASE_INTAKE' 
  | 'SALE' 
  | 'RETURN' 
  | 'ADJUSTMENT' 
  | 'STOCK_COUNT_VARIANCE';

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  batchId?: string;
  type: StockMovementType;
  quantity: number; // positive or negative
  resultingStock: number;
  unitCostUSD: number;
  referenceId?: string; // sale id, intake id, etc.
  notes?: string;
  performedBy: string;
  timestamp: string;
}

export interface StockIntakeItem {
  productId: string;
  productName: string;
  quantity: number; // total base units received into inventory
  unitCostUSD: number; // cost per single base unit
  sellingPriceUSD: number;
  sellingPriceLRD: number;
  batchNumber?: string;
  expiryDate?: string;
  subtotalCostUSD: number;
  // Package purchasing metadata
  isPackagePurchase?: boolean;
  packageUnitName?: string; // e.g. 'Carton'
  packageMultiplier?: number; // e.g. 12
  packagesCount?: number; // e.g. 10
  costPerPackageUSD?: number; // e.g. $24.00
}

export interface StockIntakeTransaction {
  id: string;
  supplierId: string;
  supplierName: string;
  invoiceNumber: string;
  dateReceived: string;
  receivedBy: string;
  items: StockIntakeItem[];
  totalCostUSD: number;
  notes?: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  notes?: string;
  creditLimitUSD: number;
  currentDebtUSD: number;
  currentDebtLRD: number;
  tin?: string; // Customer Tax Identification Number
  taxExempt?: boolean; // Customer-level tax exemption flag (e.g. diplomatic / NGO)
  createdAt: string;
}

export interface CustomerRepayment {
  id: string;
  customerId: string;
  customerName: string;
  amountUSD: number;
  amountLRD: number;
  paymentMethod: 'CASH_USD' | 'CASH_LRD' | 'MOBILE_MONEY';
  notes?: string;
  receivedBy: string;
  timestamp: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  tin?: string; // Supplier Tax Identification Number
}

export interface CartItem {
  product: Product;
  quantity: number;
  saleMode: 'RETAIL' | 'WHOLESALE'; // 'RETAIL' = single individual unit, 'WHOLESALE' = defined package unit or tier
  sellingTier?: SellingTier; // 'FULL' | 'HALF' | 'QUARTER' | 'PIECE'
  tierLabel?: string; // e.g. 'Full Carton (24 pcs)', 'Half Carton (12 pcs)'
  unitLabel: string; // e.g. 'Bottle', 'Carton (24 pcs)', 'Half Carton (12 pcs)'
  baseUnitQuantity: number; // multiplier: 1 for retail/piece, 12 for half, 24 for full
  unitPriceUSD: number;
  unitPriceLRD: number;
  discountUSD: number;
  totalUSD: number;
  totalLRD: number;
  taxStatus?: 'TAXABLE' | 'ZERO_RATED' | 'EXEMPT';
}

export type PaymentMethod = 'CASH_USD' | 'CASH_LRD' | 'SPLIT_CASH' | 'MOBILE_MONEY' | 'CREDIT';

export interface SalePayment {
  method: PaymentMethod;
  amountUSD: number;
  amountLRD: number;
  tenderedUSD?: number;
  tenderedLRD?: number;
  changeUSD?: number;
  changeLRD?: number;
  reference?: string;
}

export interface TaxSnapshot {
  taxEnabled: boolean;
  taxName?: string;
  taxRatePercent?: number;
  taxCalculationType?: 'EXCLUSIVE' | 'INCLUSIVE';
  storeTIN?: string;
  customerTIN?: string;
  customerTaxExemptApplied?: boolean;
  taxableAmountUSD?: number;
  taxableAmountLRD?: number;
  exemptAmountUSD?: number;
  zeroRatedAmountUSD?: number;
  taxUSD?: number;
  taxLRD?: number;
}

export interface Sale {
  id: string;
  receiptNumber: string;
  cashierId: string;
  cashierName: string;
  customerId?: string;
  customerName?: string;
  items: {
    productId: string;
    productName: string;
    barcode: string;
    quantity: number;
    unitSymbol: string;
    saleMode?: 'RETAIL' | 'WHOLESALE';
    sellingTier?: SellingTier;
    tierLabel?: string;
    unitLabel?: string;
    baseUnitQuantity?: number; // total single base units deducted = quantity * baseUnitQuantity
    unitPriceUSD: number;
    unitPriceLRD: number;
    unitCostUSD: number;
    totalUSD: number;
    totalLRD: number;
    taxStatus?: 'TAXABLE' | 'ZERO_RATED' | 'EXEMPT';
    taxUSD?: number;
    taxLRD?: number;
  }[];
  subtotalUSD: number;
  subtotalLRD: number;
  discountUSD: number;
  taxUSD: number;
  taxLRD?: number;
  totalUSD: number;
  totalLRD: number;
  // Tax Snapshot & Compliance Metadata
  taxSnapshot?: TaxSnapshot;
  taxName?: string;
  taxRatePercent?: number;
  taxCalculationType?: 'EXCLUSIVE' | 'INCLUSIVE';
  storeTIN?: string;
  customerTIN?: string;
  taxableAmountUSD?: number;
  taxableAmountLRD?: number;
  exemptAmountUSD?: number;
  zeroRatedAmountUSD?: number;
  customerTaxExemptApplied?: boolean;
  fiscalCompliance?: {
    invoiceType?: 'STANDARD' | 'SIMPLIFIED';
    fiscalSignature?: string;
    verificationUrl?: string;
  };
  payment: SalePayment;
  paymentStatus: 'PAID' | 'CREDIT' | 'PARTIALLY_REFUNDED' | 'REFUNDED';
  cashSessionId?: string;
  createdAt: string;
  synced: boolean;
}

export interface ReceiptSnapshot {
  id: string;
  saleId: string;
  receiptNumber: string;
  businessName: string;
  businessPhone: string;
  businessAddress: string;
  headerText: string;
  footerText: string;
  date: string;
  cashierName: string;
  customerName?: string;
  items: {
    name: string;
    quantity: number;
    unitSymbol: string;
    sellingTier?: SellingTier;
    tierLabel?: string;
    unitLabel?: string;
    baseUnitQuantity?: number;
    unitPriceUSD: number;
    totalUSD: number;
    totalLRD: number;
    taxStatus?: 'TAXABLE' | 'ZERO_RATED' | 'EXEMPT';
  }[];
  subtotalUSD: number;
  taxUSD: number;
  taxLRD?: number;
  discountUSD: number;
  totalUSD: number;
  totalLRD: number;
  paymentMethod: string;
  amountPaidUSD: number;
  amountPaidLRD: number;
  changeUSD: number;
  changeLRD: number;
  exchangeRateUsed: number;
  reprintCount: number;
  // Tax & Fiscal Snapshot
  taxSnapshot?: TaxSnapshot;
  taxName?: string;
  taxRatePercent?: number;
  taxCalculationType?: 'EXCLUSIVE' | 'INCLUSIVE';
  storeTIN?: string;
  customerTIN?: string;
  taxableAmountUSD?: number;
  taxableAmountLRD?: number;
  exemptAmountUSD?: number;
  zeroRatedAmountUSD?: number;
  customerTaxExemptApplied?: boolean;
}

export interface CashSession {
  id: string;
  openedBy: string;
  closedBy?: string;
  openedAt: string;
  closedAt?: string;
  openingCashUSD: number;
  openingCashLRD: number;
  closingCashUSD?: number;
  closingCashLRD?: number;
  expectedCashUSD: number;
  expectedCashLRD: number;
  totalSalesUSD: number;
  totalSalesLRD: number;
  status: 'OPEN' | 'CLOSED';
  movements: {
    id: string;
    type: 'PAYOUT' | 'DROP' | 'ADD_CASH';
    amountUSD: number;
    amountLRD: number;
    reason: string;
    timestamp: string;
    authorizedBy: string;
  }[];
  notes?: string;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId?: string;
  details: string;
  timestamp: string;
}

export interface SyncQueueItem {
  id: string;
  clientTxId: string;
  type: 'SALE' | 'STOCK_INTAKE' | 'PRODUCT_CREATE' | 'REPAYMENT' | 'STOCK_ADJUSTMENT';
  payload: any;
  status: 'PENDING' | 'SYNCED' | 'ERROR';
  createdAt: string;
  error?: string;
}
