import { useState, useEffect, useMemo } from "react";
import axios from "../utils/axios.js";

const STATUS_CONFIG = {
  new: { label: "Yangi", badge: "bg-orange-500/15 text-orange-400 border border-orange-500/30" },
  accepted: { label: "Qabul qilindi", badge: "bg-blue-500/15 text-blue-400 border border-blue-500/30" },
  delivered: { label: "Yetkazildi", badge: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" },
  cancelled: { label: "Bekor qilindi", badge: "bg-red-500/15 text-red-400 border border-red-500/30" },
};

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleString("uz-UZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPhone(phone) {
  if (!phone) return "—";
  return phone.replace(/^\+?998/, "+998 ").replace(/(\d{2})(\d{3})(\d{2})(\d{2})$/, "$1 $2-$3-$4");
}

function mapsLink(location) {
  if (!location?.lat || !location?.lng) return null;
  return `https://www.google.com/maps?q=${location.lat},${location.lng}`;
}

export default function ClientHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const res = await axios.get("/api/bot/orders");
        setOrders(res.data?.data || []);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.message || "Tarixni yuklashda xatolik yuz berdi");
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
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
    const totalOrders = filtered.length;
    const totalQty = filtered.reduce((sum, o) => sum + (o.quantity || 0), 0);
    const totalSum = filtered.reduce((sum, o) => sum + (o.product?.price || 0) * (o.quantity || 0), 0);
    return { totalOrders, totalQty, totalSum };
  }, [filtered]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Zakazlar tarixi
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            Telegram client botdan kelgan barcha buyurtmalar arxivi
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="rounded-xl bg-neutral-900 border border-neutral-800 p-4">
            <p className="text-neutral-500 text-xs uppercase tracking-wide">Jami zakazlar</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.totalOrders}</p>
          </div>
          <div className="rounded-xl bg-neutral-900 border border-neutral-800 p-4">
            <p className="text-neutral-500 text-xs uppercase tracking-wide">Jami mahsulot</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.totalQty} ta</p>
          </div>
          <div className="rounded-xl bg-neutral-900 border border-neutral-800 p-4">
            <p className="text-neutral-500 text-xs uppercase tracking-wide">Jami summa</p>
            <p className="text-2xl font-bold text-orange-400 mt-1">
              {stats.totalSum.toLocaleString("uz-UZ")} so'm
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-5">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ism, telefon yoki mahsulot bo'yicha qidirish..."
            className="flex-1 min-w-55 px-4 py-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 text-sm"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 text-sm"
          >
            <option value="all">Barcha statuslar</option>
            <option value="new">Yangi</option>
            <option value="accepted">Qabul qilindi</option>
            <option value="delivered">Yetkazildi</option>
            <option value="cancelled">Bekor qilindi</option>
          </select>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="grid gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 rounded-lg bg-neutral-900 border border-neutral-800 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-800 py-20 text-center">
            <p className="text-neutral-500">Hech narsa topilmadi</p>
            <p className="text-neutral-600 text-sm mt-1">Qidiruv yoki filterni o'zgartirib ko'ring</p>
          </div>
        ) : (
          <div className="rounded-xl border border-neutral-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-neutral-900 text-neutral-500 text-xs uppercase tracking-wide">
                    <th className="text-left font-medium px-4 py-3">Mijoz</th>
                    <th className="text-left font-medium px-4 py-3">Mahsulot</th>
                    <th className="text-left font-medium px-4 py-3">Soni</th>
                    <th className="text-left font-medium px-4 py-3">Summa</th>
                    <th className="text-left font-medium px-4 py-3">Status</th>
                    <th className="text-left font-medium px-4 py-3">Sana</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {filtered.map((order) => {
                    const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.new;
                    const sum = (order.product?.price || 0) * (order.quantity || 0);
                    return (
                      <tr
                        key={order._id}
                        onClick={() => setSelected(order)}
                        className="bg-neutral-950 hover:bg-neutral-900 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3">
                          <p className="text-neutral-100 font-medium">{order.botUser?.fullName || "Noma'lum"}</p>
                          <p className="text-neutral-500 text-xs">{formatPhone(order.botUser?.phone)}</p>
                        </td>
                        <td className="px-4 py-3 text-neutral-300">{order.product?.name || "—"}</td>
                        <td className="px-4 py-3 text-neutral-300">{order.quantity}</td>
                        <td className="px-4 py-3 text-neutral-300">
                          {sum > 0 ? `${sum.toLocaleString("uz-UZ")} so'm` : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ${status.badge}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-neutral-500 whitespace-nowrap">{formatDate(order.createdAt)}</td>
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
          className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Zakaz tafsilotlari</h3>
              <button
                onClick={() => setSelected(null)}
                className="text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">Mijoz</span>
                <span className="text-neutral-100">{selected.botUser?.fullName || "Noma'lum"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Telefon</span>
                <span className="text-neutral-100">{formatPhone(selected.botUser?.phone)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Mahsulot</span>
                <span className="text-neutral-100">{selected.product?.name || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Soni</span>
                <span className="text-neutral-100">{selected.quantity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Status</span>
                <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ${(STATUS_CONFIG[selected.status] || STATUS_CONFIG.new).badge}`}>
                  {(STATUS_CONFIG[selected.status] || STATUS_CONFIG.new).label}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Sana</span>
                <span className="text-neutral-100">{formatDate(selected.createdAt)}</span>
              </div>
              {selected.note && (
                <div className="pt-2 border-t border-neutral-800">
                  <span className="text-neutral-500">Izoh: </span>
                  <span className="text-neutral-300 italic">"{selected.note}"</span>
                </div>
              )}
              {mapsLink(selected.location) && (
                <a
                  href={mapsLink(selected.location)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center mt-4 px-4 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium transition-colors"
                >
                  📍 Xaritada ko'rish
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}