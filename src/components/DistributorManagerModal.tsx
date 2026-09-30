import React, { useState } from 'react';
import {
  Building2,
  Plus,
  Trash2,
  Edit2,
  X,
  Phone,
  User as UserIcon,
  MapPin,
  FileSpreadsheet,
  Package,
  History,
  Check,
  Search,
  ExternalLink,
} from 'lucide-react';
import { Supplier, Product, StockIntakeTransaction } from '../types';
import { OfflineStorageManager } from '../utils/storage';

interface DistributorManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  suppliers: Supplier[];
  onSuppliersUpdated: () => void;
  onSupplierSelected?: (supplierId: string) => void;
  onNavigateToIntakeWithSupplier?: (supplierId: string) => void;
}

export const DistributorManagerModal: React.FC<DistributorManagerModalProps> = ({
  isOpen,
  onClose,
  suppliers,
  onSuppliersUpdated,
  onSupplierSelected,
  onNavigateToIntakeWithSupplier,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistributorId, setSelectedDistributorId] = useState<string | null>(
    suppliers[0]?.id || null
  );

  // Form states (creating or editing)
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

  if (!isOpen) return null;

  // Retrieve intakes and products to display vendor statistics and purchase history
  const allIntakes: StockIntakeTransaction[] = OfflineStorageManager.getIntakes();
  const allProducts: Product[] = OfflineStorageManager.getProducts();

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.contactPerson && s.contactPerson.toLowerCase().includes(searchQuery.toLowerCase())) ||
      s.phone.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeDistributor = suppliers.find((s) => s.id === selectedDistributorId) || suppliers[0];

  // Intakes for active distributor
  const distributorIntakes = activeDistributor
    ? allIntakes.filter((it) => it.supplierId === activeDistributor.id || it.supplierName === activeDistributor.name)
    : [];

  const totalSpentUSD = distributorIntakes.reduce((acc, it) => acc + (it.totalCostUSD || 0), 0);

  // Items regularly supplied by this distributor (found in intake history)
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
    onSuppliersUpdated();
    setSelectedDistributorId(newDistributor.id);

    if (onSupplierSelected) {
      onSupplierSelected(newDistributor.id);
    }

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
        `Cannot delete "${dist.name}": There are ${intakeCount} past delivery invoices linked to this distributor. You can edit their contact details or leave notes instead.`
      );
      return;
    }

    if (confirm(`Are you sure you want to delete distributor "${dist.name}"?`)) {
      OfflineStorageManager.deleteSupplier(dist.id);
      onSuppliersUpdated();
      setFeedback(`Distributor "${dist.name}" deleted.`);
      const remaining = suppliers.filter((s) => s.id !== dist.id);
      setSelectedDistributorId(remaining[0]?.id || null);
      setTimeout(() => setFeedback(null), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-stone-100">
        {/* Top Header */}
        <div className="p-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Manage Distributors & Suppliers
              </h2>
              <p className="text-xs text-stone-400">
                Register beverage depots, food distributors, contact persons, and review purchase history
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleStartCreate}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>+ New Distributor</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback banner */}
        {feedback && (
          <div className="px-4 py-2 bg-blue-900/60 border-b border-blue-700/50 text-blue-200 text-xs flex items-center justify-between">
            <span>{feedback}</span>
            <button onClick={() => setFeedback(null)} className="text-blue-300 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Main 2-Column Body */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Left Column: Distributor List & Search */}
          <div className="w-full md:w-80 border-r border-stone-800 flex flex-col bg-stone-950/60 shrink-0">
            <div className="p-3 border-b border-stone-800">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search distributor or phone..."
                  className="w-full bg-stone-900 border border-stone-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredSuppliers.length === 0 ? (
                <div className="p-6 text-center text-xs text-stone-500">
                  No distributors match search.
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
                          ? 'bg-blue-950/50 border-blue-600/60 text-white'
                          : 'bg-stone-900/40 border-stone-800/80 text-stone-300 hover:bg-stone-800/60'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-xs truncate text-white">{sup.name}</div>
                        {sup.contactPerson && (
                          <div className="text-[11px] text-stone-400 truncate flex items-center gap-1 mt-0.5">
                            <UserIcon className="w-3 h-3 text-stone-500 shrink-0" />
                            <span>{sup.contactPerson}</span>
                          </div>
                        )}
                        <div className="text-[11px] text-stone-400 truncate flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-stone-500 shrink-0" />
                          <span className="font-mono">{sup.phone || 'No phone'}</span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="text-[10px] bg-stone-800 text-stone-400 px-2 py-0.5 rounded-full font-mono">
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
                          className="p-1 hover:bg-stone-700/60 text-stone-400 hover:text-white rounded"
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
                          className="p-1 hover:bg-red-950/80 text-stone-500 hover:text-red-400 rounded"
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

          {/* Right Column: Profile & Intake History OR Edit/Create Form */}
          <div className="flex-1 flex flex-col min-h-0 bg-stone-900/50 overflow-y-auto p-4 sm:p-5">
            {isCreatingNew || isEditing ? (
              /* Add / Edit Form */
              <form onSubmit={handleSaveDistributor} className="space-y-4 max-w-xl mx-auto w-full">
                <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-400" />
                    <span>{isCreatingNew ? 'Register New Distributor' : `Edit: ${formName}`}</span>
                  </h3>
                  <button
                    type="button"
                    onClick={handleCancelForm}
                    className="text-xs text-stone-400 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-stone-400 font-semibold mb-1">
                      Distributor / Company Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Monrovia Breweries Inc. / Uncle Joe Depot"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-white placeholder-stone-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-stone-400 font-semibold mb-1">
                        Contact Person / Sales Rep
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Mr. Emmanuel (Agent)"
                        value={formContactPerson}
                        onChange={(e) => setFormContactPerson(e.target.value)}
                        className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-white placeholder-stone-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-stone-400 font-semibold mb-1">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="e.g. 077 123 4567"
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value)}
                        className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-white placeholder-stone-500 font-mono focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-stone-400 font-semibold mb-1">
                        Email (Optional)
                      </label>
                      <input
                        type="email"
                        placeholder="orders@breweries.lr"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-white placeholder-stone-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-stone-400 font-semibold mb-1">
                        Depot / Warehouse Address
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Bushrod Island, Free Port Road"
                        value={formAddress}
                        onChange={(e) => setFormAddress(e.target.value)}
                        className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-white placeholder-stone-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-stone-400 font-semibold mb-1">
                      Distributor Notes / Goods Supplied
                    </label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Delivers every Tuesday morning. Requires cash payment or 7-day credit. Supplies Club Beer, Stout, and Malta."
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-white placeholder-stone-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-800">
                  <button
                    type="button"
                    onClick={handleCancelForm}
                    className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md transition"
                  >
                    <Check className="w-4 h-4" />
                    <span>Save Distributor</span>
                  </button>
                </div>
              </form>
            ) : activeDistributor ? (
              /* Distributor Overview & History */
              <div className="space-y-4">
                {/* Header Card */}
                <div className="p-4 bg-stone-950 border border-stone-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-white">{activeDistributor.name}</h3>
                      <button
                        onClick={() => handleStartEdit(activeDistributor)}
                        className="text-stone-400 hover:text-white p-1"
                        title="Edit profile"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-stone-400 mt-1">
                      {activeDistributor.contactPerson && (
                        <span className="flex items-center gap-1">
                          <UserIcon className="w-3.5 h-3.5 text-stone-500" />
                          <span>Rep: {activeDistributor.contactPerson}</span>
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-stone-500" />
                        <span className="font-mono">{activeDistributor.phone}</span>
                      </span>
                      {activeDistributor.address && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-stone-500" />
                          <span>{activeDistributor.address}</span>
                        </span>
                      )}
                    </div>

                    {activeDistributor.notes && (
                      <p className="text-xs text-stone-400 mt-2 bg-stone-900/80 p-2 rounded-lg border border-stone-800">
                        {activeDistributor.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col sm:items-end gap-2 shrink-0">
                    <div className="text-right">
                      <div className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">
                        Total Purchases (FIFO)
                      </div>
                      <div className="text-base font-black text-emerald-400 font-mono">
                        ${totalSpentUSD.toFixed(2)} USD
                      </div>
                    </div>

                    {onNavigateToIntakeWithSupplier && (
                      <button
                        type="button"
                        onClick={() => {
                          onNavigateToIntakeWithSupplier(activeDistributor.id);
                          onClose();
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow transition"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>Receive Stock From Them</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Items Supplied by this Distributor */}
                <div className="p-4 bg-stone-950 border border-stone-800 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-blue-400" />
                      <span>Regular Goods Supplied ({suppliedProducts.length})</span>
                    </h4>
                  </div>

                  {suppliedProducts.length === 0 ? (
                    <div className="text-xs text-stone-500 py-2">
                      No stock intakes logged under this distributor yet. Use the Receive Stock section to record shipments from them!
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
                      {suppliedProducts.map((prod) => (
                        <div
                          key={prod.id}
                          className="p-2.5 bg-stone-900 border border-stone-800 rounded-xl text-xs flex items-center justify-between"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="font-bold text-white truncate">{prod.name}</div>
                            <div className="text-[10px] text-stone-400">
                              Stock: {prod.currentStock} units
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-mono text-stone-300 font-semibold">
                              ${prod.costPriceUSD.toFixed(2)}
                            </div>
                            <div className="text-[10px] text-stone-500">Cost/ea</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Purchase / Delivery Invoices Ledger */}
                <div className="p-4 bg-stone-950 border border-stone-800 rounded-2xl space-y-3">
                  <h4 className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-amber-400" />
                    <span>Purchase & Delivery Invoices ({distributorIntakes.length})</span>
                  </h4>

                  {distributorIntakes.length === 0 ? (
                    <div className="text-xs text-stone-500 py-4 text-center">
                      No past delivery manifests found for this distributor.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {distributorIntakes.map((intake) => (
                        <div
                          key={intake.id}
                          className="p-3 bg-stone-900 border border-stone-800 rounded-xl text-xs space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white font-mono">
                                #{intake.invoiceNumber}
                              </span>
                              <span className="text-[11px] text-stone-400">
                                Date: {intake.dateReceived}
                              </span>
                            </div>
                            <div className="font-bold text-emerald-400 font-mono text-sm">
                              ${intake.totalCostUSD.toFixed(2)} USD
                            </div>
                          </div>

                          <div className="text-[11px] text-stone-400 flex flex-wrap gap-x-4 gap-y-1 bg-stone-950/60 p-2 rounded-lg">
                            {intake.items.map((it, idx) => (
                              <span key={idx} className="text-stone-300">
                                • {it.productName} &times; <strong className="text-white">{it.quantity}</strong> (@ ${it.unitCostUSD.toFixed(2)})
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
              <div className="p-12 text-center text-xs text-stone-500">
                Select a distributor from the left or click <strong>+ New Distributor</strong> to get started.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
