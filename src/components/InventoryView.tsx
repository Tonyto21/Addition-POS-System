import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  History,
  Barcode,
  Layers,
  Edit2,
  DollarSign,
  TrendingDown,
  ArrowUpDown,
  Check,
  X,
  FileSpreadsheet,
  Trash2,
  Tag,
  Camera,
  Upload,
  Lock,
  ShieldCheck,
  LayoutGrid,
  Table as TableIcon,
  FolderPlus,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { BusinessSettings, Category, Product, StockBatch, StockMovement, Unit, User } from '../types';
import { OfflineStorageManager } from '../utils/storage';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { ProductPhotoCapture } from './ProductPhotoCapture';
import { CategoryManagerModal } from './CategoryManagerModal';

interface InventoryViewProps {
  settings: BusinessSettings;
  activeUser: User;
  onNavigateToIntake: () => void;
  onRefresh: () => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  settings,
  activeUser,
  onNavigateToIntake,
  onRefresh,
}) => {
  const [products, setProducts] = useState<Product[]>(() => OfflineStorageManager.getProducts());
  const [categories, setCategories] = useState<Category[]>(() => OfflineStorageManager.getCategories());
  const [units] = useState<Unit[]>(() => OfflineStorageManager.getUnits());
  const [movements, setMovements] = useState<StockMovement[]>(() => OfflineStorageManager.getMovements());
  const [batches, setBatches] = useState<StockBatch[]>(() => OfflineStorageManager.getBatches());

  // Listen to background updates across tabs or views
  useEffect(() => {
    const handleUpdate = () => {
      setProducts(OfflineStorageManager.getProducts());
      setCategories(OfflineStorageManager.getCategories());
      setMovements(OfflineStorageManager.getMovements());
      setBatches(OfflineStorageManager.getBatches());
    };
    window.addEventListener('app-storage-updated', handleUpdate);
    return () => window.removeEventListener('app-storage-updated', handleUpdate);
  }, []);

  const [activeTab, setActiveTab] = useState<'products' | 'movements'>('products');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid'); // Grid is default like POS library
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStock, setFilterStock] = useState<'ALL' | 'LOW' | 'OUT'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showKpis, setShowKpis] = useState(false);
  const [sortBy, setSortBy] = useState<
    'latest' | 'name_asc' | 'name_desc' | 'stock_low' | 'stock_high' | 'price_asc' | 'price_desc'
  >('latest');

  // Movement Ledger search, filter, and view mode
  const [movementSearch, setMovementSearch] = useState('');
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>('ALL');
  const [movementViewMode, setMovementViewMode] = useState<'grid' | 'table'>('grid');

  // Category Manager Modal
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);

  // New / Edit Product Modal
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<Product | null>(null);

  // Stock Adjustment Modal
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [adjustedQty, setAdjustedQty] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('Physical count reconciliation');

  // Scanner for lookup
  const [scannerOpen, setScannerOpen] = useState(false);

  // Form states for Product create/edit
  const [formData, setFormData] = useState<{
    name: string;
    sku: string;
    barcode: string;
    alternativeBarcodes: string;
    categoryId: string;
    unitId: string;
    currentStock: number;
    sellingPriceLRD: number;
    sellingPriceUSD: number;
    costPriceLRD: number;
    costPriceUSD: number;
    minStockLevel: number;
    targetStockLevel: number;
    allowFractions: boolean;
    trackBatches: boolean;
    imageUrl?: string;
    pricingCurrency: 'DUAL' | 'USD' | 'LRD';
  }>({
    name: '',
    sku: '',
    barcode: '',
    alternativeBarcodes: '',
    categoryId: categories[0]?.id || '',
    unitId: units[0]?.id || '',
    currentStock: 0,
    sellingPriceLRD: 200,
    sellingPriceUSD: 1.0,
    costPriceLRD: 150,
    costPriceUSD: 0.75,
    minStockLevel: 5,
    targetStockLevel: 20,
    allowFractions: false,
    trackBatches: true,
    imageUrl: undefined,
    pricingCurrency: 'DUAL',
  });

  const isAdmin = activeUser.role === 'owner' || activeUser.role === 'manager';
  const canViewCostAndProfit = isAdmin;

  const totalStockValueUSD = products.reduce((acc, p) => acc + p.currentStock * p.costPriceUSD, 0);
  const totalRetailValueUSD = products.reduce((acc, p) => acc + p.currentStock * p.sellingPriceUSD, 0);
  const lowStockCount = products.filter((p) => p.currentStock <= p.minStockLevel && p.currentStock > 0).length;
  const outOfStockCount = products.filter((p) => p.currentStock <= 0).length;

  const handleOpenNewProduct = (prefillBarcode?: string) => {
    if (!isAdmin) {
      alert('Permission Denied: Only the store Owner or Manager with Admin rights can create new inventory items.');
      return;
    }
    setEditingProduct(null);
    const defaultLRD = 200;
    const defaultUSD = Math.round((defaultLRD / settings.exchangeRate) * 100) / 100;
    const defaultCostLRD = 150;
    const defaultCostUSD = Math.round((defaultCostLRD / settings.exchangeRate) * 100) / 100;

    setFormData({
      name: '',
      sku: `SKU-${Date.now().toString().slice(-4)}`,
      barcode: prefillBarcode || '',
      alternativeBarcodes: '',
      categoryId: selectedCategory !== 'all' ? selectedCategory : categories[0]?.id || '',
      unitId: units[0]?.id || '',
      currentStock: 0,
      sellingPriceLRD: defaultLRD,
      sellingPriceUSD: defaultUSD,
      costPriceLRD: defaultCostLRD,
      costPriceUSD: defaultCostUSD,
      minStockLevel: 5,
      targetStockLevel: 20,
      allowFractions: false,
      trackBatches: false,
      imageUrl: undefined,
      pricingCurrency: 'DUAL',
    });
    setProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod: Product) => {
    if (!isAdmin) {
      alert('Permission Denied: Only the store Owner or Manager with Admin rights can edit product details or quantities.');
      return;
    }
    setEditingProduct(prod);
    const lrdPrice = prod.sellingPriceLRD || Math.round(prod.sellingPriceUSD * settings.exchangeRate);
    const costLRD = Math.round(prod.costPriceUSD * settings.exchangeRate);

    setFormData({
      name: prod.name,
      sku: prod.sku,
      barcode: prod.barcode,
      alternativeBarcodes: (prod.alternativeBarcodes || []).join(', '),
      categoryId: prod.categoryId,
      unitId: prod.unitId,
      currentStock: prod.currentStock,
      sellingPriceLRD: lrdPrice,
      sellingPriceUSD: prod.sellingPriceUSD,
      costPriceLRD: costLRD,
      costPriceUSD: prod.costPriceUSD,
      minStockLevel: prod.minStockLevel,
      targetStockLevel: prod.targetStockLevel,
      allowFractions: prod.allowFractions,
      trackBatches: prod.trackBatches,
      imageUrl: prod.imageUrl,
      pricingCurrency: prod.pricingCurrency || 'DUAL',
    });
    setProductModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('Permission Denied: Only the store Owner or Manager with Admin rights can save items.');
      return;
    }
    if (!formData.name.trim()) return;

    const altBarcodes = formData.alternativeBarcodes
      .split(',')
      .map((b) => b.trim())
      .filter(Boolean);

    const priceLRD = Math.round(formData.sellingPriceLRD);
    const priceUSD =
      formData.sellingPriceUSD > 0
        ? Number(formData.sellingPriceUSD)
        : Math.round((priceLRD / settings.exchangeRate) * 100) / 100;

    const costUSD =
      formData.costPriceUSD > 0
        ? Number(formData.costPriceUSD)
        : Math.round((formData.costPriceLRD / settings.exchangeRate) * 100) / 100;

    const targetStock = Number(formData.currentStock) || 0;

    if (editingProduct) {
      const prevStock = editingProduct.currentStock;
      const stockDiff = targetStock - prevStock;

      const updated: Product = {
        ...editingProduct,
        name: formData.name.trim(),
        sku: formData.sku.trim(),
        barcode: formData.barcode.trim(),
        alternativeBarcodes: altBarcodes,
        categoryId: formData.categoryId,
        unitId: formData.unitId,
        currentStock: targetStock,
        sellingPriceUSD: priceUSD,
        sellingPriceLRD: priceLRD,
        pricingCurrency: formData.pricingCurrency,
        costPriceUSD: costUSD,
        minStockLevel: Number(formData.minStockLevel),
        targetStockLevel: Number(formData.targetStockLevel),
        allowFractions: Boolean(formData.allowFractions),
        trackBatches: Boolean(formData.trackBatches),
        imageUrl: formData.imageUrl,
        updatedAt: new Date().toISOString(),
      };
      OfflineStorageManager.saveProduct(updated);

      // If quantity was corrected, record in double-entry movement ledger
      if (stockDiff !== 0) {
        OfflineStorageManager.adjustStockManual(
          updated.id,
          targetStock,
          `Stock count corrected by ${activeUser.name} (${activeUser.role}) from ${prevStock} to ${targetStock}`,
          activeUser.name
        );
      }
    } else {
      const newProd: Product = {
        id: `prod-${Date.now()}`,
        name: formData.name.trim(),
        sku: formData.sku.trim() || `SKU-${Date.now().toString().slice(-4)}`,
        barcode: formData.barcode.trim(),
        alternativeBarcodes: altBarcodes,
        categoryId: formData.categoryId,
        unitId: formData.unitId,
        sellingPriceUSD: priceUSD,
        sellingPriceLRD: priceLRD,
        pricingCurrency: formData.pricingCurrency,
        costPriceUSD: costUSD,
        minStockLevel: Number(formData.minStockLevel),
        targetStockLevel: Number(formData.targetStockLevel),
        currentStock: targetStock,
        allowFractions: Boolean(formData.allowFractions),
        trackBatches: Boolean(formData.trackBatches),
        imageUrl: formData.imageUrl,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      OfflineStorageManager.saveProduct(newProd);

      // If initial stock was entered on creation, log initial inventory intake
      if (targetStock > 0) {
        OfflineStorageManager.addMovement({
          id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          productId: newProd.id,
          productName: newProd.name,
          type: 'PURCHASE_INTAKE',
          quantity: targetStock,
          resultingStock: targetStock,
          unitCostUSD: costUSD,
          performedBy: activeUser.name,
          notes: `Initial opening inventory count entered by ${activeUser.name} (${activeUser.role})`,
          timestamp: new Date().toISOString(),
        });
      }
    }

    setProductModalOpen(false);
    setProducts(OfflineStorageManager.getProducts());
    setMovements(OfflineStorageManager.getMovements());
    onRefresh();
  };

  const handleOpenAdjust = (prod: Product) => {
    if (!isAdmin) {
      alert('Permission Denied: Only Owner or Manager with Admin rights can adjust inventory counts.');
      return;
    }
    setAdjustingProduct(prod);
    setAdjustedQty(prod.currentStock);
    setAdjustReason('Physical count reconciliation');
    setAdjustModalOpen(true);
  };

  const handleConfirmAdjust = () => {
    if (!adjustingProduct) return;
    OfflineStorageManager.adjustStockManual(
      adjustingProduct.id,
      adjustedQty,
      adjustReason,
      activeUser.name
    );
    setAdjustModalOpen(false);
    setProducts(OfflineStorageManager.getProducts());
    setMovements(OfflineStorageManager.getMovements());
    onRefresh();
  };

  const handleConfirmDelete = () => {
    if (!deleteCandidate) return;
    if (!isAdmin) {
      alert('Permission Denied: Only Store Owner or Manager can delete products.');
      return;
    }
    OfflineStorageManager.deleteProduct(deleteCandidate.id, activeUser.name);
    setDeleteCandidate(null);
    setProductModalOpen(false);
    setProducts(OfflineStorageManager.getProducts());
    onRefresh();
  };

  const handleCategoriesUpdated = () => {
    const updatedCats = OfflineStorageManager.getCategories();
    setCategories(updatedCats);
    setProducts(OfflineStorageManager.getProducts());
    onRefresh();
  };

  // Filter products by search, category, and stock
  const filteredProducts = products.filter((p) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.barcode.toLowerCase().includes(q) ||
      (p.alternativeBarcodes && p.alternativeBarcodes.some((b) => b.toLowerCase().includes(q)));

    const matchesCat = selectedCategory === 'all' || p.categoryId === selectedCategory;

    let matchesStock = true;
    if (filterStock === 'LOW') {
      matchesStock = p.currentStock <= p.minStockLevel && p.currentStock > 0;
    } else if (filterStock === 'OUT') {
      matchesStock = p.currentStock <= 0;
    }

    return matchesSearch && matchesCat && matchesStock;
  });

  // Arrange / Sort products
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

  // Filtered movements for the movement ledger
  const filteredMovements = movements.filter((m) => {
    const q = movementSearch.trim().toLowerCase();
    const matchesSearch =
      !q ||
      m.productName.toLowerCase().includes(q) ||
      m.performedBy.toLowerCase().includes(q) ||
      (m.notes && m.notes.toLowerCase().includes(q)) ||
      m.id.toLowerCase().includes(q);

    const matchesType =
      movementTypeFilter === 'ALL' || m.type === movementTypeFilter;

    return matchesSearch && matchesType;
  });

  // Color accent mapping based on category
  const categoryBorderColors: Record<string, string> = {
    'cat-1': 'border-t-emerald-500',
    'cat-2': 'border-t-blue-500',
    'cat-3': 'border-t-purple-500',
    'cat-4': 'border-t-rose-500',
    'cat-5': 'border-t-amber-500',
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-stone-100 text-stone-900">
      {/* Top Header */}
      <div className="p-3 sm:p-4 bg-white border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-stone-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            <span>Inventory</span>
          </h2>
          <p className="text-xs text-stone-500">
            Store goods catalog, live stock balance, and goods movement ledger
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onNavigateToIntake}
            className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-xl border border-stone-300 flex items-center gap-1.5 transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
            <span>Receive Stock</span>
          </button>

          {isAdmin ? (
            <button
              onClick={() => handleOpenNewProduct()}
              className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Create Item</span>
            </button>
          ) : (
            <div
              title="Admin access required: Only store Owner or Manager can add items"
              className="px-3 py-1.5 sm:px-3 sm:py-2 bg-stone-100 border border-stone-200 text-stone-400 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-not-allowed"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Create Item (Admin Only)</span>
            </div>
          )}
        </div>
      </div>

      {/* Slim "Shop Stock Summary" (Liberian SME relatable, compact to maximize scroll space) */}
      <div className="bg-stone-50 border-b border-stone-200 shrink-0 text-xs">
        <div className="px-3 py-1.5 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-3 sm:gap-5 text-[11px] shrink-0 font-medium">
            <div className="flex items-center gap-1.5">
              <span className="text-stone-500 font-semibold">Store Goods:</span>
              <strong className="font-bold text-stone-900 font-mono">{products.length}</strong>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-stone-500 font-semibold">Store Value:</span>
              <strong className="font-bold text-stone-900 font-mono">
                L$ {Math.round(totalRetailValueUSD * settings.exchangeRate).toLocaleString()}
              </strong>
              <span className="text-[10px] text-stone-400 font-mono hidden sm:inline">
                (${totalRetailValueUSD.toFixed(0)})
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-stone-500 font-semibold">Stock Status:</span>
              {lowStockCount > 0 || outOfStockCount > 0 ? (
                <span className="font-black text-amber-700 font-mono bg-amber-100 px-1.5 py-0.5 rounded text-[10px]">
                  {lowStockCount} Low / {outOfStockCount} Out
                </span>
              ) : (
                <span className="font-bold text-emerald-700 font-mono bg-emerald-100 px-1.5 py-0.5 rounded text-[10px]">
                  All In Stock
                </span>
              )}
            </div>

            {canViewCostAndProfit && (
              <div className="hidden md:flex items-center gap-1.5">
                <span className="text-stone-500">Cost:</span>
                <span className="font-bold text-blue-700 font-mono">
                  ${totalStockValueUSD.toFixed(2)}
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowKpis(!showKpis)}
            className="flex items-center gap-1 text-[11px] font-bold text-stone-600 hover:text-stone-900 bg-white hover:bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-lg transition shrink-0 ml-auto"
            title="Toggle Shop Stock Summary"
          >
            <span>{showKpis ? 'Hide Stats' : 'Stock Summary'}</span>
            {showKpis ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Expanded KPI Cards when user clicks to expand */}
        {showKpis && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 pt-1 border-t border-stone-200/60 bg-stone-100/50">
            <div className="p-2.5 bg-white border border-stone-200 rounded-xl shadow-2xs">
              <div className="text-stone-500 font-semibold text-[10px]">Store Goods Catalogued</div>
              <div className="text-base font-black text-stone-900 font-mono mt-0.5">{products.length}</div>
              <div className="text-[10px] text-stone-400">Total items on shelf</div>
            </div>

            <div className="p-2.5 bg-white border border-stone-200 rounded-xl shadow-2xs">
              <div className="text-stone-500 font-semibold text-[10px]">Total Selling Value</div>
              <div className="text-base font-black text-stone-900 font-mono mt-0.5">
                L$ {Math.round(totalRetailValueUSD * settings.exchangeRate).toLocaleString()}
              </div>
              <div className="text-[10px] text-stone-500 font-mono">
                ≈ ${totalRetailValueUSD.toFixed(2)} USD
              </div>
            </div>

            {canViewCostAndProfit ? (
              <div className="p-2.5 bg-white border border-stone-200 rounded-xl shadow-2xs">
                <div className="text-stone-500 font-semibold text-[10px]">Inventory Purchase Cost</div>
                <div className="text-base font-black text-blue-600 font-mono mt-0.5">
                  L$ {Math.round(totalStockValueUSD * settings.exchangeRate).toLocaleString()}
                </div>
                <div className="text-[10px] text-stone-400 font-mono">
                  ≈ ${totalStockValueUSD.toFixed(2)} USD (FIFO)
                </div>
              </div>
            ) : (
              <div className="p-2.5 bg-white border border-stone-200 rounded-xl shadow-2xs">
                <div className="text-stone-500 font-semibold text-[10px]">Shelf Health</div>
                <div className="text-base font-black text-emerald-600 font-mono mt-0.5">
                  {products.length - lowStockCount - outOfStockCount} Optimal
                </div>
                <div className="text-[10px] text-stone-400">Above reorder minimum</div>
              </div>
            )}

            <div className="p-2.5 bg-white border border-stone-200 rounded-xl shadow-2xs">
              <div className="text-stone-500 font-semibold text-[10px]">Restock Needed</div>
              <div className="text-base font-black text-amber-700 font-mono mt-0.5">
                {lowStockCount} Low / {outOfStockCount} Out
              </div>
              <div className="text-[10px] text-stone-400">Items running low</div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs & Search Filter Bar */}
      <div className="p-2.5 sm:p-3 bg-white border-b border-stone-200 space-y-2 text-xs shrink-0">
        {/* Main Section Navigation (Store Goods vs Goods Movement Record) */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200">
            <button
              onClick={() => setActiveTab('products')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                activeTab === 'products'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Package className="w-3.5 h-3.5 text-blue-600" />
              <span>Store Goods & Items ({products.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('movements')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                activeTab === 'movements'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <History className="w-3.5 h-3.5 text-amber-600" />
              <span>Goods Movement Record ({movements.length})</span>
            </button>
          </div>

          {/* View Mode Switcher (Grid vs Table) */}
          <div className="hidden sm:flex items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200">
            <button
              type="button"
              onClick={() => activeTab === 'products' ? setViewMode('grid') : setMovementViewMode('grid')}
              className={`p-1.5 rounded-lg transition ${
                (activeTab === 'products' ? viewMode === 'grid' : movementViewMode === 'grid')
                  ? 'bg-white text-stone-900 shadow-xs font-bold'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
              title="Grid Card View (Expansive layout like POS Item Library)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => activeTab === 'products' ? setViewMode('table') : setMovementViewMode('table')}
              className={`p-1.5 rounded-lg transition ${
                (activeTab === 'products' ? viewMode === 'table' : movementViewMode === 'table')
                  ? 'bg-white text-stone-900 shadow-xs font-bold'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
              title="Full Table View"
            >
              <TableIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Product Controls: Search, Stock Filter, Arrange / Sort */}
        {activeTab === 'products' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-stone-100">
            {/* Search Input & Stock Level Filter */}
            <div className="flex items-center gap-2 flex-1 max-w-xl">
              <div className="relative flex-1 min-w-[130px]">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search goods name, barcode, or SKU..."
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl pl-8 pr-3 py-1.5 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:bg-white focus:border-stone-900"
                />
              </div>

              <select
                value={filterStock}
                onChange={(e) => setFilterStock(e.target.value as any)}
                className="bg-stone-50 border border-stone-300 rounded-xl px-2.5 py-1.5 text-xs text-stone-800 font-medium cursor-pointer"
              >
                <option value="ALL">All Stock</option>
                <option value="LOW">Low Stock</option>
                <option value="OUT">Out of Stock</option>
              </select>
            </div>

            {/* Arrange / Sort dropdown (matching POS Item Library) */}
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
          </div>
        )}

        {/* Movement Controls: Search & Type Filter (when on movements tab) */}
        {activeTab === 'movements' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-stone-100">
            <div className="flex items-center gap-2 flex-1 max-w-xl">
              <div className="relative flex-1 min-w-[130px]">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  value={movementSearch}
                  onChange={(e) => setMovementSearch(e.target.value)}
                  placeholder="Search goods, staff, reason, or record ID..."
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl pl-8 pr-3 py-1.5 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:bg-white focus:border-stone-900"
                />
              </div>

              <select
                value={movementTypeFilter}
                onChange={(e) => setMovementTypeFilter(e.target.value)}
                className="bg-stone-50 border border-stone-300 rounded-xl px-2.5 py-1.5 text-xs text-stone-800 font-medium cursor-pointer"
              >
                <option value="ALL">All Movements ({movements.length})</option>
                <option value="SALE">Customer Sales</option>
                <option value="PURCHASE_INTAKE">Stock Intake (Purchases)</option>
                <option value="MANUAL_ADJUSTMENT">Physical Reconciliation</option>
                <option value="RETURN">Customer Returns</option>
                <option value="DAMAGE_WRITE_OFF">Damaged / Write-offs</option>
              </select>
            </div>

            <div className="text-[11px] text-stone-500 font-semibold shrink-0">
              Showing <span className="font-bold text-stone-900 font-mono">{filteredMovements.length}</span> recorded logs
            </div>
          </div>
        )}

        {/* Category Pills & "Manage Categories" Button (Identical to POS Register Experience) */}
        {activeTab === 'products' && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded-full font-semibold whitespace-nowrap text-xs transition ${
                selectedCategory === 'all'
                  ? 'bg-stone-900 text-white shadow-2xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              All Items ({products.length})
            </button>

            {categories.map((c) => {
              const count = products.filter((p) => p.categoryId === c.id).length;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={`px-3 py-1 rounded-full font-semibold whitespace-nowrap text-xs transition ${
                    selectedCategory === c.id
                      ? 'bg-stone-900 text-white shadow-2xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {c.name} ({count})
                </button>
              );
            })}

            {/* "+ Manage Categories" Button */}
            <button
              type="button"
              onClick={() => setCategoryModalOpen(true)}
              className="px-3 py-1 rounded-full font-bold whitespace-nowrap text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 flex items-center gap-1 transition shrink-0"
              title="Add or organize categories (Beverages, Household, Toiletries, etc.)"
            >
              <FolderPlus className="w-3.5 h-3.5 text-blue-600" />
              <span>+ Manage Categories</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area - Maximized flex-1 vertical scroll space for goods and movements */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 pb-28 md:pb-12">
        {activeTab === 'products' ? (
          <div>
            {/* GRID CARD VIEW (Default, expansive & fully formatted like POS Register Library) */}
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                {sortedProducts.length === 0 ? (
                  <div className="col-span-full p-12 text-center bg-white rounded-2xl border border-stone-200 text-stone-500 text-xs">
                    <Package className="w-8 h-8 mx-auto text-stone-300 mb-2" />
                    <p className="font-bold text-stone-700">No products found</p>
                    <p className="text-stone-400 mt-1">Try changing your search term or category filter.</p>
                  </div>
                ) : (
                  sortedProducts.map((product) => {
                    const u = units.find((unt) => unt.id === product.unitId);
                    const isLowStock = product.currentStock <= product.minStockLevel && product.currentStock > 0;
                    const isOutOfStock = product.currentStock <= 0;
                    const priceLRD = product.sellingPriceLRD || Math.round(product.sellingPriceUSD * settings.exchangeRate);
                    const catName = categories.find((c) => c.id === product.categoryId)?.name || 'General';
                    const topBorder = categoryBorderColors[product.categoryId] || 'border-t-blue-500';

                    return (
                      <div
                        key={product.id}
                        className={`group relative p-3.5 rounded-2xl bg-white border border-stone-200 ${topBorder} border-t-4 transition-all shadow-2xs hover:shadow-md flex flex-col justify-between select-none ${
                          isOutOfStock ? 'opacity-75 bg-stone-50/80' : ''
                        }`}
                      >
                        <div className="space-y-2.5">
                          {/* Top Row: Image / Visual & Stock Badge */}
                          <div className="flex items-start gap-3">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-16 h-16 sm:w-18 sm:h-18 object-cover rounded-xl border border-stone-200 bg-white shrink-0 shadow-2xs"
                              />
                            ) : (
                              <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-400 shrink-0">
                                <Package className="w-7 h-7" />
                              </div>
                            )}

                            <div className="flex-1 min-w-0">
                              {/* Stock Pill Badge */}
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-black font-mono border ${
                                    isOutOfStock
                                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                                      : isLowStock
                                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  }`}
                                >
                                  {product.currentStock} {u?.symbol || 'pcs'}
                                </span>

                                {isOutOfStock ? (
                                  <span className="text-[10px] font-bold text-rose-600">Out of Stock</span>
                                ) : isLowStock ? (
                                  <span className="text-[10px] font-bold text-amber-600">Low Stock</span>
                                ) : (
                                  <span className="text-[10px] font-semibold text-stone-400">In Stock</span>
                                )}
                              </div>

                              {/* Category Tag */}
                              <span className="inline-block px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[10px] font-bold border border-stone-200 truncate max-w-full">
                                {catName}
                              </span>
                            </div>
                          </div>

                          {/* Product Title (Display full title, 2 lines max) */}
                          <div>
                            <h3 className="font-extrabold text-stone-900 text-xs sm:text-sm leading-snug line-clamp-2">
                              {product.name}
                            </h3>
                            <div className="flex items-center gap-1.5 text-[10px] text-stone-400 font-mono mt-0.5">
                              <span>SKU: {product.sku}</span>
                              {product.barcode && <span>• {product.barcode}</span>}
                            </div>
                          </div>

                          {/* Dual Price Row */}
                          <div className="pt-2 border-t border-stone-100 flex items-baseline justify-between">
                            <div>
                              <div className="font-black text-stone-900 font-mono text-sm sm:text-base flex items-center gap-1">
                                <span>L$ {priceLRD.toLocaleString()}</span>
                                {product.pricingCurrency === 'LRD' && (
                                  <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-900">
                                    LRD Peg
                                  </span>
                                )}
                                {product.pricingCurrency === 'USD' && (
                                  <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-blue-100 text-blue-900">
                                    USD Peg
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-stone-500 font-mono font-medium">
                                ${product.sellingPriceUSD.toFixed(2)} USD
                              </div>
                            </div>

                            {/* Cost valuation for Admin */}
                            {canViewCostAndProfit && (
                              <div className="text-right">
                                <span className="text-[10px] text-stone-400 block">Cost</span>
                                <span className="text-[11px] font-mono font-bold text-stone-600">
                                  ${product.costPriceUSD.toFixed(2)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons: Adjust, Edit, Intake, Delete */}
                        <div className="pt-3 mt-3 border-t border-stone-100 flex items-center justify-between gap-1.5">
                          {isAdmin ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenAdjust(product)}
                                className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl font-bold text-xs border border-stone-200 transition"
                                title="Quick stock count adjustment"
                              >
                                Adjust
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditProduct(product)}
                                className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition shadow-2xs"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteCandidate(product)}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition"
                                title="Delete item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <span className="text-[10px] text-stone-400 font-medium py-1">
                              View Only (Staff)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              /* TABLE VIEW (Expansive table view with horizontal scrolling) */
              <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse min-w-[750px]">
                    <thead className="bg-stone-50 text-stone-500 border-b border-stone-200 font-bold">
                      <tr>
                        <th className="p-3">Product Name</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">SKU & Barcode</th>
                        <th className="p-3 text-right">In Stock</th>
                        <th className="p-3 text-right">Price (LRD)</th>
                        <th className="p-3 text-right">Price (USD)</th>
                        <th className="p-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {sortedProducts.map((p) => {
                        const u = units.find((unt) => unt.id === p.unitId);
                        const isLow = p.currentStock <= p.minStockLevel && p.currentStock > 0;
                        const isOut = p.currentStock <= 0;
                        const priceLRD = p.sellingPriceLRD || Math.round(p.sellingPriceUSD * settings.exchangeRate);

                        return (
                          <tr key={p.id} className="hover:bg-stone-50 transition">
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                {p.imageUrl ? (
                                  <img
                                    src={p.imageUrl}
                                    alt={p.name}
                                    className="w-8 h-8 rounded-lg object-cover border border-stone-200 shrink-0"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-400 shrink-0">
                                    <Package className="w-4 h-4" />
                                  </div>
                                )}
                                <span className="font-bold text-stone-900">{p.name}</span>
                              </div>
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[10px] font-medium border border-stone-200">
                                {categories.find((c) => c.id === p.categoryId)?.name || 'General'}
                              </span>
                            </td>
                            <td className="p-3 font-mono text-stone-500 text-[11px]">
                              <div>{p.sku}</div>
                              {p.barcode && <div className="text-stone-400">{p.barcode}</div>}
                            </td>
                            <td className="p-3 text-right">
                              <span
                                className={`font-mono font-bold px-2 py-0.5 rounded ${
                                  isOut
                                    ? 'bg-rose-100 text-rose-800'
                                    : isLow
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-emerald-50 text-emerald-800'
                                }`}
                              >
                                {p.currentStock} {u?.symbol}
                              </span>
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-stone-900">
                              L$ {priceLRD.toLocaleString()}
                            </td>
                            <td className="p-3 text-right font-mono text-stone-600">
                              ${p.sellingPriceUSD.toFixed(2)}
                            </td>
                            <td className="p-3 text-center">
                              {isAdmin && (
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenAdjust(p)}
                                    className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg"
                                    title="Adjust Stock"
                                  >
                                    <TrendingDown className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditProduct(p)}
                                    className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg"
                                    title="Edit Product"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteCandidate(p)}
                                    className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                                    title="Delete Product"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* GOODS MOVEMENT RECORD (Expansive Cards like POS Item Library or Roomy Table) */
          <div className="space-y-4">
            {movementViewMode === 'grid' ? (
              /* CARD GRID VIEW (Replicating the clean, spacious Item Library design) */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                {filteredMovements.length === 0 ? (
                  <div className="col-span-full p-12 text-center bg-white rounded-2xl border border-stone-200 text-stone-500 text-xs">
                    <History className="w-8 h-8 mx-auto text-stone-300 mb-2" />
                    <p className="font-bold text-stone-700">No goods movement logs found</p>
                    <p className="text-stone-400 mt-1">Try changing your search term or movement type filter.</p>
                  </div>
                ) : (
                  filteredMovements.map((m) => {
                    const isPositive = m.quantity > 0;
                    const typeColors: Record<string, { bg: string; text: string; border: string; label: string }> = {
                      SALE: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-t-rose-500', label: 'Sale (Goods Out)' },
                      PURCHASE_INTAKE: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-t-emerald-500', label: 'Stock Intake' },
                      MANUAL_ADJUSTMENT: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-t-amber-500', label: 'Count Adjustment' },
                      RETURN: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-t-purple-500', label: 'Customer Return' },
                      DAMAGE_WRITE_OFF: { bg: 'bg-stone-100', text: 'text-stone-700', border: 'border-t-stone-400', label: 'Damage Write-off' },
                    };
                    const color = typeColors[m.type] || {
                      bg: 'bg-stone-50',
                      text: 'text-stone-800',
                      border: isPositive ? 'border-t-emerald-500' : 'border-t-rose-500',
                      label: m.type.replace('_', ' '),
                    };

                    return (
                      <div
                        key={m.id}
                        className={`group relative p-3.5 rounded-2xl bg-white border border-stone-200 ${color.border} border-t-4 transition-all shadow-2xs hover:shadow-md flex flex-col justify-between select-none`}
                      >
                        <div className="space-y-2.5">
                          {/* Top Row: Movement Tag and Time */}
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${color.bg} ${color.text} border border-stone-200/60`}
                            >
                              {color.label}
                            </span>
                            <span className="text-[10px] text-stone-400 font-mono">
                              {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          {/* Item Title and Quantity Change */}
                          <div className="flex items-start justify-between gap-3 pt-0.5">
                            <div className="min-w-0 flex-1">
                              <h4 className="font-extrabold text-stone-900 text-sm leading-snug line-clamp-2" title={m.productName}>
                                {m.productName}
                              </h4>
                              {m.notes && (
                                <p className="text-[11px] text-stone-500 mt-1 line-clamp-2 leading-relaxed">
                                  {m.notes}
                                </p>
                              )}
                            </div>

                            <div className="text-right shrink-0">
                              <div
                                className={`font-black font-mono text-base flex items-center justify-end gap-1 ${
                                  isPositive ? 'text-emerald-600' : 'text-rose-600'
                                }`}
                              >
                                {isPositive ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                                <span>{isPositive ? `+${m.quantity}` : m.quantity}</span>
                              </div>
                              <div className="text-[10px] font-bold text-stone-500 font-mono mt-0.5">
                                Bal: {m.resultingStock} pcs
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Footer: Performed By and Date */}
                        <div className="pt-2 mt-2.5 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400">
                          <span className="truncate max-w-[130px]">
                            Staff: <strong className="text-stone-700 font-bold">{m.performedBy}</strong>
                          </span>
                          <span className="font-mono text-[10px] text-stone-500">
                            {new Date(m.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              /* DESKTOP ROOMY MOVEMENT TABLE */
              <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                    <thead className="bg-stone-50 text-stone-500 border-b border-stone-200 font-bold">
                      <tr>
                        <th className="p-3.5">Timestamp</th>
                        <th className="p-3.5">Item</th>
                        <th className="p-3.5">Movement Type</th>
                        <th className="p-3.5 text-right">Quantity Change</th>
                        <th className="p-3.5 text-right">Resulting Balance</th>
                        <th className="p-3.5">Recorded By & Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {filteredMovements.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-stone-500">
                            No movements found matching the current search.
                          </td>
                        </tr>
                      ) : (
                        filteredMovements.map((m) => (
                          <tr key={m.id} className="hover:bg-stone-50 transition">
                            <td className="p-3.5 font-mono text-stone-500 whitespace-nowrap">
                              {new Date(m.timestamp).toLocaleString()}
                            </td>
                            <td className="p-3.5 font-bold text-stone-900">{m.productName}</td>
                            <td className="p-3.5">
                              <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-stone-100 text-stone-800 border border-stone-200">
                                {m.type.replace('_', ' ')}
                              </span>
                            </td>
                            <td
                              className={`p-3.5 text-right font-mono font-black text-sm ${
                                m.quantity > 0 ? 'text-emerald-600' : 'text-rose-600'
                              }`}
                            >
                              {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                            </td>
                            <td className="p-3.5 text-right font-mono font-black text-stone-900">
                              {m.resultingStock}
                            </td>
                            <td className="p-3.5 text-stone-600 max-w-xs">
                              <div className="font-bold text-stone-800">{m.performedBy}</div>
                              {m.notes && <div className="text-stone-500 text-[11px] truncate">{m.notes}</div>}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Product Edit / Create Modal */}
      {productModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-stone-200 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-stone-900">
                    {editingProduct ? `Edit ${editingProduct.name}` : 'Create New Item'}
                  </h3>
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-md border border-blue-200 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Admin Mode</span>
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  {editingProduct
                    ? 'Authorized to edit item specifications, pricing, and shelf quantity.'
                    : 'Add a new product with initial stock count and pricing.'}
                </p>
              </div>
              <button
                onClick={() => setProductModalOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-900 rounded-lg hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3.5 text-xs max-h-[75vh] overflow-y-auto pr-1">
              {/* Product Photo: Full-Screen Camera Viewfinder or Upload */}
              <ProductPhotoCapture
                imageUrl={formData.imageUrl}
                onChange={(url) => setFormData({ ...formData, imageUrl: url })}
                label="Product Photo (Full-Screen Camera or Gallery Upload)"
              />

              {/* Item Name */}
              <div className="space-y-1">
                <label className="text-stone-700 font-bold">Item Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Bella Rice 25kg Bag"
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:bg-white focus:border-stone-900 font-medium"
                />
              </div>

              {/* Quantity in Stock & Unit */}
              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-blue-950 font-bold flex items-center gap-1.5 text-xs">
                    <Package className="w-3.5 h-3.5 text-blue-600" />
                    <span>{editingProduct ? 'Quantity on Hand (In Stock) *' : 'Initial Stock Quantity *'}</span>
                  </label>
                  <span className="text-[10px] text-blue-700 font-semibold">
                    {editingProduct ? 'Edit if wrong quantity was entered' : 'Units currently on shelf'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      step={formData.allowFractions ? '0.01' : '1'}
                      min="0"
                      required
                      value={formData.currentStock}
                      onChange={(e) =>
                        setFormData({ ...formData, currentStock: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full bg-white border border-blue-300 rounded-xl px-3 py-2 text-stone-950 font-mono text-base font-black focus:outline-none focus:border-blue-600 shadow-2xs"
                    />
                  </div>
                  <select
                    value={formData.unitId}
                    onChange={(e) => setFormData({ ...formData, unitId: e.target.value })}
                    className="w-36 bg-white border border-blue-300 rounded-xl px-2.5 py-2 text-stone-800 text-xs font-bold focus:outline-none focus:border-blue-600 shadow-2xs"
                  >
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.symbol})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] text-stone-500 font-medium">Quick Add:</span>
                  {[1, 5, 10, 20, 50].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          currentStock: (parseFloat(formData.currentStock.toString()) || 0) + num,
                        })
                      }
                      className="px-2 py-0.5 bg-white hover:bg-blue-100 text-blue-900 border border-blue-300 rounded-md text-[10px] font-bold transition shadow-2xs"
                    >
                      +{num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Barcode & SKU */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-stone-700 font-bold">Manufacturer Barcode</label>
                    <button
                      type="button"
                      onClick={() => setScannerOpen(true)}
                      className="text-[10px] text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1"
                    >
                      <Camera className="w-3 h-3" />
                      <span>Scan Barcode</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="e.g. 070001000123"
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 font-mono focus:outline-none focus:bg-white focus:border-stone-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-stone-700 font-bold">Internal SKU</label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 font-mono focus:outline-none focus:bg-white focus:border-stone-900"
                  />
                </div>
              </div>

              {/* Pricing in Liberian Dollars (Primary) and USD */}
              <div className="space-y-2 p-3 bg-stone-50 rounded-xl border border-stone-200">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-800 text-xs">Selling Price & Currency Origin</span>
                  <span className="text-[10px] text-stone-500 font-mono">
                    Rate: 1 USD = {settings.exchangeRate} LRD
                  </span>
                </div>

                {/* Currency Peg Toggle */}
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-stone-200/80 rounded-xl text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, pricingCurrency: 'DUAL' })}
                    className={`py-1.5 px-2 rounded-lg text-center transition ${
                      formData.pricingCurrency === 'DUAL'
                        ? 'bg-white text-stone-900 shadow-xs font-black'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    Dual (Standard)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, pricingCurrency: 'USD' })}
                    className={`py-1.5 px-2 rounded-lg text-center transition ${
                      formData.pricingCurrency === 'USD'
                        ? 'bg-blue-600 text-white shadow-xs font-black'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    Strictly USD ($)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, pricingCurrency: 'LRD' })}
                    className={`py-1.5 px-2 rounded-lg text-center transition ${
                      formData.pricingCurrency === 'LRD'
                        ? 'bg-emerald-600 text-white shadow-xs font-black'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    Strictly LRD (L$)
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-stone-700 font-bold flex items-center justify-between">
                      <span>Price in L$ LRD *</span>
                      {formData.pricingCurrency === 'LRD' && (
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                          Master Currency
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-stone-400">L$</span>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        required
                        value={formData.sellingPriceLRD}
                        onChange={(e) => {
                          const lrd = parseFloat(e.target.value) || 0;
                          const usd = Math.round((lrd / settings.exchangeRate) * 100) / 100;
                          setFormData({ ...formData, sellingPriceLRD: lrd, sellingPriceUSD: usd });
                        }}
                        className="w-full bg-white border border-stone-300 rounded-xl pl-8 pr-3 py-2 text-stone-900 font-mono text-sm font-black focus:outline-none focus:border-stone-900"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-stone-700 font-bold flex items-center justify-between">
                      <span>Price in $ USD</span>
                      {formData.pricingCurrency === 'USD' && (
                        <span className="text-[9px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded">
                          Master Currency
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-stone-400">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.sellingPriceUSD}
                        onChange={(e) => {
                          const usd = parseFloat(e.target.value) || 0;
                          const lrd = Math.round(usd * settings.exchangeRate);
                          setFormData({ ...formData, sellingPriceUSD: usd, sellingPriceLRD: lrd });
                        }}
                        className="w-full bg-white border border-stone-300 rounded-xl pl-7 pr-3 py-2 text-stone-900 font-mono text-sm focus:outline-none focus:border-stone-900"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Cost Price (Restricted to Owner/Manager) */}
              {canViewCostAndProfit && (
                <div className="space-y-2 p-3 bg-stone-50 rounded-xl border border-stone-200">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-800 text-xs">Cost Price (Wholesale/Purchase)</span>
                    <span className="text-[10px] text-stone-400">Restricted to Admin</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-stone-700 font-bold">Cost in L$ LRD</label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-bold">L$</span>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          value={formData.costPriceLRD}
                          onChange={(e) => {
                            const lrd = parseFloat(e.target.value) || 0;
                            const usd = Math.round((lrd / settings.exchangeRate) * 100) / 100;
                            setFormData({ ...formData, costPriceLRD: lrd, costPriceUSD: usd });
                          }}
                          className="w-full bg-white border border-stone-300 rounded-lg pl-7 pr-2.5 py-1.5 text-stone-900 font-mono text-xs focus:outline-none focus:border-stone-900"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-stone-700 font-bold">Cost in $ USD</label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-bold">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.costPriceUSD}
                          onChange={(e) => {
                            const usd = parseFloat(e.target.value) || 0;
                            const lrd = Math.round(usd * settings.exchangeRate);
                            setFormData({ ...formData, costPriceUSD: usd, costPriceLRD: lrd });
                          }}
                          className="w-full bg-white border border-stone-300 rounded-lg pl-6 pr-2.5 py-1.5 text-stone-900 font-mono text-xs focus:outline-none focus:border-stone-900"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Category (With inline "+ New Category" button) & Reorder level */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-stone-700 font-bold">Category *</label>
                    <button
                      type="button"
                      onClick={() => setCategoryModalOpen(true)}
                      className="text-[10px] text-blue-600 hover:text-blue-700 font-bold flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" />
                      <span>New</span>
                    </button>
                  </div>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:bg-white focus:border-stone-900"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-stone-700 font-bold">Low Stock Warning Level</label>
                  <input
                    type="number"
                    value={formData.minStockLevel}
                    onChange={(e) =>
                      setFormData({ ...formData, minStockLevel: parseInt(e.target.value) || 5 })
                    }
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 font-mono focus:outline-none focus:bg-white focus:border-stone-900"
                  />
                </div>
              </div>

              {/* Modal footer buttons */}
              <div className="pt-3 flex items-center justify-between gap-2 border-t border-stone-100">
                {editingProduct && isAdmin ? (
                  <button
                    type="button"
                    onClick={() => setDeleteCandidate(editingProduct)}
                    className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold flex items-center gap-1.5 transition"
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
                    onClick={() => setProductModalOpen(false)}
                    className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition shadow-xs"
                  >
                    Save Item
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Stock Adjust Modal */}
      {adjustModalOpen && adjustingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white border border-stone-200 w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
              <h3 className="font-extrabold text-stone-900 text-sm">Quick Stock Correction</h3>
              <button
                onClick={() => setAdjustModalOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs space-y-3">
              <div>
                <span className="text-stone-500 font-medium">Item:</span>
                <p className="font-bold text-stone-900 text-sm">{adjustingProduct.name}</p>
                <p className="text-[11px] text-stone-400 font-mono">
                  Current recorded: {adjustingProduct.currentStock}
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-800">Actual Counted Quantity</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={adjustedQty}
                  onChange={(e) => setAdjustedQty(parseFloat(e.target.value) || 0)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl p-2.5 font-mono text-base font-black text-stone-900 focus:outline-none focus:bg-white focus:border-stone-900"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-800">Reason / Notes</label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Broken packaging, physical inventory count..."
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl p-2 text-stone-900 focus:outline-none focus:bg-white focus:border-stone-900"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                onClick={() => setAdjustModalOpen(false)}
                className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAdjust}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-xs"
              >
                Confirm Adjustment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Item Confirmation Modal */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white border border-stone-200 w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl p-5 space-y-3">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-stone-900 text-sm">Delete "{deleteCandidate.name}"?</h3>
              <p className="text-xs text-stone-500 mt-1">
                This item will be permanently removed from the active catalog and register. Historic sale records will maintain their name snapshots.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteCandidate(null)}
                className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold text-xs"
              >
                Keep Item
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-xs"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal for Quick Item Lookup */}
      <BarcodeScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={(code) => {
          setScannerOpen(false);
          const existing = products.find(
            (p) => p.barcode === code || (p.alternativeBarcodes && p.alternativeBarcodes.includes(code))
          );
          if (existing) {
            handleOpenEditProduct(existing);
          } else {
            handleOpenNewProduct(code);
          }
        }}
      />

      {/* Category Manager Modal */}
      <CategoryManagerModal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        categories={categories}
        products={products}
        onCategoriesUpdated={handleCategoriesUpdated}
        onCategorySelected={(newCatId) => {
          setSelectedCategory(newCatId);
          setFormData((prev) => ({ ...prev, categoryId: newCatId }));
        }}
      />
    </div>
  );
};
