import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Trash2,
  Edit2,
  Phone,
  User as UserIcon,
  MapPin,
  FileSpreadsheet,
  Package,
  History,
  Check,
  Search,
  DollarSign,
  ArrowRight,
} from 'lucide-react';
import { Supplier, Product, StockIntakeTransaction, BusinessSettings } from '../types';
import { OfflineStorageManager } from '../utils/storage';

interface DistributorsSettingsViewProps {
  settings?: BusinessSettings;
  onNavigateToIntake?: (supplierId?: string) => void;
  onRefresh?: () => void;
}

export const DistributorsSettingsView: React.FC<DistributorsSettingsViewProps> = ({
  settings,
  onNavigateToIntake,
  onRefresh,
}) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => OfflineStorageManager.getSuppliers());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistributorId, setSelectedDistributorId] = useState<string | null>(
    suppliers[0]?.id || null
  );

  // Form states
  const [isEditing, setIsEditing] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [formId, setFormId] = useState('');
  const [formName, setFormName] = useState('');
  const [formContactPerson, setFormContactPerson] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    const handleUpdate = () => {
      const refreshed = OfflineStorageManager.getSuppliers();
      setSuppliers(refreshed);
      if (!selectedDistributorId && refreshed.length > 0) {
        setSelectedDistributorId(refreshed[0].id);
      }
    };
    window.addEventListener('app-storage-updated', handleUpdate);
    return () => window.removeEventListener('app-storage-updated', handleUpdate);
  }, [selectedDistributorId]);

  const allIntakes: StockIntakeTransaction[] = OfflineStorageManager.getIntakes();
  const allProducts: Product[] = OfflineStorageManager.getProducts();

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.contactPerson && s.contactPerson.toLowerCase().includes(searchQuery.toLowerCase())) ||
      s.phone.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeDistributor = suppliers.find((s) => s.id === selectedDistributorId) || suppliers[0];

  const distributorIntakes = activeDistributor
    ? allIntakes.filter((it) => it.supplierId === activeDistributor.id || it.supplierName === activeDistributor.name)
    : [];

  const totalSpentUSD = distributorIntakes.reduce((acc, it) => acc + (it.totalCostUSD || 0), 0);

  const suppliedProductIds = new Set<string>();
  distributorIntakes.forEach((it) => {
    it.items.forEach((item) => {
      suppliedProductIds.add(item.productId);
    });
  });

  const suppliedProducts = allProducts.filter((p) => suppliedProductIds.has(p.id));

  const handleStartCreate = () => {
    setIsCreatingNew(true);
    setIsEditing(false);
    setFormId(`sup-${Date.now()}`);
    setFormName('');
    setFormContactPerson('');
    setFormPhone('');
    setFormEmail('');
    setFormAddress('');
    setFormNotes('');
  };

  const handleStartEdit = (dist: Supplier) => {
    setIsCreatingNew(false);
    setIsEditing(true);
    setFormId(dist.id);
    setFormName(dist.name);
    setFormContactPerson(dist.contactPerson || '');
    setFormPhone(dist.phone);
    setFormEmail(dist.email || '');
    setFormAddress(dist.address || '');
    setFormNotes(dist.notes || '');
  };

  const handleCancelForm = () => {
    setIsCreatingNew(false);
    setIsEditing(false);
  };

  const handleSaveDistributor = (e: React.FormEvent) => {
    e.preventDefault();
    const name = formName.trim();
    if (!name) {
      setFeedback('Distributor / Company name is required.');
      setTimeout(() => setFeedback(null), 3000);
      return;
    }

    const newDistributor: Supplier = {
      id: formId || `sup-${Date.now()}`,
      name,
      contactPerson: formContactPerson.trim() || undefined,
      phone: formPhone.trim() || 'N/A',
      email: formEmail.trim() || undefined,
      address: formAddress.trim() || undefined,
      notes: formNotes.trim() || undefined,
    };

    OfflineStorageManager.saveSupplier(newDistributor);
    setSuppliers(OfflineStorageManager.getSuppliers());
    setSelectedDistributorId(newDistributor.id);
    if (onRefresh) onRefresh();

    setFeedback(`Saved distributor "${name}" successfully!`);
    setIsCreatingNew(false);
    setIsEditing(false);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleDeleteDistributor = (dist: Supplier) => {
    const intakeCount = allIntakes.filter(
      (it) => it.supplierId === dist.id || it.supplierName === dist.name
    ).length;

    if (intakeCount > 0) {
      alert(
        `Cannot delete "${dist.name}": There are ${intakeCount} past delivery invoices linked to this distributor. You can edit their contact details or notes instead.`
      );
      return;
    }

    if (confirm(`Are you sure you want to delete distributor "${dist.name}"?`)) {
      OfflineStorageManager.deleteSupplier(dist.id);
      const updated = OfflineStorageManager.getSuppliers();
      setSuppliers(updated);
      setSelectedDistributorId(updated[0]?.id || null);
      if (onRefresh) onRefresh();
      setFeedback(`Distributor "${dist.name}" deleted.`);
      setTimeout(() => setFeedback(null), 2500);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
      {/* Top Header */}
      <div className="p-4 sm:p-5 bg-stone-50 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
              Distributor & Supplier Management
            </h2>
            <p className="text-xs text-stone-500">
              Manage your wholesale suppliers, beverage depots, delivery terms, and check purchase history
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleStartCreate}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Distributor</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-between">
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)} className="text-emerald-600 hover:text-emerald-950 font-bold">
            &times;
          </button>
        </div>
      )}

      {/* 2-Column Responsive Layout */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
        {/* Left Column: Distributor List */}
        <div className="w-full md:w-80 border-r border-stone-200 flex flex-col bg-stone-50/70 shrink-0">
          <div className="p-3 border-b border-stone-200 bg-white">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search distributor or phone..."
                className="w-full bg-stone-100 border border-stone-300 rounded-xl pl-8 pr-3 py-1.5 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-900"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
            {filteredSuppliers.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-400">
                No distributors found. Click "+ Add Distributor" to register one.
              </div>
            ) : (
              filteredSuppliers.map((sup) => {
                const intakeCount = allIntakes.filter(
                  (it) => it.supplierId === sup.id || it.supplierName === sup.name
                ).length;
                const isSelected = activeDistributor?.id === sup.id;

                return (
                  <div
                    key={sup.id}
                    onClick={() => {
                      setSelectedDistributorId(sup.id);
                      if (isEditing || isCreatingNew) handleCancelForm();
                    }}
                    className={`p-3 rounded-xl cursor-pointer transition border text-left flex items-start justify-between gap-2 ${
                      isSelected
                        ? 'bg-blue-50/80 border-blue-400 text-stone-900 shadow-2xs'
                        : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-100/70'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs truncate text-stone-900">{sup.name}</div>
                      {sup.contactPerson && (
                        <div className="text-[11px] text-stone-500 truncate flex items-center gap-1 mt-0.5">
                          <UserIcon className="w-3 h-3 text-stone-400 shrink-0" />
                          <span>{sup.contactPerson}</span>
                        </div>
                      )}
                      <div className="text-[11px] text-stone-500 truncate flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-stone-400 shrink-0" />
                        <span className="font-mono">{sup.phone}</span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="text-[10px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full font-mono border border-stone-200">
                          {intakeCount} {intakeCount === 1 ? 'delivery' : 'deliveries'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEdit(sup);
                        }}
                        className="p-1 hover:bg-stone-200 text-stone-400 hover:text-stone-900 rounded"
                        title="Edit details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDistributor(sup);
                        }}
                        className="p-1 hover:bg-red-50 text-stone-400 hover:text-red-600 rounded"
                        title="Delete distributor"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Profile & Details */}
        <div className="flex-1 flex flex-col min-h-0 bg-stone-50/30 overflow-y-auto p-4 sm:p-6">
          {isCreatingNew || isEditing ? (
            /* Create / Edit Form */
            <form onSubmit={handleSaveDistributor} className="space-y-4 max-w-xl mx-auto w-full bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <span>{isCreatingNew ? 'Add New Distributor / Wholesaler' : `Edit: ${formName}`}</span>
                </h3>
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="text-xs text-stone-500 hover:text-stone-900 font-semibold"
                >
                  Cancel
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-stone-700 font-bold mb-1">
                    Distributor / Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Monrovia Breweries Inc. / Uncle Joe Beverage Depot"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-900 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-stone-700 font-bold mb-1">
                      Contact Person / Sales Rep
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Mr. Emmanuel (Sales Rep)"
                      value={formContactPerson}
                      onChange={(e) => setFormContactPerson(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-900 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-700 font-bold mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 077 123 4567"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 placeholder-stone-400 font-mono focus:outline-none focus:border-stone-900 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-stone-700 font-bold mb-1">
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      placeholder="orders@breweries.lr"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-900 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-700 font-bold mb-1">
                      Depot Location / Address
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Bushrod Island, Free Port Road"
                      value={formAddress}
                      onChange={(e) => setFormAddress(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-900 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-stone-700 font-bold mb-1">
                    Goods Supplied & Delivery Terms Notes
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Delivers every Tuesday. Supplies Club Beer 650ml, Stout, and Soda packs. Cash on delivery."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-900 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow transition"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Distributor</span>
                </button>
              </div>
            </form>
          ) : activeDistributor ? (
            /* Distributor Details & Invoices */
            <div className="space-y-4 max-w-4xl mx-auto w-full">
              {/* Header Box */}
              <div className="p-4 sm:p-5 bg-white border border-stone-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-stone-900">{activeDistributor.name}</h3>
                    <button
                      onClick={() => handleStartEdit(activeDistributor)}
                      className="text-stone-400 hover:text-stone-900 p-1 rounded hover:bg-stone-100 transition"
                      title="Edit details"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-stone-600 mt-1.5">
                    {activeDistributor.contactPerson && (
                      <span className="flex items-center gap-1 font-medium">
                        <UserIcon className="w-3.5 h-3.5 text-stone-400" />
                        <span>Sales Rep: {activeDistributor.contactPerson}</span>
                      </span>
                    )}
                    <span className="flex items-center gap-1 font-medium">
                      <Phone className="w-3.5 h-3.5 text-stone-400" />
                      <span className="font-mono text-stone-900 font-bold">{activeDistributor.phone}</span>
                    </span>
                    {activeDistributor.address && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-stone-400" />
                        <span>{activeDistributor.address}</span>
                      </span>
                    )}
                  </div>

                  {activeDistributor.notes && (
                    <div className="text-xs text-stone-600 mt-2.5 bg-stone-50 p-2.5 rounded-xl border border-stone-200/70">
                      <strong className="text-stone-800">Notes:</strong> {activeDistributor.notes}
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:items-end gap-2.5 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-stone-100">
                  <div className="text-left sm:text-right">
                    <div className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">
                      Total Purchases (FIFO)
                    </div>
                    <div className="text-lg font-black text-blue-700 font-mono">
                      ${totalSpentUSD.toFixed(2)} USD
                    </div>
                  </div>

                  {onNavigateToIntake && (
                    <button
                      type="button"
                      onClick={() => onNavigateToIntake(activeDistributor.id)}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Receive Stock from this Distributor</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Items Supplied */}
              <div className="p-4 sm:p-5 bg-white border border-stone-200 rounded-2xl space-y-3 shadow-xs">
                <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-blue-600" />
                  <span>Regular Goods Supplied ({suppliedProducts.length})</span>
                </h4>

                {suppliedProducts.length === 0 ? (
                  <div className="text-xs text-stone-500 py-3 bg-stone-50 p-3 rounded-xl border border-dashed border-stone-200">
                    No shipments received from {activeDistributor.name} yet. When you receive stock under this distributor, the products and price history will automatically appear here!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                    {suppliedProducts.map((prod) => (
                      <div
                        key={prod.id}
                        className="p-3 bg-stone-50 hover:bg-stone-100/80 border border-stone-200 rounded-xl text-xs flex items-center justify-between transition"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="font-bold text-stone-900 truncate">{prod.name}</div>
                          <div className="text-[10px] text-stone-500 font-medium">
                            Current Stock: {prod.currentStock} units
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-mono text-stone-900 font-bold">
                            ${prod.costPriceUSD.toFixed(2)}
                          </div>
                          <div className="text-[10px] text-stone-500">Cost/ea</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Invoices List */}
              <div className="p-4 sm:p-5 bg-white border border-stone-200 rounded-2xl space-y-3 shadow-xs">
                <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-amber-600" />
                  <span>Delivery & Purchase Invoices ({distributorIntakes.length})</span>
                </h4>

                {distributorIntakes.length === 0 ? (
                  <div className="text-xs text-stone-500 py-4 text-center bg-stone-50 rounded-xl border border-dashed border-stone-200">
                    No recorded delivery manifests yet for this distributor.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {distributorIntakes.map((intake) => (
                      <div
                        key={intake.id}
                        className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl text-xs space-y-2 hover:bg-stone-100/50 transition"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-stone-900 font-mono bg-white px-2 py-0.5 rounded border border-stone-200">
                              #{intake.invoiceNumber}
                            </span>
                            <span className="text-[11px] text-stone-500">
                              Date: {intake.dateReceived}
                            </span>
                            <span className="text-[11px] text-stone-500 hidden sm:inline">
                              Received by: {intake.receivedBy}
                            </span>
                          </div>
                          <div className="font-bold text-blue-700 font-mono text-sm">
                            ${intake.totalCostUSD.toFixed(2)} USD
                          </div>
                        </div>

                        <div className="text-[11px] text-stone-600 flex flex-wrap gap-x-3 gap-y-1 bg-white p-2 rounded-lg border border-stone-200/80">
                          {intake.items.map((it, idx) => (
                            <span key={idx}>
                              • {it.productName}: <strong className="text-stone-900">{it.quantity}</strong> @ ${it.unitCostUSD.toFixed(2)}
                            </span>
                          ))}
                        </div>

                        {intake.notes && (
                          <div className="text-[10px] text-stone-500 italic">
                            Notes: {intake.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-stone-400">
              Select a distributor or add a new one.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
