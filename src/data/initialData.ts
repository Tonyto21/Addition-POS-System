import {
  BusinessSettings,
  Category,
  Customer,
  Product,
  ReceiptSnapshot,
  Sale,
  StockBatch,
  StockMovement,
  Supplier,
  Unit,
  User,
} from '../types';

export const DEFAULT_BUSINESS_SETTINGS: BusinessSettings = {
  id: 'biz-default',
  name: 'Addition Business Centre',
  phone: '+231 77 000 0000 / +231 88 000 0000',
  address: 'Benson Street, Monrovia, Liberia',
  email: 'info@additionbusinesscentre.lr',
  primaryCurrency: 'LRD',
  secondaryCurrency: 'USD',
  exchangeRate: 195, // 1 USD = 195 LRD (Standard current Liberian exchange)
  taxEnabled: false,
  taxRatePercent: 0,
  receiptHeader: 'WELCOME TO ADDITION BUSINESS CENTRE\nQuality Goods At The Best Prices\nThank you for shopping with us!',
  receiptFooter: 'Goods once sold are returnable within 48 hours with receipt.\nHave a blessed day!',
  lowStockThresholdDefault: 5,
  defaultThermalPaperSize: '58mm',
};

export const INITIAL_USERS: User[] = [
  {
    id: 'usr-1',
    name: 'Shop Owner',
    username: 'owner',
    role: 'owner',
    isActive: true,
    phone: '+231 77 111 222',
    pin: '1234',
    createdAt: '2026-01-01T00:00:00.000Z',
    allowedModules: ['pos', 'inventory', 'orders', 'reports', 'settings'],
    canApplyDiscount: true,
    canProcessRefund: true,
    canViewCostProfit: true,
    canAdjustInventory: true,
    canReceiveStock: true,
    canManageUsers: true,
    canEditSettings: true,
  },
  {
    id: 'usr-2',
    name: 'Branch Manager',
    username: 'manager',
    role: 'manager',
    isActive: true,
    phone: '+231 77 222 333',
    pin: '1234',
    createdAt: '2026-01-02T00:00:00.000Z',
    allowedModules: ['pos', 'inventory', 'orders', 'reports'],
    canApplyDiscount: true,
    canProcessRefund: true,
    canViewCostProfit: true,
    canAdjustInventory: true,
    canReceiveStock: true,
    canManageUsers: false,
    canEditSettings: false,
  },
  {
    id: 'usr-3',
    name: 'Cashier Mary',
    username: 'cashier',
    role: 'cashier',
    isActive: true,
    phone: '+231 77 333 444',
    pin: '1234',
    createdAt: '2026-01-03T00:00:00.000Z',
    allowedModules: ['pos', 'orders'],
    canApplyDiscount: false,
    canProcessRefund: false,
    canViewCostProfit: false,
    canAdjustInventory: false,
    canReceiveStock: false,
    canManageUsers: false,
    canEditSettings: false,
  },
];

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Groceries & Food', description: 'Packaged foods, rice, oil, sugar' },
  { id: 'cat-2', name: 'Beverages & Drinks', description: 'Water, juices, soft drinks' },
  { id: 'cat-3', name: 'Household & Toiletries', description: 'Soaps, detergents, cleaning' },
  { id: 'cat-4', name: 'Personal Care', description: 'Cosmetics, lotions, dental' },
  { id: 'cat-5', name: 'Stationery & General', description: 'Books, pens, batteries' },
];

export const INITIAL_UNITS: Unit[] = [
  { id: 'unt-pcs', name: 'Pieces', symbol: 'pcs', allowFractions: false },
  { id: 'unt-kg', name: 'Kilograms', symbol: 'kg', allowFractions: true },
  { id: 'unt-ltr', name: 'Liters', symbol: 'L', allowFractions: true },
  { id: 'unt-bag', name: 'Bags', symbol: 'bag', allowFractions: false },
  { id: 'unt-ctn', name: 'Cartons', symbol: 'ctn', allowFractions: false },
  { id: 'unt-pkt', name: 'Packets', symbol: 'pkt', allowFractions: false },
];

export const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: 'sup-1',
    name: 'National Commodities Wholesale Ltd',
    contactPerson: 'Mr. Varney Kamara',
    phone: '+231 77 987 654',
    email: 'sales@natcommodities.lr',
    address: 'Freeport Commercial Zone, Bushrod Island, Monrovia',
    notes: 'Main supplier of rice, cooking oil, sugar',
  },
  {
    id: 'sup-2',
    name: 'Monrovia Beverage Distributors',
    contactPerson: 'Kiatamba Flomo',
    phone: '+231 88 456 789',
    email: 'orders@monroviabev.lr',
    address: 'Sinkor Old Road, Monrovia',
    notes: 'Soft drinks, mineral water, energy drinks',
  },
];

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    name: 'Auntie Fatu Sherman',
    phone: '+231 77 555 123',
    address: 'Broad Street, Monrovia',
    creditLimitUSD: 100,
    currentDebtUSD: 18.5,
    currentDebtLRD: 3607.5,
    notes: 'Trusted neighbor, pays debts every Friday afternoon',
    createdAt: '2026-02-10T10:00:00Z',
  },
  {
    id: 'cust-2',
    name: 'Pastor Emmanuel Johnson',
    phone: '+231 88 777 888',
    address: 'Carey Street, Monrovia',
    creditLimitUSD: 200,
    currentDebtUSD: 35.0,
    currentDebtLRD: 6825.0,
    notes: 'Regular customer for Sunday school supplies',
    createdAt: '2026-02-15T12:30:00Z',
  },
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    sku: 'RIC-BEA-25',
    barcode: '070001000123',
    alternativeBarcodes: ['070001000124'],
    name: 'Bella Luna Long Grain Parboiled Rice 25kg',
    description: 'Premium parboiled white rice 25kg sack',
    categoryId: 'cat-1',
    unitId: 'unt-bag',
    sellingPriceUSD: 24.50,
    sellingPriceLRD: 4777.50,
    pricingCurrency: 'USD',
    costPriceUSD: 21.00,
    minStockLevel: 8,
    targetStockLevel: 30,
    currentStock: 18,
    allowFractions: false,
    trackBatches: true,
    isActive: true,
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-01-10T08:00:00Z',
  },
  {
    id: 'prod-2',
    sku: 'OIL-MAY-5L',
    barcode: '600100100234',
    alternativeBarcodes: [],
    name: 'Mayor Pure Vegetable Cooking Oil 5L',
    description: 'Refined palm olein cooking oil container',
    categoryId: 'cat-1',
    unitId: 'unt-pcs',
    sellingPriceUSD: 8.50,
    sellingPriceLRD: 1657.50,
    costPriceUSD: 7.00,
    minStockLevel: 10,
    targetStockLevel: 40,
    currentStock: 24,
    allowFractions: false,
    trackBatches: true,
    isActive: true,
    createdAt: '2026-01-10T08:05:00Z',
    updatedAt: '2026-01-10T08:05:00Z',
  },
  {
    id: 'prod-3',
    sku: 'SUG-WHI-KG',
    barcode: '071112223344',
    alternativeBarcodes: [],
    name: 'Refined White Cane Sugar (per kg)',
    description: 'Dry granulated table sugar, sold loose or by sack fraction',
    categoryId: 'cat-1',
    unitId: 'unt-kg',
    sellingPriceUSD: 1.60,
    sellingPriceLRD: 312.00,
    costPriceUSD: 1.25,
    minStockLevel: 25,
    targetStockLevel: 100,
    currentStock: 64.5,
    allowFractions: true,
    trackBatches: false,
    isActive: true,
    createdAt: '2026-01-10T08:10:00Z',
    updatedAt: '2026-01-10T08:10:00Z',
  },
  {
    id: 'prod-4',
    sku: 'WAT-AQU-500',
    barcode: '544900000099',
    alternativeBarcodes: ['544900000100'],
    name: 'Aquavita Pure Bottled Mineral Water 500ml',
    description: 'Chilled natural spring water bottle',
    categoryId: 'cat-2',
    unitId: 'unt-pcs',
    sellingPriceUSD: 0.50,
    sellingPriceLRD: 100.00,
    pricingCurrency: 'LRD',
    costPriceUSD: 0.32,
    minStockLevel: 30,
    targetStockLevel: 120,
    currentStock: 4, // low stock trigger
    allowFractions: false,
    trackBatches: false,
    isActive: true,
    createdAt: '2026-01-10T08:15:00Z',
    updatedAt: '2026-01-10T08:15:00Z',
  },
  {
    id: 'prod-5',
    sku: 'SOAP-DET-BAR',
    barcode: '890103000555',
    alternativeBarcodes: [],
    name: 'Dettol Antibacterial Original Soap Bar 110g',
    description: 'Antiseptic bathing soap bar',
    categoryId: 'cat-3',
    unitId: 'unt-pcs',
    sellingPriceUSD: 1.25,
    sellingPriceLRD: 250.00,
    pricingCurrency: 'LRD',
    costPriceUSD: 0.85,
    minStockLevel: 15,
    targetStockLevel: 60,
    currentStock: 42,
    allowFractions: false,
    trackBatches: true,
    isActive: true,
    createdAt: '2026-01-10T08:20:00Z',
    updatedAt: '2026-01-10T08:20:00Z',
  },
  {
    id: 'prod-6',
    sku: 'MILK-NID-400',
    barcode: '761303534567',
    alternativeBarcodes: [],
    name: 'Nestle Nido Fortified Milk Powder 400g Tin',
    description: 'Instant full cream dry milk tin',
    categoryId: 'cat-1',
    unitId: 'unt-pcs',
    sellingPriceUSD: 5.75,
    sellingPriceLRD: 1121.25,
    pricingCurrency: 'USD',
    costPriceUSD: 4.80,
    minStockLevel: 12,
    targetStockLevel: 45,
    currentStock: 0, // Out of stock trigger
    allowFractions: false,
    trackBatches: true,
    isActive: true,
    createdAt: '2026-01-10T08:25:00Z',
    updatedAt: '2026-01-10T08:25:00Z',
  },
  {
    id: 'prod-7',
    sku: 'DRK-COC-CAN',
    barcode: '544900000028',
    alternativeBarcodes: [],
    name: 'Coca-Cola Classic Can 330ml',
    description: 'Cold carbonated soft drink can',
    categoryId: 'cat-2',
    unitId: 'unt-pcs',
    sellingPriceUSD: 1.00,
    sellingPriceLRD: 195.00,
    costPriceUSD: 0.70,
    minStockLevel: 24,
    targetStockLevel: 96,
    currentStock: 58,
    allowFractions: false,
    trackBatches: false,
    isActive: true,
    createdAt: '2026-01-10T08:30:00Z',
    updatedAt: '2026-01-10T08:30:00Z',
  },
  {
    id: 'prod-8',
    sku: 'FLO-WHT-KG',
    barcode: '082223334455',
    alternativeBarcodes: [],
    name: 'All-Purpose Wheat Flour (per kg)',
    description: 'Baking flour sold loose by weight',
    categoryId: 'cat-1',
    unitId: 'unt-kg',
    sellingPriceUSD: 1.40,
    sellingPriceLRD: 273.00,
    costPriceUSD: 1.05,
    minStockLevel: 20,
    targetStockLevel: 80,
    currentStock: 35.8,
    allowFractions: true,
    trackBatches: false,
    isActive: true,
    createdAt: '2026-01-10T08:35:00Z',
    updatedAt: '2026-01-10T08:35:00Z',
  }
];

export const INITIAL_BATCHES: StockBatch[] = [
  {
    id: 'bat-1',
    productId: 'prod-1',
    batchNumber: 'LOT-2026-01',
    supplierId: 'sup-1',
    receivedDate: '2026-01-15T09:00:00Z',
    expiryDate: '2027-06-30',
    quantityReceived: 30,
    quantityRemaining: 18,
    unitCostUSD: 21.00,
  },
  {
    id: 'bat-2',
    productId: 'prod-2',
    batchNumber: 'MAY-2026-A',
    supplierId: 'sup-1',
    receivedDate: '2026-01-20T10:30:00Z',
    expiryDate: '2027-01-15',
    quantityReceived: 40,
    quantityRemaining: 24,
    unitCostUSD: 7.00,
  },
  {
    id: 'bat-3',
    productId: 'prod-5',
    batchNumber: 'DET-EXP-27',
    supplierId: 'sup-2',
    receivedDate: '2026-02-01T14:00:00Z',
    expiryDate: '2027-12-31',
    quantityReceived: 60,
    quantityRemaining: 42,
    unitCostUSD: 0.85,
  }
];

export const INITIAL_MOVEMENTS: StockMovement[] = [
  {
    id: 'mov-1',
    productId: 'prod-1',
    productName: 'Bella Luna Long Grain Parboiled Rice 25kg',
    batchId: 'bat-1',
    type: 'PURCHASE_INTAKE',
    quantity: 30,
    resultingStock: 30,
    unitCostUSD: 21.00,
    referenceId: 'INV-1045',
    notes: 'Initial opening stock receiving',
    performedBy: 'Shop Owner',
    timestamp: '2026-01-15T09:00:00Z',
  },
  {
    id: 'mov-2',
    productId: 'prod-2',
    productName: 'Mayor Pure Vegetable Cooking Oil 5L',
    batchId: 'bat-2',
    type: 'PURCHASE_INTAKE',
    quantity: 40,
    resultingStock: 40,
    unitCostUSD: 7.00,
    referenceId: 'INV-1046',
    notes: 'Wholesale delivery from Freeport',
    performedBy: 'Branch Manager',
    timestamp: '2026-01-20T10:30:00Z',
  }
];

// Helper to generate seed sales & receipts with authentic Liberian dual-currency transactions across time periods
export function generateSeedSalesAndReceipts(rate = 195): { sales: Sale[]; receipts: ReceiptSnapshot[] } {
  const now = Date.now();
  const H = 60 * 60 * 1000;
  const D = 24 * H;

  const rawTransactions = [
    // Today
    {
      offset: 2 * H,
      cashier: 'Cashier Mary',
      customer: 'Walk-in Customer',
      method: 'CASH_USD' as const,
      items: [
        { id: 'prod-1', name: 'Bella Luna Long Grain Parboiled Rice 25kg', barcode: '071234500001', qty: 1, uPrice: 24.50, uCost: 21.00, sym: 'bag' },
        { id: 'prod-3', name: 'Peak Full Cream Evaporated Milk 160g', barcode: '071234500003', qty: 1, uPrice: 1.25, uCost: 0.95, sym: 'pcs' },
      ],
    },
    {
      offset: 4 * H,
      cashier: 'Cashier Mary',
      customer: 'Jefferson Broderick',
      method: 'CASH_LRD' as const,
      items: [
        { id: 'prod-2', name: 'Mayor Pure Vegetable Cooking Oil 5L', barcode: '071234500002', qty: 1, uPrice: 8.50, uCost: 7.00, sym: 'pcs' },
        { id: 'prod-9', name: 'Sunlight 2-in-1 Handwash Washing Powder 500g', barcode: '071234500009', qty: 1, uPrice: 1.40, uCost: 1.05, sym: 'pcs' },
      ],
    },
    {
      offset: 6 * H,
      cashier: 'Branch Manager',
      customer: 'Walk-in Customer',
      method: 'MOBILE_MONEY' as const,
      items: [
        { id: 'prod-8', name: 'Vita Malt Non-Alcoholic Beverage Bottle 330ml', barcode: '071234500008', qty: 2, uPrice: 1.50, uCost: 1.10, sym: 'pcs' },
        { id: 'prod-4', name: 'Club Beer Premium Lager 330ml Can', barcode: '071234500004', qty: 2, uPrice: 1.75, uCost: 1.30, sym: 'pcs' },
      ],
    },
    {
      offset: 7 * H,
      cashier: 'Cashier Mary',
      customer: 'Walk-in Customer',
      method: 'SPLIT_CASH' as const,
      items: [
        { id: 'prod-7', name: 'Gino Tomato Paste Sachet 70g', barcode: '071234500007', qty: 10, uPrice: 0.35, uCost: 0.22, sym: 'pcs' },
        { id: 'prod-3', name: 'Peak Full Cream Evaporated Milk 160g', barcode: '071234500003', qty: 4, uPrice: 1.25, uCost: 0.95, sym: 'pcs' },
      ],
    },

    // 2 Days Ago (This Week)
    {
      offset: 2 * D + 3 * H,
      cashier: 'Cashier Mary',
      customer: 'Helena Flomo',
      method: 'CASH_USD' as const,
      items: [
        { id: 'prod-1', name: 'Bella Luna Long Grain Parboiled Rice 25kg', barcode: '071234500001', qty: 2, uPrice: 24.50, uCost: 21.00, sym: 'bag' },
      ],
    },
    {
      offset: 2 * D + 5 * H,
      cashier: 'Branch Manager',
      customer: 'Jefferson Broderick',
      method: 'CREDIT' as const,
      items: [
        { id: 'prod-5', name: 'Dettol Antiseptic Disinfectant Liquid 250ml', barcode: '071234500005', qty: 2, uPrice: 3.20, uCost: 2.40, sym: 'pcs' },
        { id: 'prod-9', name: 'Sunlight 2-in-1 Handwash Washing Powder 500g', barcode: '071234500009', qty: 3, uPrice: 1.40, uCost: 1.05, sym: 'pcs' },
      ],
    },

    // 4 Days Ago (This Week)
    {
      offset: 4 * D + 2 * H,
      cashier: 'Cashier Mary',
      customer: 'Walk-in Customer',
      method: 'CASH_LRD' as const,
      items: [
        { id: 'prod-2', name: 'Mayor Pure Vegetable Cooking Oil 5L', barcode: '071234500002', qty: 1, uPrice: 8.50, uCost: 7.00, sym: 'pcs' },
        { id: 'prod-3', name: 'Peak Full Cream Evaporated Milk 160g', barcode: '071234500003', qty: 6, uPrice: 1.25, uCost: 0.95, sym: 'pcs' },
        { id: 'prod-7', name: 'Gino Tomato Paste Sachet 70g', barcode: '071234500007', qty: 5, uPrice: 0.35, uCost: 0.22, sym: 'pcs' },
      ],
    },
    {
      offset: 4 * D + 6 * H,
      cashier: 'Cashier Mary',
      customer: 'Walk-in Customer',
      method: 'CASH_USD' as const,
      items: [
        { id: 'prod-4', name: 'Club Beer Premium Lager 330ml Can', barcode: '071234500004', qty: 6, uPrice: 1.75, uCost: 1.30, sym: 'pcs' },
        { id: 'prod-8', name: 'Vita Malt Non-Alcoholic Beverage Bottle 330ml', barcode: '071234500008', qty: 4, uPrice: 1.50, uCost: 1.10, sym: 'pcs' },
      ],
    },

    // 6 Days Ago (This Week)
    {
      offset: 6 * D + 1 * H,
      cashier: 'Shop Owner',
      customer: 'Miatta Fahnbulleh',
      method: 'CASH_USD' as const,
      items: [
        { id: 'prod-6', name: 'Diana Parboiled Rice 50kg', barcode: '071234500006', qty: 1, uPrice: 44.00, uCost: 38.50, sym: 'bag' },
      ],
    },
    {
      offset: 6 * D + 4 * H,
      cashier: 'Cashier Mary',
      customer: 'Walk-in Customer',
      method: 'MOBILE_MONEY' as const,
      items: [
        { id: 'prod-3', name: 'Peak Full Cream Evaporated Milk 160g', barcode: '071234500003', qty: 12, uPrice: 1.25, uCost: 0.95, sym: 'pcs' },
      ],
    },

    // 9 Days Ago (Last Two Weeks)
    {
      offset: 9 * D + 3 * H,
      cashier: 'Cashier Mary',
      customer: 'Walk-in Customer',
      method: 'CASH_USD' as const,
      items: [
        { id: 'prod-1', name: 'Bella Luna Long Grain Parboiled Rice 25kg', barcode: '071234500001', qty: 1, uPrice: 24.50, uCost: 21.00, sym: 'bag' },
        { id: 'prod-2', name: 'Mayor Pure Vegetable Cooking Oil 5L', barcode: '071234500002', qty: 1, uPrice: 8.50, uCost: 7.00, sym: 'pcs' },
      ],
    },
    {
      offset: 10 * D + 2 * H,
      cashier: 'Branch Manager',
      customer: 'Walk-in Customer',
      method: 'CASH_LRD' as const,
      items: [
        { id: 'prod-5', name: 'Dettol Antiseptic Disinfectant Liquid 250ml', barcode: '071234500005', qty: 1, uPrice: 3.20, uCost: 2.40, sym: 'pcs' },
        { id: 'prod-9', name: 'Sunlight 2-in-1 Handwash Washing Powder 500g', barcode: '071234500009', qty: 4, uPrice: 1.40, uCost: 1.05, sym: 'pcs' },
      ],
    },
    {
      offset: 12 * D + 4 * H,
      cashier: 'Cashier Mary',
      customer: 'Emmanuel Toe',
      method: 'SPLIT_CASH' as const,
      items: [
        { id: 'prod-6', name: 'Diana Parboiled Rice 50kg', barcode: '071234500006', qty: 1, uPrice: 44.00, uCost: 38.50, sym: 'bag' },
        { id: 'prod-2', name: 'Mayor Pure Vegetable Cooking Oil 5L', barcode: '071234500002', qty: 2, uPrice: 8.50, uCost: 7.00, sym: 'pcs' },
      ],
    },

    // 18 Days Ago (This Month)
    {
      offset: 18 * D + 5 * H,
      cashier: 'Cashier Mary',
      customer: 'Walk-in Customer',
      method: 'CASH_USD' as const,
      items: [
        { id: 'prod-1', name: 'Bella Luna Long Grain Parboiled Rice 25kg', barcode: '071234500001', qty: 3, uPrice: 24.50, uCost: 21.00, sym: 'bag' },
      ],
    },
    {
      offset: 20 * D + 1 * H,
      cashier: 'Branch Manager',
      customer: 'Helena Flomo',
      method: 'CREDIT' as const,
      items: [
        { id: 'prod-3', name: 'Peak Full Cream Evaporated Milk 160g', barcode: '071234500003', qty: 24, uPrice: 1.25, uCost: 0.95, sym: 'pcs' },
      ],
    },
    {
      offset: 24 * D + 6 * H,
      cashier: 'Cashier Mary',
      customer: 'Walk-in Customer',
      method: 'CASH_LRD' as const,
      items: [
        { id: 'prod-2', name: 'Mayor Pure Vegetable Cooking Oil 5L', barcode: '071234500002', qty: 3, uPrice: 8.50, uCost: 7.00, sym: 'pcs' },
      ],
    },

    // Earlier This Year
    {
      offset: 40 * D + 2 * H,
      cashier: 'Shop Owner',
      customer: 'Walk-in Customer',
      method: 'CASH_USD' as const,
      items: [
        { id: 'prod-6', name: 'Diana Parboiled Rice 50kg', barcode: '071234500006', qty: 2, uPrice: 44.00, uCost: 38.50, sym: 'bag' },
      ],
    },
    {
      offset: 55 * D + 4 * H,
      cashier: 'Branch Manager',
      customer: 'Jefferson Broderick',
      method: 'MOBILE_MONEY' as const,
      items: [
        { id: 'prod-5', name: 'Dettol Antiseptic Disinfectant Liquid 250ml', barcode: '071234500005', qty: 5, uPrice: 3.20, uCost: 2.40, sym: 'pcs' },
        { id: 'prod-9', name: 'Sunlight 2-in-1 Handwash Washing Powder 500g', barcode: '071234500009', qty: 10, uPrice: 1.40, uCost: 1.05, sym: 'pcs' },
      ],
    },
    {
      offset: 75 * D + 3 * H,
      cashier: 'Cashier Mary',
      customer: 'Walk-in Customer',
      method: 'CASH_USD' as const,
      items: [
        { id: 'prod-1', name: 'Bella Luna Long Grain Parboiled Rice 25kg', barcode: '071234500001', qty: 4, uPrice: 24.50, uCost: 21.00, sym: 'bag' },
      ],
    },
  ];

  const sales: Sale[] = [];
  const receipts: ReceiptSnapshot[] = [];

  rawTransactions.forEach((tx, idx) => {
    const saleTime = new Date(now - tx.offset).toISOString();
    const subtotalUSD = tx.items.reduce((s, it) => s + it.qty * it.uPrice, 0);
    const subtotalLRD = Math.round(subtotalUSD * rate);
    const receiptNum = `REC-${(1001 + idx).toString()}`;
    const saleId = `sale-${1001 + idx}`;

    const sale: Sale = {
      id: saleId,
      receiptNumber: receiptNum,
      cashierId: tx.cashier === 'Shop Owner' ? 'usr-1' : tx.cashier === 'Branch Manager' ? 'usr-2' : 'usr-3',
      cashierName: tx.cashier,
      customerId: tx.customer === 'Walk-in Customer' ? undefined : `cust-${idx}`,
      customerName: tx.customer,
      items: tx.items.map((it) => ({
        productId: it.id,
        productName: it.name,
        barcode: it.barcode,
        quantity: it.qty,
        unitSymbol: it.sym,
        unitPriceUSD: it.uPrice,
        unitPriceLRD: Math.round(it.uPrice * rate),
        unitCostUSD: it.uCost,
        totalUSD: it.qty * it.uPrice,
        totalLRD: Math.round(it.qty * it.uPrice * rate),
      })),
      subtotalUSD,
      subtotalLRD,
      discountUSD: 0,
      taxUSD: 0,
      totalUSD: subtotalUSD,
      totalLRD: subtotalLRD,
      payment: {
        method: tx.method,
        amountUSD: tx.method === 'CASH_USD' ? subtotalUSD : tx.method === 'SPLIT_CASH' ? subtotalUSD / 2 : 0,
        amountLRD: tx.method === 'CASH_LRD' ? subtotalLRD : tx.method === 'SPLIT_CASH' ? subtotalLRD / 2 : 0,
        tenderedUSD: tx.method === 'CASH_USD' ? subtotalUSD : undefined,
        tenderedLRD: tx.method === 'CASH_LRD' ? subtotalLRD : undefined,
        changeUSD: 0,
        changeLRD: 0,
      },
      paymentStatus: tx.method === 'CREDIT' ? 'CREDIT' : 'PAID',
      createdAt: saleTime,
      synced: true,
    };

    const snapshot: ReceiptSnapshot = {
      id: `rcpt-${1001 + idx}`,
      saleId: sale.id,
      receiptNumber: receiptNum,
      businessName: 'Addition Shop',
      businessPhone: '+231 77 000 0000 / +231 88 000 0000',
      businessAddress: 'Benson Street, Monrovia, Liberia',
      headerText: 'WELCOME TO ADDITION SHOP\nQuality Goods At The Best Prices\nThank you for shopping with us!',
      footerText: 'Goods once sold are returnable within 48 hours with receipt.\nHave a blessed day!',
      date: saleTime,
      cashierName: tx.cashier,
      customerName: tx.customer,
      items: sale.items.map((it) => ({
        name: it.productName,
        quantity: it.quantity,
        unitSymbol: it.unitSymbol,
        unitPriceUSD: it.unitPriceUSD,
        totalUSD: it.totalUSD,
        totalLRD: it.totalLRD,
      })),
      subtotalUSD,
      taxUSD: 0,
      discountUSD: 0,
      totalUSD: subtotalUSD,
      totalLRD: subtotalLRD,
      paymentMethod: tx.method,
      amountPaidUSD: sale.payment.amountUSD,
      amountPaidLRD: sale.payment.amountLRD,
      changeUSD: 0,
      changeLRD: 0,
      exchangeRateUsed: rate,
      reprintCount: 0,
    };

    sales.push(sale);
    receipts.push(snapshot);
  });

  return { sales, receipts };
}

const seedData = generateSeedSalesAndReceipts();
export const INITIAL_SALES: Sale[] = seedData.sales;
export const INITIAL_RECEIPTS: ReceiptSnapshot[] = seedData.receipts;

