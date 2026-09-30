import {
  AppModuleId,
  AuditLogEntry,
  BusinessSettings,
  CashSession,
  Category,
  Customer,
  CustomerRepayment,
  PackageDefinition,
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
  INITIAL_PACKAGE_DEFINITIONS,
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
  PACKAGE_DEFINITIONS: 'addition_pos_package_definitions',
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
  DELETED_IDS: 'addition_pos_deleted_ids',
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
    let needsSave = false;

    // Automatic migration to Addition Business Centre if default placeholder was stored
    if (s.name === 'Addition Shop' || !s.name) {
      s.name = 'Addition Business Centre';
      if (s.receiptHeader && s.receiptHeader.includes('ADDITION SHOP')) {
        s.receiptHeader = s.receiptHeader.replace('ADDITION SHOP', 'ADDITION BUSINESS CENTRE');
      }
      needsSave = true;
    }

    // Default tax architecture fields
    if (!s.taxName) {
      s.taxName = 'GST';
      needsSave = true;
    }
    if (!s.taxCalculationType) {
      s.taxCalculationType = 'EXCLUSIVE';
      needsSave = true;
    }
    if (!s.storeTIN) {
      s.storeTIN = 'TIN-LIB-770921';
      needsSave = true;
    }

    // Initialize 30-Day Evaluation Trial if not yet configured
    if (!s.trialExpiresAt && s.licenseStatus !== 'LIFETIME') {
      s.trialStartedAt = s.trialStartedAt || new Date().toISOString();
      s.trialExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      s.licenseStatus = 'TRIAL';
      s.licensedTo = s.name || 'Client Store';
      needsSave = true;
    }

    if (needsSave) {
      this.saveSettings(s);
    }
    return s;
  }

  // License & 30-Day Evaluation Management
  static getLicenseInfo(): {
    status: 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'LIFETIME';
    expiresAt: string | null;
    startedAt: string;
    daysRemaining: number;
    hoursRemaining: number;
    isExpired: boolean;
    licensedTo: string;
    isLifetime: boolean;
  } {
    const s = this.getSettings();
    const isLifetime = s.licenseStatus === 'LIFETIME';
    const expiresAt = s.trialExpiresAt || null;
    const startedAt = s.trialStartedAt || new Date().toISOString();
    const now = Date.now();

    if (isLifetime) {
      return {
        status: 'LIFETIME',
        expiresAt: null,
        startedAt,
        daysRemaining: 9999,
        hoursRemaining: 99999,
        isExpired: false,
        licensedTo: s.licensedTo || s.name,
        isLifetime: true,
      };
    }

    const expiryTime = expiresAt ? new Date(expiresAt).getTime() : now + 30 * 24 * 60 * 60 * 1000;
    const diffMs = expiryTime - now;
    const isExpired = diffMs <= 0;
    const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    const hoursRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60)));

    return {
      status: isExpired ? 'EXPIRED' : (s.licenseStatus || 'TRIAL'),
      expiresAt: expiresAt || new Date(expiryTime).toISOString(),
      startedAt,
      daysRemaining,
      hoursRemaining,
      isExpired,
      licensedTo: s.licensedTo || s.name,
      isLifetime: false,
    };
  }

  static resetTrialPeriod(days: number = 30, clientName?: string): BusinessSettings {
    const s = this.getSettings();
    const now = new Date();
    s.trialStartedAt = now.toISOString();
    s.trialExpiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
    s.licenseStatus = 'TRIAL';
    if (clientName && clientName.trim()) {
      s.licensedTo = clientName.trim();
    }
    s.updatedAt = new Date().toISOString();
    this.saveSettings(s);
    this.logAudit(
      'license_management',
      'LICENSE',
      s.id,
      `Super Admin reset trial period: fresh ${days}-day evaluation granted (Expires: ${s.trialExpiresAt})`
    );
    return s;
  }

  static renewLicense(days: number = 30, newStatus: 'TRIAL' | 'ACTIVE' | 'LIFETIME' = 'ACTIVE'): BusinessSettings {
    const s = this.getSettings();
    if (newStatus === 'LIFETIME') {
      s.licenseStatus = 'LIFETIME';
      s.trialExpiresAt = undefined;
    } else {
      const now = Date.now();
      const currentExpiry = s.trialExpiresAt ? new Date(s.trialExpiresAt).getTime() : now;
      const base = currentExpiry > now ? currentExpiry : now;
      s.trialExpiresAt = new Date(base + days * 24 * 60 * 60 * 1000).toISOString();
      s.licenseStatus = newStatus;
    }
    s.updatedAt = new Date().toISOString();
    this.saveSettings(s);
    this.logAudit('license_management', 'LICENSE', s.id, `Extended license by ${days} days (Status: ${newStatus})`);
    return s;
  }

  static expireTrialNow(): BusinessSettings {
    const s = this.getSettings();
    s.trialExpiresAt = new Date(Date.now() - 60 * 1000).toISOString();
    s.licenseStatus = 'EXPIRED';
    s.updatedAt = new Date().toISOString();
    this.saveSettings(s);
    this.logAudit('license_management', 'LICENSE', s.id, 'Simulated trial expiration for testing');
    return s;
  }

  static setCustomTrialExpiry(isoDateString: string, licensedTo?: string): BusinessSettings {
    const s = this.getSettings();
    s.trialExpiresAt = isoDateString;
    s.licenseStatus = 'ACTIVE';
    if (licensedTo) s.licensedTo = licensedTo;
    s.updatedAt = new Date().toISOString();
    this.saveSettings(s);
    this.logAudit('license_management', 'LICENSE', s.id, `Set custom trial expiration to ${isoDateString}`);
    return s;
  }

  static recalculateProductPrices(newRate: number): number {
    if (!newRate || newRate <= 0) return 0;
    const currentProducts = this.getProducts();
    let updatedCount = 0;
    const nowIso = new Date().toISOString();
    const updatedProducts = currentProducts.map((prod) => {
      let changed = false;
      const copy = { ...prod, updatedAt: nowIso };

      if (copy.pricingCurrency === 'LRD') {
        // Base currency is LRD -> recalculate USD equivalent
        if (copy.sellingPriceLRD > 0) {
          copy.sellingPriceUSD = Math.round((copy.sellingPriceLRD / newRate) * 100) / 100;
          changed = true;
        }
        if (copy.costPriceLRD && copy.costPriceLRD > 0) {
          copy.costPriceUSD = Math.round((copy.costPriceLRD / newRate) * 100) / 100;
          changed = true;
        }
      } else {
        // Base currency is USD or DUAL -> recalculate LRD equivalent
        if (copy.sellingPriceUSD > 0) {
          copy.sellingPriceLRD = Math.round(copy.sellingPriceUSD * newRate);
          changed = true;
        } else if (copy.sellingPriceLRD > 0) {
          copy.sellingPriceUSD = Math.round((copy.sellingPriceLRD / newRate) * 100) / 100;
          changed = true;
        }

        if (copy.costPriceUSD > 0) {
          copy.costPriceLRD = Math.round(copy.costPriceUSD * newRate);
          changed = true;
        } else if (copy.costPriceLRD && copy.costPriceLRD > 0) {
          copy.costPriceUSD = Math.round((copy.costPriceLRD / newRate) * 100) / 100;
          changed = true;
        }
      }

      // Recalculate package and fractional tier prices (Full, Half, Quarter) consistently
      if (copy.hasPackageUnit) {
        if (copy.pricingCurrency === 'LRD') {
          if (copy.packagePriceLRD && copy.packagePriceLRD > 0) {
            copy.packagePriceUSD = Math.round((copy.packagePriceLRD / newRate) * 100) / 100;
            changed = true;
          }
          if (copy.halfPackagePriceLRD && copy.halfPackagePriceLRD > 0) {
            copy.halfPackagePriceUSD = Math.round((copy.halfPackagePriceLRD / newRate) * 100) / 100;
            changed = true;
          }
          if (copy.quarterPackagePriceLRD && copy.quarterPackagePriceLRD > 0) {
            copy.quarterPackagePriceUSD = Math.round((copy.quarterPackagePriceLRD / newRate) * 100) / 100;
            changed = true;
          }
        } else {
          // USD or DUAL
          if (copy.packagePriceUSD && copy.packagePriceUSD > 0) {
            copy.packagePriceLRD = Math.round(copy.packagePriceUSD * newRate);
            changed = true;
          } else if (copy.packagePriceLRD && copy.packagePriceLRD > 0) {
            copy.packagePriceUSD = Math.round((copy.packagePriceLRD / newRate) * 100) / 100;
            changed = true;
          }

          if (copy.halfPackagePriceUSD && copy.halfPackagePriceUSD > 0) {
            copy.halfPackagePriceLRD = Math.round(copy.halfPackagePriceUSD * newRate);
            changed = true;
          }
          if (copy.quarterPackagePriceUSD && copy.quarterPackagePriceUSD > 0) {
            copy.quarterPackagePriceLRD = Math.round(copy.quarterPackagePriceUSD * newRate);
            changed = true;
          }
        }
      }

      if (changed) updatedCount++;
      return copy;
    });

    if (updatedCount > 0) {
      saveItem(STORAGE_KEYS.PRODUCTS, updatedProducts);
    }
    return updatedCount;
  }

  static isDarkMode(): boolean {
    const s = this.getSettings();
    if (typeof s.darkMode === 'boolean') return s.darkMode;
    try {
      const stored = localStorage.getItem('addition_pos_theme');
      if (stored === 'dark') return true;
      if (stored === 'light') return false;
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  }

  static setDarkMode(enabled: boolean): BusinessSettings {
    const s = this.getSettings();
    s.darkMode = enabled;
    s.updatedAt = new Date().toISOString();
    try {
      localStorage.setItem('addition_pos_theme', enabled ? 'dark' : 'light');
    } catch {}
    if (typeof document !== 'undefined') {
      if (enabled) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    this.saveSettings(s);
    return s;
  }

  static saveSettings(settings: BusinessSettings): void {
    const oldSettings = loadItem<BusinessSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_BUSINESS_SETTINGS);
    const rateChanged = typeof settings.exchangeRate === 'number' && settings.exchangeRate > 0 && settings.exchangeRate !== oldSettings.exchangeRate;
    
    settings.updatedAt = settings.updatedAt || new Date().toISOString();

    if (typeof settings.darkMode === 'boolean') {
      try {
        localStorage.setItem('addition_pos_theme', settings.darkMode ? 'dark' : 'light');
      } catch {}
      if (typeof document !== 'undefined') {
        if (settings.darkMode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    }

    saveItem(STORAGE_KEYS.SETTINGS, settings);

    if (rateChanged) {
      this.recalculateProductPrices(settings.exchangeRate);
    }

    this.logAudit(
      'manage_settings',
      'SETTINGS',
      settings.id,
      `Updated shop settings. Business Name: ${settings.name}, Rate: 1 USD = ${settings.exchangeRate} LRD`
    );

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('app-storage-updated', {
          detail: { source: 'save-settings', settings, rateChanged },
        })
      );
    }
  }

  // Daily Morning Exchange Rate confirmation
  static confirmExchangeRate(newRate?: number): BusinessSettings {
    const settings = this.getSettings();
    const rateToApply = typeof newRate === 'number' && newRate > 0 ? newRate : settings.exchangeRate;
    const today = new Date().toISOString().split('T')[0];
    const nowIso = new Date().toISOString();

    const updated: BusinessSettings = {
      ...settings,
      exchangeRate: rateToApply,
      lastExchangeRateReviewDate: today,
      exchangeRateLastConfirmedDate: today,
      updatedAt: nowIso,
    };

    this.saveSettings(updated);
    this.recalculateProductPrices(rateToApply);

    return updated;
  }

  static isExchangeRateVerifiedToday(): boolean {
    const settings = this.getSettings();
    const today = new Date().toISOString().split('T')[0];
    return settings.lastExchangeRateReviewDate === today;
  }

  // Users & Auth
  static getUsers(): User[] {
    let list = loadItem<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
    // Ensure Super Admin exists if user list is from older local storage
    if (!list.some((u) => u.role === 'superadmin' || u.id === 'usr-super')) {
      const superAdminUser = INITIAL_USERS.find((u) => u.id === 'usr-super');
      if (superAdminUser) {
        list = [superAdminUser, ...list];
        saveItem(STORAGE_KEYS.USERS, list);
      }
    }

    let modified = false;
    const enriched = list.map((u) => {
      if (!u.allowedModules || u.allowedModules.length === 0) {
        modified = true;
        const initial = INITIAL_USERS.find((init) => init.id === u.id);
        const allowed: AppModuleId[] = initial?.allowedModules || (
          (u.role === 'superadmin' || u.role === 'owner') ? ['pos', 'inventory', 'orders', 'reports', 'settings'] :
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
          canManageUsers: u.canManageUsers ?? (u.role === 'superadmin' || u.role === 'owner'),
          canEditSettings: u.canEditSettings ?? (u.role === 'superadmin' || u.role === 'owner'),
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
    // Default to the Shop Owner / client profile
    const defaultUser = users.find((u) => u.role === 'owner' && u.isActive) ||
      users.find((u) => u.role !== 'superadmin' && u.isActive) ||
      users[0];
    return defaultUser;
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
  // Deleted items tombstone tracking (prevents cloud sync resurrection)
  static getDeletedIds(): string[] {
    return loadItem<string[]>(STORAGE_KEYS.DELETED_IDS, []);
  }

  static trackDeletedId(id: string): void {
    if (!id) return;
    const current = this.getDeletedIds();
    if (!current.includes(id)) {
      current.push(id);
      saveItem(STORAGE_KEYS.DELETED_IDS, current);
    }
  }

  static getCategories(): Category[] {
    const deleted = new Set(this.getDeletedIds());
    const raw = loadItem<Category[]>(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
    if (!Array.isArray(raw)) return [];
    return raw.filter((c) => !deleted.has(c.id));
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
    this.trackDeletedId(id);
    const list = this.getCategories().filter((c) => c.id !== id);
    saveItem(STORAGE_KEYS.CATEGORIES, list);
    this.logAudit('manage_categories', 'CATEGORY', id, `Deleted unused category`);
    return true;
  }

  static getUnits(): Unit[] {
    return loadItem<Unit[]>(STORAGE_KEYS.UNITS, INITIAL_UNITS);
  }

  static saveUnit(unit: Unit): void {
    const list = this.getUnits();
    const idx = list.findIndex((u) => u.id === unit.id);
    if (idx >= 0) list[idx] = unit;
    else list.push(unit);
    saveItem(STORAGE_KEYS.UNITS, list);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('app-storage-updated', { detail: { key: STORAGE_KEYS.UNITS } }));
    }
  }

  // Package Definitions (Wholesale & Bulk Containers: Dozen, Carton, Crate, Box, Bundle, etc.)
  static getPackageDefinitions(): PackageDefinition[] {
    return loadItem<PackageDefinition[]>(STORAGE_KEYS.PACKAGE_DEFINITIONS, INITIAL_PACKAGE_DEFINITIONS);
  }

  static savePackageDefinition(pkg: PackageDefinition): void {
    const list = this.getPackageDefinitions();
    const idx = list.findIndex((p) => p.id === pkg.id);
    if (idx >= 0) list[idx] = pkg;
    else list.push(pkg);
    saveItem(STORAGE_KEYS.PACKAGE_DEFINITIONS, list);
    this.logAudit(
      'manage_settings',
      'PACKAGE_DEFINITION',
      pkg.id,
      `Saved package definition: ${pkg.name} (${pkg.multiplier} units)`
    );
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('app-storage-updated', { detail: { key: STORAGE_KEYS.PACKAGE_DEFINITIONS } }));
    }
  }

  static deletePackageDefinition(id: string): boolean {
    const list = this.getPackageDefinitions();
    const target = list.find((p) => p.id === id);
    if (!target) return false;
    const filtered = list.filter((p) => p.id !== id);
    saveItem(STORAGE_KEYS.PACKAGE_DEFINITIONS, filtered);
    this.logAudit('manage_settings', 'PACKAGE_DEFINITION', id, `Deleted package definition: ${target.name}`);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('app-storage-updated', { detail: { key: STORAGE_KEYS.PACKAGE_DEFINITIONS } }));
    }
    return true;
  }

  // Products
  static getProducts(): Product[] {
    const deleted = new Set(this.getDeletedIds());
    const raw = loadItem<Product[]>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    if (!Array.isArray(raw)) return [];
    
    // Backfill package units & fractional tiers for standard demo items if not present in existing localStorage
    let modified = false;
    const backfilled = raw.map((p) => {
      const initMatch = INITIAL_PRODUCTS.find((ip) => ip.id === p.id);
      let pModified = false;
      const copy = { ...p };

      if (!copy.taxStatus) {
        copy.taxStatus = initMatch?.taxStatus || 'TAXABLE';
        pModified = true;
      }

      if (initMatch && initMatch.hasPackageUnit && !copy.hasPackageUnit) {
        copy.hasPackageUnit = true;
        copy.packageUnitName = initMatch.packageUnitName;
        copy.packageMultiplier = initMatch.packageMultiplier;
        copy.packagePriceUSD = initMatch.packagePriceUSD;
        copy.packagePriceLRD = initMatch.packagePriceLRD;
        copy.packageCostUSD = initMatch.packageCostUSD;
        pModified = true;
      }

      if (copy.hasPackageUnit && (!copy.halfPackagePriceUSD || !copy.quarterPackagePriceUSD)) {
        if (initMatch?.halfPackagePriceUSD) {
          copy.halfPackagePriceUSD = initMatch.halfPackagePriceUSD;
          copy.halfPackagePriceLRD = initMatch.halfPackagePriceLRD;
          copy.quarterPackagePriceUSD = initMatch.quarterPackagePriceUSD;
          copy.quarterPackagePriceLRD = initMatch.quarterPackagePriceLRD;
        } else {
          const fullUSD = copy.packagePriceUSD || (copy.sellingPriceUSD * (copy.packageMultiplier || 24) * 0.9);
          copy.halfPackagePriceUSD = Math.round((fullUSD / 2) * 100) / 100;
          copy.halfPackagePriceLRD = Math.round(copy.halfPackagePriceUSD * 195);
          copy.quarterPackagePriceUSD = Math.round((fullUSD / 4) * 100) / 100;
          copy.quarterPackagePriceLRD = Math.round(copy.quarterPackagePriceUSD * 195);
        }
        pModified = true;
      }

      if (pModified) modified = true;
      return copy;
    });
    if (modified) {
      saveItem(STORAGE_KEYS.PRODUCTS, backfilled);
    }

    return backfilled.filter((p) => !deleted.has(p.id));
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
    this.trackDeletedId(productId);
    const products = this.getProducts().filter((p) => p.id !== productId);
    saveItem(STORAGE_KEYS.PRODUCTS, products);
    this.enqueueSync('STOCK_ADJUSTMENT', { id: productId, isDeleted: true });
    this.logAudit(
      'edit_product',
      'PRODUCT',
      productId,
      `Deleted product ${productId} by ${deletedBy}`
    );
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('app-storage-updated', {
          detail: { key: STORAGE_KEYS.PRODUCTS, deletedId: productId, source: 'delete-product' },
        })
      );
    }
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
        const noteDetail = (item.isPackagePurchase && item.packagesCount)
          ? `Purchased ${item.packagesCount} ${item.packageUnitName || 'Cartons'} (${item.quantity} base units) from ${intake.supplierName} (${intake.invoiceNumber})`
          : `Received from ${intake.supplierName} (${intake.invoiceNumber})`;

        movements.unshift({
          id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          productId: prod.id,
          productName: item.productName || prod.name,
          batchId,
          type: 'PURCHASE_INTAKE',
          quantity: item.quantity,
          resultingStock: prod.currentStock,
          unitCostUSD: item.unitCostUSD,
          referenceId: intake.invoiceNumber,
          notes: noteDetail,
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
    performedBy: string = 'Store Staff',
    customNotes?: string
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
      notes: customNotes || `Direct intake of +${quantityToAdd} units received by ${performedBy}${supplierName ? ` from ${supplierName}` : ''}`,
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
        // Multiplier: if item was sold as wholesale package, baseUnitQuantity will be e.g. 12 (1 pack of 12 = 12 single bottles)
        const unitsDeducted = Math.round(item.quantity * (item.baseUnitQuantity || 1) * 100) / 100;
        prod.currentStock = Math.max(0, prod.currentStock - unitsDeducted);
        prod.updatedAt = new Date().toISOString();

        // FIFO deduction from remaining batch stock
        let needed = unitsDeducted;
        const prodBatches = batches.filter((b) => b.productId === prod.id && b.quantityRemaining > 0);
        for (const b of prodBatches) {
          if (needed <= 0) break;
          const take = Math.min(b.quantityRemaining, needed);
          b.quantityRemaining -= take;
          needed -= take;
        }

        // Add movement
        const modeLabel = item.saleMode === 'WHOLESALE' ? ` [Wholesale ${item.unitLabel || 'Pack'}]` : '';
        movements.unshift({
          id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          productId: prod.id,
          productName: `${prod.name}${modeLabel}`,
          type: 'SALE',
          quantity: -unitsDeducted,
          resultingStock: prod.currentStock,
          unitCostUSD: item.unitCostUSD,
          referenceId: sale.receiptNumber,
          notes: item.saleMode === 'WHOLESALE' ? `Sold ${item.quantity} ${item.unitLabel || 'Packs'} (${unitsDeducted} base units)` : undefined,
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
    const list = loadItem<Customer[]>(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
    let modified = false;
    INITIAL_CUSTOMERS.forEach((initCust) => {
      const match = list.find((c) => c.id === initCust.id);
      if (!match) {
        list.push(initCust);
        modified = true;
      } else {
        if (!match.tin && initCust.tin) {
          match.tin = initCust.tin;
          modified = true;
        }
        if (match.taxExempt === undefined && initCust.taxExempt !== undefined) {
          match.taxExempt = initCust.taxExempt;
          modified = true;
        }
      }
    });
    if (modified) {
      saveItem(STORAGE_KEYS.CUSTOMERS, list);
    }
    return list;
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

  // Suppliers / Distributors
  static getSuppliers(): Supplier[] {
    const list = loadItem<Supplier[]>(STORAGE_KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
    let modified = false;
    INITIAL_SUPPLIERS.forEach((initSup) => {
      const match = list.find((s) => s.id === initSup.id);
      if (match && !match.tin && initSup.tin) {
        match.tin = initSup.tin;
        modified = true;
      }
    });
    if (modified) {
      saveItem(STORAGE_KEYS.SUPPLIERS, list);
    }
    return list;
  }

  static saveSupplier(supplier: Supplier): void {
    const list = this.getSuppliers();
    const idx = list.findIndex((s) => s.id === supplier.id);
    const isNew = idx < 0;
    if (isNew) {
      list.push(supplier);
    } else {
      list[idx] = supplier;
    }
    saveItem(STORAGE_KEYS.SUPPLIERS, list);
    this.logAudit(
      'manage_suppliers',
      'SUPPLIER',
      supplier.id,
      `${isNew ? 'Added new' : 'Updated'} distributor/supplier: ${supplier.name} (${supplier.phone})`
    );
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('app-storage-updated', {
          detail: { key: STORAGE_KEYS.SUPPLIERS, source: 'save-supplier' },
        })
      );
    }
  }

  static deleteSupplier(supplierId: string): boolean {
    const list = this.getSuppliers();
    const target = list.find((s) => s.id === supplierId);
    if (!target) return false;

    // Check if supplier is referenced in past intakes
    const intakes = this.getIntakes();
    const intakeCount = intakes.filter((it) => it.supplierId === supplierId).length;
    if (intakeCount > 0) {
      // Don't hard-delete if history exists, or warn user
      return false;
    }

    const filtered = list.filter((s) => s.id !== supplierId);
    saveItem(STORAGE_KEYS.SUPPLIERS, filtered);
    this.logAudit(
      'manage_suppliers',
      'SUPPLIER',
      supplierId,
      `Deleted distributor ${target.name}`
    );
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('app-storage-updated', {
          detail: { key: STORAGE_KEYS.SUPPLIERS, source: 'delete-supplier' },
        })
      );
    }
    return true;
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
      deletedIds: this.getDeletedIds(),
    };
  }

  static applyServerState(state: any, mode: 'replace' | 'merge' = 'merge'): void {
    if (!state || typeof state !== 'object') return;

    // Track any deletions reported by server
    if (Array.isArray(state.deletedIds)) {
      state.deletedIds.forEach((id: string) => this.trackDeletedId(id));
    }
    const deletedIds = new Set(this.getDeletedIds());

    // Helper to merge lists by item id or unique barcode/name
    const mergeList = <T extends { id: string; barcode?: string; name?: string }>(currentList: T[], incomingList: T[]): T[] => {
      if (mode === 'replace') return incomingList.filter((i) => !deletedIds.has(i.id));
      const map = new Map<string, T>();
      currentList.forEach((item) => {
        if (item && item.id && !deletedIds.has(item.id)) map.set(item.id, item);
      });
      incomingList.forEach((item) => {
        if (!item || (item.id && deletedIds.has(item.id))) return;
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
      return Array.from(map.values()).filter((item) => !deletedIds.has(item.id));
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
      const currentTime = current.updatedAt ? new Date(current.updatedAt).getTime() : 0;
      const incomingTime = state.settings.updatedAt ? new Date(state.settings.updatedAt).getTime() : 0;
      
      // Only apply if server settings are strictly newer than local settings
      if (incomingTime > currentTime || (!current.exchangeRate && state.settings.exchangeRate)) {
        const rateChanged = typeof state.settings.exchangeRate === 'number' && state.settings.exchangeRate > 0 && state.settings.exchangeRate !== current.exchangeRate;
        const mergedSettings: BusinessSettings = { ...current, ...state.settings };
        saveItem(STORAGE_KEYS.SETTINGS, mergedSettings);
        if (rateChanged) {
          this.recalculateProductPrices(state.settings.exchangeRate);
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('app-storage-updated', { detail: { source: 'cloud-sync', settingsUpdated: true } }));
        }
      }
    }
  }
}
