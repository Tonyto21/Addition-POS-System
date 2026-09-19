import React, { useState } from 'react';
import {
  Receipt,
  DollarSign,
  Users,
  Search,
  Printer,
  Calendar,
  Filter,
  CheckCircle2,
  Clock,
  ArrowRightLeft,
  ShoppingBag,
  CreditCard,
  PhoneCall,
} from 'lucide-react';
import { BusinessSettings, ReceiptSnapshot, Sale, User } from '../types';
import { OfflineStorageManager } from '../utils/storage';
import { CustomersView } from './CustomersView';
import { CashDrawerShiftView } from './CashDrawerShiftView';
import { ReceiptModal } from './ReceiptModal';

interface OrdersHubProps {
  settings: BusinessSettings;
  activeUser: User;
  onRefresh: () => void;
}

export const OrdersHub: React.FC<OrdersHubProps> = ({
  settings,
  activeUser,
  onRefresh,
}) => {
  // Subheading tabs inside Orders:
  // 1. orders: All Completed Orders & Receipts History
  // 2. drawer: Cash Drawer Shifts (Start/End Shift & Cash count)
  // 3. credit: Customer Credit & Debt Ledger
  const [subTab, setSubTab] = useState<'orders' | 'drawer' | 'credit'>('orders');

  const [receipts, setReceipts] = useState<ReceiptSnapshot[]>(() =>
    OfflineStorageManager.getReceipts()
  );
  const [sales] = useState<Sale[]>(() => OfflineStorageManager.getSales());
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptSnapshot | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);

  const handleOpenReceipt = (r: ReceiptSnapshot) => {
    setSelectedReceipt(r);
    setReceiptModalOpen(true);
  };

  // Orders calculations
  const totalOrders = receipts.length;
  const totalRevenueUSD = receipts.reduce((sum, r) => sum + r.totalUSD, 0);
  const totalRevenueLRD = receipts.reduce((sum, r) => sum + r.totalLRD, 0);
  const avgOrderUSD = totalOrders > 0 ? totalRevenueUSD / totalOrders : 0;

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayOrders = receipts.filter((r) => r.date.startsWith(todayStr));
  const todayRevenueUSD = todayOrders.reduce((sum, r) => sum + r.totalUSD, 0);

  // Filtered receipts
  const filteredReceipts = receipts.filter((r) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      r.receiptNumber.toLowerCase().includes(q) ||
      r.cashierName.toLowerCase().includes(q) ||
      (r.customerName && r.customerName.toLowerCase().includes(q)) ||
      r.items.some((it) => it.name.toLowerCase().includes(q));

    const matchesPayment =
      paymentFilter === 'ALL' || r.paymentMethod === paymentFilter;

    return matchesSearch && matchesPayment;
  });

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-stone-100 text-stone-900">
      {/* Top Sub-navigation Bar */}
      <div className="px-4 py-2.5 bg-white border-b border-stone-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl border border-stone-200">
          <button
            onClick={() => setSubTab('orders')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              subTab === 'orders'
                ? 'bg-white text-stone-900 shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Receipt className="w-3.5 h-3.5 text-blue-600" />
            <span>All Orders & Receipts</span>
            <span className="ml-1 text-[10px] px-1.5 py-0.2 bg-stone-200 text-stone-700 rounded-full font-mono">
              {receipts.length}
            </span>
          </button>

          <button
            onClick={() => setSubTab('drawer')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              subTab === 'drawer'
                ? 'bg-white text-stone-900 shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
            <span>Cash Drawer Shifts</span>
          </button>

          <button
            onClick={() => setSubTab('credit')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              subTab === 'credit'
                ? 'bg-white text-stone-900 shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-purple-600" />
            <span>Customer Credit & Debt</span>
          </button>
        </div>

        <div className="text-[11px] text-stone-500 font-mono hidden sm:block">
          Orders, Shift Balances & Credit Ledger
        </div>
      </div>

      {/* Main Subview Container */}
      <div className="flex-1 overflow-hidden">
        {subTab === 'orders' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* KPI Summary Cards */}
            <div className="p-4 bg-white border-b border-stone-200">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl">
                  <div className="text-[11px] text-stone-500 font-bold uppercase tracking-wider">
                    Total Orders
                  </div>
                  <div className="text-xl font-extrabold text-stone-900 mt-0.5">
                    {totalOrders}
                  </div>
                  <div className="text-[10px] text-stone-500 font-mono mt-0.5">
                    {todayOrders.length} placed today
                  </div>
                </div>

                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl">
                  <div className="text-[11px] text-stone-500 font-bold uppercase tracking-wider">
                    Total Sales Volume
                  </div>
                  <div className="text-xl font-extrabold text-stone-900 mt-0.5">
                    ${totalRevenueUSD.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-stone-500 font-mono mt-0.5">
                    L$ {totalRevenueLRD.toLocaleString()}
                  </div>
                </div>

                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl">
                  <div className="text-[11px] text-stone-500 font-bold uppercase tracking-wider">
                    Today's Sales
                  </div>
                  <div className="text-xl font-extrabold text-emerald-700 mt-0.5">
                    ${todayRevenueUSD.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-stone-500 font-mono mt-0.5">
                    L$ {Math.round(todayRevenueUSD * settings.exchangeRate).toLocaleString()}
                  </div>
                </div>

                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl">
                  <div className="text-[11px] text-stone-500 font-bold uppercase tracking-wider">
                    Average Order Value
                  </div>
                  <div className="text-xl font-extrabold text-blue-700 mt-0.5">
                    ${avgOrderUSD.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-stone-500 font-mono mt-0.5">
                    L$ {Math.round(avgOrderUSD * settings.exchangeRate).toLocaleString()} / ticket
                  </div>
                </div>
              </div>

              {/* Filters & Search Toolbar */}
              <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by receipt #, customer, cashier, or item..."
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-900 focus:bg-white"
                  />
                </div>

                {/* Payment filter pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  <span className="text-[11px] text-stone-500 font-bold shrink-0">
                    Payment:
                  </span>
                  {[
                    { id: 'ALL', label: 'All' },
                    { id: 'CASH_USD', label: 'Cash USD' },
                    { id: 'CASH_LRD', label: 'Cash LRD' },
                    { id: 'SPLIT_CASH', label: 'Split Cash' },
                    { id: 'MOBILE_MONEY', label: 'Mobile Money' },
                    { id: 'CREDIT', label: 'Customer Credit' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPaymentFilter(p.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition ${
                        paymentFilter === p.id
                          ? 'bg-stone-900 text-white'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Orders Table */}
            <div className="flex-1 overflow-auto p-4">
              <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-stone-50 text-stone-500 border-b border-stone-200">
                    <tr>
                      <th className="p-3 font-bold">Receipt #</th>
                      <th className="p-3 font-bold">Date & Time</th>
                      <th className="p-3 font-bold">Customer</th>
                      <th className="p-3 font-bold">Cashier</th>
                      <th className="p-3 font-bold">Payment Method</th>
                      <th className="p-3 font-bold">Items Summary</th>
                      <th className="p-3 font-bold text-right">Total (USD)</th>
                      <th className="p-3 font-bold text-right">Total (LRD)</th>
                      <th className="p-3 font-bold text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredReceipts.map((r) => {
                      const itemsPreview = r.items
                        .map((it) => `${it.quantity}× ${it.name}`)
                        .join(', ');

                      return (
                        <tr key={r.id} className="hover:bg-stone-50/80 transition">
                          <td className="p-3 font-mono font-bold text-stone-900">
                            #{r.receiptNumber}
                            {r.reprintCount > 0 && (
                              <span className="ml-1.5 text-[9px] text-amber-700 bg-amber-50 border border-amber-200 px-1 py-0.2 rounded font-sans font-bold">
                                Reprint ×{r.reprintCount}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-stone-600 font-mono text-[11px]">
                            {new Date(r.date).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="p-3 font-semibold text-stone-900">
                            {r.customerName || 'Walk-in'}
                          </td>
                          <td className="p-3 text-stone-600">{r.cashierName}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                r.paymentMethod === 'CREDIT'
                                  ? 'bg-rose-50 border-rose-200 text-rose-700'
                                  : r.paymentMethod === 'MOBILE_MONEY'
                                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                                  : r.paymentMethod === 'CASH_USD'
                                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                                  : r.paymentMethod === 'CASH_LRD'
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                  : 'bg-stone-100 border-stone-200 text-stone-700'
                              }`}
                            >
                              {r.paymentMethod.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="p-3 text-stone-500 max-w-xs truncate text-[11px]">
                            {itemsPreview || 'General purchase'}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-stone-900">
                            ${r.totalUSD.toFixed(2)}
                          </td>
                          <td className="p-3 text-right font-mono font-semibold text-stone-600">
                            L$ {r.totalLRD.toLocaleString()}
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleOpenReceipt(r)}
                              className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 border border-stone-200 text-stone-800 rounded-lg text-[11px] font-bold transition inline-flex items-center gap-1 shadow-2xs"
                            >
                              <Printer className="w-3 h-3 text-stone-600" />
                              <span>View</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {filteredReceipts.length === 0 && (
                  <div className="text-center py-12 text-stone-400 text-xs">
                    <Receipt className="w-8 h-8 mx-auto mb-2 text-stone-300" />
                    No orders or receipts found matching your search.
                  </div>
                )}
              </div>
            </div>

            <ReceiptModal
              isOpen={receiptModalOpen}
              onClose={() => {
                setReceiptModalOpen(false);
                setReceipts(OfflineStorageManager.getReceipts());
              }}
              receipt={selectedReceipt}
              settings={settings}
            />
          </div>
        )}

        {subTab === 'drawer' && (
          <CashDrawerShiftView
            settings={settings}
            activeUser={activeUser}
            onRefresh={onRefresh}
          />
        )}

        {subTab === 'credit' && (
          <CustomersView
            settings={settings}
            activeUser={activeUser}
            onRefresh={onRefresh}
          />
        )}
      </div>
    </div>
  );
};
