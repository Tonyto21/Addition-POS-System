import React, { useState, useEffect, useRef } from 'react';
import {
  Cloud,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Download,
  Upload,
  Server,
  FileJson,
  Smartphone,
  Monitor,
  Check,
  Zap,
  FileCode,
} from 'lucide-react';
import { CloudSyncManager, SyncStatus } from '../utils/cloudSync';
import { OfflineStorageManager } from '../utils/storage';
import { Product } from '../types';

interface CloudSyncViewProps {
  onDataImported?: () => void;
  isCompact?: boolean;
}

export const CloudSyncView: React.FC<CloudSyncViewProps> = ({
  onDataImported,
  isCompact = false,
}) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Local device state
  const [localProducts, setLocalProducts] = useState<Product[]>(() => OfflineStorageManager.getProducts());
  const [localSettings, setLocalSettings] = useState(() => OfflineStorageManager.getSettings());

  // Server URL settings
  const [serverUrl, setServerUrl] = useState(() => CloudSyncManager.getSyncServerUrl());
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Status feedback
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const unsubscribe = CloudSyncManager.subscribe((status, time, error) => {
      setSyncStatus(status);
      setLastSyncTime(time);
      setLastError(error || null);
    });

    const handleStorage = () => {
      setLocalProducts(OfflineStorageManager.getProducts());
      setLocalSettings(OfflineStorageManager.getSettings());
    };
    window.addEventListener('app-storage-updated', handleStorage);

    setServerUrl(CloudSyncManager.getSyncServerUrl());
    return () => {
      unsubscribe();
      window.removeEventListener('app-storage-updated', handleStorage);
    };
  }, []);

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setActionError(msg);
      setActionSuccess(null);
    } else {
      setActionSuccess(msg);
      setActionError(null);
    }
    setTimeout(() => {
      setActionSuccess(null);
      setActionError(null);
    }, 4500);
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setLastError(null);
    try {
      const ok = await CloudSyncManager.syncBidirectional();
      if (ok) {
        if (onDataImported) onDataImported();
        setLocalProducts(OfflineStorageManager.getProducts());
        showNotification('Sync complete! Device inventory is up to date.');
      } else {
        showNotification('Sync attempt completed.', false);
      }
    } catch (err: any) {
      setLastError(err.message || 'Sync failed');
      showNotification(err.message || 'Sync failed', true);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportData = () => {
    try {
      const data = OfflineStorageManager.getAllDataForSync();
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `addition-pos-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showNotification('Backup downloaded successfully!');
    } catch (err: any) {
      showNotification(`Failed to generate backup: ${err.message}`, true);
    }
  };

  // Immediate Import: When user selects a JSON file, parse and apply immediately
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) throw new Error('File was empty');

        let parsed = JSON.parse(text);
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Invalid JSON structure');
        }

        // Support both direct object state or wrapped { clientData: ... } / { data: ... }
        if (parsed.clientData && typeof parsed.clientData === 'object') {
          parsed = parsed.clientData;
        } else if (parsed.data && typeof parsed.data === 'object' && !Array.isArray(parsed.data)) {
          parsed = parsed.data;
        }

        // If user exported an array of products directly, wrap into products object
        if (Array.isArray(parsed)) {
          parsed = { products: parsed };
        }

        // Apply state immediately with mode 'merge'
        OfflineStorageManager.applyServerState(parsed, 'merge');
        const updatedProds = OfflineStorageManager.getProducts();
        setLocalProducts(updatedProds);
        setLocalSettings(OfflineStorageManager.getSettings());

        // Notify parent views and broadcast UI refresh event
        if (onDataImported) onDataImported();
        window.dispatchEvent(new CustomEvent('app-storage-updated', { detail: { source: 'manual-import' } }));

        // Push to server automatically
        CloudSyncManager.syncBidirectional().catch((err) => console.warn('Background sync after import:', err));

        showNotification(
          `Backup restored successfully! Total ${updatedProds.length} items now available in your catalog.`
        );
      } catch (err: any) {
        showNotification(`Could not import backup file: ${err.message}`, true);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await CloudSyncManager.testConnection();
      setTestResult({ ok: res.ok, message: res.message });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveServerUrl = () => {
    CloudSyncManager.setSyncServerUrl(serverUrl);
    setTestResult({ ok: true, message: 'Server URL saved. Automatic sync initiated.' });
    CloudSyncManager.syncBidirectional();
  };

  const isMobileDevice = typeof window !== 'undefined' && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

  return (
    <div className="space-y-4 text-stone-900">
      {/* Device & Sync Status Header */}
      <div className="p-4 bg-white border border-stone-200 rounded-2xl shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
            {isMobileDevice ? <Smartphone className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
          </div>
          <div>
            <div className="font-extrabold text-stone-900 text-sm flex items-center gap-2">
              <span>{isMobileDevice ? 'Mobile Device' : 'Desktop / Web Workstation'}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="text-xs text-stone-500 font-medium">
              <span>Total Catalog Items: </span>
              <strong className="text-stone-900 font-mono text-sm">{localProducts.length}</strong>
              {localSettings?.exchangeRate && (
                <span className="ml-2 text-stone-400">
                  (Rate: 1 USD = {localSettings.exchangeRate} LRD)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Sync Now Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-xs active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Backup & Direct File Import Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card 1: Download Backup */}
        <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl flex flex-col justify-between space-y-3">
          <div className="space-y-1">
            <div className="font-extrabold text-stone-900 text-xs sm:text-sm flex items-center gap-2">
              <Download className="w-4 h-4 text-blue-600" />
              <span>Download Store Backup</span>
            </div>
            <p className="text-stone-500 text-xs leading-relaxed">
              Export all products, categories, stock batches, price rules, and sales transactions into a standard JSON backup file.
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportData}
            className="w-full py-2.5 bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-2xs active:scale-98"
          >
            <FileJson className="w-4 h-4 text-blue-600" />
            <span>Download Backup (.json)</span>
          </button>
        </div>

        {/* Card 2: Direct File Restore */}
        <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl flex flex-col justify-between space-y-3">
          <div className="space-y-1">
            <div className="font-extrabold text-stone-900 text-xs sm:text-sm flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-600" />
              <span>Restore from Backup</span>
            </div>
            <p className="text-stone-500 text-xs leading-relaxed">
              Select a previously exported backup file to restore or merge items and stock records onto this device immediately.
            </p>
          </div>

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-2xs active:scale-98"
            >
              <Upload className="w-4 h-4" />
              <span>Select Backup File to Restore</span>
            </button>
          </div>
        </div>

        {/* Card 3: Download Complete Source Code (.ZIP) */}
        <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl flex flex-col justify-between space-y-3">
          <div className="space-y-1">
            <div className="font-extrabold text-stone-900 text-xs sm:text-sm flex items-center gap-2">
              <FileCode className="w-4 h-4 text-purple-600" />
              <span>Source Code Archive (.ZIP)</span>
            </div>
            <p className="text-stone-500 text-xs leading-relaxed">
              Download the entire project source code (React, TypeScript, Tailwind, Express) in a clean ZIP package ready for VS Code or deployment.
            </p>
          </div>

          <a
            href="/api/download-source-zip"
            download="addition-business-centre-source.zip"
            className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-2xs active:scale-98 text-center"
          >
            <Download className="w-4 h-4 text-white" />
            <span>Download Source (.zip)</span>
          </a>
        </div>
      </div>

      {/* Cloud Sync Status & Settings Section */}
      <div className="p-4 bg-white border border-stone-200 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-blue-600" />
            <h4 className="font-bold text-xs text-stone-900">Background Cloud Synchronization</h4>
          </div>

          <button
            type="button"
            onClick={() => setShowServerConfig(!showServerConfig)}
            className="text-[11px] font-bold text-stone-500 hover:text-stone-900 flex items-center gap-1 transition"
          >
            <Server className="w-3 h-3" />
            <span>{showServerConfig ? 'Hide Server URL' : 'Configure Server URL'}</span>
          </button>
        </div>

        <div className="text-xs text-stone-600 flex flex-wrap items-center gap-x-4 gap-y-1">
          <div>
            Status:{' '}
            <span
              className={`font-bold ${
                syncStatus === 'synced'
                  ? 'text-emerald-600'
                  : syncStatus === 'syncing'
                  ? 'text-blue-600'
                  : syncStatus === 'error'
                  ? 'text-rose-600'
                  : 'text-stone-700'
              }`}
            >
              {syncStatus === 'synced'
                ? 'Cloud Connected'
                : syncStatus === 'syncing'
                ? 'Syncing In Progress...'
                : syncStatus === 'error'
                ? 'Offline / Sync Pending'
                : 'Ready'}
            </span>
          </div>

          {lastSyncTime && (
            <div className="text-stone-400">
              Last Synced: {lastSyncTime.toLocaleTimeString()}
            </div>
          )}
        </div>

        {/* Optional Server URL Config */}
        {showServerConfig && (
          <div className="pt-3 border-t border-stone-100 space-y-2.5 animate-in fade-in">
            <label className="text-[11px] font-bold text-stone-700 block">
              Sync Server URL (leave blank to use current domain / Cloud Run host)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="https://your-domain.run.app"
                className="flex-1 bg-stone-50 border border-stone-300 rounded-xl px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:border-blue-600 font-mono"
              />
              <button
                type="button"
                onClick={handleSaveServerUrl}
                className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition shrink-0"
              >
                Save
              </button>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold border border-stone-300 transition shrink-0"
              >
                {isTesting ? 'Testing...' : 'Test'}
              </button>
            </div>
            {testResult && (
              <p
                className={`text-[11px] font-bold ${
                  testResult.ok ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {testResult.message}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
