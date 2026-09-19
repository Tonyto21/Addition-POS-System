import React, { useState } from 'react';
import {
  Users,
  DollarSign,
  FileText,
  Clock,
  ArrowRightLeft,
  Calendar,
  AlertCircle,
  TrendingDown,
  CheckCircle2,
} from 'lucide-react';
import { BusinessSettings, User } from '../types';
import { CustomersView } from './CustomersView';
import { CashDrawerShiftView } from './CashDrawerShiftView';
import { ReceiptsHistoryView } from './ReceiptsHistoryView';

interface CustomersAndShiftHubProps {
  settings: BusinessSettings;
  activeUser: User;
  onRefresh: () => void;
}

export const CustomersAndShiftHub: React.FC<CustomersAndShiftHubProps> = ({
  settings,
  activeUser,
  onRefresh,
}) => {
  const [subTab, setSubTab] = useState<'customers' | 'drawer' | 'receipts'>('customers');

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-stone-100 text-stone-900">
      {/* Sub-navigation Segmented Control Bar */}
      <div className="px-4 py-2.5 bg-white border-b border-stone-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl border border-stone-200">
          <button
            onClick={() => setSubTab('customers')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              subTab === 'customers'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-blue-600" />
            <span>Customers & Credit Debt</span>
          </button>

          <button
            onClick={() => setSubTab('drawer')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              subTab === 'drawer'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
            <span>Cash Drawer Shifts</span>
          </button>

          <button
            onClick={() => setSubTab('receipts')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              subTab === 'receipts'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-purple-600" />
            <span>Receipts & History</span>
          </button>
        </div>

        <div className="text-[11px] text-stone-500 font-mono hidden sm:block">
          Dual Currency Shift Reconciliation
        </div>
      </div>

      {/* Main Subview Container */}
      <div className="flex-1 overflow-hidden">
        {subTab === 'customers' && (
          <CustomersView
            settings={settings}
            activeUser={activeUser}
            onRefresh={onRefresh}
          />
        )}

        {subTab === 'drawer' && (
          <CashDrawerShiftView
            settings={settings}
            activeUser={activeUser}
            onRefresh={onRefresh}
          />
        )}

        {subTab === 'receipts' && <ReceiptsHistoryView settings={settings} />}
      </div>
    </div>
  );
};
