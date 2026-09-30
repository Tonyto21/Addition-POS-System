import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Enable CORS for mobile devices, PWAs, and cross-origin sync
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// In-memory persistent server ledger
let serverSyncLedger: any[] = [];

// Persistent Server Database for Cross-Device Synchronization (Mobile <-> Web)
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'pos-database.json');

interface ServerDbState {
  products: any[];
  categories: any[];
  units: any[];
  suppliers: any[];
  customers: any[];
  sales: any[];
  receipts: any[];
  intakes: any[];
  batches: any[];
  movements: any[];
  repayments: any[];
  cashSessions: any[];
  settings: any | null;
  auditLogs: any[];
  users: any[];
  deletedIds: string[];
  lastUpdated: string;
}

function loadServerDb(): ServerDbState {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        products: Array.isArray(parsed.products) ? parsed.products : [],
        categories: Array.isArray(parsed.categories) ? parsed.categories : [],
        units: Array.isArray(parsed.units) ? parsed.units : [],
        suppliers: Array.isArray(parsed.suppliers) ? parsed.suppliers : [],
        customers: Array.isArray(parsed.customers) ? parsed.customers : [],
        sales: Array.isArray(parsed.sales) ? parsed.sales : [],
        receipts: Array.isArray(parsed.receipts) ? parsed.receipts : [],
        intakes: Array.isArray(parsed.intakes) ? parsed.intakes : [],
        batches: Array.isArray(parsed.batches) ? parsed.batches : [],
        movements: Array.isArray(parsed.movements) ? parsed.movements : [],
        repayments: Array.isArray(parsed.repayments) ? parsed.repayments : [],
        cashSessions: Array.isArray(parsed.cashSessions) ? parsed.cashSessions : [],
        settings: parsed.settings || null,
        auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
        users: Array.isArray(parsed.users) ? parsed.users : [],
        deletedIds: Array.isArray(parsed.deletedIds) ? parsed.deletedIds : [],
        lastUpdated: parsed.lastUpdated || new Date().toISOString(),
      };
    }
  } catch (err) {
    console.error('Error loading server db file:', err);
  }
  return {
    products: [],
    categories: [],
    units: [],
    suppliers: [],
    customers: [],
    sales: [],
    receipts: [],
    intakes: [],
    batches: [],
    movements: [],
    repayments: [],
    cashSessions: [],
    settings: null,
    auditLogs: [],
    users: [],
    deletedIds: [],
    lastUpdated: new Date().toISOString(),
  };
}

let serverDb: ServerDbState = loadServerDb();

function saveServerDb() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    serverDb.lastUpdated = new Date().toISOString();
    fs.writeFileSync(DB_FILE, JSON.stringify(serverDb, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing server db file:', err);
  }
}

// Merge collections idempotently by item id and latest timestamp
function mergeCollection<T extends { id: string; updatedAt?: string; createdAt?: string }>(
  serverList: T[] = [],
  clientList: T[] = []
): T[] {
  const map = new Map<string, T>();
  for (const item of serverList) {
    if (item && item.id) {
      map.set(item.id, item);
    }
  }
  for (const item of clientList) {
    if (item && item.id) {
      if (!map.has(item.id)) {
        map.set(item.id, item);
      } else {
        const existing = map.get(item.id)!;
        const existingTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
        const incomingTime = new Date(item.updatedAt || item.createdAt || 0).getTime();
        if (incomingTime >= existingTime) {
          map.set(item.id, item);
        }
      }
    }
  }
  return Array.from(map.values());
}

// Health & Status
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    system: 'Addition Shop POS Server',
    time: new Date().toISOString(),
    currencies: ['USD', 'LRD'],
    dbStats: {
      products: serverDb.products.length,
      sales: serverDb.sales.length,
      lastUpdated: serverDb.lastUpdated,
    },
  });
});

// Endpoint to download the clean project source code in a ZIP file
app.get('/api/download-source-zip', (req: Request, res: Response) => {
  const zipPath = path.join(process.cwd(), 'public', 'addition-business-centre-source.zip');
  if (fs.existsSync(zipPath)) {
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="addition-business-centre-source.zip"');
    const fileStream = fs.createReadStream(zipPath);
    return fileStream.pipe(res);
  }
  return res.status(404).json({ error: 'Source zip file not found' });
});

// Real-Time Cross-Device Sync Endpoints
app.get('/api/sync/state', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: serverDb,
    serverTime: new Date().toISOString(),
  });
});

app.post('/api/sync/bidirectional', (req: Request, res: Response) => {
  try {
    const { clientData } = req.body || {};
    if (!clientData || typeof clientData !== 'object') {
      return res.status(400).json({ error: 'clientData object expected' });
    }

    // Process deleted IDs from client and purge them across server collections
    if (Array.isArray(clientData.deletedIds)) {
      const currentDeleted = new Set(serverDb.deletedIds || []);
      clientData.deletedIds.forEach((id: string) => currentDeleted.add(id));
      serverDb.deletedIds = Array.from(currentDeleted);
    }
    const deletedSet = new Set(serverDb.deletedIds || []);

    // Purge any deleted items before merging
    serverDb.products = serverDb.products.filter((p) => !deletedSet.has(p.id));
    serverDb.categories = serverDb.categories.filter((c) => !deletedSet.has(c.id));
    serverDb.units = serverDb.units.filter((u) => !deletedSet.has(u.id));
    serverDb.suppliers = serverDb.suppliers.filter((s) => !deletedSet.has(s.id));
    serverDb.customers = serverDb.customers.filter((c) => !deletedSet.has(c.id));

    // Filter incoming items against deleted tombstones
    const sanitizeIncoming = <T extends { id?: string }>(list: any[]): T[] => {
      if (!Array.isArray(list)) return [];
      return list.filter((item) => item && item.id && !deletedSet.has(item.id));
    };

    // Merge each collection
    if (Array.isArray(clientData.products)) {
      serverDb.products = mergeCollection(serverDb.products, sanitizeIncoming(clientData.products));
    }
    if (Array.isArray(clientData.categories)) {
      serverDb.categories = mergeCollection(serverDb.categories, sanitizeIncoming(clientData.categories));
    }
    if (Array.isArray(clientData.units)) {
      serverDb.units = mergeCollection(serverDb.units, sanitizeIncoming(clientData.units));
    }
    if (Array.isArray(clientData.suppliers)) {
      serverDb.suppliers = mergeCollection(serverDb.suppliers, sanitizeIncoming(clientData.suppliers));
    }
    if (Array.isArray(clientData.customers)) {
      serverDb.customers = mergeCollection(serverDb.customers, sanitizeIncoming(clientData.customers));
    }
    if (Array.isArray(clientData.sales)) {
      serverDb.sales = mergeCollection(serverDb.sales, clientData.sales);
    }
    if (Array.isArray(clientData.receipts)) {
      serverDb.receipts = mergeCollection(serverDb.receipts, clientData.receipts);
    }
    if (Array.isArray(clientData.intakes)) {
      serverDb.intakes = mergeCollection(serverDb.intakes, clientData.intakes);
    }
    if (Array.isArray(clientData.batches)) {
      serverDb.batches = mergeCollection(serverDb.batches, clientData.batches);
    }
    if (Array.isArray(clientData.movements)) {
      serverDb.movements = mergeCollection(serverDb.movements, clientData.movements);
    }
    if (Array.isArray(clientData.repayments)) {
      serverDb.repayments = mergeCollection(serverDb.repayments, clientData.repayments);
    }
    if (Array.isArray(clientData.cashSessions)) {
      serverDb.cashSessions = mergeCollection(serverDb.cashSessions, clientData.cashSessions);
    }
    if (Array.isArray(clientData.auditLogs)) {
      serverDb.auditLogs = mergeCollection(serverDb.auditLogs, clientData.auditLogs);
    }
    if (Array.isArray(clientData.users)) {
      serverDb.users = mergeCollection(serverDb.users, clientData.users);
    }
    if (clientData.settings && typeof clientData.settings === 'object') {
      const currentServerSettings = serverDb.settings || {};
      const serverTime = currentServerSettings.updatedAt ? new Date(currentServerSettings.updatedAt).getTime() : 0;
      const clientTime = clientData.settings.updatedAt ? new Date(clientData.settings.updatedAt).getTime() : 0;
      if (clientTime >= serverTime || !currentServerSettings.exchangeRate) {
        serverDb.settings = { ...currentServerSettings, ...clientData.settings };
      }
    }

    // Persist to disk
    saveServerDb();

    return res.json({
      success: true,
      data: serverDb,
      serverTime: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Error in /api/sync/bidirectional:', err);
    return res.status(500).json({ error: err.message || 'Internal sync error' });
  }
});

// Explicit Manifest and Service Worker routes with CORS for PWA and PWABuilder
app.get('/manifest.json', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.sendFile(path.join(process.cwd(), 'public', 'manifest.json'));
});

app.get('/sw.js', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Service-Worker-Allowed', '/');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.sendFile(path.join(process.cwd(), 'public', 'sw.js'));
});

// Explicit icon routes with open CORS for PWA analysis and packaging tools
app.get(['/assets/icon-512.png', '/assets/icon-192.png', '/assets/icon-maskable-512.png'], (req: Request, res: Response) => {
  const filename = path.basename(req.path);
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.sendFile(path.join(process.cwd(), 'public', 'assets', filename));
});

// Sync Endpoint: Accepts offline sync queues from Android APK or Web clients
app.post('/api/sync', (req: Request, res: Response) => {
  const { queueItems, clientId } = req.body;
  if (!Array.isArray(queueItems)) {
    return res.status(400).json({ error: 'queueItems array expected' });
  }

  const processed: any[] = [];

  queueItems.forEach((item) => {
    // Process transaction idempotently based on clientTxId
    const exists = serverSyncLedger.find((l) => l.clientTxId === item.clientTxId);
    if (!exists) {
      serverSyncLedger.unshift({
        ...item,
        serverReceivedAt: new Date().toISOString(),
        clientId: clientId || 'default-device',
      });
    }
    processed.push({ clientTxId: item.clientTxId, status: 'SYNCED' });
  });

  return res.json({
    success: true,
    processedCount: processed.length,
    processed,
    serverTimestamp: new Date().toISOString(),
  });
});

// Server-side audit log query
app.get('/api/audit', (req: Request, res: Response) => {
  res.json({
    ledgerCount: serverSyncLedger.length,
    transactions: serverSyncLedger.slice(0, 100),
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Addition Shop POS server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
