import React, { useState } from 'react';
import {
  Lock,
  Clock,
  Shield,
  Phone,
  MessageCircle,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  Building2,
  RefreshCw,
} from 'lucide-react';
import { User, BusinessSettings } from '../types';
import { OfflineStorageManager } from '../utils/storage';

interface TrialExpiredLockModalProps {
  settings: BusinessSettings;
  users: User[];
  onSuperAdminUnlock: (superAdminUser: User) => void;
  onResetTrialSuccess?: () => void;
}

export const TrialExpiredLockModal: React.FC<TrialExpiredLockModalProps> = ({
  settings,
  users,
  onSuperAdminUnlock,
  onResetTrialSuccess,
}) => {
  const [showPinAuth, setShowPinAuth] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');

  const superAdminUser = users.find((u) => u.role === 'superadmin' || u.id === 'usr-super') || {
    id: 'usr-super',
    name: 'Super Admin (Master)',
    username: 'superadmin',
    role: 'superadmin' as const,
    isActive: true,
    pin: '1234',
    allowedModules: ['pos', 'inventory', 'orders', 'reports', 'settings'] as any,
  };

  const handleVerifySuperAdmin = (e?: React.FormEvent, resetDirectly: boolean = false) => {
    if (e) e.preventDefault();
    const correctPin = superAdminUser.pin || '1234';
    if (pin.trim() === correctPin) {
      setPinError('');
      if (resetDirectly) {
        OfflineStorageManager.resetTrialPeriod(30);
        onResetTrialSuccess?.();
      }
      onSuperAdminUnlock(superAdminUser as User);
    } else {
      setPinError('Incorrect Super Admin PIN passcode. Please try again.');
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white border-2 border-rose-300 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden animate-fade-in text-stone-900">
        {/* Top Lock Banner */}
        <div className="bg-gradient-to-r from-rose-600 to-amber-600 p-6 text-white text-center relative">
          <div className="w-16 h-16 rounded-2xl bg-white/20 border border-white/30 backdrop-blur-sm mx-auto flex items-center justify-center mb-3 shadow-inner">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-black tracking-tight">
            30-Day Evaluation Expired
          </h2>
          <p className="text-xs text-rose-100 mt-1 font-medium">
            Addition POS Client Evaluation Period
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 text-xs">
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 font-bold text-stone-800 text-sm">
              <Building2 className="w-4 h-4 text-stone-600" />
              <span>{settings.licensedTo || settings.name}</span>
            </div>
            <p className="text-stone-600 leading-relaxed">
              Your one-month evaluation period for this store has ended. All your sales records, cash drawer receipts, customer debt books, and catalog stocks remain <strong className="text-stone-900">100% safe, saved, and preserved</strong> on this device.
            </p>
          </div>

          {/* Contact Developer / Admin */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center gap-2 font-black text-amber-900 text-xs uppercase tracking-wider">
              <Phone className="w-3.5 h-3.5" />
              <span>To Renew or Extend Your License:</span>
            </div>
            <p className="text-amber-800 text-[11px] leading-relaxed">
              Please contact your system administrator / developer to grant your shop an extension or commercial license:
            </p>
            <div className="bg-white/80 rounded-xl p-2.5 border border-amber-200/80 space-y-1 font-mono text-[11px]">
              <div className="text-stone-700"><strong>Administrator:</strong> Waweru</div>
              <div className="text-stone-700"><strong>Phone / WhatsApp:</strong> +231 77 000 0000</div>
              <div className="text-stone-700"><strong>Email:</strong> {settings.email || 'info@additionbusinesscentre.lr'}</div>
            </div>
          </div>

          {/* Super Admin Unlock Trigger */}
          {!showPinAuth ? (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowPinAuth(true)}
                className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white font-black text-xs rounded-xl shadow transition flex items-center justify-center gap-2"
              >
                <Shield className="w-4 h-4 text-amber-400" />
                <span>Developer / Super Admin Unlock</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleVerifySuperAdmin} className="space-y-3 pt-2 border-t border-stone-200">
              <div className="flex items-center justify-between">
                <label className="font-extrabold text-stone-800 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-stone-600" />
                  <span>Enter Super Admin PIN:</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowPinAuth(false)}
                  className="text-[10px] text-stone-500 hover:text-stone-800 font-bold underline"
                >
                  Cancel
                </button>
              </div>

              <input
                type="password"
                maxLength={6}
                autoFocus
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                className="w-full bg-stone-100 border border-stone-300 rounded-xl px-4 py-2.5 text-center text-lg font-mono font-black tracking-widest text-stone-900 focus:outline-none focus:border-stone-900 focus:bg-white transition"
              />

              {pinError && (
                <div className="p-2 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-[11px] font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>{pinError}</span>
                </div>
              )}

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleVerifySuperAdmin(undefined, true)}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-xl shadow transition flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Reset 30-Day Trial & Enter App</span>
                </button>

                <button
                  type="submit"
                  className="w-full py-2 bg-stone-900 hover:bg-stone-800 text-stone-100 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2"
                >
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  <span>Open Master License Hub</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
