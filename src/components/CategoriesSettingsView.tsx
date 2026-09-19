import React, { useState } from 'react';
import {
  Tag,
  Plus,
  Trash2,
  Edit2,
  Check,
  FolderPlus,
  Layers,
  Scale,
  CheckCircle2,
  AlertCircle,
  Package,
} from 'lucide-react';
import { Category, Product, Unit } from '../types';
import { OfflineStorageManager } from '../utils/storage';

interface CategoriesSettingsViewProps {
  onRefresh: () => void;
}

export const CategoriesSettingsView: React.FC<CategoriesSettingsViewProps> = ({ onRefresh }) => {
  const [categories, setCategories] = useState<Category[]>(() => OfflineStorageManager.getCategories());
  const [products, setProducts] = useState<Product[]>(() => OfflineStorageManager.getProducts());
  const [units, setUnits] = useState<Unit[]>(() => OfflineStorageManager.getUnits());

  // Category Form State
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  // Unit Form State
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitSymbol, setNewUnitSymbol] = useState('');
  const [newUnitFractions, setNewUnitFractions] = useState(false);

  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);

  const notify = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  const notifyError = (msg: string) => {
    setErrorFeedback(msg);
    setTimeout(() => setErrorFeedback(null), 3500);
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCatName.trim();
    if (!name) return;

    if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      notifyError(`A category named "${name}" already exists.`);
      return;
    }

    const newCategory: Category = {
      id: `cat-${Date.now()}`,
      name,
      description: newCatDesc.trim() || undefined,
    };

    OfflineStorageManager.saveCategory(newCategory);
    setCategories(OfflineStorageManager.getCategories());
    setNewCatName('');
    setNewCatDesc('');
    notify(`Created category "${name}" successfully!`);
    onRefresh();
    window.dispatchEvent(new CustomEvent('app-storage-updated', { detail: { source: 'category-create' } }));
  };

  const handleSaveEditCategory = (catId: string) => {
    const name = editName.trim();
    if (!name) return;

    const existing = categories.find((c) => c.id === catId);
    if (!existing) return;

    const updated: Category = {
      ...existing,
      name,
      description: editDesc.trim() || undefined,
    };

    OfflineStorageManager.saveCategory(updated);
    setCategories(OfflineStorageManager.getCategories());
    setEditingCatId(null);
    notify(`Updated category "${name}"!`);
    onRefresh();
    window.dispatchEvent(new CustomEvent('app-storage-updated', { detail: { source: 'category-edit' } }));
  };

  const handleDeleteCategory = (cat: Category) => {
    const count = products.filter((p) => p.categoryId === cat.id).length;
    if (count > 0) {
      notifyError(`Cannot delete "${cat.name}": There are currently ${count} items assigned to this category. Please reassign items in Inventory first.`);
      return;
    }

    if (window.confirm(`Delete the empty category "${cat.name}"?`)) {
      OfflineStorageManager.deleteCategory(cat.id);
      setCategories(OfflineStorageManager.getCategories());
      notify(`Category "${cat.name}" deleted.`);
      onRefresh();
      window.dispatchEvent(new CustomEvent('app-storage-updated', { detail: { source: 'category-delete' } }));
    }
  };

  const handleCreateUnit = (e: React.FormEvent) => {
    e.preventDefault();
    const uName = newUnitName.trim();
    const uSymbol = (newUnitSymbol.trim() || uName.substring(0, 3)).toLowerCase();
    if (!uName) return;

    const newUnit: Unit = {
      id: `unt-${Date.now()}`,
      name: uName,
      symbol: uSymbol,
      allowFractions: newUnitFractions,
    };

    const updatedUnits = [...units, newUnit];
    setUnits(updatedUnits);
    setNewUnitName('');
    setNewUnitSymbol('');
    setNewUnitFractions(false);
    notify(`Added measurement unit "${uName}" (${uSymbol})!`);
  };

  return (
    <div className="space-y-5 text-xs">
      {/* Header Banner */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-stone-950">
              Categories & Measurement Units
            </h3>
            <p className="text-[11px] text-stone-500">
              Organize your retail inventory into department categories and packaging units.
            </p>
          </div>
        </div>
        <div className="text-stone-500 font-mono text-[11px]">
          {categories.length} Categories • {units.length} Units
        </div>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {errorFeedback && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl font-bold flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorFeedback}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Category Management */}
        <div className="lg:col-span-2 space-y-4">
          {/* Add Category Card */}
          <form
            onSubmit={handleCreateCategory}
            className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-3 shadow-2xs"
          >
            <h4 className="font-extrabold text-stone-900 flex items-center gap-2 text-xs border-b border-stone-100 pb-2.5">
              <FolderPlus className="w-4 h-4 text-blue-600" />
              <span>Add New Store Category</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-stone-700 font-bold">Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Electrical & Hardware"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:bg-white focus:border-stone-900 font-medium text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-stone-700 font-bold">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Bulbs, cables, adapters, sockets"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:bg-white focus:border-stone-900 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!newCatName.trim()}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold rounded-xl transition flex items-center gap-1.5 shadow-2xs"
              >
                <Plus className="w-4 h-4" />
                <span>Save Category</span>
              </button>
            </div>
          </form>

          {/* Categories Listing */}
          <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-3 shadow-2xs">
            <h4 className="font-extrabold text-stone-900 text-xs flex items-center justify-between border-b border-stone-100 pb-2.5">
              <span>Existing Categories ({categories.length})</span>
              <span className="text-[10px] text-stone-400 font-normal">Products assigned shown in badges</span>
            </h4>

            <div className="space-y-2.5">
              {categories.map((c) => {
                const count = products.filter((p) => p.categoryId === c.id).length;
                const isEditing = editingCatId === c.id;

                if (isEditing) {
                  return (
                    <div key={c.id} className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Category name"
                          className="w-full bg-white border border-blue-300 rounded-lg px-2.5 py-1.5 font-bold text-stone-900 text-xs focus:outline-none"
                        />
                        <input
                          type="text"
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          placeholder="Description"
                          className="w-full bg-white border border-blue-300 rounded-lg px-2.5 py-1.5 text-stone-900 text-xs focus:outline-none"
                        />
                      </div>
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingCatId(null)}
                          className="px-3 py-1 bg-white border border-stone-300 text-stone-700 rounded-lg font-bold"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEditCategory(c.id)}
                          className="px-3 py-1 bg-blue-600 text-white rounded-lg font-bold"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={c.id}
                    className="p-3 bg-stone-50 border border-stone-200 rounded-xl flex items-center justify-between gap-3 hover:bg-stone-100/70 transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-stone-200 text-stone-700 flex items-center justify-center shrink-0 font-bold">
                        <Tag className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-stone-900 truncate">{c.name}</span>
                          <span className="text-[10px] bg-white border border-stone-300 text-stone-700 font-mono font-bold px-2 py-0.5 rounded-full">
                            {count} items
                          </span>
                        </div>
                        {c.description && (
                          <p className="text-[11px] text-stone-500 truncate mt-0.5">{c.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCatId(c.id);
                          setEditName(c.name);
                          setEditDesc(c.description || '');
                        }}
                        className="p-1.5 text-stone-600 hover:text-blue-600 hover:bg-white rounded-lg transition"
                        title="Edit category"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(c)}
                        disabled={count > 0}
                        className={`p-1.5 rounded-lg transition ${
                          count > 0
                            ? 'text-stone-300 cursor-not-allowed'
                            : 'text-stone-400 hover:text-rose-600 hover:bg-white'
                        }`}
                        title={count > 0 ? `${count} items assigned, cannot delete` : 'Delete empty category'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Col: Units of Measure */}
        <div className="space-y-4">
          <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-3 shadow-2xs">
            <h4 className="font-extrabold text-stone-900 text-xs flex items-center gap-2 border-b border-stone-100 pb-2.5">
              <Scale className="w-4 h-4 text-emerald-600" />
              <span>Units of Measure</span>
            </h4>

            <p className="text-[11px] text-stone-500 leading-relaxed">
              Standard packaging and metric units used when stocking and selling products.
            </p>

            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              {units.map((u) => (
                <div
                  key={u.id}
                  className="p-2.5 bg-stone-50 border border-stone-200 rounded-xl flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-stone-900">{u.name}</span>
                    <span className="text-[10px] text-stone-400 font-mono ml-2">({u.symbol})</span>
                  </div>
                  <span className="text-[9px] bg-white border border-stone-200 text-stone-600 px-1.5 py-0.5 rounded font-mono">
                    {u.allowFractions ? 'Fractions (0.5)' : 'Whole only'}
                  </span>
                </div>
              ))}
            </div>

            {/* Quick add unit */}
            <form onSubmit={handleCreateUnit} className="pt-2 border-t border-stone-100 space-y-2">
              <span className="text-[10px] font-bold text-stone-700 uppercase tracking-wider">
                Add Custom Unit
              </span>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  placeholder="Name (e.g. Roll)"
                  value={newUnitName}
                  onChange={(e) => setNewUnitName(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2 py-1 text-xs text-stone-900 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Symbol (rl)"
                  value={newUnitSymbol}
                  onChange={(e) => setNewUnitSymbol(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2 py-1 text-xs text-stone-900 font-mono focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={!newUnitName.trim()}
                className="w-full py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white rounded-lg font-bold text-[11px] transition shadow-2xs"
              >
                + Add Unit
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
