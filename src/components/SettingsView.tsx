import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Store,
  DollarSign,
  Shield,
  Printer,
  Save,
  Check,
  RotateCcw,
  Users,
  Percent,
  KeyRound,
  Eye,
  EyeOff,
  UserCheck,
} from 'lucide-react';
import { BusinessSettings, User } from '../types';
import { OfflineStorageManager } from '../utils/storage';

interface SettingsViewProps {
  settings: BusinessSettings;
  activeUser: User;
  onUpdateSettings: (newSettings: BusinessSettings) => void;
  onRefresh: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  activeUser,
  onUpdateSettings,
  onRefresh,
}) => {
  const [formData, setFormData] = useState<BusinessSettings>({ ...settings });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [users, setUsers] = useState<User[]>(() => OfflineStorageManager.getUsers());
  const [showPins, setShowPins] = useState<boolean>(true);

  // New user form state
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'owner' | 'manager' | 'cashier'>('cashier');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserPin, setNewUserPin] = useState('1234');

  // Editing existing user PIN
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editPinValue, setEditPinValue] = useState<string>('1234');

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    OfflineStorageManager.saveSettings(formData);
    onUpdateSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
    onRefresh();
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) return;

    const user: User = {
      id: `usr-${Date.now()}`,
      name: newUserName.trim(),
      username: newUserName.toLowerCase().replace(/\s+/g, '_'),
      role: newUserRole,
      phone: newUserPhone.trim(),
      pin: newUserPin.trim() || '1234',
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    OfflineStorageManager.saveUser(user);
    setUsers(OfflineStorageManager.getUsers());
    setNewUserName('');
    setNewUserPhone('');
    setNewUserPin('1234');
    onRefresh();
  };

  const handleUpdatePin = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    const updated = { ...user, pin: editPinValue.trim() || '1234' };
    OfflineStorageManager.saveUser(updated);
    setUsers(OfflineStorageManager.getUsers());
    setEditingUserId(null);
    onRefresh();
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-stone-100 text-stone-900">
      {/* Header */}
      <div className="p-4 bg-white border-b border-stone-200 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-stone-900 flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-stone-800" />
            <span>Store Profile & System Settings</span>
          </h2>
          <p className="text-xs text-stone-500">
            Business branding, dual-currency exchange rates, tax switches, and employee access accounts
          </p>
        </div>

        {savedSuccess && (
          <div className="px-3 py-1 bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-lg flex items-center gap-1.5 animate-fadeIn">
            <Check className="w-3.5 h-3.5" /> Settings Saved!
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-4 max-w-5xl mx-auto w-full space-y-5 pb-24">
        {/* Business Identity & Contact */}
        <form onSubmit={handleSaveSettings} className="space-y-5">
          <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-4 text-xs shadow-2xs">
            <h3 className="text-sm font-extrabold text-stone-900 flex items-center gap-2 border-b border-stone-100 pb-2.5">
              <Store className="w-4 h-4 text-blue-600" /> Business Profile & Branding
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-stone-700 font-bold">Business Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 text-sm focus:outline-none focus:bg-white focus:border-stone-900 transition"
                />
                <p className="text-[11px] text-stone-400">
                  Changing this updates printed receipts, dashboard branding, and invoices immediately.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-stone-700 font-bold">Phone Numbers</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+231 77 000 0000"
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 font-mono focus:outline-none focus:bg-white focus:border-stone-900 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-stone-700 font-bold">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="shop@example.com"
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:bg-white focus:border-stone-900 transition"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-stone-700 font-bold">Physical Shop Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street, City, Country"
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:bg-white focus:border-stone-900 transition"
                />
              </div>
            </div>
          </div>

          {/* Currencies, Exchange Rate & Tax */}
          <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-4 text-xs shadow-2xs">
            <h3 className="text-sm font-extrabold text-stone-900 flex items-center gap-2 border-b border-stone-100 pb-2.5">
              <DollarSign className="w-4 h-4 text-emerald-600" /> Dual-Currency & Exchange Rate
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="space-y-1">
                <label className="text-stone-700 font-bold">Primary Base Currency</label>
                <select
                  value={formData.primaryCurrency}
                  onChange={(e) => setFormData({ ...formData, primaryCurrency: e.target.value as any })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 font-bold"
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
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 font-bold"
                >
                  <option value="USD">USD ($) - United States Dollar</option>
                  <option value="LRD">LRD (L$) - Liberian Dollar</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-stone-700 font-bold">Exchange Rate (1 USD = ? LRD) *</label>
                <input
                  type="number"
                  step="1"
                  required
                  value={formData.exchangeRate}
                  onChange={(e) =>
                    setFormData({ ...formData, exchangeRate: parseFloat(e.target.value) || 1 })
                  }
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 font-mono text-sm font-extrabold focus:outline-none focus:bg-white focus:border-stone-900 transition"
                />
                <span className="text-[10px] text-stone-500 font-mono">Current: $1.00 USD = {formData.exchangeRate} LRD</span>
              </div>
            </div>

            {/* Tax Switch */}
            <div className="pt-3 border-t border-stone-100 space-y-3">
              <label className="flex items-center gap-2.5 cursor-pointer text-stone-800 font-bold">
                <input
                  type="checkbox"
                  checked={formData.taxEnabled}
                  onChange={(e) => setFormData({ ...formData, taxEnabled: e.target.checked })}
                  className="w-4 h-4 rounded border-stone-300 text-blue-600 focus:ring-0"
                />
                <span>Enable Sales Tax / GST</span>
              </label>

              {formData.taxEnabled && (
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl max-w-xs space-y-1">
                  <label className="text-stone-600 font-bold">Tax Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.taxRatePercent}
                    onChange={(e) =>
                      setFormData({ ...formData, taxRatePercent: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-900 font-mono font-bold"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Receipt Customization & Thermal Printer defaults */}
          <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-4 text-xs shadow-2xs">
            <h3 className="text-sm font-extrabold text-stone-900 flex items-center gap-2 border-b border-stone-100 pb-2.5">
              <Printer className="w-4 h-4 text-purple-600" /> Receipt & Thermal Printer Setup
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="text-stone-700 font-bold">Receipt Custom Header Text</label>
                <textarea
                  rows={3}
                  value={formData.receiptHeader}
                  onChange={(e) => setFormData({ ...formData, receiptHeader: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:bg-white focus:border-stone-900 transition font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-stone-700 font-bold">Receipt Custom Footer Text</label>
                <textarea
                  rows={3}
                  value={formData.receiptFooter}
                  onChange={(e) => setFormData({ ...formData, receiptFooter: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:bg-white focus:border-stone-900 transition font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-stone-700 font-bold">Default Thermal Paper Size</label>
                <select
                  value={formData.defaultThermalPaperSize}
                  onChange={(e) =>
                    setFormData({ ...formData, defaultThermalPaperSize: e.target.value as any })
                  }
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 font-bold"
                >
                  <option value="58mm">58mm Mini POS Thermal Printer (Standard Handheld / Phone)</option>
                  <option value="80mm">80mm Standard POS Thermal Printer (Countertop)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-stone-700 font-bold">Default Low Stock Alert Threshold</label>
                <input
                  type="number"
                  value={formData.lowStockThresholdDefault}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      lowStockThresholdDefault: parseInt(e.target.value) || 5,
                    })
                  }
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 font-mono font-bold"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-6 py-3 bg-stone-900 hover:bg-stone-800 text-white font-black text-xs rounded-xl shadow transition flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Save Business Settings</span>
            </button>
          </div>
        </form>

        {/* User Management & Passwords / PINs Section */}
        <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-4 text-xs shadow-2xs">
          <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
            <h3 className="text-sm font-extrabold text-stone-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" /> Employee Accounts, Usernames & PIN Passwords
            </h3>
            <button
              onClick={() => setShowPins(!showPins)}
              className="flex items-center gap-1 text-[11px] text-stone-600 hover:text-stone-900 font-bold bg-stone-100 px-2.5 py-1 rounded-lg border border-stone-200 transition"
            >
              {showPins ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showPins ? 'Hide Passwords/PINs' : 'Reveal Passwords/PINs'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Existing Users with explicit usernames and Passwords */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-stone-800">Existing Staff Accounts ({users.length})</h4>
                <span className="text-[10px] text-stone-400 font-mono">Default PIN: 1234</span>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {users.map((u) => {
                  const isEditingThisUser = editingUserId === u.id;
                  const currentPin = u.pin || '1234';

                  return (
                    <div
                      key={u.id}
                      className="p-3 bg-stone-50 border border-stone-200 rounded-xl flex flex-col gap-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-black text-stone-900 flex items-center gap-1.5">
                            <span>{u.name}</span>
                            {activeUser.id === u.id && (
                              <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded border border-emerald-200">
                                Current
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-stone-500 font-mono mt-0.5">
                            Username: <strong className="text-stone-800">@{u.username}</strong> • Phone: {u.phone || 'None'}
                          </div>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded text-[10px] uppercase font-black border ${
                            u.role === 'owner'
                              ? 'bg-purple-100 text-purple-800 border-purple-200'
                              : u.role === 'manager'
                              ? 'bg-blue-100 text-blue-800 border-blue-200'
                              : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          {u.role}
                        </span>
                      </div>

                      {/* Password / PIN display & Quick edit */}
                      <div className="flex items-center justify-between pt-2 border-t border-stone-200/70 text-[11px]">
                        <div className="flex items-center gap-1.5 font-mono">
                          <KeyRound className="w-3.5 h-3.5 text-stone-400" />
                          <span className="text-stone-500 font-medium">Login PIN / Pass:</span>
                          {isEditingThisUser ? (
                            <input
                              type="text"
                              maxLength={6}
                              value={editPinValue}
                              onChange={(e) => setEditPinValue(e.target.value)}
                              className="w-16 bg-white border border-stone-400 rounded px-1.5 py-0.5 font-mono font-black text-stone-900"
                            />
                          ) : (
                            <span className="font-black text-stone-900 bg-stone-200 px-2 py-0.5 rounded">
                              {showPins ? currentPin : '••••'}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          {isEditingThisUser ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleUpdatePin(u.id)}
                                className="px-2 py-0.5 bg-emerald-600 text-white rounded font-bold text-[10px]"
                              >
                                Save PIN
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingUserId(null)}
                                className="px-1.5 py-0.5 text-stone-500 hover:text-stone-800"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingUserId(u.id);
                                setEditPinValue(currentPin);
                              }}
                              className="text-[10px] text-blue-600 hover:underline font-bold"
                            >
                              Change PIN
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Add User Form */}
            <form onSubmit={handleAddUser} className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-2.5">
              <h4 className="font-extrabold text-stone-800">Add New Staff Member</h4>

              <div>
                <label className="text-stone-600 font-bold">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cashier Sarah"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-900 text-xs focus:outline-none focus:border-stone-900"
                />
              </div>

              <div>
                <label className="text-stone-600 font-bold">Role & Permissions</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as any)}
                  className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-900 text-xs font-medium"
                >
                  <option value="cashier">Cashier (POS Walk-in Sales & Receipts; Cost/Profits hidden)</option>
                  <option value="manager">Manager (POS, Stock Intake, and Inventory Reports)</option>
                  <option value="owner">Owner (Full Admin, Financials, Settings & Deletion)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-stone-600 font-bold">Phone</label>
                  <input
                    type="text"
                    placeholder="+231 77..."
                    value={newUserPhone}
                    onChange={(e) => setNewUserPhone(e.target.value)}
                    className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-900 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="text-stone-600 font-bold">Login PIN</label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="1234"
                    value={newUserPin}
                    onChange={(e) => setNewUserPin(e.target.value)}
                    className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-900 font-mono font-bold text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-stone-900 hover:bg-stone-800 text-white font-extrabold rounded-lg transition text-xs shadow-xs"
              >
                + Create Staff Account
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
