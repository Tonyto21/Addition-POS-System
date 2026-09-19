# Addition Shop - Offline-First Retail Management & POS

Production-grade, offline-first Point of Sale (POS) and inventory management system designed for **Addition Shop** (Liberia: dual currency USD & LRD).

---

## 🌟 Key Functional Capabilities

1. **Dual Currency Architecture (USD & LRD)**
   - Simultaneous display of USD and Liberian Dollars (LRD).
   - Configurable exchange rate (defaults to 1 USD = 195 LRD).
   - Multi-currency payment acceptance: Cash in USD, Cash in LRD, Split Cash (e.g. part USD, part LRD), Mobile Money (Lonestar MTN / Orange Money), or Customer Credit.

2. **Operational Supermarket Barcode Scanning**
   - Camera barcode scanning with zero external audio assets needed (real-time Web Audio API synthesized supermarket confirmation beeps).
   - Single and rapid continuous scan modes for checkouts and stock intake.
   - Fallback manual entry and quick test barcode simulator buttons.

3. **Double-Entry Stock Ledger & FIFO Batch Management**
   - Inventory is never blindly overwritten.
   - Movements (`PURCHASE_INTAKE`, `SALE`, `RETURN`, `ADJUSTMENT`, `STOCK_COUNT_VARIANCE`) maintain an audit trail.
   - Tracks batch/lot numbers and expiry dates.

4. **Bluetooth Thermal Receipt Printing & Digital Sharing**
   - Generates standard ESC/POS formatted receipts for **58mm** mini thermal printers and **80mm** standard printers.
   - Digital receipt sharing to WhatsApp, Email, Bluetooth, or social platforms.
   - In-app print preview formatted like real thermal receipt paper.
   - Immutable snapshot storage: historical receipts are never recalculated with newer product prices.

5. **Customer Credit & Daily Debt Repayments**
   - Dedicated ledger for customer accounts, debt tracking, and individual repayment records.
   - Real-time balances in both USD and LRD.

6. **Cash Drawer Shifts & Drawer Balancing**
   - Cashiers open shifts with starting float (USD & LRD).
   - Track payouts (e.g. generator fuel, lunch) and cash injections.
   - End-of-day drawer count reconciliation with variance calculation.

7. **Security & Role-Based Permissions**
   - **Cashier**: Sells products, generates receipts, opens/closes drawer, and records debt repayments. Cost prices and profit margins are completely hidden.
   - **Manager**: POS access plus stock intake, inventory edits, and movement histories.
   - **Owner**: Full access to financial metrics, gross profit, settings, users, and audit logs.

8. **Offline-First Synchronization**
   - All transactions write to local storage first with offline-generated unique transaction IDs.
   - Automatically detects internet connectivity and queues changes for server synchronization.

---

## 🛠️ Technology Stack (100% Free & Open-Source)

- **Web Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons.
- **Backend**: Express.js REST API with TypeScript, Vite middleware.
- **Mobile (Android APK)**: React Native with Expo, `expo-sqlite`, `expo-camera`, and ESC/POS Bluetooth integration (see `/src/components/MobileApkGuideView.tsx` or the in-app "Android APK Setup" tab).

---

## 🚀 Running Locally on Windows (VS Code & Git Bash)

```bash
# Clone repository
git clone <YOUR_REPO_URL>
cd addition-shop

# Install dependencies
npm install

# Start development server
npm run dev
# The web app will run at http://localhost:3000
```

### Building for Production

```bash
npm run build
npm run start
```
