import React, { useState, useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import toast from "react-hot-toast";
import axios from "../utils/axios";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas-pro";
import { useOrderNotifications } from "../utils/useOrderNotifications";

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
    if (center) map.setView(center, 16, { animate: true });
  }, [center, map]);
  return null;
};

const createNumberedIcon = (
  label,
  fillColor = "#dc2626",
  isSelected = false
) => {
  const selectedFilter = isSelected
    ? `filter: drop-shadow(0 0 0 3px white) drop-shadow(0 0 0 6px ${fillColor});`
    : `filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));`;

  const html = `
    <div style="position:relative;width:36px;height:48px;${selectedFilter}">
      <svg width="36" height="48" viewBox="0 0 36 48" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 30 18 30s18-16.5 18-30C36 8.06 27.94 0 18 0z"
              fill="${fillColor}" stroke="white" stroke-width="2"/>
      </svg>
      <div style="position:absolute;top:0;left:0;width:36px;height:36px;display:flex;align-items:center;justify-content:center;color:white;font-weight:800;font-size:14px;font-family:system-ui,sans-serif;">${label}</div>
    </div>`;

  return L.divIcon({
    html,
    className: "",
    iconSize: [36, 48],
    iconAnchor: [18, 48],
  });
};

const getGradientColor = (ratio) => {
  const stops = [
    { r: 16, g: 185, b: 129 },
    { r: 234, g: 179, b: 8 },
    { r: 220, g: 38, b: 38 },
  ];
  const clamped = Math.max(0, Math.min(1, ratio));
  const segment = clamped < 0.5 ? 0 : 1;
  const localRatio = clamped < 0.5 ? clamped / 0.5 : (clamped - 0.5) / 0.5;
  const from = stops[segment];
  const to = stops[segment + 1];
  return `rgb(${Math.round(from.r + (to.r - from.r) * localRatio)},${Math.round(
    from.g + (to.g - from.g) * localRatio
  )},${Math.round(from.b + (to.b - from.b) * localRatio)})`;
};

const getStopColor = (index, total) => {
  if (total <= 1) return getGradientColor(0);
  return getGradientColor(index / (total - 1));
};

const getCurrentPosition = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Brauzeringiz geolokatsiyani qo'llab-quvvatlamaydi"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });

const buildYandexRouteUrl = (origin, orderedStops) => {
  const points = [
    origin,
    ...orderedStops.map((s) => ({ lat: s.location.lat, lng: s.location.lng })),
  ];
  const rtext = points.map((p) => `${p.lat},${p.lng}`).join("~");
  return `https://yandex.ru/maps/?rtext=${rtext}&rtt=auto`;
};

const formatPrice = (num) => (num || 0).toLocaleString("ru-RU");

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

const ReceiptModal = ({ order, onClose }) => {
  const receiptRef = useRef(null);
  const [shareFile, setShareFile] = useState(null);
  const [preparing, setPreparing] = useState(true);
  const [sending, setSending] = useState(false);
  const [sentCount, setSentCount] = useState(0); // ✅ YANGI: hisoblagich (нечта marta yuborilgan)

  const unitPrice = order?.product?.price || 0;
  const totalPrice = unitPrice * (order?.quantity || 0);
  const dateStr = new Date().toLocaleString("ru-RU");

  // ✅ YANGI: chek o'zgarganda (yangi order ochilganda) hisoblagichni
  // order'dan kelgan boshlang'ich qiymatga tenglashtiramiz
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
        console.error("Chekni render qilishda xato:", err);
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
      console.error(err);
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
          Пропустить ✕
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
          className="px-5 py-3.5 rounded-xl text-sm font-bold bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black shadow-lg shadow-amber-900/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

const ActiveOrders = () => {
  const { markAllSeen } = useOrderNotifications();
  const [orders, setOrders] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState([
    41.31108, 69.24056,
  ]);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [routeOrder, setRouteOrder] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [courierLocation, setCourierLocation] = useState(null);
  const [receiptOrder, setReceiptOrder] = useState(null);

  const fetchOrders = async () => {
    try {
      const res = await axios.get("/active");
      setOrders(res.data);
    } catch (err) {
      console.error("Ошибка:", err);
    }
  };

  useEffect(() => {
    fetchOrders();
    markAllSeen();
  }, []);

  useEffect(() => {
    if (orders.length === 0) return;
    if (routeOrder) return;
    const stillExists = orders.some((o) => o._id === selectedOrderId);
    if (selectedOrderId && stillExists) return;
    const latestOrder = [...orders].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    )[0];
    setSelectedOrderId(latestOrder._id);
    setSelectedLocation([latestOrder.location.lat, latestOrder.location.lng]);
  }, [orders, routeOrder]);

  const handleSelectOrder = (order) => {
    setSelectedOrderId(order._id);
    setSelectedLocation([order.location.lat, order.location.lng]);
  };

  const optimizeAndSetRoute = async (orderIds, myLocationParam = null) => {
    const myLocation = myLocationParam || (await getCurrentPosition());
    setCourierLocation(myLocation);
    const res = await axios.post("/route-optimize", {
      origin: myLocation,
      orderIds,
    });
    const { orderedStops } = res.data;
    setRouteOrder(orderedStops);
    if (orderedStops[0]) {
      setSelectedLocation([
        orderedStops[0].location.lat,
        orderedStops[0].location.lng,
      ]);
      setSelectedOrderId(orderedStops[0]._id);
    }
    return orderedStops;
  };

  const completeOrder = async (id) => {
    try {
      const res = await axios.put(`/${id}/complete`);
      toast.success("Заказ выполнен!");
      // ✅ YANGI: backend qaytargan to'liq orderni (receiptNumber,
      // receiptYear, receiptSentCount bilan) chek modaliga beramiz,
      // shunda chekda haqiqiy chek raqami va yuborilgan soni ko'rinadi
      if (res.data?.data) {
        setReceiptOrder(res.data.data);
      }
      const isInRoute = routeOrder?.some((o) => o._id === id);
      if (isInRoute) {
        const remainingIds = routeOrder
          .filter((o) => o._id !== id)
          .map((o) => o._id);
        if (remainingIds.length === 0) {
          setRouteOrder(null);
          setCourierLocation(null);
          toast.success("Маршрут завершён! 🎉");
        } else {
          try {
            const orderedStops = await optimizeAndSetRoute(remainingIds);
            toast.success(
              `Маршрут обновлён: осталось ${orderedStops.length} остановок`
            );
          } catch {
            toast.error("Ошибка при построении маршрута");
          }
        }
      }
      fetchOrders();
    } catch {
      toast.error("Ошибка!");
    }
  };

  const handleConfirmComplete = (order, e) => {
    e.stopPropagation();
    toast(
      (t) => (
        <div className="flex flex-col gap-3 p-1 min-w-65">
          <div className="flex items-start gap-2">
            <span className="text-amber-500 text-lg leading-none">⚠️</span>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-bold text-white">
                Подтвердите выполнение
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Вы уверены, что хотите отметить этот заказ как выполненный?
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
                completeOrder(order._id);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 transition-all"
            >
              ✓ Подтвердить
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

  const deleteOrder = async (id) => {
    try {
      await axios.delete(`/${id}`);
      toast.success("Заказ удалён!");
      fetchOrders();
    } catch {
      toast.error("Ошибка при удалении!");
    }
  };

  const handleConfirmDelete = (id, e) => {
    e.stopPropagation();
    toast(
      (t) => (
        <div className="flex flex-col gap-3 p-1 min-w-65">
          <div className="flex items-start gap-2">
            <span className="text-rose-500 text-lg leading-none">🗑️</span>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-bold text-white">Удалить заказ?</p>
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
                deleteOrder(id);
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

  const handleDispatchAll = async () => {
    if (orders.length === 0) {
      toast.error("Нет активных заказов");
      return;
    }
    setRouteLoading(true);
    try {
      const orderedStops = await optimizeAndSetRoute(orders.map((o) => o._id));
      toast.success(`Маршрут построен: ${orderedStops.length} остановок`);
    } catch (err) {
      if (err.code === 1 || err?.message?.includes("denied")) {
        toast.error("Доступ к геолокации запрещён.");
      } else {
        toast.error("Ошибка при построении маршрута");
      }
    } finally {
      setRouteLoading(false);
    }
  };

  const handleOpenInYandex = () => {
    if (!courierLocation || !routeOrder || routeOrder.length === 0) return;
    window.open(buildYandexRouteUrl(courierLocation, routeOrder), "_blank");
  };

  const handleClearRoute = () => {
    setRouteOrder(null);
    setCourierLocation(null);
    if (orders.length > 0) {
      const latestOrder = [...orders].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      )[0];
      setSelectedOrderId(latestOrder._id);
      setSelectedLocation([latestOrder.location.lat, latestOrder.location.lng]);
    }
  };

  const polylinePositions =
    routeOrder && courierLocation
      ? [
          [courierLocation.lat, courierLocation.lng],
          ...routeOrder.map((o) => [o.location.lat, o.location.lng]),
        ]
      : null;

  const totalActiveSum = orders.reduce((sum, o) => {
    const price = o.product?.price || 0;
    const qty = o.quantity || 0;
    return sum + price * qty;
  }, 0);

  return (
    <div className="max-w-6xl mx-auto p-2 flex flex-col gap-6 select-none">
      <div className="mb-2 backdrop-blur-sm p-1 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-black bg-linear-to-r from-amber-500 via-orange-400 to-slate-800 bg-clip-text text-transparent tracking-wide drop-shadow-[0_2px_8px_rgba(245,158,11,0.15)]">
            Активные заказы ⏳
          </h1>
          <p className="text-sm text-slate-500 mt-1.5 font-medium">
            Список текущих заказов, ожидающих выполнения.{" "}
            <span className="text-amber-500 font-bold">Кликните на строку</span>
            , чтобы переместить карту к маркеру.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {!routeOrder ? (
            <button
              onClick={handleDispatchAll}
              disabled={routeLoading || orders.length === 0}
              className="px-4 py-3.5 rounded-xl text-xs font-bold bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-900/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 uppercase tracking-wider"
            >
              {routeLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Строим маршрут...
                </>
              ) : (
                <>🚀 Развезти всё ({orders.length})</>
              )}
            </button>
          ) : (
            <>
              <button
                onClick={handleOpenInYandex}
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-linear-to-r from-yellow-500 to-yellow-400 hover:from-yellow-400 hover:to-yellow-300 text-black shadow-lg shadow-yellow-900/30 transition-all flex items-center gap-2"
              >
                🧭 Открыть в Яндекс.Навигаторе
              </button>
              <button
                onClick={handleClearRoute}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition-all"
              >
                Сбросить
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-[#0f111a] border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-237.5">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/40 text-slate-400 text-xs font-bold uppercase tracking-wider">
              <th className="p-4">Магазин 🏪</th>
              <th className="p-4">Туман 📍</th>
              <th className="p-4">Агент 🧑‍💼</th>
              <th className="p-4">Товар / Кол-во 📦</th>
              <th className="p-4">Сумма 💰</th>
              <th className="p-4">Дата создания 📅</th>
              <th className="p-4 text-center">Действие</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50 text-[14px]">
            {(routeOrder || orders).map((order, idx) => {
              const color = routeOrder
                ? getStopColor(idx, routeOrder.length)
                : null;
              const unitPrice = order.product?.price || 0;
              const totalPrice = unitPrice * (order.quantity || 0);
              // ✅ Agent nomi: TA botdan kelsa ko'rinadi, aks holda "—"
              const agentName = order.agentId?.name || null;

              return (
                <tr
                  key={order._id}
                  onClick={() => handleSelectOrder(order)}
                  style={{ verticalAlign: "middle" }}
                  className={`cursor-pointer transition-all duration-200 border-l-4 ${
                    selectedOrderId === order._id
                      ? "bg-linear-to-r from-amber-500/15 via-orange-500/5 to-transparent border-l-amber-500"
                      : "border-l-transparent hover:bg-linear-to-r hover:from-amber-500/10 hover:via-orange-400/5 hover:to-transparent hover:border-l-amber-500/50"
                  }`}
                >
                  <td className="p-4 align-middle text-white font-semibold">
                    <div className="flex items-center gap-3">
                      {color && (
                        <span
                          style={{ backgroundColor: color }}
                          className="w-7 h-7 rounded-full text-white text-xs font-black flex items-center justify-center shrink-0"
                        >
                          {idx + 1}
                        </span>
                      )}
                      <div>
                        <div>{order.shopName}</div>
                        <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                          {order.ownerName}
                        </div>
                        <div className="text-[11px] text-slate-600 font-mono mt-0.5">
                          {formatPhoneDisplay(order.phone)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 align-middle whitespace-nowrap">
                    {order.district ? (
                      <span className="inline-flex -mt-3 items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        📍 {order.district}
                      </span>
                    ) : (
                      <span className="text-slate-600 text-xs">—</span>
                    )}
                  </td>
                  {/* ✅ Agent cell */}
                  <td className="p-4 align-middle whitespace-nowrap">
                    {agentName ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="inline-flex mt-3.5 items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
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
                  <td className="p-4 align-middle text-slate-200 font-medium whitespace-nowrap">
                    {order.product?.name}{" "}
                    <span className="text-cyan-500 font-bold">
                      ({order.quantity} шт)
                    </span>
                  </td>
                  <td className="p-4 align-middle whitespace-nowrap">
                    <div className="text-emerald-400 font-bold font-mono text-[15px]">
                      {formatPrice(totalPrice)} сум
                    </div>
                    {unitPrice > 0 && (
                      <div className="text-[13px] text-slate-500 mt-0.5">
                        {formatPrice(unitPrice)} × {order.quantity}
                      </div>
                    )}
                  </td>
                  <td className="p-4 align-middle text-slate-500 text-xs font-mono whitespace-nowrap">
                    {new Date(order.createdAt).toLocaleString("ru-RU", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="p-4 align-middle text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={(e) => handleConfirmComplete(order, e)}
                        className="px-4 py-1.5 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500 text-amber-400 hover:text-black rounded-lg text-xs font-bold transition-all"
                      >
                        ✓ Завершить
                      </button>
                      <button
                        onClick={(e) => handleConfirmDelete(order._id, e)}
                        title="Удалить заказ"
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

          {orders.length > 0 && (
            <tfoot>
              <tr className="border-t border-slate-700/60 bg-slate-900/30">
                <td
                  colSpan={4}
                  className="p-4 text-xs text-slate-500 font-bold uppercase tracking-wider"
                >
                  Итоговый заказ: {orders.length}
                </td>
                <td className="p-4">
                  <div className="text-emerald-400 font-black font-mono">
                    Итого: {formatPrice(totalActiveSum)} сум
                  </div>
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div className="w-full h-120 rounded-xl overflow-hidden border border-slate-800 shadow-2xl mb-20">
        <MapContainer
          center={selectedLocation}
          zoom={14}
          className="w-full h-full"
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <RecenterMap center={selectedLocation} />
          {polylinePositions && (
            <Polyline
              positions={polylinePositions}
              pathOptions={{
                color: "#f59e0b",
                weight: 4,
                opacity: 0.8,
                dashArray: "6 8",
              }}
            />
          )}
          {courierLocation && routeOrder && (
            <Marker
              position={[courierLocation.lat, courierLocation.lng]}
              icon={createNumberedIcon("🚀", "#10b981")}
            />
          )}
          {routeOrder &&
            routeOrder.map((o, idx) => {
              const isSelected = selectedOrderId === o._id;
              const color = getStopColor(idx, routeOrder.length);
              return (
                <Marker
                  key={o._id}
                  position={[o.location.lat, o.location.lng]}
                  icon={createNumberedIcon(idx + 1, color, isSelected)}
                  eventHandlers={{ click: () => handleSelectOrder(o) }}
                />
              );
            })}
          {!routeOrder && <Marker position={selectedLocation} />}
        </MapContainer>
      </div>

      <ReceiptModal
        order={receiptOrder}
        onClose={() => setReceiptOrder(null)}
      />
    </div>
  );
};

export default ActiveOrders;