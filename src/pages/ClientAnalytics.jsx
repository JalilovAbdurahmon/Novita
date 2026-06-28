import React, { useState, useEffect, useMemo } from "react";
import axios from "../utils/axios";

const formatPrice = (num) => (num || 0).toLocaleString("ru-RU");

const PERIODS = [
  { key: "1w", label: "1 нед", days: 7 },
  { key: "1m", label: "1 мес", days: 30 },
  { key: "3m", label: "3 мес", days: 90 },
  { key: "6m", label: "6 мес", days: 180 },
  { key: "1y", label: "1 год", days: 365 },
];

const RANK = [
  "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30",
  "bg-slate-500/20 text-slate-300 ring-1 ring-slate-500/30",
  "bg-orange-600/20 text-orange-300 ring-1 ring-orange-600/30",
];

const DAYS_RU = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

function getOrderTotal(order) {
  if (typeof order.totalPrice === "number") return order.totalPrice;
  return (order.items || []).reduce(
    (sum, i) => sum + (i.price ?? i.product?.price ?? 0) * (i.quantity || 0),
    0
  );
}

function formatDateTime(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("ru-RU", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatPhone(phone) {
  if (!phone) return "—";
  const digits = String(phone).replace(/\D/g, "");
  const local = digits.startsWith("998") ? digits.slice(3) : digits;
  if (!local) return "—";
  let formatted = "+998";
  if (local.length > 0) formatted += " " + local.slice(0, 2);
  if (local.length > 2) formatted += " " + local.slice(2, 5);
  if (local.length > 5) formatted += " " + local.slice(5, 7);
  if (local.length > 7) formatted += " " + local.slice(7, 9);
  return formatted;
}

function mapsLink(location) {
  if (!location?.lat || !location?.lng) return null;
  return `https://www.google.com/maps?q=${location.lat},${location.lng}`;
}

function getOrderItemsCount(order) {
  return (order.items || []).reduce((sum, i) => sum + (i.quantity || 0), 0);
}

// ─── Mini Sparkline ────────────────────────────────────────────────────────────
const Sparkline = ({ data, color = "from-indigo-600 to-violet-600", height = "h-10" }) => {
  const max = Math.max(...data, 1);
  return (
    <div className={`flex items-end gap-px ${height}`}>
      {data.map((v, i) => {
        const h = Math.max(8, Math.round((v / max) * 100));
        return (
          <div
            key={i}
            style={{ height: `${h}%` }}
            className={`flex-1 rounded-t-sm bg-linear-to-t ${color} opacity-90 transition-all duration-500`}
          />
        );
      })}
    </div>
  );
};

// ─── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, sub, gradient, badge, delta }) => (
  <div className={`relative rounded-2xl p-5 overflow-hidden border ${gradient.border} ${gradient.bg}`}>
    <div className="relative flex justify-between items-start">
      <div>
        <p className={`text-[10px] font-black uppercase tracking-widest ${gradient.label}`}>{label}</p>
        <h3 className={`text-3xl font-black mt-2 font-mono ${gradient.num}`}>{value}</h3>
        {delta !== undefined && (
          <div className={`flex items-center gap-1 mt-1 text-[11px] font-bold ${delta >= 0 ? "text-teal-400" : "text-rose-400"}`}>
            <span>{delta >= 0 ? "▲" : "▼"}</span>
            <span>{Math.abs(delta)}% vs прошлый период</span>
          </div>
        )}
      </div>
      <span className={`text-2xl p-2.5 rounded-xl ${gradient.iconBg}`}>{icon}</span>
    </div>
    <p className="relative text-[11px] text-slate-500 mt-3 flex justify-between items-center">
      {sub && <span>{sub}</span>}
      {badge && <span className={`font-bold px-2 py-0.5 rounded-lg text-[10px] ${gradient.badge}`}>{badge}</span>}
    </p>
  </div>
);

// ─── Section Header ────────────────────────────────────────────────────────────
const SectionHeader = ({ icon, title, sub, accent }) => (
  <div className="flex items-start gap-3">
    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0 ${accent}`}>
      {icon}
    </div>
    <div>
      <h3 className="text-sm font-black text-white">{title}</h3>
      {sub && <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>}
    </div>
  </div>
);

// ─── Detail Modal ─────────────────────────────────────────────────────────────
const ORDER_STATUS_CONFIG = {
  new: {
    label: "Новый",
    badge: "bg-orange-500/15 text-orange-400 border border-orange-500/30",
  },
  accepted: {
    label: "Принят",
    badge: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  },
  delivered: {
    label: "Выполнен",
    badge: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  },
  cancelled: {
    label: "Отменён",
    badge: "bg-rose-500/15 text-rose-400 border border-rose-500/30",
  },
};

const OrderDetailModal = ({ order, onClose }) => {
  if (!order) return null;
  const status = ORDER_STATUS_CONFIG[order.status] || ORDER_STATUS_CONFIG.delivered;
  const items = order.items || [];
  const total = getOrderTotal(order);
  const link = mapsLink(order.location);

  return (
    <div
      className="fixed inset-0 z-9999 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      style={{ animation: "fadeInAnalytics 0.2s ease forwards" }}
      onClick={onClose}
    >
      <style>{`
        @keyframes fadeInAnalytics { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalUpAnalytics {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)     scale(1); }
        }
      `}</style>
      <div
        className="w-full max-w-md bg-[#0d0f1a] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
        style={{ animation: "modalUpAnalytics 0.3s cubic-bezier(0.34,1.3,0.64,1) forwards" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top gradient line */}
        <div className="h-0.5 w-full bg-linear-to-r from-cyan-500 via-violet-500 to-pink-500" />

        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800/80 flex items-start justify-between gap-4 bg-slate-900/30">
          <div>
            <h3 className="text-base font-black text-white tracking-wide">Детали заказа</h3>
            <p className="text-slate-500 text-xs mt-0.5 font-mono">{formatDateTime(order.createdAt)}</p>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700/80 transition-all"
          >
            ✕ Закрыть
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          {/* Status */}
          <span className={`inline-flex items-center text-xs font-bold px-3 py-1.5 rounded-full ${status.badge}`}>
            {status.label}
          </span>

          {/* Info rows — клиент */}
          <div className="flex flex-col divide-y divide-slate-800/60 text-sm">
            {[
              { label: "Клиент",   value: order.botUser?.fullName || order.botUser?.firstName || `TG: ${order.telegramId}` || "Неизвестно" },
              { label: "Телефон",  value: formatPhone(order.botUser?.phone), mono: true },
              { label: "Username", value: order.botUser?.username ? `@${order.botUser.username}` : "—" },
              ...(order.note ? [{ label: "Примечание", value: `"${order.note}"`, italic: true }] : []),
            ].map(({ label, value, mono, italic }) => (
              <div key={label} className="flex items-center justify-between py-3 gap-3">
                <span className="text-slate-500 text-[11px] uppercase tracking-wide font-bold shrink-0">
                  {label}
                </span>
                <span
                  className={`text-right font-semibold text-[13px] truncate text-slate-200
                    ${mono   ? "font-mono"   : ""}
                    ${italic ? "italic text-slate-400" : ""}
                  `}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>

          {/* Mahsulotlar ro'yxati */}
          <div className="flex flex-col gap-2">
            <span className="text-slate-500 text-[11px] uppercase tracking-wide font-bold">
              Товары
            </span>
            <div className="flex flex-col divide-y divide-slate-800/60 rounded-xl border border-slate-800/60 overflow-hidden">
              {items.length === 0 ? (
                <div className="px-3 py-3 text-slate-500 text-sm text-center">
                  Нет товаров
                </div>
              ) : (
                items.map((item, idx) => {
                  const name = item.product?.name || "—";
                  const price = item.price ?? item.product?.price ?? 0;
                  const qty = item.quantity || 0;
                  const lineTotal = price * qty;
                  return (
                    <div
                      key={item._id || idx}
                      className="px-3 py-2.5 flex items-center justify-between gap-3 bg-slate-900/20"
                    >
                      <div className="min-w-0">
                        <div className="text-slate-200 text-[13px] font-semibold truncate">
                          {name}
                        </div>
                        <div className="text-slate-500 text-[11px] font-mono">
                          {qty} шт × {formatPrice(price)} сум
                        </div>
                      </div>
                      <div className="text-violet-400 font-bold text-[13px] font-mono shrink-0">
                        {formatPrice(lineTotal)} сум
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Price summary */}
          {total > 0 && (
            <div className="rounded-xl bg-linear-to-r from-orange-500/10 to-violet-500/10 border border-orange-500/15 px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-bold">Итого по заказу</span>
              <span className="text-orange-400 font-black text-sm">{formatPrice(total)} сум</span>
            </div>
          )}

          {/* Map link */}
          {link ? (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-400 hover:text-cyan-300 text-sm font-bold transition-all"
            >
              📍 Открыть на карте
            </a>
          ) : (
            <div className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-slate-800/30 border border-slate-800 text-slate-600 text-sm">
              📍 Локация не получена
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


const ClientAnalytics = () => {
  const [allOrders, setAllOrders] = useState([]);
  const [period, setPeriod] = useState("1m");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/bot/orders");
      const raw = res.data?.data ?? res.data;
      setAllOrders(Array.isArray(raw) ? raw : []);
    } catch (err) {
      console.error("Ошибка:", err);
    } finally {
      setLoading(false);
    }
  };

  // ── Все вычисления через useMemo ───────────────────────────────────────────
  const computed = useMemo(() => {
    const periodDays = PERIODS.find((p) => p.key === period)?.days || 30;
    const now = Date.now();
    const cutoff = new Date(now - periodDays * 86400000);
    const prevCutoff = new Date(now - periodDays * 2 * 86400000);

    const filtered = allOrders.filter((o) => o?.createdAt && new Date(o.createdAt) >= cutoff);
    const prevFiltered = allOrders.filter((o) => {
      if (!o?.createdAt) return false;
      const t = new Date(o.createdAt);
      return t >= prevCutoff && t < cutoff;
    });

    // Статус (все время)
    const delivered = allOrders.filter((o) => o.status === "delivered").length;
    const cancelled = allOrders.filter((o) => o.status === "cancelled").length;
    const active = allOrders.filter((o) => o.status === "new" || o.status === "accepted").length;

    // Выручка за период vs прошлый
    const deliveredFiltered = filtered.filter((o) => o.status === "delivered");
    const prevDelivered = prevFiltered.filter((o) => o.status === "delivered");
    const totalRevenue = deliveredFiltered.reduce((s, o) => s + getOrderTotal(o), 0);
    const prevRevenue = prevDelivered.reduce((s, o) => s + getOrderTotal(o), 0);
    const revenueDelta = prevRevenue > 0
      ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100)
      : totalRevenue > 0 ? 100 : 0;

    const ordersDelta = prevFiltered.length > 0
      ? Math.round(((filtered.length - prevFiltered.length) / prevFiltered.length) * 100)
      : filtered.length > 0 ? 100 : 0;

    const avgOrder = deliveredFiltered.length > 0 ? Math.round(totalRevenue / deliveredFiltered.length) : 0;

    // Топ товары
    const prodMap = {};
    filtered.forEach((order) => {
      (order.items || []).forEach((item) => {
        const name = item?.product?.name || "Неизвестно";
        const qty = item?.quantity || 0;
        const rev = (item?.price ?? item?.product?.price ?? 0) * qty;
        if (!prodMap[name]) prodMap[name] = { qty: 0, revenue: 0 };
        prodMap[name].qty += qty;
        prodMap[name].revenue += rev;
      });
    });
    const topProducts = Object.entries(prodMap)
      .map(([name, d]) => ({ name, ...d }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 3);

    // Топ клиенты
    const clientMap = {};
    filtered.forEach((order) => {
      const id = order?.botUser?._id || order?.telegramId;
      if (!id) return;
      const name = order?.botUser?.fullName || order?.botUser?.firstName || `TG: ${order?.telegramId}`;
      const phone = order?.botUser?.phone || "";
      const isNew = !prevFiltered.some((o) =>
        (o?.botUser?._id || o?.telegramId)?.toString() === id?.toString()
      );
      if (!clientMap[id]) clientMap[id] = { name, phone, orderCount: 0, totalSpent: 0, isNew };
      clientMap[id].orderCount++;
      clientMap[id].totalSpent += getOrderTotal(order);
    });
    const topClients = Object.values(clientMap)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 7);

    // Новые vs вернувшиеся клиенты
    const prevClientIds = new Set(
      prevFiltered.map((o) => (o?.botUser?._id || o?.telegramId)?.toString()).filter(Boolean)
    );
    const currClientIds = new Set(
      filtered.map((o) => (o?.botUser?._id || o?.telegramId)?.toString()).filter(Boolean)
    );
    const returningClients = [...currClientIds].filter((id) => prevClientIds.has(id)).length;
    const newClients = currClientIds.size - returningClients;

    // Peak hours — сколько заказов по часам
    const hourMap = Array(24).fill(0);
    filtered.forEach((o) => {
      if (o?.createdAt) hourMap[new Date(o.createdAt).getHours()]++;
    });

    // По дням недели
    const dayMap = Array(7).fill(0);
    filtered.forEach((o) => {
      if (o?.createdAt) dayMap[new Date(o.createdAt).getDay()]++;
    });

    // Sparkline тренд
    const bucketCount = Math.min(14, periodDays);
    const bucketSizeDays = periodDays / bucketCount;
    const trendBuckets = Array(bucketCount).fill(0);
    deliveredFiltered.forEach((o) => {
      const ageDays = (now - new Date(o.createdAt).getTime()) / 86400000;
      let idx = bucketCount - 1 - Math.floor(ageDays / bucketSizeDays);
      idx = Math.max(0, Math.min(bucketCount - 1, idx));
      trendBuckets[idx] += getOrderTotal(o);
    });

    // Последние 5
    const recentOrders = [...allOrders]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);

    const peakHour = hourMap.indexOf(Math.max(...hourMap));

    return {
      total: allOrders.length, delivered, cancelled, active,
      filteredCount: filtered.length, ordersDelta,
      totalRevenue, prevRevenue, revenueDelta, avgOrder,
      topProducts, topClients,
      newClients, returningClients, totalClients: currClientIds.size,
      hourMap, dayMap, trendBuckets, recentOrders, peakHour,
    };
  }, [allOrders, period]);

  const STATUS_CFG = {
    new:       { label: "Ожидание", dot: "bg-amber-400",  color: "text-amber-300",  bg: "bg-amber-500/10  border border-amber-500/20"  },
    accepted:  { label: "Принят",   dot: "bg-blue-400",   color: "text-blue-300",   bg: "bg-blue-500/10   border border-blue-500/20"   },
    delivered: { label: "Выполнен", dot: "bg-teal-400",   color: "text-teal-300",   bg: "bg-teal-500/10   border border-teal-500/20"   },
    cancelled: { label: "Отменён",  dot: "bg-rose-400",   color: "text-rose-300",   bg: "bg-rose-500/10   border border-rose-500/20"   },
  };

  const maxHour = Math.max(...computed.hourMap, 1);
  const maxDay  = Math.max(...computed.dayMap, 1);
  const maxProd = computed.topProducts.length ? Math.max(...computed.topProducts.map((p) => p.qty), 1) : 1;
  const maxClient = computed.topClients.length ? Math.max(...computed.topClients.map((c) => c.totalSpent), 1) : 1;

  if (loading) {
    return (
      <div className="min-h-96 flex items-center justify-center bg-[#0a0b12]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Загрузка аналитики...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 flex flex-col gap-6 select-none text-slate-200 bg-[#0a0b12]">

      {/* ── HERO HEADER ───────────────────────────────────────────────────────── */}
      <div className="relative rounded-3xl overflow-hidden border border-violet-900/40 bg-[#0d0f1c]">
        <div className="absolute inset-0 bg-linear-to-br from-violet-950 via-[#0a0b15] to-indigo-950" />
        <div className="absolute top-0 right-0 w-96 h-64 bg-violet-700/15 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-48 bg-indigo-700/12 rounded-full blur-3xl" />
        {/* Декоративные точки */}
        <div className="absolute top-4 right-4 flex gap-1.5">
          {["bg-rose-400", "bg-amber-400", "bg-teal-400"].map((c, i) => (
            <div key={i} className={`w-2 h-2 rounded-full ${c} opacity-70`} />
          ))}
        </div>
        <div className="relative p-6 sm:p-8 flex items-center justify-between gap-6 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-violet-500/20 border border-violet-500/40 flex items-center justify-center text-xl">
                📊
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-violet-400">CRM · Telegram Bot</p>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none">
                  Аналитика клиентов
                </h1>
              </div>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed max-w-md">
              Статистика заказов, клиентов и выручки из Telegram бота.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Мини-итоги в хедере */}
            <div className="hidden sm:flex gap-2">
              {[
                { v: allOrders.length, l: "Всего заказов", c: "text-violet-300" },
                { v: computed.delivered, l: "Выполнено", c: "text-teal-300" },
                { v: `${formatPrice(computed.totalRevenue)}`, l: "Выручка", c: "text-amber-300", small: true },
              ].map((s, i) => (
                <div key={i} className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-center min-w-20">
                  <div className={`font-black font-mono ${s.small ? "text-sm" : "text-lg"} ${s.c}`}>{s.v}</div>
                  <div className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">{s.l}</div>
                </div>
              ))}
            </div>
            <button
              onClick={fetchData}
              className="flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white bg-black/30 hover:bg-white/10 border border-white/10 hover:border-white/20 px-4 py-2.5 rounded-xl transition-all duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Обновить
            </button>
          </div>
        </div>
      </div>

      {/* ── ПЕРИОД ─────────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Период:</span>
        <div className="flex gap-1 bg-[#0d0f1c] p-1 rounded-xl border border-slate-800/60">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-200 ${
                period === p.key
                  ? "bg-linear-to-r from-violet-700 to-indigo-700 text-white shadow-lg shadow-violet-950/60"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {computed.filteredCount > 0 && (
          <span className="text-xs text-slate-500 font-medium">
            — <span className="text-violet-300 font-bold">{computed.filteredCount}</span> заказов за период
          </span>
        )}
      </div>

      {/* ── КАРТОЧКИ СТАТИСТИКИ ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            icon: "📦", label: "Всего заказов", value: allOrders.length,
            sub: "За всё время", delta: computed.ordersDelta,
            gradient: {
              bg: "bg-[#15142a]",
              border: "border-violet-900/40",
              label: "text-violet-400", num: "text-violet-200",
              iconBg: "bg-violet-500/15", badge: "text-violet-300 bg-violet-500/15",
            },
          },
          {
            icon: "✅", label: "Выполнено", value: computed.delivered,
            sub: "Успешно доставлено",
            badge: `${allOrders.length > 0 ? Math.round((computed.delivered / allOrders.length) * 100) : 0}% от всех`,
            gradient: {
              bg: "bg-[#0e1f1d]",
              border: "border-teal-900/40",
              label: "text-teal-400", num: "text-teal-200",
              iconBg: "bg-teal-500/15", badge: "text-teal-300 bg-teal-500/15",
            },
          },
          {
            icon: "⏳", label: "Активные", value: computed.active,
            sub: "В обработке прямо сейчас",
            gradient: {
              bg: "bg-[#241c0e]",
              border: "border-amber-900/40",
              label: "text-amber-400", num: "text-amber-200",
              iconBg: "bg-amber-500/15", badge: "text-amber-300 bg-amber-500/15",
            },
          },
          {
            icon: "❌", label: "Отменено", value: computed.cancelled,
            sub: "Отменённые заказы",
            badge: `${allOrders.length > 0 ? Math.round((computed.cancelled / allOrders.length) * 100) : 0}% от всех`,
            gradient: {
              bg: "bg-[#240f14]",
              border: "border-rose-900/40",
              label: "text-rose-400", num: "text-rose-200",
              iconBg: "bg-rose-500/15", badge: "text-rose-300 bg-rose-500/15",
            },
          },
        ].map((card, i) => (
          <StatCard key={i} {...card} />
        ))}
      </div>

      {/* ── ВЫРУЧКА ─────────────────────────────────────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden border border-teal-900/40 bg-[#0d0f1c]">
        <div className="absolute inset-0 bg-linear-to-br from-teal-950/70 via-[#0a0e10] to-cyan-950/50" />
        <div className="absolute top-0 right-0 w-80 h-56 bg-teal-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-48 h-36 bg-cyan-600/8 rounded-full blur-3xl" />
        <div className="relative p-6 sm:p-8 flex flex-col gap-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex flex-col gap-2">
              <SectionHeader
                icon="💰"
                title="Финансовые показатели"
                sub={`Только выполненные заказы · ${PERIODS.find(p => p.key === period)?.label}`}
                accent="bg-teal-500/15"
              />
              <div className="flex items-baseline gap-2 flex-wrap mt-2">
                <span className="text-4xl sm:text-5xl font-black font-mono text-white tracking-tight">
                  {formatPrice(computed.totalRevenue)}
                </span>
                <span className="text-lg text-teal-400 font-bold">сум</span>
                {computed.revenueDelta !== 0 && (
                  <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${
                    computed.revenueDelta >= 0
                      ? "text-teal-300 bg-teal-500/10 border-teal-500/30"
                      : "text-rose-300 bg-rose-500/10 border-rose-500/30"
                  }`}>
                    {computed.revenueDelta >= 0 ? "▲" : "▼"} {Math.abs(computed.revenueDelta)}%
                  </span>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                <span className="text-xs font-bold text-teal-300 bg-teal-500/10 border border-teal-500/30 px-3 py-1.5 rounded-lg font-mono">
                  Средний чек: {formatPrice(computed.avgOrder)} сум
                </span>
                <span className="text-xs font-bold text-indigo-300 bg-indigo-500/10 border border-indigo-500/30 px-3 py-1.5 rounded-lg font-mono">
                  {computed.topProducts.reduce((s, p) => s + p.qty, 0)} шт продано
                </span>
              </div>
            </div>
          </div>
          {/* Sparkline */}
          {computed.trendBuckets.some((v) => v > 0) && (
            <div>
              <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold mb-2">Динамика выручки</p>
              <Sparkline data={computed.trendBuckets} color="from-teal-700 to-cyan-500" height="h-16" />
            </div>
          )}
        </div>
      </div>

      {/* ── ТОП ТОВАРЫ + ТОП КЛИЕНТЫ ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Топ товары */}
        <div className="bg-[#0d0f1c] border border-slate-800/60 rounded-2xl p-5 flex flex-col gap-5">
          <SectionHeader
            icon="🔥"
            title="Топ товары"
            sub="По количеству единиц за период"
            accent="bg-orange-500/15"
          />
          {computed.topProducts.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-600">Нет данных за этот период</div>
          ) : (
            <div className="flex flex-col gap-3">
              {computed.topProducts.map((item, idx) => {
                const pct = Math.min(100, Math.round((item.qty / maxProd) * 100));
                return (
                  <div key={idx} className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-xs gap-2">
                      <span className="flex items-center gap-2 text-slate-300 font-semibold min-w-0">
                        <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${idx < 3 ? RANK[idx] : "bg-slate-800/60 text-slate-600"}`}>
                          {idx + 1}
                        </span>
                        <span className="truncate">{item.name}</span>
                      </span>
                      <div className="text-right shrink-0">
                        <div className="font-mono text-orange-300 font-bold">{item.qty.toLocaleString()} шт</div>
                        {item.revenue > 0 && (
                          <div className="text-[10px] text-slate-500 font-mono">{formatPrice(item.revenue)} сум</div>
                        )}
                      </div>
                    </div>
                    <div className="w-full h-2 bg-slate-900/80 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${pct}%` }}
                        className="h-full rounded-full bg-linear-to-r from-orange-600 via-amber-600 to-yellow-600 transition-all duration-700"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Топ клиенты */}
        <div className="bg-[#0d0f1c] border border-slate-800/60 rounded-2xl p-5 flex flex-col gap-5">
          <SectionHeader
            icon="👑"
            title="Топ клиенты"
            sub="По сумме покупок за период"
            accent="bg-violet-500/15"
          />
          {computed.topClients.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-600">Нет данных за этот период</div>
          ) : (
            <div className="flex flex-col gap-3">
              {computed.topClients.map((client, idx) => {
                const pct = Math.min(100, Math.round((client.totalSpent / maxClient) * 100));
                return (
                  <div key={idx} className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-xs gap-2">
                      <span className="flex items-center gap-2 text-slate-300 font-semibold min-w-0">
                        <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${idx < 3 ? RANK[idx] : "bg-slate-800/60 text-slate-600"}`}>
                          {idx + 1}
                        </span>
                        <span className="flex flex-col min-w-0">
                          <span className="truncate">{client.name}</span>
                          {client.phone && <span className="text-[10px] text-slate-500 font-normal">{client.phone}</span>}
                        </span>
                        {client.isNew && (
                          <span className="text-[9px] font-black text-teal-400 bg-teal-500/10 border border-teal-500/30 px-1.5 py-0.5 rounded-full shrink-0">NEW</span>
                        )}
                      </span>
                      <div className="text-right shrink-0">
                        <div className="font-mono text-violet-300 font-bold">{formatPrice(client.totalSpent)} сум</div>
                        <div className="text-[10px] text-slate-500 font-mono">{client.orderCount} заказов</div>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-slate-900/80 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${pct}%` }}
                        className="h-full rounded-full bg-linear-to-r from-violet-600 via-purple-600 to-indigo-600 transition-all duration-700"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── PEAK HOURS + ДНЕЙ НЕДЕЛИ ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Peak Hours */}
        <div className="bg-[#0d0f1c] border border-slate-800/60 rounded-2xl p-5 flex flex-col gap-5">
          <div className="flex items-start justify-between gap-2">
            <SectionHeader
              icon="⏰"
              title="Активные часы"
              sub="Когда чаще всего поступают заказы"
              accent="bg-cyan-500/15"
            />
            {computed.filteredCount > 0 && (
              <div className="text-right shrink-0">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">Пик</div>
                <div className="text-cyan-300 font-black font-mono text-sm">{String(computed.peakHour).padStart(2, "0")}:00</div>
              </div>
            )}
          </div>
          {computed.filteredCount === 0 ? (
            <div className="text-center py-10 text-xs text-slate-600">Нет данных за этот период</div>
          ) : (
            <div className="flex flex-col gap-2">
              {/* Группируем по 6-часовым блокам для читаемости */}
              {[
                { label: "Ночь 00–05", hours: [0,1,2,3,4,5], color: "from-slate-700 to-slate-600" },
                { label: "Утро 06–11", hours: [6,7,8,9,10,11], color: "from-amber-700 to-yellow-600" },
                { label: "День 12–17", hours: [12,13,14,15,16,17], color: "from-orange-600 to-amber-600" },
                { label: "Вечер 18–23", hours: [18,19,20,21,22,23], color: "from-violet-700 to-indigo-600" },
              ].map(({ label, hours, color }) => {
                const total = hours.reduce((s, h) => s + computed.hourMap[h], 0);
                const pct = Math.min(100, Math.round((total / (computed.filteredCount || 1)) * 100));
                const peak = hours.find(h => computed.hourMap[h] === Math.max(...hours.map(h2 => computed.hourMap[h2])));
                return (
                  <div key={label} className="flex flex-col gap-1">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-400 font-semibold">{label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600 font-mono">пик {String(peak).padStart(2,"0")}:00</span>
                        <span className="text-slate-300 font-bold font-mono">{total} зак.</span>
                      </div>
                    </div>
                    <div className="w-full h-2.5 bg-slate-900/80 rounded-full overflow-hidden">
                      <div style={{ width: `${pct}%` }} className={`h-full rounded-full bg-linear-to-r ${color} transition-all duration-700`} />
                    </div>
                  </div>
                );
              })}
              {/* Детальный bar chart по часам */}
              <div className="mt-2 pt-3 border-t border-slate-800/50">
                <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold mb-2">Почасово</p>
                <div className="flex items-end gap-px h-12">
                  {computed.hourMap.map((v, h) => {
                    const ht = Math.max(4, Math.round((v / maxHour) * 100));
                    const isPeak = h === computed.peakHour;
                    return (
                      <div
                        key={h}
                        title={`${String(h).padStart(2,"0")}:00 — ${v} зак.`}
                        style={{ height: `${ht}%` }}
                        className={`flex-1 rounded-t-sm transition-all duration-500 ${
                          isPeak
                            ? "bg-linear-to-t from-cyan-600 to-cyan-400"
                            : "bg-slate-700/60 hover:bg-slate-600/80"
                        }`}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between text-[9px] text-slate-700 font-mono mt-1">
                  <span>00</span><span>06</span><span>12</span><span>18</span><span>23</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* По дням недели + Новые vs Вернувшиеся */}
        <div className="flex flex-col gap-5">

          {/* По дням недели */}
          <div className="bg-[#0d0f1c] border border-slate-800/60 rounded-2xl p-5 flex flex-col gap-4">
            <SectionHeader
              icon="📅"
              title="По дням недели"
              sub="Активность заказов за период"
              accent="bg-indigo-500/15"
            />
            {computed.filteredCount === 0 ? (
              <div className="text-center py-6 text-xs text-slate-600">Нет данных</div>
            ) : (
              <div className="flex items-end gap-2 h-20">
                {computed.dayMap.map((v, d) => {
                  const ht = Math.max(8, Math.round((v / maxDay) * 100));
                  const isMax = v === Math.max(...computed.dayMap);
                  return (
                    <div key={d} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full flex items-end" style={{ height: "60px" }}>
                        <div
                          style={{ height: `${ht}%` }}
                          className={`w-full rounded-t-lg transition-all duration-700 ${
                            isMax
                              ? "bg-linear-to-t from-indigo-700 to-violet-500"
                              : "bg-slate-800 hover:bg-slate-700"
                          }`}
                        />
                      </div>
                      <span className={`text-[10px] font-bold ${isMax ? "text-violet-300" : "text-slate-600"}`}>
                        {DAYS_RU[d]}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Новые vs Вернувшиеся */}
          <div className="bg-[#0d0f1c] border border-slate-800/60 rounded-2xl p-5 flex flex-col gap-4">
            <SectionHeader
              icon="👥"
              title="Новые vs Вернувшиеся"
              sub="Клиенты за выбранный период"
              accent="bg-teal-500/15"
            />
            {computed.totalClients === 0 ? (
              <div className="text-center py-4 text-xs text-slate-600">Нет данных</div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex gap-3">
                  {[
                    { label: "Новые клиенты", value: computed.newClients, color: "text-teal-300", bar: "from-teal-600 to-cyan-500", bg: "bg-teal-500/10 border-teal-500/30" },
                    { label: "Вернувшиеся", value: computed.returningClients, color: "text-violet-300", bar: "from-violet-600 to-indigo-500", bg: "bg-violet-500/10 border-violet-500/30" },
                  ].map((s) => (
                    <div key={s.label} className={`flex-1 rounded-xl border p-3 ${s.bg}`}>
                      <div className={`text-2xl font-black font-mono ${s.color}`}>{s.value}</div>
                      <div className="text-[10px] text-slate-500 font-semibold mt-1">{s.label}</div>
                    </div>
                  ))}
                </div>
                {/* Процент полоса */}
                {computed.totalClients > 0 && (
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                      <span className="text-teal-400 font-bold">
                        {Math.round((computed.newClients / computed.totalClients) * 100)}% новых
                      </span>
                      <span className="text-violet-400 font-bold">
                        {Math.round((computed.returningClients / computed.totalClients) * 100)}% вернувшихся
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${Math.round((computed.newClients / computed.totalClients) * 100)}%` }}
                        className="h-full bg-linear-to-r from-teal-600 to-cyan-500 transition-all duration-700"
                      />
                      <div
                        style={{ width: `${Math.round((computed.returningClients / computed.totalClients) * 100)}%` }}
                        className="h-full bg-linear-to-r from-violet-600 to-indigo-500 transition-all duration-700"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── РАСПРЕДЕЛЕНИЕ СТАТУСОВ ──────────────────────────────────────────────── */}
      <div className="bg-[#0d0f1c] border border-slate-800/60 rounded-2xl p-5 flex flex-col gap-5">
        <SectionHeader icon="📊" title="Распределение по статусам" sub="За всё время" accent="bg-slate-700/50" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(STATUS_CFG).map(([key, cfg]) => {
            const count = allOrders.filter((o) => o.status === key).length;
            const pct = allOrders.length > 0 ? Math.round((count / allOrders.length) * 100) : 0;
            return (
              <div key={key} className={`rounded-xl border p-4 ${cfg.bg}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  <span className={`text-[10px] font-black uppercase tracking-widest ${cfg.color}`}>{cfg.label}</span>
                </div>
                <div className={`text-2xl font-black font-mono ${cfg.color}`}>{count}</div>
                <div className="text-[10px] text-slate-600 font-mono mt-1">{pct}% от всех</div>
                <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden mt-2">
                  <div style={{ width: `${pct}%` }} className={`h-full rounded-full ${cfg.dot} transition-all duration-700`} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── ПОСЛЕДНИЕ ЗАКАЗЫ ─────────────────────────────────────────────────────── */}
      <div className="bg-[#0d0f1c] border border-slate-800/60 rounded-2xl p-5 flex flex-col gap-5">
        <SectionHeader icon="⚡" title="Последние заказы" sub="5 самых последних заказов из бота" accent="bg-amber-500/15" />
        <div className="flex flex-col gap-2">
          {computed.recentOrders.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-600">Заказов пока нет</div>
          ) : (
            computed.recentOrders.map((order, idx) => {
              const cfg = STATUS_CFG[order.status] || STATUS_CFG.new;
              const clientName = order?.botUser?.fullName || order?.botUser?.firstName || `TG: ${order?.telegramId}`;
              const items = order.items || [];
              const itemsPreview = items.slice(0, 2).map((i) => i?.product?.name || "Товар").join(", ");
              const moreCount = items.length - 2;
              const total = getOrderTotal(order);
              return (
                <div
                  key={idx}
                  onClick={() => setSelected(order)}
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/50 hover:bg-slate-900/80 border border-slate-800/40 hover:border-slate-700/60 transition-all duration-200 cursor-pointer"
                >
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${cfg.dot}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-200">{clientName}</span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                      {itemsPreview}{moreCount > 0 && <span className="text-slate-600"> +{moreCount} ещё</span>}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {total > 0 && <div className="text-sm font-black font-mono text-amber-300">{formatPrice(total)} сум</div>}
                    <div className="text-[10px] text-slate-600 font-mono">{formatDateTime(order.createdAt)}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* DETAIL MODAL */}
      <OrderDetailModal order={selected} onClose={() => setSelected(null)} />

    </div>
  );
};

export default ClientAnalytics;