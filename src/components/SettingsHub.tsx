import React, { useState } from 'react';
import {
  Store,
  DollarSign,
  Users,
  Layers,
  Printer,
  ShieldAlert,
  Smartphone,
  Cloud,
  Shield,
  Moon,
  Sun,
  Percent,
} from 'lucide-react';
import { BusinessSettings, User } from '../types';
import { OfflineStorageManager } from '../utils/storage';
import { ProfileSettingsView } from './ProfileSettingsView';
import { ExchangeSettingsView } from './ExchangeSettingsView';
import { UserManagementView } from './UserManagementView';
import { CategoriesSettingsView } from './CategoriesSettingsView';
import { PrintersSettingsView } from './PrintersSettingsView';
import { TaxSettingsView } from './TaxSettingsView';
import { AuditLogsView } from './AuditLogsView';
import { MobileApkGuideView } from './MobileApkGuideView';
import { CloudSyncView } from './CloudSyncView';
import { LicenseSettingsView } from './LicenseSettingsView';

export type SettingsSubTab =
  | 'profile'
  | 'exchange'
  | 'tax'
  | 'users'
  | 'categories'
  | 'printers'
  | 'sync'
  | 'audit'
  | 'mobile'
  | 'license';

interface SettingsHubProps {
  settings: BusinessSettings;
  activeUser: User;
  onUpdateSettings: (newSettings: BusinessSettings) => void;
  onRefresh: () => void;
  activeSubTab?: SettingsSubTab;
  onSubTabChange?: (tab: SettingsSubTab) => void;
}

export const SettingsHub: React.FC<SettingsHubProps> = ({
  settings,
  activeUser,
  onUpdateSettings,
  onRefresh,
  activeSubTab,
  onSubTabChange,
}) => {
  const [internalSubTab, setInternalSubTab] = useState<SettingsSubTab>(activeSubTab || 'profile');

  React.useEffect(() => {
    if (activeSubTab) {
      setInternalSubTab(activeSubTab);
    }
  }, [activeSubTab]);

  const subTab = activeSubTab || internalSubTab;
  const setSubTab = (tab: SettingsSubTab) => {
    setInternalSubTab(tab);
    onSubTabChange?.(tab);
  };

  const navItems: { id: SettingsSubTab; label: string; icon: any; ownerOnly?: boolean; badge?: string }[] = [
    { id: 'profile', label: 'Store Profile', icon: Store },
    { id: 'exchange', label: 'Exchange Rate', icon: DollarSign, badge: 'Daily' },
    { id: 'tax', label: 'Tax & VAT', icon: Percent },
    { id: 'users', label: 'Staff & Roles', icon: Users },
    { id: 'categories', label: 'Categories & Units', icon: Layers },
    { id: 'printers', label: 'Printers & Receipts', icon: Printer },
    { id: 'sync', label: 'Backup & Cloud', icon: Cloud },
    { id: 'audit', label: 'Audit Trail', icon: ShieldAlert, ownerOnly: true },
    { id: 'mobile', label: 'Phone & APK', icon: Smartphone },
    {
      id: 'license',
      label: 'License & Trial',
      icon: Shield,
      badge: activeUser.role === 'superadmin' || activeUser.id === 'usr-super' ? 'Reset' : undefined,
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-y-auto bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 pb-20 md:pb-6">
      {/* Sub-nav Segmented Control Bar with Horizontal Scroll */}
      <div className="px-3 sm:px-4 py-2.5 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-2 shrink-0 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 bg-stone-100 dark:bg-stone-850 p-1 rounded-xl border border-stone-200 dark:border-stone-700 shrink-0">
          {navItems.map((item) => {
            if (item.ownerOnly && activeUser.role !== 'owner') return null;
            const Icon = item.icon;
            const isActive = subTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSubTab(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                  isActive
                    ? 'bg-white dark:bg-stone-900 text-stone-950 dark:text-stone-100 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-stone-900 dark:text-stone-100' : 'text-stone-500 dark:text-stone-400'}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="text-[9px] bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 px-1 py-0.2 rounded font-black">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              const next = !settings.darkMode;
              const updated = OfflineStorageManager.setDarkMode(next);
              onUpdateSettings(updated);
              onRefresh();
              window.dispatchEvent(
                new CustomEvent('app-storage-updated', { detail: { source: 'theme-toggle', darkMode: next } })
              );
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-750 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 transition shadow-2xs"
            title="Toggle Light / Dark Mode"
          >
            {settings.darkMode ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-bold">Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-purple-500" />
                <span className="font-bold">Dark Mode</span>
              </>
            )}
          </button>

          <div className="text-[11px] text-stone-500 dark:text-stone-400 font-mono hidden lg:block">
            Addition Business Centre • Settings
          </div>
        </div>
      </div>

      {/* Main Subview Container */}
      <div className="flex-1 min-h-0 p-3 sm:p-4">
        {subTab === 'profile' && (
          <ProfileSettingsView
            settings={settings}
            onUpdateSettings={onUpdateSettings}
            onRefresh={onRefresh}
          />
        )}

        {subTab === 'exchange' && (
          <ExchangeSettingsView
            settings={settings}
            onUpdateSettings={onUpdateSettings}
            onRefresh={onRefresh}
          />
        )}

        {subTab === 'tax' && (
          <TaxSettingsView
            settings={settings}
            onUpdateSettings={onUpdateSettings}
            onRefresh={onRefresh}
          />
        )}

        {subTab === 'users' && (
          <div className="max-w-5xl mx-auto w-full">
            <UserManagementView
              activeUser={activeUser}
              onRefresh={onRefresh}
            />
          </div>
        )}

        {subTab === 'categories' && (
          <div className="max-w-5xl mx-auto w-full">
            <CategoriesSettingsView onRefresh={onRefresh} />
          </div>
        )}

        {subTab === 'printers' && (
          <PrintersSettingsView
            settings={settings}
            onUpdateSettings={onUpdateSettings}
            onRefresh={onRefresh}
          />
        )}

        {subTab === 'sync' && (
          <div className="p-2 max-w-4xl mx-auto w-full">
            <CloudSyncView onDataImported={onRefresh} />
          </div>
        )}

        {subTab === 'audit' && <AuditLogsView />}

        {subTab === 'mobile' && <MobileApkGuideView />}

        {subTab === 'license' && (
          <LicenseSettingsView
            settings={settings}
            activeUser={activeUser}
            onUpdateSettings={onUpdateSettings}
            onRefresh={onRefresh}
          />
        )}
      </div>
    </div>
  );
};
