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
  taxEnabled: boolean;
  taxRatePercent: number;
  receiptHeader: string;
  receiptFooter: string;
  lowStockThresholdDefault: number;
  defaultThermalPaperSize: '58mm' | '80mm';
}

export type UserRole = 'owner' | 'manager' | 'cashier';
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
  pricingCurrency?: 'USD' | 'LRD' | 'DUAL'; // Currency origin (USD-only, LRD-only, or Dual)
  costPriceUSD: number; // restricted for regular cashier
  minStockLevel: number;
  targetStockLevel: number;
  currentStock: number;
  allowFractions: boolean;
  trackBatches: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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
  quantity: number;
  unitCostUSD: number;
  sellingPriceUSD: number;
  sellingPriceLRD: number;
  batchNumber?: string;
  expiryDate?: string;
  subtotalCostUSD: number;
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
}

export interface CartItem {
  product: Product;
  quantity: number;
  unitPriceUSD: number;
  unitPriceLRD: number;
  discountUSD: number;
  totalUSD: number;
  totalLRD: number;
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
    unitPriceUSD: number;
    unitPriceLRD: number;
    unitCostUSD: number;
    totalUSD: number;
    totalLRD: number;
  }[];
  subtotalUSD: number;
  subtotalLRD: number;
  discountUSD: number;
  taxUSD: number;
  totalUSD: number;
  totalLRD: number;
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
    unitPriceUSD: number;
    totalUSD: number;
    totalLRD: number;
  }[];
  subtotalUSD: number;
  taxUSD: number;
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
