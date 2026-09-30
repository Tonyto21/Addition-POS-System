import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Trash2,
  Check,
  Building,
  Calendar,
  DollarSign,
  AlertCircle,
  Barcode,
  Search,
} from 'lucide-react';
import { BusinessSettings, Product, StockIntakeItem, StockIntakeTransaction, Supplier, User } from '../types';
import { OfflineStorageManager } from '../utils/storage';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { DistributorManagerModal } from './DistributorManagerModal';

interface StockIntakeViewProps {
  settings: BusinessSettings;
  activeUser: User;
  onFinished: () => void;
  onRefresh?: () => void;
  initialSupplierId?: string;
}

export const StockIntakeView: React.FC<StockIntakeViewProps> = ({
  settings,
  activeUser,
  onFinished,
  onRefresh,
  initialSupplierId,
}) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => OfflineStorageManager.getSuppliers());
  const [products, setProducts] = useState<Product[]>(() => OfflineStorageManager.getProducts());
  const [distributorModalOpen, setDistributorModalOpen] = useState(false);

  useEffect(() => {
    const handleUpdate = () => {
      setProducts(OfflineStorageManager.getProducts());
      setSuppliers(OfflineStorageManager.getSuppliers());
    };
    window.addEventListener('app-storage-updated', handleUpdate);
    return () => window.removeEventListener('app-storage-updated', handleUpdate);
  }, []);

  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(
    initialSupplierId || suppliers[0]?.id || ''
  );
  const [invoiceNumber, setInvoiceNumber] = useState<string>(`INV-${Date.now().toString().slice(-4)}`);
  const [dateReceived, setDateReceived] = useState<string>(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState<string>('');

  const [items, setItems] = useState<StockIntakeItem[]>([]);

  // Add Item form states
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
  const [intakeMode, setIntakeMode] = useState<'BASE' | 'PACKAGE'>('BASE');
  const [quantity, setQuantity] = useState<number>(10);
  const [unitCostUSD, setUnitCostUSD] = useState<number>(5.0);
  const [sellingPriceUSD, setSellingPriceUSD] = useState<number>(6.5);
  const [batchNumber, setBatchNumber] = useState<string>(`LOT-${new Date().toISOString().slice(0, 10)}`);
  const [expiryDate, setExpiryDate] = useState<string>('');

  const [scannerOpen, setScannerOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const activeProduct = products.find((p) => p.id === selectedProductId);
  const units = OfflineStorageManager.getUnits();
  const activeUnit = units.find((u) => u.id === activeProduct?.unitId);
  const baseSymbol = activeUnit?.symbol || activeUnit?.name || 'Bottles';

  // Flexible package options: custom packageTiers or primary package unit
  const packageOptions = React.useMemo(() => {
    if (!activeProduct) return [];
    if (activeProduct.packageTiers && activeProduct.packageTiers.length > 0) {
      return activeProduct.packageTiers;
    }
    if (activeProduct.hasPackageUnit && activeProduct.packageMultiplier && activeProduct.packageMultiplier > 1) {
      return [
        {
          id: 'primary',
          name: activeProduct.packageUnitName || 'Carton',
          multiplier: activeProduct.packageMultiplier,
          costUSD: activeProduct.packageCostUSD,
          packagePriceUSD: activeProduct.packagePriceUSD,
        },
      ];
    }
    return [];
  }, [activeProduct]);

  const [selectedTierId, setSelectedTierId] = useState<string>('');
  const activeSelectedTier = packageOptions.find((t) => t.id === selectedTierId) || packageOptions[0] || null;

  const hasPackage = packageOptions.length > 0;
  const multiplier = intakeMode === 'PACKAGE' ? (activeSelectedTier?.multiplier || 1) : 1;
  const selectedPkgName = activeSelectedTier?.name || activeProduct?.packageUnitName || 'Carton';

  // Effective single units and unit cost
  const effectiveBaseUnits = intakeMode === 'PACKAGE' ? Math.round(quantity * multiplier * 100) / 100 : quantity;
  const effectiveUnitCostUSD = intakeMode === 'PACKAGE' ? (unitCostUSD / multiplier) : unitCostUSD;

  const totalCostUSD = items.reduce((sum, it) => sum + it.subtotalCostUSD, 0);
  const totalCostLRD = Math.round(totalCostUSD * settings.exchangeRate);

  const handleProductSelect = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = products.find((p) => p.id === prodId);
    if (prod) {
      const hasPkg = (prod.packageTiers && prod.packageTiers.length > 0) || Boolean(prod.hasPackageUnit);
      if (hasPkg) {
        setIntakeMode('PACKAGE');
        const defaultTier = prod.packageTiers?.[0];
        const mult = defaultTier ? defaultTier.multiplier : (prod.packageMultiplier || 1);
        const cost = defaultTier?.packageCostUSD || prod.packageCostUSD || (prod.costPriceUSD * mult);
        setUnitCostUSD(cost > 0 ? cost : prod.costPriceUSD * mult);
        setSellingPriceUSD(prod.packagePriceUSD || (prod.sellingPriceUSD * mult));
      } else {
        setIntakeMode('BASE');
        setUnitCostUSD(prod.costPriceUSD);
        setSellingPriceUSD(prod.sellingPriceUSD);
      }
    }
  };

  // Direct 1-Click Intake: instantly adds incoming units to current inventory stock
  const handleDirectSingleIntake = () => {
    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod || quantity <= 0) return;

    const supplier = suppliers.find((s) => s.id === selectedSupplierId);
    const customNote = intakeMode === 'PACKAGE'
      ? `Purchased ${quantity} ${selectedPkgName} (${effectiveBaseUnits} ${baseSymbol}) from ${supplier?.name || 'Distributor'}`
      : `Received +${effectiveBaseUnits} ${baseSymbol} from ${supplier?.name || 'Distributor'}`;

    const result = OfflineStorageManager.recordSingleProductIntake(
      prod.id,
      effectiveBaseUnits,
      effectiveUnitCostUSD,
      supplier?.name,
      invoiceNumber.trim() || undefined,
      activeUser.name,
      customNote
    );

    if (result) {
      setFeedback(`✅ Added +${effectiveBaseUnits} ${baseSymbol} to ${prod.name}! (${quantity} ${selectedPkgName} = ${effectiveBaseUnits} ${baseSymbol}). New Stock: ${result.updatedStock} ${baseSymbol}`);
      setProducts(OfflineStorageManager.getProducts());
      if (onRefresh) onRefresh();
      setTimeout(() => setFeedback(null), 4500);
    }
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod || quantity <= 0) return;

    const subtotal = quantity * unitCostUSD;
    const newItem: StockIntakeItem = {
      productId: prod.id,
      productName: intakeMode === 'PACKAGE'
        ? `${prod.name} [${quantity} × ${selectedPkgName}]`
        : prod.name,
      quantity: effectiveBaseUnits, // logs single base units into stock
      unitCostUSD: effectiveUnitCostUSD,
      sellingPriceUSD: prod.sellingPriceUSD,
      sellingPriceLRD: Math.round(prod.sellingPriceUSD * settings.exchangeRate),
      batchNumber: batchNumber.trim() || undefined,
      expiryDate: expiryDate || undefined,
      subtotalCostUSD: subtotal,
      isPackagePurchase: intakeMode === 'PACKAGE',
      packageUnitName: selectedPkgName,
      packageMultiplier: multiplier,
      packagesCount: intakeMode === 'PACKAGE' ? quantity : undefined,
      costPerPackageUSD: intakeMode === 'PACKAGE' ? unitCostUSD : undefined,
    };

    setItems([...items, newItem]);
    setFeedback(`Added ${prod.name} (${quantity} ${selectedPkgName} = ${effectiveBaseUnits} ${baseSymbol}) to invoice manifest`);
    setTimeout(() => setFeedback(null), 3000);

    // reset fields
    setQuantity(10);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleCommitStockIntake = () => {
    if (items.length === 0) return;

    const supplier = suppliers.find((s) => s.id === selectedSupplierId);

    const transaction: StockIntakeTransaction = {
      id: `intake-${Date.now()}`,
      supplierId: selectedSupplierId,
      supplierName: supplier?.name || 'Wholesale Supplier',
      invoiceNumber: invoiceNumber.trim() || `INV-${Date.now()}`,
      dateReceived,
      receivedBy: activeUser.name,
      items,
      totalCostUSD,
      notes,
      createdAt: new Date().toISOString(),
    };

    OfflineStorageManager.recordStockIntake(transaction);
    if (onRefresh) onRefresh();
    onFinished();
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-400" />
            Stock Receiving & Purchase Intake
          </h2>
          <p className="text-xs text-slate-400">
            Record multi-item supplier shipments with purchase cost, lot numbers, and FIFO history
          </p>
        </div>

        <button
          onClick={onFinished}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg"
        >
          Back to Inventory
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col lg:flex-row gap-4">
        {/* Left: Invoice & Line Item Inputs */}
        <div className="w-full lg:w-96 space-y-4">
          {/* Supplier Details Card */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3 text-xs">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-blue-400" /> Supplier & Invoice Info
            </h3>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-slate-400">Supplier / Distributor</label>
                <button
                  type="button"
                  onClick={() => setDistributorModalOpen(true)}
                  className="text-[11px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 hover:underline"
                >
                  <Plus className="w-3 h-3" />
                  <span>Manage Distributors</span>
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-blue-500"
                >
                  {suppliers.map((sup) => (
                    <option key={sup.id} value={sup.id}>
                      {sup.name} {sup.phone ? `(${sup.phone})` : ''}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setDistributorModalOpen(true)}
                  className="px-2.5 py-1.5 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/50 text-blue-300 hover:text-white rounded shrink-0 transition"
                  title="Add or view distributor info"
                >
                  <Building className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-slate-400">Invoice / Ref #</label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-400">Date Received</label>
                <input
                  type="date"
                  value={dateReceived}
                  onChange={(e) => setDateReceived(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400">Intake Notes / Vehicle / Dock</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Received via delivery truck #4"
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white"
              />
            </div>
          </div>

          {/* Add Product Line Form */}
          <form onSubmit={handleAddItem} className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Add Intake Line
              </h3>
              <button
                type="button"
                onClick={() => setScannerOpen(true)}
                className="text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 text-[11px]"
              >
                <Barcode className="w-3.5 h-3.5" /> Scan Barcode
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400">Select Product</label>
              <select
                value={selectedProductId}
                onChange={(e) => handleProductSelect(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-blue-500"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Stock: {p.currentStock}) {p.hasPackageUnit ? `• Has ${p.packageUnitName}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Receiving Mode Toggle if product has Wholesale Package Unit */}
            {hasPackage && (
              <div className="p-3 bg-slate-950 rounded-xl border border-blue-900/60 space-y-2.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-bold">Purchase Mode:</span>
                  <span className="font-bold text-amber-400">
                    1 {selectedPkgName} = {multiplier} {baseSymbol}
                  </span>
                </div>

                {packageOptions.length > 1 && (
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Select Packaging Size</label>
                    <select
                      value={selectedTierId || packageOptions[0]?.id}
                      onChange={(e) => {
                        setSelectedTierId(e.target.value);
                        const tier = packageOptions.find((t) => t.id === e.target.value);
                        if (tier && activeProduct) {
                          const cost = tier.costUSD || tier.packagePriceUSD || (activeProduct.costPriceUSD * tier.multiplier);
                          setUnitCostUSD(cost);
                        }
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-bold text-xs"
                    >
                      {packageOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.name} ({opt.multiplier} {baseSymbol})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIntakeMode('BASE');
                      if (activeProduct) {
                        setUnitCostUSD(activeProduct.costPriceUSD);
                      }
                    }}
                    className={`py-1.5 px-2 rounded-lg font-bold text-xs transition ${
                      intakeMode === 'BASE'
                        ? 'bg-blue-600 text-white shadow'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    Loose / Singles ({baseSymbol})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIntakeMode('PACKAGE');
                      if (activeProduct) {
                        const tierCost = activeSelectedTier?.costUSD || activeProduct.packageCostUSD || (activeProduct.costPriceUSD * multiplier);
                        setUnitCostUSD(tierCost);
                      }
                    }}
                    className={`py-1.5 px-2 rounded-lg font-bold text-xs transition ${
                      intakeMode === 'PACKAGE'
                        ? 'bg-amber-600 text-white shadow'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    By {selectedPkgName} (&times;{multiplier})
                  </button>
                </div>

                {/* Explicit Base-Unit Breakdown Card */}
                <div className="p-2.5 bg-slate-900/90 rounded-lg border border-slate-800 text-[11px] space-y-1 font-mono">
                  <div className="flex justify-between text-slate-300">
                    <span>Quantity purchased:</span>
                    <strong className="text-white">{quantity} {intakeMode === 'PACKAGE' ? selectedPkgName : baseSymbol}</strong>
                  </div>
                  {intakeMode === 'PACKAGE' && (
                    <>
                      <div className="flex justify-between text-slate-300">
                        <span>Purchase unit:</span>
                        <strong className="text-amber-400">{selectedPkgName}</strong>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Units per {selectedPkgName.toLowerCase()}:</span>
                        <strong className="text-white">{multiplier} {baseSymbol}</strong>
                      </div>
                      <div className="flex justify-between text-emerald-400 pt-1 border-t border-slate-800 font-bold">
                        <span>Total base units received:</span>
                        <span>{effectiveBaseUnits} {baseSymbol}</span>
                      </div>
                      <div className="text-[10px] text-amber-300/90 text-right pt-0.5">
                        Equivalent: {effectiveBaseUnits} {baseSymbol} = {quantity} {selectedPkgName}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-slate-400">
                  {intakeMode === 'PACKAGE' ? `Quantity (${activeProduct?.packageUnitName || 'Packs'}) *` : 'Intake Quantity *'}
                </label>
                <input
                  type="number"
                  step={intakeMode === 'PACKAGE' ? '1' : '0.1'}
                  min="0.1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">
                  {intakeMode === 'PACKAGE' ? 'Cost Per Pack (USD) *' : 'Unit Cost (USD) *'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={unitCostUSD}
                  onChange={(e) => setUnitCostUSD(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-slate-400">Batch / Lot # (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. BATCH-01"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Expiry Date (optional)</label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                />
              </div>
            </div>

            {feedback && (
              <div className="p-2.5 bg-emerald-950/90 border border-emerald-500/50 rounded-lg text-emerald-300 text-xs font-bold text-center animate-fade-in">
                {feedback}
              </div>
            )}

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleDirectSingleIntake}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-bold text-xs rounded-xl transition shadow flex items-center justify-center gap-2"
                title="Instantly increases current on-hand stock for this product"
              >
                <Plus className="w-4 h-4" />
                <span>Add +{quantity} Directly to Stock Now</span>
              </button>

              <button
                type="submit"
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-xl border border-slate-700 transition flex items-center justify-center gap-1.5"
              >
                <span>+ Add to Invoice Manifest</span>
                <span className="text-[10px] text-slate-400 font-mono">({items.length} queued)</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right: Table of Manifest Line Items & Commit Button */}
        <div className="flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-3.5 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">
              Invoice Manifest ({items.length} product lines)
            </h3>
            <div className="text-right">
              <div className="text-sm font-bold text-emerald-400 font-mono">
                Total: ${totalCostUSD.toFixed(2)} USD
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                L$ {totalCostLRD.toFixed(0)} LRD
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-2">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500">
                <FileSpreadsheet className="w-12 h-12 text-slate-700 mb-2" />
                <p className="text-sm font-medium text-slate-400">Manifest is empty</p>
                <p className="text-xs text-slate-600">
                  Select products on the left or scan barcodes to build supplier intake.
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-850 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-2.5">Product</th>
                    <th className="p-2.5">Batch #</th>
                    <th className="p-2.5 text-right">Qty</th>
                    <th className="p-2.5 text-right">Unit Cost</th>
                    <th className="p-2.5 text-right">Line Total</th>
                    <th className="p-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {items.map((it, idx) => (
                    <tr key={idx} className="hover:bg-slate-850/40">
                      <td className="p-2.5 font-medium text-white">{it.productName}</td>
                      <td className="p-2.5 font-mono text-slate-400">{it.batchNumber || '-'}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-emerald-400">
                        {it.quantity}
                      </td>
                      <td className="p-2.5 text-right font-mono text-slate-300">
                        ${it.unitCostUSD.toFixed(2)}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-white">
                        ${it.subtotalCostUSD.toFixed(2)}
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-slate-500 hover:text-red-400 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer CTA */}
          <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
            <div className="text-xs text-slate-400">
              Receiving Clerk: <span className="font-semibold text-white">{activeUser.name}</span>
            </div>

            <button
              onClick={handleCommitStockIntake}
              disabled={items.length === 0}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Confirm & Increase Inventory</span>
            </button>
          </div>
        </div>
      </div>

      <BarcodeScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={(code) => {
          const match = products.find((p) => p.barcode === code);
          if (match) {
            handleProductSelect(match.id);
            setScannerOpen(false);
          }
        }}
        title="Scan Product to Intake"
      />

      <DistributorManagerModal
        isOpen={distributorModalOpen}
        onClose={() => setDistributorModalOpen(false)}
        suppliers={suppliers}
        onSuppliersUpdated={() => {
          const updated = OfflineStorageManager.getSuppliers();
          setSuppliers(updated);
        }}
        onSupplierSelected={(supId) => {
          setSelectedSupplierId(supId);
        }}
      />
    </div>
  );
};
