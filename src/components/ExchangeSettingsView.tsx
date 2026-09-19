import React, { useState } from 'react';
import {
  DollarSign,
  Save,
  Check,
  Percent,
  Sun,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { BusinessSettings } from '../types';
import { OfflineStorageManager } from '../utils/storage';
import { DailyExchangeRateModal } from './DailyExchangeRateModal';

interface ExchangeSettingsViewProps {
  settings: BusinessSettings;
  onUpdateSettings: (newSettings: BusinessSettings) => void;
  onRefresh: () => void;
}

export const ExchangeSettingsView: React.FC<ExchangeSettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onRefresh,
}) => {
  const [formData, setFormData] = useState<BusinessSettings>({ ...settings });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [dailyModalOpen, setDailyModalOpen] = useState(false);

  const isVerifiedToday = OfflineStorageManager.isExchangeRateVerifiedToday();
  const lastVerifiedDate = settings.exchangeRateLastConfirmedDate;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    OfflineStorageManager.confirmExchangeRate(formData.exchangeRate);
    const updated = {
      ...formData,
      exchangeRateLastConfirmedDate: new Date().toISOString().split('T')[0],
    };
    OfflineStorageManager.saveSettings(updated);
    setFormData(updated);
    onUpdateSettings(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
    onRefresh();
    window.dispatchEvent(new CustomEvent('app-storage-updated', { detail: { source: 'exchange-save' } }));
  };

  const handleRateConfirmedFromModal = (newRate: number) => {
    const updated = {
      ...formData,
      exchangeRate: newRate,
      exchangeRateLastConfirmedDate: new Date().toISOString().split('T')[0],
    };
    setFormData(updated);
    onUpdateSettings(updated);
    onRefresh();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Preview calculations
  const previewRate = formData.exchangeRate || 195;
  const sample10USD = (10 * previewRate).toLocaleString();
  const sample1000LRD = (1000 / previewRate).toFixed(2);

  return (
    <div className="space-y-4 max-w-4xl mx-auto text-xs">
      {/* Top Banner */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-stone-950">
              Exchange Rate & Currency Configurations
            </h3>
            <p className="text-[11px] text-stone-500">
              Set your store&apos;s daily USD to LRD conversion rate and tax rates.
            </p>
          </div>
        </div>

        {savedSuccess && (
          <div className="px-3.5 py-1.5 bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold rounded-xl flex items-center gap-1.5 animate-fade-in text-xs">
            <Check className="w-4 h-4" />
            <span>Settings Saved!</span>
          </div>
        )}
      </div>

      {/* Daily Morning Verification Card */}
      <div
        className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition shadow-2xs ${
          isVerifiedToday
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
            : 'bg-amber-50 border-amber-300 text-amber-950'
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              isVerifiedToday ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-stone-950'
            }`}
          >
            {isVerifiedToday ? <CheckCircle2 className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm">
                {isVerifiedToday
                  ? "Today's Exchange Rate is Confirmed"
                  : "Daily Morning Rate Review Required"}
              </span>
              <span
                className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  isVerifiedToday
                    ? 'bg-emerald-200 text-emerald-900'
                    : 'bg-amber-200 text-amber-900 animate-pulse'
                }`}
              >
                {isVerifiedToday ? 'Active Today' : 'Action Needed'}
              </span>
            </div>
            <p className="text-[11px] mt-0.5 opacity-80">
              {isVerifiedToday
                ? `Confirmed at 1 USD = ${formData.exchangeRate} LRD for today's trading session.`
                : 'The exchange rate has not been confirmed for today. Verify or adjust it before ringing sales.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setDailyModalOpen(true)}
          className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition shrink-0 ${
            isVerifiedToday
              ? 'bg-white border border-emerald-300 text-emerald-900 hover:bg-emerald-100/50'
              : 'bg-amber-500 hover:bg-amber-600 text-stone-950 shadow-sm'
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>{isVerifiedToday ? 'Change Rate for Today' : 'Verify Today\'s Rate Now'}</span>
        </button>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-6 space-y-5 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-stone-700 font-bold">Primary Base Currency</label>
            <select
              value={formData.primaryCurrency}
              onChange={(e) => setFormData({ ...formData, primaryCurrency: e.target.value as any })}
              className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 font-bold focus:outline-none"
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
              className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 font-bold focus:outline-none"
            >
              <option value="USD">USD ($) - United States Dollar</option>
              <option value="LRD">LRD (L$) - Liberian Dollar</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-stone-700 font-extrabold flex items-center justify-between">
              <span>Exchange Rate *</span>
              <span className="text-stone-400 font-mono text-[10px]">1 USD = ? LRD</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.5"
                min="1"
                required
                value={formData.exchangeRate}
                onChange={(e) =>
                  setFormData({ ...formData, exchangeRate: parseFloat(e.target.value) || 1 })
                }
                className="w-full bg-stone-50 border-2 border-stone-300 rounded-xl px-3 py-2 text-stone-950 font-mono text-base font-black focus:outline-none focus:bg-white focus:border-stone-900 transition"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 font-mono font-bold text-xs">
                LRD
              </span>
            </div>
          </div>
        </div>

        {/* Real-time Calculation Preview */}
        <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-1.5">
          <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
            Active Rate Conversion Check (1 USD = {previewRate} LRD)
          </div>
          <div className="grid grid-cols-2 gap-3 font-mono text-xs">
            <div className="p-2.5 bg-white rounded-xl border border-stone-200">
              <div className="text-[10px] text-stone-400">$10.00 USD converts to:</div>
              <div className="font-black text-stone-900 text-sm mt-0.5">L$ {sample10USD} LRD</div>
            </div>
            <div className="p-2.5 bg-white rounded-xl border border-stone-200">
              <div className="text-[10px] text-stone-400">L$ 1,000 LRD converts to:</div>
              <div className="font-black text-emerald-700 text-sm mt-0.5">${sample1000LRD} USD</div>
            </div>
          </div>
        </div>

        {/* Tax Switch Section */}
        <div className="pt-4 border-t border-stone-100 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-extrabold text-stone-900 text-xs">Sales Tax / GST Switch</span>
              <p className="text-[11px] text-stone-500">
                Automatically calculate and append government tax on applicable items during checkout
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.taxEnabled}
                onChange={(e) => setFormData({ ...formData, taxEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {formData.taxEnabled && (
            <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-xl max-w-sm space-y-1.5 animate-fade-in">
              <label className="text-stone-700 font-bold flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-blue-600" />
                <span>Tax Rate Percentage (%)</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={formData.taxRatePercent}
                  onChange={(e) =>
                    setFormData({ ...formData, taxRatePercent: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-stone-900 font-mono font-bold text-xs focus:outline-none focus:border-blue-600"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 font-bold font-mono">
                  %
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-stone-100 flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-black text-xs rounded-xl shadow transition flex items-center gap-2"
          >
            <Save className="w-4 h-4 text-amber-400" />
            <span>Save Currency Settings</span>
          </button>
        </div>
      </form>

      {/* Daily Modal */}
      <DailyExchangeRateModal
        isOpen={dailyModalOpen}
        onClose={() => setDailyModalOpen(false)}
        settings={settings}
        onRateConfirmed={handleRateConfirmedFromModal}
      />
    </div>
  );
};
