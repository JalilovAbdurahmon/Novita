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

// ─── Иконки ────────────────────────────────────────────────────────────────
const TrashIcon = ({ className = "w-4 h-4" }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

const EyeIcon = ({ className = "w-4 h-4" }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

// ─── Toast-подтверждение удаления ───────────────────────────────────────────
function confirmDeleteToast(message = "Удалить этот заказ из истории?") {
  return new Promise((resolve) => {
    toast.custom(
      (t) => (
        <div
          className={`${
            t.visible ? "animate-in fade-in" : "opacity-0"
          } max-w-sm w-full bg-[#15171f] border border-slate-700 shadow-2xl rounded-2xl p-4 flex flex-col gap-3`}
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0">
              <TrashIcon className="w-4.5 h-4.5 text-rose-400" />
            </div>
            <div className="flex-1 pt-1">
              <p className="text-sm font-bold text-slate-100">{message}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Это действие нельзя отменить.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => {
                toast.dismiss(t.id);
                resolve(false);
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all"
            >
              Отмена
            </button>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                resolve(true);
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/30 transition-all flex items-center gap-1.5"
            >
              <TrashIcon className="w-3.5 h-3.5" />
              Удалить
            </button>
          </div>
        </div>
      ),
      { duration: 15000, position: "top-center" }
    );
  });
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
const DetailModal = ({ order, onClose }) => {
  if (!order) return null;
  const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.delivered;
  const total = (order.product?.price || 0) * (order.quantity || 0);
  const link = mapsLink(order.location);

  return (
    <div
      className="fixed inset-0 z-9999 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#0f111a] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-start justify-between gap-4 bg-slate-900/40">
          <div>
            <h3 className="text-lg font-black text-white tracking-wide">
              Детали заказа
            </h3>
            <p className="text-slate-500 text-xs mt-0.5 font-mono">
              {formatDate(order.createdAt)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all"
          >
            ✕ Закрыть
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          {/* Status badge */}
          <div>
            <span
              className={`inline-flex items-center text-xs font-bold px-3 py-1.5 rounded-full ${status.badge}`}
            >
              {status.label}
            </span>
          </div>

          {/* Info rows */}
          <div className="flex flex-col gap-0 divide-y divide-slate-800/60 text-sm">
            {[
              { label: "Клиент", value: order.botUser?.fullName || "Неизвестно" },
              { label: "Телефон", value: formatPhone(order.botUser?.phone), mono: true },
              {
                label: "Username",
                value: order.botUser?.username
                  ? `@${order.botUser.username}`
                  : "—",
              },
              { label: "Товар", value: order.product?.name || "—" },
              { label: "Количество", value: `${order.quantity} шт` },
              ...(total > 0
                ? [{ label: "Сумма", value: `${formatPrice(total)} сум`, highlight: "orange" }]
                : []),
              ...(order.note ? [{ label: "Примечание", value: `"${order.note}"`, italic: true }] : []),
            ].map(({ label, value, mono, highlight, italic }) => (
              <div
                key={label}
                className="flex items-center justify-between py-3 gap-3"
              >
                <span className="text-slate-500 text-xs uppercase tracking-wide font-bold shrink-0">
                  {label}
                </span>
                <span
                  className={`text-right font-semibold text-[13px] truncate ${
                    highlight === "orange"
                      ? "text-orange-400"
                      : "text-slate-200"
                  } ${mono ? "font-mono" : ""} ${italic ? "italic text-slate-400" : ""}`}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>

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
            <div className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-slate-800/40 border border-slate-800 text-slate-600 text-sm">
              📍 Локация не получена
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ClientHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("history");
  const [selected, setSelected] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const res = await axios.get("/api/bot/orders");
        const raw = res.data?.data ?? res.data;
        const all = Array.isArray(raw) ? raw : [];
        const sorted = [...all].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
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
      if (selectedOrderId === id) setSelectedOrderId(null);
      toast.success("Заказ удалён из истории", { position: "top-center" });
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Ошибка при удалении заказа",
        { position: "top-center" }
      );
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
        const haystack = [
          o.botUser?.fullName,
          o.botUser?.phone,
          o.product?.name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [orders, search, statusFilter]);

  // Pagination
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

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

  // Stats — from history only
  const historyOrders = orders.filter(
    (o) => o.status === "delivered" || o.status === "cancelled"
  );
  const deliveredOrders = historyOrders.filter((o) => o.status === "delivered");
  const totalSum = deliveredOrders.reduce(
    (sum, o) => sum + (o.product?.price || 0) * (o.quantity || 0),
    0
  );
  const totalQty = deliveredOrders.reduce((sum, o) => sum + (o.quantity || 0), 0);

  return (
    <div className="max-w-7xl mx-auto p-4 flex flex-col gap-6 select-none text-slate-200">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-2">
        <div>
          <h1 className="text-3xl font-black text-cyan-400 tracking-wide">
            История клиентов
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Архив заказов из Telegram бота.{" "}
            <span className="text-cyan-400 font-bold">Кликните на строку</span>
            , чтобы увидеть детали.
          </p>
        </div>

        {historyOrders.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl px-4 py-2 text-center">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">В архиве</div>
              <div className="text-violet-400 font-black font-mono text-base leading-tight">{historyOrders.length} шт</div>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2 text-center">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Выполнено</div>
              <div className="text-emerald-400 font-black font-mono text-base leading-tight">{deliveredOrders.length} шт</div>
            </div>
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2 text-center">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Отменено</div>
              <div className="text-rose-400 font-black font-mono text-base leading-tight">
                {historyOrders.filter((o) => o.status === "cancelled").length} шт
              </div>
            </div>
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-2 text-center">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Выручка</div>
              <div className="text-orange-400 font-black font-mono text-sm leading-tight">
                {formatPrice(totalSum)} сум
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FILTERS */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-52">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔍</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по имени, телефону или товару..."
            className="w-full bg-slate-900/60 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-[13px] text-slate-100 placeholder-slate-600 outline-none focus:border-cyan-500/50 focus:bg-slate-900 transition-all"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-100 focus:outline-none focus:border-cyan-500/50 text-[13px] transition-all cursor-pointer"
        >
          <option value="history">История (выполн. + отменён.)</option>
          <option value="delivered">Выполненные</option>
          <option value="cancelled">Отменённые</option>
        </select>
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
            <table className="w-full text-left border-collapse min-w-250">
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
                      const isSelected = selectedOrderId === order._id;
                      const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.delivered;
                      const total = (order.product?.price || 0) * (order.quantity || 0);
                      const link = mapsLink(order.location);
                      const isDeleting = deletingId === order._id;

                      return (
                        <tr
                          key={order._id}
                          onClick={() => {
                            setSelectedOrderId(order._id);
                            setSelected(order);
                          }}
                          style={{ verticalAlign: "middle" }}
                          className={`cursor-pointer transition-all duration-200 border-l-4 ${
                            isSelected
                              ? "bg-linear-to-r from-cyan-500/15 via-cyan-500/5 to-transparent border-l-cyan-500"
                              : "border-l-transparent hover:bg-linear-to-r hover:from-cyan-500/10 hover:via-cyan-400/5 hover:to-transparent hover:border-l-cyan-500/50"
                          }`}
                        >
                          {/* Клиент */}
                          <td className="p-4 align-middle whitespace-nowrap">
                            <div className={`font-bold ${isSelected ? "text-cyan-400" : "text-white"}`}>
                              {order.botUser?.fullName || "Неизвестно"}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                              {formatPhone(order.botUser?.phone)}
                            </div>
                            {order.botUser?.username && (
                              <div className="text-[11px] text-slate-600 mt-0.5">
                                @{order.botUser.username}
                              </div>
                            )}
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
                            <span className="text-cyan-500 font-bold">
                              {order.quantity} шт
                            </span>
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
                            <div
                              className="flex items-center justify-center gap-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelected(order);
                                }}
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
                из{" "}
                <span className="text-cyan-400 font-bold">{filtered.length}</span>
              </div>

              <div className="flex items-center gap-1.5 order-1 sm:order-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                  className="w-8 h-8 inline-flex items-center justify-center rounded-lg bg-slate-900/40 border border-slate-800 text-slate-400 text-xs font-bold hover:bg-slate-800/60 hover:text-white disabled:opacity-30 transition-all"
                >«</button>
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="h-8 px-3 inline-flex items-center gap-1 rounded-lg bg-slate-900/40 border border-slate-800 text-slate-400 text-xs font-bold hover:bg-slate-800/60 hover:text-white disabled:opacity-30 transition-all"
                >‹ Назад</button>

                <div className="flex items-center gap-1.5 mx-1">
                  {getPageNumbers().map((page, idx) =>
                    typeof page === "number" ? (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 text-xs font-bold rounded-lg transition-all duration-200 ${
                          currentPage === page
                            ? "bg-cyan-500 text-white shadow-lg shadow-cyan-900/40 scale-105"
                            : "bg-slate-900/40 border border-slate-800 text-slate-400 hover:bg-slate-800/60 hover:text-white"
                        }`}
                      >
                        {page}
                      </button>
                    ) : (
                      <span key={`${page}-${idx}`} className="w-8 h-8 inline-flex items-center justify-center text-slate-600 text-xs">⋯</span>
                    )
                  )}
                </div>

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="h-8 px-3 inline-flex items-center gap-1 rounded-lg bg-slate-900/40 border border-slate-800 text-slate-400 text-xs font-bold hover:bg-slate-800/60 hover:text-white disabled:opacity-30 transition-all"
                >Вперед ›</button>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className="w-8 h-8 inline-flex items-center justify-center rounded-lg bg-slate-900/40 border border-slate-800 text-slate-400 text-xs font-bold hover:bg-slate-800/60 hover:text-white disabled:opacity-30 transition-all"
                >»</button>
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