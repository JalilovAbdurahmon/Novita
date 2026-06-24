import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import toast from "react-hot-toast";
import axios from "../utils/axios";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas-pro";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const RecenterMap = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, 15, { animate: true, duration: 1.2 });
  }, [center, map]);
  return null;
};

const formatPrice = (num) => (num || 0).toLocaleString("ru-RU");

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatPhoneDisplay = (rawPhone) => {
  const digits = String(rawPhone || "").replace(/\D/g, "");
  const local = digits.startsWith("998") ? digits.slice(3) : digits;
  if (!local) return "—";
  let formatted = "+998";
  if (local.length > 0) formatted += " " + local.slice(0, 2);
  if (local.length > 2) formatted += " " + local.slice(2, 5);
  if (local.length > 5) formatted += " " + local.slice(5, 7);
  if (local.length > 7) formatted += " " + local.slice(7, 9);
  return formatted;
};

// ─── Receipt Row ─────────────────────────────────────────────────────────────
const ReceiptRow = ({ label, value }) => (
  <div className="flex items-baseline justify-between gap-3">
    <span
      className="text-[11px] uppercase tracking-wide shrink-0 font-medium"
      style={{ color: "#94a3b8" }}
    >
      {label}
    </span>
    <span
      className="font-semibold text-right truncate"
      style={{ color: "#0f172a" }}
    >
      {value || "—"}
    </span>
  </div>
);

// ─── Receipt Modal ────────────────────────────────────────────────────────────
const ReceiptModal = ({ order, onClose, onSentCountChange }) => {
  const receiptRef = useRef(null);
  const [shareFile, setShareFile] = useState(null);
  const [preparing, setPreparing] = useState(true);
  const [sending, setSending] = useState(false);
  const [sentCount, setSentCount] = useState(0); // ✅ YANGI: hisoblagich (нечта marta yuborilgan)

  const unitPrice = order?.product?.price || 0;
  const totalPrice = unitPrice * (order?.quantity || 0);
  const dateStr = order?.completedAt
    ? new Date(order.completedAt).toLocaleString("ru-RU")
    : order?.createdAt
    ? new Date(order.createdAt).toLocaleString("ru-RU")
    : new Date().toLocaleString("ru-RU");

  // ✅ YANGI: order o'zgarganda (boshqa chek ochilganda) hisoblagichni
  // shu order'ning haqiqiy receiptSentCount qiymatiga tenglashtiramiz —
  // shuning uchun ActiveOrders'da yuborilgan son History'da ham to'g'ri ko'rinadi
  useEffect(() => {
    setSentCount(order?.receiptSentCount || 0);
  }, [order]);

  useEffect(() => {
    if (!order) {
      setShareFile(null);
      setPreparing(true);
      return;
    }
    let cancelled = false;
    setPreparing(true);
    setShareFile(null);

    requestAnimationFrame(async () => {
      try {
        if (!receiptRef.current) return;
        const canvas = await html2canvas(receiptRef.current, {
          backgroundColor: "#ffffff",
          scale: 3,
          useCORS: true,
        });
        const blob = await new Promise((resolve) =>
          canvas.toBlob(resolve, "image/png")
        );
        if (cancelled || !blob) return;
        const safeShopName = (order.shopName || "zakaz").replace(/\s+/g, "_");
        const file = new File(
          [blob],
          `chek_${safeShopName}_${Date.now()}.png`,
          { type: "image/png" }
        );
        setShareFile(file);
      } catch (err) {
        console.error("Чекни рендер қилишда хато:", err);
        if (!cancelled) toast.error("Не удалось подготовить чек");
      } finally {
        if (!cancelled) setPreparing(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [order]);

  if (!order) return null;

  const handleShare = async () => {
    if (!shareFile) {
      toast.error("Чек ещё готовится, подождите секунду");
      return;
    }
    setSending(true);
    try {
      const imageBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(shareFile);
      });
      const res = await axios.post(`/${order._id}/send-receipt`, {
        imageBase64,
      });
      toast.success(res.data?.message || "Чек отправлен в Telegram! 📤");
      // ✅ YANGI: backend qaytargan yangilangan sonni darhol qo'yamiz
      if (typeof res.data?.receiptSentCount === "number") {
        setSentCount(res.data.receiptSentCount);
        // ✅ Orqadagi jadvaldagi (completedOrders) ma'lumotni ham yangilash uchun
        // ota komponentga xabar beramiz, shunda boshqa joyda ham son to'g'ri turadi
        if (onSentCountChange) {
          onSentCountChange(order._id, res.data.receiptSentCount);
        }
      }
      onClose();
    } catch (err) {
      const msg =
        err?.response?.data?.message || "Не удалось отправить чек в Telegram";
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      const canvas = await html2canvas(receiptRef.current, {
        backgroundColor: "#ffffff",
        scale: 3,
        useCORS: true,
      });
      const imgData = canvas.toDataURL("image/png");
      const mmPerPx = 0.264583 / 3;
      const pdfWidth = canvas.width * mmPerPx;
      const pdfHeight = canvas.height * mmPerPx;
      const pdf = new jsPDF({
        orientation: pdfWidth > pdfHeight ? "landscape" : "portrait",
        unit: "mm",
        format: [pdfWidth, pdfHeight],
      });
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`chek_${(order.shopName || "zakaz").replace(/\s+/g, "_")}.pdf`);
    } catch (err) {
      toast.error("Не удалось создать PDF");
    }
  };

  return (
    <div className="fixed inset-0 z-9999 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm flex flex-col gap-3">
        <button
          onClick={onClose}
          className="self-end px-4 py-2 rounded-lg text-xs font-bold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700 transition-all"
        >
          Закрыть ✕
        </button>

        <div className="relative">
          <div
            ref={receiptRef}
            className="rounded-2xl shadow-2xl px-6 py-7 font-mono"
            style={{ backgroundColor: "#ffffff", color: "#0f172a" }}
          >
            <div className="text-center mb-4">
              <div className="text-3xl leading-none mb-2">✅</div>
              <div className="text-[15px] font-black uppercase tracking-wide">
                Заказ выполнен
              </div>
              {/* ✅ YANGI: yil bo'yicha ketma-ket chek raqami, sarlavha tepasida */}
              {order.receiptNumber ? (
                <div
                  className="text-[13px] font-black tracking-wide mt-1.5"
                  style={{ color: "#0f172a" }}
                >
                  № {order.receiptNumber}/{order.receiptYear}
                </div>
              ) : null}
              <div className="text-[11px] mt-1" style={{ color: "#94a3b8" }}>
                {dateStr}
              </div>
            </div>

            <div className="my-3" style={{ borderTop: "1px dashed #cbd5e1" }} />

            <div className="flex flex-col gap-2 text-[13px]">
              <ReceiptRow label="Магазин" value={order.shopName} />
              <ReceiptRow label="Владелец" value={order.ownerName} />
              <ReceiptRow
                label="Телефон"
                value={formatPhoneDisplay(order.phone)}
              />
              <ReceiptRow label="Товар" value={order.product?.name} />
              <ReceiptRow label="Кол-во" value={`${order.quantity} шт`} />
              <ReceiptRow
                label="Цена за ед."
                value={`${formatPrice(unitPrice)} сум`}
              />
            </div>

            <div className="my-3" style={{ borderTop: "1px dashed #cbd5e1" }} />

            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold uppercase tracking-wide">
                Итого
              </span>
              <span className="text-xl font-black">
                {formatPrice(totalPrice)} сум
              </span>
            </div>

            <div className="my-3" style={{ borderTop: "1px dashed #cbd5e1" }} />

            {/* Eski qator — order._id'ning oxiri, o'zgarmasdan qoldirildi */}
            <div
              className="text-center text-[10px] tracking-widest"
              style={{ color: "#94a3b8" }}
            >
              № {order._id ? order._id.slice(-8).toUpperCase() : "--------"}
            </div>
          </div>

          {preparing && (
            <div className="absolute inset-0 rounded-2xl bg-white/70 flex items-center justify-center">
              <span className="w-6 h-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
            </div>
          )}
        </div>

        <button
          onClick={handleShare}
          disabled={preparing || sending}
          className="px-5 py-3.5 rounded-xl text-sm font-bold bg-linear-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black shadow-lg shadow-emerald-900/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {preparing ? (
            <>
              <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              Готовим чек...
            </>
          ) : sending ? (
            <>
              <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              Отправляем в Telegram...
            </>
          ) : (
            <>
              📤 Отправить в Telegram
              {sentCount > 0 ? ` (${sentCount})` : ""}
            </>
          )}
        </button>

        <button
          onClick={handleDownloadPdf}
          className="text-xs font-semibold text-slate-400 hover:text-white text-center transition-all"
        >
          Скачать как PDF
        </button>
      </div>
    </div>
  );
};

// ─── Agent Filter Modal ───────────────────────────────────────────────────────
// ✅ QAYTA ISHLANDI: endi tanlov faqat LOKAL holatda (tempSelectedId) saqlanadi.
// Asosiy filter (selectedAgentId) faqat "Применить" bosilganda o'zgaradi —
// shu sababli agentga bosish bilanoq filter ishlamaydi.
const AgentFilterModal = ({
  agents,
  loadingAgents,
  selectedAgentId,
  onApply,
  onClose,
}) => {
  const [search, setSearch] = useState("");
  // ✅ YANGI: modal ichidagi vaqtinchalik tanlov — hali tasdiqlanmagan
  const [tempSelectedId, setTempSelectedId] = useState(selectedAgentId);

  const filtered = agents.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      (a.district || "").toLowerCase().includes(search.toLowerCase())
  );

  // ✅ YANGI: tanlangan agentning to'liq ma'lumoti (pastki preview uchun)
  const tempAgent = agents.find((a) => a._id === tempSelectedId) || null;

  // O'zgarish bormi? (tasdiqlash tugmasini ajratib ko'rsatish uchun)
  const hasChanged = tempSelectedId !== selectedAgentId;

  return (
    <div className="fixed inset-0 z-999 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
      <div
        className="w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-white/10"
        style={{
          background:
            "linear-gradient(160deg, #11141f 0%, #0a0c14 55%, #0c0f1a 100%)",
        }}
      >
        {/* Header — gradient bilan boyitilgan */}
        <div
          className="relative px-6 py-5 overflow-hidden"
          style={{
            background:
              "linear-gradient(120deg, rgba(16,185,129,0.18) 0%, rgba(167,139,250,0.14) 50%, rgba(34,211,238,0.12) 100%)",
          }}
        >
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 flex items-center justify-center text-[20px] shadow-lg">
                🧑‍💼
              </div>
              <div>
                <div className="text-[16px] font-black text-white tracking-wide">
                  Фильтр по агентам
                </div>
                <div className="text-[11px] text-slate-300/80 mt-0.5">
                  Выберите агента и нажмите «Применить»
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/30 text-slate-300 hover:text-rose-300 text-sm transition-all"
            >
              ✕
            </button>
          </div>
          {/* Dekorativ doira */}
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-emerald-400/10 blur-2xl" />
        </div>

        {/* Search */}
        <div className="px-5 py-3.5 border-b border-white/5">
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
              🔍
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по имени или району..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-[13px] text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-400/50 focus:bg-white/[0.07] transition-all"
            />
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto max-h-80 flex flex-col gap-1.5 p-3">
          {/* "Barcha" option */}
          <button
            onClick={() => setTempSelectedId(null)}
            className={`group flex items-center justify-between px-4 py-3 text-left transition-all duration-200 w-full rounded-2xl border ${
              tempSelectedId === null
                ? "bg-emerald-500/10 border-emerald-400/40 shadow-[0_0_0_1px_rgba(16,185,129,0.15)]"
                : "bg-white/2 border-white/5 hover:bg-white/5 hover:border-white/10"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center text-base transition-all duration-200 ${
                  tempSelectedId === null
                    ? "bg-linear-to-br from-emerald-500 to-cyan-400 text-white shadow-lg shadow-emerald-500/30"
                    : "bg-white/5 text-slate-400 group-hover:bg-white/10"
                }`}
              >
                👥
              </div>
              <div>
                <div
                  className={`text-[13.5px] font-bold transition-colors duration-200 ${
                    tempSelectedId === null
                      ? "text-emerald-300"
                      : "text-slate-200"
                  }`}
                >
                  Все агенты
                </div>
                <div className="text-[11px] text-slate-500">
                  Без фильтра по агенту
                </div>
              </div>
            </div>
            {tempSelectedId === null && (
              <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                <svg
                  className="w-3 h-3 text-white"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={3}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            )}
          </button>

          {loadingAgents ? (
            <div className="flex items-center justify-center py-10 gap-2 text-slate-500 text-xs">
              <span className="w-4 h-4 border-2 border-slate-700 border-t-emerald-500 rounded-full animate-spin" />
              Агентлар юкланмоқда...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-slate-500 text-xs">
              Агент топилмади
            </div>
          ) : (
            filtered.map((agent) => {
              const isSelected = tempSelectedId === agent._id;
              return (
                <button
                  key={agent._id}
                  onClick={() => setTempSelectedId(agent._id)}
                  className={`flex items-center justify-between px-4 py-3 text-left rounded-2xl border transition-all duration-200 ${
                    isSelected
                      ? "bg-emerald-500/10 border-emerald-400/40 shadow-[0_0_0_1px_rgba(16,185,129,0.15)]"
                      : "bg-white/2 border-white/5 hover:bg-white/5 hover:border-white/10"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black transition-all duration-200 ${
                        isSelected
                          ? "bg-linear-to-br from-emerald-500 to-cyan-400 text-white shadow-lg shadow-emerald-500/30"
                          : "bg-white/5 border border-white/10 text-slate-400"
                      }`}
                    >
                      {agent.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div
                        className={`text-[13px] font-bold ${
                          isSelected ? "text-emerald-300" : "text-slate-100"
                        }`}
                      >
                        {agent.name}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {agent.district && (
                          <span className="text-[11px] text-indigo-300 font-medium">
                            📍 {agent.district}
                          </span>
                        )}
                        <span className="text-[11px] text-slate-500 font-mono">
                          {formatPhoneDisplay(agent.phone)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!agent.isActive && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        Нофаол
                      </span>
                    )}
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={3}
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer — tanlangan agent preview + Применить tugmasi */}
        <div className="px-5 py-4 border-t border-white/5 bg-black/20 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400 min-w-0">
            {tempSelectedId === null ? (
              <span>Будут показаны все заказы</span>
            ) : (
              <span className="truncate block">
                Выбран:{" "}
                <span className="text-emerald-300 font-bold">
                  {tempAgent?.name || "—"}
                </span>
              </span>
            )}
          </div>
          <button
            onClick={() => onApply(tempSelectedId)}
            disabled={!hasChanged}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              hasChanged
                ? "bg-linear-to-r from-emerald-500 to-cyan-400 text-black shadow-lg shadow-emerald-900/30 hover:shadow-emerald-500/30 hover:-translate-y-0.5"
                : "bg-white/5 text-slate-500 cursor-not-allowed"
            }`}
          >
            Применить ✓
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const OrderHistory = () => {
  const [completedOrders, setCompletedOrders] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState(null); // null = all
  const [agentModalOpen, setAgentModalOpen] = useState(false);

  const [selectedLocation, setSelectedLocation] = useState([
    41.31108, 69.24056,
  ]);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [receiptOrder, setReceiptOrder] = useState(null);
  const itemsPerPage = 5;

  useEffect(() => {
    fetchHistory();
    fetchAgents();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await axios.get("/history");
      const completedOnly = res.data.filter((o) => o.status === "berildi");
      // ✅ TUZATILDI: createdAt emas, completedAt (yakunlangan vaqt) bo'yicha
      // saralaymiz — eng oxirgi bajarilgan (eng katta chek raqami) tepada,
      // eng birinchi bajarilgan (chek №1) pastda turadi. Agar biror sababdan
      // completedAt bo'lmasa (juda eski order), createdAt'ga tushamiz.
      const sorted = [...completedOnly].sort((a, b) => {
        const bTime = new Date(b.completedAt || b.createdAt).getTime();
        const aTime = new Date(a.completedAt || a.createdAt).getTime();
        return bTime - aTime;
      });
      setCompletedOrders(sorted);
      if (sorted.length > 0) {
        setSelectedLocation([sorted[0].location.lat, sorted[0].location.lng]);
        setSelectedOrderId(sorted[0]._id);
      }
    } catch (err) {
      console.error("Ошибка:", err);
    }
  };

  const fetchAgents = async () => {
    setLoadingAgents(true);
    try {
      const res = await axios.get("/agents");
      setAgents(res.data?.data || []);
    } catch (err) {
      console.error("Агентларни олишда хато:", err);
    } finally {
      setLoadingAgents(false);
    }
  };

  // Filter orders by selected agent
  const filteredOrders = selectedAgentId
    ? completedOrders.filter(
        (o) =>
          o.agentId?._id === selectedAgentId || o.agentId === selectedAgentId
      )
    : completedOrders;

  // Selected agent info
  const activeAgent = agents.find((a) => a._id === selectedAgentId) || null;

  const handleSelectOrder = (id, location) => {
    setSelectedOrderId(id);
    setSelectedLocation([location.lat, location.lng]);
  };

  const handleShowReceipt = (order, e) => {
    e.stopPropagation();
    setReceiptOrder(order);
  };

  // ✅ YANGI: ReceiptModal'dan chek yuborilganda chaqiriladi —
  // completedOrders ro'yxatidagi mos orderning receiptSentCount'ini
  // ham yangilaymiz, shunda sahifani yangilamasdan ham son to'g'ri turadi
  const handleSentCountChange = (orderId, newCount) => {
    setCompletedOrders((prev) =>
      prev.map((o) =>
        o._id === orderId ? { ...o, receiptSentCount: newCount } : o
      )
    );
  };

  // ✅ YANGI: filterni tozalashdan oldin chiroyli toast-confirm ko'rsatadi —
  // tasodifan bosib filterni yo'qotib qo'ymaslik uchun
  const confirmClearAgentFilter = () => {
    const agentNameForToast = activeAgent?.name || "агента";
    toast(
      (t) => (
        <div className="flex flex-col gap-3 p-1 min-w-65">
          <div className="flex items-start gap-2">
            <span className="text-amber-500 text-lg leading-none">🧹</span>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-bold text-white">Сбросить фильтр?</p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Фильтр по агенту «{agentNameForToast}» будет снят, отобразятся
                все заказы.
              </p>
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-1">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            >
              Отмена
            </button>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                setSelectedAgentId(null);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-900/30 transition-all"
            >
              ✓ Сбросить
            </button>
          </div>
        </div>
      ),
      {
        duration: 8000,
        style: {
          background: "#0f111a",
          border: "1px solid rgba(51,65,85,0.6)",
          borderRadius: "1rem",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.6)",
          padding: "14px",
        },
      }
    );
  };

  const handleDeleteOrder = async (id) => {
    try {
      await axios.delete(`/${id}`);
      toast.success("Заказ удалён! 🗑️");

      // ✅ Backend reorderReceiptNumbers ni chaqiradi —
      // yangi receiptNumber larni olish uchun qayta fetch qilamiz
      const res = await axios.get("/history");
      const completedOnly = res.data.filter((o) => o.status === "berildi");
      const sorted = [...completedOnly].sort((a, b) => {
        const bTime = new Date(b.completedAt || b.createdAt).getTime();
        const aTime = new Date(a.completedAt || a.createdAt).getTime();
        return bTime - aTime;
      });

      setCompletedOrders(sorted);

      // Map uchun: o'chirilgan order tanlangan bo'lsa, boshqasini tanla
      if (selectedOrderId === id) {
        const remaining = sorted.filter((o) => o._id !== id);
        if (remaining.length > 0) {
          setSelectedOrderId(remaining[0]._id);
          setSelectedLocation([
            remaining[0].location.lat,
            remaining[0].location.lng,
          ]);
        } else {
          setSelectedOrderId(null);
        }
      }

      // Pagination tuzatish
      const newTotalPages = Math.ceil(sorted.length / itemsPerPage);
      if (currentPage > newTotalPages)
        setCurrentPage(Math.max(1, newTotalPages));
    } catch (err) {
      toast.error("Не удалось удалить заказ!");
    }
  };

  const confirmDeleteOrder = (id, e) => {
    e.stopPropagation();
    toast(
      (t) => (
        <div className="flex flex-col gap-3 p-1 min-w-65">
          <div className="flex items-start gap-2">
            <span className="text-rose-500 text-lg leading-none">🗑️</span>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-bold text-white">
                Удалить этот заказ?
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Заказ будет удалён безвозвратно.
              </p>
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-1">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            >
              Отмена
            </button>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                handleDeleteOrder(id);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/30 transition-all"
            >
              ✓ Удалить
            </button>
          </div>
        </div>
      ),
      {
        duration: 8000,
        style: {
          background: "#0f111a",
          border: "1px solid rgba(51,65,85,0.6)",
          borderRadius: "1rem",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.6)",
          padding: "14px",
        },
      }
    );
  };

  // Stats — based on filtered orders
  const totalSum = filteredOrders.reduce(
    (sum, o) => sum + (o.product?.price || 0) * (o.quantity || 0),
    0
  );
  const totalQty = filteredOrders.reduce(
    (sum, o) => sum + (o.quantity || 0),
    0
  );
  const totalOrders = filteredOrders.length;

  // Pagination — reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedAgentId]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

  const getPageNumbers = () => {
    const pages = [];
    const siblingCount = 1;
    const totalNumbers = siblingCount * 2 + 5;

    if (totalPages <= totalNumbers) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    const leftSibling = Math.max(currentPage - siblingCount, 1);
    const rightSibling = Math.min(currentPage + siblingCount, totalPages);
    const showLeftDots = leftSibling > 2;
    const showRightDots = rightSibling < totalPages - 1;

    pages.push(1);
    if (showLeftDots) pages.push("dots-left");
    for (
      let i = leftSibling === 1 ? 2 : leftSibling;
      i <= (rightSibling === totalPages ? totalPages - 1 : rightSibling);
      i++
    ) {
      if (i > 1 && i < totalPages) pages.push(i);
    }
    if (showRightDots) pages.push("dots-right");
    pages.push(totalPages);

    return pages;
  };

  return (
    <div className="max-w-7xl mx-auto p-4 flex flex-col gap-6 select-none text-slate-200">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-2">
        <div>
          <h1 className="text-3xl font-black text-emerald-400 tracking-wide">
            История заказов
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Архив всех успешно выполненных заказов.{" "}
            <span className="text-emerald-400 font-bold">
              Кликните на строку
            </span>
            , чтобы показать магазин на карте.
          </p>
        </div>

        {completedOrders.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl px-4 py-2 text-center">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                Всего заказов
              </div>
              <div className="text-violet-400 font-black font-mono text-base leading-tight">
                {totalOrders} шт
              </div>
            </div>
            <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl px-4 py-2 text-center">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                Всего товаров
              </div>
              <div className="text-cyan-400 font-black font-mono text-base leading-tight">
                {formatPrice(totalQty)} шт
              </div>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2 text-center">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                Общая сумма
              </div>
              <div className="text-emerald-400 font-black font-mono text-base leading-tight">
                {formatPrice(totalSum)} сум
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── AGENT FILTER BAR ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Filter button */}
        <button
          onClick={() => {
            fetchAgents();
            setAgentModalOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl transition-all duration-300 p-1 shadow-md hover:shadow-lg hover:-translate-y-0.5"
          style={{
            background:
              "linear-gradient(90deg, #10b981 0%, #a78bfa 50%, #22d3ee 100%)",
          }}
        >
          {/* Ikonka konteyneri */}
          <div className="w-9 h-9 flex items-center justify-center rounded-[10px] bg-slate-900/40 text-[16px]">
            🧑‍💼
          </div>

          {/* Matn konteyneri */}
          <div className="flex items-center gap-2 pr-4 pl-1">
            <span className="text-[13px] font-bold text-white whitespace-nowrap">
              {selectedAgentId && activeAgent
                ? activeAgent.name
                : "Фильтровать по агенту"}
            </span>
            <svg
              className="w-3.5 h-3.5 text-white/90"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </button>

        {/* Active filter badge */}
        {selectedAgentId && activeAgent && activeAgent.district && (
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-sky-200 bg-linear-to-r from-emerald-50 to-sky-50 shadow-sm transition-all duration-300">
            {/* Tuman nomi */}
            <span className="flex items-center gap-1.5 text-[12px] font-bold text-emerald-700">
              <span className="text-[14px]">📍</span>
              {activeAgent.district}
            </span>

            {/* Ajratuvchi chiziq */}
            <div className="w-px h-3.5 bg-emerald-300/50" />

            {/* Tozalash tugmasi */}
            <button
              onClick={confirmClearAgentFilter}
              className="flex items-center justify-center w-4.5 h-4.5 rounded-md bg-emerald-100 hover:bg-rose-500 hover:text-white text-emerald-600 transition-all duration-300"
              title="Фильтрни олиш"
            >
              <svg
                className="w-2.5 h-2.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        {selectedAgentId && (
          <button
            onClick={confirmClearAgentFilter}
            className="group flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-sm transition-all duration-300 hover:border-rose-300 hover:shadow-rose-100 hover:bg-rose-50"
          >
            <svg
              className="w-5 h-5 text-rose-500 transition-transform duration-300 group-hover:scale-110"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 3l6 6M22 3l-6 6"
              />
            </svg>
          </button>
        )}
      </div>

      {completedOrders.length === 0 ? (
        <div className="bg-[#0f111a] border border-slate-800/80 rounded-3xl p-16 text-center text-slate-500 font-medium shadow-2xl">
          📜 История заказов пока пуста.
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-[#0f111a] border border-slate-800/80 rounded-3xl p-16 text-center shadow-2xl">
          <div className="text-4xl mb-3">🧑‍💼</div>
          <div className="text-slate-400 font-bold text-sm">
            Заказов для {activeAgent?.name} не найдено.
          </div>
          <button
            onClick={() => setSelectedAgentId(null)}
            className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all"
          >
            Показать все заказы
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* TABLE */}
          <div className="flex flex-col gap-4 w-full">
            <div className="bg-[#0f111a] border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-250">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/40 text-slate-400 text-xs font-bold uppercase tracking-wider">
                    <th className="p-4">Магазин 🏪</th>
                    <th className="p-4">Туман 📍</th>
                    <th className="p-4">Агент 🧑‍💼</th>
                    <th className="p-4">Товар 📦</th>
                    <th className="p-4">Сумма 💰</th>
                    <th className="p-4">Дата 📅</th>
                    <th className="p-4 text-center">Статус</th>
                    <th className="p-4 text-center">Действие</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-[13.5px]">
                  {currentOrders.map((order) => {
                    const isSelected = selectedOrderId === order._id;
                    const unitPrice = order.product?.price || 0;
                    const totalPrice = unitPrice * (order.quantity || 0);
                    const agentName = order.agentId?.name || null;

                    return (
                      <tr
                        key={order._id}
                        onClick={() =>
                          handleSelectOrder(order._id, order.location)
                        }
                        style={{ verticalAlign: "middle" }}
                        className={`cursor-pointer transition-all duration-200 border-l-4 ${
                          isSelected
                            ? "bg-linear-to-r from-emerald-500/15 via-emerald-500/5 to-transparent border-l-emerald-500"
                            : "border-l-transparent hover:bg-linear-to-r hover:from-emerald-500/10 hover:via-emerald-400/5 hover:to-transparent hover:border-l-emerald-500/50"
                        }`}
                      >
                        <td className="p-4 align-middle whitespace-nowrap">
                          <div
                            className={`font-bold ${
                              isSelected ? "text-emerald-400" : "text-white"
                            }`}
                          >
                            {order.shopName}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {order.ownerName}
                          </div>
                          <div className="text-[11px] text-slate-600 font-mono mt-0.5">
                            {formatPhoneDisplay(order.phone)}
                          </div>
                        </td>

                        <td className="p-4 align-middle whitespace-nowrap">
                          {order.district ? (
                            <span className="inline-flex -mt-2 items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                              📍 {order.district}
                            </span>
                          ) : (
                            <span className="text-slate-600 text-xs">—</span>
                          )}
                        </td>

                        <td className="p-4 align-middle whitespace-nowrap">
                          {agentName ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="inline-flex mt-3 items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                🧑‍💼 {agentName}
                              </span>
                              {order.agentId?.phone && (
                                <span className="text-[11px] text-slate-600 font-mono pl-1">
                                  {formatPhoneDisplay(order.agentId.phone)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-600 text-xs font-medium">
                              —
                            </span>
                          )}
                        </td>

                        <td className="p-4 align-middle whitespace-nowrap">
                          <span className="font-semibold text-slate-200">
                            {order.product?.name}
                          </span>
                          <span className="text-cyan-500 font-bold ml-1 text-xs">
                            ({order.quantity} шт)
                          </span>
                        </td>

                        <td className="p-4 align-middle whitespace-nowrap">
                          <div className="text-emerald-400 font-bold font-mono text-sm">
                            {formatPrice(totalPrice)} сум
                          </div>
                          {unitPrice > 0 && (
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {formatPrice(unitPrice)} × {order.quantity}
                            </div>
                          )}
                        </td>

                        <td className="p-4 align-middle whitespace-nowrap">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] text-emerald-500/70 uppercase tracking-wide font-bold w-14 shrink-0">
                                Выполнен
                              </span>
                              <span className="text-amber-400 text-xs font-mono">
                                {formatDate(order.completedAt)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] text-slate-600 uppercase tracking-wide font-bold w-14 shrink-0">
                                Создан
                              </span>
                              <span className="text-slate-300 text-xs font-mono">
                                {formatDate(order.createdAt)}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="p-4 align-middle text-center whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Доставлено ✅
                          </span>
                        </td>

                        <td className="p-4 align-middle text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={(e) => handleShowReceipt(order, e)}
                              title="Показать чек"
                              className="w-8 h-8 inline-flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-black rounded-lg text-sm transition-all"
                            >
                              🧾
                            </button>
                            <button
                              onClick={(e) => confirmDeleteOrder(order._id, e)}
                              title="Удалить"
                              className="w-8 h-8 inline-flex items-center justify-center bg-rose-600/10 border border-rose-500/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg text-xs transition-all"
                            >
                              🗑️
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
                    {indexOfFirstItem + 1}–
                    {Math.min(indexOfLastItem, filteredOrders.length)}
                  </span>{" "}
                  из{" "}
                  <span className="text-emerald-400 font-bold">
                    {filteredOrders.length}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 order-1 sm:order-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(1)}
                    className="w-8 h-8 inline-flex items-center justify-center rounded-lg bg-slate-900/40 border border-slate-800 text-slate-400 text-xs font-bold hover:bg-slate-800/60 hover:text-white disabled:opacity-30 transition-all"
                  >
                    «
                  </button>
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="h-8 px-3 inline-flex items-center justify-center gap-1 rounded-lg bg-slate-900/40 border border-slate-800 text-slate-400 text-xs font-bold hover:bg-slate-800/60 hover:text-white disabled:opacity-30 transition-all"
                  >
                    ‹ Назад
                  </button>

                  <div className="flex items-center gap-1.5 mx-1">
                    {getPageNumbers().map((page, idx) =>
                      typeof page === "number" ? (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-8 h-8 text-xs font-bold rounded-lg transition-all duration-200 ${
                            currentPage === page
                              ? "bg-emerald-500 text-white shadow-lg shadow-emerald-900/40 scale-105"
                              : "bg-slate-900/40 border border-slate-800 text-slate-400 hover:bg-slate-800/60 hover:text-white"
                          }`}
                        >
                          {page}
                        </button>
                      ) : (
                        <span
                          key={`${page}-${idx}`}
                          className="w-8 h-8 inline-flex items-center justify-center text-slate-600 text-xs font-bold"
                        >
                          ⋯
                        </span>
                      )
                    )}
                  </div>

                  <button
                    disabled={currentPage === totalPages}
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    className="h-8 px-3 inline-flex items-center justify-center gap-1 rounded-lg bg-slate-900/40 border border-slate-800 text-slate-400 text-xs font-bold hover:bg-slate-800/60 hover:text-white disabled:opacity-30 transition-all"
                  >
                    Вперед ›
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                    className="w-8 h-8 inline-flex items-center justify-center rounded-lg bg-slate-900/40 border border-slate-800 text-slate-400 text-xs font-bold hover:bg-slate-800/60 hover:text-white disabled:opacity-30 transition-all"
                  >
                    »
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* MAP */}
          <div className="flex flex-col gap-2.5 w-full">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1 flex items-center gap-1.5">
              📍 Локация выбранного заказа
            </label>
            <div className="w-full h-80 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative z-0">
              <MapContainer
                center={selectedLocation}
                zoom={14}
                className="w-full h-full"
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="&copy; OpenStreetMap"
                />
                <Marker position={selectedLocation} />
                <RecenterMap center={selectedLocation} />
              </MapContainer>
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      <ReceiptModal
        order={receiptOrder}
        onClose={() => setReceiptOrder(null)}
        onSentCountChange={handleSentCountChange}
      />

      {agentModalOpen && (
        <AgentFilterModal
          agents={agents}
          loadingAgents={loadingAgents}
          selectedAgentId={selectedAgentId}
          onApply={(id) => {
            setSelectedAgentId(id);
            setAgentModalOpen(false);
          }}
          onClose={() => setAgentModalOpen(false)}
        />
      )}
    </div>
  );
};

export default OrderHistory;
