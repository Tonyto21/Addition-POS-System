import React, { useState, useEffect } from 'react';
import { DollarSign, CheckCircle2, AlertCircle, Sun, ArrowRight, X, Clock, RefreshCw } from 'lucide-react';
import { BusinessSettings } from '../types';
import { OfflineStorageManager } from '../utils/storage';

interface DailyExchangeRateModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: BusinessSettings;
  onRateConfirmed: (newRate: number) => void;
}

export const DailyExchangeRateModal: React.FC<DailyExchangeRateModalProps> = ({
  isOpen,
  onClose,
  settings,
  onRateConfirmed,
}) => {
  const [rateInput, setRateInput] = useState<string>(settings.exchangeRate.toString());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRateInput(settings.exchangeRate.toString());
  }, [settings.exchangeRate, isOpen]);

  if (!isOpen) return null;

  const currentRateNum = parseFloat(rateInput) || settings.exchangeRate;

  const handleConfirmNewRate = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(rateInput);
    if (isNaN(val) || val <= 0) {
      setError('Please enter a valid exchange rate greater than 0.');
      return;
    }
    OfflineStorageManager.confirmExchangeRate(val);
    onRateConfirmed(val);
    onClose();
  };

  const handleKeepCurrentRate = () => {
    OfflineStorageManager.confirmExchangeRate(settings.exchangeRate);
    onRateConfirmed(settings.exchangeRate);
    onClose();
  };

  // Sample conversions
  const sample10USD = (10 * currentRateNum).toLocaleString();
  const sample1000LRD = (1000 / currentRateNum).toFixed(2);

  const todayFormatted = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/70 p-3 sm:p-4 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border border-stone-200 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header with Warm Morning Banner */}
        <div className="bg-amber-500 text-stone-950 p-4 sm:p-5 flex items-start justify-between relative">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-stone-950 text-amber-400 flex items-center justify-center shrink-0 shadow-md">
              <Sun className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider bg-stone-950/10 px-2 py-0.5 rounded-full">
                  Daily Shop Opening
                </span>
                <span className="text-[10px] font-bold text-stone-900/80 font-mono">
                  {todayFormatted}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-stone-950 mt-0.5 leading-snug">
                Verify Today&apos;s Exchange Rate
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl bg-black/10 hover:bg-black/20 text-stone-950 transition"
            title="Dismiss for now"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informative Body */}
        <form onSubmit={handleConfirmNewRate} className="p-4 sm:p-5 space-y-4 overflow-y-auto text-xs">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-stone-700 leading-relaxed text-[11px] sm:text-xs">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong className="text-amber-950 font-bold">Good morning!</strong> Market rates in Liberia fluctuate every morning. Setting today&apos;s rate now ensures that all POS checkout prices, dual-currency receipt conversions, and customer change are 100% accurate throughout your day.
              </div>
            </div>
          </div>

          {/* Rate Input Section */}
          <div className="space-y-2">
            <label className="text-stone-800 font-extrabold flex items-center justify-between text-xs">
              <span>Today&apos;s Store Rate:</span>
              <span className="text-[11px] text-stone-500 font-mono font-medium">
                Last recorded: 1 USD = {settings.exchangeRate} LRD
              </span>
            </label>

            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-sm">
                1 USD =
              </div>
              <input
                type="number"
                step="0.5"
                min="1"
                required
                autoFocus
                value={rateInput}
                onChange={(e) => {
                  setRateInput(e.target.value);
                  setError(null);
                }}
                className="w-full pl-20 pr-16 py-3 bg-stone-50 hover:bg-white focus:bg-white border-2 border-stone-300 focus:border-stone-900 rounded-xl text-lg sm:text-xl font-mono font-black text-stone-950 focus:outline-none transition shadow-inner"
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-600 font-bold text-xs font-mono">
                LRD (L$)
              </div>
            </div>

            {error && (
              <p className="text-rose-600 font-bold text-[11px] mt-1">{error}</p>
            )}

            {/* Quick adjust chips */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[11px] text-stone-500 font-medium mr-1">Quick adjust:</span>
              {[
                { label: '-5', delta: -5 },
                { label: '-1', delta: -1 },
                { label: '+1', delta: 1 },
                { label: '+5', delta: 5 },
                { label: 'Set to 195', direct: 195 },
                { label: 'Set to 200', direct: 200 },
              ].map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => {
                    if (chip.direct !== undefined) {
                      setRateInput(chip.direct.toString());
                    } else if (chip.delta !== undefined) {
                      const cur = parseFloat(rateInput) || settings.exchangeRate;
                      setRateInput((cur + chip.delta).toString());
                    }
                  }}
                  className="px-2 py-0.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-mono font-bold text-[10px] rounded-md border border-stone-200 transition"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Real-time Conversion Preview */}
          <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-1.5">
            <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
              Preview conversions at 1 USD = {currentRateNum} LRD
            </div>
            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              <div className="p-2 bg-white rounded-lg border border-stone-200">
                <div className="text-[10px] text-stone-400">$10.00 USD equals</div>
                <div className="font-black text-stone-900 mt-0.5">L$ {sample10USD}</div>
              </div>
              <div className="p-2 bg-white rounded-lg border border-stone-200">
                <div className="text-[10px] text-stone-400">L$ 1,000 LRD equals</div>
                <div className="font-black text-emerald-700 mt-0.5">${sample1000LRD} USD</div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={handleKeepCurrentRate}
              className="w-full sm:w-auto px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-stone-500" />
              <span>Keep Current ({settings.exchangeRate} LRD)</span>
            </button>

            <button
              type="submit"
              className="w-full sm:w-auto px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-extrabold rounded-xl text-xs shadow-sm transition flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
              <span>Confirm & Start Day</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
