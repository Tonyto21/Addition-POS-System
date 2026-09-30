import React, { useState } from 'react';
import {
  Clock,
  Shield,
  CheckCircle2,
  Phone,
  Building2,
  X,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';
import { BusinessSettings, User } from '../types';
import { OfflineStorageManager } from '../utils/storage';

interface TrialInfoModalProps {
  settings: BusinessSettings;
  activeUser: User;
  isOpen: boolean;
  onClose: () => void;
  onOpenLicenseSettings?: () => void;
  onResetTrial?: () => void;
}

export const TrialInfoModal: React.FC<TrialInfoModalProps> = ({
  settings,
  activeUser,
  isOpen,
  onClose,
  onOpenLicenseSettings,
  onResetTrial,
}) => {
  if (!isOpen) return null;

  const [resetSuccess, setResetSuccess] = useState(false);
  const licenseInfo = OfflineStorageManager.getLicenseInfo();
  const isSuperAdmin = activeUser.role === 'superadmin' || activeUser.id === 'usr-super';

  const handleQuickReset = () => {
    OfflineStorageManager.resetTrialPeriod(30);
    setResetSuccess(true);
    onResetTrial?.();
    setTimeout(() => {
      setResetSuccess(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white border border-stone-200 rounded-3xl max-w-md w-full shadow-xl overflow-hidden text-stone-900">
        {/* Header */}
        <div className="p-5 border-b border-stone-150 flex items-center justify-between bg-stone-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-stone-900">
                Store License & Evaluation Status
              </h3>
              <p className="text-[11px] text-stone-500 font-medium">
                Addition POS Commercial Agreement
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-stone-200 text-stone-500 hover:text-stone-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-stone-500 font-bold uppercase text-[10px] tracking-wider">Evaluation Period</span>
              <span
                className={`px-2.5 py-0.5 rounded-full font-black text-[10px] uppercase border ${
                  licenseInfo.isLifetime
                    ? 'bg-purple-100 text-purple-900 border-purple-300'
                    : licenseInfo.isExpired
                    ? 'bg-rose-100 text-rose-900 border-rose-300'
                    : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                }`}
              >
                {licenseInfo.isLifetime
                  ? 'Perpetual Commercial'
                  : licenseInfo.isExpired
                  ? 'Expired'
                  : `${licenseInfo.daysRemaining} Days Remaining`}
              </span>
            </div>

            <div className="flex items-center gap-2 font-bold text-stone-900 text-sm">
              <Building2 className="w-4 h-4 text-stone-600" />
              <span>{licenseInfo.licensedTo}</span>
            </div>

            <p className="text-stone-600 leading-relaxed text-[11px]">
              This software profile is activated for your shop on a 30-day evaluation. Even if you close the browser or your phone shuts down, all transactions, inventories, and your user session remain saved.
            </p>
          </div>

          <div className="border border-stone-200 rounded-2xl p-4 space-y-2">
            <div className="font-bold text-stone-800 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              <span>Full Data Protection Guaranteed</span>
            </div>
            <p className="text-stone-500 text-[11px]">
              Offline-first SQLite/LocalStorage engine ensures your data is never lost when the trial expires.
            </p>
          </div>

          {/* Contact Admin */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3.5 space-y-1.5">
            <span className="text-[10px] font-black uppercase text-amber-900 tracking-wider">
              Developer & License Administrator
            </span>
            <div className="text-stone-700 font-mono text-[11px] space-y-0.5">
              <div><strong>Admin:</strong> Waweru</div>
              <div><strong>Phone / WhatsApp:</strong> +231 77 000 0000</div>
              <div><strong>Email:</strong> {settings.email || 'info@additionbusinesscentre.lr'}</div>
            </div>
          </div>

          {resetSuccess && (
            <div className="p-2.5 bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Trial successfully reset to 30 days!</span>
            </div>
          )}

          {isSuperAdmin && (
            <div className="space-y-2 pt-1 border-t border-stone-200">
              <button
                type="button"
                onClick={handleQuickReset}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-xl shadow transition flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Trial to 30 Days (Start Fresh Today)</span>
              </button>

              {onOpenLicenseSettings && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenLicenseSettings();
                  }}
                  className="w-full py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2"
                >
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  <span>Open Full License & Trial Hub</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
