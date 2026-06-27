import { useState, useEffect, useRef } from "react";
import LocationPicker from "./LocationPicker";

const tg = window.Telegram?.WebApp;
const fmt = (n) => (n || 0).toLocaleString("ru-RU");

const groupByCategory = (products) => {
  const map = {};
  products.forEach((p) => {
    const cat = p.category || "Mahsulotlar";
    if (!map[cat]) map[cat] = [];
    map[cat].push(p);
  });
  return map;
};

const T = {
  uz: {
    loading: "Yuklanmoqda",
    noProducts: "Mahsulotlar mavjud emas",
    qty: "Miqdor",
    total: "Jami",
    order: "Buyurtma berish",
    viewCart: "Savatni ko'rish",
    per: "dona",
    currency: "so'm",
    changeLang: "RU",
    pickLocation: "📍 Joylashuvni belgilang",
    cartTitle: "Savat",
    cartEmpty: "Savat bo'sh",
    itemsCount: (n) => `${n} ta mahsulot`,
    addToCart: "Savatga qo'shish",
    updateCart: "Saqlash",
    removeItem: "O'chirish",
    closeSheet: "Yopish",
  },
  ru: {
    loading: "Загрузка",
    noProducts: "Товаров нет",
    qty: "Количество",
    total: "Итого",
    order: "Оформить заказ",
    viewCart: "Посмотреть корзину",
    per: "шт",
    currency: "сум",
    changeLang: "UZ",
    pickLocation: "📍 Укажите местоположение",
    cartTitle: "Корзина",
    cartEmpty: "Корзина пуста",
    itemsCount: (n) => `${n} товара`,
    addToCart: "В корзину",
    updateCart: "Сохранить",
    removeItem: "Удалить",
    closeSheet: "Закрыть",
  },
};

export default function MiniApp() {
  const [products, setProducts] = useState([]);
  // savat: { [productId]: quantity }
  const [cart, setCart] = useState({});
  const [selected, setSelected] = useState(null); // sheet ichida tahrirlanayotgan mahsulot
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [lang, setLang] = useState("uz");
  const [activeCategory, setActiveCategory] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMounted, setSheetMounted] = useState(false);
  const [cartSheetOpen, setCartSheetOpen] = useState(false);
  const [cartSheetMounted, setCartSheetMounted] = useState(false);
  // LocationPicker sahifasini ko'rsatish uchun
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const catRefs = useRef({});
  const tabsRef = useRef(null);

  const tx = T[lang];
  const productMap = useRef({});

  useEffect(() => {
    tg?.ready();
    tg?.expand();
    const params = new URLSearchParams(window.location.search);
    const l = params.get("lang");
    if (l === "ru" || l === "uz") setLang(l);

    fetch("https://novita-backend-production.up.railway.app/api/bot/products")
      .then((r) => r.json())
      .then((d) => {
        const data = d.data || [];
        setProducts(data);
        productMap.current = Object.fromEntries(data.map((p) => [p._id, p]));
        const cats = [...new Set(data.map((p) => p.category || "Mahsulotlar"))];
        setActiveCategory(cats[0] || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const grouped = groupByCategory(products);
  const categories = Object.keys(grouped);

  // ----- Savat hisob-kitoblari -----
  const cartEntries = Object.entries(cart).filter(([, qty]) => qty > 0);
  const cartCount = cartEntries.reduce((sum, [, qty]) => sum + qty, 0);
  const cartTotal = cartEntries.reduce((sum, [id, qty]) => {
    const p = productMap.current[id];
    return sum + (p?.price || 0) * qty;
  }, 0);

  const setCartQty = (productId, qty) => {
    setCart((prev) => {
      const next = { ...prev };
      if (qty <= 0) {
        delete next[productId];
      } else {
        next[productId] = qty;
      }
      return next;
    });
  };

  // ----- Mahsulot sheet (bitta mahsulot miqdorini tanlash) -----
  const openSheet = (product) => {
    setSelected(product);
    setQuantity(cart[product._id] || 1);
    setSheetMounted(true);
    requestAnimationFrame(() => setSheetOpen(true));
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setTimeout(() => {
      setSheetMounted(false);
      setSelected(null);
    }, 300);
  };

  const confirmAddToCart = () => {
    if (!selected) return;
    setCartQty(selected._id, quantity);
    closeSheet();
  };

  const removeSelectedFromCart = () => {
    if (!selected) return;
    setCartQty(selected._id, 0);
    closeSheet();
  };

  // ----- Savat sheet -----
  const openCartSheet = () => {
    setCartSheetMounted(true);
    requestAnimationFrame(() => setCartSheetOpen(true));
  };

  const closeCartSheet = () => {
    setCartSheetOpen(false);
    setTimeout(() => setCartSheetMounted(false), 300);
  };

  // 1-qadam: foydalanuvchi savatdan "Buyurtma berish" bosadi
  // Sheet yopiladi va LocationPicker ochiladi
  const handleOrder = () => {
    if (cartEntries.length === 0) return;
    closeCartSheet();
    setTimeout(() => setShowLocationPicker(true), 350);
  };

  // 2-qadam: LocationPicker dan koordinatlar keladi
  // Bot ga type:"order" + savat (items) + location birgalikda yuboriladi
  const handleLocationConfirm = ({ lat, lng }) => {
    if (cartEntries.length === 0) return;
    setSending(true);
    tg?.sendData(
      JSON.stringify({
        type: "order",
        items: cartEntries.map(([productId, qty]) => ({
          productId,
          quantity: qty,
        })),
        lat,
        lng,
      })
    );
  };

  const scrollToCategory = (cat) => {
    setActiveCategory(cat);
    catRefs.current[cat]?.scrollIntoView({ behavior: "smooth", block: "start" });
    const tabEl = tabsRef.current?.querySelector(`[data-cat="${cat}"]`);
    tabEl?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  };

  // LocationPicker ekrani
  if (showLocationPicker) {
    return (
      <LocationPicker
        lang={lang}
        onConfirm={handleLocationConfirm}
      />
    );
  }

  if (loading) {
    return (
      <>
        <style>{`
          @keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:1} }
          .sk { background:#f0f0f0; border-radius:16px; animation:pulse 1.4s ease infinite; }
        `}</style>
        <div style={{ background: "#fff", minHeight: "100vh", padding: "20px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <div className="sk" style={{ width: 40, height: 40, borderRadius: "50%" }} />
            <div>
              <div className="sk" style={{ width: 120, height: 14, marginBottom: 6 }} />
              <div className="sk" style={{ width: 80, height: 11 }} />
            </div>
          </div>
          <div className="sk" style={{ height: 36, marginBottom: 20, borderRadius: 24 }} />
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ display: "flex", gap: 12, marginBottom: 12 }}>
              <div className="sk" style={{ width: 90, height: 90, borderRadius: 16, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="sk" style={{ height: 14, marginBottom: 8, width: "70%" }} />
                <div className="sk" style={{ height: 11, marginBottom: 8, width: "90%" }} />
                <div className="sk" style={{ height: 28, width: 100, borderRadius: 20 }} />
              </div>
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
        body { background: #f7f7f8; }

        .header {
          position: sticky; top: 0; z-index: 30;
          background: #fff;
          padding: 14px 16px 12px;
          border-bottom: 1px solid #f0f0f0;
          display: flex; align-items: center; gap: 12px;
        }
        .header-logo {
          width: 38px; height: 38px; border-radius: 12px;
          background: #FFCC00; display: flex; align-items: center; justify-content: center;
          font-size: 18px; flex-shrink: 0;
        }
        .header-title { font-size: 17px; font-weight: 800; color: #111; letter-spacing: -0.3px; flex: 1; }
        .header-sub { font-size: 12px; color: #999; margin-top: 1px; }
        .lang-btn {
          background: #f5f5f5; border: none; padding: 6px 12px;
          border-radius: 20px; font-size: 12px; font-weight: 700;
          color: #555; cursor: pointer; transition: background .15s;
        }
        .lang-btn:active { background: #e8e8e8; }

        .tabs-wrap {
          position: sticky; top: 65px; z-index: 20;
          background: #fff; border-bottom: 1px solid #f0f0f0;
          padding: 10px 0;
        }
        .tabs {
          display: flex; gap: 8px; overflow-x: auto; padding: 0 16px;
          scrollbar-width: none;
        }
        .tabs::-webkit-scrollbar { display: none; }
        .tab {
          flex-shrink: 0; padding: 7px 16px; border-radius: 24px;
          font-size: 13px; font-weight: 700; cursor: pointer;
          transition: all .2s; border: none;
          background: #f3f3f3; color: #777;
        }
        .tab.active { background: #FFCC00; color: #111; }

        .section-title {
          font-size: 20px; font-weight: 900; color: #111;
          letter-spacing: -0.4px; padding: 20px 16px 10px;
        }

        .card {
          display: flex; gap: 0; margin: 0 16px 10px;
          background: #fff; border-radius: 20px; overflow: hidden;
          border: none; cursor: pointer;
          transition: transform .15s;
          -webkit-tap-highlight-color: transparent;
          position: relative;
        }
        .card:active { transform: scale(0.98); }

        .card-img {
          width: 100px; height: 100px; flex-shrink: 0;
          object-fit: cover; background: #f5f5f5;
        }
        .card-img-placeholder {
          width: 100px; height: 100px; flex-shrink: 0;
          background: #f9f9f9; display: flex; align-items: center;
          justify-content: center; font-size: 32px;
        }
        .card-body {
          flex: 1; padding: 12px 14px 12px 12px;
          display: flex; flex-direction: column; justify-content: space-between;
          min-width: 0;
        }
        .card-name {
          font-size: 14px; font-weight: 800; color: #111;
          line-height: 1.35; margin-bottom: 4px;
          display: -webkit-box; -webkit-line-clamp: 2;
          -webkit-box-orient: vertical; overflow: hidden;
        }
        .card-desc {
          font-size: 12px; color: #aaa; line-height: 1.4;
          display: -webkit-box; -webkit-line-clamp: 2;
          -webkit-box-orient: vertical; overflow: hidden;
          margin-bottom: 8px; flex: 1;
        }
        .card-footer { display: flex; align-items: center; justify-content: space-between; }
        .card-price { font-size: 14px; font-weight: 800; color: #111; }

        .card-add {
          width: 32px; height: 32px; border-radius: 10px;
          background: #FFCC00; border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          font-size: 20px; font-weight: 400; color: #111;
          transition: transform .15s; flex-shrink: 0;
        }
        .card-add:active { transform: scale(0.9); }

        .card-qty-pill {
          display: flex; align-items: center; gap: 8px;
          background: #111; border-radius: 10px;
          padding: 4px 6px; flex-shrink: 0;
        }
        .card-qty-pill button {
          width: 22px; height: 22px; border-radius: 7px;
          border: none; background: rgba(255,255,255,0.12);
          color: #fff; font-size: 15px; font-weight: 700;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: transform .1s, background .15s;
        }
        .card-qty-pill button:active { transform: scale(0.85); background: rgba(255,255,255,0.22); }
        .card-qty-pill button.plus { background: #FFCC00; color: #111; }
        .card-qty-pill .card-qty-num {
          color: #fff; font-size: 13px; font-weight: 800;
          min-width: 16px; text-align: center;
        }

        .card.in-cart::after {
          content: ''; position: absolute; inset: 0;
          border-radius: 20px; border: 2px solid #FFCC00;
          pointer-events: none;
        }

        .backdrop {
          position: fixed; inset: 0; z-index: 40;
          background: rgba(0,0,0,0); backdrop-filter: blur(0px);
          transition: background .3s, backdrop-filter .3s;
        }
        .backdrop.open { background: rgba(0,0,0,0.35); backdrop-filter: blur(2px); }

        .sheet {
          position: fixed; bottom: 0; left: 0; right: 0; z-index: 50;
          background: #fff; border-radius: 28px 28px 0 0;
          padding: 0 0 env(safe-area-inset-bottom, 0);
          transform: translateY(110%);
          transition: transform .32s cubic-bezier(0.34, 1.1, 0.64, 1);
          max-height: 88vh; display: flex; flex-direction: column;
        }
        .sheet.open { transform: translateY(0); }

        .sheet-handle {
          width: 36px; height: 4px; background: #e0e0e0;
          border-radius: 2px; margin: 12px auto 16px; flex-shrink: 0;
        }
        .sheet-inner { padding: 0 20px 24px; overflow-y: auto; }

        .sheet-product { display: flex; gap: 14px; margin-bottom: 20px; }
        .sheet-img {
          width: 72px; height: 72px; border-radius: 16px;
          object-fit: cover; background: #f5f5f5; flex-shrink: 0;
        }
        .sheet-img-placeholder {
          width: 72px; height: 72px; border-radius: 16px;
          background: #f9f9f9; display: flex; align-items: center;
          justify-content: center; font-size: 28px; flex-shrink: 0;
        }
        .sheet-name { font-size: 16px; font-weight: 800; color: #111; line-height: 1.3; margin-bottom: 4px; }
        .sheet-price-sub { font-size: 13px; color: #999; }

        .qty-row {
          display: flex; align-items: center; justify-content: space-between;
          background: #f7f7f8; border-radius: 16px;
          padding: 12px 16px; margin-bottom: 16px;
        }
        .qty-label { font-size: 13px; font-weight: 700; color: #777; }
        .qty-controls { display: flex; align-items: center; gap: 16px; }
        .qty-btn {
          width: 36px; height: 36px; border-radius: 12px;
          border: none; cursor: pointer; display: flex;
          align-items: center; justify-content: center;
          font-size: 20px; font-weight: 700; transition: transform .1s;
        }
        .qty-btn:active { transform: scale(0.88); }
        .qty-btn.minus { background: #fff; color: #333; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
        .qty-btn.plus { background: #FFCC00; color: #111; }
        .qty-num { font-size: 20px; font-weight: 900; color: #111; min-width: 28px; text-align: center; }

        .total-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 4px; margin-bottom: 16px;
        }
        .total-label { font-size: 14px; color: #999; font-weight: 600; }
        .total-amount { font-size: 18px; font-weight: 900; color: #111; }

        .sheet-actions { display: flex; gap: 10px; }

        .order-btn {
          width: 100%; padding: 16px; border-radius: 18px;
          background: #FFCC00; border: none; cursor: pointer;
          font-size: 15px; font-weight: 900; color: #111;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: transform .15s, opacity .15s;
          letter-spacing: -0.2px;
        }
        .order-btn:active { transform: scale(0.98); }
        .order-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .remove-btn {
          padding: 16px 18px; border-radius: 18px;
          background: #fdecec; border: none; cursor: pointer;
          font-size: 14px; font-weight: 800; color: #e74c3c;
          transition: transform .15s;
          flex-shrink: 0;
        }
        .remove-btn:active { transform: scale(0.96); }

        .float-bar {
          position: fixed; bottom: 16px; left: 16px; right: 16px; z-index: 35;
          background: #111; border-radius: 18px;
          padding: 14px 18px;
          display: flex; align-items: center;
          cursor: pointer; transition: transform .15s;
          box-shadow: 0 8px 24px rgba(0,0,0,.18);
        }
        .float-bar:active { transform: scale(0.98); }
        .float-badge {
          background: #FFCC00; color: #111;
          width: 26px; height: 26px; border-radius: 8px;
          font-size: 13px; font-weight: 900;
          display: flex; align-items: center; justify-content: center;
          margin-right: 12px; flex-shrink: 0;
          animation: pop .25s ease;
        }
        @keyframes pop {
          0% { transform: scale(0.6); }
          60% { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
        .float-label { color: #fff; font-size: 14px; font-weight: 800; flex: 1; }
        .float-price { color: #FFCC00; font-size: 14px; font-weight: 900; }

        .float-bar-enter {
          animation: slideUp .3s cubic-bezier(0.34, 1.1, 0.64, 1);
        }
        @keyframes slideUp {
          from { transform: translateY(120%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner {
          width: 18px; height: 18px; border-radius: 50%;
          border: 2.5px solid rgba(0,0,0,.2);
          border-top-color: #111; animation: spin .7s linear infinite;
        }
        .main-content { padding-bottom: 100px; }

        /* Savat ro'yxati */
        .cart-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 18px; }
        .cart-row {
          display: flex; align-items: center; gap: 12px;
          background: #f7f7f8; border-radius: 16px; padding: 10px 12px;
          animation: fadeIn .25s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .cart-row-img {
          width: 50px; height: 50px; border-radius: 12px;
          object-fit: cover; background: #eee; flex-shrink: 0;
        }
        .cart-row-img-placeholder {
          width: 50px; height: 50px; border-radius: 12px;
          background: #eee; display: flex; align-items: center;
          justify-content: center; font-size: 22px; flex-shrink: 0;
        }
        .cart-row-body { flex: 1; min-width: 0; }
        .cart-row-name {
          font-size: 13px; font-weight: 800; color: #111;
          margin-bottom: 2px;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .cart-row-price { font-size: 12px; color: #999; font-weight: 600; }
        .cart-row-controls {
          display: flex; align-items: center; gap: 8px; flex-shrink: 0;
        }
        .cart-row-controls button {
          width: 26px; height: 26px; border-radius: 8px;
          border: none; cursor: pointer; display: flex;
          align-items: center; justify-content: center;
          font-size: 16px; font-weight: 700; transition: transform .1s;
          background: #fff; color: #333; box-shadow: 0 1px 3px rgba(0,0,0,.08);
        }
        .cart-row-controls button.plus { background: #FFCC00; color: #111; box-shadow:none; }
        .cart-row-controls button:active { transform: scale(0.85); }
        .cart-row-qty { font-size: 13px; font-weight: 800; color: #111; min-width: 16px; text-align: center; }

        .cart-empty {
          text-align: center; padding: 40px 20px; color: #aaa;
        }
      `}</style>

      {/* HEADER */}
      <div className="header">
        <div className="header-logo">🍕</div>
        <div style={{ flex: 1 }}>
          <div className="header-title">
            {lang === "uz" ? "Buyurtma berish" : "Оформить заказ"}
          </div>
          <div className="header-sub">
            {lang === "uz" ? "Mahsulot tanlang" : "Выберите товар"}
          </div>
        </div>
        <button className="lang-btn" onClick={() => setLang(lang === "uz" ? "ru" : "uz")}>
          {tx.changeLang}
        </button>
      </div>

      {/* CATEGORY TABS */}
      {categories.length > 1 && (
        <div className="tabs-wrap">
          <div className="tabs" ref={tabsRef}>
            {categories.map((cat) => (
              <button
                key={cat}
                data-cat={cat}
                className={`tab${activeCategory === cat ? " active" : ""}`}
                onClick={() => scrollToCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* PRODUCTS */}
      <div className="main-content">
        {categories.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#aaa" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🍽️</div>
            <p style={{ fontSize: 14, fontWeight: 600 }}>{tx.noProducts}</p>
          </div>
        ) : (
          categories.map((cat) => (
            <section key={cat} ref={(el) => (catRefs.current[cat] = el)}>
              {categories.length > 1 && (
                <div className="section-title">{cat}</div>
              )}
              <div style={{ paddingTop: categories.length === 1 ? 12 : 0 }}>
                {grouped[cat].map((p) => {
                  const inCartQty = cart[p._id] || 0;
                  return (
                    <div
                      key={p._id}
                      className={`card${inCartQty > 0 ? " in-cart" : ""}`}
                      onClick={() => openSheet(p)}
                    >
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="card-img" />
                      ) : (
                        <div className="card-img-placeholder">🍕</div>
                      )}
                      <div className="card-body">
                        <div>
                          <div className="card-name">{p.name}</div>
                          {p.description && (
                            <div className="card-desc">{p.description}</div>
                          )}
                        </div>
                        <div className="card-footer">
                          <div className="card-price">
                            {p.price > 0 ? `${fmt(p.price)} ${tx.currency}` : "—"}
                          </div>
                          {inCartQty > 0 ? (
                            <div
                              className="card-qty-pill"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => setCartQty(p._id, inCartQty - 1)}
                              >
                                −
                              </button>
                              <span className="card-qty-num">{inCartQty}</span>
                              <button
                                className="plus"
                                onClick={() => setCartQty(p._id, inCartQty + 1)}
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              className="card-add"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCartQty(p._id, 1);
                              }}
                            >
                              +
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>

      {/* MAHSULOT SHEET (bitta mahsulot miqdorini tahrirlash) */}
      {sheetMounted && (
        <>
          <div
            className={`backdrop${sheetOpen ? " open" : ""}`}
            onClick={closeSheet}
          />
          <div className={`sheet${sheetOpen ? " open" : ""}`}>
            <div className="sheet-handle" />
            <div className="sheet-inner">
              <div className="sheet-product">
                {selected?.image ? (
                  <img src={selected.image} alt={selected.name} className="sheet-img" />
                ) : (
                  <div className="sheet-img-placeholder">🍕</div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="sheet-name">{selected?.name}</div>
                  {selected?.description && (
                    <div style={{ fontSize: 12, color: "#bbb", marginBottom: 6, lineHeight: 1.4 }}>
                      {selected.description}
                    </div>
                  )}
                  {selected?.price > 0 && (
                    <div className="sheet-price-sub">
                      {fmt(selected.price)} {tx.currency} / {tx.per}
                    </div>
                  )}
                </div>
              </div>

              <div className="qty-row">
                <span className="qty-label">{tx.qty}</span>
                <div className="qty-controls">
                  <button
                    className="qty-btn minus"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  >−</button>
                  <span className="qty-num">{quantity}</span>
                  <button
                    className="qty-btn plus"
                    onClick={() => setQuantity((q) => q + 1)}
                  >+</button>
                </div>
              </div>

              {selected?.price > 0 && (
                <div className="total-row">
                  <span className="total-label">{tx.total}</span>
                  <span className="total-amount">
                    {fmt((selected.price || 0) * quantity)} {tx.currency}
                  </span>
                </div>
              )}

              <div className="sheet-actions">
                {cart[selected?._id] > 0 && (
                  <button className="remove-btn" onClick={removeSelectedFromCart}>
                    {tx.removeItem}
                  </button>
                )}
                <button className="order-btn" onClick={confirmAddToCart}>
                  <span>{cart[selected?._id] > 0 ? tx.updateCart : tx.addToCart}</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* SAVAT SHEET */}
      {cartSheetMounted && (
        <>
          <div
            className={`backdrop${cartSheetOpen ? " open" : ""}`}
            onClick={closeCartSheet}
          />
          <div className={`sheet${cartSheetOpen ? " open" : ""}`}>
            <div className="sheet-handle" />
            <div className="sheet-inner">
              <div style={{ fontSize: 18, fontWeight: 900, color: "#111", marginBottom: 16 }}>
                {tx.cartTitle}
              </div>

              {cartEntries.length === 0 ? (
                <div className="cart-empty">
                  <div style={{ fontSize: 40, marginBottom: 8 }}>🛒</div>
                  <p style={{ fontSize: 14, fontWeight: 600 }}>{tx.cartEmpty}</p>
                </div>
              ) : (
                <>
                  <div className="cart-list">
                    {cartEntries.map(([productId, qty]) => {
                      const p = productMap.current[productId];
                      if (!p) return null;
                      return (
                        <div key={productId} className="cart-row">
                          {p.image ? (
                            <img src={p.image} alt={p.name} className="cart-row-img" />
                          ) : (
                            <div className="cart-row-img-placeholder">🍕</div>
                          )}
                          <div className="cart-row-body">
                            <div className="cart-row-name">{p.name}</div>
                            <div className="cart-row-price">
                              {fmt(p.price)} {tx.currency}
                            </div>
                          </div>
                          <div className="cart-row-controls">
                            <button onClick={() => setCartQty(productId, qty - 1)}>−</button>
                            <span className="cart-row-qty">{qty}</span>
                            <button className="plus" onClick={() => setCartQty(productId, qty + 1)}>+</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="total-row">
                    <span className="total-label">{tx.total}</span>
                    <span className="total-amount">{fmt(cartTotal)} {tx.currency}</span>
                  </div>

                  <button
                    className="order-btn"
                    onClick={handleOrder}
                    disabled={sending}
                  >
                    {sending ? (
                      <div className="spinner" />
                    ) : (
                      <>
                        <span>{tx.order}</span>
                        <span style={{ opacity: 0.65, fontWeight: 700, fontSize: 13 }}>
                          · {fmt(cartTotal)} {tx.currency}
                        </span>
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* FLOAT BAR — savat ko'rinishi */}
      {cartCount > 0 && !cartSheetOpen && !cartSheetMounted && !sheetOpen && !sheetMounted && (
        <div className="float-bar float-bar-enter" onClick={openCartSheet}>
          <div className="float-badge">{cartCount}</div>
          <span className="float-label">{tx.viewCart}</span>
          <span className="float-price">
            {fmt(cartTotal)} {tx.currency}
          </span>
        </div>
      )}
    </>
  );
}