import React, { useState } from 'react';
import { Store, Save, Check, MapPin, Phone, Mail, FileText, CheckCircle2 } from 'lucide-react';
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
    <form onSubmit={handleSave} className="space-y-4 max-w-4xl mx-auto text-xs">
      {/* Top Banner */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-stone-950">
              Business Profile & Identity
            </h3>
            <p className="text-[11px] text-stone-500">
              Your business trade name, store location, contact details, and receipt slogans.
            </p>
          </div>
        </div>

        {savedSuccess && (
          <div className="px-3.5 py-1.5 bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold rounded-xl flex items-center gap-1.5 animate-fade-in text-xs">
            <Check className="w-4 h-4" />
            <span>Profile Saved!</span>
          </div>
        )}
      </div>

      {/* Main Settings Card */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-6 space-y-4 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1 sm:col-span-2">
            <label className="text-stone-800 font-extrabold text-xs">
              Registered Business / Trade Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-stone-50 border-2 border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-950 text-sm font-black focus:outline-none focus:bg-white focus:border-stone-900 transition"
              placeholder="Addition Business Centre"
            />
            <p className="text-[11px] text-stone-400">
              Appears on printed receipts, mobile title bars, and financial reports.
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-stone-700 font-bold flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-stone-400" />
              <span>Store Contact Numbers</span>
            </label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+231 77 000 0000 / +231 88 000 0000"
              className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 font-mono focus:outline-none focus:bg-white focus:border-stone-900 transition"
            />
          </div>

          <div className="space-y-1">
            <label className="text-stone-700 font-bold flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-stone-400" />
              <span>Business Email Address</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="contact@additionbusiness.com"
              className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:bg-white focus:border-stone-900 transition"
            />
          </div>

          <div className="space-y-1 sm:col-span-2">
            <label className="text-stone-700 font-bold flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-stone-400" />
              <span>Physical Shop Address</span>
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="e.g. Broad Street, Monrovia, Liberia"
              className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:bg-white focus:border-stone-900 transition"
            />
          </div>
        </div>

        {/* Receipt Header & Footer messages */}
        <div className="pt-4 border-t border-stone-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-stone-700 font-bold flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-stone-400" />
              <span>Receipt Header Greeting / Subtitle</span>
            </label>
            <textarea
              rows={3}
              value={formData.receiptHeader}
              onChange={(e) => setFormData({ ...formData, receiptHeader: e.target.value })}
              placeholder="Dealers in Quality Retail, Wholesale & General Provisions"
              className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 font-mono text-xs focus:outline-none focus:bg-white focus:border-stone-900 transition"
            />
          </div>

          <div className="space-y-1">
            <label className="text-stone-700 font-bold flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-stone-400" />
              <span>Receipt Footer Message & Policy</span>
            </label>
            <textarea
              rows={3}
              value={formData.receiptFooter}
              onChange={(e) => setFormData({ ...formData, receiptFooter: e.target.value })}
              placeholder="Thank you for your business! Goods once sold cannot be returned without receipt."
              className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 font-mono text-xs focus:outline-none focus:bg-white focus:border-stone-900 transition"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-stone-100 flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-black text-xs rounded-xl shadow transition flex items-center gap-2"
          >
            <Save className="w-4 h-4 text-amber-400" />
            <span>Save Profile Settings</span>
          </button>
        </div>
      </div>
    </form>
  );
};
