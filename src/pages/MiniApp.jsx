import { useState, useEffect, useRef } from "react";

const tg = window.Telegram?.WebApp;

const formatPrice = (num) => (num || 0).toLocaleString("ru-RU");

// Group products by category (if category field exists, else put all in one group)
const groupByCategory = (products) => {
  const map = {};
  products.forEach((p) => {
    const cat = p.category || "Barchasi";
    if (!map[cat]) map[cat] = [];
    map[cat].push(p);
  });
  return map;
};

export default function MiniApp() {
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [lang, setLang] = useState("uz");
  const [activeCategory, setActiveCategory] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const categoryRefs = useRef({});
  const scrollRef = useRef(null);

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
        const cats = [...new Set(data.map((p) => p.category || "Barchasi"))];
        setActiveCategory(cats[0] || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const grouped = groupByCategory(products);
  const categories = Object.keys(grouped);

  const scrollToCategory = (cat) => {
    setActiveCategory(cat);
    const el = categoryRefs.current[cat];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleSelect = (p) => {
    setSelected(p);
    setQuantity(1);
    setCartOpen(true);
  };

  const handleOrder = () => {
    if (!selected) return;
    setSending(true);
    const data = JSON.stringify({ productId: selected._id, quantity });
    tg?.sendData(data);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-3">
        <div className="w-10 h-10 border-3 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
        <p className="text-sm text-gray-400 font-medium">
          {lang === "uz" ? "Yuklanmoqda..." : "Загрузка..."}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-gray-900 flex flex-col">
      {/* ── HEADER ── */}
      <header className="sticky top-0 z-30 bg-white shadow-sm px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-yellow-400 flex items-center justify-center">
            <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
            </svg>
          </div>
          <span className="font-black text-base tracking-tight">
            {lang === "uz" ? "Buyurtma" : "Заказ"}
          </span>
        </div>
        <button
          onClick={() => setLang(lang === "uz" ? "ru" : "uz")}
          className="text-xs font-bold px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200"
        >
          {lang === "uz" ? "RU" : "UZ"}
        </button>
      </header>

      {/* ── CATEGORY TABS ── */}
      {categories.length > 1 && (
        <div className="sticky top-[57px] z-20 bg-white border-b border-gray-100 px-4 py-2">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => scrollToCategory(cat)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
                  activeCategory === cat
                    ? "bg-yellow-400 text-black shadow-sm"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── PRODUCTS ── */}
      <main className="flex-1 pb-32" ref={scrollRef}>
        {categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-2">
            <span className="text-5xl">🍕</span>
            <p className="text-sm font-medium">
              {lang === "uz" ? "Mahsulotlar yo'q" : "Товаров нет"}
            </p>
          </div>
        ) : (
          categories.map((cat) => (
            <section
              key={cat}
              ref={(el) => (categoryRefs.current[cat] = el)}
            >
              {categories.length > 1 && (
                <div className="px-4 pt-5 pb-2">
                  <h2 className="text-lg font-black text-gray-800">{cat}</h2>
                </div>
              )}
              <div className="px-4 flex flex-col gap-3 pt-3">
                {grouped[cat].map((p) => {
                  const isSelected = selected?._id === p._id;
                  return (
                    <button
                      key={p._id}
                      onClick={() => handleSelect(p)}
                      className={`w-full flex items-center gap-4 bg-white rounded-2xl overflow-hidden shadow-sm active:scale-[0.98] transition-transform text-left border-2 ${
                        isSelected
                          ? "border-yellow-400"
                          : "border-transparent"
                      }`}
                    >
                      {/* Image */}
                      <div className="w-24 h-24 shrink-0 bg-gray-100 overflow-hidden">
                        {p.image ? (
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl">
                            🍕
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 py-3 pr-3 min-w-0">
                        <p className="font-bold text-sm text-gray-900 leading-snug mb-1">
                          {p.name}
                        </p>
                        {p.description && (
                          <p className="text-xs text-gray-400 leading-snug line-clamp-2 mb-1.5">
                            {p.description}
                          </p>
                        )}
                        {p.price > 0 && (
                          <span className="inline-block text-xs font-black text-gray-700 bg-gray-100 px-2.5 py-1 rounded-full">
                            {formatPrice(p.price)}{" "}
                            {lang === "uz" ? "so'm" : "сум"}
                          </span>
                        )}
                      </div>

                      {/* Add button */}
                      <div className="pr-4">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg transition-all ${
                            isSelected
                              ? "bg-yellow-400 text-black"
                              : "bg-gray-100 text-gray-400"
                          }`}
                        >
                          {isSelected ? "✓" : "+"}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </main>

      {/* ── CART BOTTOM SHEET ── */}
      {selected && cartOpen && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setCartOpen(false)}
          />

          {/* Sheet */}
          <div className="relative bg-white rounded-t-3xl p-5 shadow-2xl">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

            {/* Product preview */}
            <div className="flex gap-4 mb-5">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 overflow-hidden shrink-0">
                {selected.image ? (
                  <img
                    src={selected.image}
                    alt={selected.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">
                    🍕
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-base text-gray-900 leading-snug">
                  {selected.name}
                </p>
                {selected.price > 0 && (
                  <p className="text-sm text-gray-500 mt-0.5">
                    {formatPrice(selected.price)}{" "}
                    {lang === "uz" ? "so'm / dona" : "сум / шт"}
                  </p>
                )}
              </div>
            </div>

            {/* Quantity */}
            <div className="flex items-center justify-between bg-gray-50 rounded-2xl p-4 mb-5">
              <span className="text-sm font-bold text-gray-500">
                {lang === "uz" ? "Miqdor" : "Количество"}
              </span>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-9 h-9 rounded-full bg-white shadow-sm border border-gray-200 text-lg font-black text-gray-600 flex items-center justify-center active:scale-95 transition-transform"
                >
                  −
                </button>
                <span className="text-xl font-black text-gray-900 w-8 text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="w-9 h-9 rounded-full bg-yellow-400 shadow-sm text-lg font-black text-black flex items-center justify-center active:scale-95 transition-transform"
                >
                  +
                </button>
              </div>
            </div>

            {/* Order button */}
            <button
              onClick={handleOrder}
              disabled={sending}
              className="w-full py-4 rounded-2xl font-black text-base bg-yellow-400 text-black shadow-lg shadow-yellow-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              {sending ? (
                <span className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  <span>
                    {lang === "uz" ? "Zakaz berish" : "Заказать"}
                  </span>
                  {selected.price > 0 && (
                    <span className="opacity-70">
                      — {formatPrice((selected.price || 0) * quantity)}{" "}
                      {lang === "uz" ? "so'm" : "сум"}
                    </span>
                  )}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── FLOATING CART BUTTON (when item selected but sheet closed) ── */}
      {selected && !cartOpen && (
        <div className="fixed bottom-6 left-0 right-0 px-4 z-30">
          <button
            onClick={() => setCartOpen(true)}
            className="w-full py-4 rounded-2xl font-black text-base bg-yellow-400 text-black shadow-xl shadow-yellow-300/50 active:scale-[0.98] transition-all flex items-center justify-between px-5"
          >
            <div className="w-7 h-7 rounded-full bg-black/10 flex items-center justify-center text-sm font-black">
              {quantity}
            </div>
            <span>{lang === "uz" ? "Zakazni ko'rish" : "Посмотреть заказ"}</span>
            <span className="text-sm font-bold opacity-70">
              {formatPrice((selected.price || 0) * quantity)}{" "}
              {lang === "uz" ? "so'm" : "сум"}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}