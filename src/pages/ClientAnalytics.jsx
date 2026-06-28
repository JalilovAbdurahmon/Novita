import React, { useState, useEffect } from "react";
import axios from "../utils/axios";

const formatPrice = (num) => (num || 0).toLocaleString("ru-RU");

const PERIODS = [
  { key: "1w", label: "1 нед", days: 7 },
  { key: "1m", label: "1 мес", days: 30 },
  { key: "3m", label: "3 мес", days: 90 },
  { key: "6m", label: "6 мес", days: 180 },
  { key: "1y", label: "1 год", days: 365 },
];

const STATUS_MAP = {
  new: { label: "Yangi", color: "text-amber-300", bg: "bg-amber-500/15 border-amber-500/25", dot: "bg-amber-400" },
  accepted: { label: "Qabul qilindi", color: "text-blue-300", bg: "bg-blue-500/15 border-blue-500/25", dot: "bg-blue-400" },
  delivered: { label: "Yetkazildi", color: "text-teal-300", bg: "bg-teal-500/15 border-teal-500/25", dot: "bg-teal-400" },
  cancelled: { label: "Bekor qilindi", color: "text-rose-300", bg: "bg-rose-500/15 border-rose-500/25", dot: "bg-rose-400" },
};

const RANK = [
  "bg-amber-400/15 text-amber-400 ring-1 ring-amber-400/25",
  "bg-slate-400/15 text-slate-300 ring-1 ring-slate-400/25",
  "bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/25",
];

const dayKey = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// ─── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, sub, color, badge }) => {
  const colors = {
    indigo: { bar: "bg-indigo-500", num: "text-indigo-300" },
    amber: { bar: "bg-amber-500", num: "text-amber-300" },
    teal: { bar: "bg-teal-500", num: "text-teal-300" },
    rose: { bar: "bg-rose-500", num: "text-rose-300" },
    blue: { bar: "bg-blue-500", num: "text-blue-300" },
  };
  const c = colors[color] || colors.indigo;

  return (
    <div className="bg-[#0d0f1c] border border-slate-800/60 rounded-2xl p-5 relative overflow-hidden hover:-translate-y-0.5 transition-transform duration-200">
      <div className={`absolute top-0 left-0 w-0.5 h-full ${c.bar}`} />
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
          <h3 className={`text-3xl font-black mt-2 font-mono ${c.num}`}>{value}</h3>
        </div>
        <span className="text-xl bg-slate-800/50 p-2.5 rounded-xl">{icon}</span>
      </div>
      <p className="text-[11px] text-slate-600 mt-4 flex justify-between items-center">
        {sub && <span>{sub}</span>}
        {badge && <span className={`${c.num} font-bold bg-slate-800/60 px-1.5 py-0.5 rounded text-[10px]`}>{badge}</span>}
      </p>
    </div>
  );
};

// ─── Main Page ─────────────────────────────────────────────────────────────────
const ClientAnalytics = () => {
  const [orders, setOrders] = useState([]);
  const [history, setHistory] = useState([]);
  const [period, setPeriod] = useState("1m");
  const [loading, setLoading] = useState(true);

  // computed states
  const [stats, setStats] = useState({ total: 0, delivered: 0, cancelled: 0, new: 0, accepted: 0 });
  const [topProducts, setTopProducts] = useState([]);
  const [topClients, setTopClients] = useState([]);
  const [revenueStats, setRevenueStats] = useState({ total: 0, avg: 0 });
  const [recentOrders, setRecentOrders] = useState([]);
  const [trend, setTrend] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (orders.length || history.length) {
      compute([...orders, ...history], period);
    }
  }, [period, orders, history]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ordersRes, historyRes] = await Promise.all([
        axios.get("/clientOrders"),
        axios.get("/clientHistory"),
      ]);
      const allOrders = Array.isArray(ordersRes.data) ? ordersRes.data : [];
      const allHistory = Array.isArray(historyRes.data) ? historyRes.data : [];
      setOrders(allOrders);
      setHistory(allHistory);
      compute([...allOrders, ...allHistory], "1m");
    } catch (err) {
      console.error("Xatolik:", err);
    } finally {
      setLoading(false);
    }
  };

  const compute = (all, selectedPeriod) => {
    const periodDays = PERIODS.find((p) => p.key === selectedPeriod)?.days || 30;
    const cutoff = new Date(Date.now() - periodDays * 86400000);

    const filtered = all.filter((o) => o?.createdAt && new Date(o.createdAt) >= cutoff);

    // ── Status counts (all time)
    const statusCounts = { new: 0, accepted: 0, delivered: 0, cancelled: 0 };
    all.forEach((o) => { if (o?.status && statusCounts[o.status] !== undefined) statusCounts[o.status]++; });
    setStats({ total: all.length, ...statusCounts });

    // ── Top products (period)
    const prodMap = {};
    filtered.forEach((order) => {
      (order.items || []).forEach((item) => {
        const name = item?.product?.name || "Noma'lum";
        const qty = item?.quantity || 0;
        const rev = (item?.price || 0) * qty;
        if (!prodMap[name]) prodMap[name] = { qty: 0, revenue: 0 };
        prodMap[name].qty += qty;
        prodMap[name].revenue += rev;
      });
    });
    setTopProducts(
      Object.entries(prodMap)
        .map(([name, d]) => ({ name, ...d }))
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 7)
    );

    // ── Top clients (period)
    const clientMap = {};
    filtered.forEach((order) => {
      const user = order?.botUser;
      const id = user?._id || order?.telegramId;
      if (!id) return;
      const name = user?.fullName || user?.firstName || `TG: ${order?.telegramId}`;
      const phone = user?.phone || "";
      const total = order?.totalPrice || 0;
      if (!clientMap[id]) clientMap[id] = { name, phone, orderCount: 0, totalSpent: 0 };
      clientMap[id].orderCount++;
      clientMap[id].totalSpent += total;
    });
    setTopClients(
      Object.values(clientMap)
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 7)
    );

    // ── Revenue (period, delivered only)
    const deliveredFiltered = filtered.filter((o) => o?.status === "delivered");
    const totalRevenue = deliveredFiltered.reduce((sum, o) => sum + (o?.totalPrice || 0), 0);
    const avgOrder = deliveredFiltered.length > 0 ? Math.round(totalRevenue / deliveredFiltered.length) : 0;
    setRevenueStats({ total: totalRevenue, avg: avgOrder });

    // ── Trend sparkline (delivered, period)
    const bucketCount = Math.min(14, periodDays);
    const bucketSizeDays = periodDays / bucketCount;
    const now = Date.now();
    const buckets = Array(bucketCount).fill(0);
    deliveredFiltered.forEach((o) => {
      const ageDays = (now - new Date(o.createdAt).getTime()) / 86400000;
      let idx = bucketCount - 1 - Math.floor(ageDays / bucketSizeDays);
      idx = Math.max(0, Math.min(bucketCount - 1, idx));
      buckets[idx] += o?.totalPrice || 0;
    });
    setTrend(buckets);

    // ── Recent orders (all combined, last 5)
    setRecentOrders(
      [...all]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)
    );
  };

  const maxProd = topProducts.length ? Math.max(...topProducts.map((p) => p.qty), 1) : 1;
  const maxClient = topClients.length ? Math.max(...topClients.map((c) => c.totalSpent), 1) : 1;
  const maxTrend = trend.length ? Math.max(...trend, 1) : 1;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#090b16]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-xs text-slate-500">Ma'lumotlar yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 flex flex-col gap-6 select-none text-slate-200">

      {/* ── HEADER ── */}
      <div className="relative bg-[#0d0f1c] border border-indigo-900/40 rounded-2xl p-6 sm:p-8 overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-br from-indigo-900/20 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 w-72 h-40 bg-indigo-600/8 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="relative text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              📱 Mijozlar Analitikasi
            </h1>
            <p className="relative text-slate-400 text-sm mt-2 max-w-xl leading-relaxed">
              Telegram bot orqali kelgan buyurtmalar va mijozlar statistikasi.
            </p>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 px-4 py-2 rounded-xl transition-all duration-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Yangilash
          </button>
        </div>
      </div>

      {/* ── STATS CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon="📦" label="Jami buyurtmalar" value={stats.total} color="indigo" sub="Barcha vaqt" />
        <StatCard icon="✅" label="Yetkazildi" value={stats.delivered} color="teal" sub="Muvaffaqiyatli" />
        <StatCard icon="⏳" label="Yangi / Qabul" value={stats.new + stats.accepted} color="amber" sub="Jarayonda" badge={`${stats.new} yangi`} />
        <StatCard icon="❌" label="Bekor qilindi" value={stats.cancelled} color="rose" sub="Rad etilgan" />
      </div>

      {/* ── PERIOD SELECTOR ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Davr:</span>
        <div className="flex gap-0.5 bg-slate-900/70 p-1 rounded-xl border border-slate-800/60">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 ${
                period === p.key ? "bg-indigo-600/80 text-white" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── TOP PRODUCTS + TOP CLIENTS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Top Products */}
        <div className="bg-[#0d0f1c] border border-slate-800/60 p-5 rounded-2xl flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">🔥 Top mahsulotlar</h3>
            <p className="text-xs text-slate-500 mt-0.5">Tanlangan davrda sotilgan miqdor bo'yicha</p>
          </div>
          {topProducts.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-600">Bu davrda ma'lumot yo'q</div>
          ) : (
            <div className="flex flex-col gap-3">
              {topProducts.map((item, idx) => {
                const pct = Math.min(100, Math.round((item.qty / maxProd) * 100));
                return (
                  <div key={idx} className="flex flex-col gap-1">
                    <div className="flex justify-between items-center text-xs gap-2">
                      <span className="flex items-center gap-2 text-slate-300 font-medium min-w-0">
                        <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${idx < 3 ? RANK[idx] : "bg-slate-800/60 text-slate-600"}`}>
                          {idx + 1}
                        </span>
                        <span className="truncate">{item.name}</span>
                      </span>
                      <div className="text-right shrink-0">
                        <div className="font-mono text-indigo-300 font-bold">{item.qty.toLocaleString()} шт</div>
                        {item.revenue > 0 && (
                          <div className="text-[10px] text-teal-400/70 font-mono">{formatPrice(item.revenue)} сум</div>
                        )}
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                      <div style={{ width: `${pct}%` }} className="h-full rounded-full bg-linear-to-r from-indigo-500 to-violet-500 transition-all duration-700" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Clients */}
        <div className="bg-[#0d0f1c] border border-slate-800/60 p-5 rounded-2xl flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">👑 Top mijozlar</h3>
            <p className="text-xs text-slate-500 mt-0.5">Tanlangan davrda eng ko'p xarid qilganlar</p>
          </div>
          {topClients.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-600">Bu davrda ma'lumot yo'q</div>
          ) : (
            <div className="flex flex-col gap-3">
              {topClients.map((client, idx) => {
                const pct = Math.min(100, Math.round((client.totalSpent / maxClient) * 100));
                return (
                  <div key={idx} className="flex flex-col gap-1">
                    <div className="flex justify-between items-center text-xs gap-2">
                      <span className="flex items-center gap-2 text-slate-300 font-medium min-w-0">
                        <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${idx < 3 ? RANK[idx] : "bg-slate-800/60 text-slate-600"}`}>
                          {idx + 1}
                        </span>
                        <span className="flex flex-col min-w-0">
                          <span className="truncate">{client.name}</span>
                          {client.phone && <span className="text-[10px] text-slate-500 font-normal">{client.phone}</span>}
                        </span>
                      </span>
                      <div className="text-right shrink-0">
                        <div className="font-mono text-teal-300 font-bold">{formatPrice(client.totalSpent)} сум</div>
                        <div className="text-[10px] text-slate-500 font-mono">{client.orderCount} buyurtma</div>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                      <div style={{ width: `${pct}%` }} className="h-full rounded-full bg-linear-to-r from-teal-500 to-cyan-500 transition-all duration-700" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── REVENUE CARD ── */}
      <div className="bg-[#0d0f1c] border border-slate-800/60 rounded-2xl p-5 sm:p-6 flex flex-col gap-5">
        <div>
          <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">💰 Daromad ko'rsatkichlari</h4>
          <p className="text-xs text-slate-500 mt-0.5">Faqat yetkazib berilgan buyurtmalar bo'yicha</p>
        </div>

        <div className="relative rounded-2xl border border-teal-800/25 overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-br from-teal-950/40 via-[#0c1218] to-[#0a0e14]" />
          <div className="absolute top-0 right-0 w-64 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative p-5 sm:p-6 flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div className="flex flex-col gap-2">
                <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                  Umumiy daromad ·
                  <span className="text-teal-400">{PERIODS.find((p) => p.key === period)?.label}</span>
                </div>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-4xl sm:text-5xl font-black font-mono text-white tracking-tight leading-none">
                    {formatPrice(revenueStats.total)}
                  </span>
                  <span className="text-base text-teal-400/80 font-bold">сум</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-indigo-500/15 border border-indigo-500/20 text-indigo-300 font-mono font-bold text-xs px-3 py-1 rounded-lg">
                    O'rtacha: {formatPrice(revenueStats.avg)} сум
                  </span>
                  <span className="text-[11px] text-slate-500">har bir buyurtmada</span>
                </div>
              </div>
            </div>

            {/* sparkline */}
            {trend.some((v) => v > 0) && (
              <div className="flex items-end gap-0.5 h-14">
                {trend.map((v, i) => {
                  const h = Math.max(4, Math.round((v / maxTrend) * 100));
                  const isLast = i === trend.length - 1;
                  return (
                    <div
                      key={i}
                      title={formatPrice(v) + " сум"}
                      style={{ height: `${h}%` }}
                      className={`flex-1 rounded-t-sm transition-all duration-500 ${
                        isLast
                          ? "bg-linear-to-t from-teal-500 to-cyan-300"
                          : "bg-linear-to-t from-teal-700/50 to-teal-500/30 hover:from-teal-600/70"
                      }`}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── STATUS BREAKDOWN ── */}
      <div className="bg-[#0d0f1c] border border-slate-800/60 rounded-2xl p-5 flex flex-col gap-4">
        <div>
          <h4 className="text-sm font-bold text-slate-200">📊 Buyurtmalar holati</h4>
          <p className="text-xs text-slate-500 mt-0.5">Barcha vaqt uchun holat bo'yicha taqsimot</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(STATUS_MAP).map(([key, cfg]) => {
            const count = stats[key] || 0;
            const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
            return (
              <div key={key} className={`rounded-xl border p-4 ${cfg.bg}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${cfg.color}`}>{cfg.label}</span>
                </div>
                <div className={`text-2xl font-black font-mono ${cfg.color}`}>{count}</div>
                <div className="text-[10px] text-slate-600 font-mono mt-1">{pct}% jami</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── RECENT ORDERS ── */}
      <div className="bg-[#0d0f1c] border border-slate-800/60 p-5 rounded-2xl flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">⚡ So'nggi buyurtmalar</h3>
          <p className="text-xs text-slate-500 mt-0.5">Eng yangi 5 ta buyurtma</p>
        </div>
        <div className="flex flex-col gap-3">
          {recentOrders.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-600">Buyurtmalar yo'q</div>
          ) : (
            recentOrders.map((order, idx) => {
              const cfg = STATUS_MAP[order.status] || STATUS_MAP.new;
              const user = order?.botUser;
              const clientName = user?.fullName || user?.firstName || `TG: ${order?.telegramId}`;
              const itemsPreview = (order.items || []).slice(0, 2).map((i) => i?.product?.name || "Mahsulot").join(", ");
              const moreCount = (order.items || []).length - 2;
              return (
                <div key={idx} className="flex items-start gap-3 text-xs group">
                  <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ring-4 ring-slate-900/50 ${cfg.dot}`} />
                  <div className="flex-1 border-b border-slate-900 pb-3 group-last:border-none">
                    <div className="flex justify-between items-start gap-2 flex-wrap">
                      <div>
                        <span className="font-semibold text-slate-300">{clientName}</span>
                        <span className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-600 font-mono shrink-0">
                        {order.createdAt ? new Date(order.createdAt).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : ""}
                      </span>
                    </div>
                    <p className="text-slate-500 mt-1">
                      {itemsPreview}
                      {moreCount > 0 && <span className="text-slate-600"> +{moreCount} ta</span>}
                    </p>
                    {order.totalPrice > 0 && (
                      <p className="text-teal-400/80 font-mono font-bold mt-0.5">{formatPrice(order.totalPrice)} сум</p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
};

export default ClientAnalytics;