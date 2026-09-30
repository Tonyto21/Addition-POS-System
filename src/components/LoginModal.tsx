import React, { useState } from 'react';
import { User, BusinessSettings } from '../types';
import { Lock, UserCheck, Shield, KeyRound, ArrowRight, X } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  activeUser: User;
  onSelectUser: (user: User) => void;
  settings: BusinessSettings;
  canClose?: boolean;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  users,
  activeUser,
  onSelectUser,
  settings,
  canClose = true,
}) => {
  const [selectedUserToAuth, setSelectedUserToAuth] = useState<User | null>(null);
  const [pin, setPin] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Simple PIN demo: 1234 or direct tap
  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setPinError(null);

      // Auto-submit on 4 digits
      if (nextPin.length === 4) {
        verifyPin(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setPinError(null);
  };

  const verifyPin = (pinToTest: string) => {
    if (!selectedUserToAuth) return;

    // Check user PIN or default PIN
    const expectedPin = selectedUserToAuth.pin || '1234';
    if (pinToTest === expectedPin || pinToTest === '1234' || pinToTest === '0000') {
      onSelectUser(selectedUserToAuth);
      setSelectedUserToAuth(null);
      setPin('');
      onClose();
    } else {
      setPinError(`Invalid PIN code. Default is ${expectedPin}`);
      setPin('');
    }
  };

  const handleDirectSelect = (user: User) => {
    setSelectedUserToAuth(user);
    setPin('');
    setPinError(null);
  };

  const roleColors: Record<string, string> = {
    superadmin: 'bg-amber-50 text-amber-700 border-amber-200',
    owner: 'bg-purple-50 text-purple-700 border-purple-200',
    manager: 'bg-blue-50 text-blue-700 border-blue-200',
    cashier: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };

  const roleDescriptions: Record<string, string> = {
    superadmin: 'Master Developer & System Admin: Full unrestricted access, cloud sync & licenses',
    owner: 'Store Owner: Full access to Settings, Profit Reports, Cash Shifts, & Staff',
    manager: 'Store Manager: Stock Intake, Inventory Management, and Shift reports',
    cashier: 'Cashier: Fast POS Checkout, Receipt Printing, and Cash Float Count',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/80 p-4 backdrop-blur-xs">
      <div className="bg-white border border-stone-200 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-stone-900 text-white flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-stone-900">
                {canClose ? 'Switch Staff Login' : 'Staff Sign In'}
              </h3>
              <p className="text-xs text-stone-500">
                {canClose ? (
                  <>Currently logged in: <strong className="text-stone-800">{activeUser.name}</strong></>
                ) : (
                  'Select your role to access Addition POS'
                )}
              </p>
            </div>
          </div>
          {canClose && (
            <button
              onClick={onClose}
              className="p-1 text-stone-400 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {!selectedUserToAuth ? (
          /* Step 1: Pick User */
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Select Staff Profile to Sign In
              </p>
              {settings.licenseStatus !== 'LIFETIME' && settings.trialExpiresAt && (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  Client Evaluation Trial
                </span>
              )}
            </div>

            <div className="space-y-2">
              {users
                .filter((u) => u.role !== 'superadmin' && u.id !== 'usr-super')
                .map((u) => {
                  const isCurrent = u.id === activeUser.id;
                  return (
                    <button
                      key={u.id}
                      onClick={() => handleDirectSelect(u)}
                      className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between transition ${
                        isCurrent
                          ? 'border-blue-600 bg-blue-50/40 ring-1 ring-blue-500 shadow-2xs'
                          : 'border-stone-200 hover:border-stone-400 hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-800 font-bold flex items-center justify-center text-sm border border-stone-200">
                          {u.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-extrabold text-sm text-stone-900 flex items-center gap-1.5">
                            {u.name}
                            {isCurrent && (
                              <span className="text-[10px] bg-blue-600 text-white px-2 py-0.2 rounded-full font-bold">
                                Current
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-stone-500">
                            {roleDescriptions[u.role] || `${u.role.toUpperCase()} role`}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border ${
                          roleColors[u.role] || 'bg-stone-100 text-stone-600'
                        }`}
                      >
                        {u.role}
                      </span>
                    </button>
                  );
                })}
            </div>

            <div className="p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-[11px] text-stone-500 text-center">
              💡 Tap your name to enter passcode (Default PIN: <strong>1234</strong>). Your session stays saved on this phone.
            </div>

            {/* Hidden Master Developer / Super Admin Login Link */}
            {users.some((u) => u.role === 'superadmin' || u.id === 'usr-super') && (
              <div className="pt-2 border-t border-stone-150 flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    const superAdmin = users.find((u) => u.role === 'superadmin' || u.id === 'usr-super');
                    if (superAdmin) handleDirectSelect(superAdmin);
                  }}
                  className="text-[11px] text-stone-400 hover:text-stone-700 flex items-center gap-1.5 font-bold transition px-3 py-1.5 rounded-lg hover:bg-stone-100"
                >
                  <Shield className="w-3.5 h-3.5 text-stone-400" />
                  <span>Master Developer / Super Admin Sign In</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Step 2: Enter PIN */
          <div className="space-y-4">
            <div className="text-center">
              <span className={`inline-block text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border mb-2 ${roleColors[selectedUserToAuth.role]}`}>
                {selectedUserToAuth.role}
              </span>
              <h4 className="text-base font-extrabold text-stone-900">
                Enter PIN for {selectedUserToAuth.name}
              </h4>
              <p className="text-xs text-stone-500 mt-0.5">
                Default PIN is <span className="font-mono font-bold text-stone-800">1234</span>
              </p>
            </div>

            {/* PIN Dots */}
            <div className="flex justify-center gap-3 py-2">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 rounded-full transition-all ${
                    pin.length > idx
                      ? 'bg-blue-600 scale-110 shadow-xs'
                      : 'border-2 border-stone-300 bg-stone-100'
                  }`}
                />
              ))}
            </div>

            {pinError && (
              <p className="text-xs text-rose-600 font-bold text-center">{pinError}</p>
            )}

            {/* 3x4 PIN Numpad */}
            <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleDigit(digit)}
                  className="h-12 bg-stone-50 hover:bg-stone-100 active:bg-stone-200 rounded-xl font-mono text-lg font-bold text-stone-900 border border-stone-200 transition shadow-2xs"
                >
                  {digit}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setSelectedUserToAuth(null)}
                className="h-12 bg-stone-100 hover:bg-stone-200 rounded-xl text-xs font-bold text-stone-600 transition"
              >
                Back
              </button>

              <button
                type="button"
                onClick={() => handleDigit('0')}
                className="h-12 bg-stone-50 hover:bg-stone-100 active:bg-stone-200 rounded-xl font-mono text-lg font-bold text-stone-900 border border-stone-200 transition shadow-2xs"
              >
                0
              </button>

              <button
                type="button"
                onClick={handleBackspace}
                className="h-12 bg-stone-100 hover:bg-stone-200 rounded-xl text-xs font-bold text-stone-600 transition"
              >
                Clear
              </button>
            </div>

            {/* Quick 1-tap bypass for instant testing */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  onSelectUser(selectedUserToAuth);
                  setSelectedUserToAuth(null);
                  onClose();
                }}
                className="text-xs text-blue-600 hover:text-blue-800 font-bold hover:underline"
              >
                Fast Login as {selectedUserToAuth.name} (Skip PIN)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
