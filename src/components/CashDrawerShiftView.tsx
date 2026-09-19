import React, { useState } from 'react';
import {
  DollarSign,
  Lock,
  Unlock,
  PlusCircle,
  MinusCircle,
  AlertCircle,
  Check,
  History,
  TrendingUp,
} from 'lucide-react';
import { BusinessSettings, CashSession, User } from '../types';
import { OfflineStorageManager } from '../utils/storage';

interface CashDrawerShiftViewProps {
  settings: BusinessSettings;
  activeUser: User;
  onRefresh: () => void;
}

export const CashDrawerShiftView: React.FC<CashDrawerShiftViewProps> = ({
  settings,
  activeUser,
  onRefresh,
}) => {
  const [activeSession, setActiveSession] = useState<CashSession | null>(() =>
    OfflineStorageManager.getActiveCashSession()
  );
  const [sessions, setSessions] = useState<CashSession[]>(() =>
    OfflineStorageManager.getCashSessions()
  );

  // Open Shift Form
  const [openingUSD, setOpeningUSD] = useState<number>(50);
  const [openingLRD, setOpeningLRD] = useState<number>(5000);

  // Close Shift Form
  const [closingUSD, setClosingUSD] = useState<number>(0);
  const [closingLRD, setClosingLRD] = useState<number>(0);
  const [closingNotes, setClosingNotes] = useState<string>('');

  // Cash Movement (Payout / Float add)
  const [movementModal, setMovementModal] = useState(false);
  const [movementType, setMovementType] = useState<'PAYOUT' | 'ADD_CASH'>('PAYOUT');
  const [movementUSD, setMovementUSD] = useState<number>(0);
  const [movementLRD, setMovementLRD] = useState<number>(0);
  const [movementReason, setMovementReason] = useState<string>('Shop utility expense');

  const handleOpenShift = (e: React.FormEvent) => {
    e.preventDefault();
    const session = OfflineStorageManager.openCashSession(
      activeUser.name,
      Number(openingUSD) || 0,
      Number(openingLRD) || 0
    );
    setActiveSession(session);
    setSessions(OfflineStorageManager.getCashSessions());
    onRefresh();
  };

  const handleCloseShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) return;

    OfflineStorageManager.closeCashSession(
      activeSession.id,
      activeUser.name,
      Number(closingUSD) || 0,
      Number(closingLRD) || 0,
      closingNotes
    );

    setActiveSession(null);
    setSessions(OfflineStorageManager.getCashSessions());
    onRefresh();
  };

  const handleAddMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) return;

    const usd = Number(movementUSD) || 0;
    const lrd = Number(movementLRD) || 0;

    const mov = {
      id: `mov-${Date.now()}`,
      type: movementType,
      amountUSD: usd,
      amountLRD: lrd,
      reason: movementReason,
      timestamp: new Date().toISOString(),
      authorizedBy: activeUser.name,
    };

    activeSession.movements.push(mov);

    if (movementType === 'PAYOUT') {
      activeSession.expectedCashUSD -= usd;
      activeSession.expectedCashLRD -= lrd;
    } else {
      activeSession.expectedCashUSD += usd;
      activeSession.expectedCashLRD += lrd;
    }

    OfflineStorageManager.saveCashSession(activeSession);
    setActiveSession({ ...activeSession });
    setMovementModal(false);
    setMovementUSD(0);
    setMovementLRD(0);
    onRefresh();
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950 text-slate-100">
      {/* Top Banner */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            Cash Drawer Shifts & Drawer Reconciliation
          </h2>
          <p className="text-xs text-slate-400">
            Shift floats, expense payouts, and end-of-day cash drawer discrepancy audits
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeSession && (
            <button
              onClick={() => setMovementModal(true)}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-1.5"
            >
              <MinusCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Record Drawer Payout / Drop</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col lg:flex-row gap-4">
        {/* Active Shift Management */}
        <div className="w-full lg:w-96 space-y-4">
          {activeSession ? (
            <div className="p-4 bg-slate-900 border border-emerald-800/60 rounded-xl space-y-3.5 text-xs shadow-lg">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded bg-emerald-950 text-emerald-300 font-bold flex items-center gap-1.5">
                  <Unlock className="w-3.5 h-3.5" /> Shift In Progress (OPEN)
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {new Date(activeSession.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div className="space-y-1 text-slate-300">
                <div>
                  Cashier: <strong className="text-white">{activeSession.openedBy}</strong>
                </div>
                <div>
                  Starting Float: <strong className="font-mono text-emerald-400">${activeSession.openingCashUSD.toFixed(2)} USD</strong> /{' '}
                  <strong className="font-mono text-amber-300">L$ {activeSession.openingCashLRD.toFixed(0)} LRD</strong>
                </div>
                <div>
                  Sales Recorded Today: <strong className="font-mono text-white">${activeSession.totalSalesUSD.toFixed(2)} USD</strong> /{' '}
                  <strong className="font-mono text-white">L$ {activeSession.totalSalesLRD.toFixed(0)} LRD</strong>
                </div>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
                <div className="text-[11px] text-slate-400 font-semibold uppercase">Expected In Drawer Now:</div>
                <div className="flex justify-between items-baseline">
                  <span className="text-base font-bold text-emerald-400 font-mono">
                    ${activeSession.expectedCashUSD.toFixed(2)} USD
                  </span>
                  <span className="text-sm font-bold text-amber-300 font-mono">
                    L$ {activeSession.expectedCashLRD.toFixed(0)} LRD
                  </span>
                </div>
              </div>

              {/* Close Shift Form */}
              <form onSubmit={handleCloseShift} className="pt-2 border-t border-slate-800 space-y-2.5">
                <h4 className="font-bold text-slate-200">Reconcile & Close Shift</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-400">Actual Count (USD)</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      placeholder="$0.00"
                      value={closingUSD}
                      onChange={(e) => setClosingUSD(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400">Actual Count (LRD)</label>
                    <input
                      type="number"
                      step="5"
                      required
                      placeholder="L$ 0"
                      value={closingLRD}
                      onChange={(e) => setClosingLRD(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400">Shift Closing Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. End of evening shift count"
                    value={closingNotes}
                    onChange={(e) => setClosingNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-red-700 hover:bg-red-600 text-white font-bold rounded-lg transition flex items-center justify-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Lock Drawer & Submit Reconciliation</span>
                </button>
              </form>
            </div>
          ) : (
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3 text-xs">
              <div className="flex items-center gap-2 text-slate-400">
                <Lock className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-slate-200">No Shift Currently Open</span>
              </div>
              <p className="text-slate-400">
                Enter opening float amounts to open the cash register for the day.
              </p>

              <form onSubmit={handleOpenShift} className="space-y-3 pt-2">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Opening Float in USD ($)</label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={openingUSD}
                    onChange={(e) => setOpeningUSD(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Opening Float in LRD (L$)</label>
                  <input
                    type="number"
                    step="50"
                    required
                    value={openingLRD}
                    onChange={(e) => setOpeningLRD(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white font-mono"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition flex items-center justify-center gap-1.5"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Open Cash Drawer Shift</span>
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Right: Shift History Table */}
        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden">
          <div className="p-3.5 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-emerald-400" /> Shift History & Audit Log
            </h3>
            <span className="text-xs text-slate-400">{sessions.length} shifts recorded</span>
          </div>

          <div className="flex-1 overflow-auto p-2">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-2.5">Date / Opened</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5">Cashier</th>
                  <th className="p-2.5 text-right">Starting Float</th>
                  <th className="p-2.5 text-right">Expected Cash</th>
                  <th className="p-2.5 text-right">Closed Count</th>
                  <th className="p-2.5 text-right">Variance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {sessions.map((s) => {
                  const diffUSD = s.closingCashUSD !== undefined ? s.closingCashUSD - s.expectedCashUSD : 0;
                  return (
                    <tr key={s.id} className="hover:bg-slate-850/40">
                      <td className="p-2.5 text-slate-300">
                        {new Date(s.openedAt).toLocaleDateString()}{' '}
                        <span className="text-[10px] text-slate-500">
                          {new Date(s.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td className="p-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            s.status === 'OPEN'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="p-2.5 text-white font-medium">{s.openedBy}</td>
                      <td className="p-2.5 text-right font-mono text-slate-300">
                        <div>${s.openingCashUSD.toFixed(2)}</div>
                        <div className="text-[10px] text-amber-400">L$ {s.openingCashLRD.toLocaleString()}</div>
                      </td>
                      <td className="p-2.5 text-right font-mono text-slate-200">
                        <div>${s.expectedCashUSD.toFixed(2)}</div>
                        <div className="text-[10px] text-amber-400">L$ {s.expectedCashLRD.toLocaleString()}</div>
                      </td>
                      <td className="p-2.5 text-right font-mono text-white">
                        {s.closingCashUSD !== undefined ? (
                          <>
                            <div>${s.closingCashUSD.toFixed(2)}</div>
                            <div className="text-[10px] text-amber-400">L$ {(s.closingCashLRD || 0).toLocaleString()}</div>
                          </>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold">
                        {s.closingCashUSD !== undefined ? (
                          <>
                            <div className={diffUSD === 0 ? 'text-slate-400' : diffUSD > 0 ? 'text-emerald-400' : 'text-red-400'}>
                              {diffUSD > 0 ? '+' : ''}${diffUSD.toFixed(2)}
                            </div>
                            {s.closingCashLRD !== undefined && (
                              <div className={(s.closingCashLRD - s.expectedCashLRD) === 0 ? 'text-slate-500 text-[10px]' : (s.closingCashLRD - s.expectedCashLRD) > 0 ? 'text-emerald-400 text-[10px]' : 'text-red-400 text-[10px]'}>
                                {(s.closingCashLRD - s.expectedCashLRD) > 0 ? '+' : ''}L$ {(s.closingCashLRD - s.expectedCashLRD).toLocaleString()}
                              </div>
                            )}
                          </>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {sessions.length === 0 && (
              <div className="text-center py-8 text-slate-500 text-xs">
                No past cash sessions recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Movement Modal */}
      {movementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-xl p-5 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-white">Record Drawer Payout / Cash Drop</h3>
            <form onSubmit={handleAddMovement} className="space-y-3">
              <div>
                <label className="text-slate-400 font-medium">Type</label>
                <select
                  value={movementType}
                  onChange={(e) => setMovementType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                >
                  <option value="PAYOUT">Cash Payout / Expense (Deducts from Drawer)</option>
                  <option value="ADD_CASH">Cash Float Injection (Adds to Drawer)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400">Amount USD ($)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={movementUSD}
                    onChange={(e) => setMovementUSD(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400">Amount LRD (L$)</label>
                  <input
                    type="number"
                    step="5"
                    value={movementLRD}
                    onChange={(e) => setMovementLRD(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400">Reason / Expense Description</label>
                <input
                  type="text"
                  required
                  value={movementReason}
                  onChange={(e) => setMovementReason(e.target.value)}
                  placeholder="e.g. Purchased generator diesel fuel"
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMovementModal(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded"
                >
                  Confirm Movement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
