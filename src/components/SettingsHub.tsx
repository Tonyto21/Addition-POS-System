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
} from 'lucide-react';
import { BusinessSettings, User } from '../types';
import { ProfileSettingsView } from './ProfileSettingsView';
import { ExchangeSettingsView } from './ExchangeSettingsView';
import { UserManagementView } from './UserManagementView';
import { CategoriesSettingsView } from './CategoriesSettingsView';
import { PrintersSettingsView } from './PrintersSettingsView';
import { AuditLogsView } from './AuditLogsView';
import { MobileApkGuideView } from './MobileApkGuideView';
import { CloudSyncView } from './CloudSyncView';

interface SettingsHubProps {
  settings: BusinessSettings;
  activeUser: User;
  onUpdateSettings: (newSettings: BusinessSettings) => void;
  onRefresh: () => void;
}

type SettingsSubTab =
  | 'profile'
  | 'exchange'
  | 'users'
  | 'categories'
  | 'printers'
  | 'sync'
  | 'audit'
  | 'mobile';

export const SettingsHub: React.FC<SettingsHubProps> = ({
  settings,
  activeUser,
  onUpdateSettings,
  onRefresh,
}) => {
  const [subTab, setSubTab] = useState<SettingsSubTab>('profile');

  const navItems: { id: SettingsSubTab; label: string; icon: any; ownerOnly?: boolean; badge?: string }[] = [
    { id: 'profile', label: 'Store Profile', icon: Store },
    { id: 'exchange', label: 'Exchange Rate', icon: DollarSign, badge: 'Daily' },
    { id: 'users', label: 'Staff & Roles', icon: Users },
    { id: 'categories', label: 'Categories & Units', icon: Layers },
    { id: 'printers', label: 'Printers & Receipts', icon: Printer },
    { id: 'sync', label: 'Backup & Cloud', icon: Cloud },
    { id: 'audit', label: 'Audit Trail', icon: ShieldAlert, ownerOnly: true },
    { id: 'mobile', label: 'Phone & APK', icon: Smartphone },
  ];

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-y-auto bg-stone-100 text-stone-900 pb-20 md:pb-6">
      {/* Sub-nav Segmented Control Bar with Horizontal Scroll */}
      <div className="px-3 sm:px-4 py-2.5 bg-white border-b border-stone-200 flex items-center justify-between gap-2 shrink-0 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl border border-stone-200 shrink-0">
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
                    ? 'bg-white text-stone-950 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-stone-900' : 'text-stone-500'}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="text-[9px] bg-amber-200 text-amber-900 px-1 py-0.2 rounded font-black">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="text-[11px] text-stone-500 font-mono hidden lg:block shrink-0">
          Addition Business Centre • Settings
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
      </div>
    </div>
  );
};
