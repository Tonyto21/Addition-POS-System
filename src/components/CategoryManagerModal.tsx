import React, { useState } from 'react';
import { Tag, Plus, Trash2, Edit2, X, Check, FolderPlus, Layers } from 'lucide-react';
import { Category, Product } from '../types';
import { OfflineStorageManager } from '../utils/storage';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  products: Product[];
  onCategoriesUpdated: () => void;
  onCategorySelected?: (categoryId: string) => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  categories,
  products,
  onCategoriesUpdated,
  onCategorySelected,
}) => {
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCatName.trim();
    if (!name) return;

    // Check duplicate
    if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      setFeedback(`A category named "${name}" already exists.`);
      setTimeout(() => setFeedback(null), 3000);
      return;
    }

    const newCategory: Category = {
      id: `cat-${Date.now()}`,
      name,
      description: newCatDesc.trim() || undefined,
    };

    OfflineStorageManager.saveCategory(newCategory);
    onCategoriesUpdated();
    if (onCategorySelected) {
      onCategorySelected(newCategory.id);
    }
    setNewCatName('');
    setNewCatDesc('');
    setFeedback(`Created category "${name}" successfully!`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleStartEdit = (cat: Category) => {
    setEditingCatId(cat.id);
    setEditName(cat.name);
    setEditDesc(cat.description || '');
  };

  const handleSaveEdit = (catId: string) => {
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
    onCategoriesUpdated();
    setEditingCatId(null);
    setFeedback(`Updated category "${name}"!`);
    setTimeout(() => setFeedback(null), 2500);
  };

  const handleDelete = (cat: Category) => {
    const itemCount = products.filter((p) => p.categoryId === cat.id).length;
    if (itemCount > 0) {
      alert(`Cannot delete "${cat.name}": There are currently ${itemCount} items assigned to this category. Please reassign those items before deleting.`);
      return;
    }

    if (confirm(`Delete the empty category "${cat.name}"?`)) {
      OfflineStorageManager.deleteCategory(cat.id);
      onCategoriesUpdated();
      setFeedback(`Category "${cat.name}" deleted.`);
      setTimeout(() => setFeedback(null), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-stone-900 text-base">Store Categories</h3>
              <p className="text-xs text-stone-500">
                Organize items (e.g. Beverages & Drinks, Household & Toiletries)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {feedback && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{feedback}</span>
            </div>
          )}

          {/* Add New Category Form */}
          <form
            onSubmit={handleCreateCategory}
            className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-2xl space-y-2.5"
          >
            <div className="font-bold text-xs text-blue-950 flex items-center gap-1.5">
              <FolderPlus className="w-4 h-4 text-blue-700" />
              <span>Create New Category</span>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-stone-700">Category Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Beverages & Drinks, Household & Toiletries..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-blue-600 font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-stone-700">Description (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Water, juices, soda cans, energy drinks"
                value={newCatDesc}
                onChange={(e) => setNewCatDesc(e.target.value)}
                className="w-full bg-white border border-stone-300 rounded-xl px-3 py-1.5 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-blue-600 font-medium"
              />
            </div>

            <button
              type="submit"
              disabled={!newCatName.trim()}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              <span>Save New Category</span>
            </button>
          </form>

          {/* Existing Categories List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-stone-700">
              <span>Existing Categories ({categories.length})</span>
              <span className="text-stone-400 text-[11px]">Items Assigned</span>
            </div>

            <div className="divide-y divide-stone-100 border border-stone-200 rounded-xl overflow-hidden bg-white">
              {categories.map((cat) => {
                const itemCount = products.filter((p) => p.categoryId === cat.id).length;
                const isEditing = editingCatId === cat.id;

                return (
                  <div key={cat.id} className="p-3 hover:bg-stone-50 transition">
                    {isEditing ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-stone-900 focus:outline-none focus:border-blue-600"
                        />
                        <input
                          type="text"
                          placeholder="Category description"
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1 text-xs text-stone-700 focus:outline-none focus:border-blue-600"
                        />
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingCatId(null)}
                            className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs font-bold text-stone-600"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(cat.id)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-bold text-stone-900 text-xs flex items-center gap-1.5">
                            <Tag className="w-3 h-3 text-stone-400" />
                            <span>{cat.name}</span>
                          </div>
                          {cat.description && (
                            <p className="text-[11px] text-stone-500 mt-0.5 truncate">
                              {cat.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 text-[10px] font-mono font-bold border border-stone-200">
                            {itemCount} {itemCount === 1 ? 'item' : 'items'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(cat)}
                            className="p-1 text-stone-400 hover:text-stone-800 hover:bg-stone-100 rounded-md transition"
                            title="Edit Category"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(cat)}
                            disabled={itemCount > 0}
                            className={`p-1 rounded-md transition ${
                              itemCount > 0
                                ? 'text-stone-300 cursor-not-allowed'
                                : 'text-stone-400 hover:text-rose-600 hover:bg-rose-50'
                            }`}
                            title={
                              itemCount > 0
                                ? 'Cannot delete: items are assigned to this category'
                                : 'Delete category'
                            }
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-stone-200 bg-stone-50 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
