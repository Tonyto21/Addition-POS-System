import React, { useEffect, useState } from 'react';
import {
  Store,
  ShoppingCart,
  Package,
  Users,
  TrendingUp,
  Wifi,
  WifiOff,
  RefreshCw,
  ChevronRight,
  Menu,
  X,
  UserCheck,
  Shield,
  KeyRound,
  LogOut,
  Smartphone,
  Monitor,
  Receipt,
  Settings,
  Sun,
  AlertCircle,
} from 'lucide-react';
import { AppModuleId, BusinessSettings, User } from './types';
import { OfflineStorageManager } from './utils/storage';
import { DeviceHelper } from './utils/device';
import { CloudSyncManager, SyncStatus } from './utils/cloudSync';
import { PosView } from './components/PosView';
import { InventoryHub } from './components/InventoryHub';
import { OrdersHub } from './components/OrdersHub';
import { ReportsHub } from './components/ReportsHub';
import { SettingsHub } from './components/SettingsHub';
import { LoginModal } from './components/LoginModal';
import { ApkExportModal } from './components/ApkExportModal';
import { CloudSyncModal } from './components/CloudSyncModal';
import { DailyExchangeRateModal } from './components/DailyExchangeRateModal';

export default function App() {
  const [settings, setSettings] = useState<BusinessSettings>(() =>
    OfflineStorageManager.getSettings()
  );
  const [activeUser, setActiveUser] = useState<User>(() =>
    OfflineStorageManager.getActiveUser()
  );
  const [users, setUsers] = useState<User[]>(() => OfflineStorageManager.getUsers());

  // Daily Morning Exchange Rate Notification Check
  const [rateVerifiedToday, setRateVerifiedToday] = useState<boolean>(() =>
    OfflineStorageManager.isExchangeRateVerifiedToday()
  );
  const [dailyRateModalOpen, setDailyRateModalOpen] = useState<boolean>(() =>
    !OfflineStorageManager.isExchangeRateVerifiedToday()
  );

  // 5 Core SME Primary Tabs:
  // 1. pos: Point of Sale & Cashier Register (Walk-in & Barcode)
  // 2. inventory: Catalog, Stock Intake & FIFO Movements
  // 3. orders: Completed Orders, Receipts, Cash Drawer Shifts & Credit Debt Ledger
  // 4. reports: Sales Analytics, Revenue, FIFO Margins & Net Profits
  // 5. settings: Store Profile, Exchange Rate, Staff Passwords/PINs, Audit & Phone APK
  const [activeTab, setActiveTab] = useState<'pos' | 'inventory' | 'orders' | 'reports' | 'settings'>('pos');

  // Network & Sync status
  const [isOnline, setIsOnline] = useState<boolean>(() => OfflineStorageManager.isOnline());
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Switch User / Staff Login Modal
  const [loginModalOpen, setLoginModalOpen] = useState<boolean>(false);
  // Android APK / Phone Install Modal
  const [apkModalOpen, setApkModalOpen] = useState<boolean>(false);
  // Cloud Sync & Mobile/Web Transfer Modal
  const [cloudSyncModalOpen, setCloudSyncModalOpen] = useState<boolean>(false);
  // Active environment (Web vs Mobile APK mode)
  const [appEnv, setAppEnv] = useState<'web' | 'mobile'>(() => DeviceHelper.getEnvironment());

  const handleToggleEnv = () => {
    const next = appEnv === 'web' ? 'mobile' : 'web';
    DeviceHelper.setEnvironmentOverride(next);
    setAppEnv(next);
  };

  useEffect(() => {
    // Initialize Cloud Sync (immediate initial sync + real-time polling)
    CloudSyncManager.init();

    const unsubSync = CloudSyncManager.subscribe((status, time) => {
      setCloudSyncStatus(status);
      setLastSyncTime(time);
      setIsSyncing(status === 'syncing');
      updatePendingSync();
    });

    updatePendingSync();

    const handleOnline = () => {
      setIsOnline(true);
      OfflineStorageManager.setOnline(true);
      CloudSyncManager.syncBidirectional();
    };

    const handleOffline = () => {
      setIsOnline(false);
      OfflineStorageManager.setOnline(false);
    };

    const handleStorageUpdate = () => {
      setSettings(OfflineStorageManager.getSettings());
      setUsers(OfflineStorageManager.getUsers());
      setRateVerifiedToday(OfflineStorageManager.isExchangeRateVerifiedToday());
      updatePendingSync();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('app-storage-updated', handleStorageUpdate);

    return () => {
      unsubSync();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('app-storage-updated', handleStorageUpdate);
    };
  }, []);

  const updatePendingSync = () => {
    const queue = OfflineStorageManager.getSyncQueue();
    setPendingSyncCount(queue.filter((q) => q.status === 'PENDING').length);
  };

  const triggerSync = async () => {
    setIsSyncing(true);
    try {
      await CloudSyncManager.syncBidirectional();
    } finally {
      setIsSyncing(false);
      updatePendingSync();
    }
  };

  const handleSelectUser = (user: User) => {
    OfflineStorageManager.setActiveUser(user);
    setActiveUser(user);
    setUsers(OfflineStorageManager.getUsers());
  };

  // 5 Clean, Clear Categories for Liberian SMEs
  const mainNavItems = [
    {
      id: 'pos' as const,
      label: 'POS Register',
      sublabel: 'Walk-in & Barcode',
      icon: ShoppingCart,
      badge: 'Daily',
      color: 'text-blue-600',
    },
    {
      id: 'inventory' as const,
      label: 'Inventory',
      sublabel: 'Items, levels & intake batches',
      icon: Package,
      badge: null,
      color: 'text-amber-600',
    },
    {
      id: 'orders' as const,
      label: 'Orders',
      sublabel: 'Receipts, shifts & credit',
      icon: Receipt,
      badge: 'Sales',
      color: 'text-emerald-600',
    },
    {
      id: 'reports' as const,
      label: 'Reports',
      sublabel: 'Revenue, profits & margins',
      icon: TrendingUp,
      badge: activeUser.role === 'cashier' ? 'Limited' : 'Financials',
      color: 'text-purple-600',
    },
    {
      id: 'settings' as const,
      label: 'Settings',
      sublabel: 'Rates, users & PINs, APK',
      icon: Settings,
      badge: activeUser.role === 'owner' ? 'Admin' : null,
      color: 'text-stone-700',
    },
  ];

  // Granular Access Control: Filter modules based on assigned responsibilities
  const userAllowedModules: AppModuleId[] =
    activeUser.role === 'owner'
      ? ['pos', 'inventory', 'orders', 'reports', 'settings']
      : activeUser.allowedModules && activeUser.allowedModules.length > 0
      ? activeUser.allowedModules
      : activeUser.role === 'manager'
      ? ['pos', 'inventory', 'orders', 'reports']
      : ['pos', 'orders'];

  const visibleNavItems = mainNavItems.filter((item) =>
    activeUser.role === 'owner' || userAllowedModules.includes(item.id)
  );

  useEffect(() => {
    if (activeUser.role !== 'owner' && !userAllowedModules.includes(activeTab)) {
      const fallback = visibleNavItems[0]?.id || 'pos';
      setActiveTab(fallback);
    }
  }, [activeUser, activeTab, userAllowedModules]);

  const roleBadgeColors = {
    owner: 'bg-purple-100 text-purple-800 border-purple-200',
    manager: 'bg-blue-100 text-blue-800 border-blue-200',
    cashier: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-stone-100 text-stone-900 font-sans overflow-hidden select-none">
      {/* Universal Square Top Header */}
      <header className="h-14 bg-white border-b border-stone-200 px-3 sm:px-4 flex items-center justify-between shrink-0 z-30 shadow-2xs">
        <div className="flex items-center gap-3">
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-100"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Business Brand Identity */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-stone-900 flex items-center justify-center font-bold text-white shadow-2xs">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-stone-900 tracking-tight leading-none">
                {settings.name}
              </h1>
              <div className="text-[11px] text-stone-500 mt-0.5 flex items-center gap-1.5 font-mono">
                <span className="font-semibold text-stone-700">1 USD = {settings.exchangeRate} LRD</span>
                <span className="text-stone-300">•</span>
                <span className="hidden sm:inline">Liberia SME Square POS</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Section: Sync Status & Interactive Login Switcher */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Offline / Online / Cloud Sync Pill */}
          <div className="flex items-center bg-stone-100 p-0.5 rounded-full border border-stone-200">
            <button
              type="button"
              onClick={triggerSync}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition shadow-2xs ${
                cloudSyncStatus === 'synced'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                  : cloudSyncStatus === 'syncing'
                  ? 'bg-blue-50 border border-blue-200 text-blue-800 hover:bg-blue-100'
                  : isOnline
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                  : 'bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100'
              }`}
              title="Click to trigger cloud synchronization now"
            >
              {isSyncing || cloudSyncStatus === 'syncing' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
              ) : cloudSyncStatus === 'synced' ? (
                <Wifi className="w-3.5 h-3.5 text-emerald-600" />
              ) : isOnline ? (
                <Wifi className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-amber-600" />
              )}

              <span className="hidden sm:inline font-mono text-[11px]">
                {isSyncing || cloudSyncStatus === 'syncing'
                  ? 'SYNCING...'
                  : cloudSyncStatus === 'synced'
                  ? 'CLOUD SYNCED'
                  : isOnline
                  ? pendingSyncCount > 0
                    ? `SYNCED (${pendingSyncCount})`
                    : 'ONLINE'
                  : 'OFFLINE'}
              </span>
            </button>

            {/* Open Cloud Sync Details / Troubleshooting Modal */}
            <button
              type="button"
              onClick={() => setCloudSyncModalOpen(true)}
              className="px-2 py-1 text-stone-500 hover:text-stone-900 rounded-full hover:bg-stone-200 text-[11px] font-bold transition"
              title="Cloud Sync Settings, Cross-Device Transfer & Troubleshooting"
            >
              Sync Hub
            </button>
          </div>

          {/* Environment Mode Switcher (Web: Photo upload • Mobile: Live camera scan / gallery upload) */}
          <button
            onClick={handleToggleEnv}
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition shadow-2xs ${
              appEnv === 'mobile'
                ? 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200'
                : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
            }`}
            title={`Currently in ${appEnv === 'mobile' ? 'Mobile Mode' : 'Web Mode'}. Click to toggle.`}
          >
            {appEnv === 'mobile' ? (
              <>
                <Smartphone className="w-3.5 h-3.5 text-purple-600" />
                <span className="hidden lg:inline">Mobile POS</span>
              </>
            ) : (
              <>
                <Monitor className="w-3.5 h-3.5 text-stone-600" />
                <span className="hidden lg:inline">Web POS</span>
              </>
            )}
          </button>

          {/* Install / Android APK Button */}
          <button
            onClick={() => setApkModalOpen(true)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition shadow-2xs"
            title="Download APK / Install on Android"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Get APK / Install</span>
          </button>

          {/* Interactive User Switcher Button (Desktop) */}
          <button
            onClick={() => setLoginModalOpen(true)}
            className="hidden sm:flex items-center gap-2 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-xl px-3 py-1.5 transition shadow-2xs text-left"
            title="Switch User / Staff Login"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <div>
              <div className="text-xs font-extrabold text-stone-900 leading-none flex items-center gap-1">
                <span>{activeUser.name}</span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider border ${
                    roleBadgeColors[activeUser.role] || 'bg-stone-200 text-stone-700'
                  }`}
                >
                  {activeUser.role}
                </span>
              </div>
              <div className="text-[10px] text-blue-600 font-bold hover:underline">
                Tap to Switch Login
              </div>
            </div>
          </button>

          {/* Compact User Switcher (Mobile) */}
          <button
            onClick={() => setLoginModalOpen(true)}
            className="sm:hidden flex items-center gap-1.5 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-xl px-2.5 py-1.5 transition shadow-2xs"
            title={`Logged in as ${activeUser.name} (${activeUser.role}). Tap to switch.`}
          >
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></div>
            <span className="text-xs font-extrabold text-stone-900 max-w-[70px] truncate">
              {activeUser.name.split(' ')[0]}
            </span>
            <span
              className={`text-[8px] px-1 py-0.2 rounded font-black uppercase tracking-wider border ${
                roleBadgeColors[activeUser.role] || 'bg-stone-200 text-stone-700'
              }`}
            >
              {activeUser.role.slice(0, 3)}
            </span>
          </button>
        </div>
      </header>

      {/* Daily Morning Exchange Rate Notification Banner */}
      {!rateVerifiedToday && (
        <div className="bg-amber-400 text-stone-950 px-3 sm:px-4 py-2 flex items-center justify-between gap-2 text-xs font-bold shrink-0 shadow-xs border-b border-amber-500/40 animate-fade-in">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-stone-950 text-amber-400 flex items-center justify-center shrink-0">
              <Sun className="w-3.5 h-3.5 animate-spin-slow" />
            </div>
            <div className="truncate">
              <span className="font-extrabold mr-1">Morning Rate Notice:</span>
              <span className="font-normal hidden sm:inline text-stone-900">
                Please verify today&apos;s USD exchange rate before ringing transactions. Current:
              </span>
              <span className="font-black bg-stone-950 text-white px-1.5 py-0.5 rounded font-mono text-[11px] ml-1">
                1 USD = {settings.exchangeRate} LRD
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setDailyRateModalOpen(true)}
              className="px-3 py-1 bg-stone-950 hover:bg-stone-800 text-white rounded-lg text-[11px] font-black transition shadow-xs flex items-center gap-1"
            >
              <span>Confirm / Change Rate</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Desktop Sidebar with 4 Main SME Tabs */}
        <aside
          className={`absolute md:relative inset-y-0 left-0 z-20 w-64 bg-white border-r border-stone-200 flex flex-col transition-transform duration-200 ease-in-out ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
        >
          {/* Main 4 Nav Categories */}
          <div className="p-3 border-b border-stone-100 flex items-center justify-between">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider px-2">
              Main Navigation
            </span>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden p-1 text-stone-400 hover:text-stone-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto p-2.5 space-y-2 text-xs">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-start gap-3 p-3 rounded-2xl font-bold transition text-left ${
                    isActive
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'text-stone-700 hover:text-stone-900 hover:bg-stone-100'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      isActive ? 'bg-white/10 text-white' : 'bg-stone-100 text-stone-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-extrabold truncate">{item.label}</span>
                      {item.badge && (
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold uppercase ${
                            isActive
                              ? 'bg-white/20 text-white'
                              : 'bg-stone-200 text-stone-600'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-[11px] font-normal truncate mt-0.5 ${
                        isActive ? 'text-stone-300' : 'text-stone-500'
                      }`}
                    >
                      {item.sublabel}
                    </p>
                  </div>
                </button>
              );
            })}

            {/* Mobile Utility Actions inside Drawer */}
            <div className="md:hidden pt-3 mt-3 border-t border-stone-100 space-y-2">
              <button
                onClick={() => {
                  setApkModalOpen(true);
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition"
              >
                <Smartphone className="w-4 h-4" />
                <span>Get APK / Install on Phone</span>
              </button>

              <button
                onClick={() => {
                  handleToggleEnv();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Switch to {appEnv === 'mobile' ? 'Web Mode' : 'Mobile Mode'}</span>
              </button>
            </div>
          </nav>

          {/* Quick Staff Card at bottom of Sidebar */}
          <div className="p-3 bg-stone-50 border-t border-stone-200">
            <div className="p-2.5 bg-white border border-stone-200 rounded-xl flex items-center justify-between shadow-2xs">
              <div className="min-w-0">
                <div className="text-[11px] text-stone-400 font-bold uppercase tracking-wider">
                  Logged in As
                </div>
                <div className="text-xs font-extrabold text-stone-900 truncate">
                  {activeUser.name}
                </div>
              </div>
              <button
                onClick={() => setLoginModalOpen(true)}
                className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-bold transition border border-stone-200"
              >
                Switch
              </button>
            </div>
          </div>
        </aside>

        {/* Content Container */}
        <main className="flex-1 flex flex-col min-w-0 bg-stone-100 overflow-hidden">
          {activeTab === 'pos' && (
            <PosView
              settings={settings}
              activeUser={activeUser}
              onNavigateToStockIntake={() => setActiveTab('inventory')}
              onRefreshData={() => updatePendingSync()}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryHub
              settings={settings}
              activeUser={activeUser}
              onRefresh={() => updatePendingSync()}
            />
          )}

          {activeTab === 'orders' && (
            <OrdersHub
              settings={settings}
              activeUser={activeUser}
              onRefresh={() => updatePendingSync()}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsHub
              settings={settings}
              activeUser={activeUser}
              onRefresh={() => updatePendingSync()}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsHub
              settings={settings}
              activeUser={activeUser}
              onUpdateSettings={(newSet) => setSettings(newSet)}
              onRefresh={() => updatePendingSync()}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Optimized for Android / Mobile POS handhelds) */}
      <nav className="md:hidden bg-white border-t border-stone-200 flex justify-around items-center shrink-0 z-30 shadow-xs">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex-1 py-2 px-1 flex flex-col items-center justify-center transition ${
                isActive ? 'text-blue-600 font-extrabold' : 'text-stone-500 font-semibold'
              }`}
            >
              <div
                className={`p-1 rounded-xl transition ${
                  isActive ? 'bg-blue-50 text-blue-600' : 'text-stone-500'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] tracking-tight leading-tight mt-0.5 truncate max-w-full">
                {item.label.split(' ')[0]}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Daily Morning Exchange Rate Notification Modal */}
      <DailyExchangeRateModal
        isOpen={dailyRateModalOpen}
        onClose={() => setDailyRateModalOpen(false)}
        settings={settings}
        onRateConfirmed={(newRate) => {
          const updated = {
            ...settings,
            exchangeRate: newRate,
            exchangeRateLastConfirmedDate: new Date().toISOString().split('T')[0],
          };
          OfflineStorageManager.confirmExchangeRate(newRate);
          OfflineStorageManager.saveSettings(updated);
          setSettings(updated);
          setRateVerifiedToday(true);
          setDailyRateModalOpen(false);
          triggerSync();
        }}
      />

      {/* Staff Login / User Switcher Modal */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        users={users}
        activeUser={activeUser}
        onSelectUser={handleSelectUser}
        settings={settings}
      />

      {/* APK & Phone Installation Modal */}
      <ApkExportModal
        isOpen={apkModalOpen}
        onClose={() => setApkModalOpen(false)}
      />

      {/* Cloud Sync & Cross-Device Transfer Modal */}
      <CloudSyncModal
        isOpen={cloudSyncModalOpen}
        onClose={() => setCloudSyncModalOpen(false)}
        onDataImported={() => {
          setSettings(OfflineStorageManager.getSettings());
          setUsers(OfflineStorageManager.getUsers());
          triggerSync();
        }}
      />
    </div>
  );
}
