import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import axios from "../utils/axios";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const DISTRICTS = [
  "Yunusobod",
  "Chilonzor",
  "Mirzo Ulug'bek",
  "Yakkasaroy",
  "Shayxontohur",
  "Olmazor",
  "Uchtepa",
  "Sergeli",
  "Bektemir",
  "Yashnobod",
  "Mirobod",
  "Yangihayot",
];

// ─── Toast system ────────────────────────────────────────────────────────────
let _toastTimer = null;
const showToast = ({ title, sub, type = "success" }) => {
  // Remove existing toast
  const existing = document.getElementById("__app_toast__");
  if (existing) existing.remove();
  clearTimeout(_toastTimer);

  const colors = {
    success: { bg: "#14532d", border: "#166534", text: "#4ade80", icon: "✓" },
    error:   { bg: "#450a0a", border: "#7f1d1d", text: "#f87171", icon: "✕" },
  };
  const c = colors[type] || colors.success;

  const wrap = document.createElement("div");
  wrap.id = "__app_toast__";
  wrap.style.cssText = `
    position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%);
    z-index: 99999; display: flex; align-items: center; gap: 12px;
    padding: 14px 20px; min-width: 300px; max-width: 420px;
    background: #0f172a; border: 1px solid ${c.border};
    border-radius: 14px; color: #fff; font-size: 14px; font-weight: 500;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    animation: __toastIn__ 0.35s cubic-bezier(.22,1,.36,1) forwards;
    font-family: inherit;
  `;

  const style = document.createElement("style");
  style.textContent = `
    @keyframes __toastIn__  { from { opacity:0; transform:translateX(-50%) translateY(20px) scale(0.96); } to { opacity:1; transform:translateX(-50%) translateY(0) scale(1); } }
    @keyframes __toastOut__ { from { opacity:1; transform:translateX(-50%) translateY(0) scale(1); } to { opacity:0; transform:translateX(-50%) translateY(14px) scale(0.96); } }
    @keyframes __toastProg__{ from { width:100%; } to { width:0%; } }
  `;
  document.head.appendChild(style);

  wrap.innerHTML = `
    <div style="width:36px;height:36px;border-radius:50%;background:${c.bg};border:1px solid ${c.border};display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;color:${c.text};">${c.icon}</div>
    <div style="display:flex;flex-direction:column;gap:2px;flex:1;">
      <span style="font-size:14px;font-weight:700;color:${c.text};">${title}</span>
      ${sub ? `<span style="font-size:12px;color:#94a3b8;font-weight:400;">${sub}</span>` : ""}
    </div>
    <button onclick="this.closest('#__app_toast__').remove()" style="background:none;border:none;color:#64748b;cursor:pointer;font-size:20px;padding:2px 6px;border-radius:6px;line-height:1;margin-left:4px;">×</button>
    <div style="position:absolute;bottom:0;left:0;height:3px;background:${c.text};border-radius:0 0 14px 14px;animation:__toastProg__ 3s linear forwards;"></div>
  `;
  wrap.style.position = "fixed";

  document.body.appendChild(wrap);

  const hide = () => {
    const el = document.getElementById("__app_toast__");
    if (!el) return;
    el.style.animation = "__toastOut__ 0.3s ease forwards";
    setTimeout(() => el?.remove(), 300);
  };
  _toastTimer = setTimeout(hide, 3000);
};

// ─── Map helpers ─────────────────────────────────────────────────────────────

// Syncs main map position when position state changes from outside (shop select)
const MapPositionSync = ({ position }) => {
  const map = useMap();
  const prevPos = useRef(position);
  useEffect(() => {
    if (
      prevPos.current[0] !== position[0] ||
      prevPos.current[1] !== position[1]
    ) {
      map.flyTo(position, 15, { duration: 1 });
      prevPos.current = position;
    }
  }, [position, map]);
  return null;
};

const MapClickHandler = ({ onPositionChange }) => {
  useMapEvents({
    click(e) {
      onPositionChange([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
};

// ─── Component ───────────────────────────────────────────────────────────────
const CreateOrder = () => {
  const [shopName, setShopName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [phone, setPhone] = useState("");
  const [district, setDistrict] = useState("");

  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [shops, setShops] = useState([]);

  const [modalType, setModalType] = useState(null);

  const [position, setPosition] = useState([41.31108, 69.24056]);
  const [mapRef, setMapRef] = useState(null);
  const [geoStatus, setGeoStatus] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  // New shop modal state
  const [newShopName, setNewShopName] = useState("");
  const [newOwnerName, setNewOwnerName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newDistrict, setNewDistrict] = useState("");
  const [newShopPosition, setNewShopPosition] = useState([41.31108, 69.24056]);
  const [isSavingShop, setIsSavingShop] = useState(false);
  const [newShopError, setNewShopError] = useState("");

  // New agent modal state
  const [newAgentName, setNewAgentName] = useState("");
  const [newAgentPhone, setNewAgentPhone] = useState("");
  const [newAgentDistrict, setNewAgentDistrict] = useState("");
  const [newAgentPassword, setNewAgentPassword] = useState("");
  const [isSavingAgent, setIsSavingAgent] = useState(false);
  const [newAgentError, setNewAgentError] = useState("");

  // ─── Init GPS ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = [pos.coords.latitude, pos.coords.longitude];
        setPosition(coords);
        setNewShopPosition(coords);
        setGeoStatus("");
      },
      (err) => {
        console.warn("GPS:", err);
        setGeoStatus("⚠️ Пожалуйста, включите GPS!");
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  }, []);

  // Fly main map when mapRef mounts and position is already set
  useEffect(() => {
    if (mapRef) mapRef.flyTo(position, 15);
  }, [mapRef]);

  // ─── Data fetch ─────────────────────────────────────────────────────────
  useEffect(() => {
    axios
      .get("/products")
      .then((res) => setProducts(res.data.data))
      .catch((err) => console.error("Ошибка загрузки товаров:", err));
  }, []);

  useEffect(() => {
    axios
      .get("/shops")
      .then((res) => setShops(res.data.data))
      .catch((err) => console.error("Ошибка загрузки магазинов:", err));
  }, []);

  // ─── Phone formatting ───────────────────────────────────────────────────
  const formatPhoneDisplay = (digits) => {
    if (!digits) return "";
    let f = "+998";
    if (digits.length > 0) f += " " + digits.slice(0, 2);
    if (digits.length > 2) f += " " + digits.slice(2, 5);
    if (digits.length > 5) f += " " + digits.slice(5, 7);
    if (digits.length > 7) f += " " + digits.slice(7, 9);
    return f;
  };

  const toDigits = (val) => {
    let raw = String(val || "").replace(/\D/g, "");
    if (raw.startsWith("998")) raw = raw.slice(3);
    return raw.slice(0, 9);
  };

  const handlePhoneChange = (e) => setPhone(toDigits(e.target.value));
  const handleNewShopPhoneChange = (e) => setNewPhone(toDigits(e.target.value));
  const handleNewAgentPhoneChange = (e) => setNewAgentPhone(toDigits(e.target.value));

  // ─── Quantity ───────────────────────────────────────────────────────────
  const handleQuantityDecrement = () => setQuantity((p) => Math.max(1, Number(p) - 1));
  const handleQuantityIncrement = () => setQuantity((p) => Number(p) + 1);
  const handleQuantityChange = (e) => {
    const v = e.target.value.replace(/\D/g, "");
    setQuantity(v === "" ? "" : Math.max(1, Number(v)));
  };

  // ─── Select shop → auto-fill form + set map position ───────────────────
  const handleSelectShop = (shop) => {
    setShopName(shop.shopName);
    setOwnerName(shop.ownerName);
    setPhone(toDigits(shop.phone));

    // Auto-set map location if shop has one
    if (shop.location?.lat && shop.location?.lng) {
      setPosition([shop.location.lat, shop.location.lng]);
    }

    if (shop.district) {
      setDistrict(shop.district);
      setModalType(null);
    } else {
      setDistrict("");
      setModalType("district");
    }
  };

  // ─── Reset forms ────────────────────────────────────────────────────────
  const resetNewShopForm = () => {
    setNewShopName("");
    setNewOwnerName("");
    setNewPhone("");
    setNewDistrict("");
    setNewShopError("");
    // Reset mini-map to current GPS / default
    navigator.geolocation?.getCurrentPosition(
      (p) => setNewShopPosition([p.coords.latitude, p.coords.longitude]),
      () => setNewShopPosition([41.31108, 69.24056]),
      { enableHighAccuracy: true, timeout: 4000 }
    );
  };

  const resetNewAgentForm = () => {
    setNewAgentName("");
    setNewAgentPhone("");
    setNewAgentDistrict("");
    setNewAgentPassword("");
    setNewAgentError("");
  };

  // ─── Save new shop ──────────────────────────────────────────────────────
  const handleSaveNewShop = async () => {
    setNewShopError("");
    if (!newShopName.trim() || !newOwnerName.trim() || !newPhone || !newDistrict) {
      setNewShopError("Заполните все поля!");
      return;
    }
    if (newPhone.length < 9) {
      setNewShopError("Введите корректный номер телефона!");
      return;
    }

    const payload = {
      shopName: newShopName.trim(),
      ownerName: newOwnerName.trim(),
      phone: Number(newPhone),
      district: newDistrict,
      location: { lat: newShopPosition[0], lng: newShopPosition[1] },
    };

    setIsSavingShop(true);
    try {
      const res = await axios.post("/shops", payload);
      const saved = res?.data?.data || res?.data || payload;
      setShops((prev) => [saved, ...prev]);
      resetNewShopForm();
      setModalType(null);
      showToast({ title: "Магазин добавлен!", sub: newShopName.trim() });
    } catch (err) {
      console.error(err);
      setNewShopError("Не удалось сохранить магазин. Попробуйте снова!");
    } finally {
      setIsSavingShop(false);
    }
  };

  // ─── Save new agent ─────────────────────────────────────────────────────
  const handleSaveNewAgent = async () => {
    setNewAgentError("");
    if (!newAgentName.trim() || !newAgentPhone || !newAgentDistrict || !newAgentPassword.trim()) {
      setNewAgentError("Заполните все поля!");
      return;
    }
    if (newAgentPhone.length < 9) {
      setNewAgentError("Введите корректный номер телефона!");
      return;
    }
    if (newAgentPassword.trim().length < 4) {
      setNewAgentError("Пароль должен содержать минимум 4 символа!");
      return;
    }

    const payload = {
      name: newAgentName.trim(),
      phone: `+998${newAgentPhone}`,
      district: newAgentDistrict,
      password: newAgentPassword.trim(),
    };

    setIsSavingAgent(true);
    try {
      await axios.post("/agents", payload);
      const agentName = newAgentName.trim();
      resetNewAgentForm();
      setModalType(null);
      // Toast after modal closes so it's visible
      setTimeout(() => {
        showToast({ title: "Agent qo'shildi!", sub: `${agentName} muvaffaqiyatli saqlandi` });
      }, 150);
    } catch (err) {
      console.error(err);
      setNewAgentError(
        err?.response?.data?.message || "Не удалось сохранить агента. Попробуйте снова!"
      );
    } finally {
      setIsSavingAgent(false);
    }
  };

  // ─── Submit order ───────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProduct) { alert("Пожалуйста, выберите товар!"); return; }
    if (!district) { alert("Пожалуйста, выберите район!"); return; }

    const newOrder = {
      shopName,
      ownerName,
      product: selectedProduct._id,
      quantity: Number(quantity),
      phone: Number(phone),
      district,
      location: { lat: position[0], lng: position[1] },
      status: "berilmoqda",
    };

    try {
      await axios.post("/order", newOrder);
      setShopName(""); setOwnerName(""); setQuantity(1);
      setPhone(""); setDistrict(""); setSelectedProduct(null);
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 4000);
    } catch {
      alert("Ошибка при отправке заказа!");
    }
  };

  // ─── Shared input classes ────────────────────────────────────────────────
  const inputCls = "w-full px-4 py-3 bg-slate-900/60 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-cyan-500/40";
  const modalInputCls = "w-full px-3.5 py-3 bg-slate-900/60 border border-slate-700 rounded-xl text-slate-200 outline-none focus:border-cyan-500/50";

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto p-2">
      {/* Header */}
      <div className="mb-6 backdrop-blur-sm p-1 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black bg-linear-to-r from-cyan-400 via-blue-400 to-white bg-clip-text text-transparent tracking-wide drop-shadow-[0_2px_8px_rgba(34,211,238,0.15)]">
            Создание нового заказа 🚀
          </h1>
          <p className="text-sm text-slate-500 mt-1.5 font-medium leading-relaxed">
            Карта <span className="text-cyan-500 font-bold">автоматически</span> определит ваше местоположение.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap shrink-0">
          <button
            type="button"
            onClick={() => { resetNewAgentForm(); setModalType("newAgent"); }}
            className="shrink-0 inline-flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm text-white bg-linear-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 shadow-lg shadow-violet-900/30 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="text-lg leading-none">＋</span>
            Добавить нового агента
          </button>

          <button
            type="button"
            onClick={() => { resetNewShopForm(); setModalType("newShop"); }}
            className="shrink-0 inline-flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm text-white bg-linear-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-lg shadow-cyan-900/30 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="text-lg leading-none">＋</span>
            Добавить новый магазин
          </button>
        </div>
      </div>

      {isSuccess && (
        <div className="mb-6 p-4 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 rounded-xl flex items-center gap-3">
          <span>✅</span> <span className="font-semibold">Успешно!</span> Заказ сохранён.
        </div>
      )}

      {/* Order form */}
      <form
        onSubmit={handleSubmit}
        className="bg-[#0f111a] border border-slate-800/80 rounded-2xl p-6 shadow-2xl flex flex-col gap-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Shop name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">
              Название магазина 🏪
            </label>
            <div className="relative">
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="Novita Market"
                className="w-full pl-4 pr-11 py-3 bg-slate-900/60 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-cyan-500/40"
                required
              />
              <button
                type="button"
                onClick={() => setModalType("shop")}
                title="Выбрать из сохранённых магазинов"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-slate-800 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2M9 12v.01M9 16v.01M9 8h6" />
                </svg>
              </button>
            </div>
          </div>

          {/* Owner name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">
              Имя владельца 👤
            </label>
            <input type="text" value={ownerName} onChange={(e) => setOwnerName(e.target.value)}
              placeholder="Имя и фамилия" className={inputCls} required />
          </div>

          {/* Phone */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">
              Номер телефона 📞
            </label>
            <input type="tel" value={formatPhoneDisplay(phone)} onChange={handlePhoneChange}
              placeholder="+998 90 123 45 67" className={inputCls} required />
          </div>

          {/* District */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">
              Район 📍
            </label>
            <div
              onClick={() => setModalType("district")}
              className={`w-full px-4 py-3 bg-slate-900/60 border rounded-xl cursor-pointer font-medium transition-all ${
                district ? "border-cyan-500/40 text-slate-200" : "border-slate-800 text-slate-500 hover:border-cyan-500/30"
              }`}
            >
              {district ? `📍 ${district}` : "Выберите район..."}
            </div>
          </div>

          {/* Product + Quantity */}
          <div className="grid grid-cols-3 gap-3 md:col-span-2">
            <div className="col-span-2 flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">
                Товар 📦
              </label>
              <div
                onClick={() => setModalType("product")}
                className="w-full px-4 py-3 bg-slate-900/60 border border-slate-800 rounded-xl text-slate-200 cursor-pointer hover:border-cyan-500/40 font-medium"
              >
                {selectedProduct ? selectedProduct.name : "Выберите товар..."}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">
                Кол-во 🔢
              </label>
              <div className="flex items-center bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden h-12.5">
                <button type="button" onClick={handleQuantityDecrement}
                  className="w-11 h-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all text-xl font-bold shrink-0 border-r border-slate-800">
                  −
                </button>
                <input type="text" inputMode="numeric" value={quantity} onChange={handleQuantityChange}
                  className="flex-1 h-full bg-transparent text-slate-200 text-center outline-none font-bold text-base" required />
                <button type="button" onClick={handleQuantityIncrement}
                  className="w-11 h-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all text-xl font-bold shrink-0 border-l border-slate-800">
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        {geoStatus && (
          <div className="p-4 bg-amber-950/40 border border-amber-500/30 text-amber-400 rounded-xl text-sm">
            {geoStatus}
          </div>
        )}

        {/* Main map */}
        <div className="w-full h-90 rounded-xl overflow-hidden border border-slate-800 relative z-0">
          <MapContainer center={position} zoom={13} className="w-full h-full" whenCreated={setMapRef}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapPositionSync position={position} />
            <MapClickHandler onPositionChange={setPosition} />
            <Marker position={position} />
          </MapContainer>
        </div>

        {/* Submit */}
        <div className="flex justify-end mt-2">
          <button
            type="submit"
            className="relative px-10 py-4 rounded-xl font-black text-base tracking-wide text-white overflow-hidden group transition-all duration-300 shadow-lg shadow-emerald-900/40 hover:shadow-emerald-500/30 hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, #059669 0%, #0891b2 50%, #7c3aed 100%)" }}
          >
            <span className="relative z-10 flex items-center gap-2">✅ Оформить и сохранить заказ</span>
            <span
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: "linear-gradient(135deg, #10b981 0%, #06b6d4 50%, #8b5cf6 100%)" }}
            />
          </button>
        </div>
      </form>

      {/* ─── Modals ────────────────────────────────────────────────────────── */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div
            className={`bg-[#151921] w-full rounded-2xl p-6 border border-slate-700 shadow-2xl transition-all ${
              modalType === "newShop" ? "max-w-lg" :
              modalType === "newAgent" ? "max-w-md" : "max-w-sm"
            }`}
          >
            <h2 className="text-xl text-white font-bold mb-4">
              {modalType === "product"  ? "Выберите товар"   :
               modalType === "shop"    ? "Выберите магазин" :
               modalType === "newShop" ? "Новый магазин"    :
               modalType === "newAgent"? "Новый агент"      : "Выберите район"}
            </h2>

            {/* Products */}
            {modalType === "product" && (
              products.length === 0
                ? <p className="text-sm text-slate-500 text-center py-6">Товары не найдены.</p>
                : <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
                    {products.map((p) => (
                      <button key={p._id}
                        onClick={() => { setSelectedProduct(p); setModalType(null); }}
                        className="p-3 text-left bg-slate-800 hover:bg-cyan-900 rounded-lg text-white font-medium transition">
                        {p.name}
                      </button>
                    ))}
                  </div>
            )}

            {/* Shops */}
            {modalType === "shop" && (
              shops.length === 0
                ? <p className="text-sm text-slate-500 text-center py-6">Сохранённых магазинов пока нет.</p>
                : <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
                    {shops.map((s) => (
                      <button key={s._id} onClick={() => handleSelectShop(s)}
                        className="p-3 text-left bg-slate-800 hover:bg-cyan-900 rounded-lg text-white transition">
                        <div className="font-bold">{s.shopName}</div>
                        <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                          <span>{s.ownerName}</span>
                          <span>•</span>
                          <span>{formatPhoneDisplay(toDigits(s.phone))}</span>
                          {s.district
                            ? <span className="text-cyan-400">📍 {s.district}</span>
                            : <span className="text-slate-600 italic">район не указан</span>}
                          {s.location?.lat
                            ? <span className="text-emerald-400">🗺 location bor</span>
                            : <span className="text-slate-600 italic">location yo'q</span>}
                        </div>
                      </button>
                    ))}
                  </div>
            )}

            {/* Districts */}
            {modalType === "district" && (
              <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
                {DISTRICTS.map((d) => (
                  <button key={d}
                    onClick={() => { setDistrict(d); setModalType(null); }}
                    className={`p-3 text-left rounded-lg text-white font-medium transition ${
                      district === d ? "bg-cyan-700 border border-cyan-500" : "bg-slate-800 hover:bg-cyan-900"
                    }`}>
                    📍 {d}
                  </button>
                ))}
              </div>
            )}

            {/* ── New shop modal ── */}
            {modalType === "newShop" && (
              <div className="flex flex-col gap-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Магазин 🏪</label>
                    <input type="text" autoFocus value={newShopName}
                      onChange={(e) => setNewShopName(e.target.value)}
                      placeholder="Novita Market" className={modalInputCls} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Владелец 👤</label>
                    <input type="text" value={newOwnerName}
                      onChange={(e) => setNewOwnerName(e.target.value)}
                      placeholder="Имя и фамилия" className={modalInputCls} />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Номер телефона 📞</label>
                  <input type="tel" value={formatPhoneDisplay(newPhone)}
                    onChange={handleNewShopPhoneChange}
                    placeholder="+998 90 123 45 67" className={modalInputCls} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Район 📍</label>
                  <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto p-1">
                    {DISTRICTS.map((d) => (
                      <button key={d} type="button" onClick={() => setNewDistrict(d)}
                        className={`px-2.5 py-2 rounded-lg text-xs font-bold text-left transition-all ${
                          newDistrict === d
                            ? "bg-cyan-600 text-white border border-cyan-400"
                            : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-white"
                        }`}>
                        📍 {d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mini map for shop location */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">
                    Местоположение магазина 🗺
                  </label>
                  <p className="text-xs text-slate-500 pl-1 -mt-1">Xaritaga bosib aniq joyni belgilang</p>
                  <div className="w-full h-48 rounded-xl overflow-hidden border border-slate-700 relative z-0">
                    <MapContainer center={newShopPosition} zoom={14} className="w-full h-full">
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <MapClickHandler onPositionChange={setNewShopPosition} />
                      <Marker position={newShopPosition} />
                    </MapContainer>
                  </div>
                  <p className="text-xs text-slate-600 pl-1">
                    {newShopPosition[0].toFixed(5)}, {newShopPosition[1].toFixed(5)}
                  </p>
                </div>

                {newShopError && (
                  <div className="px-3 py-2 bg-rose-950/40 border border-rose-500/30 text-rose-400 text-xs font-semibold rounded-lg">
                    ⚠️ {newShopError}
                  </div>
                )}

                <button type="button" onClick={handleSaveNewShop} disabled={isSavingShop}
                  className="mt-1 w-full py-3 rounded-xl font-black text-sm text-white bg-linear-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 shadow-lg shadow-emerald-900/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                  {isSavingShop ? "Сохранение..." : "✅ Сохранить магазин"}
                </button>
              </div>
            )}

            {/* ── New agent modal ── */}
            {modalType === "newAgent" && (
              <div className="flex flex-col gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Имя агента 👤</label>
                  <input type="text" autoFocus value={newAgentName}
                    onChange={(e) => setNewAgentName(e.target.value)}
                    placeholder="Имя и фамилия"
                    className="w-full px-3.5 py-3 bg-slate-900/60 border border-slate-700 rounded-xl text-slate-200 outline-none focus:border-violet-500/50" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Номер телефона 📞</label>
                  <input type="tel" value={formatPhoneDisplay(newAgentPhone)}
                    onChange={handleNewAgentPhoneChange}
                    placeholder="+998 90 123 45 67"
                    className="w-full px-4 py-3 bg-slate-900/60 border border-slate-700 rounded-xl text-slate-200 outline-none focus:border-violet-500/50" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Пароль 🔒</label>
                  <input type="password" value={newAgentPassword}
                    onChange={(e) => setNewAgentPassword(e.target.value)}
                    placeholder="Минимум 4 символа"
                    className="w-full px-4 py-3 bg-slate-900/60 border border-slate-700 rounded-xl text-slate-200 outline-none focus:border-violet-500/50" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Район 📍</label>
                  <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto p-1">
                    {DISTRICTS.map((d) => (
                      <button key={d} type="button" onClick={() => setNewAgentDistrict(d)}
                        className={`px-2.5 py-2 rounded-lg text-xs font-bold text-left transition-all ${
                          newAgentDistrict === d
                            ? "bg-violet-600 text-white border border-violet-400"
                            : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-white"
                        }`}>
                        📍 {d}
                      </button>
                    ))}
                  </div>
                </div>

                {newAgentError && (
                  <div className="px-3 py-2 bg-rose-950/40 border border-rose-500/30 text-rose-400 text-xs font-semibold rounded-lg">
                    ⚠️ {newAgentError}
                  </div>
                )}

                <button type="button" onClick={handleSaveNewAgent} disabled={isSavingAgent}
                  className="mt-1 w-full py-3 rounded-xl font-black text-sm text-white bg-linear-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 shadow-lg shadow-violet-900/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                  {isSavingAgent ? "Сохранение..." : "✅ Сохранить агента"}
                </button>
              </div>
            )}

            <button
              onClick={() => setModalType(null)}
              className="mt-4 w-full py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition">
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateOrder;