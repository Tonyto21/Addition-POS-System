import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Package,
  ArrowRight,
  Info,
  Scale,
} from 'lucide-react';
import { PackageDefinition } from '../types';
import { OfflineStorageManager } from '../utils/storage';

interface PackageDefinitionsSettingsViewProps {
  onRefresh?: () => void;
}

export const PackageDefinitionsSettingsView: React.FC<PackageDefinitionsSettingsViewProps> = ({ onRefresh }) => {
  const [packageDefs, setPackageDefs] = useState<PackageDefinition[]>(() =>
    OfflineStorageManager.getPackageDefinitions()
  );

  // Form states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [multiplier, setMultiplier] = useState<number>(12);
  const [description, setDescription] = useState('');

  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);

  useEffect(() => {
    const handleUpdate = () => {
      setPackageDefs(OfflineStorageManager.getPackageDefinitions());
    };
    window.addEventListener('app-storage-updated', handleUpdate);
    return () => window.removeEventListener('app-storage-updated', handleUpdate);
  }, []);

  const notify = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  const notifyError = (msg: string) => {
    setErrorFeedback(msg);
    setTimeout(() => setErrorFeedback(null), 3500);
  };

  const handleStartEdit = (pkg: PackageDefinition) => {
    setEditingId(pkg.id);
    setName(pkg.name);
    setMultiplier(pkg.multiplier);
    setDescription(pkg.description || '');
  };

  const handleCancel = () => {
    setEditingId(null);
    setName('');
    setMultiplier(12);
    setDescription('');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      notifyError('Package container name is required (e.g. Dozen, Crate, Carton).');
      return;
    }

    if (multiplier <= 0 || !Number.isInteger(multiplier)) {
      notifyError('Base quantity multiplier must be a whole positive number (e.g., 12, 24, 50).');
      return;
    }

    // Check duplicate name
    const isDuplicate = packageDefs.some(
      (p) => p.name.toLowerCase() === cleanName.toLowerCase() && p.id !== editingId
    );
    if (isDuplicate) {
      notifyError(`A package definition named "${cleanName}" already exists.`);
      return;
    }

    const item: PackageDefinition = {
      id: editingId || `pkg-${Date.now()}`,
      name: cleanName,
      multiplier: Number(multiplier),
      description: description.trim() || undefined,
    };

    OfflineStorageManager.savePackageDefinition(item);
    setPackageDefs(OfflineStorageManager.getPackageDefinitions());
    handleCancel();
    notify(editingId ? `Updated "${cleanName}"!` : `Created package definition "${cleanName}"!`);
    if (onRefresh) onRefresh();
  };

  const handleDelete = (pkg: PackageDefinition) => {
    if (confirm(`Delete container definition "${pkg.name}" (${pkg.multiplier} units)?`)) {
      OfflineStorageManager.deletePackageDefinition(pkg.id);
      setPackageDefs(OfflineStorageManager.getPackageDefinitions());
      notify(`Deleted "${pkg.name}".`);
      if (onRefresh) onRefresh();
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
      {/* Header */}
      <div className="p-4 sm:p-5 bg-stone-50 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-800">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
              Package & Container Definitions
            </h2>
            <p className="text-xs text-stone-500">
              Define standard bulk containers (Dozen, Crate, Carton, Box, Bundle) and base unit conversion multipliers
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-stone-600 bg-stone-100 border border-stone-200 px-2.5 py-1 rounded-lg">
            {packageDefs.length} Containers Defined
          </span>
        </div>
      </div>

      {feedback && (
        <div className="px-4 py-2.5 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-between">
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)} className="text-emerald-700 font-bold">
            &times;
          </button>
        </div>
      )}

      {errorFeedback && (
        <div className="px-4 py-2.5 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs font-medium flex items-center justify-between">
          <span>{errorFeedback}</span>
          <button onClick={() => setErrorFeedback(null)} className="text-rose-700 font-bold">
            &times;
          </button>
        </div>
      )}

      <div className="p-4 sm:p-6 space-y-6">
        {/* Info Explainer Banner */}
        <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
          <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>How Package Conversion Works:</strong> When you sell or receive a wholesale package, 
            the system multiplies by this conversion number to deduct or add the exact single units. For example, 
            selling <strong>1 Crate (24 units)</strong> of Beer automatically deducts <strong>24 single bottles</strong> from your inventory, 
            keeping your stock 100% accurate with zero discrepancy.
          </div>
        </div>

        {/* Add / Edit Form */}
        <form
          onSubmit={handleSave}
          className="bg-stone-50/70 border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-stone-200 pb-2.5">
            <h3 className="text-xs font-extrabold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-amber-600" />
              <span>{editingId ? `Edit Container: ${name}` : 'Add New Package / Container Definition'}</span>
            </h3>
            {editingId && (
              <button
                type="button"
                onClick={handleCancel}
                className="text-xs text-stone-500 hover:text-stone-900 font-semibold"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
            <div>
              <label className="block text-stone-700 font-bold mb-1">
                Container Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Dozen, Crate of 24, Carton of 48, Box of 50"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-900 font-medium"
              />
            </div>

            <div>
              <label className="block text-stone-700 font-bold mb-1">
                Base Units Inside (Multiplier) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  placeholder="e.g. 12"
                  value={multiplier}
                  onChange={(e) => setMultiplier(parseInt(e.target.value) || 1)}
                  className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-stone-900 font-mono font-bold focus:outline-none focus:border-stone-900"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-semibold">
                  units / pack
                </span>
              </div>
            </div>

            <div>
              <label className="block text-stone-700 font-bold mb-1">
                Description / Application (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. For soft drinks, beer, bottled water"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-900"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-[11px] text-stone-500 font-mono">
              Formula: 1 {name || 'Package'} = {multiplier} Base Individual Units
            </div>

            <div className="flex items-center gap-2">
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-700 text-xs font-bold rounded-xl transition"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition"
              >
                <Check className="w-4 h-4" />
                <span>{editingId ? 'Update Definition' : 'Save Container Definition'}</span>
              </button>
            </div>
          </div>
        </form>

        {/* Existing Definitions Grid */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
            Available Package Multipliers ({packageDefs.length})
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {packageDefs.map((pkg) => (
              <div
                key={pkg.id}
                className="p-3.5 bg-white border border-stone-200 rounded-xl hover:border-amber-400 hover:shadow-2xs transition flex flex-col justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-stone-900 text-sm">{pkg.name}</span>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-900 font-black font-mono rounded-lg border border-amber-200">
                      &times; {pkg.multiplier}
                    </span>
                  </div>

                  {pkg.description && (
                    <p className="text-[11px] text-stone-500 mt-1 leading-snug">{pkg.description}</p>
                  )}

                  <div className="mt-2 text-[10px] text-stone-400 font-mono flex items-center gap-1">
                    <span>1 container</span>
                    <ArrowRight className="w-3 h-3 text-stone-300" />
                    <span className="font-bold text-stone-700">{pkg.multiplier} loose units</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(pkg)}
                    className="p-1.5 hover:bg-stone-100 text-stone-500 hover:text-stone-900 rounded-lg transition"
                    title="Edit container multiplier"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(pkg)}
                    className="p-1.5 hover:bg-rose-50 text-stone-400 hover:text-rose-600 rounded-lg transition"
                    title="Delete container definition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
