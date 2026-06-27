import { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import axios from "../utils/axios.js";

const STATUS_CONFIG = {
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

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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

const formatPrice = (num) => (num || 0).toLocaleString("ru-RU");

// ─── Icons ───────────────────────────────────────────────────────────────────
const TrashIcon = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" /><path d="M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

const EyeIcon = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const SearchIcon = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

// ─── Animated Toast Confirm ───────────────────────────────────────────────────
function confirmDeleteToast(message = "Удалить этот заказ из истории?") {
  return new Promise((resolve) => {
    toast.custom(
      (t) => (
        <div
          style={{
            animation: t.visible
              ? "slideDown 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards"
              : "slideUp 0.25s ease-in forwards",
          }}
          className="max-w-xs w-full"
        >
          <style>{`
            @keyframes slideDown {
              from { opacity: 0; transform: translateY(-20px) scale(0.95); }
              to   { opacity: 1; transform: translateY(0)     scale(1); }
            }
            @keyframes slideUp {
              from { opacity: 1; transform: translateY(0)     scale(1); }
              to   { opacity: 0; transform: translateY(-12px) scale(0.96); }
            }
          `}</style>
          <div className="bg-[#12141e] border border-slate-700/80 shadow-2xl shadow-black/60 rounded-2xl overflow-hidden">
            <div className="h-0.5 w-full bg-linear-to-r from-rose-500 via-rose-400 to-pink-500" />
            <div className="p-4 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/25 flex items-center justify-center shrink-0">
                  <TrashIcon className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white leading-snug">{message}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Это действие нельзя отменить.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { toast.dismiss(t.id); resolve(false); }}
                  className="flex-1 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all duration-150"
                >
                  Отмена
                </button>
                <button
                  onClick={() => { toast.dismiss(t.id); resolve(true); }}
                  className="flex-1 py-2 rounded-xl text-xs font-bold bg-linear-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white shadow-lg shadow-rose-900/40 transition-all duration-150 flex items-center justify-center gap-1.5"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                  Удалить
                </button>
              </div>
            </div>
          </div>
        </div>
      ),
      { duration: 15000, position: "top-center" }
    );
  });
}

// ─── Success / Error Toast helper ────────────────────────────────────────────
function showAnimatedToast(message, type = "success") {
  toast.custom(
    (t) => (
      <div
        style={{
          animation: t.visible
            ? "slideDown 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards"
            : "slideUp 0.25s ease-in forwards",
        }}
        className="max-w-xs w-full"
      >
        <div
          className={`bg-[#12141e] border shadow-2xl shadow-black/50 rounded-2xl overflow-hidden ${
            type === "success" ? "border-emerald-500/40" : "border-rose-500/40"
          }`}
        >
          <div
            className={`h-0.5 w-full bg-linear-to-r ${
              type === "success"
                ? "from-emerald-500 via-teal-400 to-cyan-500"
                : "from-rose-500 via-rose-400 to-pink-500"
            }`}
          />
          <div className="px-4 py-3 flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                type === "success"
                  ? "bg-emerald-500/15 border border-emerald-500/25"
                  : "bg-rose-500/15 border border-rose-500/25"
              }`}
            >
              <span className="text-sm">{type === "success" ? "✓" : "✕"}</span>
            </div>
            <p
              className={`text-sm font-semibold ${
                type === "success" ? "text-emerald-300" : "text-rose-300"
              }`}
            >
              {message}
            </p>
          </div>
        </div>
      </div>
    ),
    { duration: 3000, position: "top-center" }
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
const DetailModal = ({ order, onClose }) => {
  if (!order) return null;
  const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.delivered;
  const unitPrice = order.product?.price || 0;
  const total = unitPrice * (order.quantity || 0);
  const link = mapsLink(order.location);

  return (
    <div
      className="fixed inset-0 z-9999 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      style={{ animation: "fadeIn 0.2s ease forwards" }}
      onClick={onClose}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalUp {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)     scale(1); }
        }
      `}</style>
      <div
        className="w-full max-w-md bg-[#0d0f1a] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
        style={{ animation: "modalUp 0.3s cubic-bezier(0.34,1.3,0.64,1) forwards" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top gradient line */}
        <div className="h-0.5 w-full bg-linear-to-r from-cyan-500 via-violet-500 to-pink-500" />

        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800/80 flex items-start justify-between gap-4 bg-slate-900/30">
          <div>
            <h3 className="text-base font-black text-white tracking-wide">Детали заказа</h3>
            <p className="text-slate-500 text-xs mt-0.5 font-mono">{formatDate(order.createdAt)}</p>
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

          {/* Info rows */}
          <div className="flex flex-col divide-y divide-slate-800/60 text-sm">
            {[
              { label: "Клиент",     value: order.botUser?.fullName || "Неизвестно" },
              { label: "Телефон",    value: formatPhone(order.botUser?.phone), mono: true },
              { label: "Username",   value: order.botUser?.username ? `@${order.botUser.username}` : "—" },
              { label: "Товар",      value: order.product?.name || "—" },
              { label: "Количество", value: `${order.quantity} шт` },
              ...(unitPrice > 0 ? [{ label: "Цена за шт",  value: `${formatPrice(unitPrice)} сум`, highlight: "violet" }] : []),
              ...(total > 0      ? [{ label: "Итого",       value: `${formatPrice(total)} сум`,     highlight: "orange" }] : []),
              ...(order.note     ? [{ label: "Примечание",  value: `"${order.note}"`,                italic: true }]       : []),
            ].map(({ label, value, mono, highlight, italic }) => (
              <div key={label} className="flex items-center justify-between py-3 gap-3">
                <span className="text-slate-500 text-[11px] uppercase tracking-wide font-bold shrink-0">
                  {label}
                </span>
                <span
                  className={`text-right font-semibold text-[13px] truncate
                    ${highlight === "orange" ? "text-orange-400" : ""}
                    ${highlight === "violet" ? "text-violet-400" : ""}
                    ${!highlight ? "text-slate-200" : ""}
                    ${mono   ? "font-mono"   : ""}
                    ${italic ? "italic text-slate-400" : ""}
                  `}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>

          {/* Price summary */}
          {total > 0 && unitPrice > 0 && (
            <div className="rounded-xl bg-linear-to-r from-orange-500/10 to-violet-500/10 border border-orange-500/15 px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-bold">
                {order.quantity} шт × {formatPrice(unitPrice)} сум
              </span>
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

// ─── Filter Tab Button ────────────────────────────────────────────────────────
const FilterTab = ({ value, current, onChange, children, color = "cyan" }) => {
  const isActive = current === value;
  const colors = {
    cyan:    isActive ? "bg-cyan-500    text-white    shadow-cyan-900/50    border-cyan-500"    : "text-slate-400 border-slate-700/60 hover:border-cyan-500/40    hover:text-cyan-400",
    emerald: isActive ? "bg-emerald-500 text-white    shadow-emerald-900/50 border-emerald-500" : "text-slate-400 border-slate-700/60 hover:border-emerald-500/40 hover:text-emerald-400",
    rose:    isActive ? "bg-rose-500    text-white    shadow-rose-900/50    border-rose-500"    : "text-slate-400 border-slate-700/60 hover:border-rose-500/40    hover:text-rose-400",
  };
  return (
    <button
      onClick={() => onChange(value)}
      className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all duration-200 shadow-lg ${colors[color]} ${isActive ? "shadow-lg" : "bg-slate-900/50"}`}
    >
      {children}
    </button>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, unit, bg, border, text, dot }) => (
  <div className={`${bg} ${border} border rounded-2xl px-4 py-3.5 flex flex-col gap-2 flex-1 min-w-30`}>
    <div className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${dot} shrink-0`} />
      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold leading-none">
        {label}
      </span>
    </div>
    <div className={`font-black font-mono leading-tight ${text} flex items-baseline gap-1`}>
      <span className="text-xl">{value}</span>
      <span className="text-xs font-bold opacity-60">{unit}</span>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ClientHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("history");
  const [selected, setSelected] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const res = await axios.get("/api/bot/orders");
        const raw = res.data?.data ?? res.data;
        const all = Array.isArray(raw) ? raw : [];
        const sorted = [...all].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setOrders(sorted);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.message || "Ошибка при загрузке истории");
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const deleteOrder = async (e, id) => {
    e.stopPropagation();
    const confirmed = await confirmDeleteToast("Удалить этот заказ из истории?");
    if (!confirmed) return;

    setDeletingId(id);
    try {
      await axios.delete(`/api/bot/orders/${id}`);
      setOrders((prev) => prev.filter((o) => o._id !== id));
      if (selected?._id === id) setSelected(null);
      showAnimatedToast("Заказ удалён из истории", "success");
    } catch (err) {
      showAnimatedToast(err.response?.data?.message || "Ошибка при удалении заказа", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter === "history") {
        if (o.status !== "delivered" && o.status !== "cancelled") return false;
      } else if (statusFilter !== "all") {
        if (o.status !== statusFilter) return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const haystack = [o.botUser?.fullName, o.botUser?.phone, o.product?.name]
          .filter(Boolean).join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [orders, search, statusFilter]);

  useEffect(() => { setCurrentPage(1); }, [search, statusFilter]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const indexOfFirst = (currentPage - 1) * itemsPerPage;
  const currentOrders = filtered.slice(indexOfFirst, indexOfFirst + itemsPerPage);

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }
    const left = Math.max(currentPage - 1, 1);
    const right = Math.min(currentPage + 1, totalPages);
    pages.push(1);
    if (left > 2) pages.push("dots-left");
    for (let i = left === 1 ? 2 : left; i <= (right === totalPages ? totalPages - 1 : right); i++) {
      if (i > 1 && i < totalPages) pages.push(i);
    }
    if (right < totalPages - 1) pages.push("dots-right");
    pages.push(totalPages);
    return pages;
  };

  const historyOrders = orders.filter((o) => o.status === "delivered" || o.status === "cancelled");
  const deliveredOrders = historyOrders.filter((o) => o.status === "delivered");
  const cancelledOrders = historyOrders.filter((o) => o.status === "cancelled");
  const totalSum = deliveredOrders.reduce((sum, o) => sum + (o.product?.price || 0) * (o.quantity || 0), 0);

  const statCards = [
    {
      label: "В архиве",
      value: historyOrders.length,
      unit: "шт",
      bg: "bg-violet-500/10",
      border: "border-violet-500/25",
      text: "text-violet-400",
      dot: "bg-violet-400",
    },
    {
      label: "Выполнено",
      value: deliveredOrders.length,
      unit: "шт",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/25",
      text: "text-emerald-400",
      dot: "bg-emerald-400",
    },
    {
      label: "Отменено",
      value: cancelledOrders.length,
      unit: "шт",
      bg: "bg-rose-500/10",
      border: "border-rose-500/25",
      text: "text-rose-400",
      dot: "bg-rose-400",
    },
    {
      label: "Выручка",
      value: formatPrice(totalSum),
      unit: "сум",
      bg: "bg-orange-500/10",
      border: "border-orange-500/25",
      text: "text-orange-400",
      dot: "bg-orange-400",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto p-4 flex flex-col gap-6 select-none text-slate-200">

      {/* HEADER */}
      <div className="flex flex-col gap-4 pb-2">
        <div>
          <h1 className="text-3xl font-black text-cyan-400 tracking-wide">История клиентов</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Архив заказов из Telegram бота.{" "}
            <span className="text-cyan-400 font-bold">Нажмите 👁 </span>
            чтобы увидеть детали заказа.
          </p>
        </div>

        {/* ── STAT CARDS ── */}
        {historyOrders.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {statCards.map((card) => (
              <StatCard key={card.label} {...card} />
            ))}
          </div>
        )}
      </div>

      {/* ── FILTERS ── */}
      <div className="flex flex-wrap gap-3 items-center">

        {/* Search */}
        <div className="relative flex-1 min-w-56">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <SearchIcon className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по имени, телефону или товару..."
            className="w-full bg-white border-2 border-slate-200 hover:border-slate-300 focus:border-cyan-400 rounded-xl pl-10 pr-10 py-2.5 text-[13px] text-slate-800 placeholder-slate-400 outline-none transition-all duration-200 shadow-sm"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                className="w-4 h-4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          )}
        </div>

        {/* Status filter pills */}
        <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-800 rounded-xl p-1">
          <FilterTab value="history"   current={statusFilter} onChange={setStatusFilter} color="cyan">
            📋 Все (архив)
          </FilterTab>
          <FilterTab value="delivered" current={statusFilter} onChange={setStatusFilter} color="emerald">
            ✅ Выполнен
          </FilterTab>
          <FilterTab value="cancelled" current={statusFilter} onChange={setStatusFilter} color="rose">
            ❌ Отменён
          </FilterTab>
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-rose-400 text-sm font-medium">
          ⚠️ {error}
        </div>
      )}

      {/* TABLE */}
      {orders.length === 0 && !loading ? (
        <div className="bg-[#0f111a] border border-slate-800/80 rounded-3xl p-16 text-center text-slate-500 font-medium shadow-2xl">
          📜 История заказов пока пуста.
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#0f111a] border border-slate-800/80 rounded-3xl p-16 text-center shadow-2xl">
          <div className="text-4xl mb-3">🗂️</div>
          <div className="text-slate-400 font-bold text-sm">Ничего не найдено.</div>
          <button
            onClick={() => { setSearch(""); setStatusFilter("history"); }}
            className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all"
          >
            Сбросить фильтры
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="bg-[#0f111a] border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-225">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/40 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <th className="p-4">Клиент 👤</th>
                  <th className="p-4">Товар 📦</th>
                  <th className="p-4">Кол-во</th>
                  <th className="p-4">Сумма 💵</th>
                  <th className="p-4">Статус</th>
                  <th className="p-4">Дата 📅</th>
                  <th className="p-4">Локация 📍</th>
                  <th className="p-4 text-center">Действие</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-[13.5px]">
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={8} className="p-4">
                          <div className="h-8 rounded-lg bg-slate-800/40 animate-pulse" />
                        </td>
                      </tr>
                    ))
                  : currentOrders.map((order) => {
                      const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.delivered;
                      const total = (order.product?.price || 0) * (order.quantity || 0);
                      const link = mapsLink(order.location);
                      const isDeleting = deletingId === order._id;

                      return (
                        <tr
                          key={order._id}
                          style={{ verticalAlign: "middle" }}
                          className="transition-all duration-150 border-l-4 border-l-transparent hover:bg-slate-800/25 hover:border-l-slate-600"
                        >
                          {/* Клиент */}
                          <td className="p-4 align-middle whitespace-nowrap">
                            <div className="font-bold text-white">
                              {order.botUser?.fullName || "Неизвестно"}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                              {formatPhone(order.botUser?.phone)}
                            </div>
                          </td>

                          {/* Товар */}
                          <td className="p-4 align-middle whitespace-nowrap text-slate-200 font-medium">
                            {order.product?.name || "—"}
                            {order.note && (
                              <div className="text-[11px] text-slate-500 italic mt-0.5 max-w-40 truncate">
                                "{order.note}"
                              </div>
                            )}
                          </td>

                          {/* Кол-во */}
                          <td className="p-4 align-middle whitespace-nowrap">
                            <span className="text-cyan-500 font-bold">{order.quantity} шт</span>
                          </td>

                          {/* Сумма */}
                          <td className="p-4 align-middle whitespace-nowrap">
                            {total > 0 ? (
                              <div className="text-orange-400 font-bold font-mono text-sm">
                                {formatPrice(total)} сум
                              </div>
                            ) : (
                              <span className="text-slate-600 text-xs">—</span>
                            )}
                          </td>

                          {/* Статус */}
                          <td className="p-4 align-middle whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${status.badge}`}>
                              {status.label}
                            </span>
                          </td>

                          {/* Дата */}
                          <td className="p-4 align-middle text-slate-500 text-xs font-mono whitespace-nowrap">
                            {formatDate(order.createdAt)}
                          </td>

                          {/* Локация */}
                          <td className="p-4 align-middle whitespace-nowrap">
                            {link ? (
                              <a
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all"
                              >
                                📍 Карта
                              </a>
                            ) : (
                              <span className="text-slate-600 text-xs">—</span>
                            )}
                          </td>

                          {/* Действие */}
                          <td className="p-4 align-middle text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => setSelected(order)}
                                title="Детали"
                                className="w-8 h-8 inline-flex items-center justify-center bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500 text-cyan-400 hover:text-black rounded-lg transition-all"
                              >
                                <EyeIcon className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => deleteOrder(e, order._id)}
                                disabled={isDeleting}
                                title="Удалить"
                                className="w-8 h-8 inline-flex items-center justify-center bg-rose-600/10 border border-rose-500/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg transition-all disabled:opacity-40"
                              >
                                {isDeleting ? (
                                  <span className="w-3.5 h-3.5 border-2 border-rose-400/30 border-t-rose-400 rounded-full animate-spin" />
                                ) : (
                                  <TrashIcon className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-[#0f111a] border border-slate-800/80 px-4 py-3 rounded-2xl shadow-xl">
              <div className="text-xs text-slate-500 font-medium order-2 sm:order-1">
                Показано{" "}
                <span className="text-slate-300 font-bold">
                  {indexOfFirst + 1}–{Math.min(indexOfFirst + itemsPerPage, filtered.length)}
                </span>{" "}
                из <span className="text-cyan-400 font-bold">{filtered.length}</span>
              </div>

              <div className="flex items-center gap-1.5 order-1 sm:order-2">
                <button disabled={currentPage === 1} onClick={() => setCurrentPage(1)}
                  className="w-8 h-8 inline-flex items-center justify-center rounded-lg bg-slate-900/40 border border-slate-800 text-slate-400 text-xs font-bold hover:bg-slate-800/60 hover:text-white disabled:opacity-30 transition-all">«</button>
                <button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}
                  className="h-8 px-3 inline-flex items-center gap-1 rounded-lg bg-slate-900/40 border border-slate-800 text-slate-400 text-xs font-bold hover:bg-slate-800/60 hover:text-white disabled:opacity-30 transition-all">‹ Назад</button>

                <div className="flex items-center gap-1.5 mx-1">
                  {getPageNumbers().map((page, idx) =>
                    typeof page === "number" ? (
                      <button key={page} onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 text-xs font-bold rounded-lg transition-all duration-200 ${
                          currentPage === page
                            ? "bg-cyan-500 text-white shadow-lg shadow-cyan-900/40 scale-105"
                            : "bg-slate-900/40 border border-slate-800 text-slate-400 hover:bg-slate-800/60 hover:text-white"
                        }`}>{page}</button>
                    ) : (
                      <span key={`${page}-${idx}`} className="w-8 h-8 inline-flex items-center justify-center text-slate-600 text-xs">⋯</span>
                    )
                  )}
                </div>

                <button disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}
                  className="h-8 px-3 inline-flex items-center gap-1 rounded-lg bg-slate-900/40 border border-slate-800 text-slate-400 text-xs font-bold hover:bg-slate-800/60 hover:text-white disabled:opacity-30 transition-all">Вперед ›</button>
                <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)}
                  className="w-8 h-8 inline-flex items-center justify-center rounded-lg bg-slate-900/40 border border-slate-800 text-slate-400 text-xs font-bold hover:bg-slate-800/60 hover:text-white disabled:opacity-30 transition-all">»</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* DETAIL MODAL */}
      <DetailModal order={selected} onClose={() => setSelected(null)} />
    </div>
  );
}