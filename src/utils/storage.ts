import {
  AppModuleId,
  AuditLogEntry,
  BusinessSettings,
  CashSession,
  Category,
  Customer,
  CustomerRepayment,
  Product,
  ReceiptSnapshot,
  Sale,
  StockBatch,
  StockIntakeTransaction,
  StockMovement,
  Supplier,
  SyncQueueItem,
  Unit,
  User,
} from '../types';
import {
  DEFAULT_BUSINESS_SETTINGS,
  INITIAL_BATCHES,
  INITIAL_CATEGORIES,
  INITIAL_CUSTOMERS,
  INITIAL_MOVEMENTS,
  INITIAL_PRODUCTS,
  INITIAL_SUPPLIERS,
  INITIAL_UNITS,
  INITIAL_USERS,
  INITIAL_SALES,
  INITIAL_RECEIPTS,
} from '../data/initialData';

const STORAGE_KEYS = {
  SETTINGS: 'addition_pos_settings',
  PRODUCTS: 'addition_pos_products',
  CATEGORIES: 'addition_pos_categories',
  UNITS: 'addition_pos_units',
  SUPPLIERS: 'addition_pos_suppliers',
  CUSTOMERS: 'addition_pos_customers',
  REPAYMENTS: 'addition_pos_repayments',
  BATCHES: 'addition_pos_batches',
  MOVEMENTS: 'addition_pos_movements',
  SALES: 'addition_pos_sales',
  RECEIPTS: 'addition_pos_receipts',
  INTAKES: 'addition_pos_intakes',
  CASH_SESSIONS: 'addition_pos_cash_sessions',
  AUDIT_LOGS: 'addition_pos_audit_logs',
  USERS: 'addition_pos_users',
  ACTIVE_USER: 'addition_pos_active_user',
  SYNC_QUEUE: 'addition_pos_sync_queue',
  IS_ONLINE: 'addition_pos_online_mode',
};

// Safe storage wrapper
function loadItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error loading key ${key}:`, err);
    return fallback;
  }
}

function saveItem<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('app-storage-updated', { detail: { key } }));
    }
  } catch (err) {
    console.error(`Error saving key ${key}:`, err);
  }
}

export class OfflineStorageManager {
  // Business Settings
  static getSettings(): BusinessSettings {
    const s = loadItem<BusinessSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_BUSINESS_SETTINGS);
    // Automatic migration to Addition Business Centre if default placeholder was stored
    if (s.name === 'Addition Shop' || !s.name) {
      s.name = 'Addition Business Centre';
      if (s.receiptHeader && s.receiptHeader.includes('ADDITION SHOP')) {
        s.receiptHeader = s.receiptHeader.replace('ADDITION SHOP', 'ADDITION BUSINESS CENTRE');
      }
      this.saveSettings(s);
    }
    return s;
  }

  static saveSettings(settings: BusinessSettings): void {
    saveItem(STORAGE_KEYS.SETTINGS, settings);
    this.logAudit(
      'manage_settings',
      'SETTINGS',
      settings.id,
      `Updated shop settings. Business Name: ${settings.name}, Rate: 1 USD = ${settings.exchangeRate} LRD`
    );
  }

  // Daily Morning Exchange Rate confirmation
  static confirmExchangeRate(newRate?: number): BusinessSettings {
    const settings = this.getSettings();
    if (typeof newRate === 'number' && newRate > 0) {
      settings.exchangeRate = newRate;
    }
    const today = new Date().toISOString().split('T')[0];
    settings.lastExchangeRateReviewDate = today;
    this.saveSettings(settings);
    window.dispatchEvent(new CustomEvent('app-storage-updated', { detail: { source: 'exchange-rate-confirmed' } }));
    return settings;
  }

  static isExchangeRateVerifiedToday(): boolean {
    const settings = this.getSettings();
    const today = new Date().toISOString().split('T')[0];
    return settings.lastExchangeRateReviewDate === today;
  }

  // Users & Auth
  static getUsers(): User[] {
    const list = loadItem<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
    let modified = false;
    const enriched = list.map((u) => {
      if (!u.allowedModules || u.allowedModules.length === 0) {
        modified = true;
        const initial = INITIAL_USERS.find((init) => init.id === u.id);
        const allowed: AppModuleId[] = initial?.allowedModules || (
          u.role === 'owner' ? ['pos', 'inventory', 'orders', 'reports', 'settings'] :
          u.role === 'manager' ? ['pos', 'inventory', 'orders', 'reports'] :
          ['pos', 'orders']
        );
        return {
          ...u,
          allowedModules: allowed,
          canApplyDiscount: u.canApplyDiscount ?? (u.role !== 'cashier'),
          canProcessRefund: u.canProcessRefund ?? (u.role !== 'cashier'),
          canViewCostProfit: u.canViewCostProfit ?? (u.role !== 'cashier'),
          canAdjustInventory: u.canAdjustInventory ?? (u.role !== 'cashier'),
          canReceiveStock: u.canReceiveStock ?? (u.role !== 'cashier'),
          canManageUsers: u.canManageUsers ?? (u.role === 'owner'),
          canEditSettings: u.canEditSettings ?? (u.role === 'owner'),
        };
      }
      return u;
    });
    if (modified) {
      saveItem(STORAGE_KEYS.USERS, enriched);
    }
    return enriched;
  }

  static getActiveUser(): User {
    const users = this.getUsers();
    const saved = loadItem<User | null>(STORAGE_KEYS.ACTIVE_USER, null);
    if (saved) {
      const live = users.find((u) => u.id === saved.id && u.isActive);
      if (live) return live;
    }
    return users[0]; // default to Owner
  }

  static setActiveUser(user: User): void {
    saveItem(STORAGE_KEYS.ACTIVE_USER, user);
  }

  static saveUser(user: User): void {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === user.id);
    if (idx >= 0) {
      users[idx] = user;
    } else {
      users.push(user);
    }
    saveItem(STORAGE_KEYS.USERS, users);
    // If saving active user, keep active user record updated
    const active = this.getActiveUser();
    if (active.id === user.id) {
      this.setActiveUser(user);
    }
    this.logAudit('manage_users', 'USER', user.id, `Saved user profile for ${user.name} (${user.role})`);
  }

  static deleteUser(userId: string): boolean {
    const users = this.getUsers();
    if (users.length <= 1) return false;
    const active = this.getActiveUser();
    if (active.id === userId) return false; // cannot delete currently logged in user
    const filtered = users.filter((u) => u.id !== userId);
    saveItem(STORAGE_KEYS.USERS, filtered);
    this.logAudit('manage_users', 'USER', userId, `Deleted staff account ${userId}`);
    return true;
  }

  // Categories & Units
  static getCategories(): Category[] {
    return loadItem<Category[]>(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
  }

  static saveCategory(cat: Category): void {
    const list = this.getCategories();
    const idx = list.findIndex((c) => c.id === cat.id);
    if (idx >= 0) list[idx] = cat;
    else list.push(cat);
    saveItem(STORAGE_KEYS.CATEGORIES, list);
    this.logAudit('manage_categories', 'CATEGORY', cat.id, `Saved category "${cat.name}"`);
  }

  static deleteCategory(id: string): boolean {
    const products = this.getProducts();
    const isUsed = products.some((p) => p.categoryId === id);
    if (isUsed) {
      return false; // cannot delete category that has products
    }
    const list = this.getCategories().filter((c) => c.id !== id);
    saveItem(STORAGE_KEYS.CATEGORIES, list);
    this.logAudit('manage_categories', 'CATEGORY', id, `Deleted unused category`);
    return true;
  }

  static getUnits(): Unit[] {
    return loadItem<Unit[]>(STORAGE_KEYS.UNITS, INITIAL_UNITS);
  }

  // Products
  static getProducts(): Product[] {
    return loadItem<Product[]>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
  }

  static getProductById(id: string): Product | undefined {
    return this.getProducts().find((p) => p.id === id);
  }

  static getProductByBarcode(barcode: string): Product | undefined {
    const clean = barcode.trim();
    return this.getProducts().find(
      (p) => p.barcode === clean || (p.alternativeBarcodes && p.alternativeBarcodes.includes(clean))
    );
  }

  static saveProduct(product: Product): void {
    const products = this.getProducts();
    const idx = products.findIndex((p) => p.id === product.id);
    const isNew = idx < 0;

    if (isNew) {
      products.push(product);
    } else {
      products[idx] = product;
    }
    saveItem(STORAGE_KEYS.PRODUCTS, products);

    // Enqueue sync
    this.enqueueSync(isNew ? 'PRODUCT_CREATE' : 'STOCK_ADJUSTMENT', product);
    this.logAudit(
      isNew ? 'create_product' : 'edit_product',
      'PRODUCT',
      product.id,
      `${isNew ? 'Created' : 'Updated'} product: ${product.name} (Barcode: ${product.barcode})`
    );
  }

  static deleteProduct(productId: string, deletedBy: string): void {
    const products = this.getProducts().filter((p) => p.id !== productId);
    saveItem(STORAGE_KEYS.PRODUCTS, products);
    this.enqueueSync('STOCK_ADJUSTMENT', { id: productId, isDeleted: true });
    this.logAudit(
      'edit_product',
      'PRODUCT',
      productId,
      `Deleted product ${productId} by ${deletedBy}`
    );
  }

  // Stock Batches & Movements (Double-entry inventory ledger)
  static getBatches(): StockBatch[] {
    return loadItem<StockBatch[]>(STORAGE_KEYS.BATCHES, INITIAL_BATCHES);
  }

  static getMovements(): StockMovement[] {
    return loadItem<StockMovement[]>(STORAGE_KEYS.MOVEMENTS, INITIAL_MOVEMENTS);
  }

  static getIntakes(): StockIntakeTransaction[] {
    return loadItem<StockIntakeTransaction[]>(STORAGE_KEYS.INTAKES, []);
  }

  static recordStockIntake(intake: StockIntakeTransaction): void {
    const intakes = this.getIntakes();
    intakes.unshift(intake);
    saveItem(STORAGE_KEYS.INTAKES, intakes);

    const products = this.getProducts();
    const batches = this.getBatches();
    const movements = this.getMovements();

    intake.items.forEach((item) => {
      const prod = products.find((p) => p.id === item.productId);
      if (prod) {
        prod.currentStock += item.quantity;
        // Optionally update selling price if provided
        if (item.sellingPriceUSD > 0) prod.sellingPriceUSD = item.sellingPriceUSD;
        if (item.sellingPriceLRD > 0) prod.sellingPriceLRD = item.sellingPriceLRD;
        prod.costPriceUSD = item.unitCostUSD;
        prod.updatedAt = new Date().toISOString();

        // Create batch record if batch number exists
        const batchId = `bat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        batches.push({
          id: batchId,
          productId: prod.id,
          batchNumber: item.batchNumber || `LOT-${new Date().toISOString().slice(0, 10)}`,
          supplierId: intake.supplierId,
          receivedDate: intake.dateReceived,
          expiryDate: item.expiryDate,
          quantityReceived: item.quantity,
          quantityRemaining: item.quantity,
          unitCostUSD: item.unitCostUSD,
        });

        // Add movement ledger entry
        movements.unshift({
          id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          productId: prod.id,
          productName: prod.name,
          batchId,
          type: 'PURCHASE_INTAKE',
          quantity: item.quantity,
          resultingStock: prod.currentStock,
          unitCostUSD: item.unitCostUSD,
          referenceId: intake.invoiceNumber,
          notes: `Received from ${intake.supplierName} (${intake.invoiceNumber})`,
          performedBy: intake.receivedBy,
          timestamp: new Date().toISOString(),
        });
      }
    });

    saveItem(STORAGE_KEYS.PRODUCTS, products);
    saveItem(STORAGE_KEYS.BATCHES, batches);
    saveItem(STORAGE_KEYS.MOVEMENTS, movements);

    this.enqueueSync('STOCK_INTAKE', intake);
    this.logAudit(
      'receive_stock',
      'STOCK_INTAKE',
      intake.id,
      `Received ${intake.items.length} product lines from ${intake.supplierName}. Total: $${intake.totalCostUSD.toFixed(2)}`
    );
  }

  static recordSingleProductIntake(
    productId: string,
    quantityToAdd: number,
    unitCostUSD: number,
    supplierName?: string,
    invoiceNumber?: string,
    performedBy: string = 'Store Staff'
  ): { updatedStock: number; product: Product } | null {
    if (quantityToAdd <= 0) return null;
    const products = this.getProducts();
    const prod = products.find((p) => p.id === productId);
    if (!prod) return null;

    const previousStock = Number(prod.currentStock) || 0;
    const newStock = previousStock + quantityToAdd;
    prod.currentStock = newStock;
    if (unitCostUSD > 0) {
      prod.costPriceUSD = unitCostUSD;
    }
    prod.updatedAt = new Date().toISOString();
    saveItem(STORAGE_KEYS.PRODUCTS, products);

    const movements = this.getMovements();
    movements.unshift({
      id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      productId: prod.id,
      productName: prod.name,
      type: 'PURCHASE_INTAKE',
      quantity: quantityToAdd,
      resultingStock: newStock,
      unitCostUSD: unitCostUSD > 0 ? unitCostUSD : prod.costPriceUSD,
      referenceId: invoiceNumber || `INTAKE-${Date.now().toString().slice(-4)}`,
      notes: `Direct intake of +${quantityToAdd} units received by ${performedBy}${supplierName ? ` from ${supplierName}` : ''}`,
      performedBy,
      timestamp: new Date().toISOString(),
    });
    saveItem(STORAGE_KEYS.MOVEMENTS, movements);

    this.enqueueSync('STOCK_INTAKE', {
      productId: prod.id,
      quantity: quantityToAdd,
      resultingStock: newStock,
      timestamp: new Date().toISOString(),
    });

    this.logAudit(
      'receive_stock',
      'STOCK_INTAKE',
      prod.id,
      `Direct intake of +${quantityToAdd} units for ${prod.name} by ${performedBy}. Stock: ${previousStock} -> ${newStock}`
    );

    return { updatedStock: newStock, product: prod };
  }

  static adjustStockManual(
    productId: string,
    adjustedQty: number,
    reason: string,
    performedBy: string
  ): void {
    const products = this.getProducts();
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    const diff = adjustedQty - prod.currentStock;
    prod.currentStock = adjustedQty;
    prod.updatedAt = new Date().toISOString();
    saveItem(STORAGE_KEYS.PRODUCTS, products);

    const movements = this.getMovements();
    movements.unshift({
      id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      productId: prod.id,
      productName: prod.name,
      type: 'ADJUSTMENT',
      quantity: diff,
      resultingStock: adjustedQty,
      unitCostUSD: prod.costPriceUSD,
      notes: reason,
      performedBy,
      timestamp: new Date().toISOString(),
    });
    saveItem(STORAGE_KEYS.MOVEMENTS, movements);

    this.enqueueSync('STOCK_ADJUSTMENT', { productId, adjustedQty, reason });
    this.logAudit(
      'adjust_stock',
      'STOCK',
      productId,
      `Manual stock count adjustment for ${prod.name}: ${diff > 0 ? '+' : ''}${diff}. Reason: ${reason}`
    );
  }

  static addMovement(movement: StockMovement): void {
    const movements = this.getMovements();
    movements.unshift(movement);
    saveItem(STORAGE_KEYS.MOVEMENTS, movements);
  }

  // Sales & POS
  static getSales(): Sale[] {
    const list = loadItem<Sale[]>(STORAGE_KEYS.SALES, INITIAL_SALES);
    if (!list || list.length === 0) {
      saveItem(STORAGE_KEYS.SALES, INITIAL_SALES);
      return INITIAL_SALES;
    }
    return list;
  }

  static recordSale(sale: Sale, snapshot: ReceiptSnapshot): void {
    const sales = this.getSales();
    sales.unshift(sale);
    saveItem(STORAGE_KEYS.SALES, sales);

    const receipts = this.getReceipts();
    receipts.unshift(snapshot);
    saveItem(STORAGE_KEYS.RECEIPTS, receipts);

    // Deduct stock via FIFO movements
    const products = this.getProducts();
    const movements = this.getMovements();
    const batches = this.getBatches();

    sale.items.forEach((item) => {
      const prod = products.find((p) => p.id === item.productId);
      if (prod) {
        prod.currentStock = Math.max(0, prod.currentStock - item.quantity);
        prod.updatedAt = new Date().toISOString();

        // FIFO deduction from remaining batch stock
        let needed = item.quantity;
        const prodBatches = batches.filter((b) => b.productId === prod.id && b.quantityRemaining > 0);
        for (const b of prodBatches) {
          if (needed <= 0) break;
          const take = Math.min(b.quantityRemaining, needed);
          b.quantityRemaining -= take;
          needed -= take;
        }

        // Add movement
        movements.unshift({
          id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          productId: prod.id,
          productName: prod.name,
          type: 'SALE',
          quantity: -item.quantity,
          resultingStock: prod.currentStock,
          unitCostUSD: item.unitCostUSD,
          referenceId: sale.receiptNumber,
          performedBy: sale.cashierName,
          timestamp: sale.createdAt,
        });
      }
    });

    saveItem(STORAGE_KEYS.PRODUCTS, products);
    saveItem(STORAGE_KEYS.MOVEMENTS, movements);
    saveItem(STORAGE_KEYS.BATCHES, batches);

    // If customer credit, update customer debt
    if (sale.payment.method === 'CREDIT' && sale.customerId) {
      const customers = this.getCustomers();
      const cust = customers.find((c) => c.id === sale.customerId);
      if (cust) {
        cust.currentDebtUSD += sale.totalUSD;
        cust.currentDebtLRD += sale.totalLRD;
        saveItem(STORAGE_KEYS.CUSTOMERS, customers);
      }
    }

    // Update active cash session if open
    const currentSession = this.getActiveCashSession();
    if (currentSession && currentSession.status === 'OPEN') {
      currentSession.totalSalesUSD += sale.totalUSD;
      currentSession.totalSalesLRD += sale.totalLRD;
      if (sale.payment.method === 'CASH_USD' || sale.payment.method === 'SPLIT_CASH') {
        currentSession.expectedCashUSD += (sale.payment.amountUSD || 0);
      }
      if (sale.payment.method === 'CASH_LRD' || sale.payment.method === 'SPLIT_CASH') {
        currentSession.expectedCashLRD += (sale.payment.amountLRD || 0);
      }
      this.saveCashSession(currentSession);
    }

    this.enqueueSync('SALE', sale);
    this.logAudit(
      'create_sale',
      'SALE',
      sale.id,
      `Completed sale #${sale.receiptNumber} - Total: $${sale.totalUSD.toFixed(2)} / L$${sale.totalLRD.toFixed(0)} (${sale.payment.method})`
    );
  }

  // Receipts
  static getReceipts(): ReceiptSnapshot[] {
    const list = loadItem<ReceiptSnapshot[]>(STORAGE_KEYS.RECEIPTS, INITIAL_RECEIPTS);
    if (!list || list.length === 0) {
      saveItem(STORAGE_KEYS.RECEIPTS, INITIAL_RECEIPTS);
      return INITIAL_RECEIPTS;
    }
    return list;
  }

  static getReceiptByNumber(num: string): ReceiptSnapshot | undefined {
    return this.getReceipts().find((r) => r.receiptNumber === num);
  }

  static incrementReprintCount(receiptNumber: string): void {
    const receipts = this.getReceipts();
    const r = receipts.find((x) => x.receiptNumber === receiptNumber);
    if (r) {
      r.reprintCount = (r.reprintCount || 0) + 1;
      saveItem(STORAGE_KEYS.RECEIPTS, receipts);
      this.logAudit('reprint_receipt', 'RECEIPT', r.id, `Reprinted receipt #${receiptNumber} (Copy #${r.reprintCount})`);
    }
  }

  // Customers & Repayments
  static getCustomers(): Customer[] {
    return loadItem<Customer[]>(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
  }

  static saveCustomer(cust: Customer): void {
    const list = this.getCustomers();
    const idx = list.findIndex((c) => c.id === cust.id);
    if (idx >= 0) list[idx] = cust;
    else list.push(cust);
    saveItem(STORAGE_KEYS.CUSTOMERS, list);
    this.logAudit('manage_customers', 'CUSTOMER', cust.id, `Saved customer ${cust.name}`);
  }

  static getRepayments(): CustomerRepayment[] {
    return loadItem<CustomerRepayment[]>(STORAGE_KEYS.REPAYMENTS, []);
  }

  static recordCustomerRepayment(repayment: CustomerRepayment): void {
    const repayments = this.getRepayments();
    repayments.unshift(repayment);
    saveItem(STORAGE_KEYS.REPAYMENTS, repayments);

    const customers = this.getCustomers();
    const cust = customers.find((c) => c.id === repayment.customerId);
    if (cust) {
      cust.currentDebtUSD = Math.max(0, cust.currentDebtUSD - repayment.amountUSD);
      cust.currentDebtLRD = Math.max(0, cust.currentDebtLRD - repayment.amountLRD);
      saveItem(STORAGE_KEYS.CUSTOMERS, customers);
    }

    // Add to cash session if Cash
    const session = this.getActiveCashSession();
    if (session && session.status === 'OPEN') {
      if (repayment.paymentMethod === 'CASH_USD') {
        session.expectedCashUSD += repayment.amountUSD;
      } else if (repayment.paymentMethod === 'CASH_LRD') {
        session.expectedCashLRD += repayment.amountLRD;
      }
      this.saveCashSession(session);
    }

    this.enqueueSync('REPAYMENT', repayment);
    this.logAudit(
      'manage_credit',
      'CUSTOMER_REPAYMENT',
      repayment.id,
      `Received debt payment from ${repayment.customerName}: $${repayment.amountUSD.toFixed(2)} / L$${repayment.amountLRD.toFixed(0)} via ${repayment.paymentMethod}`
    );
  }

  // Suppliers
  static getSuppliers(): Supplier[] {
    return loadItem<Supplier[]>(STORAGE_KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
  }

  static saveSupplier(supplier: Supplier): void {
    const list = this.getSuppliers();
    const idx = list.findIndex((s) => s.id === supplier.id);
    if (idx >= 0) list[idx] = supplier;
    else list.push(supplier);
    saveItem(STORAGE_KEYS.SUPPLIERS, list);
  }

  // Cash Sessions & Drawer Management
  static getCashSessions(): CashSession[] {
    return loadItem<CashSession[]>(STORAGE_KEYS.CASH_SESSIONS, []);
  }

  static getActiveCashSession(): CashSession | null {
    const sessions = this.getCashSessions();
    return sessions.find((s) => s.status === 'OPEN') || null;
  }

  static openCashSession(
    openedBy: string,
    openingCashUSD: number,
    openingCashLRD: number
  ): CashSession {
    const sessions = this.getCashSessions();
    const newSession: CashSession = {
      id: `cs-${Date.now()}`,
      openedBy,
      openedAt: new Date().toISOString(),
      openingCashUSD,
      openingCashLRD,
      expectedCashUSD: openingCashUSD,
      expectedCashLRD: openingCashLRD,
      totalSalesUSD: 0,
      totalSalesLRD: 0,
      status: 'OPEN',
      movements: [],
    };
    sessions.unshift(newSession);
    saveItem(STORAGE_KEYS.CASH_SESSIONS, sessions);
    this.logAudit(
      'manage_cash',
      'CASH_SESSION',
      newSession.id,
      `Opened cash drawer shift. Float: $${openingCashUSD.toFixed(2)} and L$${openingCashLRD.toFixed(0)}`
    );
    return newSession;
  }

  static closeCashSession(
    sessionId: string,
    closedBy: string,
    closingUSD: number,
    closingLRD: number,
    notes?: string
  ): CashSession | null {
    const sessions = this.getCashSessions();
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return null;

    session.status = 'CLOSED';
    session.closedBy = closedBy;
    session.closedAt = new Date().toISOString();
    session.closingCashUSD = closingUSD;
    session.closingCashLRD = closingLRD;
    session.notes = notes;

    saveItem(STORAGE_KEYS.CASH_SESSIONS, sessions);
    const diffUSD = closingUSD - session.expectedCashUSD;
    const diffLRD = closingLRD - session.expectedCashLRD;

    this.logAudit(
      'manage_cash',
      'CASH_SESSION',
      session.id,
      `Closed cash shift. Diff: USD ${diffUSD >= 0 ? '+' : ''}$${diffUSD.toFixed(2)}, LRD ${diffLRD >= 0 ? '+' : ''}L$${diffLRD.toFixed(0)}`
    );
    return session;
  }

  static saveCashSession(session: CashSession): void {
    const sessions = this.getCashSessions();
    const idx = sessions.findIndex((s) => s.id === session.id);
    if (idx >= 0) sessions[idx] = session;
    else sessions.push(session);
    saveItem(STORAGE_KEYS.CASH_SESSIONS, sessions);
  }

  // Audit Logs
  static getAuditLogs(): AuditLogEntry[] {
    return loadItem<AuditLogEntry[]>(STORAGE_KEYS.AUDIT_LOGS, []);
  }

  static logAudit(action: string, entityType: string, entityId: string, details: string): void {
    const logs = this.getAuditLogs();
    const user = this.getActiveUser();
    const entry: AuditLogEntry = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      userId: user.id,
      userName: user.name,
      action,
      entityType,
      entityId,
      details,
      timestamp: new Date().toISOString(),
    };
    logs.unshift(entry);
    if (logs.length > 500) logs.pop(); // keep last 500 entries
    saveItem(STORAGE_KEYS.AUDIT_LOGS, logs);
  }

  // Offline Synchronization Queue
  static getSyncQueue(): SyncQueueItem[] {
    return loadItem<SyncQueueItem[]>(STORAGE_KEYS.SYNC_QUEUE, []);
  }

  static enqueueSync(type: SyncQueueItem['type'], payload: any): void {
    const queue = this.getSyncQueue();
    queue.push({
      id: `sync-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      clientTxId: payload.id || `tx-${Date.now()}`,
      type,
      payload,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    });
    saveItem(STORAGE_KEYS.SYNC_QUEUE, queue);
  }

  static clearSyncedQueue(): void {
    const queue = this.getSyncQueue().filter((item) => item.status !== 'SYNCED');
    saveItem(STORAGE_KEYS.SYNC_QUEUE, queue);
  }

  static isOnline(): boolean {
    return loadItem<boolean>(STORAGE_KEYS.IS_ONLINE, true);
  }

  static setOnline(online: boolean): void {
    saveItem(STORAGE_KEYS.IS_ONLINE, online);
  }

  // Cross-Device Server Synchronization
  static getAllDataForSync(): any {
    return {
      products: this.getProducts(),
      categories: this.getCategories(),
      units: this.getUnits(),
      suppliers: this.getSuppliers(),
      customers: this.getCustomers(),
      sales: this.getSales(),
      receipts: this.getReceipts(),
      intakes: this.getIntakes(),
      batches: this.getBatches(),
      movements: this.getMovements(),
      repayments: this.getRepayments(),
      cashSessions: this.getCashSessions(),
      settings: this.getSettings(),
      auditLogs: this.getAuditLogs(),
      users: this.getUsers(),
    };
  }

  static applyServerState(state: any, mode: 'replace' | 'merge' = 'merge'): void {
    if (!state || typeof state !== 'object') return;

    // Helper to merge lists by item id or unique barcode/name
    const mergeList = <T extends { id: string; barcode?: string; name?: string }>(currentList: T[], incomingList: T[]): T[] => {
      if (mode === 'replace') return incomingList;
      const map = new Map<string, T>();
      currentList.forEach((item) => {
        if (item && item.id) map.set(item.id, item);
      });
      incomingList.forEach((item) => {
        if (!item) return;
        if (item.id) {
          map.set(item.id, item);
        } else if (item.barcode) {
          // If no id, check by barcode
          const existing = currentList.find((c) => c.barcode && c.barcode === item.barcode);
          if (existing) {
            map.set(existing.id, { ...existing, ...item, id: existing.id });
          } else {
            const newId = `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
            map.set(newId, { ...item, id: newId });
          }
        } else if (item.name) {
          // Check by name
          const existing = currentList.find((c) => c.name && c.name.toLowerCase() === item.name!.toLowerCase());
          if (existing) {
            map.set(existing.id, { ...existing, ...item, id: existing.id });
          } else {
            const newId = `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
            map.set(newId, { ...item, id: newId });
          }
        }
      });
      return Array.from(map.values());
    };

    if (Array.isArray(state.products) && state.products.length > 0) {
      const merged = mergeList(this.getProducts(), state.products);
      saveItem(STORAGE_KEYS.PRODUCTS, merged);
    }
    if (Array.isArray(state.categories) && state.categories.length > 0) {
      const merged = mergeList(this.getCategories(), state.categories);
      saveItem(STORAGE_KEYS.CATEGORIES, merged);
    }
    if (Array.isArray(state.units) && state.units.length > 0) {
      const merged = mergeList(this.getUnits(), state.units);
      saveItem(STORAGE_KEYS.UNITS, merged);
    }
    if (Array.isArray(state.suppliers) && state.suppliers.length > 0) {
      const merged = mergeList(this.getSuppliers(), state.suppliers);
      saveItem(STORAGE_KEYS.SUPPLIERS, merged);
    }
    if (Array.isArray(state.customers) && state.customers.length > 0) {
      const merged = mergeList(this.getCustomers(), state.customers);
      saveItem(STORAGE_KEYS.CUSTOMERS, merged);
    }
    if (Array.isArray(state.sales) && state.sales.length > 0) {
      const merged = mergeList(this.getSales(), state.sales);
      saveItem(STORAGE_KEYS.SALES, merged);
    }
    if (Array.isArray(state.receipts) && state.receipts.length > 0) {
      const merged = mergeList(this.getReceipts(), state.receipts);
      saveItem(STORAGE_KEYS.RECEIPTS, merged);
    }
    if (Array.isArray(state.intakes) && state.intakes.length > 0) {
      const merged = mergeList(this.getIntakes(), state.intakes);
      saveItem(STORAGE_KEYS.INTAKES, merged);
    }
    if (Array.isArray(state.batches) && state.batches.length > 0) {
      const merged = mergeList(this.getBatches(), state.batches);
      saveItem(STORAGE_KEYS.BATCHES, merged);
    }
    if (Array.isArray(state.movements) && state.movements.length > 0) {
      const merged = mergeList(this.getMovements(), state.movements);
      saveItem(STORAGE_KEYS.MOVEMENTS, merged);
    }
    if (Array.isArray(state.repayments) && state.repayments.length > 0) {
      const merged = mergeList(this.getRepayments(), state.repayments);
      saveItem(STORAGE_KEYS.REPAYMENTS, merged);
    }
    if (Array.isArray(state.cashSessions) && state.cashSessions.length > 0) {
      const merged = mergeList(this.getCashSessions(), state.cashSessions);
      saveItem(STORAGE_KEYS.CASH_SESSIONS, merged);
    }
    if (Array.isArray(state.auditLogs) && state.auditLogs.length > 0) {
      const merged = mergeList(this.getAuditLogs(), state.auditLogs);
      saveItem(STORAGE_KEYS.AUDIT_LOGS, merged);
    }
    if (Array.isArray(state.users) && state.users.length > 0) {
      const merged = mergeList(this.getUsers(), state.users);
      saveItem(STORAGE_KEYS.USERS, merged);
    }
    if (state.settings && typeof state.settings === 'object') {
      const current = this.getSettings();
      saveItem(STORAGE_KEYS.SETTINGS, { ...current, ...state.settings });
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('app-storage-updated', { detail: { source: 'cloud-sync' } }));
    }
  }
}
