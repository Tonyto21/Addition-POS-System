import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  Calendar,
  Package,
  Users,
  Download,
  ShoppingBag,
  BarChart3,
  Clock,
  ArrowUpRight,
  PieChart as PieIcon,
  Layers,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { BusinessSettings, Product, Sale, User, Category } from '../types';
import { OfflineStorageManager } from '../utils/storage';

interface ReportsDashboardViewProps {
  settings: BusinessSettings;
  activeUser: User;
}

type TimeRangeKey = 'today' | 'week' | 'two_weeks' | 'month' | 'year' | 'all';

const TIME_RANGE_OPTIONS: { id: TimeRangeKey; label: string; periodLabel: string }[] = [
  { id: 'today', label: 'Today (1 Day)', periodLabel: "Today's Activity" },
  { id: 'week', label: 'Last 7 Days (1 Week)', periodLabel: 'Past 7 Days' },
  { id: 'two_weeks', label: 'Last 14 Days (Last 2 Weeks)', periodLabel: 'Past 14 Days' },
  { id: 'month', label: 'This Month (30 Days)', periodLabel: 'This Month' },
  { id: 'year', label: 'This Year (Year to Date)', periodLabel: 'Year to Date' },
  { id: 'all', label: 'All Time (Complete History)', periodLabel: 'All Historical Sales' },
];

const CATEGORY_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
const PAYMENT_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#6366f1', '#ef4444'];

export const ReportsDashboardView: React.FC<ReportsDashboardViewProps> = ({
  settings,
  activeUser,
}) => {
  // Selected Time Period via Dropdown Menu
  const [timeRange, setTimeRange] = useState<TimeRangeKey>('week');
  // Subheading within Reports: 'summary' or 'trends'
  const [reportSubTab, setReportSubTab] = useState<'summary' | 'trends'>('summary');

  const [sales] = useState<Sale[]>(() => OfflineStorageManager.getSales());
  const [products] = useState<Product[]>(() => OfflineStorageManager.getProducts());
  const [categories] = useState<Category[]>(() => OfflineStorageManager.getCategories());
  const [customers] = useState(() => OfflineStorageManager.getCustomers());

  const canViewCostAndProfit = activeUser.role === 'owner' || activeUser.role === 'manager';

  // Filter sales based on selected time period
  const filteredSales = useMemo(() => {
    const now = new Date();
    return sales.filter((s) => {
      const saleDate = new Date(s.createdAt);
      if (timeRange === 'today') {
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return saleDate >= startOfToday;
      }
      if (timeRange === 'week') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return saleDate >= sevenDaysAgo;
      }
      if (timeRange === 'two_weeks') {
        const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        return saleDate >= fourteenDaysAgo;
      }
      if (timeRange === 'month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return saleDate >= startOfMonth;
      }
      if (timeRange === 'year') {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        return saleDate >= startOfYear;
      }
      return true; // 'all'
    });
  }, [sales, timeRange]);

  // Aggregate metrics for filtered sales
  const totalSalesUSD = filteredSales.reduce((sum, s) => sum + s.totalUSD, 0);
  const totalSalesLRD = filteredSales.reduce((sum, s) => sum + s.totalLRD, 0);
  const totalTransactions = filteredSales.length;
  const avgTicketUSD = totalTransactions > 0 ? totalSalesUSD / totalTransactions : 0;

  // Physical cash received in the period
  const cashReceivedUSD = filteredSales.reduce((sum, s) => {
    if (s.payment.method === 'CASH_USD' || s.payment.method === 'SPLIT_CASH') {
      const tendered = s.payment.tenderedUSD || (s.payment.method === 'CASH_USD' ? s.totalUSD : 0);
      const change = s.payment.changeUSD || 0;
      return sum + Math.max(0, tendered - change);
    }
    return sum;
  }, 0);

  const cashReceivedLRD = filteredSales.reduce((sum, s) => {
    if (s.payment.method === 'CASH_LRD' || s.payment.method === 'SPLIT_CASH') {
      const tendered = s.payment.tenderedLRD || (s.payment.method === 'CASH_LRD' ? s.totalLRD : 0);
      const change = s.payment.changeLRD || 0;
      return sum + Math.max(0, tendered - change);
    }
    return sum;
  }, 0);

  // Profit calculation for the period
  const totalCostUSD = filteredSales.reduce((sum, s) => {
    return sum + s.items.reduce((lineSum, it) => lineSum + it.quantity * it.unitCostUSD, 0);
  }, 0);
  const grossProfitUSD = Math.max(0, totalSalesUSD - totalCostUSD);
  const grossProfitMargin = totalSalesUSD > 0 ? (grossProfitUSD / totalSalesUSD) * 100 : 0;

  // Inventory value (snapshot)
  const totalStockValueUSD = products.reduce((acc, p) => acc + p.currentStock * p.costPriceUSD, 0);
  const totalRetailValueUSD = products.reduce((acc, p) => acc + p.currentStock * p.sellingPriceUSD, 0);

  // Customer debt
  const totalOutstandingDebtUSD = customers.reduce((acc, c) => acc + c.currentDebtUSD, 0);

  // ----------------------------------------------------
  // Trends: What's Selling (Top Products)
  // ----------------------------------------------------
  const productSalesMap: Record<
    string,
    { name: string; qty: number; revenueUSD: number; unitCostUSD: number }
  > = {};

  filteredSales.forEach((s) => {
    s.items.forEach((it) => {
      if (!productSalesMap[it.productId]) {
        productSalesMap[it.productId] = {
          name: it.productName,
          qty: 0,
          revenueUSD: 0,
          unitCostUSD: it.unitCostUSD || 0,
        };
      }
      productSalesMap[it.productId].qty += it.quantity;
      productSalesMap[it.productId].revenueUSD += it.totalUSD;
    });
  });

  const bestSellers = Object.entries(productSalesMap)
    .map(([id, val]) => ({
      id,
      name: val.name,
      shortName: val.name.length > 20 ? val.name.slice(0, 18) + '…' : val.name,
      qty: val.qty,
      revenueUSD: val.revenueUSD,
      revenueLRD: Math.round(val.revenueUSD * settings.exchangeRate),
      unitCostUSD: val.unitCostUSD,
    }))
    .sort((a, b) => b.revenueUSD - a.revenueUSD);

  const topSellingProduct = bestSellers.length > 0 ? bestSellers[0] : null;

  // Chart data for Top Selling items (top 5)
  const topProductsChartData = bestSellers.slice(0, 6).map((item) => ({
    name: item.shortName,
    fullName: item.name,
    salesUSD: Number(item.revenueUSD.toFixed(2)),
    unitsSold: item.qty,
  }));

  // ----------------------------------------------------
  // Trends: Sales & Revenue Timeline
  // ----------------------------------------------------
  const timelineData = useMemo(() => {
    const map: Record<string, { dateLabel: string; salesUSD: number; orders: number; timestamp: number }> = {};

    filteredSales.forEach((s) => {
      const d = new Date(s.createdAt);
      let dateKey = '';
      let dateLabel = '';

      if (timeRange === 'today') {
        // Group by hour
        const hour = d.getHours();
        dateKey = `${hour}:00`;
        dateLabel = `${hour % 12 || 12} ${hour >= 12 ? 'PM' : 'AM'}`;
      } else {
        // Group by date (e.g. Sep 14)
        dateKey = d.toISOString().slice(0, 10);
        dateLabel = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
      }

      if (!map[dateKey]) {
        map[dateKey] = {
          dateLabel,
          salesUSD: 0,
          orders: 0,
          timestamp: d.getTime(),
        };
      }
      map[dateKey].salesUSD += s.totalUSD;
      map[dateKey].orders += 1;
    });

    return Object.values(map)
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((item) => ({
        ...item,
        salesUSD: Number(item.salesUSD.toFixed(2)),
      }));
  }, [filteredSales, timeRange]);

  // ----------------------------------------------------
  // Trends: Sales by Category
  // ----------------------------------------------------
  const categoryChartData = useMemo(() => {
    const productCatMap: Record<string, string> = {};
    products.forEach((p) => {
      productCatMap[p.id] = p.categoryId;
    });

    const catNameMap: Record<string, string> = {};
    categories.forEach((c) => {
      catNameMap[c.id] = c.name;
    });

    const catSales: Record<string, number> = {};

    filteredSales.forEach((s) => {
      s.items.forEach((it) => {
        const catId = productCatMap[it.productId] || 'other';
        const catName = catNameMap[catId] || 'Other Goods';
        catSales[catName] = (catSales[catName] || 0) + it.totalUSD;
      });
    });

    return Object.entries(catSales)
      .map(([name, value]) => ({
        name,
        value: Number(value.toFixed(2)),
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredSales, products, categories]);

  // ----------------------------------------------------
  // Trends: Payment Method Breakdown
  // ----------------------------------------------------
  const paymentMethodChartData = useMemo(() => {
    const paymentMap: Record<string, { label: string; count: number; totalUSD: number }> = {
      CASH_USD: { label: 'Cash (USD)', count: 0, totalUSD: 0 },
      CASH_LRD: { label: 'Cash (LRD)', count: 0, totalUSD: 0 },
      SPLIT_CASH: { label: 'Split Cash', count: 0, totalUSD: 0 },
      MOBILE_MONEY: { label: 'Mobile Money', count: 0, totalUSD: 0 },
      CREDIT: { label: 'Credit Debt', count: 0, totalUSD: 0 },
    };

    filteredSales.forEach((s) => {
      const m = s.payment.method;
      if (paymentMap[m]) {
        paymentMap[m].count += 1;
        paymentMap[m].totalUSD += s.totalUSD;
      }
    });

    return Object.values(paymentMap)
      .filter((p) => p.count > 0)
      .map((p) => ({
        name: p.label,
        orders: p.count,
        totalUSD: Number(p.totalUSD.toFixed(2)),
      }));
  }, [filteredSales]);

  // ----------------------------------------------------
  // Trends: Peak Hours (Hourly Foot Traffic & Shopping Rush)
  // ----------------------------------------------------
  const hourlyTrafficData = useMemo(() => {
    const hourSlots = [
      { hour: '8-10 AM', label: 'Morning Rush (8-10 AM)', count: 0, totalUSD: 0 },
      { hour: '10-12 PM', label: 'Late Morning (10-12 PM)', count: 0, totalUSD: 0 },
      { hour: '12-2 PM', label: 'Lunchtime (12-2 PM)', count: 0, totalUSD: 0 },
      { hour: '2-4 PM', label: 'Afternoon (2-4 PM)', count: 0, totalUSD: 0 },
      { hour: '4-6 PM', label: 'Evening Peak (4-6 PM)', count: 0, totalUSD: 0 },
      { hour: '6-8 PM', label: 'Night Close (6-8 PM)', count: 0, totalUSD: 0 },
    ];

    filteredSales.forEach((s) => {
      const h = new Date(s.createdAt).getHours();
      let slotIdx = 0;
      if (h >= 8 && h < 10) slotIdx = 0;
      else if (h >= 10 && h < 12) slotIdx = 1;
      else if (h >= 12 && h < 14) slotIdx = 2;
      else if (h >= 14 && h < 16) slotIdx = 3;
      else if (h >= 16 && h < 18) slotIdx = 4;
      else slotIdx = 5;

      hourSlots[slotIdx].count += 1;
      hourSlots[slotIdx].totalUSD += s.totalUSD;
    });

    return hourSlots;
  }, [filteredSales]);

  const exportSalesCSV = () => {
    const headers = ['Receipt #', 'Date', 'Cashier', 'Customer', 'Payment Method', 'Total USD', 'Total LRD'];
    const rows = filteredSales.map((s) => [
      s.receiptNumber,
      new Date(s.createdAt).toISOString(),
      s.cashierName,
      s.customerName || 'Walk-in',
      s.payment.method,
      s.totalUSD.toFixed(2),
      s.totalLRD.toFixed(0),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `addition_shop_sales_${timeRange}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectedPeriodLabel = TIME_RANGE_OPTIONS.find((t) => t.id === timeRange)?.periodLabel || 'Overview';

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-stone-100 text-stone-900">
      {/* Top Header with Time Range Dropdown Menu & Subheadings */}
      <div className="p-4 bg-white border-b border-stone-200 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-extrabold text-stone-900">
                Reports & Business Insights
              </h2>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Review store performance, product sales trends, and cashflow in plain English
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Time Period Dropdown Menu */}
            <div className="relative">
              <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-300 rounded-xl px-3 py-1.5 shadow-2xs hover:border-stone-400 transition">
                <Calendar className="w-4 h-4 text-stone-600 shrink-0" />
                <span className="text-[11px] font-bold text-stone-500 uppercase">Period:</span>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value as TimeRangeKey)}
                  className="bg-transparent text-xs font-extrabold text-stone-900 focus:outline-none cursor-pointer pr-1"
                >
                  {TIME_RANGE_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Export CSV */}
            <button
              onClick={exportSalesCSV}
              className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Subheadings / Subtabs Bar: Summary & Financials vs Trends & What's Selling */}
        <div className="mt-3.5 pt-3 border-t border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200">
            <button
              onClick={() => setReportSubTab('summary')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                reportSubTab === 'summary'
                  ? 'bg-white text-stone-900 shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              <span>Summary & Financials</span>
            </button>

            <button
              onClick={() => setReportSubTab('trends')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                reportSubTab === 'trends'
                  ? 'bg-white text-stone-900 shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
              <span>Trends & What's Selling</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded-full font-bold">
                Graphs
              </span>
            </button>
          </div>

          <div className="text-xs text-stone-500 font-medium hidden sm:flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Showing data for: <strong>{selectedPeriodLabel}</strong> ({filteredSales.length} sales)</span>
          </div>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* SUBTAB 1: Summary & Financials */}
        {reportSubTab === 'summary' && (
          <div className="space-y-4">
            {/* Primary KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* Total Revenue */}
              <div className="p-4 bg-white border border-stone-200 rounded-2xl space-y-1 shadow-2xs">
                <div className="text-stone-500 font-bold flex items-center justify-between">
                  <span>Gross Sales</span>
                  <DollarSign className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-2xl font-black text-stone-900 font-mono">
                  ${totalSalesUSD.toFixed(2)}
                </div>
                <div className="text-[11px] text-stone-500 font-mono">
                  L$ {totalSalesLRD.toLocaleString()} LRD
                </div>
              </div>

              {/* Estimated Gross Profit */}
              {canViewCostAndProfit ? (
                <div className="p-4 bg-white border border-stone-200 rounded-2xl space-y-1 shadow-2xs">
                  <div className="text-emerald-700 font-bold flex items-center justify-between">
                    <span>Estimated Profit</span>
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black text-emerald-700 font-mono">
                    ${grossProfitUSD.toFixed(2)}
                  </div>
                  <div className="text-[11px] text-stone-500">
                    Gross Margin: <strong className="text-stone-900">{grossProfitMargin.toFixed(1)}%</strong>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-white border border-stone-200 rounded-2xl space-y-1 shadow-2xs">
                  <div className="text-stone-500 font-bold">Total Orders Placed</div>
                  <div className="text-2xl font-black text-stone-900 font-mono">{totalTransactions}</div>
                  <div className="text-[11px] text-stone-500">Avg ticket: ${avgTicketUSD.toFixed(2)}</div>
                </div>
              )}

              {/* Cash USD Received */}
              <div className="p-4 bg-white border border-stone-200 rounded-2xl space-y-1 shadow-2xs">
                <div className="text-emerald-800 font-bold flex items-center justify-between">
                  <span>Physical Cash (USD)</span>
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-black text-emerald-800 font-mono">
                  ${cashReceivedUSD.toFixed(2)}
                </div>
                <div className="text-[11px] text-stone-500 font-mono">
                  Cash collected in drawer
                </div>
              </div>

              {/* Cash LRD Received */}
              <div className="p-4 bg-white border border-stone-200 rounded-2xl space-y-1 shadow-2xs">
                <div className="text-amber-800 font-bold flex items-center justify-between">
                  <span>Physical Cash (LRD)</span>
                  <span className="text-xs font-black text-amber-700 font-mono">L$</span>
                </div>
                <div className="text-2xl font-black text-amber-800 font-mono">
                  L$ {cashReceivedLRD.toLocaleString()}
                </div>
                <div className="text-[11px] text-stone-500 font-mono">
                  Liberian dollars in register
                </div>
              </div>
            </div>

            {/* Secondary KPI Cards: Inventory Value & Customer Debt */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 bg-white border border-stone-200 rounded-2xl flex items-center justify-between shadow-2xs">
                <div>
                  <div className="text-stone-500 font-bold">Total Completed Orders</div>
                  <div className="text-xl font-extrabold text-stone-900 mt-0.5">{totalTransactions} orders</div>
                  <div className="text-[11px] text-stone-500">
                    Average ticket: ${avgTicketUSD.toFixed(2)} USD
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5" />
                </div>
              </div>

              <div className="p-3.5 bg-white border border-stone-200 rounded-2xl flex items-center justify-between shadow-2xs">
                <div>
                  <div className="text-stone-500 font-bold">Shop Inventory Stock Value</div>
                  <div className="text-xl font-extrabold text-stone-900 mt-0.5">
                    {canViewCostAndProfit ? `$${totalStockValueUSD.toFixed(2)}` : `${products.length} Products`}
                  </div>
                  <div className="text-[11px] text-stone-500">
                    Retail value: ${totalRetailValueUSD.toFixed(2)}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Package className="w-5 h-5" />
                </div>
              </div>

              <div className="p-3.5 bg-white border border-stone-200 rounded-2xl flex items-center justify-between shadow-2xs">
                <div>
                  <div className="text-amber-800 font-bold">Outstanding Customer Debt</div>
                  <div className="text-xl font-extrabold text-amber-800 mt-0.5">
                    ${totalOutstandingDebtUSD.toFixed(2)}
                  </div>
                  <div className="text-[11px] text-stone-500">
                    L$ {Math.round(totalOutstandingDebtUSD * settings.exchangeRate).toLocaleString()} to collect
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Quick 2-Column: Top Sellers in this period & Recent sales */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
              {/* Best sellers */}
              <div className="p-4 bg-white border border-stone-200 rounded-2xl space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-stone-900 flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4 text-blue-600" />
                    Top Sellers ({selectedPeriodLabel})
                  </h3>
                  <button
                    onClick={() => setReportSubTab('trends')}
                    className="text-[11px] text-blue-600 font-bold hover:underline flex items-center gap-0.5"
                  >
                    <span>View graph</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>

                {bestSellers.length === 0 ? (
                  <p className="text-stone-400 py-6 text-center">No sales registered in this period.</p>
                ) : (
                  <div className="space-y-2">
                    {bestSellers.slice(0, 5).map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-stone-50 border border-stone-200 rounded-xl flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-6 h-6 rounded-lg bg-stone-200 text-stone-700 font-bold font-mono text-xs flex items-center justify-center shrink-0">
                            #{idx + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="font-bold text-stone-900 truncate">{item.name}</div>
                            <div className="text-[11px] text-stone-500">{item.qty} units sold</div>
                          </div>
                        </div>
                        <div className="text-right font-mono shrink-0 pl-2">
                          <div className="font-black text-stone-900">${item.revenueUSD.toFixed(2)}</div>
                          <div className="text-[10px] text-stone-500">
                            L$ {item.revenueLRD.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Transactions in this period */}
              <div className="p-4 bg-white border border-stone-200 rounded-2xl space-y-3 shadow-2xs">
                <h3 className="font-extrabold text-stone-900 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  Transactions Recorded ({filteredSales.length})
                </h3>

                {filteredSales.length === 0 ? (
                  <p className="text-stone-400 py-6 text-center">No transactions recorded in this period.</p>
                ) : (
                  <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                    {filteredSales.slice(0, 6).map((sale) => (
                      <div
                        key={sale.id}
                        className="p-2.5 bg-stone-50 border border-stone-200 rounded-xl flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-stone-900 font-mono">#{sale.receiptNumber}</div>
                          <div className="text-[11px] text-stone-500">
                            {new Date(sale.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} • {sale.cashierName} •{' '}
                            <span className="font-semibold text-stone-700">{sale.payment.method.replace('_', ' ')}</span>
                          </div>
                        </div>
                        <div className="text-right font-mono">
                          <div className="font-black text-stone-900">${sale.totalUSD.toFixed(2)}</div>
                          <div className="text-[10px] text-stone-500">L$ {sale.totalLRD.toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 2: Trends & What's Selling (With Graphs) */}
        {reportSubTab === 'trends' && (
          <div className="space-y-4">
            {/* Quick Non-Overwhelming Highlight Bar */}
            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span className="font-extrabold text-blue-950">Key SME Trends ({selectedPeriodLabel}):</span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-stone-700">
                <div>
                  Top Item: <strong className="text-stone-900">{topSellingProduct ? topSellingProduct.shortName : 'None'}</strong>
                </div>
                <div>
                  Lead Category:{' '}
                  <strong className="text-stone-900">
                    {categoryChartData.length > 0 ? categoryChartData[0].name : 'N/A'}
                  </strong>
                </div>
                <div>
                  Top Payment Mode:{' '}
                  <strong className="text-stone-900">
                    {paymentMethodChartData.length > 0 ? paymentMethodChartData[0].name : 'N/A'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Graph 1: What's Selling (Top Products Revenue & Units) */}
            <div className="p-4 bg-white border border-stone-200 rounded-2xl space-y-3 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div>
                  <h3 className="font-extrabold text-stone-900 flex items-center gap-1.5 text-sm">
                    <ShoppingBag className="w-4 h-4 text-blue-600" />
                    What's Selling: Top Products by Revenue ($ USD)
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Highlights fast-moving inventory and top revenue generators for {selectedPeriodLabel}
                  </p>
                </div>
                <div className="text-[11px] font-mono text-stone-500">
                  {bestSellers.length} unique items sold
                </div>
              </div>

              {topProductsChartData.length > 0 ? (
                <div className="h-64 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topProductsChartData}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        tickFormatter={(val) => `$${val}`}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 11, fill: '#1f2937' }}
                        width={130}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderRadius: '12px',
                          border: '1px solid #e5e7eb',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          fontSize: '12px',
                        }}
                        formatter={(value: any, name: any, item: any) => [
                          `$${Number(value).toFixed(2)} (${item.payload.unitsSold} units)`,
                          'Revenue',
                        ]}
                        labelFormatter={(label, items) => {
                          const fullName = items?.[0]?.payload?.fullName || label;
                          return fullName;
                        }}
                      />
                      <Bar dataKey="salesUSD" fill="#2563eb" radius={[0, 6, 6, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-10 text-stone-400 text-xs">
                  No product sales in this period.
                </div>
              )}

              {/* Scannable product table below graph */}
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-stone-50 text-stone-500 border-y border-stone-200">
                    <tr>
                      <th className="py-2 px-3 font-bold">Rank & Product</th>
                      <th className="py-2 px-3 font-bold text-center">Units Sold</th>
                      <th className="py-2 px-3 font-bold text-right">Revenue (USD)</th>
                      <th className="py-2 px-3 font-bold text-right">Revenue (LRD)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {bestSellers.slice(0, 5).map((item, i) => (
                      <tr key={item.id} className="hover:bg-stone-50">
                        <td className="py-2 px-3 font-medium text-stone-900">
                          <span className="font-bold text-blue-600 mr-1.5 font-mono">#{i + 1}</span>
                          {item.name}
                        </td>
                        <td className="py-2 px-3 text-center font-mono font-bold text-stone-800">
                          {item.qty}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-stone-900">
                          ${item.revenueUSD.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-stone-600">
                          L$ {item.revenueLRD.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Graph 2: Sales Velocity & Trajectory Over Time */}
            <div className="p-4 bg-white border border-stone-200 rounded-2xl space-y-3 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div>
                  <h3 className="font-extrabold text-stone-900 flex items-center gap-1.5 text-sm">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    Sales Velocity & Revenue Trend
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Shows whether customer purchasing is accelerating or dipping across {selectedPeriodLabel}
                  </p>
                </div>
                <div className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  Total: ${totalSalesUSD.toFixed(2)} USD
                </div>
              </div>

              {timelineData.length > 0 ? (
                <div className="h-56 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timelineData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: '#6b7280' }} />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        tickFormatter={(val) => `$${val}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderRadius: '12px',
                          border: '1px solid #e5e7eb',
                          fontSize: '12px',
                        }}
                        formatter={(value: any) => [`$${Number(value).toFixed(2)} USD`, 'Sales Volume']}
                      />
                      <Area
                        type="monotone"
                        dataKey="salesUSD"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorSales)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-10 text-stone-400 text-xs">
                  No sales recorded in this timeframe.
                </div>
              )}
            </div>

            {/* 2-Column: Category Breakdown & Payment Method Trends */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Category Breakdown */}
              <div className="p-4 bg-white border border-stone-200 rounded-2xl space-y-3 shadow-2xs">
                <h3 className="font-extrabold text-stone-900 flex items-center gap-1.5 text-sm">
                  <Layers className="w-4 h-4 text-purple-600" />
                  Sales by Product Category
                </h3>

                {categoryChartData.length > 0 ? (
                  <div className="h-52 w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryChartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={75}
                          paddingAngle={3}
                        >
                          {categoryChartData.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(val: any) => [`$${Number(val).toFixed(2)}`, 'Sales']}
                        />
                        <Legend
                          verticalAlign="bottom"
                          height={36}
                          iconSize={8}
                          wrapperStyle={{ fontSize: '11px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center py-10 text-stone-400 text-xs">
                    No category data available.
                  </div>
                )}
              </div>

              {/* Payment Methods & Dual Currency Split */}
              <div className="p-4 bg-white border border-stone-200 rounded-2xl space-y-3 shadow-2xs">
                <h3 className="font-extrabold text-stone-900 flex items-center gap-1.5 text-sm">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  Dual-Currency & Payment Mode Split
                </h3>

                {paymentMethodChartData.length > 0 ? (
                  <div className="h-52 w-full pt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={paymentMethodChartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} />
                        <YAxis
                          tick={{ fontSize: 11, fill: '#6b7280' }}
                          tickFormatter={(val) => `$${val}`}
                        />
                        <Tooltip
                          formatter={(val: any, name: any, item: any) => [
                            `$${Number(val).toFixed(2)} (${item.payload.orders} orders)`,
                            'Total Taken',
                          ]}
                        />
                        <Bar dataKey="totalUSD" fill="#059669" radius={[6, 6, 0, 0]} barSize={28} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center py-10 text-stone-400 text-xs">
                    No payment data recorded.
                  </div>
                )}
              </div>
            </div>

            {/* Peak Hours / Store Traffic Trends */}
            <div className="p-4 bg-white border border-stone-200 rounded-2xl space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-stone-900 flex items-center gap-1.5 text-sm">
                    <Clock className="w-4 h-4 text-amber-600" />
                    Store Foot Traffic & Peak Shopping Hours
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Shows which times of day your shop handles the most customer transactions
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1 text-xs">
                {hourlyTrafficData.map((slot, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-stone-50 border border-stone-200 rounded-xl flex flex-col justify-between"
                  >
                    <div className="font-bold text-stone-600 text-[11px]">{slot.hour}</div>
                    <div className="mt-2">
                      <div className="text-lg font-black text-stone-900">{slot.count}</div>
                      <div className="text-[10px] text-stone-500">orders placed</div>
                    </div>
                    <div className="mt-1 text-[11px] font-mono text-emerald-700 font-bold">
                      ${slot.totalUSD.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
