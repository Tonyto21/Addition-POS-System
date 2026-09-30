import React, { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  DollarSign,
  Phone,
  MapPin,
  FileText,
  CreditCard,
  Check,
  X,
  History,
  AlertCircle,
} from 'lucide-react';
import { BusinessSettings, Customer, CustomerRepayment, User } from '../types';
import { OfflineStorageManager } from '../utils/storage';

interface CustomersViewProps {
  settings: BusinessSettings;
  activeUser: User;
  onRefresh: () => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  settings,
  activeUser,
  onRefresh,
}) => {
  const [customers, setCustomers] = useState<Customer[]>(() => OfflineStorageManager.getCustomers());
  const [repayments, setRepayments] = useState<CustomerRepayment[]>(() => OfflineStorageManager.getRepayments());

  const [searchQuery, setSearchQuery] = useState('');
  const [onlyDebtors, setOnlyDebtors] = useState(false);

  // New Customer Modal
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [creditLimitUSD, setCreditLimitUSD] = useState(100);
  const [tin, setTin] = useState('');
  const [taxExempt, setTaxExempt] = useState(false);
  const [notes, setNotes] = useState('');

  // Repayment Modal
  const [repayModalOpen, setRepayModalOpen] = useState(false);
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);
  const [repayCurrency, setRepayCurrency] = useState<'USD' | 'LRD'>('USD');
  const [repayUSD, setRepayUSD] = useState<number>(0);
  const [repayLRD, setRepayLRD] = useState<number>(0);
  const [repayMethod, setRepayMethod] = useState<'CASH_USD' | 'CASH_LRD' | 'MOBILE_MONEY'>('CASH_USD');
  const [repayNotes, setRepayNotes] = useState('');

  const totalOutstandingDebtUSD = customers.reduce((sum, c) => sum + c.currentDebtUSD, 0);
  const totalOutstandingDebtLRD = Math.round(totalOutstandingDebtUSD * settings.exchangeRate);

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newCust: Customer = {
      id: `cust-${Date.now()}`,
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      creditLimitUSD: Number(creditLimitUSD) || 100,
      currentDebtUSD: 0,
      currentDebtLRD: 0,
      tin: tin.trim() || undefined,
      taxExempt: Boolean(taxExempt),
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    };

    OfflineStorageManager.saveCustomer(newCust);
    setCustomers(OfflineStorageManager.getCustomers());
    setCustomerModalOpen(false);

    // reset
    setName('');
    setPhone('');
    setAddress('');
    setTin('');
    setTaxExempt(false);
    setNotes('');
    onRefresh();
  };

  const handleOpenRepay = (cust: Customer) => {
    setActiveCustomer(cust);
    setRepayCurrency('LRD');
    setRepayUSD(cust.currentDebtUSD);
    setRepayLRD(cust.currentDebtLRD);
    setRepayMethod('CASH_LRD');
    setRepayNotes('Customer debt repayment in cash');
    setRepayModalOpen(true);
  };

  const handleSaveRepayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCustomer) return;

    let amountUSD = 0;
    let amountLRD = 0;

    if (repayCurrency === 'USD') {
      amountUSD = Number(repayUSD) || 0;
      amountLRD = Math.round(amountUSD * settings.exchangeRate);
    } else {
      amountLRD = Number(repayLRD) || 0;
      amountUSD = Number((amountLRD / settings.exchangeRate).toFixed(2));
    }

    if (amountUSD <= 0 && amountLRD <= 0) return;

    const record: CustomerRepayment = {
      id: `rep-${Date.now()}`,
      customerId: activeCustomer.id,
      customerName: activeCustomer.name,
      amountUSD,
      amountLRD,
      paymentMethod: repayMethod,
      notes: repayNotes,
      receivedBy: activeUser.name,
      timestamp: new Date().toISOString(),
    };

    OfflineStorageManager.recordCustomerRepayment(record);
    setCustomers(OfflineStorageManager.getCustomers());
    setRepayments(OfflineStorageManager.getRepayments());
    setRepayModalOpen(false);
    onRefresh();
  };

  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery = !q || c.name.toLowerCase().includes(q) || c.phone.includes(q);
    const matchesDebt = onlyDebtors ? c.currentDebtUSD > 0 : true;
    return matchesQuery && matchesDebt;
  });

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-stone-100 text-stone-900">
      {/* Top Banner & Summary */}
      <div className="p-4 bg-white border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-stone-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Customers & Credit Debt Ledger
          </h2>
          <p className="text-xs text-stone-500">
            Maintain Liberian customer accounts, credit balances, and recorded cash repayments
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-stone-50 px-3.5 py-1.5 rounded-xl border border-stone-200 text-right">
            <div className="text-[11px] text-stone-500 font-semibold">Total Outstanding Debt</div>
            <div className="text-sm font-extrabold text-amber-800 font-mono">
              ${totalOutstandingDebtUSD.toFixed(2)} USD{' '}
              <span className="text-xs text-stone-500 font-normal">
                (L$ {totalOutstandingDebtLRD.toLocaleString()})
              </span>
            </div>
          </div>

          <button
            onClick={() => setCustomerModalOpen(true)}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="p-3 bg-stone-50 border-b border-stone-200 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search customer name or mobile number..."
            className="w-full bg-white border border-stone-300 rounded-xl pl-8 pr-3 py-1.5 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-blue-600 shadow-2xs"
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer text-stone-700 font-medium">
          <input
            type="checkbox"
            checked={onlyDebtors}
            onChange={(e) => setOnlyDebtors(e.target.checked)}
            className="rounded border-stone-300 text-blue-600 focus:ring-blue-500"
          />
          <span>Show Customers with Unpaid Debt Only</span>
        </label>
      </div>

      {/* Customers List & Repayment History */}
      <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: Customer Directory */}
        <div className="lg:col-span-2 space-y-2.5">
          <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider">
            Customer Directory ({filteredCustomers.length})
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredCustomers.map((cust) => {
              const hasDebt = cust.currentDebtUSD > 0;
              return (
                <div
                  key={cust.id}
                  className="p-4 bg-white border border-stone-200 rounded-2xl space-y-2.5 shadow-2xs hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-extrabold text-stone-900">{cust.name}</h4>
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                        {cust.phone && (
                          <div className="text-xs text-stone-500 flex items-center gap-1 font-mono">
                            <Phone className="w-3 h-3 text-stone-400" /> {cust.phone}
                          </div>
                        )}
                        {cust.tin && (
                          <span className="text-[10px] font-mono bg-stone-100 text-stone-600 px-1.5 py-0.2 rounded border border-stone-200">
                            TIN: {cust.tin}
                          </span>
                        )}
                        {cust.taxExempt && (
                          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded border border-emerald-300">
                            TAX EXEMPT
                          </span>
                        )}
                      </div>
                    </div>

                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-mono font-bold ${
                        hasDebt
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-stone-100 text-stone-500'
                      }`}
                    >
                      {hasDebt ? `Owes $${cust.currentDebtUSD.toFixed(2)}` : 'Zero Debt'}
                    </span>
                  </div>

                  {cust.address && (
                    <div className="text-[11px] text-stone-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-stone-400" /> {cust.address}
                    </div>
                  )}

                  <div className="pt-2.5 border-t border-stone-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-stone-400">
                      Credit Limit: ${cust.creditLimitUSD.toFixed(0)}
                    </span>

                    {hasDebt ? (
                      <button
                        onClick={() => handleOpenRepay(cust)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-2xs"
                      >
                        Record Repayment
                      </button>
                    ) : (
                      <span className="text-[11px] text-emerald-600 font-bold">Good Standing</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Col: Recent Repayments History */}
        <div className="bg-white border border-stone-200 rounded-2xl p-4 flex flex-col shadow-2xs">
          <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-blue-600" /> Recent Repayments ({repayments.length})
          </h3>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {repayments.length === 0 ? (
              <p className="text-xs text-stone-400 text-center py-6">No repayment records yet.</p>
            ) : (
              repayments.map((rep) => (
                <div
                  key={rep.id}
                  className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs space-y-1"
                >
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold text-stone-900">{rep.customerName}</span>
                    <span className="font-mono font-black text-emerald-600">
                      +${rep.amountUSD.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-[11px] text-stone-500 flex justify-between">
                    <span>{rep.paymentMethod}</span>
                    <span>{new Date(rep.timestamp).toLocaleDateString()}</span>
                  </div>
                  {rep.notes && <div className="text-[10px] text-stone-400 italic">{rep.notes}</div>}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* New Customer Modal */}
      {customerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white border border-stone-200 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-extrabold text-stone-900">Create Customer Account</h3>
              <button
                onClick={() => setCustomerModalOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-900 rounded-lg hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-stone-700 font-bold">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Auntie Fatu Sherman"
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:bg-white focus:border-blue-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-stone-700 font-bold">Mobile Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +231 77 555 123"
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 font-mono focus:outline-none focus:bg-white focus:border-blue-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-stone-700 font-bold">Address / Store Location</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Benson Street, Monrovia"
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:bg-white focus:border-blue-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-stone-700 font-bold">Credit Limit (USD)</label>
                <input
                  type="number"
                  value={creditLimitUSD}
                  onChange={(e) => setCreditLimitUSD(parseFloat(e.target.value) || 0)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 font-mono focus:outline-none focus:bg-white focus:border-blue-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-stone-700 font-bold">Taxpayer Identification Number (TIN)</label>
                <input
                  type="text"
                  value={tin}
                  onChange={(e) => setTin(e.target.value)}
                  placeholder="e.g. CUST-TIN-88910"
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 font-mono focus:outline-none focus:bg-white focus:border-blue-600"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-stone-800">
                  <input
                    type="checkbox"
                    checked={taxExempt}
                    onChange={(e) => setTaxExempt(e.target.checked)}
                    className="w-4 h-4 rounded border-stone-300 text-blue-600 focus:ring-0"
                  />
                  <span>Tax-Exempt Entity (e.g. NGO, Diplomatic, Govt)</span>
                </label>
                <p className="text-[10px] text-stone-500 pl-6 mt-0.5">
                  Flags this customer as exempt. In POS, cashiers can deliberately activate the tax exemption for their orders.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCustomerModalOpen(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Repayment Modal */}
      {repayModalOpen && activeCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white border border-stone-200 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-extrabold text-stone-900">Record Debt Repayment</h3>
              <button
                onClick={() => setRepayModalOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-900 rounded-lg hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRepayment} className="space-y-3 text-xs">
              <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl">
                <div className="font-extrabold text-stone-900">{activeCustomer.name}</div>
                <div className="text-amber-800 font-mono text-sm font-black mt-1">
                  Current Balance: ${activeCustomer.currentDebtUSD.toFixed(2)} USD (L${' '}
                  {activeCustomer.currentDebtLRD.toLocaleString()})
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-stone-700 font-bold">Repayment Amount *</label>
                  <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-lg border border-stone-200">
                    <button
                      type="button"
                      onClick={() => {
                        setRepayCurrency('LRD');
                        setRepayMethod('CASH_LRD');
                      }}
                      className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition ${
                        repayCurrency === 'LRD' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-500'
                      }`}
                    >
                      LRD (L$)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRepayCurrency('USD');
                        setRepayMethod('CASH_USD');
                      }}
                      className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition ${
                        repayCurrency === 'USD' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-500'
                      }`}
                    >
                      USD ($)
                    </button>
                  </div>
                </div>

                {repayCurrency === 'USD' ? (
                  <div>
                    <input
                      type="number"
                      step="0.1"
                      max={activeCustomer.currentDebtUSD}
                      required
                      value={repayUSD || ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setRepayUSD(val);
                        setRepayLRD(Math.round(val * settings.exchangeRate));
                      }}
                      className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 font-mono text-base font-bold focus:outline-none focus:bg-white focus:border-blue-600"
                    />
                    <div className="text-[11px] text-stone-500 font-mono mt-1">
                      Equivalent: L$ {Math.round(repayUSD * settings.exchangeRate).toLocaleString()} LRD
                    </div>
                  </div>
                ) : (
                  <div>
                    <input
                      type="number"
                      step="5"
                      max={activeCustomer.currentDebtLRD}
                      required
                      value={repayLRD || ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setRepayLRD(val);
                        setRepayUSD(Number((val / settings.exchangeRate).toFixed(2)));
                      }}
                      className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 font-mono text-base font-bold focus:outline-none focus:bg-white focus:border-blue-600"
                    />
                    <div className="text-[11px] text-stone-500 font-mono mt-1">
                      Equivalent: ${(repayLRD / settings.exchangeRate).toFixed(2)} USD
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-stone-700 font-bold">Payment Method</label>
                <select
                  value={repayMethod}
                  onChange={(e) => setRepayMethod(e.target.value as any)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none"
                >
                  <option value="CASH_USD">💵 Cash (USD) - Adds to Drawer</option>
                  <option value="CASH_LRD">💵 Cash (LRD) - Adds to Drawer</option>
                  <option value="MOBILE_MONEY">📱 Mobile Money (Lonestar MTN / Orange)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRepayModalOpen(false)}
                  className="px-4 py-2 bg-stone-100 text-stone-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs"
                >
                  Confirm Repayment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
