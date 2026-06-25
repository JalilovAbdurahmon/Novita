import { useState, useEffect, useCallback } from "react";
import axios from "../utils/axios.js";

const STATUS_CONFIG = {
  new: {
    label: "Новый",
    dot: "bg-orange-500",
    badge: "bg-orange-500/15 text-orange-400 border border-orange-500/30",
  },
  accepted: {
    label: "Принят",
    dot: "bg-blue-500",
    badge: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  },
};

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "только что";
  if (mins < 60) return `${mins} мин назад`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ч назад`;
  return new Date(dateStr).toLocaleDateString("ru-RU");
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

export default function ClientBotOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await axios.get("/api/bot/orders");
      const all = res.data?.data || [];
      const active = all.filter(
        (o) => o.status === "new" || o.status === "accepted"
      );
      setOrders(active);
      setError(null);
    } catch (err) {
      if (!silent)
        setError(
          err.response?.data?.message || "Ошибка при загрузке заказов"
        );
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => fetchOrders(true), 30000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const updateStatus = async (id, status) => {
    setUpdatingId(id);
    try {
      await axios.put(`/api/bot/orders/${id}/status`, { status });
      // Если статус "delivered" или "cancelled" — убираем из активных
      setOrders((prev) =>
        status === "delivered" || status === "cancelled"
          ? prev.filter((o) => o._id !== id)
          : prev.map((o) => (o._id === id ? { ...o, status } : o))
      );
    } catch (err) {
      alert(
        err.response?.data?.message || "Ошибка при обновлении статуса"
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const completeAll = async () => {
    if (!orders.length) return;
    if (
      !window.confirm(
        `Завершить все ${orders.length} заказов?`
      )
    )
      return;
    setBulkLoading(true);
    try {
      await Promise.all(
        orders.map((o) =>
          axios.put(`/api/bot/orders/${o._id}/status`, {
            status: "delivered",
          })
        )
      );
      setOrders([]);
    } catch {
      alert("Ошибка при завершении некоторых заказов");
      fetchOrders(true);
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Заказы клиентов
            </h1>
            <p className="text-neutral-500 text-sm mt-1">
              Активные заказы из Telegram бота
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-sm text-neutral-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
              </span>
              {orders.length} активных
            </span>
            {orders.length > 0 && (
              <button
                onClick={completeAll}
                disabled={bulkLoading}
                className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
              >
                {bulkLoading ? "Завершаем..." : "Завершить все"}
              </button>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Loading skeletons */}
        {loading ? (
          <div className="grid gap-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-36 rounded-xl bg-neutral-900 border border-neutral-800 animate-pulse"
              />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-800 py-24 text-center">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-neutral-400 font-medium">Нет активных заказов</p>
            <p className="text-neutral-600 text-sm mt-1">
              Новые заказы появятся здесь автоматически
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {orders.map((order) => {
              const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.new;
              const link = mapsLink(order.location);
              const isUpdating = updatingId === order._id;
              const total =
                (order.product?.price || 0) * (order.quantity || 0);

              return (
                <div
                  key={order._id}
                  className="rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-colors overflow-hidden"
                >
                  {/* Status bar top */}
                  <div
                    className={`h-0.5 w-full ${
                      order.status === "new" ? "bg-orange-500" : "bg-blue-500"
                    }`}
                  />

                  <div className="p-4 md:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      {/* Left info */}
                      <div className="flex-1 min-w-0">
                        {/* Status + time */}
                        <div className="flex items-center gap-2 mb-3">
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${status.badge}`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${status.dot}`}
                            />
                            {status.label}
                          </span>
                          <span className="text-neutral-500 text-xs">
                            {timeAgo(order.createdAt)}
                          </span>
                        </div>

                        {/* Product */}
                        <h3 className="text-white font-semibold text-base leading-tight">
                          {order.product?.name || "Неизвестный товар"}
                          <span className="text-neutral-400 font-normal">
                            {" "}
                            × {order.quantity}
                          </span>
                        </h3>

                        {/* Meta */}
                        <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-neutral-400">
                          <span>
                            👤{" "}
                            <span className="text-neutral-300">
                              {order.botUser?.fullName || "Неизвестно"}
                            </span>
                          </span>
                          <span>
                            📞{" "}
                            <span className="text-neutral-300">
                              {formatPhone(order.botUser?.phone)}
                            </span>
                          </span>
                          {total > 0 && (
                            <span>
                              💵{" "}
                              <span className="text-orange-400 font-medium">
                                {total.toLocaleString("ru-RU")} сум
                              </span>
                            </span>
                          )}
                        </div>

                        {/* Note */}
                        {order.note && (
                          <p className="mt-2 text-sm text-neutral-500 italic">
                            "{order.note}"
                          </p>
                        )}

                        {/* Location */}
                        <div className="mt-3">
                          {link ? (
                            <a
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                            >
                              📍 Открыть на карте
                            </a>
                          ) : (
                            <span className="text-sm text-neutral-600">
                              📍 Локация ещё не получена
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: action buttons */}
                      <div className="flex flex-col gap-2 w-full sm:w-auto min-w-35">
                        {order.status === "new" && (
                          <button
                            onClick={() =>
                              updateStatus(order._id, "accepted")
                            }
                            disabled={isUpdating}
                            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium transition-colors whitespace-nowrap"
                          >
                            ✅ Принять
                          </button>
                        )}
                        <button
                          onClick={() =>
                            updateStatus(order._id, "delivered")
                          }
                          disabled={isUpdating}
                          className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-medium transition-colors whitespace-nowrap"
                        >
                          {isUpdating ? "..." : "🏁 Выполнено"}
                        </button>
                        <button
                          onClick={() =>
                            updateStatus(order._id, "cancelled")
                          }
                          disabled={isUpdating}
                          className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-red-900/40 border border-neutral-700 hover:border-red-700/50 text-neutral-400 hover:text-red-400 disabled:opacity-50 text-sm font-medium transition-colors whitespace-nowrap"
                        >
                          ✕ Отмена
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}