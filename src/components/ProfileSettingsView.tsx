import React, { useState } from 'react';
import {
  Store,
  Save,
  Check,
  MapPin,
  Phone,
  Mail,
  FileText,
  CheckCircle2,
  Moon,
  Sun,
  Palette,
} from 'lucide-react';
import { BusinessSettings } from '../types';
import { OfflineStorageManager } from '../utils/storage';

interface ProfileSettingsViewProps {
  settings: BusinessSettings;
  onUpdateSettings: (newSettings: BusinessSettings) => void;
  onRefresh: () => void;
}

export const ProfileSettingsView: React.FC<ProfileSettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onRefresh,
}) => {
  const [formData, setFormData] = useState<BusinessSettings>({ ...settings });
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleToggleTheme = (enableDark: boolean) => {
    const updated = OfflineStorageManager.setDarkMode(enableDark);
    setFormData({ ...updated });
    onUpdateSettings(updated);
    onRefresh();
    window.dispatchEvent(
      new CustomEvent('app-storage-updated', { detail: { source: 'theme-toggle', darkMode: enableDark } })
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    OfflineStorageManager.saveSettings(formData);
    onUpdateSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
    onRefresh();
    window.dispatchEvent(new CustomEvent('app-storage-updated', { detail: { source: 'profile-save' } }));
  };

  return (
    <form onSubmit={handleSave} className="space-y-4 max-w-4xl mx-auto text-xs pb-12">
      {/* Top Banner */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 flex items-center justify-center font-bold">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-stone-950 dark:text-stone-100">
              Business Profile & Identity
            </h3>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              Your business trade name, store location, appearance theme, and receipt slogans.
            </p>
          </div>
        </div>

        {savedSuccess && (
          <div className="px-3.5 py-1.5 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 font-bold rounded-xl flex items-center gap-1.5 animate-fade-in text-xs">
            <Check className="w-4 h-4" />
            <span>Profile Saved!</span>
          </div>
        )}
      </div>

      {/* Theme & Dark Mode Selector Card (Directly in Settings as requested) */}
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

      {/* Main Settings Card */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 sm:p-6 space-y-4 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1 sm:col-span-2">
            <label className="text-stone-800 dark:text-stone-200 font-extrabold text-xs">
              Registered Business / Trade Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-stone-50 dark:bg-stone-800 border-2 border-stone-300 dark:border-stone-700 rounded-xl px-3.5 py-2.5 text-stone-950 dark:text-stone-100 text-sm font-black focus:outline-none focus:bg-white dark:focus:bg-stone-900 focus:border-stone-900 dark:focus:border-stone-400 transition"
              placeholder="Addition Business Centre"
            />
            <p className="text-[11px] text-stone-400">
              Appears on printed receipts, mobile title bars, and financial reports.
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-stone-700 dark:text-stone-300 font-bold flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-stone-400" />
              <span>Store Contact Numbers</span>
            </label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+231 77 000 0000 / +231 88 000 0000"
              className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl px-3 py-2 text-stone-900 dark:text-stone-100 font-mono focus:outline-none focus:bg-white dark:focus:bg-stone-900 focus:border-stone-900 dark:focus:border-stone-400 transition"
            />
          </div>

          <div className="space-y-1">
            <label className="text-stone-700 dark:text-stone-300 font-bold flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-stone-400" />
              <span>Business Email Address</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="contact@additionbusiness.com"
              className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl px-3 py-2 text-stone-900 dark:text-stone-100 focus:outline-none focus:bg-white dark:focus:bg-stone-900 focus:border-stone-900 dark:focus:border-stone-400 transition"
            />
          </div>

          <div className="space-y-1 sm:col-span-2">
            <label className="text-stone-700 dark:text-stone-300 font-bold flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-stone-400" />
              <span>Physical Shop Address</span>
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="e.g. Broad Street, Monrovia, Liberia"
              className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl px-3 py-2 text-stone-900 dark:text-stone-100 focus:outline-none focus:bg-white dark:focus:bg-stone-900 focus:border-stone-900 dark:focus:border-stone-400 transition"
            />
          </div>
        </div>

        {/* Receipt Header & Footer messages */}
        <div className="pt-4 border-t border-stone-100 dark:border-stone-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-stone-700 dark:text-stone-300 font-bold flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-stone-400" />
              <span>Receipt Header Greeting / Subtitle</span>
            </label>
            <textarea
              rows={3}
              value={formData.receiptHeader}
              onChange={(e) => setFormData({ ...formData, receiptHeader: e.target.value })}
              placeholder="Dealers in Quality Retail, Wholesale & General Provisions"
              className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl px-3 py-2 text-stone-900 dark:text-stone-100 font-mono text-xs focus:outline-none focus:bg-white dark:focus:bg-stone-900 focus:border-stone-900 dark:focus:border-stone-400 transition"
            />
          </div>

          <div className="space-y-1">
            <label className="text-stone-700 dark:text-stone-300 font-bold flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-stone-400" />
              <span>Receipt Footer Message & Policy</span>
            </label>
            <textarea
              rows={3}
              value={formData.receiptFooter}
              onChange={(e) => setFormData({ ...formData, receiptFooter: e.target.value })}
              placeholder="Thank you for your business! Goods once sold cannot be returned without receipt."
              className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl px-3 py-2 text-stone-900 dark:text-stone-100 font-mono text-xs focus:outline-none focus:bg-white dark:focus:bg-stone-900 focus:border-stone-900 dark:focus:border-stone-400 transition"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-white text-white dark:text-stone-950 font-black text-xs rounded-xl shadow transition flex items-center gap-2"
          >
            <Save className="w-4 h-4 text-amber-400 dark:text-amber-600" />
            <span>Save Profile Settings</span>
          </button>
        </div>
      </div>
    </form>
  );
};
