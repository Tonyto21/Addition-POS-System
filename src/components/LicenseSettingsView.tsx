import React, { useState } from 'react';
import {
  Shield,
  Clock,
  RotateCcw,
  Calendar,
  Sparkles,
  Infinity as InfinityIcon,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Phone,
  Mail,
  KeyRound,
  ArrowRight,
  AlertCircle,
  HelpCircle,
  History,
} from 'lucide-react';
import { BusinessSettings, User } from '../types';
import { OfflineStorageManager } from '../utils/storage';

interface LicenseSettingsViewProps {
  settings: BusinessSettings;
  activeUser: User;
  onUpdateSettings: (newSettings: BusinessSettings) => void;
  onRefresh: () => void;
}

export const LicenseSettingsView: React.FC<LicenseSettingsViewProps> = ({
  settings,
  activeUser,
  onUpdateSettings,
  onRefresh,
}) => {
  const [licenseInfo, setLicenseInfo] = useState(() => OfflineStorageManager.getLicenseInfo());
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [customDays, setCustomDays] = useState<number>(30);
  const [customDate, setCustomDate] = useState<string>(() => {
    const d = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return d.toISOString().split('T')[0];
  });
  const [clientStoreTarget, setClientStoreTarget] = useState<string>(settings.licensedTo || settings.name);

  // Super admin elevation state for non-superadmin users
  const [showAdminElevation, setShowAdminElevation] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [pinError, setPinError] = useState('');

  const isSuperAdmin = activeUser.role === 'superadmin' || activeUser.id === 'usr-super';

  const showNotification = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  const handleResetTrial = (days: number = 30) => {
    const updated = OfflineStorageManager.resetTrialPeriod(days, clientStoreTarget.trim());
    onUpdateSettings(updated);
    setLicenseInfo(OfflineStorageManager.getLicenseInfo());
    onRefresh();
    showNotification(`Trial successfully reset! Store now has a fresh ${days}-day evaluation starting today.`);
  };

  const handleExtendTrial = (days: number, status: 'TRIAL' | 'ACTIVE' | 'LIFETIME' = 'ACTIVE') => {
    const updated = OfflineStorageManager.renewLicense(days, status);
    onUpdateSettings(updated);
    setLicenseInfo(OfflineStorageManager.getLicenseInfo());
    onRefresh();
    if (status === 'LIFETIME') {
      showNotification('Perpetual Lifetime Commercial License granted! Trial lock disabled permanently.');
    } else {
      showNotification(`License extended by ${days} days.`);
    }
  };

  const handleSetCustomExpiryDate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customDate) return;
    const targetIso = new Date(`${customDate}T23:59:59`).toISOString();
    const updated = OfflineStorageManager.setCustomTrialExpiry(targetIso, clientStoreTarget.trim());
    onUpdateSettings(updated);
    setLicenseInfo(OfflineStorageManager.getLicenseInfo());
    onRefresh();
    showNotification(`Custom expiration set to ${customDate} for "${clientStoreTarget.trim()}".`);
  };

  const handleSimulateExpired = () => {
    const updated = OfflineStorageManager.expireTrialNow();
    onUpdateSettings(updated);
    setLicenseInfo(OfflineStorageManager.getLicenseInfo());
    onRefresh();
    showNotification('Simulated trial expired! Non-superadmin users will now see the lock screen.');
  };

  const handleVerifySuperAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    const users = OfflineStorageManager.getUsers();
    const superAdminUser = users.find((u) => u.role === 'superadmin' || u.id === 'usr-super');
    const correctPin = superAdminUser?.pin || '1234';

    if (adminPin.trim() === correctPin) {
      setPinError('');
      if (superAdminUser) {
        OfflineStorageManager.setActiveUser(superAdminUser);
        onRefresh();
        window.location.reload();
      }
    } else {
      setPinError('Incorrect Super Admin PIN passcode.');
      setAdminPin('');
    }
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto text-xs pb-12">
      {/* Toast Notification */}
      {successMessage && (
        <div className="p-3 bg-emerald-500 text-white font-bold rounded-2xl shadow-lg flex items-center justify-between gap-2 animate-bounce">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span className="text-xs sm:text-sm">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-white/80 hover:text-white text-xs font-black px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Primary Header Card */}
      <div className="bg-white border border-stone-200 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black shadow-md shrink-0">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-stone-900 tracking-tight">
                Master License & Evaluation Control
              </h2>
              {isSuperAdmin ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                  Super Admin Authorized
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-stone-100 text-stone-700 border border-stone-300">
                  Client Store View
                </span>
              )}
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Manage client evaluation periods, reset 30-day trials, issue extensions, or grant perpetual lifetime access.
            </p>
          </div>
        </div>

        {/* Current Status Pill */}
        <div className="shrink-0 flex items-center gap-2">
          <div
            className={`px-3.5 py-2 rounded-2xl font-black text-xs flex items-center gap-2 border shadow-xs ${
              licenseInfo.isLifetime
                ? 'bg-purple-50 text-purple-900 border-purple-200'
                : licenseInfo.isExpired
                ? 'bg-rose-100 text-rose-900 border-rose-300 animate-pulse'
                : 'bg-emerald-50 text-emerald-900 border-emerald-200'
            }`}
          >
            <Clock className="w-4 h-4 text-current" />
            <span>
              {licenseInfo.isLifetime
                ? 'Lifetime Perpetual License'
                : licenseInfo.isExpired
                ? 'Trial Expired (Locked)'
                : `${licenseInfo.daysRemaining} Days Left in Trial`}
            </span>
          </div>
        </div>
      </div>

      {/* Trial Status Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-2xs">
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">License Status</span>
          <span
            className={`font-black text-sm uppercase ${
              licenseInfo.isLifetime
                ? 'text-purple-700'
                : licenseInfo.isExpired
                ? 'text-rose-600'
                : 'text-emerald-700'
            }`}
          >
            {licenseInfo.status}
          </span>
          <span className="text-[10px] text-stone-400 block mt-1">
            {licenseInfo.isLifetime ? 'Unrestricted Perpetual' : 'Evaluation Mode'}
          </span>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-2xs">
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Licensed Client</span>
          <span className="font-extrabold text-stone-900 text-sm truncate block" title={licenseInfo.licensedTo}>
            {licenseInfo.licensedTo || settings.name}
          </span>
          <span className="text-[10px] text-stone-400 block mt-1">Store Profile</span>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-2xs">
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Expires On</span>
          <span className="font-mono font-bold text-stone-900 text-xs">
            {licenseInfo.isLifetime
              ? 'Never Expires'
              : licenseInfo.expiresAt
              ? new Date(licenseInfo.expiresAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : 'Not set'}
          </span>
          <span className="text-[10px] text-stone-400 block mt-1">
            {licenseInfo.isLifetime ? 'Permanent' : `${licenseInfo.hoursRemaining} hours remaining`}
          </span>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-2xs">
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Evaluation Started</span>
          <span className="font-mono font-bold text-stone-900 text-xs">
            {new Date(licenseInfo.startedAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
          <span className="text-[10px] text-stone-400 block mt-1">First Installed Date</span>
        </div>
      </div>

      {/* Super Admin Controls */}
      {isSuperAdmin ? (
        <div className="space-y-4">
          {/* Card 1: Reset Trial Period (The exact feature requested) */}
          <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white border-2 border-amber-300 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black shadow-sm">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-stone-900">
                  Reset Evaluation Trial Period
                </h3>
                <p className="text-[11px] text-stone-600">
                  As the Super Admin, you can reset the trial counter back to a clean 30-day evaluation starting today.
                </p>
              </div>
            </div>

            {/* Quick Reset Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => handleResetTrial(30)}
                className="py-3 px-3 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-2xl shadow-sm transition flex flex-col items-center justify-center gap-1 active:scale-98"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset to 30 Days</span>
                <span className="text-[9px] font-medium opacity-85">Fresh Standard Trial</span>
              </button>

              <button
                type="button"
                onClick={() => handleResetTrial(14)}
                className="py-3 px-3 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-2xl shadow-sm transition flex flex-col items-center justify-center gap-1 active:scale-98"
              >
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>Reset to 14 Days</span>
                <span className="text-[9px] font-medium opacity-75">2-Week Trial</span>
              </button>

              <button
                type="button"
                onClick={() => handleResetTrial(60)}
                className="py-3 px-3 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-2xl shadow-sm transition flex flex-col items-center justify-center gap-1 active:scale-98"
              >
                <Calendar className="w-4 h-4 text-blue-400" />
                <span>Reset to 60 Days</span>
                <span className="text-[9px] font-medium opacity-75">Extended 2 Months</span>
              </button>

              <button
                type="button"
                onClick={() => handleResetTrial(7)}
                className="py-3 px-3 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 font-bold text-xs rounded-2xl transition flex flex-col items-center justify-center gap-1 active:scale-98"
              >
                <Calendar className="w-4 h-4 text-stone-600" />
                <span>Reset to 7 Days</span>
                <span className="text-[9px] text-stone-500 font-medium">Quick Demo Period</span>
              </button>
            </div>

            {/* Custom Expiry Date or Custom Days */}
            <form
              onSubmit={handleSetCustomExpiryDate}
              className="bg-white/80 border border-amber-200 rounded-2xl p-4 space-y-3 pt-3"
            >
              <div className="font-extrabold text-stone-900 text-xs flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-amber-600" />
                <span>Custom Target Expiration Date or Store Assignment</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-stone-600 block mb-1">
                    Client Shop / Registered Name
                  </label>
                  <input
                    type="text"
                    value={clientStoreTarget}
                    onChange={(e) => setClientStoreTarget(e.target.value)}
                    placeholder="e.g. Addition Store Monrovia"
                    className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs font-bold text-stone-900 focus:outline-none focus:border-stone-900"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-stone-600 block mb-1">
                    Exact Expiration Date
                  </label>
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs font-bold text-stone-900 focus:outline-none focus:border-stone-900 font-mono"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full py-2 px-3 bg-stone-900 hover:bg-stone-800 text-white font-black text-xs rounded-xl shadow transition flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Apply Custom Expiry</span>
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Card 2: Commercial Extensions & Lifetime License */}
          <div className="bg-white border border-stone-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm sm:text-base font-black text-stone-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>Commercial Extensions & Perpetual Licensing</span>
              </h3>
              <p className="text-[11px] text-stone-500">
                Grant long-term licenses without resetting the original start date, or convert to a lifetime license.
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => handleExtendTrial(30, 'ACTIVE')}
                className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 font-bold text-xs rounded-xl transition flex items-center gap-2"
              >
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span>+30 Days Commercial</span>
              </button>

              <button
                type="button"
                onClick={() => handleExtendTrial(60, 'ACTIVE')}
                className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 font-bold text-xs rounded-xl transition flex items-center gap-2"
              >
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>+60 Days Commercial</span>
              </button>

              <button
                type="button"
                onClick={() => handleExtendTrial(365, 'ACTIVE')}
                className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 font-bold text-xs rounded-xl transition flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>+1 Year Commercial License</span>
              </button>

              <button
                type="button"
                onClick={() => handleExtendTrial(0, 'LIFETIME')}
                className="px-4 py-2.5 bg-purple-900 hover:bg-purple-800 text-white font-black text-xs rounded-xl shadow-sm transition flex items-center gap-2"
              >
                <InfinityIcon className="w-4 h-4 text-purple-300" />
                <span>Grant Lifetime Perpetual License</span>
              </button>
            </div>

            {/* Developer Testing Section */}
            <div className="pt-4 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="font-extrabold text-stone-800 text-xs block">
                  Lock Screen Simulation (Testing Tool)
                </span>
                <span className="text-[11px] text-stone-500">
                  Simulate an expired trial to test how the lock screen displays to shop clerks.
                </span>
              </div>
              <button
                type="button"
                onClick={handleSimulateExpired}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold text-xs rounded-xl transition flex items-center gap-1.5 shrink-0"
              >
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Simulate Expired Lock</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Regular Client / Cashier View */
        <div className="bg-white border border-stone-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-stone-100 pb-3">
            <Building2 className="w-5 h-5 text-stone-600" />
            <div>
              <h3 className="text-sm font-extrabold text-stone-900">
                Client Store Evaluation Information
              </h3>
              <p className="text-[11px] text-stone-500">
                Addition POS is activated in evaluation mode for your store.
              </p>
            </div>
          </div>

          <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-2">
            <span className="text-[10px] font-black uppercase text-amber-900 tracking-wider flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" /> Contact Developer / License Administrator
            </span>
            <p className="text-stone-700 text-[11px] leading-relaxed">
              If your trial is nearing expiration or you wish to convert to a full commercial license, please contact your administrator:
            </p>
            <div className="bg-white/90 rounded-xl p-3 border border-amber-200 text-[11px] font-mono space-y-1">
              <div><strong>Admin:</strong> Waweru</div>
              <div><strong>Phone / WhatsApp:</strong> +231 77 000 0000</div>
              <div><strong>Email:</strong> {settings.email || 'info@additionbusinesscentre.lr'}</div>
            </div>
          </div>

          {/* Super Admin PIN Elevation */}
          {!showAdminElevation ? (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowAdminElevation(true)}
                className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>I am the Super Admin (Unlock Controls)</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleVerifySuperAdmin} className="space-y-3 pt-3 border-t border-stone-200">
              <div className="flex items-center justify-between">
                <label className="font-extrabold text-stone-800 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-stone-600" />
                  <span>Enter Super Admin PIN Passcode:</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowAdminElevation(false)}
                  className="text-[10px] text-stone-500 hover:text-stone-800 font-bold underline"
                >
                  Cancel
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  type="password"
                  maxLength={6}
                  autoFocus
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  placeholder="••••"
                  className="flex-1 bg-stone-100 border border-stone-300 rounded-xl px-4 py-2 text-center text-base font-mono font-black tracking-widest text-stone-900 focus:outline-none focus:border-stone-900 focus:bg-white"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow transition shrink-0"
                >
                  Verify & Unlock
                </button>
              </div>

              {pinError && (
                <div className="p-2 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-[11px] font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>{pinError}</span>
                </div>
              )}
            </form>
          )}
        </div>
      )}
    </div>
  );
};
