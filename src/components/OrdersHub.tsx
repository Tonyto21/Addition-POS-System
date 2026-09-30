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
  FileText,
  Download,
  Check,
} from 'lucide-react';
import { BusinessSettings, ReceiptSnapshot, Sale, User } from '../types';
import { OfflineStorageManager } from '../utils/storage';
import { downloadReceiptPdf } from '../utils/pdfReceipt';
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
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  const handleOpenReceipt = (r: ReceiptSnapshot) => {
    setSelectedReceipt(r);
    setReceiptModalOpen(true);
  };

  const handleQuickDownloadPdf = (e: React.MouseEvent, r: ReceiptSnapshot) => {
    e.stopPropagation();
    try {
      downloadReceiptPdf(r, settings);
      OfflineStorageManager.incrementReprintCount(r.receiptNumber);
      setDownloadNotice(`Downloaded Receipt #${r.receiptNumber} PDF!`);
      setTimeout(() => setDownloadNotice(null), 3000);
    } catch (err: any) {
      setDownloadNotice(`PDF Error: ${err.message}`);
      setTimeout(() => setDownloadNotice(null), 3500);
    }
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

            {/* Download Toast Notification */}
            {downloadNotice && (
              <div className="mx-4 mt-3 px-4 py-2.5 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-xs font-bold flex items-center justify-between shadow-xs animate-fadeIn shrink-0">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>{downloadNotice}</span>
                </div>
                <button
                  onClick={() => setDownloadNotice(null)}
                  className="text-blue-500 hover:text-blue-900 text-xs font-extrabold"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Orders Listing: Mobile Cards + Desktop Table */}
            <div className="flex-1 overflow-auto p-3 sm:p-4">
              {/* MOBILE CARDS VIEW (Clean, touch-friendly, no horizontal scrolling) */}
              <div className="block sm:hidden space-y-3">
                {filteredReceipts.map((r) => {
                  const itemsPreview = r.items
                    .map((it) => `${it.quantity}× ${it.name}`)
                    .join(', ');

                  return (
                    <div
                      key={r.id}
                      className="bg-white border border-stone-200 rounded-2xl p-3.5 shadow-2xs space-y-2.5 hover:border-stone-300 transition"
                    >
                      {/* Top row: Clickable Receipt Number + Payment Mode */}
                      <div className="flex items-center justify-between gap-2">
                        <button
                          onClick={() => handleOpenReceipt(r)}
                          className="flex items-center gap-1.5 font-mono font-black text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg transition active:scale-[0.98]"
                          title="Click to view full PDF receipt"
                        >
                          <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>#{r.receiptNumber}</span>
                          <span className="text-[10px] font-sans font-extrabold text-blue-600 underline ml-0.5">
                            (PDF)
                          </span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          {r.reprintCount > 0 && (
                            <span className="text-[9px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-bold">
                              Reprint ×{r.reprintCount}
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${
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
                        </div>
                      </div>

                      {/* Items & Metadata */}
                      <div className="text-xs space-y-1">
                        <div className="text-stone-700 font-medium line-clamp-2 text-[11px] bg-stone-50 p-2 rounded-xl border border-stone-100">
                          {itemsPreview || 'General retail transaction'}
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-stone-500 pt-0.5">
                          <span>
                            {new Date(r.date).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <span>
                            Customer: <strong className="text-stone-800">{r.customerName || 'Walk-in'}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Dual-Currency Totals */}
                      <div className="pt-1.5 border-t border-stone-100 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">
                            Order Total
                          </div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-base font-black text-stone-900 font-mono">
                              ${r.totalUSD.toFixed(2)}
                            </span>
                            <span className="text-xs font-bold text-emerald-700 font-mono">
                              L$ {r.totalLRD.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {/* Direct Mobile PDF Action Buttons */}
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => handleQuickDownloadPdf(e, r)}
                            className="p-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl transition border border-stone-200 shadow-2xs"
                            title="Directly download receipt PDF"
                          >
                            <Download className="w-4 h-4 text-stone-700" />
                          </button>
                          <button
                            onClick={() => handleOpenReceipt(r)}
                            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 active:scale-[0.98]"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>View PDF</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* DESKTOP TABLE VIEW (Full columns with clickable receipt links) */}
              <div className="hidden sm:block bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-2xs">
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
                      <th className="p-3 font-bold text-right">PDF Receipt</th>
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
                            <button
                              onClick={() => handleOpenReceipt(r)}
                              className="font-mono font-black text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-1 transition"
                              title="Click to view and download PDF receipt"
                            >
                              <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span>#{r.receiptNumber}</span>
                            </button>
                            {r.reprintCount > 0 && (
                              <span className="mt-1 inline-block text-[9px] text-amber-700 bg-amber-50 border border-amber-200 px-1 py-0.2 rounded font-sans font-bold">
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
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={(e) => handleQuickDownloadPdf(e, r)}
                                className="p-1.5 bg-stone-100 hover:bg-stone-200 border border-stone-200 text-stone-700 rounded-lg text-[11px] font-bold transition shadow-2xs"
                                title="Download PDF directly"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleOpenReceipt(r)}
                                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 rounded-lg text-[11px] font-bold transition inline-flex items-center gap-1.5 shadow-2xs"
                                title="View full PDF & thermal receipt"
                              >
                                <FileText className="w-3.5 h-3.5 text-blue-600" />
                                <span>View PDF</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {filteredReceipts.length === 0 && (
                <div className="text-center py-12 text-stone-400 text-xs bg-white rounded-2xl border border-stone-200">
                  <Receipt className="w-8 h-8 mx-auto mb-2 text-stone-300" />
                  No orders or receipts found matching your search.
                </div>
              )}
            </div>

            <ReceiptModal
              isOpen={receiptModalOpen}
              onClose={() => {
                setReceiptModalOpen(false);
                setReceipts(OfflineStorageManager.getReceipts());
              }}
              onUpdateSettings={(newSettings) => {
                onRefresh();
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
