import React, { useState, useEffect } from "react";
import axios from "../utils/axios";

const formatPrice = (num) => (num || 0).toLocaleString("ru-RU");

const REVENUE_PERIODS = [
  { key: "1w", label: "1 нед", days: 7 },
  { key: "1m", label: "1 мес", days: 30 },
  { key: "3m", label: "3 мес", days: 90 },
  { key: "6m", label: "6 мес", days: 180 },
  { key: "1y", label: "1 год", days: 365 },
];

const dayKey = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
};

const formatDateRU = (isoKey) => {
  if (!isoKey) return "";
  const [y, m, d] = isoKey.split("-");
  return `${d}.${m}.${y}`;
};

// ─── Modal ─────────────────────────────────────────────────────────────────────
const RecordModal = ({ record, label, isNew, onClose }) => {
  if (!record) return null;

  const maxPQty = record.topProducts?.length
    ? Math.max(...record.topProducts.map((p) => p.qty))
    : 1;
  const maxSQty = record.topShops?.length
    ? Math.max(...record.topShops.map((s) => s.qty))
    : 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/55 backdrop-blur-sm overflow-y-auto py-10 px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#12141f] border border-indigo-900/50 rounded-2xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-800/50">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-sm font-bold text-slate-100 tracking-wide">
                {label}
              </span>
              {isNew && (
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-300 bg-indigo-500/15 border border-indigo-500/25 px-2.5 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse inline-block" />
                  прямо сейчас
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
              <span className="text-slate-600">📅</span>
              {formatDateRU(record.date)}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-600 hover:text-slate-300 transition-colors p-1.5 rounded-lg hover:bg-slate-800/50"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Итого */}
        <div className="px-5 pt-4 pb-4 border-b border-slate-800/50 flex items-center gap-3">
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">
              Итого продано
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black font-mono text-white">
                {record.qty.toLocaleString()}
              </span>
              <span className="text-sm text-slate-400 font-medium">шт</span>
            </div>
          </div>
          {record.revenue > 0 && (
            <div className="ml-auto text-right">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">
                Выручка
              </div>
              <div className="text-lg font-black font-mono text-teal-400">
                {formatPrice(record.revenue)}
                <span className="text-xs text-teal-500/70 ml-1">сум</span>
              </div>
            </div>
          )}
        </div>

        {/* Товары + Магазины */}
        <div className="grid grid-cols-2">
          <div className="p-4 border-r border-slate-800/50">
            <div className="text-[10px] font-black uppercase tracking-widest text-indigo-400/60 mb-3">
              Товары
            </div>
            {!record.topProducts?.length ? (
              <div className="text-xs text-slate-600">Нет данных</div>
            ) : (
              <div className="flex flex-col gap-3">
                {record.topProducts.map((p, i) => (
                  <div key={i}>
                    <div className="flex justify-between items-center gap-1 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[10px] w-4 font-bold text-slate-600 shrink-0">
                          {i + 1}
                        </span>
                        <span className="text-xs text-slate-300 font-medium truncate">
                          {p.name}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold text-indigo-300 shrink-0">
                        {p.qty.toLocaleString()} шт
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                      <div
                        style={{
                          width: `${Math.round((p.qty / maxPQty) * 100)}%`,
                        }}
                        className="h-full rounded-full bg-linear-to-r from-indigo-500 to-violet-500"
                      />
                    </div>
                    {p.revenue > 0 && (
                      <div className="text-[10px] text-slate-600 font-mono mt-0.5 text-right">
                        {formatPrice(p.revenue)} сум
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-teal-400/60 mb-3">
              Магазины
            </div>
            {!record.topShops?.length ? (
              <div className="text-xs text-slate-600">Нет данных</div>
            ) : (
              <div className="flex flex-col gap-3">
                {record.topShops.map((s, i) => (
                  <div key={i}>
                    <div className="flex justify-between items-start gap-1 mb-1">
                      <div className="flex items-start gap-1.5 min-w-0">
                        <span className="text-[10px] w-4 font-bold text-slate-600 shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs text-slate-300 font-medium truncate">
                            {s.name}
                          </div>
                          {s.ownerName && (
                            <div className="text-[10px] text-slate-600 truncate">
                              {s.ownerName}
                            </div>
                          )}
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-teal-300 shrink-0">
                        {s.qty.toLocaleString()} шт
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                      <div
                        style={{
                          width: `${Math.round((s.qty / maxSQty) * 100)}%`,
                        }}
                        className="h-full rounded-full bg-linear-to-r from-teal-500 to-cyan-500"
                      />
                    </div>
                    {s.revenue > 0 && (
                      <div className="text-[10px] text-slate-600 font-mono mt-0.5 text-right">
                        {formatPrice(s.revenue)} сум
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-5 py-3 border-t border-slate-800/50">
          <button
            onClick={onClose}
            className="w-full text-xs font-semibold text-slate-600 hover:text-slate-300 transition-colors py-1"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Record Card ───────────────────────────────────────────────────────────────
const RecordCard = ({ record, label, isNew, onClick }) => {
  if (!record)
    return (
      <div className="flex-1 rounded-xl border border-slate-800/30 bg-slate-900/10 flex items-center justify-center p-6 min-h-32">
        <span className="text-xs text-slate-700 font-medium">Нет данных</span>
      </div>
    );

  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-xl border text-left transition-all duration-200 group
        ${
          isNew
            ? "bg-indigo-950/40 border-indigo-700/35 hover:border-indigo-500/50 hover:bg-indigo-950/60"
            : "bg-slate-900/25 border-slate-800/40 hover:border-slate-700/50 hover:bg-slate-900/40"
        }`}
    >
      <div className="p-4 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span
            className={`text-[10px] font-bold uppercase tracking-widest ${
              isNew ? "text-indigo-400/70" : "text-slate-500"
            }`}
          >
            {label}
          </span>
          {isNew && (
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-300 bg-indigo-500/15 border border-indigo-500/20 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse inline-block" />
              live
            </span>
          )}
        </div>

        <div className="flex items-baseline gap-1.5">
          <span
            className={`text-3xl font-black font-mono ${
              isNew ? "text-white" : "text-slate-300"
            }`}
          >
            {record.qty.toLocaleString()}
          </span>
          <span className="text-xs text-slate-500 font-medium">шт</span>
        </div>

        <div className="flex items-center justify-between">
          <span
            className={`text-[11px] font-mono ${
              isNew ? "text-indigo-400/50" : "text-slate-600"
            }`}
          >
            {formatDateRU(record.date)}
          </span>
          {record.revenue > 0 && (
            <span
              className={`text-[11px] font-mono font-bold ${
                isNew ? "text-teal-400" : "text-teal-600/60"
              }`}
            >
              {formatPrice(record.revenue)} сум
            </span>
          )}
        </div>

        <div
          className={`text-[10px] flex items-center gap-1.5 pt-0.5 transition-colors ${
            isNew
              ? "text-indigo-400/35 group-hover:text-indigo-400/65"
              : "text-slate-700 group-hover:text-slate-400"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-3 h-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
          Нажмите для подробностей
        </div>
      </div>
    </button>
  );
};

// ─── Home ──────────────────────────────────────────────────────────────────────
const Home = () => {
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
    todayCompleted: 0,
  });
  const [topProducts, setTopProducts] = useState([]);
  const [topShops, setTopShops] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [salesByProduct, setSalesByProduct] = useState([]);
  const [salesByShop, setSalesByShop] = useState([]);
  const [period, setPeriod] = useState("1m");
  const [totalRevenue, setTotalRevenue] = useState(0);

  const [revenuePeriod, setRevenuePeriod] = useState("1m");
  const [selectedProduct, setSelectedProduct] = useState("all");
  const [allProductNames, setAllProductNames] = useState([]);
  const [revenueStats, setRevenueStats] = useState({ qty: 0, revenue: 0 });
  const [revenueTrend, setRevenueTrend] = useState([]);
  const [revenuePrevStats, setRevenuePrevStats] = useState({
    qty: 0,
    revenue: 0,
  });

  const [currentRecord, setCurrentRecord] = useState(null);
  const [previousRecord, setPreviousRecord] = useState(null);
  const [todayRecord, setTodayRecord] = useState(null);
  const [isNewRecordToday, setIsNewRecordToday] = useState(false);
  const [modalData, setModalData] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (window._allOrders)
      computeRevenueStats(window._allOrders, revenuePeriod, selectedProduct);
  }, [revenuePeriod, selectedProduct]);

  const fetchDashboardData = async () => {
    try {
      const res = await axios.get("/history");
      const allOrders = res.data;
      if (!Array.isArray(allOrders)) return;

      const total = allOrders.length;
      const active = allOrders.filter((o) => o?.status === "berilmoqda").length;
      const completed = allOrders.filter((o) => o?.status === "berildi").length;
      const todayKey = dayKey(new Date());

      const dayMap = {};
      allOrders
        .filter((o) => o?.status === "berildi" && o?.createdAt)
        .forEach((order) => {
          const dk = dayKey(order.createdAt);
          if (!dayMap[dk])
            dayMap[dk] = { qty: 0, revenue: 0, products: {}, shops: {} };
          const qty = parseInt(order.quantity) || 0;
          const rev = (order.product?.price || 0) * qty;
          dayMap[dk].qty += qty;
          dayMap[dk].revenue += rev;
          const pname = order?.product?.name || "Неизвестно";
          if (!dayMap[dk].products[pname])
            dayMap[dk].products[pname] = { qty: 0, revenue: 0 };
          dayMap[dk].products[pname].qty += qty;
          dayMap[dk].products[pname].revenue += rev;
          const sname = order?.shopName || "Неизвестно";
          const owner = order?.ownerName || "";
          if (!dayMap[dk].shops[sname])
            dayMap[dk].shops[sname] = { qty: 0, revenue: 0, ownerName: owner };
          dayMap[dk].shops[sname].qty += qty;
          dayMap[dk].shops[sname].revenue += rev;
        });

      const todayData = dayMap[todayKey] || {
        qty: 0,
        revenue: 0,
        products: {},
        shops: {},
      };
      const todayCompletedCount = allOrders.filter(
        (o) =>
          o?.status === "berildi" &&
          o?.createdAt &&
          dayKey(o.createdAt) === todayKey
      ).length;
      setStats({
        total,
        active,
        completed,
        todayCompleted: todayCompletedCount,
      });

      const getTopProducts = (products) =>
        Object.entries(products || {})
          .sort((a, b) => b[1].qty - a[1].qty)
          .slice(0, 5)
          .map(([name, data]) => ({ name, ...data }));
      const getTopShops = (shops) =>
        Object.entries(shops || {})
          .sort((a, b) => b[1].qty - a[1].qty)
          .slice(0, 5)
          .map(([name, data]) => ({ name, ...data }));
      const makeRecord = (dk, data) => ({
        date: dk,
        qty: data.qty,
        revenue: data.revenue,
        topProducts: getTopProducts(data.products),
        topShops: getTopShops(data.shops),
      });

      const todayRec = {
        date: todayKey,
        qty: todayData.qty,
        revenue: todayData.revenue,
        topProducts: getTopProducts(todayData.products),
        topShops: getTopShops(todayData.shops),
      };
      setTodayRecord(todayRec);

      const pastDays = Object.entries(dayMap)
        .filter(([dk]) => dk !== todayKey)
        .sort((a, b) => b[1].qty - a[1].qty);
      const topPastDay = pastDays[0];
      const secondPastDay = pastDays[1];

      if (!topPastDay) {
        setCurrentRecord(todayRec);
        setPreviousRecord(null);
        setIsNewRecordToday(todayData.qty > 0);
      } else if (todayData.qty >= topPastDay[1].qty && todayData.qty > 0) {
        setCurrentRecord(todayRec);
        setPreviousRecord(makeRecord(topPastDay[0], topPastDay[1]));
        setIsNewRecordToday(true);
      } else {
        setCurrentRecord(makeRecord(topPastDay[0], topPastDay[1]));
        setPreviousRecord(
          secondPastDay ? makeRecord(secondPastDay[0], secondPastDay[1]) : null
        );
        setIsNewRecordToday(false);
      }

      const productMap = {};
      allOrders.forEach((order) => {
        const name = order?.product?.name;
        if (name) {
          const qty = parseInt(order.quantity) || 0;
          productMap[name] = (productMap[name] || 0) + qty;
        }
      });
      setTopProducts(
        Object.keys(productMap)
          .map((name) => ({ name, count: productMap[name] }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 3)
      );

      const uniqueProducts = [
        ...new Set(
          allOrders.filter((o) => o?.product?.name).map((o) => o.product.name)
        ),
      ];
      setAllProductNames(uniqueProducts);

      const shopMap = {};
      allOrders.forEach((order) => {
        if (order?.shopName) {
          const qty = parseInt(order.quantity) || 0;
          if (!shopMap[order.shopName])
            shopMap[order.shopName] = {
              count: 0,
              ownerName: order.ownerName || "",
            };
          shopMap[order.shopName].count += qty;
        }
      });
      setTopShops(
        Object.keys(shopMap)
          .map((name) => ({
            name,
            count: shopMap[name].count,
            ownerName: shopMap[name].ownerName,
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 3)
      );
      setRecentActivities(
        [...allOrders]
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 3)
      );

      const revenue = allOrders
        .filter((o) => o?.status === "berildi")
        .reduce(
          (sum, o) => sum + (o.product?.price || 0) * (o.quantity || 0),
          0
        );
      setTotalRevenue(revenue);

      window._allOrders = allOrders;
      computeSalesByPeriod(allOrders, period);
      computeRevenueStats(allOrders, "1m", "all");
    } catch (error) {
      console.error("Ошибка:", error);
    }
  };

  // builds a small day-by-day trend (max 14 points) for the sparkline, plus current vs previous period comparison
  const computeRevenueStats = (orders, selectedPeriod, productFilter) => {
    const periodObj =
      REVENUE_PERIODS.find((p) => p.key === selectedPeriod) ||
      REVENUE_PERIODS[1];
    const days = periodObj.days;
    const now = Date.now();
    const cutoff = new Date(now - days * 86400000);
    const prevCutoff = new Date(now - days * 2 * 86400000);

    const matchesFilter = (o) => {
      if (o?.status !== "berildi") return false;
      if (!o?.createdAt) return false;
      if (productFilter !== "all" && o?.product?.name !== productFilter)
        return false;
      return true;
    };

    const filtered = orders.filter(
      (o) => matchesFilter(o) && new Date(o.createdAt) >= cutoff
    );
    const qty = filtered.reduce(
      (sum, o) => sum + (parseInt(o.quantity) || 0),
      0
    );
    const revenue = filtered.reduce(
      (sum, o) => sum + (o.product?.price || 0) * (parseInt(o.quantity) || 0),
      0
    );
    setRevenueStats({ qty, revenue });

    const prevFiltered = orders.filter((o) => {
      if (!matchesFilter(o)) return false;
      const t = new Date(o.createdAt);
      return t >= prevCutoff && t < cutoff;
    });
    const prevQty = prevFiltered.reduce(
      (sum, o) => sum + (parseInt(o.quantity) || 0),
      0
    );
    const prevRevenue = prevFiltered.reduce(
      (sum, o) => sum + (o.product?.price || 0) * (parseInt(o.quantity) || 0),
      0
    );
    setRevenuePrevStats({ qty: prevQty, revenue: prevRevenue });

    // bucket into up to 14 points so short periods show daily granularity and long ones stay readable
    const bucketCount = Math.min(14, days);
    const bucketSizeDays = days / bucketCount;
    const buckets = Array.from({ length: bucketCount }, () => 0);
    filtered.forEach((o) => {
      const ageDays = (now - new Date(o.createdAt).getTime()) / 86400000;
      let idx = bucketCount - 1 - Math.floor(ageDays / bucketSizeDays);
      if (idx < 0) idx = 0;
      if (idx > bucketCount - 1) idx = bucketCount - 1;
      buckets[idx] += (o.product?.price || 0) * (parseInt(o.quantity) || 0);
    });
    setRevenueTrend(buckets);
  };

  const computeSalesByPeriod = (orders, selectedPeriod) => {
    const periodDays = { "1w": 7, "1m": 30, "3m": 90, "6m": 180, "1y": 365 };
    const cutoff = new Date(
      Date.now() - (periodDays[selectedPeriod] || 30) * 86400000
    );
    const filtered = orders.filter(
      (o) => o?.createdAt && new Date(o.createdAt) >= cutoff
    );
    const prodMap = {};
    filtered.forEach((order) => {
      const name = order?.product?.name;
      if (!name) return;
      if (!prodMap[name]) prodMap[name] = { qty: 0, revenue: 0 };
      prodMap[name].qty += parseInt(order.quantity) || 0;
      prodMap[name].revenue +=
        (order.product?.price || 0) * (parseInt(order.quantity) || 0);
    });
    setSalesByProduct(
      Object.entries(prodMap)
        .map(([name, data]) => ({ name, qty: data.qty, revenue: data.revenue }))
        .sort((a, b) => b.qty - a.qty)
    );
    const shopMap = {};
    filtered.forEach((order) => {
      const name = order?.shopName;
      if (!name) return;
      if (!shopMap[name])
        shopMap[name] = {
          qty: 0,
          revenue: 0,
          ownerName: order.ownerName || "",
        };
      shopMap[name].qty += parseInt(order.quantity) || 0;
      shopMap[name].revenue +=
        (order.product?.price || 0) * (parseInt(order.quantity) || 0);
    });
    setSalesByShop(
      Object.entries(shopMap)
        .map(([name, data]) => ({
          name,
          qty: data.qty,
          revenue: data.revenue,
          ownerName: data.ownerName,
        }))
        .sort((a, b) => b.qty - a.qty)
    );
  };

  const handlePeriodChange = (p) => {
    setPeriod(p);
    if (window._allOrders) computeSalesByPeriod(window._allOrders, p);
  };

  const maxProductCount =
    topProducts.length > 0 ? Math.max(...topProducts.map((p) => p.count)) : 1;
  const maxShopCount =
    topShops.length > 0 ? Math.max(...topShops.map((s) => s.count)) : 1;
  const maxSalesQty =
    salesByProduct.length > 0
      ? Math.max(...salesByProduct.map((s) => s.qty))
      : 1;
  const maxShopSalesQty =
    salesByShop.length > 0 ? Math.max(...salesByShop.map((s) => s.qty)) : 1;

  const periodLabels = {
    "1w": "1 нед",
    "1m": "1 мес",
    "3m": "3 мес",
    "6m": "6 мес",
    "1y": "1 год",
  };
  const currentRevenuePeriodLabel =
    REVENUE_PERIODS.find((p) => p.key === revenuePeriod)?.label || "1 мес";
  const recordQtyForProgress = currentRecord?.qty || 1;
  const todayQty = todayRecord?.qty || 0;
  const todayProgress = Math.min(
    100,
    Math.round((todayQty / recordQtyForProgress) * 100)
  );

  // % change vs the previous equivalent period, for the finance card trend chip
  const revenueDeltaPct =
    revenuePrevStats.revenue > 0
      ? Math.round(
          ((revenueStats.revenue - revenuePrevStats.revenue) /
            revenuePrevStats.revenue) *
            100
        )
      : revenueStats.revenue > 0
      ? 100
      : 0;
  const maxTrendValue =
    revenueTrend.length > 0 ? Math.max(...revenueTrend, 1) : 1;

  // rank badge styles
  const RANK = [
    "bg-amber-400/15 text-amber-400 ring-1 ring-amber-400/25",
    "bg-slate-400/15 text-slate-300 ring-1 ring-slate-400/25",
    "bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/25",
  ];

  return (
    <div className="max-w-6xl mx-auto p-4 flex flex-col gap-6 select-none text-slate-200">
      {/* ── ПРИВЕТСТВИЕ ── */}
      <div className="relative bg-[#0d0f1c] border border-indigo-900/40 rounded-2xl p-6 sm:p-8 overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-br from-indigo-900/20 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 w-72 h-40 bg-indigo-600/8 rounded-full blur-3xl pointer-events-none" />
        <h1 className="relative text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Добро пожаловать в CRM 👋
        </h1>
        <p className="relative text-slate-400 text-sm mt-2 max-w-xl leading-relaxed">
          Управляйте заказами, отслеживайте магазины на карте и контролируйте
          статистику продаж.
        </p>
      </div>

      {/* ── РЕКОРД ── */}
      <div className="bg-[#0d0f1c] border border-slate-800/60 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              🏅 Рекорд лучшего дня
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              По количеству проданных единиц товара
            </p>
          </div>
          {todayRecord && (
            <div className="text-right shrink-0">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">
                Сегодня
              </div>
              <div className="flex items-baseline gap-1 justify-end">
                <span className="text-xl font-black font-mono text-indigo-300">
                  {todayRecord.qty.toLocaleString()}
                </span>
                <span className="text-xs text-slate-500">шт</span>
              </div>
            </div>
          )}
        </div>

        {currentRecord ? (
          <>
            <div className="flex flex-col sm:flex-row gap-3 items-stretch">
              {isNewRecordToday ? (
                <>
                  <RecordCard
                    record={previousRecord}
                    label="Прошлый рекорд"
                    isNew={false}
                    onClick={() =>
                      previousRecord &&
                      setModalData({
                        record: previousRecord,
                        label: "Прошлый рекорд",
                        isNew: false,
                      })
                    }
                  />
                  <div className="hidden sm:flex flex-col items-center justify-center px-2 gap-1">
                    <div className="w-px flex-1 bg-slate-800/60" />
                    <span className="text-slate-600 text-base font-black">
                      →
                    </span>
                    <div className="w-px flex-1 bg-slate-800/60" />
                  </div>
                  <div className="sm:hidden flex items-center gap-2 my-0.5">
                    <div className="flex-1 h-px bg-slate-800/60" />
                    <span className="text-slate-600 text-sm">↓</span>
                    <div className="flex-1 h-px bg-slate-800/60" />
                  </div>
                  <RecordCard
                    record={currentRecord}
                    label="Новый рекорд 🎉"
                    isNew={true}
                    onClick={() =>
                      setModalData({
                        record: currentRecord,
                        label: "Новый рекорд 🎉",
                        isNew: true,
                      })
                    }
                  />
                </>
              ) : (
                <>
                  <RecordCard
                    record={previousRecord}
                    label="Предыдущий рекорд"
                    isNew={false}
                    onClick={() =>
                      previousRecord &&
                      setModalData({
                        record: previousRecord,
                        label: "Предыдущий рекорд",
                        isNew: false,
                      })
                    }
                  />
                  {previousRecord && (
                    <>
                      <div className="hidden sm:flex flex-col items-center justify-center px-2 gap-1">
                        <div className="w-px flex-1 bg-slate-800/60" />
                        <span className="text-slate-700 text-base font-black">
                          →
                        </span>
                        <div className="w-px flex-1 bg-slate-800/60" />
                      </div>
                      <div className="sm:hidden flex items-center gap-2 my-0.5">
                        <div className="flex-1 h-px bg-slate-800/60" />
                        <span className="text-slate-700 text-sm">↓</span>
                        <div className="flex-1 h-px bg-slate-800/60" />
                      </div>
                    </>
                  )}
                  <RecordCard
                    record={currentRecord}
                    label="Текущий рекорд 🏅"
                    isNew={false}
                    onClick={() =>
                      setModalData({
                        record: currentRecord,
                        label: "Текущий рекорд 🏅",
                        isNew: false,
                      })
                    }
                  />
                </>
              )}
            </div>

            {!isNewRecordToday && todayRecord && (
              <div className="mt-4 pt-4 border-t border-slate-800/50">
                <div className="flex justify-between text-[10px] text-slate-500 mb-2">
                  <span>Прогресс к рекорду сегодня</span>
                  <span className="font-mono text-indigo-300 font-bold">
                    {todayQty.toLocaleString()} /{" "}
                    {currentRecord.qty.toLocaleString()} шт
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${todayProgress}%` }}
                    className="h-full rounded-full bg-linear-to-r from-indigo-500 to-violet-500 transition-all duration-700"
                  />
                </div>
                <p className="text-[10px] text-slate-600 mt-1.5">
                  {todayQty >= currentRecord.qty
                    ? "🎉 Рекорд побит сегодня!"
                    : `До рекорда осталось ${(
                        currentRecord.qty - todayQty
                      ).toLocaleString()} шт`}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-6 text-xs text-slate-600">
            Завершённых заказов пока нет
          </div>
        )}
      </div>

      {/* Modal */}
      {modalData && (
        <RecordModal
          record={modalData.record}
          label={modalData.label}
          isNew={modalData.isNew}
          onClose={() => setModalData(null)}
        />
      )}

      {/* ── СТАТИСТИКА ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: "Всего заказов",
            value: stats.total,
            color: "indigo",
            icon: "📦",
            sub: "Все созданные заявки",
            bar: "bg-indigo-500",
            num: "text-indigo-300",
          },
          {
            label: "К доставке",
            value: stats.active,
            color: "amber",
            icon: "⏳",
            sub: "Ожидают доставки",
            bar: "bg-amber-500",
            num: "text-amber-300",
          },
          {
            label: "Выполнено",
            value: stats.completed,
            color: "teal",
            icon: "✅",
            sub: null,
            bar: "bg-teal-500",
            num: "text-teal-300",
            badge: `+${stats.todayCompleted} сегодня`,
          },
        ].map((s, i) => (
          <div
            key={i}
            className="bg-[#0d0f1c] border border-slate-800/60 rounded-2xl p-5 relative overflow-hidden hover:-translate-y-0.5 transition-transform duration-200"
          >
            <div className={`absolute top-0 left-0 w-0.5 h-full ${s.bar}`} />
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {s.label}
                </p>
                <h3 className={`text-3xl font-black mt-2 font-mono ${s.num}`}>
                  {s.value}
                </h3>
              </div>
              <span className={`text-xl bg-slate-800/50 p-2.5 rounded-xl`}>
                {s.icon}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-4 flex justify-between items-center">
              {s.sub && <span>{s.sub}</span>}
              {s.badge && (
                <span
                  className={`${s.num} font-bold bg-teal-500/10 px-1.5 py-0.5 rounded text-[10px]`}
                >
                  {s.badge}
                </span>
              )}
            </p>
          </div>
        ))}
      </div>

      {/* ── ТОП ТОВАРЫ / МАГАЗИНЫ / АКТИВНОСТЬ ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Топ товары */}
        <div className="bg-[#0d0f1c] border border-slate-800/60 p-5 rounded-2xl flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              🔥 Топ товары
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              По объёму продаж в штуках
            </p>
          </div>
          {topProducts.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-600">
              Нет данных
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {topProducts.map((product, index) => {
                const pct = Math.min(
                  100,
                  Math.round((product.count / maxProductCount) * 100)
                );
                return (
                  <div key={index} className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-xs gap-2">
                      <span className="flex items-center gap-2 text-slate-300 font-medium min-w-0">
                        <span
                          className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                            RANK[index] || RANK[2]
                          }`}
                        >
                          {index + 1}
                        </span>
                        <span className="truncate">{product.name}</span>
                      </span>
                      <span className="font-mono text-indigo-300 font-bold shrink-0">
                        {product.count.toLocaleString()} шт
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${pct}%` }}
                        className="h-full rounded-full bg-linear-to-r from-indigo-500 to-violet-500 transition-all duration-1000"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Топ магазины */}
        <div className="bg-[#0d0f1c] border border-slate-800/60 p-5 rounded-2xl flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              🏆 Топ магазины
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              По объёму заказанного товара
            </p>
          </div>
          {topShops.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-600">
              Нет данных
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {topShops.map((shop, index) => {
                const pct = Math.min(
                  100,
                  Math.round((shop.count / maxShopCount) * 100)
                );
                return (
                  <div key={index} className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-xs gap-2">
                      <span className="flex items-center gap-2 text-slate-300 font-medium min-w-0">
                        <span
                          className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                            RANK[index] || RANK[2]
                          }`}
                        >
                          {index + 1}
                        </span>
                        <span className="truncate">{shop.name}</span>
                        {shop.ownerName && (
                          <span className="text-[11px] text-slate-500 font-normal truncate">
                            ({shop.ownerName})
                          </span>
                        )}
                      </span>
                      <span className="font-mono text-teal-300 font-bold shrink-0">
                        {shop.count.toLocaleString()} шт
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${pct}%` }}
                        className="h-full rounded-full bg-linear-to-r from-teal-500 to-cyan-500 transition-all duration-1000"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Последние действия */}
        <div className="bg-[#0d0f1c] border border-slate-800/60 p-5 rounded-2xl flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              ⚡ Последние действия
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Лента активности заказов
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {recentActivities.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-600">
                Активности нет
              </div>
            ) : (
              recentActivities.map((activity, idx) => (
                <div key={idx} className="flex items-start gap-3 text-xs group">
                  <span
                    className={`mt-1 w-2 h-2 rounded-full shrink-0 ring-4 ${
                      activity.status === "berilmoqda"
                        ? "bg-amber-400 ring-amber-400/10"
                        : "bg-teal-400 ring-teal-400/10"
                    }`}
                  />
                  <div className="flex-1 border-b border-slate-900 pb-2 group-last:border-none">
                    <div className="flex justify-between items-center gap-2">
                      <span className="font-semibold text-slate-300 truncate">
                        {activity.shopName}
                      </span>
                      <span className="text-[10px] text-slate-600 font-mono shrink-0">
                        {activity.createdAt
                          ? new Date(activity.createdAt).toLocaleTimeString(
                              "ru-RU",
                              { hour: "2-digit", minute: "2-digit" }
                            )
                          : "Только что"}
                      </span>
                    </div>
                    <p className="text-slate-500 mt-0.5">
                      {activity.status === "berilmoqda"
                        ? "Новый заказ:"
                        : "Доставлен:"}{" "}
                      <span className="text-slate-300 font-medium">
                        {activity.product?.name}
                      </span>
                      <span className="text-slate-600">
                        {" "}
                        · {activity.quantity} шт
                      </span>
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── ОТЧЁТЫ О ПРОДАЖАХ ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* По товарам */}
        <div className="bg-[#0d0f1c] border border-slate-800/60 rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h4 className="text-sm font-bold text-slate-200">
                📊 Отчёт по товарам
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Объём и выручка за период
              </p>
            </div>
            <div className="flex gap-0.5 bg-slate-900/70 p-1 rounded-xl border border-slate-800/60">
              {["1w", "1m", "3m", "6m", "1y"].map((p) => (
                <button
                  key={p}
                  onClick={() => handlePeriodChange(p)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all duration-200 ${
                    period === p
                      ? "bg-indigo-600/80 text-white"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {periodLabels[p]}
                </button>
              ))}
            </div>
          </div>
          {salesByProduct.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-600">
              За этот период продаж нет
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {salesByProduct.map((item, idx) => {
                const pct = Math.min(
                  100,
                  Math.round((item.qty / maxSalesQty) * 100)
                );
                const rankStyle = RANK[idx] || "bg-slate-800/60 text-slate-500";
                return (
                  <div key={idx} className="flex flex-col gap-1">
                    <div className="flex justify-between items-center text-xs gap-2">
                      <span className="flex items-center gap-2 text-slate-300 font-medium min-w-0">
                        <span
                          className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                            idx < 3
                              ? rankStyle
                              : "bg-slate-800/60 text-slate-600"
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <span className="truncate">{item.name}</span>
                      </span>
                      <div className="text-right shrink-0">
                        <div className="font-mono text-indigo-300 font-bold">
                          {item.qty.toLocaleString()} шт
                        </div>
                        {item.revenue > 0 && (
                          <div className="text-[10px] text-teal-400/70 font-mono">
                            {formatPrice(item.revenue)} сум
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${pct}%` }}
                        className="h-full rounded-full bg-linear-to-r from-indigo-500 to-violet-500 transition-all duration-700"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* По магазинам */}
        <div className="bg-[#0d0f1c] border border-slate-800/60 rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h4 className="text-sm font-bold text-slate-200">
                🏪 Отчёт по магазинам
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Закупки и выручка по торговым точкам
              </p>
            </div>
            <div className="flex gap-0.5 bg-slate-900/70 p-1 rounded-xl border border-slate-800/60">
              {["1w", "1m", "3m", "6m", "1y"].map((p) => (
                <button
                  key={p}
                  onClick={() => handlePeriodChange(p)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all duration-200 ${
                    period === p
                      ? "bg-teal-600/80 text-white"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {periodLabels[p]}
                </button>
              ))}
            </div>
          </div>
          {salesByShop.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-600">
              За этот период заказов нет
            </div>
          ) : (
            <div className="flex flex-col gap-3 max-h-104 overflow-y-auto pr-1">
              {salesByShop.map((item, idx) => {
                const pct = Math.min(
                  100,
                  Math.round((item.qty / maxShopSalesQty) * 100)
                );
                const rankStyle = RANK[idx] || "bg-slate-800/60 text-slate-500";
                return (
                  <div key={idx} className="flex flex-col gap-1">
                    <div className="flex justify-between items-center text-xs gap-2">
                      <span className="flex items-center gap-2 text-slate-300 font-medium min-w-0">
                        <span
                          className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                            idx < 3
                              ? rankStyle
                              : "bg-slate-800/60 text-slate-600"
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <span className="flex flex-col min-w-0">
                          <span className="truncate">{item.name}</span>
                          {item.ownerName && (
                            <span className="text-[10px] text-slate-500 font-normal truncate">
                              {item.ownerName}
                            </span>
                          )}
                        </span>
                      </span>
                      <div className="text-right shrink-0">
                        <div className="font-mono text-teal-300 font-bold">
                          {item.qty.toLocaleString()} шт
                        </div>
                        {item.revenue > 0 && (
                          <div className="text-[10px] text-teal-500/60 font-mono">
                            {formatPrice(item.revenue)} сум
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${pct}%` }}
                        className="h-full rounded-full bg-linear-to-r from-teal-500 to-cyan-500 transition-all duration-700"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── ФИНАНСЫ ── */}
      <div className="bg-[#0d0f1c] border border-slate-800/60 rounded-2xl p-5 sm:p-6 flex flex-col gap-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              💰 Финансовые показатели
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Общая выручка по периодам и товарам
            </p>
          </div>
          <div className="flex gap-0.5 bg-slate-900/70 p-1 rounded-xl border border-slate-800/60">
            {REVENUE_PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setRevenuePeriod(p.key)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all duration-200 ${
                  revenuePeriod === p.key
                    ? "bg-teal-600/80 text-white"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative rounded-2xl border border-teal-800/25 overflow-hidden">
          {/* ambient glow + faint grid texture, purely decorative */}
          <div className="absolute inset-0 bg-linear-to-br from-teal-950/40 via-[#0c1218] to-[#0a0e14]" />
          <div className="absolute top-0 right-0 w-64 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-56 h-56 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative p-5 sm:p-6 flex flex-col gap-5">
            {/* top row: headline number + product filter */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                  <span>Выручка за</span>
                  <span className="text-teal-400">
                    {currentRevenuePeriodLabel}
                  </span>
                  {selectedProduct !== "all" && (
                    <span className="text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-2 py-0.5 normal-case tracking-normal text-[10px]">
                      {selectedProduct}
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-4xl sm:text-5xl font-black font-mono text-white tracking-tight leading-none">
                    {formatPrice(revenueStats.revenue)}
                  </span>
                  <span className="text-base text-teal-400/80 font-bold">
                    сум
                  </span>
                  {revenuePrevStats.revenue > 0 && (
                    <span
                      className={`flex items-center gap-1 text-xs font-bold font-mono px-2 py-0.5 rounded-full ${
                        revenueDeltaPct >= 0
                          ? "text-teal-300 bg-teal-500/10 border border-teal-500/20"
                          : "text-rose-300 bg-rose-500/10 border border-rose-500/20"
                      }`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={`w-3 h-3 ${
                          revenueDeltaPct < 0 ? "rotate-180" : ""
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 10l7-7m0 0l7 7m-7-7v18"
                        />
                      </svg>
                      {Math.abs(revenueDeltaPct)}%
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-indigo-500/15 border border-indigo-500/20 text-indigo-300 font-mono font-bold text-xs px-3 py-1 rounded-lg">
                    {revenueStats.qty.toLocaleString()} шт
                  </span>
                  <span className="text-[11px] text-slate-500">
                    продано за период
                  </span>
                </div>
              </div>

              {allProductNames.length > 0 && (
                <select
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  className="bg-slate-900/80 border border-slate-700/60 text-slate-300 text-[11px] font-semibold rounded-xl px-3 py-2 outline-none focus:border-teal-600/50 cursor-pointer self-start sm:self-auto"
                >
                  <option value="all">Все товары</option>
                  {allProductNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* sparkline trend */}
            {revenueTrend.length > 0 && (
              <div className="flex items-end gap-0.75 h-14">
                {revenueTrend.map((v, i) => {
                  const h = Math.max(4, Math.round((v / maxTrendValue) * 100));
                  const isLast = i === revenueTrend.length - 1;
                  return (
                    <div
                      key={i}
                      title={formatPrice(v) + " сум"}
                      style={{ height: `${h}%` }}
                      className={`flex-1 rounded-t-sm transition-all duration-500 ${
                        isLast
                          ? "bg-linear-to-t from-teal-500 to-cyan-300"
                          : "bg-linear-to-t from-teal-700/50 to-teal-500/30 hover:from-teal-600/70 hover:to-teal-400/50"
                      }`}
                    />
                  );
                })}
              </div>
            )}

            {/* footer: share of total revenue */}
            {totalRevenue > 0 && (
              <div className="pt-4 border-t border-teal-800/20">
                <div className="flex justify-between text-[10px] text-slate-500 mb-1.5">
                  <span>Доля от общей выручки</span>
                  <span className="text-teal-400 font-mono font-bold">
                    {Math.min(
                      100,
                      Math.round((revenueStats.revenue / totalRevenue) * 100)
                    )}
                    %
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                  <div
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round((revenueStats.revenue / totalRevenue) * 100)
                      )}%`,
                    }}
                    className="h-full rounded-full bg-linear-to-r from-teal-500 to-cyan-400 transition-all duration-700"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
