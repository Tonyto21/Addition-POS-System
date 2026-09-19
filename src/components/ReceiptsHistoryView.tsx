import React, { useState } from 'react';
import {
  FileText,
  Search,
  Printer,
  Share2,
  Calendar,
  Filter,
  DollarSign,
  User,
} from 'lucide-react';
import { BusinessSettings, ReceiptSnapshot } from '../types';
import { OfflineStorageManager } from '../utils/storage';
import { ReceiptModal } from './ReceiptModal';

interface ReceiptsHistoryViewProps {
  settings: BusinessSettings;
}

export const ReceiptsHistoryView: React.FC<ReceiptsHistoryViewProps> = ({ settings }) => {
  const [receipts, setReceipts] = useState<ReceiptSnapshot[]>(() =>
    OfflineStorageManager.getReceipts()
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptSnapshot | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);

  const handleOpenReceipt = (r: ReceiptSnapshot) => {
    setSelectedReceipt(r);
    setReceiptModalOpen(true);
  };

  const filteredReceipts = receipts.filter((r) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      r.receiptNumber.toLowerCase().includes(q) ||
      r.cashierName.toLowerCase().includes(q) ||
      (r.customerName && r.customerName.toLowerCase().includes(q)) ||
      r.paymentMethod.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            Receipts & Historical Sales Ledger
          </h2>
          <p className="text-xs text-slate-400">
            Immutable snapshot of every completed transaction. Never recalculated using current product prices.
          </p>
        </div>

        <div className="text-xs font-mono text-slate-400">
          {receipts.length} Receipts Generated
        </div>
      </div>

      {/* Search filter */}
      <div className="p-3 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by receipt #, cashier, or customer..."
            className="w-full bg-slate-950 border border-slate-700 rounded-md pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-850 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3">Receipt #</th>
                <th className="p-3">Date & Time</th>
                <th className="p-3">Cashier</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Payment Mode</th>
                <th className="p-3 text-right">Items</th>
                <th className="p-3 text-right">Total (USD)</th>
                <th className="p-3 text-right">Total (LRD)</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredReceipts.map((r) => (
                <tr key={r.id} className="hover:bg-slate-850/40">
                  <td className="p-3 font-mono font-bold text-emerald-400">
                    #{r.receiptNumber}
                    {r.reprintCount > 0 && (
                      <span className="ml-1.5 text-[9px] text-amber-400 bg-amber-950/60 px-1 py-0.2 rounded font-sans">
                        Reprinted ×{r.reprintCount}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-slate-300 font-mono">
                    {new Date(r.date).toLocaleString()}
                  </td>
                  <td className="p-3 text-white">{r.cashierName}</td>
                  <td className="p-3 text-slate-400">{r.customerName || 'Walk-in'}</td>
                  <td className="p-3 text-slate-300">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 border border-slate-700 font-medium">
                      {r.paymentMethod}
                    </span>
                  </td>
                  <td className="p-3 text-right font-mono text-slate-400">{r.items.length}</td>
                  <td className="p-3 text-right font-mono font-bold text-white">
                    ${r.totalUSD.toFixed(2)}
                  </td>
                  <td className="p-3 text-right font-mono text-amber-300">
                    L$ {r.totalLRD.toFixed(0)}
                  </td>
                  <td className="p-3 text-right space-x-1">
                    <button
                      onClick={() => handleOpenReceipt(r)}
                      className="px-2.5 py-1 bg-emerald-600/80 hover:bg-emerald-600 text-white rounded text-[11px] font-medium transition inline-flex items-center gap-1"
                    >
                      <Printer className="w-3 h-3" /> View & Print
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredReceipts.length === 0 && (
            <div className="text-center py-10 text-slate-500 text-xs">
              No historical receipts found matching your query.
            </div>
          )}
        </div>
      </div>

      <ReceiptModal
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        receipt={selectedReceipt}
        settings={settings}
      />
    </div>
  );
};
