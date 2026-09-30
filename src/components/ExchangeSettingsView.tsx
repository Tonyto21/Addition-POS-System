import React, { useState, useRef, useEffect } from 'react';
import {
  DollarSign,
  Save,
  CheckCircle2,
  Percent,
  Plus,
  Minus,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { BusinessSettings } from '../types';
import { OfflineStorageManager } from '../utils/storage';
import { CloudSyncManager } from '../utils/cloudSync';

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
  const [rateInput, setRateInput] = useState<string>(String(settings.exchangeRate || 195));
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Track if user is actively editing so background polling won't clobber what they type
  const isEditingRef = useRef(false);
  const lastSavedRateRef = useRef(settings.exchangeRate || 195);
  const rateInputRef = useRef<HTMLInputElement>(null);

  // Sync settings when external props genuinely change AND user is not actively typing
  useEffect(() => {
    if (!isEditingRef.current) {
      setFormData({ ...settings });
      setRateInput(String(settings.exchangeRate || 195));
      lastSavedRateRef.current = settings.exchangeRate || 195;
    }
  }, [settings.exchangeRate, settings.primaryCurrency, settings.secondaryCurrency, settings.taxEnabled, settings.taxRatePercent]);

  const handleRateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    isEditingRef.current = true;
    setErrorMessage(null);
    const value = e.target.value;
    // Allow empty string or valid positive numbers/decimals
    if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) {
      setRateInput(value);
    }
  };

  const handleQuickPreset = (presetRate: number) => {
    isEditingRef.current = true;
    setErrorMessage(null);
    setRateInput(String(presetRate));
    if (rateInputRef.current) {
      rateInputRef.current.focus();
    }
  };

  const handleIncrement = (amount: number) => {
    isEditingRef.current = true;
    setErrorMessage(null);
    const currentNum = parseFloat(rateInput) || settings.exchangeRate || 195;
    const nextNum = Math.max(1, Math.round((currentNum + amount) * 100) / 100);
    setRateInput(String(nextNum));
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    const rateNum = parseFloat(rateInput);
    if (isNaN(rateNum) || rateNum <= 0) {
      setErrorMessage('Please enter a valid positive exchange rate (e.g., 195).');
      rateInputRef.current?.focus();
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const nowIso = new Date().toISOString();

    const updated: BusinessSettings = {
      ...formData,
      exchangeRate: rateNum,
      exchangeRateLastConfirmedDate: today,
      lastExchangeRateReviewDate: today,
      updatedAt: nowIso,
    };

    // 1. Save to local storage (which automatically recalculates all product prices in catalog)
    OfflineStorageManager.saveSettings(updated);
    OfflineStorageManager.recalculateProductPrices(rateNum);

    // 2. Mark editing finished and sync state
    isEditingRef.current = false;
    lastSavedRateRef.current = rateNum;
    setFormData(updated);
    setRateInput(String(rateNum));

    // 3. Notify parent components
    onUpdateSettings(updated);
    onRefresh();

    // 4. Trigger cloud sync push immediately
    CloudSyncManager.triggerPush();

    // 5. Visual success feedback
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
    }, 4000);
  };

  // Safe numerical calculations for preview
  const parsedRate = parseFloat(rateInput) > 0 ? parseFloat(rateInput) : (formData.exchangeRate || 195);
  const sample10USD = Math.round(10 * parsedRate).toLocaleString();
  const sample50USD = Math.round(50 * parsedRate).toLocaleString();
  const sample1000LRD = (1000 / parsedRate).toFixed(2);

  const presets = [190, 195, 200, 205, 210];

  return (
    <div className="space-y-4 max-w-4xl mx-auto text-xs pb-10">
      {/* Top Banner */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-extrabold text-stone-950">
                Exchange Rate & Currency Configurations
              </h3>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-stone-100 border border-stone-200 font-mono font-black text-[11px] text-stone-800">
                Active: 1 USD = {formData.exchangeRate} LRD
              </span>
            </div>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Set your store&apos;s daily USD to LRD conversion rate and checkout tax settings.
            </p>
          </div>
        </div>

        {savedSuccess && (
          <div className="px-3.5 py-2 bg-emerald-100 border border-emerald-300 text-emerald-900 font-black rounded-xl flex items-center gap-2 animate-fade-in text-xs shadow-xs shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>Saved! 1 USD = {formData.exchangeRate} LRD</span>
          </div>
        )}
      </div>

      {/* Error alert if invalid */}
      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 rounded-xl text-xs font-bold animate-fade-in flex items-center justify-between">
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-600 hover:text-rose-900 font-extrabold text-xs ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-6 space-y-6 shadow-2xs">
        
        {/* Exchange Rate Card */}
        <div className="p-4 sm:p-5 bg-stone-50 border border-stone-200 rounded-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <label htmlFor="daily-exchange-rate-input" className="text-stone-950 font-black text-sm block">
                Today&apos;s Exchange Rate (USD → LRD) *
              </label>
              <p className="text-[11px] text-stone-500">
                Enter how many Liberian Dollars (LRD) equal 1 US Dollar. Updates all item dual-prices automatically.
              </p>
            </div>
            <div className="text-[11px] font-mono text-stone-600 bg-white px-2.5 py-1 rounded-lg border border-stone-200 inline-flex items-center gap-1.5 self-start sm:self-auto font-bold">
              <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
              <span>Base Formula: 1 USD = {parsedRate} LRD</span>
            </div>
          </div>

          {/* Rate Input Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-mono font-bold text-sm select-none">
                1 USD =
              </div>
              <input
                ref={rateInputRef}
                id="daily-exchange-rate-input"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                required
                value={rateInput}
                onChange={handleRateInputChange}
                onFocus={() => {
                  isEditingRef.current = true;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSave();
                  }
                }}
                placeholder="e.g. 195"
                className="w-full pl-20 pr-14 py-3 bg-white border-2 border-stone-300 focus:border-stone-950 rounded-xl text-stone-950 font-mono text-xl font-black focus:outline-none transition shadow-inner"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-500 font-mono font-extrabold text-xs select-none">
                LRD
              </span>
            </div>

            {/* Step buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleIncrement(-1)}
                className="px-3 py-3 bg-white hover:bg-stone-100 border border-stone-300 rounded-xl text-stone-800 font-bold font-mono text-xs flex items-center gap-1 transition active:scale-95 shadow-2xs"
                title="Decrease rate by 1 LRD"
              >
                <Minus className="w-3.5 h-3.5" />
                <span>1</span>
              </button>
              <button
                type="button"
                onClick={() => handleIncrement(1)}
                className="px-3 py-3 bg-white hover:bg-stone-100 border border-stone-300 rounded-xl text-stone-800 font-bold font-mono text-xs flex items-center gap-1 transition active:scale-95 shadow-2xs"
                title="Increase rate by 1 LRD"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>1</span>
              </button>
              <button
                type="button"
                onClick={() => handleIncrement(5)}
                className="px-3 py-3 bg-white hover:bg-stone-100 border border-stone-300 rounded-xl text-stone-800 font-bold font-mono text-xs flex items-center gap-1 transition active:scale-95 shadow-2xs"
                title="Increase rate by 5 LRD"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>5</span>
              </button>
            </div>
          </div>

          {/* Quick preset chips */}
          <div className="flex items-center flex-wrap gap-2 pt-1">
            <span className="text-[11px] font-bold text-stone-500">Quick Rates:</span>
            {presets.map((preset) => {
              const isSelected = parsedRate === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleQuickPreset(preset)}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition ${
                    isSelected
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'bg-white hover:bg-stone-200 border border-stone-300 text-stone-700'
                  }`}
                >
                  {preset} LRD
                </button>
              );
            })}
          </div>

          {/* Real-time Conversion Preview Check */}
          <div className="pt-2 border-t border-stone-200/70">
            <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2">
              Conversion Preview (at 1 USD = {parsedRate} LRD)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 font-mono text-xs">
              <div className="p-2.5 bg-white rounded-xl border border-stone-200">
                <div className="text-[10px] text-stone-400">$10.00 USD converts to:</div>
                <div className="font-black text-stone-900 text-sm mt-0.5">L$ {sample10USD} LRD</div>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-stone-200">
                <div className="text-[10px] text-stone-400">$50.00 USD converts to:</div>
                <div className="font-black text-stone-900 text-sm mt-0.5">L$ {sample50USD} LRD</div>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-stone-200">
                <div className="text-[10px] text-stone-400">L$ 1,000 LRD converts to:</div>
                <div className="font-black text-emerald-700 text-sm mt-0.5">${sample1000LRD} USD</div>
              </div>
            </div>
          </div>
        </div>

        {/* Currency Pair Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-stone-800 font-bold block">Primary Store Currency</label>
            <select
              value={formData.primaryCurrency}
              onChange={(e) => {
                isEditingRef.current = true;
                setFormData({ ...formData, primaryCurrency: e.target.value as any });
              }}
              className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2.5 text-stone-900 font-bold focus:outline-none focus:border-stone-900 transition"
            >
              <option value="LRD">LRD (L$) - Liberian Dollar (Standard)</option>
              <option value="USD">USD ($) - United States Dollar</option>
            </select>
            <p className="text-[10px] text-stone-500">Default currency displayed first on receipts and total banners.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-stone-800 font-bold block">Secondary Dual Currency</label>
            <select
              value={formData.secondaryCurrency}
              onChange={(e) => {
                isEditingRef.current = true;
                setFormData({ ...formData, secondaryCurrency: e.target.value as any });
              }}
              className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2.5 text-stone-900 font-bold focus:outline-none focus:border-stone-900 transition"
            >
              <option value="USD">USD ($) - United States Dollar</option>
              <option value="LRD">LRD (L$) - Liberian Dollar</option>
            </select>
            <p className="text-[10px] text-stone-500">Currency shown alongside for split payments and customer change.</p>
          </div>
        </div>

        {/* Action button & save feedback */}
        <div className="pt-4 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          {savedSuccess ? (
            <div className="flex items-center gap-2 text-emerald-800 bg-emerald-50 border border-emerald-300 px-4 py-2.5 rounded-xl text-xs font-black animate-fade-in w-full sm:w-auto">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Currency settings saved! 1 USD = {formData.exchangeRate} LRD applied to all POS registers and products.</span>
            </div>
          ) : (
            <div className="text-[11px] text-stone-500">
              Click below to save. All prices across POS registers, dual receipts, and inventory recalculate immediately.
            </div>
          )}

          <button
            type="submit"
            id="save-currency-settings-btn"
            className="w-full sm:w-auto px-8 py-3 bg-stone-950 hover:bg-stone-800 active:bg-black text-white font-black text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2.5 shrink-0"
          >
            <Save className="w-4 h-4 text-amber-400" />
            <span>Save Currency Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};
