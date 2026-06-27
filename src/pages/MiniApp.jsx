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
  },
};

export default function MiniApp() {
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [lang, setLang] = useState("uz");
  const [activeCategory, setActiveCategory] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMounted, setSheetMounted] = useState(false);
  // LocationPicker sahifasini ko'rsatish uchun
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [pendingOrder, setPendingOrder] = useState(null); // { productId, quantity }
  const catRefs = useRef({});
  const tabsRef = useRef(null);

  const tx = T[lang];

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
        const cats = [...new Set(data.map((p) => p.category || "Mahsulotlar"))];
        setActiveCategory(cats[0] || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const grouped = groupByCategory(products);
  const categories = Object.keys(grouped);

  const openSheet = (product) => {
    setSelected(product);
    setQuantity(1);
    setSheetMounted(true);
    requestAnimationFrame(() => setSheetOpen(true));
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setTimeout(() => setSheetMounted(false), 300);
  };

  // 1-qadam: foydalanuvchi "Buyurtma berish" bosadi
  // Sheet yopiladi va LocationPicker ochiladi
  const handleOrder = () => {
    if (!selected) return;
    closeSheet();
    setPendingOrder({ productId: selected._id, quantity });
    setTimeout(() => setShowLocationPicker(true), 350);
  };

  // 2-qadam: LocationPicker dan koordinatlar keladi
  // Bot ga type:"order" + location birgalikda yuboriladi
  const handleLocationConfirm = ({ lat, lng }) => {
    if (!pendingOrder) return;
    setSending(true);
    tg?.sendData(
      JSON.stringify({
        type: "order",
        productId: pendingOrder.productId,
        quantity: pendingOrder.quantity,
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
        .card.selected::after {
          content: ''; position: absolute; inset: 0;
          border-radius: 20px; border: 2.5px solid #FFCC00;
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
        }
        .sheet.open { transform: translateY(0); }

        .sheet-handle {
          width: 36px; height: 4px; background: #e0e0e0;
          border-radius: 2px; margin: 12px auto 16px;
        }
        .sheet-inner { padding: 0 20px 24px; }

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
        }
        .float-label { color: #fff; font-size: 14px; font-weight: 800; flex: 1; }
        .float-price { color: #FFCC00; font-size: 14px; font-weight: 900; }

        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner {
          width: 18px; height: 18px; border-radius: 50%;
          border: 2.5px solid rgba(0,0,0,.2);
          border-top-color: #111; animation: spin .7s linear infinite;
        }
        .main-content { padding-bottom: 100px; }
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
                  const isSelected = selected?._id === p._id;
                  return (
                    <div
                      key={p._id}
                      className={`card${isSelected ? " selected" : ""}`}
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
                          <button
                            className="card-add"
                            onClick={(e) => { e.stopPropagation(); openSheet(p); }}
                          >
                            {isSelected ? "✓" : "+"}
                          </button>
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

      {/* BOTTOM SHEET */}
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
                    {selected?.price > 0 && (
                      <span style={{ opacity: 0.65, fontWeight: 700, fontSize: 13 }}>
                        · {fmt((selected.price || 0) * quantity)} {tx.currency}
                      </span>
                    )}
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}

      {/* FLOAT BAR */}
      {selected && !sheetOpen && !sheetMounted && (
        <div className="float-bar" onClick={() => openSheet(selected)}>
          <div className="float-badge">{quantity}</div>
          <span className="float-label">{tx.viewCart}</span>
          <span className="float-price">
            {fmt((selected.price || 0) * quantity)} {tx.currency}
          </span>
        </div>
      )}
    </>
  );
}