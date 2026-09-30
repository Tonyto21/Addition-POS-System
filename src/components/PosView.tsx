import React, { useState, useEffect, useRef } from 'react';
import {
  Barcode,
  Camera,
  Check,
  CreditCard,
  DollarSign,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  X,
  Clock,
  LayoutGrid,
  Calculator,
  Percent,
  User,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  ArrowUpDown,
  Edit2,
  Package,
  Save,
  CheckCircle2,
  Boxes,
  Lock,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import {
  BusinessSettings,
  CartItem,
  Customer,
  PaymentMethod,
  Product,
  ReceiptSnapshot,
  Sale,
  SalePayment,
  SellingTier,
  User as UserType,
} from '../types';
import { playBeep } from '../utils/audio';
import { OfflineStorageManager } from '../utils/storage';
import {
  calculateOrderTax,
  formatStockWithCartons,
  getSellingTiers,
  TierOption,
} from '../utils/tierAndTaxUtils';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { ReceiptModal } from './ReceiptModal';
import { SquareKeypad } from './SquareKeypad';

type SortCriteria =
  | 'latest'
  | 'name_asc'
  | 'name_desc'
  | 'stock_low'
  | 'stock_high'
  | 'price_asc'
  | 'price_desc';

interface PosViewProps {
  settings: BusinessSettings;
  activeUser: UserType;
  onNavigateToStockIntake?: () => void;
  onRefreshData?: () => void;
}

export const PosView: React.FC<PosViewProps> = ({
  settings,
  activeUser,
  onRefreshData,
  onNavigateToStockIntake,
}) => {
  const [products, setProducts] = useState<Product[]>(() => OfflineStorageManager.getProducts());
  const [customers] = useState<Customer[]>(() => OfflineStorageManager.getCustomers());
  const [categories, setCategories] = useState(() => OfflineStorageManager.getCategories());
  const [units] = useState(() => OfflineStorageManager.getUnits());

  // Real-time synchronization whenever storage updates anywhere in the app
  useEffect(() => {
    const handleUpdate = () => {
      setProducts(OfflineStorageManager.getProducts());
      setCategories(OfflineStorageManager.getCategories());
    };
    window.addEventListener('app-storage-updated', handleUpdate);
    return () => window.removeEventListener('app-storage-updated', handleUpdate);
  }, []);

  // Mobile View Mode: 'catalog' (Items & Keypad) vs 'cart' (Current Ticket / Checkout)
  const [mobileTab, setMobileTab] = useState<'catalog' | 'cart'>('catalog');

  // Square POS Top Tab: Items Grid vs Custom Keypad
  const [catalogMode, setCatalogMode] = useState<'library' | 'keypad'>('library');

  // Sorting mode for products
  const [sortBy, setSortBy] = useState<SortCriteria>('latest');

  // Quick Edit Modal for Admin / Store Owner
  const isAdmin = activeUser.role === 'owner' || activeUser.role === 'manager';
  const [quickEditProduct, setQuickEditProduct] = useState<Product | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<Product | null>(null);
  const [quickEditQty, setQuickEditQty] = useState<string>('0');
  const [quickEditName, setQuickEditName] = useState<string>('');
  const [quickEditBarcode, setQuickEditBarcode] = useState<string>('');
  const [quickEditPriceLRD, setQuickEditPriceLRD] = useState<number>(0);
  const [quickEditPriceUSD, setQuickEditPriceUSD] = useState<number>(0);
  const [quickEditCostLRD, setQuickEditCostLRD] = useState<number>(0);
  const [quickEditCostUSD, setQuickEditCostUSD] = useState<number>(0);

  const handleConfirmDelete = () => {
    if (!deleteCandidate) return;
    OfflineStorageManager.deleteProduct(deleteCandidate.id, activeUser.name);
    setProducts(OfflineStorageManager.getProducts());
    setDeleteCandidate(null);
    setQuickEditProduct(null);
    onRefreshData?.();
  };

  const handleOpenQuickEdit = (p: Product) => {
    setQuickEditProduct(p);
    setQuickEditQty(p.currentStock.toString());
    setQuickEditName(p.name);
    setQuickEditBarcode(p.barcode || '');
    const lrd = p.sellingPriceLRD || Math.round(p.sellingPriceUSD * settings.exchangeRate);
    setQuickEditPriceLRD(lrd);
    setQuickEditPriceUSD(p.sellingPriceUSD);
    const costLrd = Math.round(p.costPriceUSD * settings.exchangeRate);
    setQuickEditCostLRD(costLrd);
    setQuickEditCostUSD(p.costPriceUSD);
  };

  const handleSaveQuickEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickEditProduct) return;

    const previousStock = quickEditProduct.currentStock;
    const newStock = parseFloat(quickEditQty) || 0;

    const updatedProduct: Product = {
      ...quickEditProduct,
      name: quickEditName.trim() || quickEditProduct.name,
      barcode: quickEditBarcode.trim(),
      currentStock: newStock,
      sellingPriceLRD: quickEditPriceLRD,
      sellingPriceUSD: quickEditPriceUSD,
      costPriceUSD: quickEditCostUSD,
      updatedAt: new Date().toISOString(),
    };

    OfflineStorageManager.saveProduct(updatedProduct);

    if (newStock !== previousStock) {
      OfflineStorageManager.adjustStockManual(
        updatedProduct.id,
        newStock,
        `Stock corrected on Home/POS screen by ${activeUser.name} (was ${previousStock})`,
        activeUser.name
      );
    }

    setQuickEditProduct(null);
    setScannerFeedback(`✅ Successfully updated ${updatedProduct.name}! New stock: ${newStock}`);
    setTimeout(() => setScannerFeedback(null), 3000);
    if (onRefreshData) onRefreshData();
  };

  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Scanner modal
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerFeedback, setScannerFeedback] = useState<string | null>(null);

  // Unit Choice Prompt Modal (Option A: high-contrast Retail vs Wholesale choice)
  const [unitSelectProduct, setUnitSelectProduct] = useState<Product | null>(null);

  // Sale Mode catalog filter: 'ALL' | 'WHOLESALE_ONLY' | 'RETAIL_ONLY'
  const [saleModeCatalogFilter, setSaleModeCatalogFilter] = useState<'ALL' | 'WHOLESALE_ONLY' | 'RETAIL_ONLY'>('ALL');

  // Manager Authorization Modal when modifying order during checkout
  const [managerAuthModalOpen, setManagerAuthModalOpen] = useState(false);
  const [managerPinInput, setManagerPinInput] = useState('');
  const [managerAuthError, setManagerAuthError] = useState<string | null>(null);

  // Checkout modal
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH_USD');
  const [tenderedUSD, setTenderedUSD] = useState<string>('');
  const [tenderedLRD, setTenderedLRD] = useState<string>('');
  const [overallDiscountUSD, setOverallDiscountUSD] = useState<number>(0);
  const [changeInLRDOnly, setChangeInLRDOnly] = useState<boolean>(true);

  // Completed Receipt Modal
  const [activeReceipt, setActiveReceipt] = useState<ReceiptSnapshot | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);

  // Held Carts (Suspend / Resume)
  const [heldCarts, setHeldCarts] = useState<{ id: string; time: string; customerName?: string; items: CartItem[] }[]>([]);

  // Selected tier per product card (e.g. for multiple selling tiers Full, Half, Quarter, Piece)
  const [cardSelectedTier, setCardSelectedTier] = useState<Record<string, SellingTier>>({});

  // Unified, line-aware Tax Calculation respecting Customer Exemption, Inclusive/Exclusive tax, and Line statuses
  const orderTax = calculateOrderTax({
    items: cart,
    overallDiscountUSD,
    settings,
    exchangeRate: settings.exchangeRate,
    customerTaxExempt: selectedCustomer?.taxExempt,
  });

  const subtotalUSD = orderTax.subtotalUSD;
  const subtotalLRD = orderTax.subtotalLRD;
  const discountUSD = orderTax.discountUSD;
  const taxableAmount = orderTax.taxableAmountUSD;
  const taxUSD = orderTax.taxUSD;
  const taxLRD = orderTax.taxLRD;
  const grandTotalUSD = orderTax.grandTotalUSD;
  const grandTotalLRD = orderTax.grandTotalLRD;

  // Handle Barcode Scan event: Autofills scanned number into search, finds item, adds to order, and closes modal
  const handleBarcodeScan = (barcode: string) => {
    const clean = barcode.trim();
    // 1. Autofill the scanned number into the search bar as requested by user
    setSearchQuery(clean);

    // 2. Look up product in inventory
    const prod = products.find(
      (p) =>
        p.barcode === clean ||
        (p.alternativeBarcodes && p.alternativeBarcodes.includes(clean)) ||
        p.sku.toLowerCase() === clean.toLowerCase()
    );

    if (prod) {
      playBeep('success');
      addToCart(prod, 1);
      const priceLrd = prod.sellingPriceLRD || Math.round(prod.sellingPriceUSD * settings.exchangeRate);
      setScannerFeedback(`Added to Order: ${prod.name} (L$ ${priceLrd.toLocaleString()})`);
      setTimeout(() => setScannerFeedback(null), 3000);
      setScannerOpen(false);

      // Focus search input so cashier can press enter or scan the next item
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.select();
        }
      }, 150);
    } else {
      playBeep('unknown');
      setScannerFeedback(`Scanned "${clean}" — Product not found in catalog`);
      setTimeout(() => setScannerFeedback(null), 3500);
      setScannerOpen(false);
    }
  };

  const handleItemClick = (product: Product) => {
    // If product has a wholesale package / tiers defined, open tier choice modal
    if (product.hasPackageUnit && (product.packageMultiplier || 1) > 1) {
      setUnitSelectProduct(product);
    } else {
      addToCart(product, 1, 'PIECE');
    }
  };

  const addToCart = (
    product: Product,
    quantityToAdd: number = 1,
    tier: SellingTier = 'PIECE',
    overridePriceUSD?: number,
    overridePriceLRD?: number
  ) => {
    const tiers = getSellingTiers(product, settings.exchangeRate);
    const targetTier = tiers.find((t) => t.tier === tier) || tiers[0];

    const baseMult = targetTier.multiplier;
    const unitLabel = targetTier.name;
    const tierLabel = targetTier.shortBadge;
    const mode: 'RETAIL' | 'WHOLESALE' = tier === 'PIECE' ? 'RETAIL' : 'WHOLESALE';

    const priceUSD = typeof overridePriceUSD === 'number' ? overridePriceUSD : targetTier.priceUSD;
    const priceLRD = typeof overridePriceLRD === 'number' ? overridePriceLRD : targetTier.priceLRD;

    setCart((prev) => {
      // Find matching item with same product ID AND same sellingTier (or mode)
      const existingIdx = prev.findIndex(
        (item) => item.product.id === product.id && (item.sellingTier ? item.sellingTier === tier : item.saleMode === mode)
      );

      if (existingIdx >= 0) {
        const updated = [...prev];
        const current = updated[existingIdx];
        const newQty = current.quantity + quantityToAdd;
        const totalUSD = newQty * current.unitPriceUSD;
        const totalLRD = Math.round(totalUSD * settings.exchangeRate);
        updated[existingIdx] = {
          ...current,
          quantity: newQty,
          totalUSD,
          totalLRD,
        };
        return updated;
      } else {
        const totalUSD = quantityToAdd * priceUSD;
        const totalLRD = Math.round(totalUSD * settings.exchangeRate);
        return [
          ...prev,
          {
            product,
            quantity: quantityToAdd,
            saleMode: mode,
            sellingTier: tier,
            unitLabel,
            tierLabel,
            taxStatus: product.taxStatus || 'TAXABLE',
            baseUnitQuantity: baseMult,
            unitPriceUSD: priceUSD,
            unitPriceLRD: priceLRD,
            discountUSD: 0,
            totalUSD,
            totalLRD,
          },
        ];
      }
    });
  };

  // Toggle existing cart item between Retail (single unit) and Wholesale (defined package)
  const toggleCartItemSaleMode = (productId: string, currentMode: 'RETAIL' | 'WHOLESALE') => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId && item.saleMode === currentMode) {
          if (!item.product.hasPackageUnit) return item;

          const newMode: 'RETAIL' | 'WHOLESALE' = currentMode === 'RETAIL' ? 'WHOLESALE' : 'RETAIL';
          const newTier: SellingTier = newMode === 'WHOLESALE' ? 'FULL' : 'PIECE';
          const tiers = getSellingTiers(item.product, settings.exchangeRate);
          const targetTier = tiers.find((t) => t.tier === newTier) || tiers[0];

          const totalUSD = item.quantity * targetTier.priceUSD;
          const totalLRD = Math.round(totalUSD * settings.exchangeRate);

          return {
            ...item,
            saleMode: newMode,
            sellingTier: newTier,
            unitLabel: targetTier.name,
            tierLabel: targetTier.shortBadge,
            baseUnitQuantity: targetTier.multiplier,
            unitPriceUSD: targetTier.priceUSD,
            unitPriceLRD: targetTier.priceLRD,
            totalUSD,
            totalLRD,
          };
        }
        return item;
      })
    );
  };

  // Add custom manual item from Square numpad
  const handleAddCustomItem = (name: string, priceUSD: number, priceLRD: number) => {
    const customProd: Product = {
      id: `custom-${Date.now()}`,
      sku: 'CUSTOM',
      barcode: '',
      alternativeBarcodes: [],
      name,
      categoryId: 'cat-custom',
      unitId: 'unt-pcs',
      sellingPriceUSD: priceUSD,
      sellingPriceLRD: priceLRD,
      costPriceUSD: 0,
      minStockLevel: 0,
      targetStockLevel: 0,
      currentStock: 9999,
      allowFractions: false,
      trackBatches: false,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addToCart(customProd, 1, 'PIECE');
  };

  const updateQuantity = (
    productId: string,
    newQty: number,
    tier?: SellingTier,
    mode?: 'RETAIL' | 'WHOLESALE'
  ) => {
    if (newQty <= 0) {
      removeFromCart(productId, tier, mode);
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        const matchesTier = tier ? item.sellingTier === tier : (!item.sellingTier && item.saleMode === mode);
        if (item.product.id === productId && (matchesTier || (!tier && !mode))) {
          const qty = item.product.allowFractions ? Math.round(newQty * 100) / 100 : Math.round(newQty);
          const totalUSD = qty * item.unitPriceUSD;
          const totalLRD = Math.round(totalUSD * settings.exchangeRate);
          return {
            ...item,
            quantity: qty,
            totalUSD,
            totalLRD,
          };
        }
        return item;
      })
    );
  };

  const removeFromCart = (
    productId: string,
    tier?: SellingTier,
    mode?: 'RETAIL' | 'WHOLESALE'
  ) => {
    setCart((prev) =>
      prev.filter((it) => {
        if (it.product.id !== productId) return true;
        if (tier && it.sellingTier) return it.sellingTier !== tier;
        if (mode && !it.sellingTier) return it.saleMode !== mode;
        return false;
      })
    );
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setOverallDiscountUSD(0);
  };

  // Hold / Resume Cart
  const handleHoldCart = () => {
    if (cart.length === 0) return;
    const newHeld = {
      id: `held-${Date.now()}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      customerName: selectedCustomer ? selectedCustomer.name : 'Walk-in',
      items: [...cart],
    };
    setHeldCarts((prev) => [newHeld, ...prev]);
    clearCart();
  };

  const handleResumeCart = (heldId: string) => {
    const target = heldCarts.find((h) => h.id === heldId);
    if (!target) return;
    setCart(target.items);
    setHeldCarts((prev) => prev.filter((h) => h.id !== heldId));
  };

  // Process completed sale
  const handleCompleteSale = () => {
    if (cart.length === 0) return;

    const receiptNum = `REC-${Date.now().toString().slice(-6)}`;
    const parsedTenderedUSD = parseFloat(tenderedUSD) || 0;
    const parsedTenderedLRD = parseFloat(tenderedLRD) || 0;

    let changeUSD = 0;
    let changeLRD = 0;
    let paidUSD = 0;
    let paidLRD = 0;

    let changeCurrencyPreference: 'LRD' | 'USD' = 'LRD'; // In Liberia, change is almost universally given in LRD
    if (paymentMethod === 'CASH_USD') {
      paidUSD = parsedTenderedUSD > 0 ? parsedTenderedUSD : grandTotalUSD;
      const overpaymentUSD = Math.max(0, paidUSD - grandTotalUSD);
      // Dual currency change capability: customer pays USD, cashier can return change in LRD (Liberian standard)
      if (changeInLRDOnly) {
        changeLRD = Math.round(overpaymentUSD * settings.exchangeRate);
        changeUSD = 0;
      } else {
        changeUSD = overpaymentUSD;
        changeLRD = Math.round(overpaymentUSD * settings.exchangeRate);
      }
    } else if (paymentMethod === 'CASH_LRD') {
      paidLRD = parsedTenderedLRD > 0 ? parsedTenderedLRD : grandTotalLRD;
      changeLRD = Math.max(0, paidLRD - grandTotalLRD);
      changeUSD = 0;
    } else if (paymentMethod === 'SPLIT_CASH') {
      paidUSD = parsedTenderedUSD;
      paidLRD = parsedTenderedLRD;
      const combinedInUSD = paidUSD + paidLRD / settings.exchangeRate;
      const diffUSD = Math.max(0, combinedInUSD - grandTotalUSD);
      // Return change in LRD by default as requested for dual-currency transactions
      changeLRD = Math.round(diffUSD * settings.exchangeRate);
      changeUSD = 0;
    } else if (paymentMethod === 'MOBILE_MONEY') {
      paidUSD = grandTotalUSD;
      paidLRD = grandTotalLRD;
    } else if (paymentMethod === 'CREDIT') {
      paidUSD = 0;
      paidLRD = 0;
    }

    const salePayment: SalePayment = {
      method: paymentMethod,
      amountUSD: grandTotalUSD,
      amountLRD: grandTotalLRD,
      tenderedUSD: paidUSD,
      tenderedLRD: paidLRD,
      changeUSD,
      changeLRD,
    };

    const activeSession = OfflineStorageManager.getActiveCashSession();

    const saleRecord: Sale = {
      id: `sale-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      receiptNumber: receiptNum,
      cashierId: activeUser.id,
      cashierName: activeUser.name,
      customerId: selectedCustomer ? selectedCustomer.id : undefined,
      customerName: selectedCustomer ? selectedCustomer.name : 'Walk-in Customer',
      customerTIN: selectedCustomer?.tin,
      storeTIN: settings.storeTIN,
      items: cart.map((it) => {
        const u = units.find((unt) => unt.id === it.product.unitId);
        return {
          productId: it.product.id,
          productName: it.tierLabel
            ? `${it.product.name} [${it.tierLabel}]`
            : it.saleMode === 'WHOLESALE'
            ? `${it.product.name} (${it.unitLabel})`
            : it.product.name,
          barcode: it.product.barcode,
          quantity: it.quantity,
          unitSymbol: it.tierLabel || (it.saleMode === 'WHOLESALE' ? (it.unitLabel || 'pk') : (u?.symbol || 'pcs')),
          saleMode: it.saleMode,
          sellingTier: it.sellingTier,
          tierLabel: it.tierLabel,
          unitLabel: it.unitLabel,
          baseUnitQuantity: it.baseUnitQuantity,
          unitPriceUSD: it.unitPriceUSD,
          unitPriceLRD: it.unitPriceLRD,
          unitCostUSD: it.product.costPriceUSD || 0,
          totalUSD: it.totalUSD,
          totalLRD: it.totalLRD,
        };
      }),
      subtotalUSD,
      subtotalLRD,
      discountUSD,
      taxUSD,
      taxLRD,
      totalUSD: grandTotalUSD,
      totalLRD: grandTotalLRD,
      taxSnapshot: {
        taxEnabled: orderTax.taxEnabled,
        taxName: orderTax.taxName,
        taxRatePercent: orderTax.taxRatePercent,
        taxCalculationType: orderTax.taxCalculationType,
        storeTIN: settings.storeTIN,
        customerTIN: selectedCustomer?.tin,
        customerTaxExemptApplied: orderTax.customerTaxExemptApplied,
        taxableAmountUSD: orderTax.taxableAmountUSD,
        taxableAmountLRD: orderTax.taxableAmountLRD,
        exemptAmountUSD: orderTax.exemptAmountUSD,
        zeroRatedAmountUSD: orderTax.zeroRatedAmountUSD,
        taxUSD: orderTax.taxUSD,
        taxLRD: orderTax.taxLRD,
      },
      payment: salePayment,
      paymentStatus: paymentMethod === 'CREDIT' ? 'CREDIT' : 'PAID',
      cashSessionId: activeSession?.id,
      createdAt: new Date().toISOString(),
      synced: false,
    };

    // Build immutable receipt snapshot with complete tax and tier context
    const receiptSnapshot: ReceiptSnapshot = {
      id: `rcpt-${Date.now()}`,
      saleId: saleRecord.id,
      receiptNumber: receiptNum,
      businessName: settings.name,
      businessPhone: settings.phone,
      businessAddress: settings.address,
      headerText: settings.receiptHeader,
      footerText: settings.receiptFooter,
      date: saleRecord.createdAt,
      cashierName: activeUser.name,
      customerName: selectedCustomer?.name,
      storeTIN: settings.storeTIN,
      customerTIN: selectedCustomer?.tin,
      taxName: orderTax.taxName,
      taxCalculationType: orderTax.taxCalculationType,
      taxRatePercent: orderTax.taxRatePercent,
      taxableAmountUSD: orderTax.taxableAmountUSD,
      taxableAmountLRD: orderTax.taxableAmountLRD,
      items: cart.map((it) => {
        const u = units.find((unt) => unt.id === it.product.unitId);
        return {
          name: it.tierLabel ? `${it.product.name} [${it.tierLabel}]` : it.product.name,
          quantity: it.quantity,
          unitSymbol: it.tierLabel || (it.saleMode === 'WHOLESALE' ? (it.unitLabel || 'pk') : (u?.symbol || 'pcs')),
          unitPriceUSD: it.unitPriceUSD,
          totalUSD: it.totalUSD,
          totalLRD: it.totalLRD,
        };
      }),
      subtotalUSD,
      taxUSD,
      taxLRD,
      discountUSD,
      totalUSD: grandTotalUSD,
      totalLRD: grandTotalLRD,
      taxSnapshot: saleRecord.taxSnapshot,
      paymentMethod,
      amountPaidUSD: paidUSD,
      amountPaidLRD: paidLRD,
      changeUSD,
      changeLRD,
      exchangeRateUsed: settings.exchangeRate,
      reprintCount: 0,
    };

    // Save sale record with snapshot
    OfflineStorageManager.recordSale(saleRecord, receiptSnapshot);

    // Show printed receipt
    setActiveReceipt(receiptSnapshot);
    setReceiptModalOpen(true);

    // Reset Checkout Form & Cart
    clearCart();
    setCheckoutOpen(false);
    setTenderedUSD('');
    setTenderedLRD('');

    if (onRefreshData) onRefreshData();
  };

  const handleBackToOrder = () => {
    // If active user is owner, manager, or superadmin, allow direct return without PIN
    if (activeUser.role === 'owner' || activeUser.role === 'manager' || activeUser.role === 'superadmin') {
      setCheckoutOpen(false);
      setScannerFeedback('Returned to active order. Items are retained.');
      setTimeout(() => setScannerFeedback(null), 2500);
    } else {
      // Cashier requires Manager or Owner approval to modify the order
      setManagerPinInput('');
      setManagerAuthError(null);
      setManagerAuthModalOpen(true);
    }
  };

  const handleConfirmManagerUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = managerPinInput.trim();
    if (!cleanPin) {
      setManagerAuthError('Please enter a manager or owner PIN');
      return;
    }

    const allUsers = OfflineStorageManager.getUsers();
    const authorizedUser = allUsers.find(
      (u) =>
        (u.role === 'owner' || u.role === 'manager' || u.role === 'superadmin') &&
        u.pin === cleanPin &&
        u.isActive
    );

    if (authorizedUser) {
      OfflineStorageManager.logAudit(
        'pos_order_unlock',
        'ORDER',
        `order-modify-${Date.now()}`,
        `${authorizedUser.name} (${authorizedUser.role}) authorized cashier ${activeUser.name} to modify items in checkout`
      );
      setManagerAuthModalOpen(false);
      setCheckoutOpen(false);
      setScannerFeedback(`✅ Order unlocked by ${authorizedUser.name}! Items retained for editing.`);
      setTimeout(() => setScannerFeedback(null), 3500);
    } else {
      setManagerAuthError('Incorrect PIN. Authorization must be provided by a Store Manager or Shop Owner.');
    }
  };

  const filteredProducts = products.filter((p) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.barcode.toLowerCase().includes(q) ||
      (p.alternativeBarcodes && p.alternativeBarcodes.some((b) => b.toLowerCase().includes(q)));

    const matchesCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;

    const matchesSaleMode =
      saleModeCatalogFilter === 'ALL' ||
      (saleModeCatalogFilter === 'WHOLESALE_ONLY' && p.hasPackageUnit) ||
      (saleModeCatalogFilter === 'RETAIL_ONLY' && !p.hasPackageUnit);

    return matchesSearch && matchesCategory && matchesSaleMode;
  });

  // Handle Enter press in search input (autofill, add to order, and clear for next item)
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const clean = searchQuery.trim();
      if (!clean) return;

      // 1. Direct barcode / SKU match
      const exactMatch = products.find(
        (p) =>
          p.barcode === clean ||
          (p.alternativeBarcodes && p.alternativeBarcodes.includes(clean)) ||
          p.sku.toLowerCase() === clean.toLowerCase()
      );

      if (exactMatch) {
        addToCart(exactMatch, 1);
        playBeep('success');
        const priceLrd = exactMatch.sellingPriceLRD || Math.round(exactMatch.sellingPriceUSD * settings.exchangeRate);
        setScannerFeedback(`Added to Order: ${exactMatch.name} (L$ ${priceLrd.toLocaleString()})`);
        setTimeout(() => setScannerFeedback(null), 2500);
        setSearchQuery('');
        return;
      }

      // 2. If filtered list has matches, add the top match
      if (filteredProducts.length > 0) {
        const topItem = filteredProducts[0];
        addToCart(topItem, 1);
        playBeep('success');
        const priceLrd = topItem.sellingPriceLRD || Math.round(topItem.sellingPriceUSD * settings.exchangeRate);
        setScannerFeedback(`Added to Order: ${topItem.name} (L$ ${priceLrd.toLocaleString()})`);
        setTimeout(() => setScannerFeedback(null), 2500);
        setSearchQuery('');
      } else {
        playBeep('unknown');
        setScannerFeedback(`No product found matching "${clean}"`);
        setTimeout(() => setScannerFeedback(null), 2500);
      }
    }
  };

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'latest': {
        const timeA = new Date(a.createdAt || a.updatedAt || 0).getTime();
        const timeB = new Date(b.createdAt || b.updatedAt || 0).getTime();
        return timeB - timeA;
      }
      case 'name_asc':
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
      case 'name_desc':
        return b.name.localeCompare(a.name, undefined, { numeric: true, sensitivity: 'base' });
      case 'stock_low':
        return a.currentStock - b.currentStock;
      case 'stock_high':
        return b.currentStock - a.currentStock;
      case 'price_asc': {
        const priceA = a.sellingPriceLRD || a.sellingPriceUSD * settings.exchangeRate;
        const priceB = b.sellingPriceLRD || b.sellingPriceUSD * settings.exchangeRate;
        return priceA - priceB;
      }
      case 'price_desc': {
        const priceA = a.sellingPriceLRD || a.sellingPriceUSD * settings.exchangeRate;
        const priceB = b.sellingPriceLRD || b.sellingPriceUSD * settings.exchangeRate;
        return priceB - priceA;
      }
      default:
        return 0;
    }
  });

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden bg-stone-100 text-stone-900">
      {/* MOBILE VIEW SWITCHER (Visible on screens < lg) */}
      <div className="lg:hidden bg-stone-900 text-white p-2 flex items-center justify-between shrink-0 shadow-md">
        <div className="flex items-center bg-stone-800 p-1 rounded-xl border border-stone-700 w-full">
          <button
            onClick={() => setMobileTab('catalog')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition ${
              mobileTab === 'catalog' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-300 hover:text-white'
            }`}
          >
            <LayoutGrid className="w-4 h-4 shrink-0" />
            <span>Items & Keypad</span>
          </button>
          <button
            onClick={() => setMobileTab('cart')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition ${
              mobileTab === 'cart'
                ? 'bg-emerald-500 text-stone-950 font-black shadow-sm'
                : cart.length > 0
                ? 'text-emerald-400 font-bold hover:bg-stone-700/60'
                : 'text-stone-300 hover:text-white'
            }`}
          >
            <ShoppingCart className="w-4 h-4 shrink-0" />
            <span>Cart ({cart.reduce((sum, it) => sum + it.quantity, 0)})</span>
            {cart.length > 0 && (
              <span className="font-mono text-[10px] bg-emerald-400 text-stone-950 px-1.5 py-0.5 rounded font-black shrink-0">
                L$ {grandTotalLRD.toLocaleString()}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* LEFT PANE: Square Catalog & Keypad */}
      <div className={`flex-1 flex-col h-full border-r border-stone-200 overflow-hidden bg-stone-50 ${
        mobileTab === 'catalog' ? 'flex' : 'hidden lg:flex'
      }`}>
        {/* PROMINENT TOP SEARCH & SCAN BAR (Positioned at the very top as requested) */}
        <div className="p-3 sm:p-3.5 bg-white border-b border-stone-200 flex flex-col gap-2.5 shadow-2xs">
          {/* Prominent Search Bar (Top & First) */}
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search product by name, SKU, or barcode (Press Enter to add)..."
              className="w-full pl-11 pr-24 py-3 bg-stone-50 hover:bg-white focus:bg-white border-2 border-stone-300 focus:border-stone-900 rounded-2xl text-xs sm:text-sm font-semibold text-stone-900 placeholder-stone-400 focus:outline-none transition shadow-inner"
              autoComplete="off"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  if (searchInputRef.current) searchInputRef.current.focus();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <span className="hidden sm:inline-flex items-center gap-1 absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-stone-200/80 text-stone-600 text-[10px] font-mono font-bold rounded-md">
                ↵ Enter to Add
              </span>
            )}
          </div>

          {/* Single Scan Button Placed Right Below Search Bar */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setScannerOpen(true)}
              className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-xl font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition"
              title="Open Barcode Scanner (Autofills code & retrieves item)"
            >
              <Camera className="w-4 h-4 text-emerald-200 shrink-0" />
              <span>Scan Barcode</span>
              <span className="text-[11px] font-normal text-emerald-100 opacity-90 hidden xs:inline">
                (Autofills number to add item)
              </span>
            </button>

            {onNavigateToStockIntake && (
              <button
                onClick={onNavigateToStockIntake}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold text-stone-700 hover:text-stone-900 hover:bg-stone-100 border border-stone-200 transition shrink-0"
                title="Add new item or stock intake"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Item</span>
              </button>
            )}
          </div>

          {/* Scanner Feedback Notification */}
          {scannerFeedback && (
            <div className="px-3.5 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center justify-between animate-fade-in shadow-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{scannerFeedback}</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-600 uppercase tracking-wider">Order Updated</span>
            </div>
          )}

          {/* Library vs Keypad Tabs & Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-stone-100">
            {/* Library vs Keypad Segmented Control */}
            <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200 shrink-0">
              <button
                onClick={() => setCatalogMode('library')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  catalogMode === 'library'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Item Library</span>
              </button>
              <button
                onClick={() => setCatalogMode('keypad')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  catalogMode === 'keypad'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>Custom Keypad</span>
              </button>
            </div>

            {/* Arrange / Sort By Dropdown (when in Library mode) */}
            {catalogMode === 'library' && (
              <div className="flex items-center gap-1.5 shrink-0 bg-stone-100 hover:bg-stone-200/70 px-2.5 py-1.5 rounded-xl border border-stone-200 transition">
                <ArrowUpDown className="w-3.5 h-3.5 text-stone-600 shrink-0" />
                <span className="text-[11px] font-bold text-stone-600 whitespace-nowrap">Arrange:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent text-[11px] font-black text-stone-900 focus:outline-none cursor-pointer pr-1"
                  title="Arrange stock items"
                >
                  <option value="latest">Latest Added (Newest)</option>
                  <option value="name_asc">Alphabetical (A → Z)</option>
                  <option value="name_desc">Alphabetical (Z → A)</option>
                  <option value="stock_low">Stock: Low to High</option>
                  <option value="stock_high">Stock: High to Low</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                </select>
              </div>
            )}
          </div>

          {/* Categories and Sale Mode Scrollable Filter Bar */}
          {catalogMode === 'library' && (
            <div className="flex flex-col gap-1.5 pb-1">
              {/* Sale Mode Selector Bar (All Goods vs Wholesale Packs vs Retail Singles) */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider shrink-0 mr-0.5">
                  Sale Mode:
                </span>
                <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-xl border border-stone-200 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSaleModeCatalogFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      saleModeCatalogFilter === 'ALL'
                        ? 'bg-stone-900 text-white shadow-2xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    All Goods ({products.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSaleModeCatalogFilter('WHOLESALE_ONLY')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                      saleModeCatalogFilter === 'WHOLESALE_ONLY'
                        ? 'bg-amber-600 text-white shadow-2xs font-extrabold'
                        : 'text-amber-900 hover:bg-amber-100'
                    }`}
                  >
                    <Boxes className="w-3.5 h-3.5" />
                    <span>Wholesale Bulk Packs ({products.filter((p) => p.hasPackageUnit).length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSaleModeCatalogFilter('RETAIL_ONLY')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      saleModeCatalogFilter === 'RETAIL_ONLY'
                        ? 'bg-emerald-600 text-white shadow-2xs font-extrabold'
                        : 'text-emerald-900 hover:bg-emerald-100'
                    }`}
                  >
                    Retail Only
                  </button>
                </div>
              </div>

              {/* Categories Scrollable Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 py-1 rounded-full font-semibold whitespace-nowrap text-xs transition ${
                    selectedCategory === 'all'
                      ? 'bg-stone-900 text-white shadow-2xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  All Categories ({products.length})
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCategory(c.id)}
                    className={`px-3 py-1 rounded-full font-semibold whitespace-nowrap text-xs transition ${
                      selectedCategory === c.id
                        ? 'bg-stone-900 text-white shadow-2xs'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Content Area: Grid of Square Tiles OR Numpad */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 relative">
          {catalogMode === 'keypad' ? (
            <SquareKeypad
              settings={settings}
              onAddCustomItem={handleAddCustomItem}
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3">
              {sortedProducts.map((product) => {
                const u = units.find((unt) => unt.id === product.unitId);
                const isLowStock = product.currentStock <= product.minStockLevel && product.currentStock > 0;
                const isOutOfStock = product.currentStock <= 0;

                const tiers = getSellingTiers(product, settings.exchangeRate);
                const hasTiers = tiers.length > 1;

                // Current selected tier on this card (defaults to FULL or PIECE)
                const activeTier: SellingTier = cardSelectedTier[product.id] || (hasTiers ? 'FULL' : 'PIECE');
                const activeTierOption = tiers.find((t) => t.tier === activeTier) || tiers[0];

                // Check how many of the active tier are in the cart
                const tierInCart = cart.find(
                  (it) => it.product.id === product.id && (it.sellingTier ? it.sellingTier === activeTier : (activeTier === 'PIECE' ? it.saleMode === 'RETAIL' : it.saleMode === 'WHOLESALE'))
                );
                const totalItemCartQty = cart
                  .filter((it) => it.product.id === product.id)
                  .reduce((sum, it) => sum + it.quantity, 0);

                // Human-friendly dual stock breakdown
                const stockBreakdown = formatStockWithCartons(
                  product.currentStock,
                  product.packageMultiplier,
                  product.packageUnitName,
                  u?.symbol || 'pcs'
                );

                // Color accent badge based on category
                const categoryColors: Record<string, string> = {
                  'cat-1': 'border-t-emerald-500',
                  'cat-2': 'border-t-blue-500',
                  'cat-3': 'border-t-purple-500',
                  'cat-4': 'border-t-rose-500',
                  'cat-5': 'border-t-amber-500',
                };
                const topBorder = categoryColors[product.categoryId] || 'border-t-stone-300';

                return (
                  <div
                    key={product.id}
                    onClick={() => handleItemClick(product)}
                    className={`group relative p-3 rounded-xl bg-white border border-stone-200 ${topBorder} border-t-4 transition-all cursor-pointer flex flex-col justify-between hover:shadow-md hover:border-stone-400 active:scale-[0.99] select-none ${
                      isOutOfStock ? 'opacity-70 bg-stone-50' : ''
                    }`}
                  >
                    <div>
                      {/* Product Image Thumbnail */}
                      {product.imageUrl && (
                        <div className="mb-2 w-full h-24 rounded-lg overflow-hidden border border-stone-100 bg-stone-50">
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                        </div>
                      )}

                      {/* Top Row: Stock breakdown & Admin Quick Edit */}
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-mono text-stone-400 text-[10px] truncate max-w-[70px]">
                          {product.sku}
                        </span>
                        <div className="flex items-center gap-1">
                          {isOutOfStock ? (
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded">
                              0 Left
                            </span>
                          ) : isLowStock ? (
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded">
                              {product.currentStock} {u?.symbol || 'pcs'} left
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-stone-500 font-mono" title={stockBreakdown.fullDisplay}>
                              {stockBreakdown.breakdownFormatted ? (
                                <span className="text-stone-700 font-bold">
                                  {product.currentStock} {u?.symbol || 'pcs'} <span className="text-stone-400 text-[9px] font-normal">({stockBreakdown.breakdownFormatted})</span>
                                </span>
                              ) : (
                                <span>{stockBreakdown.fullDisplay}</span>
                              )}
                            </span>
                          )}

                          {isAdmin && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenQuickEdit(product);
                              }}
                              className="p-1 rounded bg-stone-100 hover:bg-stone-900 hover:text-white text-stone-600 transition shadow-2xs"
                              title="Edit item details & quantity"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Product Name */}
                      <h4 className="font-bold text-stone-900 text-xs sm:text-sm line-clamp-2 leading-snug group-hover:text-blue-600 transition">
                        {product.name}
                      </h4>

                      {/* Out of stock correction banner for Admin */}
                      {isOutOfStock && isAdmin && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenQuickEdit(product);
                          }}
                          className="mt-1.5 w-full py-1 bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Stock / Correct Quantity</span>
                        </button>
                      )}
                    </div>

                    {/* Clean Pricing & Selling Tier Section (No cramped stacked boxes!) */}
                    <div className="pt-2 mt-2 border-t border-stone-100 space-y-2">
                      {hasTiers ? (
                        <>
                          {/* Sleek Horizontal Segmented Tier Switcher: Full, Half, Quarter, Piece */}
                          <div
                            className="flex items-center gap-1 p-0.5 bg-stone-100 rounded-lg border border-stone-200"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {tiers.map((t) => {
                              const isSelected = t.tier === activeTier;
                              const shortTitle =
                                t.tier === 'FULL'
                                  ? 'Full'
                                  : t.tier === 'THREE_QUARTERS'
                                  ? '¾'
                                  : t.tier === 'HALF'
                                  ? '½'
                                  : t.tier === 'QUARTER'
                                  ? '¼'
                                  : '1 Pc';
                              return (
                                <button
                                  key={t.tier}
                                  type="button"
                                  onClick={() =>
                                    setCardSelectedTier((prev) => ({ ...prev, [product.id]: t.tier }))
                                  }
                                  className={`flex-1 py-1 px-1 rounded-md text-[10px] font-black transition text-center whitespace-nowrap ${
                                    isSelected
                                      ? 'bg-stone-900 text-white shadow-2xs'
                                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
                                  }`}
                                  title={`${t.label} (Click card for full details)`}
                                >
                                  {shortTitle}
                                </button>
                              );
                            })}
                          </div>

                          {/* Active Tier Price and Prominent Add Button */}
                          <div className="flex items-center justify-between pt-0.5">
                            <div className="min-w-0 pr-1">
                              <div className="font-black text-stone-900 font-mono text-xs sm:text-sm leading-tight truncate">
                                L$ {activeTierOption.priceLRD.toLocaleString()}
                              </div>
                              <div className="text-[10px] font-bold text-stone-500 font-mono truncate">
                                ${activeTierOption.priceUSD.toFixed(2)} USD • <span className="text-stone-700">{activeTierOption.pieceCountLabel}</span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                addToCart(product, 1, activeTier);
                                playBeep('success');
                              }}
                              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black transition flex items-center gap-1 shrink-0 ${
                                tierInCart
                                  ? 'bg-emerald-600 text-white shadow-2xs hover:bg-emerald-700'
                                  : 'bg-stone-900 hover:bg-stone-800 text-white shadow-2xs active:scale-95'
                              }`}
                              title={`Add 1 × ${activeTierOption.name} to order`}
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>{tierInCart ? `${tierInCart.quantity} in cart` : '+ Add'}</span>
                            </button>
                          </div>
                        </>
                      ) : (
                        /* Standard Single Piece Item */
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-black text-stone-900 font-mono text-sm leading-tight">
                              L$ {activeTierOption.priceLRD.toLocaleString()}
                            </div>
                            <div className="text-[10px] font-bold font-mono text-stone-500">
                              ${activeTierOption.priceUSD.toFixed(2)} USD
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart(product, 1, 'PIECE');
                              playBeep('success');
                            }}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black transition flex items-center gap-1 ${
                              totalItemCartQty > 0
                                ? 'bg-emerald-600 text-white shadow-2xs hover:bg-emerald-700'
                                : 'bg-stone-900 hover:bg-stone-800 text-white shadow-2xs active:scale-95'
                            }`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>{totalItemCartQty > 0 ? `${totalItemCartQty} in order` : '+ Add'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sticky Mobile Bottom Checkout Bar when in Catalog Mode */}
        {cart.length > 0 && mobileTab === 'catalog' && (
          <div className="lg:hidden p-3 bg-white border-t border-stone-200 shadow-2xl shrink-0 z-20">
            <button
              onClick={() => setMobileTab('cart')}
              className="w-full py-3 px-4 bg-stone-900 hover:bg-stone-800 active:scale-[0.98] text-white rounded-2xl flex items-center justify-between font-bold shadow-lg transition"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500 text-stone-950 flex items-center justify-center font-black text-sm shadow-xs">
                  {cart.reduce((sum, it) => sum + it.quantity, 0)}
                </div>
                <div className="text-left">
                  <div className="text-xs font-black">View Current Order</div>
                  <div className="text-[11px] text-stone-300 font-mono">
                    ${grandTotalUSD.toFixed(2)} USD • L$ {grandTotalLRD.toLocaleString()} LRD
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-stone-950 rounded-xl text-xs font-black shadow-xs">
                <span>Add Order</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </button>
          </div>
        )}
      </div>

      {/* RIGHT PANE: Square Active Order & Checkout */}
      <div className={`w-full lg:w-[380px] xl:w-[420px] flex-col h-full bg-white border-l border-stone-200 shrink-0 ${
        mobileTab === 'cart' ? 'flex' : 'hidden lg:flex'
      }`}>
        {/* Mobile-Only Return to Items Header */}
        {mobileTab === 'cart' && (
          <div className="lg:hidden p-2.5 bg-stone-100 border-b border-stone-200 flex items-center justify-between">
            <button
              onClick={() => setMobileTab('catalog')}
              className="flex items-center gap-1.5 text-xs font-black text-stone-800 hover:text-stone-950 bg-white px-3 py-1.5 rounded-xl border border-stone-300 shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>← Add More Items</span>
            </button>
            <button
              onClick={() => setScannerOpen(true)}
              className="flex items-center gap-1 text-xs font-black text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Scan Item</span>
            </button>
          </div>
        )}
        {/* Order Header */}
        <div className="p-3.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-stone-900 text-white flex items-center justify-center font-bold text-xs">
              <ShoppingCart className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                Current Order
              </h3>
              <div className="text-[11px] text-stone-500 font-mono">
                {cart.reduce((sum, it) => sum + it.quantity, 0)} items in order
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {cart.length > 0 && (
              <>
                <button
                  onClick={handleHoldCart}
                  className="px-2.5 py-1 text-xs font-bold text-stone-700 bg-white border border-stone-200 rounded-lg hover:bg-stone-100 transition shadow-xs"
                  title="Suspend / Hold Order"
                >
                  Hold Order
                </button>
                <button
                  onClick={clearCart}
                  className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-stone-100 rounded-lg transition"
                  title="Clear Order"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Customer Select Row */}
        <div className="px-3.5 py-2 bg-stone-50/50 border-b border-stone-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-stone-500 font-medium">
            <User className="w-3.5 h-3.5" />
            <span>Customer:</span>
          </div>
          <select
            value={selectedCustomer ? selectedCustomer.id : 'walk-in'}
            onChange={(e) => {
              if (e.target.value === 'walk-in') {
                setSelectedCustomer(null);
              } else {
                const found = customers.find((c) => c.id === e.target.value);
                setSelectedCustomer(found || null);
              }
            }}
            className="bg-white border border-stone-200 rounded-lg px-2.5 py-1 text-xs font-medium text-stone-800 max-w-[210px] truncate focus:outline-none focus:border-stone-900 shadow-xs"
          >
            <option value="walk-in">Walk-in Customer</option>
            {customers.map((cust) => (
              <option key={cust.id} value={cust.id}>
                {cust.name} {cust.currentDebtUSD > 0 ? `(Owes $${cust.currentDebtUSD.toFixed(1)})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Held Orders Banner */}
        {heldCarts.length > 0 && (
          <div className="px-3.5 py-2 bg-amber-50 border-b border-amber-200 flex items-center justify-between text-xs">
            <span className="text-amber-900 font-bold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-700" /> {heldCarts.length} Held Order{heldCarts.length === 1 ? '' : 's'}
            </span>
            <div className="flex gap-1">
              {heldCarts.map((h, i) => (
                <button
                  key={h.id}
                  onClick={() => handleResumeCart(h.id)}
                  className="px-2 py-0.5 text-[11px] bg-amber-200 hover:bg-amber-300 text-amber-900 rounded font-bold transition shadow-2xs"
                >
                  Resume #{i + 1}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Active Order Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-stone-400 py-12">
              <ShoppingCart className="w-10 h-10 text-stone-300 mb-2 stroke-[1.5]" />
              <p className="text-xs font-semibold text-stone-500">Order is empty</p>
              <p className="text-[11px] text-stone-400 max-w-[200px] mt-0.5">
                Search, scan barcode, or tap items to build an order.
              </p>
            </div>
          ) : (
            cart.map((item) => {
              const u = units.find((unt) => unt.id === item.product.unitId);
              const isWholesale = item.saleMode === 'WHOLESALE';
              const hasMultiUnit = Boolean(item.product.hasPackageUnit);
              const tierBadge = item.tierLabel || item.unitLabel || (isWholesale ? 'Pack' : 'Single');

              return (
                <div
                  key={`${item.product.id}-${item.sellingTier || item.saleMode}`}
                  className={`p-2.5 rounded-xl border transition flex flex-col gap-1.5 ${
                    isWholesale
                      ? 'bg-amber-50/70 border-amber-300/80 shadow-2xs'
                      : 'bg-stone-50/70 border-stone-200/80 hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {item.product.imageUrl && (
                        <img
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          className="w-9 h-9 rounded-lg object-cover border border-stone-200 shrink-0 bg-white"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-stone-900 truncate flex items-center gap-1.5">
                          <span>{item.product.name}</span>
                        </div>

                        {/* Price breakdown */}
                        <div className="text-[11px] text-stone-600 font-mono font-bold flex items-center gap-1.5">
                          {item.product.pricingCurrency === 'USD' ? (
                            <>
                              <span className="text-blue-900 font-black">${item.unitPriceUSD.toFixed(2)} USD</span>
                              <span className="text-[9px] font-extrabold px-1 py-0.2 rounded bg-blue-100 text-blue-800 border border-blue-200">USD</span>
                              <span className="text-[10px] text-stone-400 font-normal">
                                (≈ L$ {Math.round(item.unitPriceUSD * settings.exchangeRate).toLocaleString()})
                              </span>
                            </>
                          ) : item.product.pricingCurrency === 'LRD' ? (
                            <>
                              <span className="text-emerald-900 font-black">L$ {item.unitPriceLRD.toLocaleString()} LRD</span>
                              <span className="text-[9px] font-extrabold px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">LRD</span>
                              <span className="text-[10px] text-stone-400 font-normal">
                                (≈ ${(item.unitPriceLRD / settings.exchangeRate).toFixed(2)})
                              </span>
                            </>
                          ) : (
                            <>
                              <span>L$ {(item.unitPriceLRD || Math.round(item.unitPriceUSD * settings.exchangeRate)).toLocaleString()}</span>
                              <span className="text-[10px] text-stone-400 font-normal">(${item.unitPriceUSD.toFixed(2)})</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quantity Stepper */}
                    <div className="flex items-center bg-white border border-stone-200 rounded-lg p-0.5 shadow-2xs shrink-0">
                      <button
                        onClick={() =>
                          updateQuantity(
                            item.product.id,
                            item.quantity - (item.product.allowFractions ? 0.5 : 1),
                            item.sellingTier,
                            item.saleMode
                          )
                        }
                        className="w-7 h-7 sm:w-6 sm:h-6 rounded flex items-center justify-center text-stone-700 hover:bg-stone-100 active:scale-95 transition"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      <span className="w-8 text-center text-xs font-mono font-bold text-stone-900">
                        {item.quantity}
                      </span>

                      <button
                        onClick={() =>
                          updateQuantity(
                            item.product.id,
                            item.quantity + (item.product.allowFractions ? 0.5 : 1),
                            item.sellingTier,
                            item.saleMode
                          )
                        }
                        className="w-7 h-7 sm:w-6 sm:h-6 rounded flex items-center justify-center text-stone-700 hover:bg-stone-100 active:scale-95 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Line Total */}
                    <div className="text-right min-w-[70px] shrink-0">
                      <div className="text-xs font-black text-stone-900 font-mono">
                        L$ {item.totalLRD.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-stone-500 font-mono">
                        ${item.totalUSD.toFixed(2)} USD
                      </div>
                    </div>

                    {/* Delete Item */}
                    <button
                      onClick={() => removeFromCart(item.product.id, item.sellingTier, item.saleMode)}
                      className="p-1.5 text-stone-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition shrink-0"
                      title="Remove from order"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Mode Badges & Stock Deduction Note */}
                  <div className="flex items-center justify-between pt-1 border-t border-stone-200/60 text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-full font-extrabold flex items-center gap-1 ${
                          item.sellingTier === 'FULL'
                            ? 'bg-amber-600 text-white shadow-2xs'
                            : item.sellingTier === 'THREE_QUARTERS'
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : item.sellingTier === 'HALF'
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : item.sellingTier === 'QUARTER'
                            ? 'bg-purple-600 text-white shadow-2xs'
                            : isWholesale
                            ? 'bg-amber-600 text-white shadow-2xs'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}
                      >
                        {isWholesale && <Boxes className="w-3 h-3" />}
                        <span>{tierBadge.toUpperCase()}</span>
                      </span>

                      <span className="text-stone-500 font-mono">
                        Deducts: <strong>{Math.round(item.quantity * item.baseUnitQuantity * 100) / 100}</strong> {u?.symbol || 'base units'}
                      </span>
                    </div>

                    {hasMultiUnit && (
                      <button
                        type="button"
                        onClick={() => toggleCartItemSaleMode(item.product.id, item.saleMode)}
                        className="px-2 py-0.5 rounded font-bold transition text-[10px] bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300"
                        title="Toggle single / pack"
                      >
                        <span>Switch Mode</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Square Order Calculation Box */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 space-y-2.5 pb-24 lg:pb-4">
          {/* Subtotal & Discount rows */}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-stone-500">
              <span>Subtotal:</span>
              <span className="font-mono font-medium text-stone-800">
                L$ {subtotalLRD.toLocaleString()} (${subtotalUSD.toFixed(2)})
              </span>
            </div>

            {settings.taxEnabled && (
              selectedCustomer?.taxExempt ? (
                <div className="flex justify-between items-center text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
                  <span className="font-bold flex items-center gap-1">
                    <span>🛡️ {settings.taxName || 'GST'} Exempt:</span>
                  </span>
                  <span className="font-mono font-bold text-emerald-900">
                    0% Applied (Exempt NGO)
                  </span>
                </div>
              ) : (
                <div className="flex justify-between text-stone-600">
                  <span>
                    {settings.taxName || 'GST'} ({settings.taxRatePercent}% {settings.taxCalculationType === 'INCLUSIVE' ? 'Inclusive' : 'Exclusive'}):
                  </span>
                  <span className="font-mono font-medium text-stone-900">
                    L$ {taxLRD.toLocaleString()} (${taxUSD.toFixed(2)})
                  </span>
                </div>
              )
            )}

            {/* Quick Discount Trigger */}
            <div className="flex items-center justify-between text-stone-600 pt-1">
              <span className="flex items-center gap-1">
                <Percent className="w-3 h-3 text-stone-400" /> Discount:
              </span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={overallDiscountUSD || ''}
                  onChange={(e) => setOverallDiscountUSD(parseFloat(e.target.value) || 0)}
                  placeholder="$0.00"
                  className="w-16 bg-white border border-stone-200 rounded px-1.5 py-0.5 text-right font-mono text-xs focus:outline-none focus:border-stone-900"
                />
              </div>
            </div>

            {/* Grand Total Bar */}
            <div className="pt-2 border-t border-stone-200 flex items-baseline justify-between">
              <span className="text-sm font-black text-stone-900 uppercase tracking-tight">
                Grand Total:
              </span>
              <div className="text-right">
                <div className="text-xl font-black text-stone-900 font-mono leading-tight">
                  L$ {grandTotalLRD.toLocaleString()}{' '}
                  <span className="text-xs font-bold text-stone-600">LRD</span>
                </div>
                <div className="text-xs font-bold text-stone-500 font-mono">
                  ≈ ${grandTotalUSD.toFixed(2)} USD
                </div>
              </div>
            </div>

            <div className="text-[10px] text-stone-400 text-right font-mono">
              Rate: 1 USD = {settings.exchangeRate} LRD
            </div>
          </div>

          {/* Square Big Charge Button: "Add Order" */}
          <button
            onClick={() => setCheckoutOpen(true)}
            disabled={cart.length === 0}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed text-white font-black text-sm rounded-xl transition shadow-sm flex items-center justify-center gap-2"
          >
            <span>Add Order</span>
            <span>•</span>
            <span className="font-mono">L$ {grandTotalLRD.toLocaleString()} LRD</span>
            <span className="text-xs font-normal opacity-85">(${grandTotalUSD.toFixed(2)} USD)</span>
            <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      </div>

      {/* Barcode Scanner Modal: Strictly scan-only (no photo upload) */}
      <BarcodeScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleBarcodeScan}
        title="POS Barcode Scanner"
        continuous={false}
        allowPhotoUpload={false}
      />

      {/* Square Checkout & Multi-Currency Tender Modal */}
      {checkoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white border border-stone-200 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-stone-900">Select Payment Method</h3>
                <p className="text-xs font-mono text-stone-500 mt-0.5">
                  Total Due: ${grandTotalUSD.toFixed(2)} USD / L$ {grandTotalLRD.toLocaleString()} LRD
                </p>
              </div>
              <button
                onClick={() => setCheckoutOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-900 rounded-lg hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Payment Method Selector Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH_USD')}
                className={`p-3 rounded-xl border text-left font-bold transition flex flex-col justify-between ${
                  paymentMethod === 'CASH_USD'
                    ? 'border-blue-600 bg-blue-50/50 text-blue-950 shadow-xs'
                    : 'border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-800'
                }`}
              >
                <span className="text-base mb-1">💵</span>
                <span>Cash in USD ($)</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('CASH_LRD')}
                className={`p-3 rounded-xl border text-left font-bold transition flex flex-col justify-between ${
                  paymentMethod === 'CASH_LRD'
                    ? 'border-blue-600 bg-blue-50/50 text-blue-950 shadow-xs'
                    : 'border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-800'
                }`}
              >
                <span className="text-base mb-1">💵</span>
                <span>Cash in LRD (L$)</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('SPLIT_CASH')}
                className={`p-3 rounded-xl border text-left font-bold transition flex flex-col justify-between ${
                  paymentMethod === 'SPLIT_CASH'
                    ? 'border-blue-600 bg-blue-50/50 text-blue-950 shadow-xs'
                    : 'border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-800'
                }`}
              >
                <span className="text-base mb-1">🔄</span>
                <span>Split Cash (USD + LRD)</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('MOBILE_MONEY')}
                className={`p-3 rounded-xl border text-left font-bold transition flex flex-col justify-between ${
                  paymentMethod === 'MOBILE_MONEY'
                    ? 'border-blue-600 bg-blue-50/50 text-blue-950 shadow-xs'
                    : 'border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-800'
                }`}
              >
                <span className="text-base mb-1">📱</span>
                <span>Mobile Money (Lonestar/Orange)</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('CREDIT')}
                className={`col-span-2 p-3 rounded-xl border text-left font-bold transition flex items-center justify-between ${
                  paymentMethod === 'CREDIT'
                    ? 'border-amber-500 bg-amber-50 text-amber-950 shadow-xs'
                    : 'border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-800'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>📝</span> Customer Credit Sale (Record Debt)
                </span>
                <span className="text-[11px] font-mono text-stone-500">Liberian Trust Ledger</span>
              </button>
            </div>

            {/* Tendered Cash Entry / Change Calculation */}
            {(paymentMethod === 'CASH_USD' || paymentMethod === 'SPLIT_CASH') && (
              <div className="space-y-1">
                <label className="text-xs text-stone-600 font-bold">Tendered Cash in USD ($)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder={`Amount tendered in USD (e.g. $${grandTotalUSD.toFixed(2)})`}
                  value={tenderedUSD}
                  onChange={(e) => setTenderedUSD(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-sm text-stone-900 font-mono focus:outline-none focus:bg-white focus:border-blue-600"
                />
              </div>
            )}

            {(paymentMethod === 'CASH_LRD' || paymentMethod === 'SPLIT_CASH') && (
              <div className="space-y-1">
                <label className="text-xs text-stone-600 font-bold">Tendered Cash in LRD (L$)</label>
                <input
                  type="number"
                  step="5"
                  placeholder={`Amount tendered in LRD (e.g. L$ ${grandTotalLRD.toLocaleString()})`}
                  value={tenderedLRD}
                  onChange={(e) => setTenderedLRD(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-sm text-stone-900 font-mono focus:outline-none focus:bg-white focus:border-blue-600"
                />
              </div>
            )}

            {/* Liberian Dual-Currency Change Calculator Display */}
            {(paymentMethod === 'CASH_USD' || paymentMethod === 'CASH_LRD' || paymentMethod === 'SPLIT_CASH') && (
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between text-stone-600">
                  <span className="font-bold">Dual-Currency Tender Total:</span>
                  <span className="font-mono font-bold text-stone-900">
                    {paymentMethod === 'CASH_USD' && `$${(parseFloat(tenderedUSD) || 0).toFixed(2)} USD`}
                    {paymentMethod === 'CASH_LRD' && `L$ ${(parseFloat(tenderedLRD) || 0).toLocaleString()} LRD`}
                    {paymentMethod === 'SPLIT_CASH' && (
                      <>
                        ${(parseFloat(tenderedUSD) || 0).toFixed(2)} + L${' '}
                        {(parseFloat(tenderedLRD) || 0).toLocaleString()}
                      </>
                    )}
                  </span>
                </div>

                {paymentMethod === 'CASH_USD' && (
                  <div className="flex items-center justify-between pt-1 border-t border-stone-200 text-[11px]">
                    <span className="text-stone-600">Return Change In:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setChangeInLRDOnly(true)}
                        className={`px-2 py-0.5 rounded font-bold transition ${
                          changeInLRDOnly
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'bg-stone-200 text-stone-700'
                        }`}
                      >
                        LRD (L$) Liberian standard
                      </button>
                      <button
                        type="button"
                        onClick={() => setChangeInLRDOnly(false)}
                        className={`px-2 py-0.5 rounded font-bold transition ${
                          !changeInLRDOnly
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'bg-stone-200 text-stone-700'
                        }`}
                      >
                        USD ($)
                      </button>
                    </div>
                  </div>
                )}

                {/* Change Due Display */}
                {(() => {
                  const pUSD = parseFloat(tenderedUSD) || 0;
                  const pLRD = parseFloat(tenderedLRD) || 0;
                  let diffInUSD = 0;

                  if (paymentMethod === 'CASH_USD') {
                    diffInUSD = pUSD - grandTotalUSD;
                  } else if (paymentMethod === 'CASH_LRD') {
                    diffInUSD = (pLRD - grandTotalLRD) / settings.exchangeRate;
                  } else if (paymentMethod === 'SPLIT_CASH') {
                    const totalTenderUSD = pUSD + pLRD / settings.exchangeRate;
                    diffInUSD = totalTenderUSD - grandTotalUSD;
                  }

                  if (diffInUSD > 0.001) {
                    const changeInLRDVal = Math.round(diffInUSD * settings.exchangeRate);
                    return (
                      <div className="pt-2 border-t border-stone-200 flex items-baseline justify-between text-emerald-800">
                        <span className="font-extrabold uppercase text-[11px]">Change Due to Customer:</span>
                        <div className="text-right">
                          <div className="font-mono text-base font-black">
                            L$ {changeInLRDVal.toLocaleString()}{' '}
                            <span className="text-xs font-semibold text-stone-500">LRD</span>
                          </div>
                          {!changeInLRDOnly && paymentMethod === 'CASH_USD' && (
                            <div className="text-[10px] text-stone-500 font-mono">
                              or ${diffInUSD.toFixed(2)} USD
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  } else if (diffInUSD < -0.01 && (pUSD > 0 || pLRD > 0)) {
                    const shortageUSD = Math.abs(diffInUSD);
                    return (
                      <div className="pt-1 border-t border-stone-200 flex items-baseline justify-between text-rose-600 font-bold">
                        <span>Shortage:</span>
                        <span className="font-mono">
                          -${shortageUSD.toFixed(2)} USD (L$ {Math.round(shortageUSD * settings.exchangeRate).toLocaleString()})
                        </span>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            )}

            {paymentMethod === 'CREDIT' && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                <p className="font-bold mb-1">Customer Credit Sale</p>
                {selectedCustomer ? (
                  <p>
                    Adding <strong>${grandTotalUSD.toFixed(2)} USD</strong> (L$ {grandTotalLRD.toLocaleString()}) debt to{' '}
                    <strong>{selectedCustomer.name}</strong>. Previous balance: ${selectedCustomer.currentDebtUSD.toFixed(2)}.
                  </p>
                ) : (
                  <p className="text-rose-700 font-medium">
                    Warning: Please select an existing customer from the ticket panel before completing a credit sale.
                  </p>
                )}
              </div>
            )}

            {/* Complete Transaction & Back to Order Buttons */}
            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={handleCompleteSale}
                disabled={paymentMethod === 'CREDIT' && !selectedCustomer}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-stone-200 disabled:text-stone-400 text-white font-extrabold text-sm rounded-xl transition shadow-xs flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Complete Sale & Issue Receipt</span>
              </button>

              <button
                type="button"
                onClick={handleBackToOrder}
                className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 border border-stone-200"
                title="Return to order to re-enter goods without deleting the order"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Modify Order (Items Retained)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manager Authorization PIN Modal (for modifying order from checkout) */}
      {managerAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-stone-200 w-full max-w-sm rounded-2xl p-5 space-y-4 text-xs shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 border border-amber-300 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-stone-900">Manager Authorization</h3>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Enter Manager or Shop Owner PIN to unlock and modify this order.
                </p>
              </div>
            </div>

            <form onSubmit={handleConfirmManagerUnlock} className="space-y-3 pt-1">
              <div>
                <label className="text-stone-700 font-bold block mb-1">
                  Manager / Owner PIN
                </label>
                <input
                  type="password"
                  autoFocus
                  maxLength={6}
                  value={managerPinInput}
                  onChange={(e) => {
                    setManagerPinInput(e.target.value);
                    setManagerAuthError(null);
                  }}
                  placeholder="Enter 4-digit PIN (default 1234)"
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 font-mono text-center text-lg tracking-widest font-black focus:outline-none focus:bg-white focus:border-stone-900"
                />
              </div>

              {managerAuthError && (
                <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold rounded-lg flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                  <span>{managerAuthError}</span>
                </div>
              )}

              <p className="text-[10px] text-stone-500">
                All existing goods in this order will remain intact so you can adjust quantities or fix mistakes without resetting.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setManagerAuthModalOpen(false)}
                  className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-bold transition shadow-xs flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Authorize & Modify</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Modal (Bluetooth Printing, Browser Print, and Social Sharing) */}
      <ReceiptModal
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        receipt={activeReceipt}
        settings={settings}
      />

      {/* Quick Edit & Stock Modal (for Owner & Admin) */}
      {quickEditProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white border border-stone-200 w-full max-w-md rounded-2xl p-5 space-y-4 text-xs shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-stone-900">
                    Edit Item & Quantity
                  </h3>
                  <p className="text-[10px] text-stone-500 font-mono">
                    SKU: {quickEditProduct.sku}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuickEditProduct(null)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickEdit} className="space-y-3.5">
              <div>
                <label className="text-stone-700 font-bold block mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  value={quickEditName}
                  onChange={(e) => setQuickEditName(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 font-bold text-xs focus:bg-white focus:outline-none focus:border-blue-600"
                />
              </div>

              {/* Stock Quantity on Hand */}
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-blue-950 font-bold text-xs flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-blue-600" />
                    <span>Quantity in Stock (Actual Count) *</span>
                  </label>
                  <span className="text-[10px] text-blue-700 font-bold">
                    Currently: {quickEditProduct.currentStock}
                  </span>
                </div>

                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={quickEditQty}
                  onChange={(e) => setQuickEditQty(e.target.value)}
                  className="w-full bg-white border border-blue-400 rounded-xl px-3 py-2 text-stone-950 font-mono text-lg font-black focus:outline-none focus:border-blue-600"
                  placeholder="Enter actual count"
                />

                <div className="flex items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] text-stone-500 font-medium">Quick Add:</span>
                  {[1, 5, 10, 20, 50].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() =>
                        setQuickEditQty((prev) =>
                          (Math.max(0, parseFloat(prev || '0')) + num).toString()
                        )
                      }
                      className="px-2 py-0.5 bg-white hover:bg-blue-100 text-blue-900 border border-blue-300 rounded-md text-[10px] font-bold transition shadow-2xs"
                    >
                      +{num}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-blue-800/80">
                  Left quantity blank when creating this item? Enter the actual count on your shelf to correct it now.
                </p>
              </div>

              {/* Barcode */}
              <div>
                <label className="text-stone-700 font-bold block mb-1">Barcode</label>
                <input
                  type="text"
                  value={quickEditBarcode}
                  onChange={(e) => setQuickEditBarcode(e.target.value)}
                  placeholder="e.g. 070001000123"
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-1.5 text-stone-900 font-mono text-xs focus:bg-white focus:outline-none focus:border-blue-600"
                />
              </div>

              {/* Selling Price in LRD and USD */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-stone-800">
                  <span>Selling Price</span>
                  <span className="text-[10px] text-stone-500 font-mono">1 USD = {settings.exchangeRate} LRD</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-stone-600 font-bold block mb-1">Price in L$ LRD</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-stone-400">L$</span>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={quickEditPriceLRD}
                        onChange={(e) => {
                          const lrd = parseFloat(e.target.value) || 0;
                          const usd = Math.round((lrd / settings.exchangeRate) * 100) / 100;
                          setQuickEditPriceLRD(lrd);
                          setQuickEditPriceUSD(usd);
                        }}
                        className="w-full bg-white border border-stone-300 rounded-lg pl-7 pr-2 py-1.5 text-stone-900 font-mono font-bold text-xs focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-stone-600 font-bold block mb-1">Price in $ USD</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-stone-400">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={quickEditPriceUSD}
                        onChange={(e) => {
                          const usd = parseFloat(e.target.value) || 0;
                          const lrd = Math.round(usd * settings.exchangeRate);
                          setQuickEditPriceUSD(usd);
                          setQuickEditPriceLRD(lrd);
                        }}
                        className="w-full bg-white border border-stone-300 rounded-lg pl-6 pr-2 py-1.5 text-stone-900 font-mono font-bold text-xs focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between gap-2 border-t border-stone-100">
                {isAdmin && quickEditProduct ? (
                  <button
                    type="button"
                    onClick={() => setDeleteCandidate(quickEditProduct)}
                    className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold transition flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Item</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuickEditProduct(null)}
                    className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition shadow flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white border border-stone-200 w-full max-w-sm rounded-2xl p-5 space-y-4 text-xs shadow-2xl animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-stone-900">Delete Product?</h3>
                <p className="text-[11px] text-stone-500 mt-0.5 font-mono">
                  SKU: {deleteCandidate.sku}
                </p>
              </div>
            </div>

            <p className="text-stone-700 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-stone-950 font-bold">{deleteCandidate.name}</strong> from stock? This action cannot be undone and will be logged in the audit ledger.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setDeleteCandidate(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition shadow-xs flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Permanently</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Option A: High-Contrast Retail vs Wholesale Unit Choice Modal */}
      {unitSelectProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-stone-200 w-full max-w-md rounded-2xl p-5 sm:p-6 space-y-4 text-xs shadow-2xl">
            <div className="flex items-start justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 flex items-center justify-center shrink-0">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-stone-900 leading-tight">
                    {unitSelectProduct.name}
                  </h3>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    How is this item being sold to the customer?
                  </p>
                </div>
              </div>
              <button
                onClick={() => setUnitSelectProduct(null)}
                className="p-1 text-stone-400 hover:text-stone-900 rounded-lg hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Stock Banner */}
            <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl flex items-center justify-between text-xs">
              <span className="text-stone-600 font-medium">Inventory Stock on Shelf:</span>
              <span className="font-bold text-stone-900 font-mono text-sm">
                {(() => {
                  const u = units.find((unt) => unt.id === unitSelectProduct.unitId);
                  return formatStockWithCartons(
                    unitSelectProduct.currentStock,
                    unitSelectProduct.packageMultiplier,
                    unitSelectProduct.packageUnitName,
                    u?.symbol || 'pcs'
                  ).fullDisplay;
                })()}
              </span>
            </div>

            {/* Selling Tier Options: Large, High-Contrast, Mistake-Proof */}
            <div className="space-y-2.5 max-h-[55vh] overflow-y-auto pr-1">
              {getSellingTiers(unitSelectProduct, settings.exchangeRate).map((t) => {
                const isFull = t.tier === 'FULL';
                const isThreeQuarter = t.tier === 'THREE_QUARTERS';
                const isHalf = t.tier === 'HALF';
                const isQuarter = t.tier === 'QUARTER';
                const isPiece = t.tier === 'PIECE';

                const badgeBg = isFull
                  ? 'bg-amber-600 text-white'
                  : isThreeQuarter
                  ? 'bg-indigo-600 text-white'
                  : isHalf
                  ? 'bg-blue-600 text-white'
                  : isQuarter
                  ? 'bg-purple-600 text-white'
                  : 'bg-emerald-600 text-white';

                const cardBorder = isFull
                  ? 'border-amber-300 hover:border-amber-500 bg-amber-50/70 hover:bg-amber-100/80'
                  : isThreeQuarter
                  ? 'border-indigo-300 hover:border-indigo-500 bg-indigo-50/70 hover:bg-indigo-100/80'
                  : isHalf
                  ? 'border-blue-300 hover:border-blue-500 bg-blue-50/70 hover:bg-blue-100/80'
                  : isQuarter
                  ? 'border-purple-300 hover:border-purple-500 bg-purple-50/70 hover:bg-purple-100/80'
                  : 'border-emerald-300 hover:border-emerald-500 bg-emerald-50/70 hover:bg-emerald-100/80';

                return (
                  <button
                    key={t.tier}
                    type="button"
                    onClick={() => {
                      addToCart(unitSelectProduct, 1, t.tier);
                      setUnitSelectProduct(null);
                      playBeep('success');
                    }}
                    className={`w-full p-3.5 border-2 rounded-2xl text-left transition shadow-xs flex items-center justify-between group active:scale-[0.98] ${cardBorder}`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${badgeBg}`}>
                          {t.tier === 'FULL' ? 'Full Pack' : t.tier === 'HALF' ? '1/2 Pack' : t.tier === 'QUARTER' ? '1/4 Pack' : 'Retail Single'}
                        </span>
                        <span className="font-extrabold text-stone-900 text-sm">
                          {t.name}
                        </span>
                        {t.isCustomPrice && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-white text-stone-700 border border-stone-300">
                            Custom Price
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-600 mt-1">
                        Deducts <strong>{t.multiplier} base unit{t.multiplier === 1 ? '' : 's'}</strong> from stock ({t.pieceCountLabel})
                      </p>
                    </div>

                    <div className="text-right shrink-0 pl-3">
                      <div className="font-black text-stone-950 text-base font-mono">
                        L$ {t.priceLRD.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-stone-600 font-mono font-bold">
                        ${t.priceUSD.toFixed(2)} USD
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setUnitSelectProduct(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
