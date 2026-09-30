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
  Moon,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { AppModuleId, BusinessSettings, User } from './types';
import { OfflineStorageManager } from './utils/storage';
import { DeviceHelper } from './utils/device';
import { CloudSyncManager, SyncStatus } from './utils/cloudSync';
import { PosView } from './components/PosView';
import { InventoryHub } from './components/InventoryHub';
import { OrdersHub } from './components/OrdersHub';
import { ReportsHub } from './components/ReportsHub';
import { SettingsHub, SettingsSubTab } from './components/SettingsHub';
import { LoginModal } from './components/LoginModal';
import { ApkExportModal } from './components/ApkExportModal';
import { CloudSyncModal } from './components/CloudSyncModal';
import { DailyExchangeRateModal } from './components/DailyExchangeRateModal';
import { TrialExpiredLockModal } from './components/TrialExpiredLockModal';
import { TrialInfoModal } from './components/TrialInfoModal';

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
  const [settingsSubTab, setSettingsSubTab] = useState<SettingsSubTab>('profile');
  const [trialInfoModalOpen, setTrialInfoModalOpen] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => OfflineStorageManager.isDarkMode());

  // Apply dark mode class to document element
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [isDarkMode]);

  // Sync when settings change from any subview
  useEffect(() => {
    if (typeof settings.darkMode === 'boolean' && settings.darkMode !== isDarkMode) {
      setIsDarkMode(settings.darkMode);
    }
  }, [settings.darkMode]);

  const handleToggleGlobalTheme = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    const updated = OfflineStorageManager.setDarkMode(next);
    setSettings(updated);
  };

  const licenseInfo = OfflineStorageManager.getLicenseInfo();
  const isEvaluationExpired =
    !licenseInfo.isLifetime &&
    licenseInfo.isExpired &&
    activeUser.role !== 'superadmin' &&
    activeUser.id !== 'usr-super';

  const handleNavigateToExchangeSettings = () => {
    setDailyRateModalOpen(false);
    setSettingsSubTab('exchange');
    setActiveTab('settings');
    setMobileMenuOpen(false);
  };

  const handleAcknowledgeRate = () => {
    OfflineStorageManager.confirmExchangeRate(settings.exchangeRate);
    setRateVerifiedToday(true);
    setDailyRateModalOpen(false);
  };

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
  // Use localStorage so that client profile persists when closing and reopening app
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return (
      localStorage.getItem('addition_pos_logged_in') === 'true' ||
      sessionStorage.getItem('addition_pos_logged_in') === 'true'
    );
  });
  const [loginModalOpen, setLoginModalOpen] = useState<boolean>(() => {
    return (
      localStorage.getItem('addition_pos_logged_in') !== 'true' &&
      sessionStorage.getItem('addition_pos_logged_in') !== 'true'
    );
  });
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
      const newSettings = OfflineStorageManager.getSettings();
      setSettings((prev) => {
        if (
          prev.exchangeRate === newSettings.exchangeRate &&
          prev.name === newSettings.name &&
          prev.primaryCurrency === newSettings.primaryCurrency &&
          prev.secondaryCurrency === newSettings.secondaryCurrency &&
          prev.taxEnabled === newSettings.taxEnabled &&
          prev.taxRatePercent === newSettings.taxRatePercent &&
          prev.updatedAt === newSettings.updatedAt
        ) {
          return prev;
        }
        return newSettings;
      });
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
    setIsAuthenticated(true);
    localStorage.setItem('addition_pos_logged_in', 'true');
    sessionStorage.setItem('addition_pos_logged_in', 'true');
  };

  const handleLogOut = () => {
    localStorage.removeItem('addition_pos_logged_in');
    sessionStorage.removeItem('addition_pos_logged_in');
    setIsAuthenticated(false);
    setLoginModalOpen(true);
  };

  const handleSuperAdminUnlock = (superAdmin: User) => {
    handleSelectUser(superAdmin);
    setActiveTab('settings');
    setSettingsSubTab('license');
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
      badge: (activeUser.role === 'superadmin' || activeUser.role === 'owner') ? 'Admin' : null,
      color: 'text-stone-700',
    },
  ];

  // Granular Access Control: Filter modules based on assigned responsibilities
  const isHighAdmin = activeUser.role === 'superadmin' || activeUser.role === 'owner';
  const userAllowedModules: AppModuleId[] = isHighAdmin
    ? ['pos', 'inventory', 'orders', 'reports', 'settings']
    : activeUser.allowedModules && activeUser.allowedModules.length > 0
    ? activeUser.allowedModules
    : activeUser.role === 'manager'
    ? ['pos', 'inventory', 'orders', 'reports']
    : ['pos', 'orders'];

  const visibleNavItems = mainNavItems.filter((item) =>
    isHighAdmin || userAllowedModules.includes(item.id)
  );

  useEffect(() => {
    if (!isHighAdmin && !userAllowedModules.includes(activeTab)) {
      const fallback = visibleNavItems[0]?.id || 'pos';
      setActiveTab(fallback);
    }
  }, [activeUser, activeTab, userAllowedModules, isHighAdmin]);

  const roleBadgeColors: Record<string, string> = {
    superadmin: 'bg-amber-100 text-amber-800 border-amber-300',
    owner: 'bg-purple-100 text-purple-800 border-purple-200',
    manager: 'bg-blue-100 text-blue-800 border-blue-200',
    cashier: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 font-sans overflow-hidden select-none">
      {/* Universal Square Top Header */}
      <header className="h-14 sm:h-16 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 px-2.5 sm:px-4 flex items-center justify-between shrink-0 z-30 shadow-2xs gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 shrink-0"
            title="Open Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Business Brand Identity */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-stone-900 dark:bg-stone-800 border border-transparent dark:border-stone-700 flex items-center justify-center font-bold text-white shadow-2xs shrink-0">
              <Store className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-amber-400" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-sm font-black text-stone-900 dark:text-stone-100 tracking-tight truncate leading-tight">
                {settings.name}
              </h1>
              <div className="text-[10px] sm:text-[11px] text-stone-500 dark:text-stone-400 font-mono font-bold flex items-center gap-1.5 whitespace-nowrap overflow-hidden">
                <span className="text-stone-800 dark:text-stone-200 font-extrabold">1 USD = {settings.exchangeRate} LRD</span>
                <span className="text-stone-300 dark:text-stone-600 hidden sm:inline">•</span>
                <span className="hidden sm:inline text-stone-500 dark:text-stone-400 font-normal">Liberia Square POS</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Section: Sync Status & User Switcher */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Cloud Sync Pill / Button */}
          <button
            type="button"
            onClick={triggerSync}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-full text-xs font-bold transition shadow-2xs ${
              cloudSyncStatus === 'synced'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                : cloudSyncStatus === 'syncing'
                ? 'bg-blue-50 border border-blue-200 text-blue-800 hover:bg-blue-100'
                : isOnline
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                : 'bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100'
            }`}
            title="Click to trigger cloud synchronization or tap Sync Hub in menu"
          >
            {isSyncing || cloudSyncStatus === 'syncing' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600 shrink-0" />
            ) : cloudSyncStatus === 'synced' ? (
              <Wifi className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            ) : isOnline ? (
              <Wifi className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-amber-600 shrink-0" />
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

          {/* Sync Hub Button (Desktop/Tablet) */}
          <button
            type="button"
            onClick={() => setCloudSyncModalOpen(true)}
            className="hidden sm:inline-flex px-2 py-1 text-stone-500 hover:text-stone-900 rounded-full hover:bg-stone-200 text-[11px] font-bold transition"
            title="Cloud Sync Settings, Cross-Device Transfer & Troubleshooting"
          >
            Sync Hub
          </button>

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

          {/* 30-Day Evaluation / License Status Pill */}
          {activeUser.role === 'superadmin' || activeUser.id === 'usr-super' ? (
            <button
              onClick={() => {
                setActiveTab('settings');
                setSettingsSubTab('license');
              }}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition shadow-2xs"
              title="Master Super Admin License Manager"
            >
              <Shield className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden md:inline">Admin License</span>
            </button>
          ) : (
            <button
              onClick={() => setTrialInfoModalOpen(true)}
              className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-bold border transition shadow-2xs ${
                licenseInfo.isLifetime
                  ? 'bg-purple-50 hover:bg-purple-100 text-purple-800 border-purple-200'
                  : licenseInfo.daysRemaining <= 5
                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200 animate-pulse'
                  : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
              }`}
              title="Store Evaluation Status (30-Day Period)"
            >
              <Clock className="w-3.5 h-3.5 text-stone-500" />
              <span className="font-bold">
                {licenseInfo.isLifetime ? 'Licensed' : `${licenseInfo.daysRemaining}d Left`}
              </span>
            </button>
          )}

          {/* Global Theme / Dark Mode Quick Toggle */}
          <button
            type="button"
            onClick={handleToggleGlobalTheme}
            className="p-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 transition shadow-2xs"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-purple-600" />
            )}
          </button>

          {/* Interactive User Switcher Button (Desktop) */}
          <button
            onClick={() => setLoginModalOpen(true)}
            className="hidden sm:flex items-center gap-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-750 border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-1.5 transition shadow-2xs text-left"
            title="Switch User / Staff Login"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <div>
              <div className="text-xs font-extrabold text-stone-900 dark:text-stone-100 leading-none flex items-center gap-1">
                <span>{activeUser.name}</span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider border ${
                    roleBadgeColors[activeUser.role] || 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  {activeUser.role}
                </span>
              </div>
              <div className="text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline">
                Tap to Switch Login
              </div>
            </div>
          </button>

          {/* Compact User Switcher (Mobile) */}
          <button
            onClick={() => setLoginModalOpen(true)}
            className="sm:hidden flex items-center gap-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 rounded-xl px-2 py-1.5 transition shadow-2xs shrink-0"
            title={`Logged in as ${activeUser.name} (${activeUser.role}). Tap to switch.`}
          >
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></div>
            <span className="text-[11px] font-extrabold text-stone-900 dark:text-stone-100 max-w-[65px] truncate">
              {activeUser.name.split(' ')[0]}
            </span>
            <span
              className={`text-[8px] px-1 py-0.2 rounded font-black uppercase tracking-wider border ${
                roleBadgeColors[activeUser.role] || 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
              }`}
            >
              {activeUser.role.slice(0, 3)}
            </span>
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Desktop Sidebar with 4 Main SME Tabs */}
        <aside
          className={`absolute md:relative inset-y-0 left-0 z-20 w-64 bg-white dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800 flex flex-col transition-transform duration-200 ease-in-out ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
        >
          {/* Main 4 Nav Categories */}
          <div className="p-3 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider px-2">
              Main Navigation
            </span>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
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
                  setCloudSyncModalOpen(true);
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition"
              >
                <Wifi className="w-4 h-4 text-emerald-600" />
                <span>Cloud Sync Hub & Multi-Device</span>
              </button>

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
              activeSubTab={settingsSubTab}
              onSubTabChange={(tab) => setSettingsSubTab(tab)}
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

      {/* Daily Morning Exchange Rate Alert Modal */}
      <DailyExchangeRateModal
        isOpen={dailyRateModalOpen}
        onClose={() => setDailyRateModalOpen(false)}
        settings={settings}
        onNavigateToSettings={handleNavigateToExchangeSettings}
        onAcknowledgeKeepRate={handleAcknowledgeRate}
      />

      {/* Staff Login / User Switcher Modal */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => {
          if (isAuthenticated) {
            setLoginModalOpen(false);
          }
        }}
        users={users}
        activeUser={activeUser}
        onSelectUser={handleSelectUser}
        settings={settings}
        canClose={isAuthenticated}
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

      {/* 30-Day Evaluation Expired Full Lock (Only blocks non-superadmin users) */}
      {isEvaluationExpired && (
        <TrialExpiredLockModal
          settings={settings}
          users={users}
          onSuperAdminUnlock={handleSuperAdminUnlock}
          onResetTrialSuccess={() => {
            setSettings(OfflineStorageManager.getSettings());
            updatePendingSync();
          }}
        />
      )}

      {/* Trial Status & Evaluation Info Modal */}
      <TrialInfoModal
        settings={settings}
        activeUser={activeUser}
        isOpen={trialInfoModalOpen}
        onClose={() => setTrialInfoModalOpen(false)}
        onOpenLicenseSettings={() => {
          setActiveTab('settings');
          setSettingsSubTab('license');
        }}
        onResetTrial={() => {
          setSettings(OfflineStorageManager.getSettings());
          updatePendingSync();
        }}
      />
    </div>
  );
}
