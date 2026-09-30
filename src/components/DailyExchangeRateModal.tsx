import React from 'react';
import { Sun, DollarSign, Settings, CheckCircle2, ArrowRight, X, AlertTriangle } from 'lucide-react';
import { BusinessSettings } from '../types';

interface DailyExchangeRateModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: BusinessSettings;
  onNavigateToSettings: () => void;
  onAcknowledgeKeepRate: () => void;
}

export const DailyExchangeRateModal: React.FC<DailyExchangeRateModalProps> = ({
  isOpen,
  onClose,
  settings,
  onNavigateToSettings,
  onAcknowledgeKeepRate,
}) => {
  if (!isOpen) return null;

  const todayFormatted = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/70 p-3 sm:p-4 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border border-stone-200 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Warm Header Alert Banner */}
        <div className="bg-amber-400 text-stone-950 p-4 sm:p-5 flex items-start justify-between relative">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-stone-950 text-amber-300 flex items-center justify-center shrink-0 shadow-md">
              <Sun className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider bg-stone-950/10 px-2 py-0.5 rounded-full">
                  Morning Alert
                </span>
                <span className="text-[10px] font-bold text-stone-900/80 font-mono">
                  {todayFormatted}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-stone-950 mt-0.5 leading-snug">
                Exchange Rate Daily Check
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-black/10 hover:bg-black/20 text-stone-950 transition"
            title="Dismiss alert"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informative Alert Body */}
        <div className="p-4 sm:p-5 space-y-4 text-xs">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-stone-800 leading-relaxed text-[11px] sm:text-xs">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong className="text-stone-950 font-bold">Good morning!</strong> Market rates in Liberia can change every morning. Please ensure today&apos;s exchange rate matches current market rates before ringing customer sales.
              </div>
            </div>
          </div>

          {/* Current Rate Display Card */}
          <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl text-center space-y-1.5">
            <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
              Current Registered Rate
            </div>
            <div className="text-2xl sm:text-3xl font-mono font-black text-stone-950 tracking-tight">
              1 USD = <span className="text-emerald-700">{settings.exchangeRate}</span> LRD
            </div>
            <p className="text-[11px] text-stone-500">
              Used for POS registers, dual receipts, and cash change calculations.
            </p>
          </div>

          <p className="text-[11px] text-stone-600 leading-relaxed">
            Need to change this rate? You can update it in <strong>Settings → Exchange Rate</strong>.
          </p>

          {/* Action Buttons */}
          <div className="pt-2 border-t border-stone-100 flex flex-col gap-2">
            <button
              type="button"
              onClick={onNavigateToSettings}
              className="w-full py-2.5 px-4 bg-stone-950 hover:bg-stone-800 text-white font-extrabold rounded-xl text-xs shadow-sm transition flex items-center justify-center gap-2"
            >
              <Settings className="w-4 h-4 text-amber-400" />
              <span>Change Rate in Settings</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onAcknowledgeKeepRate}
              className="w-full py-2 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-stone-400" />
              <span>Keep Current Rate ({settings.exchangeRate} LRD)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
