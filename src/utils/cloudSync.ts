import { OfflineStorageManager } from './storage';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

interface SyncListener {
  (status: SyncStatus, lastSyncTime: Date | null, error?: string): void;
}

export class CloudSyncManager {
  private static status: SyncStatus = 'idle';
  private static lastSyncTime: Date | null = null;
  private static lastError: string | null = null;
  private static syncTimer: any = null;
  private static listeners: Set<SyncListener> = new Set();
  private static isSyncInProgress = false;
  private static pendingPush = false;

  static getSyncServerUrl(): string {
    if (typeof window === 'undefined') return '';
    const custom = localStorage.getItem('addition_pos_sync_server_url');
    if (custom && custom.trim()) {
      return custom.trim().replace(/\/+$/, '');
    }
    return '';
  }

  static setSyncServerUrl(url: string): void {
    if (typeof window === 'undefined') return;
    const clean = url ? url.trim().replace(/\/+$/, '') : '';
    if (!clean) {
      localStorage.removeItem('addition_pos_sync_server_url');
    } else {
      localStorage.setItem('addition_pos_sync_server_url', clean);
    }
    this.syncBidirectional();
  }

  static async testConnection(): Promise<{ ok: boolean; message: string; serverStats?: any }> {
    const baseUrl = this.getSyncServerUrl();
    const endpoint = `${baseUrl}/api/health`;
    try {
      const res = await fetch(endpoint, { method: 'GET' });
      if (!res.ok) {
        return { ok: false, message: `Server returned HTTP ${res.status}` };
      }
      const data = await res.json();
      return {
        ok: true,
        message: 'Connected successfully to Addition Cloud Server!',
        serverStats: data.dbStats || data,
      };
    } catch (err: any) {
      return { ok: false, message: `Could not connect to ${endpoint}: ${err.message}` };
    }
  }

  static subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.status, this.lastSyncTime, this.lastError || undefined);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private static notify(error?: string) {
    this.lastError = error || null;
    this.listeners.forEach((fn) => fn(this.status, this.lastSyncTime, error));
  }

  static getStatus(): { status: SyncStatus; lastSyncTime: Date | null; lastError: string | null } {
    return { status: this.status, lastSyncTime: this.lastSyncTime, lastError: this.lastError };
  }

  static init(): void {
    if (typeof window === 'undefined') return;

    // Immediate initial bidirectional sync
    this.syncBidirectional();

    // Listen to storage update events (when user creates/edits items locally)
    window.addEventListener('app-storage-updated', (e: any) => {
      // If the update came from cloud sync itself, ignore to avoid feedback loop
      if (e.detail && e.detail.source === 'cloud-sync') return;
      this.triggerPush();
    });

    // Sync when coming back online or switching tabs
    window.addEventListener('online', () => {
      this.syncBidirectional();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.syncBidirectional();
      }
    });

    // Periodic polling every 3 seconds to catch updates made on mobile or other devices
    if (this.syncTimer) clearInterval(this.syncTimer);
    this.syncTimer = setInterval(() => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        this.syncBidirectional();
      }
    }, 3000);
  }

  static triggerPush(): void {
    if (this.isSyncInProgress) {
      this.pendingPush = true;
      return;
    }
    // Debounce slightly to collect batch edits
    setTimeout(() => {
      this.syncBidirectional();
    }, 250);
  }

  static async syncBidirectional(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    if (!navigator.onLine) {
      this.status = 'offline';
      this.notify('Device is offline');
      return false;
    }

    if (this.isSyncInProgress) {
      this.pendingPush = true;
      return false;
    }

    this.isSyncInProgress = true;
    this.status = 'syncing';
    this.notify();

    try {
      const clientData = OfflineStorageManager.getAllDataForSync();
      const baseUrl = this.getSyncServerUrl();
      const endpoint = `${baseUrl}/api/sync/bidirectional`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clientData }),
      });

      if (!response.ok) {
        throw new Error(`Server sync returned status ${response.status}`);
      }

      const result = await response.json();
      if (result && result.success && result.data) {
        OfflineStorageManager.applyServerState(result.data);
        this.status = 'synced';
        this.lastSyncTime = new Date();
        this.notify();
        this.isSyncInProgress = false;

        if (this.pendingPush) {
          this.pendingPush = false;
          this.syncBidirectional();
        }
        return true;
      } else {
        throw new Error('Invalid response from sync server');
      }
    } catch (err: any) {
      console.warn('Cloud sync note (will retry):', err.message);
      this.status = 'error';
      this.notify(err.message);
      this.isSyncInProgress = false;
      return false;
    }
  }
}
