import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import axios from "../utils/axios.js";
import { useClientOrderNotifications } from "../utils/useClientOrderNotifications";

const STATUS_CONFIG = {
  new: {
    label: "Ожидание",
    dot: "bg-orange-500",
    badge: "bg-orange-500/15 text-orange-400 border border-orange-500/30",
  },
  accepted: {
    label: "Заказ принят",
    dot: "bg-blue-500",
    badge: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  },
};

function formatDateTime(dateStr) {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${day}.${month}.${year}, ${hours}:${mins}`;
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

const TOAST_STYLE = `
  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-16px) scale(0.95); }
    to   { opacity: 1; transform: translateY(0)     scale(1);    }
  }
  @keyframes fadeOut {
    from { opacity: 1; transform: scale(1);    }
    to   { opacity: 0; transform: scale(0.95); }
  }
`;

// ─── Иконки ────────────────────────────────────────────────────────────────
function CheckIcon({ className = "w-4 h-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function FlagIcon({ className = "w-4 h-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  );
}

function XIcon({ className = "w-4 h-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function EyeIcon({ className = "w-4 h-4" }) {
  return (
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
}

function CircleXIcon({ className = "w-5 h-5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
const DetailModal = ({ order, onClose }) => {
  if (!order) return null;
  const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.new;
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
        style={{
          animation: "modalUp 0.3s cubic-bezier(0.34,1.3,0.64,1) forwards",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top gradient line */}
        <div className="h-0.5 w-full bg-linear-to-r from-orange-500 via-amber-400 to-pink-500" />

        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800/80 flex items-start justify-between gap-4 bg-slate-900/30">
          <div>
            <h3 className="text-base font-black text-white tracking-wide">
              Детали заказа
            </h3>
            <p className="text-slate-500 text-xs mt-0.5 font-mono">
              {formatDateTime(order.createdAt)}
            </p>
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
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${status.badge}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </span>

          {/* Info rows */}
          <div className="flex flex-col divide-y divide-slate-800/60 text-sm">
            {[
              {
                label: "Клиент",
                value: order.botUser?.fullName || "Неизвестно",
              },
              {
                label: "Телефон",
                value: formatPhone(order.botUser?.phone),
                mono: true,
              },
              {
                label: "Username",
                value: order.botUser?.username
                  ? `@${order.botUser.username}`
                  : "—",
              },
              { label: "Товар", value: order.product?.name || "—" },
              { label: "Количество", value: `${order.quantity} шт` },
              ...(unitPrice > 0
                ? [
                    {
                      label: "Цена за шт",
                      value: `${formatPrice(unitPrice)} сум`,
                      highlight: "violet",
                    },
                  ]
                : []),
              ...(total > 0
                ? [
                    {
                      label: "Итого",
                      value: `${formatPrice(total)} сум`,
                      highlight: "orange",
                    },
                  ]
                : []),
              ...(order.note
                ? [
                    {
                      label: "Примечание",
                      value: `"${order.note}"`,
                      italic: true,
                    },
                  ]
                : []),
            ].map(({ label, value, mono, highlight, italic }) => (
              <div
                key={label}
                className="flex items-center justify-between py-3 gap-3"
              >
                <span className="text-slate-500 text-[11px] uppercase tracking-wide font-bold shrink-0">
                  {label}
                </span>
                <span
                  className={`text-right font-semibold text-[13px] truncate
                    ${highlight === "orange" ? "text-orange-400" : ""}
                    ${highlight === "violet" ? "text-violet-400" : ""}
                    ${!highlight ? "text-slate-200" : ""}
                    ${mono ? "font-mono" : ""}
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
              <span className="text-orange-400 font-black text-sm">
                {formatPrice(total)} сум
              </span>
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

// ─── Toast отмены заказа ─────────────────────────────────────────────────────
function confirmCancelToast(message = "Отменить этот заказ?") {
  return new Promise((resolve) => {
    toast.custom(
      (t) => (
        <div
          style={{
            animation: t.visible
              ? "slideDown 0.35s cubic-bezier(0.34,1.56,0.64,1)"
              : "fadeOut 0.2s ease forwards",
          }}
          className="max-w-sm w-full bg-[#13151e] border border-slate-700/80 shadow-2xl shadow-black/60 rounded-2xl overflow-hidden"
        >
          <style>{TOAST_STYLE}</style>
          <div className="h-0.5 w-full bg-linear-to-r from-rose-600 via-rose-400 to-transparent" />
          <div className="p-5 flex flex-col gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center shrink-0">
                <CircleXIcon className="w-5 h-5 text-rose-400" />
              </div>
              <div className="pt-0.5">
                <p className="text-sm font-bold text-slate-100 leading-snug">
                  {message}
                </p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Клиент получит уведомление об отмене заказа.
                </p>
              </div>
            </div>
            <div className="h-px bg-slate-800" />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  resolve(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700/80 text-slate-400 hover:text-slate-200 border border-slate-700 transition-all duration-150"
              >
                Назад
              </button>
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  resolve(true);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-linear-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white shadow-lg shadow-rose-900/40 transition-all duration-150 flex items-center gap-1.5"
              >
                <XIcon className="w-3.5 h-3.5" />
                Отменить заказ
              </button>
            </div>
          </div>
        </div>
      ),
      { duration: 15000, position: "top-center" }
    );
  });
}

// ─── Toast завершения всех заказов ───────────────────────────────────────────
function confirmCompleteAllToast(count) {
  return new Promise((resolve) => {
    toast.custom(
      (t) => (
        <div
          style={{
            animation: t.visible
              ? "slideDown 0.35s cubic-bezier(0.34,1.56,0.64,1)"
              : "fadeOut 0.2s ease forwards",
          }}
          className="max-w-sm w-full bg-[#13151e] border border-slate-700/80 shadow-2xl shadow-black/60 rounded-2xl overflow-hidden"
        >
          <style>{TOAST_STYLE}</style>
          <div className="h-0.5 w-full bg-linear-to-r from-emerald-500 via-teal-400 to-transparent" />
          <div className="p-5 flex flex-col gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center shrink-0">
                <FlagIcon className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="pt-0.5">
                <p className="text-sm font-bold text-slate-100 leading-snug">
                  Завершить все {count} заказов?
                </p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Все активные заказы будут отмечены как выполненные.
                </p>
              </div>
            </div>
            <div className="h-px bg-slate-800" />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  resolve(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700/80 text-slate-400 hover:text-slate-200 border border-slate-700 transition-all duration-150"
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  resolve(true);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-linear-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-lg shadow-emerald-900/40 transition-all duration-150 flex items-center gap-1.5"
              >
                <FlagIcon className="w-3.5 h-3.5" />
                Завершить все
              </button>
            </div>
          </div>
        </div>
      ),
      { duration: 15000, position: "top-center" }
    );
  });
}

// ─── Главный компонент ────────────────────────────────────────────────────────
export default function ClientOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [modalOrder, setModalOrder] = useState(null);

  const { markAllSeen } = useClientOrderNotifications();

  const fetchOrders = useCallback(
    async (silent = false) => {
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
          setError(
            err.response?.data?.message || "Ошибка при загрузке заказов"
          );
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [selectedOrderId]
  );

  useEffect(() => {
    fetchOrders();
    markAllSeen();
    const interval = setInterval(() => fetchOrders(true), 5000);
    return () => clearInterval(interval);
  }, [fetchOrders, markAllSeen]);

  const updateStatus = async (id, status, options = {}) => {
    const { skipConfirm } = options;

    if (status === "cancelled" && !skipConfirm) {
      const confirmed = await confirmCancelToast("Отменить этот заказ?");
      if (!confirmed) return;
    }

    setUpdatingId(id);
    try {
      await axios.put(`/api/bot/orders/${id}/status`, { status });
      if (status === "delivered" || status === "cancelled") {
        setOrders((prev) => prev.filter((o) => o._id !== id));
        if (selectedOrderId === id) setSelectedOrderId(null);
        if (modalOrder?._id === id) setModalOrder(null);
      } else {
        setOrders((prev) =>
          prev.map((o) => (o._id === id ? { ...o, status } : o))
        );
        // update modal order if open
        if (modalOrder?._id === id) {
          setModalOrder((prev) => ({ ...prev, status }));
        }
      }

      if (status === "accepted") {
        toast.success("Заказ принят в работу", { position: "top-center" });
      } else if (status === "delivered") {
        toast.success("Заказ отмечен как выполненный", {
          position: "top-center",
        });
      } else if (status === "cancelled") {
        toast.success("Заказ отменён", { position: "top-center" });
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Ошибка при обновлении статуса",
        { position: "top-center" }
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const completeAll = async () => {
    if (!orders.length) return;
    const confirmed = await confirmCompleteAllToast(orders.length);
    if (!confirmed) return;

    setBulkLoading(true);
    try {
      await Promise.all(
        orders.map((o) =>
          axios.put(`/api/bot/orders/${o._id}/status`, { status: "delivered" })
        )
      );
      const count = orders.length;
      setOrders([]);
      setSelectedOrderId(null);
      setModalOrder(null);
      toast.success(`Все ${count} заказов завершены`, {
        position: "top-center",
      });
    } catch {
      toast.error("Ошибка при завершении некоторых заказов", {
        position: "top-center",
      });
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
          {orders.length > 0 && (
            <>
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl px-3 py-2 text-center">
                <div className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">
                  Ожидание
                </div>
                <div className="text-orange-400 font-black font-mono text-base leading-tight">
                  {newCount}
                </div>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-3 py-2 text-center">
                <div className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">
                  Принято
                </div>
                <div className="text-blue-400 font-black font-mono text-base leading-tight">
                  {acceptedCount}
                </div>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2 text-center">
                <div className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">
                  Сумма
                </div>
                <div className="text-emerald-400 font-black font-mono text-sm leading-tight">
                  {formatPrice(totalSum)} сум
                </div>
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
                <>
                  <FlagIcon className="w-4 h-4" />
                  Завершить все ({orders.length})
                </>
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
        <table className="w-full text-left border-collapse min-w-225">
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
                const total =
                  (order.product?.price || 0) * (order.quantity || 0);
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
                    {/* Клиент — без username */}
                    <td className="p-4 align-middle">
                      <div
                        className={`font-semibold ${
                          isSelected ? "text-orange-400" : "text-white"
                        }`}
                      >
                        {order.botUser?.fullName || "Неизвестно"}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {formatPhone(order.botUser?.phone)}
                      </div>
                    </td>

                    {/* Товар */}
                    <td className="p-4 align-middle text-slate-200 font-medium whitespace-nowrap">
                      {order.product?.name || "—"}{" "}
                      <span className="text-cyan-500 font-bold">
                        ({order.quantity} шт)
                      </span>
                      {order.note && (
                        <div className="text-[11px] text-slate-500 italic mt-0.5">
                          &quot;{order.note}&quot;
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
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${status.dot}`}
                        />
                        {status.label}
                      </span>
                    </td>

                    {/* Время — 1 qatorda */}
                    <td className="p-4 align-middle whitespace-nowrap">
                      <span className="text-slate-400 text-xs font-mono">
                        {formatDateTime(order.createdAt)}
                      </span>
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
                        {/* Eye button — detail modal */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setModalOrder(order);
                          }}
                          title="Детали"
                          className="w-8 h-8 inline-flex items-center justify-center bg-slate-700/40 border border-slate-600/30 hover:bg-slate-600 text-slate-400 hover:text-white rounded-lg transition-all"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>

                        {order.status === "new" ? (
                          <>
                            <button
                              onClick={() =>
                                updateStatus(order._id, "accepted")
                              }
                              disabled={isUpdating}
                              className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500 text-blue-400 hover:text-white rounded-lg text-xs font-bold transition-all disabled:opacity-40 flex items-center gap-1.5"
                            >
                              {isUpdating ? (
                                <span className="w-3 h-3 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin inline-block" />
                              ) : (
                                <>
                                  <CheckIcon className="w-3.5 h-3.5" />
                                  Принять
                                </>
                              )}
                            </button>
                            <button
                              onClick={() =>
                                updateStatus(order._id, "cancelled")
                              }
                              disabled={isUpdating}
                              title="Отменить"
                              className="w-8 h-8 inline-flex items-center justify-center bg-rose-600/10 border border-rose-500/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg transition-all disabled:opacity-40"
                            >
                              <XIcon className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() =>
                                updateStatus(order._id, "delivered")
                              }
                              disabled={isUpdating}
                              className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500 text-emerald-400 hover:text-black rounded-lg text-xs font-bold transition-all disabled:opacity-40 flex items-center gap-1.5"
                            >
                              {isUpdating ? (
                                <span className="w-3 h-3 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin inline-block" />
                              ) : (
                                <>
                                  <FlagIcon className="w-3.5 h-3.5" />
                                  Завершить
                                </>
                              )}
                            </button>
                            <button
                              onClick={() =>
                                updateStatus(order._id, "cancelled")
                              }
                              disabled={isUpdating}
                              title="Отменить"
                              className="w-8 h-8 inline-flex items-center justify-center bg-rose-600/10 border border-rose-500/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg transition-all disabled:opacity-40"
                            >
                              <XIcon className="w-3.5 h-3.5" />
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
                <td colSpan={7} className="px-4 py-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Zakazlar soni */}
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider shrink-0 mr-2">
                      Всего: {orders.length} заказ
                    </span>

                    <div className="h-4 w-px bg-slate-700 shrink-0" />

                    {/* Har bir mahsulot bo'yicha pill */}
                    <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                      {Object.values(
                        orders.reduce((acc, o) => {
                          const name = o.product?.name || "—";
                          const price = o.product?.price || 0;
                          const qty = o.quantity || 0;
                          if (!acc[name])
                            acc[name] = { name, qty: 0, total: 0 };
                          acc[name].qty += qty;
                          acc[name].total += price * qty;
                          return acc;
                        }, {})
                      ).map(({ name, qty, total }) => (
                        <div
                          key={name}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50 text-[11px] font-semibold whitespace-nowrap"
                        >
                          <span className="text-slate-300">{name}</span>
                          <span className="text-cyan-400 font-bold">
                            ×{qty}
                          </span>
                          {total > 0 && (
                            <>
                              <span className="text-slate-600">·</span>
                              <span className="text-orange-400 font-bold font-mono">
                                {formatPrice(total)} сум
                              </span>
                            </>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* O'ng tomonda grand total */}
                    <div className="shrink-0 ml-auto flex items-center gap-2 pl-3 border-l border-slate-700">
                      <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                        Итого:
                      </span>
                      <span className="text-orange-400 font-black font-mono text-sm">
                        {formatPrice(totalSum)} сум
                      </span>
                    </div>
                  </div>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* DETAIL MODAL */}
      <DetailModal order={modalOrder} onClose={() => setModalOrder(null)} />
    </div>
  );
}
