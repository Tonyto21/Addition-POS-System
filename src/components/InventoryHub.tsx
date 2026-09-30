import React, { useState } from 'react';
import {
  Package,
  FileSpreadsheet,
  Layers,
  Building2,
  Boxes,
} from 'lucide-react';
import { BusinessSettings, User } from '../types';
import { InventoryView } from './InventoryView';
import { StockIntakeView } from './StockIntakeView';
import { CategoriesSettingsView } from './CategoriesSettingsView';
import { DistributorsSettingsView } from './DistributorsSettingsView';
import { PackageDefinitionsSettingsView } from './PackageDefinitionsSettingsView';

interface InventoryHubProps {
  settings: BusinessSettings;
  activeUser: User;
  onRefresh: () => void;
}

export const InventoryHub: React.FC<InventoryHubProps> = ({
  settings,
  activeUser,
  onRefresh,
}) => {
  const [subTab, setSubTab] = useState<'catalog' | 'intake' | 'distributors' | 'packages' | 'categories'>('catalog');
  const [selectedDistributorForIntake, setSelectedDistributorForIntake] = useState<string | undefined>(undefined);

  const handleNavigateToIntakeWithSupplier = (supplierId?: string) => {
    setSelectedDistributorForIntake(supplierId);
    setSubTab('intake');
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-stone-100 text-stone-900">
      {/* Sub-nav Bar */}
      <div className="px-3 sm:px-4 py-2.5 bg-white border-b border-stone-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl border border-stone-200 overflow-x-auto max-w-full">
          <button
            onClick={() => setSubTab('catalog')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              subTab === 'catalog'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Package className="w-3.5 h-3.5 text-blue-600" />
            <span>Item Catalog & Stock</span>
          </button>

          <button
            onClick={() => {
              setSelectedDistributorForIntake(undefined);
              setSubTab('intake');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              subTab === 'intake'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Receive Stock (Intake & Batches)</span>
          </button>

          <button
            onClick={() => setSubTab('distributors')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              subTab === 'distributors'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-amber-600" />
            <span>Manage Distributors</span>
          </button>

          <button
            onClick={() => setSubTab('packages')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              subTab === 'packages'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Boxes className="w-3.5 h-3.5 text-amber-600" />
            <span>Package Definitions</span>
          </button>

          <button
            onClick={() => setSubTab('categories')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              subTab === 'categories'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-purple-600" />
            <span>Manage Categories</span>
          </button>
        </div>

        <div className="text-[11px] text-stone-500 font-mono hidden xl:block">
          Addition Business Centre • Inventory
        </div>
      </div>

      {/* Subview Container */}
      <div className="flex-1 overflow-hidden">
        {subTab === 'catalog' && (
          <InventoryView
            settings={settings}
            activeUser={activeUser}
            onNavigateToIntake={() => setSubTab('intake')}
            onNavigateToDistributors={() => setSubTab('distributors')}
            onNavigateToPackages={() => setSubTab('packages')}
            onRefresh={onRefresh}
          />
        )}

        {subTab === 'intake' && (
          <StockIntakeView
            settings={settings}
            activeUser={activeUser}
            initialSupplierId={selectedDistributorForIntake}
            onFinished={() => {
              if (onRefresh) onRefresh();
              setSubTab('catalog');
            }}
            onRefresh={onRefresh}
          />
        )}

        {subTab === 'distributors' && (
          <div className="p-3 sm:p-5 overflow-y-auto h-full max-w-6xl mx-auto w-full pb-20">
            <DistributorsSettingsView
              settings={settings}
              onNavigateToIntake={handleNavigateToIntakeWithSupplier}
              onRefresh={onRefresh}
            />
          </div>
        )}

        {subTab === 'packages' && (
          <div className="p-3 sm:p-5 overflow-y-auto h-full max-w-5xl mx-auto w-full pb-20">
            <PackageDefinitionsSettingsView onRefresh={onRefresh} />
          </div>
        )}

        {subTab === 'categories' && (
          <div className="p-3 sm:p-5 overflow-y-auto h-full max-w-5xl mx-auto w-full pb-20">
            <CategoriesSettingsView onRefresh={onRefresh} />
          </div>
        )}
      </div>
    </div>
  );
};
