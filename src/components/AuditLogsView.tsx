import React, { useState } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  Calendar,
  User,
  Clock,
  FileText,
} from 'lucide-react';
import { AuditLogEntry } from '../types';
import { OfflineStorageManager } from '../utils/storage';

export const AuditLogsView: React.FC = () => {
  const [logs] = useState<AuditLogEntry[]>(() => OfflineStorageManager.getAuditLogs());
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLogs = logs.filter((log) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      log.action.toLowerCase().includes(q) ||
      log.entityType.toLowerCase().includes(q) ||
      log.userName.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-emerald-400" />
            Security & Operational Audit Log
          </h2>
          <p className="text-xs text-slate-400">
            Immutable tracking of price edits, inventory adjustments, cancelled carts, and drawer reconciliations
          </p>
        </div>

        <div className="text-xs font-mono text-slate-400">
          {logs.length} Logged Events
        </div>
      </div>

      {/* Search */}
      <div className="p-3 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between text-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search action, user, or details..."
            className="w-full bg-slate-950 border border-slate-700 rounded-md pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Log list */}
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-850 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3">Timestamp</th>
                <th className="p-3">User</th>
                <th className="p-3">Action</th>
                <th className="p-3">Entity</th>
                <th className="p-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredLogs.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-850/40">
                  <td className="p-3 text-slate-400 font-mono whitespace-nowrap">
                    {new Date(entry.timestamp).toLocaleString()}
                  </td>
                  <td className="p-3 text-white font-medium whitespace-nowrap">
                    {entry.userName}
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 border border-slate-700 text-slate-300">
                      {entry.action}
                    </span>
                  </td>
                  <td className="p-3 text-slate-400 font-mono whitespace-nowrap">
                    {entry.entityType}
                  </td>
                  <td className="p-3 text-slate-200">{entry.details}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredLogs.length === 0 && (
            <div className="text-center py-10 text-slate-500 text-xs">
              No audit logs matching query.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
