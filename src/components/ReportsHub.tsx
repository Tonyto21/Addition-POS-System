import React, { useState } from 'react';
import {
  TrendingUp,
  BarChart3,
  DollarSign,
  Download,
  Calendar,
  Layers,
} from 'lucide-react';
import { BusinessSettings, User } from '../types';
import { ReportsDashboardView } from './ReportsDashboardView';

interface ReportsHubProps {
  settings: BusinessSettings;
  activeUser: User;
  onRefresh?: () => void;
}

export const ReportsHub: React.FC<ReportsHubProps> = ({
  settings,
  activeUser,
  onRefresh,
}) => {
  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-y-auto bg-stone-100 text-stone-900 pb-20 md:pb-6">
      {/* Top Header */}
      <div className="px-4 py-3 bg-white border-b border-stone-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-stone-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            <span>Sales, Revenue & Profit Reports</span>
          </h2>
          <p className="text-xs text-stone-500">
            Daily summaries, dual-currency revenue breakdown (LRD & USD), margins, and FIFO cost metrics
          </p>
        </div>

        <div className="text-[11px] text-stone-500 font-mono bg-stone-100 px-2.5 py-1 rounded-lg border border-stone-200">
          Financial Analytics
        </div>
      </div>

      {/* Main Reports Dashboard */}
      <div className="flex-1 min-h-0">
        <ReportsDashboardView settings={settings} activeUser={activeUser} />
      </div>
    </div>
  );
};
