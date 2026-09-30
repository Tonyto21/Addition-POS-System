import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Store,
  DollarSign,
  Shield,
  Printer,
  Save,
  Check,
  RotateCcw,
  Users,
  Percent,
  KeyRound,
  Eye,
  EyeOff,
  UserCheck,
  MapPin,
  FileText,
  Clock,
  Calendar,
  Sparkles,
  AlertTriangle,
  Infinity as InfinityIcon,
  Sun,
  Moon,
} from 'lucide-react';
import { BusinessSettings, User } from '../types';
import { OfflineStorageManager } from '../utils/storage';

interface SettingsViewProps {
  settings: BusinessSettings;
  activeUser: User;
  onUpdateSettings: (newSettings: BusinessSettings) => void;
  onRefresh: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  activeUser,
  onUpdateSettings,
  onRefresh,
}) => {
  const [formData, setFormData] = useState<BusinessSettings>({ ...settings });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [users, setUsers] = useState<User[]>(() => OfflineStorageManager.getUsers());
  const [showPins, setShowPins] = useState<boolean>(true);
  const [licenseInfo, setLicenseInfo] = useState(() => OfflineStorageManager.getLicenseInfo());
  const [customDays, setCustomDays] = useState<number>(30);
  const [clientStoreTarget, setClientStoreTarget] = useState<string>(settings.licensedTo || settings.name);

  const isSuperAdmin = activeUser.role === 'superadmin' || activeUser.id === 'usr-super';

  // Filter out superadmin accounts when viewing as Shop Owner or regular staff
  const visibleUsers = users.filter((u) => {
    if (isSuperAdmin) return true;
    return u.role !== 'superadmin' && u.id !== 'usr-super';
  });

  // New user form state
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'owner' | 'manager' | 'cashier'>('cashier');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserPin, setNewUserPin] = useState('1234');

  // Editing existing user PIN
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editPinValue, setEditPinValue] = useState<string>('1234');

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    OfflineStorageManager.saveSettings(formData);
    onUpdateSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
    onRefresh();
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) return;

    const user: User = {
      id: `usr-${Date.now()}`,
      name: newUserName.trim(),
      username: newUserName.toLowerCase().replace(/\s+/g, '_'),
      role: newUserRole,
      phone: newUserPhone.trim(),
      pin: newUserPin.trim() || '1234',
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    OfflineStorageManager.saveUser(user);
    setUsers(OfflineStorageManager.getUsers());
    setNewUserName('');
    setNewUserPhone('');
    setNewUserPin('1234');
    onRefresh();
  };

  const handleUpdatePin = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    if (!isSuperAdmin && (user.role === 'superadmin' || user.id === 'usr-super')) {
      return;
    }
    const updated = { ...user, pin: editPinValue.trim() || '1234' };
    OfflineStorageManager.saveUser(updated);
    setUsers(OfflineStorageManager.getUsers());
    setEditingUserId(null);
    onRefresh();
  };

  const handleExtendTrial = (days: number, status: 'TRIAL' | 'ACTIVE' | 'LIFETIME' = 'ACTIVE') => {
    const updated = OfflineStorageManager.renewLicense(days, status);
    onUpdateSettings(updated);
    setFormData({ ...updated });
    setLicenseInfo(OfflineStorageManager.getLicenseInfo());
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
    onRefresh();
  };

  const handleSimulateExpired = () => {
    const updated = OfflineStorageManager.expireTrialNow();
    onUpdateSettings(updated);
    setFormData({ ...updated });
    setLicenseInfo(OfflineStorageManager.getLicenseInfo());
    onRefresh();
  };

  const handleSaveClientAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = OfflineStorageManager.setCustomTrialExpiry(
      licenseInfo.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      clientStoreTarget.trim()
    );
    onUpdateSettings(updated);
    setFormData({ ...updated });
    setLicenseInfo(OfflineStorageManager.getLicenseInfo());
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
    onRefresh();
  };

  const handleToggleTheme = (enableDark: boolean) => {
    const updated = OfflineStorageManager.setDarkMode(enableDark);
    setFormData({ ...updated });
    onUpdateSettings(updated);
    onRefresh();
    window.dispatchEvent(
      new CustomEvent('app-storage-updated', { detail: { source: 'theme-toggle', darkMode: enableDark } })
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100">
      {/* Header */}
      <div className="p-4 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-stone-800 dark:text-stone-200" />
            <span>Store Profile & System Settings</span>
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Business branding, dual-currency exchange rates, tax switches, and employee access accounts
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme Quick Toggle */}
          <button
            type="button"
            onClick={() => handleToggleTheme(!formData.darkMode)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 border border-stone-300 dark:border-stone-700 transition shadow-2xs"
            title="Toggle Light / Dark Mode"
          >
            {formData.darkMode ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-purple-600" />
                <span>Dark</span>
              </>
            )}
          </button>

          {savedSuccess && (
            <div className="px-3 py-1 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 text-xs font-bold rounded-lg flex items-center gap-1.5 animate-fadeIn">
              <Check className="w-3.5 h-3.5" /> Settings Saved!
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-4 max-w-5xl mx-auto w-full space-y-5 pb-24">
        {/* Application Appearance & Global Theme Card */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                {formData.darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-stone-950 dark:text-stone-100 flex items-center gap-2">
                  <span>Application Appearance & Global Theme</span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
                    {formData.darkMode ? 'Dark Active' : 'Light Active'}
                  </span>
                </h4>
                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                  Switch between high-contrast daylight mode and eye-comfort dark night mode for the POS.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleToggleTheme(false)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition border ${
                  !formData.darkMode
                    ? 'bg-amber-500 text-white border-amber-600 shadow-xs font-black'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-300 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-700'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-200" />
                <span>Light Mode</span>
              </button>
              <button
                type="button"
                onClick={() => handleToggleTheme(true)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition border ${
                  formData.darkMode
                    ? 'bg-stone-950 text-white border-stone-700 shadow-xs font-black'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-300 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-700'
                }`}
              >
                <Moon className="w-4 h-4 text-purple-300" />
                <span>Dark Mode</span>
              </button>
            </div>
          </div>
        </div>
        {/* 30-Day Client Evaluation & License Controller */}
        {isSuperAdmin ? (
          <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white border-2 border-amber-300/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/80 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black shadow-sm">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-black text-stone-900">
                      Master License & 30-Day Evaluation Manager
                    </h3>
                    <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 border border-amber-300">
                      Super Admin Only
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-600">
                    Control client trial countdown, grant extensions, or lock evaluation access.
                  </p>
                </div>
              </div>

              {/* Status Pill */}
              <div className="flex items-center gap-2">
                <div
                  className={`px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 border shadow-2xs ${
                    licenseInfo.isLifetime
                      ? 'bg-purple-100 text-purple-900 border-purple-300'
                      : licenseInfo.isExpired
                      ? 'bg-rose-100 text-rose-900 border-rose-300 animate-pulse'
                      : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {licenseInfo.isLifetime
                      ? 'Lifetime Perpetual License'
                      : licenseInfo.isExpired
                      ? 'EVALUATION EXPIRED (Locked)'
                      : `${licenseInfo.daysRemaining} Days Left in Trial`}
                  </span>
                </div>
              </div>
            </div>

            {/* Trial Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-white/80 border border-amber-200 rounded-xl p-3">
                <span className="text-[10px] font-bold text-stone-500 block uppercase tracking-wider">Licensed Client Store</span>
                <span className="font-extrabold text-stone-900 text-sm">{licenseInfo.licensedTo}</span>
              </div>
              <div className="bg-white/80 border border-amber-200 rounded-xl p-3">
                <span className="text-[10px] font-bold text-stone-500 block uppercase tracking-wider">Expiration Date</span>
                <span className="font-mono font-bold text-stone-900 text-xs">
                  {licenseInfo.isLifetime ? 'Never Expires' : licenseInfo.expiresAt ? new Date(licenseInfo.expiresAt).toLocaleDateString('en-US', { dateStyle: 'medium' }) : 'Not Configured'}
                </span>
              </div>
              <div className="bg-white/80 border border-amber-200 rounded-xl p-3">
                <span className="text-[10px] font-bold text-stone-500 block uppercase tracking-wider">Exact Hours Remaining</span>
                <span className="font-mono font-black text-stone-900 text-sm">
                  {licenseInfo.isLifetime ? '∞' : `${licenseInfo.hoursRemaining} hours`}
                </span>
              </div>
            </div>

            {/* License Actions */}
            <div className="space-y-2 pt-1">
              <p className="text-[11px] font-bold text-stone-700 uppercase tracking-wider">
                Quick License Extension & Admin Actions
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleExtendTrial(30, 'TRIAL')}
                  className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span>+30 Days Evaluation</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleExtendTrial(60, 'ACTIVE')}
                  className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5 text-blue-400" />
                  <span>+60 Days Commercial</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleExtendTrial(365, 'ACTIVE')}
                  className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>+1 Year Full License</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleExtendTrial(0, 'LIFETIME')}
                  className="px-3.5 py-2 bg-purple-900 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
                >
                  <InfinityIcon className="w-3.5 h-3.5 text-purple-300" />
                  <span>Grant Lifetime Perpetual</span>
                </button>

                <button
                  type="button"
                  onClick={handleSimulateExpired}
                  className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Simulate Expired (Test Lock)</span>
                </button>
              </div>
            </div>

            {/* Custom Client Assignment */}
            <form onSubmit={handleSaveClientAssignment} className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-amber-200/80">
              <span className="text-[11px] font-bold text-stone-700 shrink-0">Assign Store Client Name:</span>
              <input
                type="text"
                value={clientStoreTarget}
                onChange={(e) => setClientStoreTarget(e.target.value)}
                placeholder="e.g. John's Boutique / Client Store"
                className="flex-1 bg-white border border-stone-300 rounded-xl px-3 py-1.5 text-xs font-bold text-stone-900"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-2xs transition shrink-0"
              >
                Update Client Name
              </button>
            </form>
          </div>
        ) : (
          /* Read-only Evaluation Banner for Shop Owner & Staff */
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-bold">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="font-extrabold text-stone-900">
                  {licenseInfo.isLifetime ? 'Full Commercial License' : '30-Day Evaluation Period'}
                </div>
                <div className="text-[11px] text-stone-500">
                  {licenseInfo.isLifetime
                    ? 'Your store has active lifetime commercial access.'
                    : `Your evaluation is active with ${licenseInfo.daysRemaining} days remaining.`}
                </div>
              </div>
            </div>

            <div className="text-right text-[11px] text-stone-500">
              <span className="font-mono font-bold text-stone-800">
                {licenseInfo.isLifetime ? 'Perpetual' : `${licenseInfo.daysRemaining} Days Left`}
              </span>
              <p className="text-[10px] text-stone-400">Admin: Waweru</p>
            </div>
          </div>
        )}

        {/* Business Identity & Contact */}
        <form onSubmit={handleSaveSettings} className="space-y-5">
          <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-4 text-xs shadow-2xs">
            <h3 className="text-sm font-extrabold text-stone-900 flex items-center gap-2 border-b border-stone-100 pb-2.5">
              <Store className="w-4 h-4 text-blue-600" /> Business Profile & Branding
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-stone-700 font-bold">Business Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 text-sm focus:outline-none focus:bg-white focus:border-stone-900 transition"
                />
                <p className="text-[11px] text-stone-400">
                  Changing this updates printed receipts, dashboard branding, and invoices immediately.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-stone-700 font-bold">Phone Numbers</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+231 77 000 0000"
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 font-mono focus:outline-none focus:bg-white focus:border-stone-900 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-stone-700 font-bold">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="shop@example.com"
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:bg-white focus:border-stone-900 transition"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-stone-700 font-bold flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                    <span>Physical Business / Shop Address (Centered on Receipts & PDF)</span>
                  </label>
                  <span className="text-[10px] text-blue-600 font-bold">Appears on every customer receipt</span>
                </div>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="e.g. Tubman Boulevard, Sinkor, Monrovia, Liberia"
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 text-xs focus:outline-none focus:bg-white focus:border-stone-900 transition font-medium"
                />
                <p className="text-[11px] text-stone-500">
                  This address is automatically formatted and centered at the top of all thermal printouts and downloaded PDF receipts.
                </p>
              </div>
            </div>
          </div>

          {/* Currencies, Exchange Rate & Tax */}
          <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-4 text-xs shadow-2xs">
            <h3 className="text-sm font-extrabold text-stone-900 flex items-center gap-2 border-b border-stone-100 pb-2.5">
              <DollarSign className="w-4 h-4 text-emerald-600" /> Dual-Currency & Exchange Rate
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="space-y-1">
                <label className="text-stone-700 font-bold">Primary Base Currency</label>
                <select
                  value={formData.primaryCurrency}
                  onChange={(e) => setFormData({ ...formData, primaryCurrency: e.target.value as any })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 font-bold"
                >
                  <option value="LRD">LRD (L$) - Liberian Dollar (Default)</option>
                  <option value="USD">USD ($) - United States Dollar</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-stone-700 font-bold">Secondary Currency</label>
                <select
                  value={formData.secondaryCurrency}
                  onChange={(e) => setFormData({ ...formData, secondaryCurrency: e.target.value as any })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 font-bold"
                >
                  <option value="USD">USD ($) - United States Dollar</option>
                  <option value="LRD">LRD (L$) - Liberian Dollar</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-stone-700 font-bold">Exchange Rate (1 USD = ? LRD) *</label>
                <input
                  type="number"
                  step="1"
                  required
                  value={formData.exchangeRate}
                  onChange={(e) =>
                    setFormData({ ...formData, exchangeRate: parseFloat(e.target.value) || 1 })
                  }
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 font-mono text-sm font-extrabold focus:outline-none focus:bg-white focus:border-stone-900 transition"
                />
                <span className="text-[10px] text-stone-500 font-mono">Current: $1.00 USD = {formData.exchangeRate} LRD</span>
              </div>
            </div>

            {/* Tax Configuration */}
            <div className="pt-3 border-t border-stone-100 space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2.5 cursor-pointer text-stone-800 font-bold">
                  <input
                    type="checkbox"
                    checked={formData.taxEnabled}
                    onChange={(e) => setFormData({ ...formData, taxEnabled: e.target.checked })}
                    className="w-4 h-4 rounded border-stone-300 text-blue-600 focus:ring-0"
                  />
                  <span>Enable Sales Tax / VAT / GST</span>
                </label>
                <span className="text-[11px] text-stone-500 font-medium">
                  Configurable tax regime with line-item and customer exemption support
                </span>
              </div>

              {formData.taxEnabled && (
                <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-3.5 animate-fadeIn">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <label className="text-stone-700 font-bold text-[11px]">Tax Name / Regime</label>
                      <input
                        type="text"
                        value={formData.taxName || 'GST'}
                        onChange={(e) => setFormData({ ...formData, taxName: e.target.value })}
                        placeholder="e.g. GST, VAT, Sales Tax"
                        className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-900 font-bold text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-stone-700 font-bold text-[11px]">Tax Rate (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={formData.taxRatePercent ?? 10}
                        onChange={(e) =>
                          setFormData({ ...formData, taxRatePercent: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-900 font-mono font-bold text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-stone-700 font-bold text-[11px]">Pricing Calculation Method</label>
                      <select
                        value={formData.taxCalculationType || 'EXCLUSIVE'}
                        onChange={(e) =>
                          setFormData({ ...formData, taxCalculationType: e.target.value as 'EXCLUSIVE' | 'INCLUSIVE' })
                        }
                        className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-900 font-bold text-xs"
                      >
                        <option value="EXCLUSIVE">Tax-Exclusive (Added on top at checkout)</option>
                        <option value="INCLUSIVE">Tax-Inclusive (Prices already contain tax)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-stone-700 font-bold text-[11px]">Store Tax ID / TIN</label>
                      <input
                        type="text"
                        value={formData.storeTIN || ''}
                        onChange={(e) => setFormData({ ...formData, storeTIN: e.target.value })}
                        placeholder="e.g. TIN-LIB-770921"
                        className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-900 font-mono text-xs"
                      />
                    </div>
                  </div>

                  {/* Calculation Example Card */}
                  <div className="p-2.5 bg-blue-50/70 border border-blue-200/80 rounded-lg text-[11px] text-blue-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="font-extrabold uppercase mr-1.5 text-blue-900">
                        {formData.taxCalculationType === 'INCLUSIVE' ? 'Tax-Inclusive Mode Active:' : 'Tax-Exclusive Mode Active:'}
                      </span>
                      <span>
                        {formData.taxCalculationType === 'INCLUSIVE'
                          ? `Selling prices contain ${formData.taxName || 'GST'} (${formData.taxRatePercent || 10}%). For $100 total, Net Base is $${(100 / (1 + (formData.taxRatePercent || 10) / 100)).toFixed(2)} and Tax portion is $${(100 - (100 / (1 + (formData.taxRatePercent || 10) / 100))).toFixed(2)}.`
                          : `Prices are net. ${formData.taxName || 'GST'} (${formData.taxRatePercent || 10}%) is added to taxable goods at checkout. $100 net + $${(100 * ((formData.taxRatePercent || 10) / 100)).toFixed(2)} tax = $${(100 * (1 + (formData.taxRatePercent || 10) / 100)).toFixed(2)} total.`}
                      </span>
                    </div>
                    {formData.storeTIN && (
                      <span className="shrink-0 font-mono font-bold bg-white px-2 py-0.5 rounded border border-blue-200 text-blue-900 text-[10px]">
                        TIN: {formData.storeTIN}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Receipt Customization & Thermal Printer defaults */}
          <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-4 text-xs shadow-2xs">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
              <h3 className="text-sm font-extrabold text-stone-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" /> Receipt & PDF Customization
              </h3>
              <span className="text-[11px] text-stone-500 font-medium">
                Captured transaction details (items, totals, cashier) automatically combine with the header/footer below
              </span>
            </div>

            {/* Live Centered Preview Box */}
            <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200">
              <div className="text-[11px] font-bold text-stone-600 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5 text-stone-500" />
                Live Centered Header Preview (As Seen on Thermal Slips & PDF)
              </div>
              <div className="bg-white p-4 rounded-lg border border-dashed border-stone-300 max-w-sm mx-auto text-center font-mono space-y-1 shadow-2xs">
                <div className="font-extrabold text-stone-900 text-sm tracking-wider uppercase">
                  {formData.name || 'BUSINESS NAME'}
                </div>
                {formData.address && (
                  <div className="text-[11px] text-stone-700 font-sans flex items-center justify-center gap-1">
                    <MapPin className="w-3 h-3 text-stone-400 inline shrink-0" />
                    <span>{formData.address}</span>
                  </div>
                )}
                {formData.phone && (
                  <div className="text-[11px] text-stone-600">TEL: {formData.phone}</div>
                )}
                {formData.email && (
                  <div className="text-[10px] text-stone-500 font-sans">{formData.email}</div>
                )}
                {formData.receiptHeader && (
                  <div className="text-[10px] text-stone-500 font-sans pt-1 border-t border-dotted border-stone-200">
                    {formData.receiptHeader}
                  </div>
                )}
                <div className="text-[9px] text-stone-400 pt-2 border-t border-dashed border-stone-200">
                  [ --- Items & Transaction Captured From Sale --- ]
                </div>
                {formData.receiptFooter && (
                  <div className="text-[10px] text-stone-500 font-sans pt-1">
                    {formData.receiptFooter}
                  </div>
                )}
                <div className="text-[9px] font-extrabold text-stone-700 pt-0.5">
                  *** THANK YOU FOR SHOPPING WITH US ***
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="text-stone-700 font-bold">Receipt Custom Header Text</label>
                <textarea
                  rows={3}
                  value={formData.receiptHeader}
                  onChange={(e) => setFormData({ ...formData, receiptHeader: e.target.value })}
                  placeholder="e.g. Welcome to Addition Store • Dual-Currency Retail"
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:bg-white focus:border-stone-900 transition font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-stone-700 font-bold">Receipt Custom Footer Text</label>
                <textarea
                  rows={3}
                  value={formData.receiptFooter}
                  onChange={(e) => setFormData({ ...formData, receiptFooter: e.target.value })}
                  placeholder="e.g. Goods once sold cannot be returned without receipt"
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:bg-white focus:border-stone-900 transition font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-stone-700 font-bold">Default Thermal Paper Size</label>
                <select
                  value={formData.defaultThermalPaperSize}
                  onChange={(e) =>
                    setFormData({ ...formData, defaultThermalPaperSize: e.target.value as any })
                  }
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 font-bold"
                >
                  <option value="58mm">58mm Mini POS Thermal Printer (Standard Handheld / Phone)</option>
                  <option value="80mm">80mm Standard POS Thermal Printer (Countertop)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-stone-700 font-bold">Default Low Stock Alert Threshold</label>
                <input
                  type="number"
                  value={formData.lowStockThresholdDefault}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      lowStockThresholdDefault: parseInt(e.target.value) || 5,
                    })
                  }
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 font-mono font-bold"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-6 py-3 bg-stone-900 hover:bg-stone-800 text-white font-black text-xs rounded-xl shadow transition flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Save Business Settings</span>
            </button>
          </div>
        </form>

        {/* User Management & Passwords / PINs Section */}
        <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-4 text-xs shadow-2xs">
          <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
            <h3 className="text-sm font-extrabold text-stone-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" /> Employee Accounts, Usernames & PIN Passwords
            </h3>
            <button
              onClick={() => setShowPins(!showPins)}
              className="flex items-center gap-1 text-[11px] text-stone-600 hover:text-stone-900 font-bold bg-stone-100 px-2.5 py-1 rounded-lg border border-stone-200 transition"
            >
              {showPins ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showPins ? 'Hide Passwords/PINs' : 'Reveal Passwords/PINs'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Existing Users with explicit usernames and Passwords */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-stone-800">Existing Staff Accounts ({visibleUsers.length})</h4>
                <span className="text-[10px] text-stone-400 font-mono">Default PIN: 1234</span>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {visibleUsers.map((u) => {
                  const isEditingThisUser = editingUserId === u.id;
                  const currentPin = u.pin || '1234';

                  return (
                    <div
                      key={u.id}
                      className="p-3 bg-stone-50 border border-stone-200 rounded-xl flex flex-col gap-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-black text-stone-900 flex items-center gap-1.5">
                            <span>{u.name}</span>
                            {activeUser.id === u.id && (
                              <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded border border-emerald-200">
                                Current
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-stone-500 font-mono mt-0.5">
                            Username: <strong className="text-stone-800">@{u.username}</strong> • Phone: {u.phone || 'None'}
                          </div>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded text-[10px] uppercase font-black border ${
                            u.role === 'owner'
                              ? 'bg-purple-100 text-purple-800 border-purple-200'
                              : u.role === 'manager'
                              ? 'bg-blue-100 text-blue-800 border-blue-200'
                              : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          {u.role}
                        </span>
                      </div>

                      {/* Password / PIN display & Quick edit */}
                      <div className="flex items-center justify-between pt-2 border-t border-stone-200/70 text-[11px]">
                        <div className="flex items-center gap-1.5 font-mono">
                          <KeyRound className="w-3.5 h-3.5 text-stone-400" />
                          <span className="text-stone-500 font-medium">Login PIN / Pass:</span>
                          {isEditingThisUser ? (
                            <input
                              type="text"
                              maxLength={6}
                              value={editPinValue}
                              onChange={(e) => setEditPinValue(e.target.value)}
                              className="w-16 bg-white border border-stone-400 rounded px-1.5 py-0.5 font-mono font-black text-stone-900"
                            />
                          ) : (
                            <span className="font-black text-stone-900 bg-stone-200 px-2 py-0.5 rounded">
                              {showPins ? currentPin : '••••'}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          {isEditingThisUser ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleUpdatePin(u.id)}
                                className="px-2 py-0.5 bg-emerald-600 text-white rounded font-bold text-[10px]"
                              >
                                Save PIN
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingUserId(null)}
                                className="px-1.5 py-0.5 text-stone-500 hover:text-stone-800"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingUserId(u.id);
                                setEditPinValue(currentPin);
                              }}
                              className="text-[10px] text-blue-600 hover:underline font-bold"
                            >
                              Change PIN
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Add User Form */}
            <form onSubmit={handleAddUser} className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-2.5">
              <h4 className="font-extrabold text-stone-800">Add New Staff Member</h4>

              <div>
                <label className="text-stone-600 font-bold">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cashier Sarah"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-900 text-xs focus:outline-none focus:border-stone-900"
                />
              </div>

              <div>
                <label className="text-stone-600 font-bold">Role & Permissions</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as any)}
                  className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-900 text-xs font-medium"
                >
                  <option value="cashier">Cashier (POS Walk-in Sales & Receipts; Cost/Profits hidden)</option>
                  <option value="manager">Manager (POS, Stock Intake, and Inventory Reports)</option>
                  <option value="owner">Owner (Full Admin, Financials, Settings & Deletion)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-stone-600 font-bold">Phone</label>
                  <input
                    type="text"
                    placeholder="+231 77..."
                    value={newUserPhone}
                    onChange={(e) => setNewUserPhone(e.target.value)}
                    className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-900 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="text-stone-600 font-bold">Login PIN</label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="1234"
                    value={newUserPin}
                    onChange={(e) => setNewUserPin(e.target.value)}
                    className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-900 font-mono font-bold text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-stone-900 hover:bg-stone-800 text-white font-extrabold rounded-lg transition text-xs shadow-xs"
              >
                + Create Staff Account
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
