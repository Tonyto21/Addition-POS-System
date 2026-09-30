import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  KeyRound,
  Eye,
  EyeOff,
  Check,
  X,
  Edit2,
  Trash2,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
  Package,
  Receipt,
  TrendingUp,
  Settings as SettingsIcon,
  DollarSign,
  Percent,
  RotateCcw,
  UserCheck,
  Sliders,
} from 'lucide-react';
import { AppModuleId, User, UserRole } from '../types';
import { OfflineStorageManager } from '../utils/storage';

interface UserManagementViewProps {
  activeUser: User;
  onRefresh: () => void;
}

const ALL_MODULES: { id: AppModuleId; label: string; description: string; icon: any; color: string }[] = [
  {
    id: 'pos',
    label: 'POS Register',
    description: 'Walk-in cash sales, barcode scanning, and receipt printing',
    icon: ShoppingBag,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
  },
  {
    id: 'inventory',
    label: 'Inventory',
    description: 'Item catalog, stock counts, and purchase intake batches',
    icon: Package,
    color: 'text-amber-600 bg-amber-50 border-amber-200',
  },
  {
    id: 'orders',
    label: 'Orders & Receipts',
    description: 'Sales history, debt book repayments, and cash drawer shifts',
    icon: Receipt,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  },
  {
    id: 'reports',
    label: 'Reports & Margins',
    description: 'Financial dashboard, gross profit, and revenue analytics',
    icon: TrendingUp,
    color: 'text-purple-600 bg-purple-50 border-purple-200',
  },
  {
    id: 'settings',
    label: 'Store Settings',
    description: 'Exchange rates, printer hardware, and staff accounts',
    icon: SettingsIcon,
    color: 'text-stone-700 bg-stone-100 border-stone-300',
  },
];

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  activeUser,
  onRefresh,
}) => {
  const [users, setUsers] = useState<User[]>(() => OfflineStorageManager.getUsers());
  const [showPins, setShowPins] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Filter out superadmin accounts when viewing as Shop Owner or regular staff
  const visibleUsers = users.filter((u) => {
    if (activeUser.role === 'superadmin') return true;
    return u.role !== 'superadmin' && u.id !== 'usr-super';
  });

  // Edit / Add Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('1234');
  const [role, setRole] = useState<UserRole>('cashier');
  const [isActive, setIsActive] = useState(true);

  // Granular Module Access
  const [allowedModules, setAllowedModules] = useState<AppModuleId[]>(['pos', 'orders']);

  // Granular Responsibilities
  const [canViewCostProfit, setCanViewCostProfit] = useState(false);
  const [canApplyDiscount, setCanApplyDiscount] = useState(false);
  const [canProcessRefund, setCanProcessRefund] = useState(false);
  const [canAdjustInventory, setCanAdjustInventory] = useState(false);
  const [canReceiveStock, setCanReceiveStock] = useState(false);
  const [canManageUsers, setCanManageUsers] = useState(false);

  // Delete confirmation
  const [deleteCandidate, setDeleteCandidate] = useState<User | null>(null);

  const notify = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleOpenAddModal = () => {
    setEditingUserId(null);
    setName('');
    setUsername('');
    setPhone('');
    setPin('1234');
    setRole('cashier');
    setIsActive(true);
    setAllowedModules(['pos', 'orders']);
    setCanViewCostProfit(false);
    setCanApplyDiscount(false);
    setCanProcessRefund(false);
    setCanAdjustInventory(false);
    setCanReceiveStock(false);
    setCanManageUsers(false);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (u: User) => {
    if (activeUser.role !== 'superadmin' && (u.role === 'superadmin' || u.id === 'usr-super')) {
      notify('You do not have permission to view or modify this account.', 'error');
      return;
    }
    setEditingUserId(u.id);
    setName(u.name);
    setUsername(u.username);
    setPhone(u.phone || '');
    setPin(u.pin || '1234');
    setRole(u.role);
    setIsActive(u.isActive);

    const defaultModules: AppModuleId[] = u.role === 'owner'
      ? ['pos', 'inventory', 'orders', 'reports', 'settings']
      : u.role === 'manager'
      ? ['pos', 'inventory', 'orders', 'reports']
      : ['pos', 'orders'];

    setAllowedModules(u.allowedModules && u.allowedModules.length > 0 ? u.allowedModules : defaultModules);
    setCanViewCostProfit(u.canViewCostProfit ?? (u.role !== 'cashier'));
    setCanApplyDiscount(u.canApplyDiscount ?? (u.role !== 'cashier'));
    setCanProcessRefund(u.canProcessRefund ?? (u.role !== 'cashier'));
    setCanAdjustInventory(u.canAdjustInventory ?? (u.role !== 'cashier'));
    setCanReceiveStock(u.canReceiveStock ?? (u.role !== 'cashier'));
    setCanManageUsers(u.canManageUsers ?? (u.role === 'owner'));
    setIsModalOpen(true);
  };

  const applyRolePreset = (presetRole: UserRole) => {
    setRole(presetRole);
    if (presetRole === 'owner') {
      setAllowedModules(['pos', 'inventory', 'orders', 'reports', 'settings']);
      setCanViewCostProfit(true);
      setCanApplyDiscount(true);
      setCanProcessRefund(true);
      setCanAdjustInventory(true);
      setCanReceiveStock(true);
      setCanManageUsers(true);
    } else if (presetRole === 'manager') {
      setAllowedModules(['pos', 'inventory', 'orders', 'reports']);
      setCanViewCostProfit(true);
      setCanApplyDiscount(true);
      setCanProcessRefund(true);
      setCanAdjustInventory(true);
      setCanReceiveStock(true);
      setCanManageUsers(false);
    } else {
      setAllowedModules(['pos', 'orders']);
      setCanViewCostProfit(false);
      setCanApplyDiscount(false);
      setCanProcessRefund(false);
      setCanAdjustInventory(false);
      setCanReceiveStock(false);
      setCanManageUsers(false);
    }
  };

  const toggleModule = (modId: AppModuleId) => {
    if (allowedModules.includes(modId)) {
      if (allowedModules.length === 1) {
        notify('User must have access to at least one module.', 'error');
        return;
      }
      setAllowedModules(allowedModules.filter((m) => m !== modId));
    } else {
      setAllowedModules([...allowedModules, modId]);
    }
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      notify('Staff full name is required', 'error');
      return;
    }

    const cleanUsername = (username.trim() || name.trim().toLowerCase().replace(/\s+/g, '_')).replace(/^@/, '');

    // Check username duplicates
    const duplicate = users.find(
      (u) => u.username.toLowerCase() === cleanUsername.toLowerCase() && u.id !== editingUserId
    );
    if (duplicate) {
      notify(`Username @${cleanUsername} is already used by another staff member`, 'error');
      return;
    }

    if (activeUser.role !== 'superadmin' && role === 'superadmin') {
      notify('You do not have authorization to assign the Super Admin role.', 'error');
      return;
    }

    const userToSave: User = {
      id: editingUserId || `usr-${Date.now()}`,
      name: name.trim(),
      username: cleanUsername,
      phone: phone.trim() || undefined,
      pin: pin.trim() || '1234',
      role,
      isActive,
      createdAt: editingUserId ? (users.find((u) => u.id === editingUserId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      allowedModules,
      canViewCostProfit,
      canApplyDiscount,
      canProcessRefund,
      canAdjustInventory,
      canReceiveStock,
      canManageUsers: role === 'owner' ? true : canManageUsers,
    };

    OfflineStorageManager.saveUser(userToSave);
    const updated = OfflineStorageManager.getUsers();
    setUsers(updated);
    setIsModalOpen(false);
    notify(editingUserId ? `Updated profile & permissions for ${userToSave.name}` : `Created staff account for ${userToSave.name}`);
    onRefresh();
    window.dispatchEvent(new CustomEvent('app-storage-updated', { detail: { source: 'user-management' } }));
  };

  const handleDeleteUser = () => {
    if (!deleteCandidate) return;
    if (deleteCandidate.role === 'superadmin' || deleteCandidate.id === 'usr-super') {
      notify('The Master Developer / Super Admin account cannot be removed.', 'error');
      setDeleteCandidate(null);
      return;
    }
    if (deleteCandidate.id === activeUser.id) {
      notify('Cannot delete the staff account currently logged in.', 'error');
      setDeleteCandidate(null);
      return;
    }

    const success = OfflineStorageManager.deleteUser(deleteCandidate.id);
    if (success) {
      setUsers(OfflineStorageManager.getUsers());
      notify(`Staff account "${deleteCandidate.name}" deleted.`);
      onRefresh();
    } else {
      notify('Could not delete user account.', 'error');
    }
    setDeleteCandidate(null);
  };

  const roleBadgeColors: Record<string, string> = {
    superadmin: 'bg-amber-100 text-amber-900 border-amber-300',
    owner: 'bg-purple-100 text-purple-800 border-purple-200',
    manager: 'bg-blue-100 text-blue-800 border-blue-200',
    cashier: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Header Banner */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-stone-950">
                Staff Management & Module Access
              </h3>
              <p className="text-[11px] text-stone-500">
                Managing {visibleUsers.length} staff accounts. Set 4-digit PINs, credentials, and POS module permissions.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPins(!showPins)}
            className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl flex items-center gap-1.5 transition border border-stone-200"
          >
            {showPins ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showPins ? 'Hide PINs' : 'Show PINs'}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white font-black rounded-xl flex items-center gap-2 transition shadow-sm"
          >
            <UserPlus className="w-4 h-4 text-amber-400" />
            <span>+ Add Staff Account</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-xl border flex items-center gap-2 font-bold animate-fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Staff Accounts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {visibleUsers.map((u) => {
          const isMe = activeUser.id === u.id;
          const userMods: AppModuleId[] = u.allowedModules || (
            u.role === 'owner' ? ['pos', 'inventory', 'orders', 'reports', 'settings'] :
            u.role === 'manager' ? ['pos', 'inventory', 'orders', 'reports'] :
            ['pos', 'orders']
          );

          return (
            <div
              key={u.id}
              className={`bg-white border rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-3.5 transition shadow-2xs ${
                isMe ? 'border-purple-300 ring-2 ring-purple-100' : 'border-stone-200 hover:border-stone-300'
              } ${!u.isActive ? 'opacity-65 bg-stone-50' : ''}`}
            >
              {/* Top Row: Info & Badges */}
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center font-black text-stone-800 text-sm">
                      {u.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-stone-950 text-sm">{u.name}</span>
                        {isMe && (
                          <span className="text-[9px] bg-purple-100 text-purple-900 font-black px-1.5 py-0.5 rounded border border-purple-200">
                            Logged In
                          </span>
                        )}
                        {!u.isActive && (
                          <span className="text-[9px] bg-rose-100 text-rose-800 font-black px-1.5 py-0.5 rounded border border-rose-200">
                            Suspended
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-stone-500 font-mono flex items-center gap-2 mt-0.5">
                        <span className="font-bold text-stone-800">@{u.username}</span>
                        {u.phone && (
                          <>
                            <span>•</span>
                            <span>{u.phone}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-lg text-[10px] uppercase font-black tracking-wider border ${
                      roleBadgeColors[u.role]
                    }`}
                  >
                    {u.role}
                  </span>
                </div>

                {/* PIN & Login Security Row */}
                <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-150 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2 font-mono">
                    <KeyRound className="w-3.5 h-3.5 text-stone-400" />
                    <span className="text-stone-500">4-Digit PIN:</span>
                    <span className="font-black text-stone-900 bg-stone-200/80 px-2 py-0.5 rounded tracking-widest">
                      {showPins ? (u.pin || '1234') : '••••'}
                    </span>
                  </div>
                  <span className="text-[10px] text-stone-400 font-mono">
                    Created {new Date(u.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Permitted Modules */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 flex items-center justify-between">
                    <span>Authorized Modules:</span>
                    <span className="text-stone-500 font-mono">{userMods.length} of 5 modules</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_MODULES.map((m) => {
                      const isAllowed = userMods.includes(m.id);
                      const Icon = m.icon;
                      return (
                        <div
                          key={m.id}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 border transition ${
                            isAllowed
                              ? m.color
                              : 'bg-stone-100/60 text-stone-400 border-stone-200 line-through opacity-50'
                          }`}
                        >
                          <Icon className="w-3 h-3 shrink-0" />
                          <span>{m.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Special Responsibilities Badges */}
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    Special Responsibilities & Safeguards:
                  </div>
                  <div className="flex flex-wrap gap-1 text-[10px] font-medium">
                    {u.canViewCostProfit ? (
                      <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                        ✓ Views Cost & Profits
                      </span>
                    ) : (
                      <span className="bg-stone-100 text-stone-400 px-2 py-0.5 rounded">
                        ✗ Profit Margins Hidden
                      </span>
                    )}

                    {u.canApplyDiscount ? (
                      <span className="bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded font-bold">
                        ✓ Apply Discounts
                      </span>
                    ) : (
                      <span className="bg-stone-100 text-stone-400 px-2 py-0.5 rounded">
                        ✗ No Discounts
                      </span>
                    )}

                    {u.canProcessRefund ? (
                      <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-bold">
                        ✓ Voids & Refunds
                      </span>
                    ) : (
                      <span className="bg-stone-100 text-stone-400 px-2 py-0.5 rounded">
                        ✗ No Refunds
                      </span>
                    )}

                    {u.canAdjustInventory && (
                      <span className="bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 rounded font-bold">
                        ✓ Manual Stock Corrections
                      </span>
                    )}

                    {u.canReceiveStock && (
                      <span className="bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded font-bold">
                        ✓ Receive Shipments
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleOpenEditModal(u)}
                  className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-xl flex items-center gap-1.5 transition text-[11px]"
                >
                  <Edit2 className="w-3 h-3 text-blue-600" />
                  <span>Assign Responsibilities & Edit</span>
                </button>

                {!isMe && users.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setDeleteCandidate(u)}
                    className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Delete Staff Account"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/70 p-3 sm:p-4 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-stone-200 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-4 sm:p-5 bg-stone-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-400 text-stone-950 flex items-center justify-center font-black">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base">
                    {editingUserId ? 'Edit Staff Responsibilities & Access' : 'Create New Staff Account'}
                  </h3>
                  <p className="text-[11px] text-stone-400">
                    Control which tabs and operational powers this employee can access in Addition Business Centre
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-4 sm:p-5 space-y-4 overflow-y-auto text-xs">
              {/* Basic Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-stone-700 font-bold">Staff Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cashier Sarah Doe"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (!editingUserId && !username) {
                        setUsername(e.target.value.toLowerCase().replace(/\s+/g, '_'));
                      }
                    }}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 font-semibold focus:outline-none focus:bg-white focus:border-stone-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-stone-700 font-bold">Username for Sign-In *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-mono">@</span>
                    <input
                      type="text"
                      required
                      placeholder="sarah_doe"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                      className="w-full pl-7 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 font-mono font-bold focus:outline-none focus:bg-white focus:border-stone-900"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-stone-700 font-bold">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+231 77 000 0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 font-mono focus:outline-none focus:bg-white focus:border-stone-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-stone-700 font-bold">4-Digit Login PIN Password *</label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    placeholder="1234"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 font-mono font-black text-sm tracking-widest focus:outline-none focus:bg-white focus:border-stone-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-stone-700 font-bold">Account Status</label>
                  <label className="flex items-center gap-2 p-2 bg-stone-50 border border-stone-300 rounded-xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 border-stone-300 focus:ring-0"
                    />
                    <span className="font-bold text-stone-800">
                      {isActive ? 'Active (Allowed to sign in)' : 'Suspended (Access blocked)'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Role Preset Selector */}
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
                <label className="text-stone-700 font-extrabold flex items-center justify-between">
                  <span>Role Level & Quick Presets:</span>
                  <span className="text-stone-400 font-normal">Click a preset to auto-configure access</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => applyRolePreset('cashier')}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                      role === 'cashier'
                        ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
                        : 'bg-white hover:bg-stone-100 text-stone-800 border-stone-200'
                    }`}
                  >
                    <span className="font-black text-xs uppercase">Cashier</span>
                    <span className={`text-[10px] mt-1 ${role === 'cashier' ? 'text-emerald-100' : 'text-stone-500'}`}>
                      POS sales only. Profit margins hidden.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyRolePreset('manager')}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                      role === 'manager'
                        ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                        : 'bg-white hover:bg-stone-100 text-stone-800 border-stone-200'
                    }`}
                  >
                    <span className="font-black text-xs uppercase">Manager</span>
                    <span className={`text-[10px] mt-1 ${role === 'manager' ? 'text-blue-100' : 'text-stone-500'}`}>
                      POS, Inventory, Orders & Reports.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyRolePreset('owner')}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                      role === 'owner'
                        ? 'bg-purple-700 text-white border-purple-800 shadow-sm'
                        : 'bg-white hover:bg-stone-100 text-stone-800 border-stone-200'
                    }`}
                  >
                    <span className="font-black text-xs uppercase">Owner</span>
                    <span className={`text-[10px] mt-1 ${role === 'owner' ? 'text-purple-100' : 'text-stone-500'}`}>
                      Full unrestricted master admin access.
                    </span>
                  </button>
                </div>
              </div>

              {/* MODULE ACCESS CHECKBOXES */}
              <div className="space-y-2 border-t border-stone-200 pt-3">
                <div className="flex items-center justify-between">
                  <label className="text-stone-900 font-extrabold text-xs flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-blue-600" />
                    <span>Modules This User Can Access ({allowedModules.length} selected)</span>
                  </label>
                  <span className="text-[11px] text-stone-500 font-medium">Unchecked modules won&apos;t appear in their menu</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {ALL_MODULES.map((m) => {
                    const isChecked = allowedModules.includes(m.id);
                    const Icon = m.icon;
                    return (
                      <div
                        key={m.id}
                        onClick={() => toggleModule(m.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-3 select-none ${
                          isChecked
                            ? 'bg-blue-50/50 border-blue-300 shadow-2xs'
                            : 'bg-stone-50 border-stone-200 hover:bg-stone-100 opacity-70'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="mt-0.5 w-4 h-4 rounded text-blue-600 border-stone-300 focus:ring-0 pointer-events-none"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-extrabold text-stone-900 flex items-center gap-1.5">
                            <Icon className="w-3.5 h-3.5 text-stone-700" />
                            <span>{m.label}</span>
                          </div>
                          <p className="text-[11px] text-stone-500 mt-0.5 leading-snug">
                            {m.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* GRANULAR OPERATIONAL RESPONSIBILITIES */}
              <div className="space-y-2 border-t border-stone-200 pt-3">
                <label className="text-stone-900 font-extrabold text-xs flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-purple-600" />
                  <span>Operational Responsibilities & Safeguards</span>
                </label>

                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 p-2.5 bg-stone-50 border border-stone-200 rounded-xl cursor-pointer hover:bg-stone-100/70 transition">
                    <input
                      type="checkbox"
                      checked={canViewCostProfit}
                      onChange={(e) => setCanViewCostProfit(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 border-stone-300 focus:ring-0"
                    />
                    <div className="flex-1">
                      <span className="font-bold text-stone-900">View Wholesale Cost & Profit Margins</span>
                      <p className="text-[10px] text-stone-500">
                        When unchecked, purchase cost, wholesale invoices, and profit totals are strictly hidden from this user.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 bg-stone-50 border border-stone-200 rounded-xl cursor-pointer hover:bg-stone-100/70 transition">
                    <input
                      type="checkbox"
                      checked={canApplyDiscount}
                      onChange={(e) => setCanApplyDiscount(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 border-stone-300 focus:ring-0"
                    />
                    <div className="flex-1">
                      <span className="font-bold text-stone-900">Apply Custom Discounts at Checkout</span>
                      <p className="text-[10px] text-stone-500">
                        Allows user to deduct custom percentage or dollar discounts during POS sales transactions.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 bg-stone-50 border border-stone-200 rounded-xl cursor-pointer hover:bg-stone-100/70 transition">
                    <input
                      type="checkbox"
                      checked={canProcessRefund}
                      onChange={(e) => setCanProcessRefund(e.target.checked)}
                      className="w-4 h-4 rounded text-rose-600 border-stone-300 focus:ring-0"
                    />
                    <div className="flex-1">
                      <span className="font-bold text-stone-900">Process Refunds & Void Completed Sales</span>
                      <p className="text-[10px] text-stone-500">
                        Enables cancellation of completed receipts, reversal of stock deductions, and cash refunds.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 bg-stone-50 border border-stone-200 rounded-xl cursor-pointer hover:bg-stone-100/70 transition">
                    <input
                      type="checkbox"
                      checked={canAdjustInventory}
                      onChange={(e) => setCanAdjustInventory(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-600 border-stone-300 focus:ring-0"
                    />
                    <div className="flex-1">
                      <span className="font-bold text-stone-900">Manual Stock Corrections & Shrinkage Adjustments</span>
                      <p className="text-[10px] text-stone-500">
                        Allows clerk to overwrite stock quantity counts during physical inventory audits.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 bg-stone-50 border border-stone-200 rounded-xl cursor-pointer hover:bg-stone-100/70 transition">
                    <input
                      type="checkbox"
                      checked={canReceiveStock}
                      onChange={(e) => setCanReceiveStock(e.target.checked)}
                      className="w-4 h-4 rounded text-teal-600 border-stone-300 focus:ring-0"
                    />
                    <div className="flex-1">
                      <span className="font-bold text-stone-900">Receive New Supplier Shipments (Stock Intake)</span>
                      <p className="text-[10px] text-stone-500">
                        Allows user to record new purchase intake shipments, lot expiry dates, and supplier costs.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-6 py-2 bg-stone-900 hover:bg-stone-800 text-white font-extrabold rounded-xl transition shadow flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>{editingUserId ? 'Save User Responsibilities' : 'Create Staff Account'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/70 p-4 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-stone-200 w-full max-w-sm rounded-2xl p-5 space-y-4 text-xs shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-stone-900">Delete Staff Account?</h3>
                <p className="text-[11px] text-stone-500 mt-0.5 font-mono">
                  Username: @{deleteCandidate.username}
                </p>
              </div>
            </div>

            <p className="text-stone-700 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-stone-950 font-bold">{deleteCandidate.name}</strong>? They will no longer be able to log in to Addition Business Centre.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setDeleteCandidate(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition shadow-xs flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Account</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
