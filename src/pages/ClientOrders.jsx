import { useState, useEffect, useMemo } from "react";
import axios from "../utils/axios.js";
import { useClientOrderNotifications } from "../utils/useClientOrderNotifications";

const STATUS_CONFIG = {
  new: {
    label: "Новый",
    badge: "bg-orange-500/15 text-orange-400 border border-orange-500/30",
  },
  accepted: {
    label: "Принят",
    badge: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  },
  completed: {
    label: "Выполнен",
    badge: "bg-green-500/15 text-green-400 border border-green-500/30",
  },
  cancelled: {
    label: "Отменён",
    badge: "bg-red-500/15 text-red-400 border border-red-500/30",
  },
};

const ClientOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  // Notification hook — sahifaga kirganida bell o'chadi
  const { markAllSeen } = useClientOrderNotifications();

  const fetchOrders = async () => {
    try {
      setOrders(Array.isArray(res.data) ? res.data : res.data.orders || []);
    } catch (err) {
      console.error("Zakazlarni olishda xato:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // Sahifaga kirganida barcha ko'rilmagan new zakazlarni ko'rilgan deb belgilaymiz
    markAllSeen();

    const interval = setInterval(fetchOrders, 3000);
    return () => clearInterval(interval);
  }, [markAllSeen]);

  const handleAccept = async (id) => {
    try {
      await axios.patch(`/api/bot/orders/${id}`, { status: "accepted" });
      fetchOrders();
    } catch (err) {
      console.error("Qabul qilishda xato:", err);
    }
  };

  const handleComplete = async (id) => {
    try {
      await axios.patch(`/api/bot/orders/${id}`, { status: "completed" });
      fetchOrders();
    } catch (err) {
      console.error("Yakunlashda xato:", err);
    }
  };

  const handleCancel = async (id) => {
    try {
      await axios.patch(`/api/bot/orders/${id}`, { status: "cancelled" });
      fetchOrders();
    } catch (err) {
      console.error("Bekor qilishda xato:", err);
    }
  };

  const filtered = useMemo(() => {
    if (filter === "all") return orders;
    return orders.filter((o) => o.status === filter);
  }, [orders, filter]);

  if (loading)
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        Загрузка...
      </div>
    );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Заказы клиентов</h1>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {["all", "new", "accepted", "completed", "cancelled"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-all ${
              filter === s
                ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/40"
                : "bg-slate-800/50 text-slate-400 border-slate-700/50 hover:border-slate-600"
            }`}
          >
            {s === "all" ? "Все" : STATUS_CONFIG[s]?.label ?? s}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center text-slate-500 py-16">Заказов нет</div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((order) => {
            const cfg = STATUS_CONFIG[order.status] ?? {
              label: order.status,
              badge: "bg-slate-700 text-slate-300 border border-slate-600",
            };
            return (
              <div
                key={order._id}
                className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-5 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-300 font-semibold text-sm">
                      #{order._id?.slice(-6).toUpperCase()}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${cfg.badge}`}
                    >
                      {cfg.label}
                    </span>
                  </div>
                  <span className="text-slate-500 text-xs">
                    {new Date(order.createdAt).toLocaleString("ru-RU")}
                  </span>
                </div>

                <div className="text-slate-300 text-sm">
                  <span className="text-slate-500">Клиент: </span>
                  {order.clientName || order.userName || "—"}
                </div>

                {order.phone && (
                  <div className="text-slate-300 text-sm">
                    <span className="text-slate-500">Телефон: </span>
                    {order.phone}
                  </div>
                )}

                {order.address && (
                  <div className="text-slate-300 text-sm">
                    <span className="text-slate-500">Адрес: </span>
                    {order.address}
                  </div>
                )}

                {order.items?.length > 0 && (
                  <div className="text-sm text-slate-400">
                    <span className="text-slate-500">Товары: </span>
                    {order.items.map((it, i) => (
                      <span key={i}>
                        {it.name} × {it.qty ?? it.quantity ?? 1}
                        {i < order.items.length - 1 ? ", " : ""}
                      </span>
                    ))}
                  </div>
                )}

                {/* Action buttons */}
                {order.status === "new" && (
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={() => handleAccept(order._id)}
                      className="px-4 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 text-sm font-medium hover:bg-blue-500/30 transition-all"
                    >
                      ✅ Принять заказ
                    </button>
                    <button
                      onClick={() => handleCancel(order._id)}
                      className="px-4 py-1.5 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 text-sm font-medium hover:bg-red-500/30 transition-all"
                    >
                      ✕ Отменить
                    </button>
                  </div>
                )}

                {order.status === "accepted" && (
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={() => handleComplete(order._id)}
                      className="px-4 py-1.5 rounded-lg bg-green-500/20 text-green-400 border border-green-500/30 text-sm font-medium hover:bg-green-500/30 transition-all"
                    >
                      🏁 Выполнено
                    </button>
                    <button
                      onClick={() => handleCancel(order._id)}
                      className="px-4 py-1.5 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 text-sm font-medium hover:bg-red-500/30 transition-all"
                    >
                      ✕ Отменить
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ClientOrders;
