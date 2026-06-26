import { useState, useEffect, useCallback } from "react";
import axios from "../utils/axios.js";
import { useClientOrderNotifications } from "../utils/useClientOrderNotifications";

const STATUS_CONFIG = {
  new: {
    label: "Новый",
    dot: "bg-orange-500",
    badge: "bg-orange-500/15 text-orange-400 border border-orange-500/30",
    bar: "bg-orange-500",
  },
  accepted: {
    label: "Принят",
    dot: "bg-blue-500",
    badge: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
    bar: "bg-blue-500",
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

export default function ClientOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  const { markAllSeen } = useClientOrderNotifications();

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await axios.get("/api/bot/orders");
      const raw = res.data?.data ?? res.data;
      const all = Array.isArray(raw) ? raw : [];
      const active = all.filter(
        (o) => o.status === "new" || o.status === "accepted"
      );
      setOrders(active);
      setError(null);
      if (active.length > 0 && !selectedOrderId) {
        setSelectedOrderId(active[0]._id);
      }
    } catch (err) {
      if (!silent)
        setError(err.response?.data?.message || "Ошибка при загрузке заказов");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [selectedOrderId]);

  useEffect(() => {
    fetchOrders();
    markAllSeen();
    const interval = setInterval(() => fetchOrders(true), 5000);
    return () => clearInterval(interval);
  }, [fetchOrders, markAllSeen]);

  const updateStatus = async (id, status) => {
    setUpdatingId(id);
    try {
      await axios.put(`/api/bot/orders/${id}/status`, { status });
      if (status === "delivered" || status === "cancelled") {
        setOrders((prev) => prev.filter((o) => o._id !== id));
        if (selectedOrderId === id) setSelectedOrderId(null);
      } else {
        setOrders((prev) =>
          prev.map((o) => (o._id === id ? { ...o, status } : o))
        );
      }
    } catch (err) {
      alert(err.response?.data?.message || "Ошибка при обновлении статуса");
    } finally {
      setUpdatingId(null);
    }
  };

  const completeAll = async () => {
    if (!orders.length) return;
    if (!window.confirm(`Завершить все ${orders.length} заказов?`)) return;
    setBulkLoading(true);
    try {
      await Promise.all(
        orders.map((o) =>
          axios.put(`/api/bot/orders/${o._id}/status`, { status: "delivered" })
        )
      );
      setOrders([]);
      setSelectedOrderId(null);
    } catch {
      alert("Ошибка при завершении некоторых заказов");
      fetchOrders(true);
    } finally {
      setBulkLoading(false);
    }
  };

  const totalSum = orders.reduce(
    (sum, o) => sum + (o.product?.price || 0) * (o.quantity || 0),
    0
  );
  const newCount = orders.filter((o) => o.status === "new").length;
  const acceptedCount = orders.filter((o) => o.status === "accepted").length;

  return (
    <div className="max-w-6xl mx-auto p-2 flex flex-col gap-6 select-none">
      {/* HEADER */}
      <div className="backdrop-blur-sm p-1 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-black bg-linear-to-r from-orange-500 via-amber-400 to-slate-800 bg-clip-text text-transparent tracking-wide drop-shadow-[0_2px_8px_rgba(249,115,22,0.15)]">
            Заказы клиентов 📱
          </h1>
          <p className="text-sm text-slate-500 mt-1.5 font-medium">
            Активные заказы из Telegram бота.{" "}
            <span className="text-orange-400 font-bold">
              Кликните на строку
            </span>
            , чтобы выделить заказ.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Stats badges */}
          {orders.length > 0 && (
            <>
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl px-3 py-2 text-center">
                <div className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Новых</div>
                <div className="text-orange-400 font-black font-mono text-base leading-tight">{newCount}</div>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-3 py-2 text-center">
                <div className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Принято</div>
                <div className="text-blue-400 font-black font-mono text-base leading-tight">{acceptedCount}</div>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2 text-center">
                <div className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Сумма</div>
                <div className="text-emerald-400 font-black font-mono text-sm leading-tight">{formatPrice(totalSum)} сум</div>
              </div>
            </>
          )}

          {orders.length > 0 && (
            <button
              onClick={completeAll}
              disabled={bulkLoading}
              className="px-4 py-3.5 rounded-xl text-xs font-bold bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-900/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 uppercase tracking-wider"
            >
              {bulkLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Завершаем...
                </>
              ) : (
                <>🏁 Завершить все ({orders.length})</>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-rose-400 text-sm font-medium">
          ⚠️ {error}
        </div>
      )}

      {/* TABLE */}
      <div className="bg-[#0f111a] border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-200">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/40 text-slate-400 text-xs font-bold uppercase tracking-wider">
              <th className="p-4">Клиент 👤</th>
              <th className="p-4">Товар / Кол-во 📦</th>
              <th className="p-4">Сумма 💵</th>
              <th className="p-4">Статус</th>
              <th className="p-4">Время ⏱️</th>
              <th className="p-4">Локация 📍</th>
              <th className="p-4 text-center">Действие</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50 text-[14px]">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={7} className="p-4">
                    <div className="h-10 rounded-xl bg-slate-800/40 animate-pulse" />
                  </td>
                </tr>
              ))
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-20 text-center text-slate-500">
                  <div className="text-4xl mb-3">📭</div>
                  <div className="font-medium">Нет активных заказов</div>
                  <div className="text-xs mt-1 text-slate-600">
                    Новые заказы появятся здесь автоматически
                  </div>
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.new;
                const isSelected = selectedOrderId === order._id;
                const isUpdating = updatingId === order._id;
                const total = (order.product?.price || 0) * (order.quantity || 0);
                const link = mapsLink(order.location);

                return (
                  <tr
                    key={order._id}
                    onClick={() => setSelectedOrderId(order._id)}
                    style={{ verticalAlign: "middle" }}
                    className={`cursor-pointer transition-all duration-200 border-l-4 ${
                      isSelected
                        ? "bg-linear-to-r from-orange-500/15 via-orange-500/5 to-transparent border-l-orange-500"
                        : "border-l-transparent hover:bg-linear-to-r hover:from-orange-500/10 hover:via-orange-400/5 hover:to-transparent hover:border-l-orange-500/50"
                    }`}
                  >
                    {/* Клиент */}
                    <td className="p-4 align-middle">
                      <div className="font-semibold text-white">
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
                    <td className="p-4 align-middle text-slate-200 font-medium whitespace-nowrap">
                      {order.product?.name || "—"}{" "}
                      <span className="text-cyan-500 font-bold">
                        ({order.quantity} шт)
                      </span>
                      {order.note && (
                        <div className="text-[11px] text-slate-500 italic mt-0.5">
                          "{order.note}"
                        </div>
                      )}
                    </td>

                    {/* Сумма */}
                    <td className="p-4 align-middle whitespace-nowrap">
                      {total > 0 ? (
                        <div className="text-orange-400 font-bold font-mono text-[15px]">
                          {formatPrice(total)} сум
                        </div>
                      ) : (
                        <span className="text-slate-600 text-xs">—</span>
                      )}
                    </td>

                    {/* Статус */}
                    <td className="p-4 align-middle whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${status.badge}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                        {status.label}
                      </span>
                    </td>

                    {/* Время */}
                    <td className="p-4 align-middle text-slate-500 text-xs font-mono whitespace-nowrap">
                      {timeAgo(order.createdAt)}
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
                        {order.status === "new" ? (
                          <>
                            <button
                              onClick={() => updateStatus(order._id, "accepted")}
                              disabled={isUpdating}
                              className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500 text-blue-400 hover:text-white rounded-lg text-xs font-bold transition-all disabled:opacity-40"
                            >
                              {isUpdating ? (
                                <span className="w-3 h-3 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin inline-block" />
                              ) : (
                                "✅ Принять"
                              )}
                            </button>
                            <button
                              onClick={() => updateStatus(order._id, "cancelled")}
                              disabled={isUpdating}
                              className="w-8 h-8 inline-flex items-center justify-center bg-rose-600/10 border border-rose-500/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg text-xs transition-all disabled:opacity-40"
                            >
                              ✕
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => updateStatus(order._id, "delivered")}
                              disabled={isUpdating}
                              className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500 text-emerald-400 hover:text-black rounded-lg text-xs font-bold transition-all disabled:opacity-40"
                            >
                              {isUpdating ? (
                                <span className="w-3 h-3 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin inline-block" />
                              ) : (
                                "🏁 Выполнено"
                              )}
                            </button>
                            <button
                              onClick={() => updateStatus(order._id, "cancelled")}
                              disabled={isUpdating}
                              className="w-8 h-8 inline-flex items-center justify-center bg-rose-600/10 border border-rose-500/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg text-xs transition-all disabled:opacity-40"
                            >
                              ✕
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {orders.length > 0 && (
            <tfoot>
              <tr className="border-t border-slate-700/60 bg-slate-900/30">
                <td
                  colSpan={2}
                  className="p-4 text-xs text-slate-500 font-bold uppercase tracking-wider"
                >
                  Всего заказов: {orders.length}
                </td>
                <td className="p-4">
                  <div className="text-orange-400 font-black font-mono">
                    Итого: {formatPrice(totalSum)} сум
                  </div>
                </td>
                <td colSpan={4} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}