import { useState, useEffect, useMemo } from "react";
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
    badge: "bg-red-500/15 text-red-400 border border-red-500/30",
  },
};

function formatDate(dateStr) {
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
  return phone
    .replace(/^\+?998/, "+998 ")
    .replace(/(\d{2})(\d{3})(\d{2})(\d{2})$/, "$1 $2-$3-$4");
}

function mapsLink(location) {
  if (!location?.lat || !location?.lng) return null;
  return `https://www.google.com/maps?q=${location.lat},${location.lng}`;
}

export default function ClientOrderHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("history");
  const [selected, setSelected] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const deleteOrder = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Удалить этот заказ из истории?")) return;
    setDeletingId(id);
    try {
      await axios.delete(`/api/bot/orders/${id}`);
      setOrders((prev) => prev.filter((o) => o._id !== id));
      if (selected?._id === id) setSelected(null);
    } catch (err) {
      alert(err.response?.data?.message || "Ошибка при удалении");
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const res = await axios.get("/api/bot/orders");
        setOrders(res.data?.data || []);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.message || "Ошибка при загрузке истории");
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

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
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [orders, search, statusFilter]);

  const stats = useMemo(() => {
    const historyOrders = orders.filter(
      (o) => o.status === "delivered" || o.status === "cancelled"
    );
    const delivered = historyOrders.filter((o) => o.status === "delivered");
    const totalSum = delivered.reduce(
      (sum, o) => sum + (o.product?.price || 0) * (o.quantity || 0),
      0
    );
    return {
      total: historyOrders.length,
      delivered: delivered.length,
      cancelled: historyOrders.filter((o) => o.status === "cancelled").length,
      totalSum,
    };
  }, [orders]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            История клиентов
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            Архив завершённых и отменённых заказов из Telegram бота
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="rounded-xl bg-neutral-900 border border-neutral-800 p-4">
            <p className="text-neutral-500 text-xs uppercase tracking-wide">Всего в архиве</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
          </div>
          <div className="rounded-xl bg-neutral-900 border border-emerald-800/40 p-4">
            <p className="text-neutral-500 text-xs uppercase tracking-wide">Выполнено</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{stats.delivered}</p>
          </div>
          <div className="rounded-xl bg-neutral-900 border border-red-800/40 p-4">
            <p className="text-neutral-500 text-xs uppercase tracking-wide">Отменено</p>
            <p className="text-2xl font-bold text-red-400 mt-1">{stats.cancelled}</p>
          </div>
          <div className="rounded-xl bg-neutral-900 border border-orange-800/40 p-4">
            <p className="text-neutral-500 text-xs uppercase tracking-wide">Выручка</p>
            <p className="text-xl font-bold text-orange-400 mt-1">
              {stats.totalSum > 0
                ? `${stats.totalSum.toLocaleString("ru-RU")} сум`
                : "—"}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-5">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по имени, телефону или товару..."
            className="flex-1 min-w-52 px-4 py-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40 text-sm transition-colors"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40 text-sm transition-colors"
          >
            <option value="history">История (выполн. + отменён.)</option>
            <option value="all">Все заказы</option>
            <option value="new">Новые</option>
            <option value="accepted">Принятые</option>
            <option value="delivered">Выполненные</option>
            <option value="cancelled">Отменённые</option>
          </select>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="grid gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-14 rounded-lg bg-neutral-900 border border-neutral-800 animate-pulse"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-800 py-20 text-center">
            <p className="text-3xl mb-3">🗂️</p>
            <p className="text-neutral-400">Ничего не найдено</p>
            <p className="text-neutral-600 text-sm mt-1">
              Попробуйте изменить фильтр или поисковый запрос
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-neutral-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-neutral-900 border-b border-neutral-800 text-neutral-500 text-xs uppercase tracking-wider">
                    <th className="text-left font-medium px-4 py-3">Клиент</th>
                    <th className="text-left font-medium px-4 py-3">Товар</th>
                    <th className="text-left font-medium px-4 py-3">Кол-во</th>
                    <th className="text-left font-medium px-4 py-3">Сумма</th>
                    <th className="text-left font-medium px-4 py-3">Статус</th>
                    <th className="text-left font-medium px-4 py-3">Дата</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {filtered.map((order) => {
                    const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.new;
                    const sum = (order.product?.price || 0) * (order.quantity || 0);
                    const isDeleting = deletingId === order._id;
                    return (
                      <tr
                        key={order._id}
                        onClick={() => setSelected(order)}
                        className="bg-neutral-950 hover:bg-neutral-900 cursor-pointer transition-colors group"
                      >
                        <td className="px-4 py-3">
                          <p className="text-neutral-100 font-medium group-hover:text-white transition-colors">
                            {order.botUser?.fullName || "Неизвестно"}
                          </p>
                          <p className="text-neutral-500 text-xs">
                            {formatPhone(order.botUser?.phone)}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-neutral-300">
                          {order.product?.name || "—"}
                        </td>
                        <td className="px-4 py-3 text-neutral-300">
                          {order.quantity}
                        </td>
                        <td className="px-4 py-3">
                          {sum > 0 ? (
                            <span className="text-orange-400 font-medium">
                              {sum.toLocaleString("ru-RU")} сум
                            </span>
                          ) : (
                            <span className="text-neutral-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ${status.badge}`}
                          >
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-neutral-500 whitespace-nowrap text-xs">
                          {formatDate(order.createdAt)}
                        </td>
                        {/* Delete button */}
                        <td className="px-4 py-3">
                          <button
                            onClick={(e) => deleteOrder(e, order._id)}
                            disabled={isDeleting}
                            className="p-1.5 rounded-lg text-neutral-600 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-50 transition-colors"
                            title="Удалить"
                          >
                            {isDeleting ? (
                              <span className="text-xs">...</span>
                            ) : (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                <path d="M10 11v6" />
                                <path d="M14 11v6" />
                                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                              </svg>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="text-lg font-semibold text-white">Детали заказа</h3>
                <p className="text-neutral-500 text-xs mt-0.5">
                  {formatDate(selected.createdAt)}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-neutral-500 hover:text-neutral-300 transition-colors text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <div className="mb-5">
              <span
                className={`inline-flex items-center text-xs font-medium px-3 py-1.5 rounded-full ${
                  (STATUS_CONFIG[selected.status] || STATUS_CONFIG.new).badge
                }`}
              >
                {(STATUS_CONFIG[selected.status] || STATUS_CONFIG.new).label}
              </span>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-neutral-800">
                <span className="text-neutral-500">Клиент</span>
                <span className="text-neutral-100 font-medium">
                  {selected.botUser?.fullName || "Неизвестно"}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-neutral-800">
                <span className="text-neutral-500">Телефон</span>
                <span className="text-neutral-100">
                  {formatPhone(selected.botUser?.phone)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-neutral-800">
                <span className="text-neutral-500">Username</span>
                <span className="text-neutral-300">
                  {selected.botUser?.username ? `@${selected.botUser.username}` : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-neutral-800">
                <span className="text-neutral-500">Товар</span>
                <span className="text-neutral-100">{selected.product?.name || "—"}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-neutral-800">
                <span className="text-neutral-500">Количество</span>
                <span className="text-neutral-100">{selected.quantity}</span>
              </div>
              {selected.product?.price > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-neutral-800">
                  <span className="text-neutral-500">Сумма</span>
                  <span className="text-orange-400 font-semibold">
                    {(selected.product.price * selected.quantity).toLocaleString("ru-RU")} сум
                  </span>
                </div>
              )}
              {selected.note && (
                <div className="py-2 border-b border-neutral-800">
                  <span className="text-neutral-500 block mb-1">Примечание</span>
                  <span className="text-neutral-300 italic">"{selected.note}"</span>
                </div>
              )}
            </div>

            {mapsLink(selected.location) && (
              <a
                href={mapsLink(selected.location)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-600/40 text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors"
              >
                📍 Открыть на карте
              </a>
            )}

            <button
              onClick={() => setSelected(null)}
              className="mt-3 w-full px-4 py-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm font-medium transition-colors"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
}