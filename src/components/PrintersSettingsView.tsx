import React, { useState } from 'react';
import { Printer, Save, Check, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';
import { BusinessSettings } from '../types';
import { OfflineStorageManager } from '../utils/storage';

interface PrintersSettingsViewProps {
  settings: BusinessSettings;
  onUpdateSettings: (newSettings: BusinessSettings) => void;
  onRefresh: () => void;
}

export const PrintersSettingsView: React.FC<PrintersSettingsViewProps> = ({
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
    window.dispatchEvent(new CustomEvent('app-storage-updated', { detail: { source: 'printer-save' } }));
  };

  const handleTestPrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto text-xs">
      {/* Top Banner */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-stone-950">
              Thermal Printers & Receipt Setup
            </h3>
            <p className="text-[11px] text-stone-500">
              Configure 58mm / 80mm ESC/POS roll widths, stock alert levels, and receipt layout.
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Settings Form */}
        <form onSubmit={handleSave} className="md:col-span-2 bg-white border border-stone-200 rounded-2xl p-4 sm:p-6 space-y-4 shadow-2xs">
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-stone-700 font-bold">Default Thermal Paper Roll Size</label>
              <select
                value={formData.defaultThermalPaperSize}
                onChange={(e) =>
                  setFormData({ ...formData, defaultThermalPaperSize: e.target.value as any })
                }
                className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2.5 text-stone-900 font-bold focus:outline-none focus:bg-white"
              >
                <option value="58mm">58mm (2-inch) Mini POS Thermal Roll (Handheld & Mobile Bluetooth)</option>
                <option value="80mm">80mm (3-inch) Standard Countertop ESC/POS Printer</option>
              </select>
              <p className="text-[11px] text-stone-400">
                58mm is best for mobile phone Bluetooth printers. 80mm is best for countertop USB / Ethernet printers.
              </p>
            </div>

            <div className="space-y-1 pt-2">
              <label className="text-stone-700 font-bold">Default Low Stock Alert Threshold</label>
              <input
                type="number"
                min="1"
                value={formData.lowStockThresholdDefault}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    lowStockThresholdDefault: parseInt(e.target.value) || 5,
                  })
                }
                className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 font-mono font-bold focus:outline-none focus:bg-white"
              />
              <p className="text-[11px] text-stone-400">
                Items falling below this quantity trigger red low-stock alert chips across POS and inventory.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
            <button
              type="button"
              onClick={handleTestPrint}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-xl flex items-center gap-1.5 transition"
            >
              <Printer className="w-3.5 h-3.5 text-stone-600" />
              <span>Test Print Dialog</span>
            </button>

            <button
              type="submit"
              className="px-6 py-2 bg-stone-900 hover:bg-stone-800 text-white font-black text-xs rounded-xl shadow transition flex items-center gap-1.5"
            >
              <Save className="w-4 h-4 text-amber-400" />
              <span>Save Printer Settings</span>
            </button>
          </div>
        </form>

        {/* Live Thermal Receipt Preview */}
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-2.5">
          <div className="font-extrabold text-stone-900 flex items-center gap-1.5 border-b border-stone-200 pb-2">
            <FileText className="w-4 h-4 text-stone-600" />
            <span>Thermal Receipt Mockup</span>
          </div>

          <div className="bg-white border border-stone-300 rounded-xl p-3 shadow-inner font-mono text-[10px] space-y-2 text-stone-800 leading-tight max-w-[220px] mx-auto text-center">
            <div className="font-black text-xs uppercase">{formData.name}</div>
            <div className="text-[9px] text-stone-500">{formData.address || 'Monrovia, Liberia'}</div>
            <div className="text-[9px] text-stone-500">{formData.phone || '+231 77 000 0000'}</div>
            {formData.receiptHeader && (
              <div className="text-[9px] italic text-stone-600 border-t border-dashed border-stone-300 pt-1">
                {formData.receiptHeader}
              </div>
            )}

            <div className="border-t border-b border-dashed border-stone-300 py-1 text-left space-y-0.5">
              <div className="flex justify-between">
                <span>1x Mineral Water</span>
                <span>L$ 150</span>
              </div>
              <div className="flex justify-between text-stone-400 text-[8px]">
                <span>Rate: 1 USD = {formData.exchangeRate} LRD</span>
                <span>$0.77</span>
              </div>
            </div>

            <div className="font-bold flex justify-between text-stone-950">
              <span>TOTAL (LRD):</span>
              <span>L$ 150</span>
            </div>

            {formData.receiptFooter && (
              <div className="text-[9px] text-stone-500 border-t border-dashed border-stone-300 pt-1">
                {formData.receiptFooter}
              </div>
            )}
            <div className="text-[8px] text-stone-400">--- END OF RECEIPT ---</div>
          </div>
        </div>
      </div>
    </div>
  );
};
