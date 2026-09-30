import React, { useState } from 'react';
import {
  Percent,
  Receipt,
  Building2,
  ShieldCheck,
  CheckCircle2,
  Save,
  HelpCircle,
  FileText,
  Calculator,
  AlertCircle,
  Users,
} from 'lucide-react';
import { BusinessSettings, Customer } from '../types';
import { OfflineStorageManager } from '../utils/storage';

interface TaxSettingsViewProps {
  settings: BusinessSettings;
  onUpdateSettings: (newSettings: BusinessSettings) => void;
  onRefresh: () => void;
}

export const TaxSettingsView: React.FC<TaxSettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onRefresh,
}) => {
  const [formData, setFormData] = useState<BusinessSettings>({
    ...settings,
    taxName: settings.taxName || 'GST',
    taxRatePercent: typeof settings.taxRatePercent === 'number' ? settings.taxRatePercent : 10,
    taxCalculationType: settings.taxCalculationType || 'EXCLUSIVE',
    storeTIN: settings.storeTIN || 'TIN-LIB-770921',
  });

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [customers] = useState<Customer[]>(() => OfflineStorageManager.getCustomers());

  const exemptCustomers = customers.filter((c) => c.taxExempt);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: BusinessSettings = {
      ...formData,
      taxName: (formData.taxName || 'GST').trim(),
      taxRatePercent: Math.max(0, Number(formData.taxRatePercent) || 0),
      storeTIN: (formData.storeTIN || '').trim(),
      taxCalculationType: formData.taxCalculationType === 'INCLUSIVE' ? 'INCLUSIVE' : 'EXCLUSIVE',
      updatedAt: new Date().toISOString(),
    };

    OfflineStorageManager.saveSettings(updated);
    onUpdateSettings(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
    onRefresh();
  };

  // Interactive preview simulation for a sample $10.00 item
  const sampleAmount = 10.0;
  const rate = formData.taxRatePercent || 0;
  let previewTax = 0;
  let previewTotal = sampleAmount;
  let previewNetBase = sampleAmount;

  if (formData.taxEnabled && rate > 0) {
    if (formData.taxCalculationType === 'INCLUSIVE') {
      const factor = 1 + rate / 100;
      previewNetBase = Math.round((sampleAmount / factor) * 100) / 100;
      previewTax = Math.round((sampleAmount - previewNetBase) * 100) / 100;
      previewTotal = sampleAmount;
    } else {
      previewNetBase = sampleAmount;
      previewTax = Math.round((sampleAmount * (rate / 100)) * 100) / 100;
      previewTotal = Math.round((sampleAmount + previewTax) * 100) / 100;
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/80 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-700 dark:text-purple-300">
              <Percent className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-black text-stone-900 dark:text-white">
              Tax & Fiscal Compliance (GST / VAT)
            </h2>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Configure store tax regimes, Tax Identification Numbers (TIN), statutory rates, and receipt tax snapshots.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${
              formData.taxEnabled
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-stone-300 dark:border-stone-700'
            }`}
          >
            {formData.taxEnabled ? 'Tax Engine ACTIVE' : 'Tax Engine DISABLED'}
          </span>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Master Tax Engine Switch & Identification */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800">
            <div>
              <h3 className="text-sm font-black text-stone-900 dark:text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-purple-600" />
                Enable Tax & VAT Calculation
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                When enabled, the POS automatically applies and itemizes tax on taxable items.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.taxEnabled}
                onChange={(e) => setFormData({ ...formData, taxEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-12 h-6.5 bg-stone-200 dark:bg-stone-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5.5 after:w-5.5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Store Tax Identification Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Store TIN (Tax Identification Number)</span>
              </label>
              <input
                type="text"
                value={formData.storeTIN || ''}
                onChange={(e) => setFormData({ ...formData, storeTIN: e.target.value })}
                placeholder="e.g. TIN-LIB-770921"
                className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-xl px-3.5 py-2.5 text-stone-900 dark:text-white font-mono font-bold text-xs focus:outline-none focus:border-purple-600"
              />
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Printed prominently on customer thermal receipts and invoices for tax authority audits.
              </p>
            </div>

            {/* Statutory Tax Label */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-purple-600" />
                <span>Tax Name / Statutory Label</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.taxName || 'GST'}
                  onChange={(e) => setFormData({ ...formData, taxName: e.target.value })}
                  placeholder="GST, VAT, Sales Tax"
                  className="flex-1 bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-xl px-3.5 py-2.5 text-stone-900 dark:text-white font-bold text-xs focus:outline-none focus:border-purple-600"
                />
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, taxName: 'GST' })}
                  className="px-2.5 py-1 text-xs font-bold bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-lg border border-stone-300 dark:border-stone-700"
                >
                  GST
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, taxName: 'VAT' })}
                  className="px-2.5 py-1 text-xs font-bold bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-lg border border-stone-300 dark:border-stone-700"
                >
                  VAT
                </button>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                The label that appears on receipts, invoices, and reports (e.g., &quot;GST&quot; or &quot;VAT&quot;).
              </p>
            </div>
          </div>
        </div>

        {/* Tax Rate & Calculation Regime */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-xs space-y-5">
          <h3 className="text-sm font-black text-stone-900 dark:text-white flex items-center gap-2">
            <Calculator className="w-4 h-4 text-purple-600" />
            Tax Rate & Calculation Regime
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Rate Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-purple-600" />
                <span>Standard Tax Rate Percentage (%)</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={formData.taxRatePercent}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      taxRatePercent: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-xl px-3.5 py-2.5 text-stone-900 dark:text-white font-mono font-black text-sm focus:outline-none focus:border-purple-600"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-bold font-mono">
                  %
                </span>
              </div>
              <div className="flex gap-2 pt-1">
                {[5, 7.5, 10, 15, 18].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setFormData({ ...formData, taxRatePercent: preset })}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition border ${
                      formData.taxRatePercent === preset
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700'
                    }`}
                  >
                    {preset}%
                  </button>
                ))}
              </div>
            </div>

            {/* Calculation Regime: Exclusive vs Inclusive */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                Tax Pricing Regime
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, taxCalculationType: 'EXCLUSIVE' })}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                    formData.taxCalculationType === 'EXCLUSIVE'
                      ? 'border-purple-600 bg-purple-50/60 dark:bg-purple-950/40 text-purple-950 dark:text-purple-200 font-bold'
                      : 'border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-stone-600 dark:text-stone-400'
                  }`}
                >
                  <span className="text-xs font-black">TAX-EXCLUSIVE</span>
                  <span className="text-[10px] text-stone-500 dark:text-stone-400 mt-1 leading-snug">
                    Shelf prices are Net. Tax is added on top of the subtotal at checkout.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, taxCalculationType: 'INCLUSIVE' })}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                    formData.taxCalculationType === 'INCLUSIVE'
                      ? 'border-purple-600 bg-purple-50/60 dark:bg-purple-950/40 text-purple-950 dark:text-purple-200 font-bold'
                      : 'border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-stone-600 dark:text-stone-400'
                  }`}
                >
                  <span className="text-xs font-black">TAX-INCLUSIVE</span>
                  <span className="text-[10px] text-stone-500 dark:text-stone-400 mt-1 leading-snug">
                    Shelf prices already include tax. The system extracts embedded tax.
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Live Calculation Simulator */}
          <div className="p-4 bg-stone-50 dark:bg-stone-950/80 rounded-xl border border-stone-200 dark:border-stone-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-stone-700 dark:text-stone-300">
              <span className="flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-purple-500" />
                Live Calculation Preview for a $10.00 Item:
              </span>
              <span className="text-[11px] font-mono text-purple-600 dark:text-purple-400">
                Regime: {formData.taxCalculationType} ({formData.taxRatePercent}%)
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center pt-1 font-mono text-xs">
              <div className="p-2 bg-white dark:bg-stone-900 rounded-lg border border-stone-200 dark:border-stone-800">
                <div className="text-[10px] text-stone-500 font-sans">Net Base</div>
                <div className="font-bold text-stone-900 dark:text-white">${previewNetBase.toFixed(2)}</div>
              </div>
              <div className="p-2 bg-white dark:bg-stone-900 rounded-lg border border-stone-200 dark:border-stone-800">
                <div className="text-[10px] text-stone-500 font-sans">{formData.taxName || 'GST'} Amount</div>
                <div className="font-bold text-purple-600 dark:text-purple-400">+${previewTax.toFixed(2)}</div>
              </div>
              <div className="p-2 bg-white dark:bg-stone-900 rounded-lg border border-stone-200 dark:border-stone-800">
                <div className="text-[10px] text-stone-500 font-sans">Customer Pays</div>
                <div className="font-black text-emerald-600 dark:text-emerald-400">${previewTotal.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Tax Exemption & Fiscal Audit Summary */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-stone-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Tax Exemption & B2B TIN Integration
            </h3>
            <span className="text-xs text-stone-500 dark:text-stone-400 font-mono">
              {exemptCustomers.length} registered exempt account(s)
            </span>
          </div>

          <div className="text-xs text-stone-600 dark:text-stone-400 space-y-2 leading-relaxed">
            <p>
              • <strong>Product Classification:</strong> In the Inventory module, individual products can be set to <code>TAXABLE</code>, <code>ZERO_RATED</code> (0%), or <code>EXEMPT</code>.
            </p>
            <p>
              • <strong>Diplomatic & NGO Exemption:</strong> Any customer flagged as <em>Tax Exempt</em> automatically receives 100% tax relief on checkout, and receipts are stamped with <code>TAX-EXEMPT SALE (100% RELIEF)</code>.
            </p>
            <p>
              • <strong>Historical Integrity:</strong> Every sale captures an immutable <code>taxSnapshot</code> so changes here will not retroactively alter previously printed receipts or past tax audits.
            </p>
          </div>

          {exemptCustomers.length > 0 && (
            <div className="pt-2 border-t border-stone-200 dark:border-stone-800">
              <div className="text-[11px] font-bold text-stone-700 dark:text-stone-300 mb-2 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                <span>Currently Registered Exempt Customers:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {exemptCustomers.map((c) => (
                  <span
                    key={c.id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded-lg text-xs border border-emerald-200 dark:border-emerald-800 font-medium"
                  >
                    <span>{c.name}</span>
                    {c.tin && <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400">({c.tin})</span>}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Button & Feedback */}
        <div className="pt-2 border-t border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          {savedSuccess ? (
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 px-4 py-2.5 rounded-xl text-xs font-black animate-fade-in w-full sm:w-auto">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Tax & VAT settings successfully saved! Active on POS and receipts immediately.</span>
            </div>
          ) : (
            <div className="text-[11px] text-stone-500 dark:text-stone-400">
              Click below to save. Changes apply immediately to new POS transactions.
            </div>
          )}

          <button
            type="submit"
            id="save-tax-settings-btn"
            className="w-full sm:w-auto px-8 py-3 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-black text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2.5 shrink-0 cursor-pointer"
          >
            <Save className="w-4 h-4 text-white" />
            <span>Save Tax & VAT Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};
