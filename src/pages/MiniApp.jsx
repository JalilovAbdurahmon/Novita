import { useState, useEffect } from "react";

const tg = window.Telegram?.WebApp;

const formatPrice = (num) => (num || 0).toLocaleString("ru-RU");

export default function MiniApp() {
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [lang, setLang] = useState("uz");

  useEffect(() => {
    tg?.ready();
    tg?.expand();

    const params = new URLSearchParams(window.location.search);
    const l = params.get("lang");
    if (l === "ru" || l === "uz") setLang(l);

    fetch("https://novita-backend-production.up.railway.app/api/bot/products")
      .then((r) => r.json())
      .then((d) => {
        setProducts(d.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleOrder = () => {
    if (!selected) return;
    setSending(true);
    const data = JSON.stringify({ productId: selected._id, quantity });
    tg?.sendData(data);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f111a]">
        <span className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f111a] text-slate-200 p-4 pb-32">
      <h1 className="text-xl font-black text-emerald-400 mb-1">
        {lang === "uz" ? "🛒 Mahsulot tanlang" : "🛒 Выберите товар"}
      </h1>
      <p className="text-xs text-slate-500 mb-5">
        {lang === "uz"
          ? "Kerakli mahsulotni tanlang va miqdorini belgilang"
          : "Выберите нужный товар и укажите количество"}
      </p>

      {/* Mahsulotlar */}
      <div className="flex flex-col gap-3 mb-6">
        {products.length === 0 ? (
          <div className="text-center text-slate-500 py-10">
            {lang === "uz" ? "Mahsulotlar yo'q" : "Товаров нет"}
          </div>
        ) : (
          products.map((p) => {
            const isSelected = selected?._id === p._id;
            return (
              <button
                key={p._id}
                onClick={() => {
                  setSelected(p);
                  setQuantity(1);
                }}
                className={`flex items-center gap-4 p-4 rounded-2xl border text-left transition-all duration-200 ${
                  isSelected
                    ? "bg-emerald-500/15 border-emerald-400/50 shadow-lg shadow-emerald-900/20"
                    : "bg-white/3 border-white/8 hover:bg-white/6"
                }`}
              >
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                    isSelected ? "bg-emerald-500/20" : "bg-white/5"
                  }`}
                >
                  📦
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className={`font-bold text-sm ${
                      isSelected ? "text-emerald-400" : "text-white"
                    }`}
                  >
                    {p.name}
                  </div>
                  {p.price > 0 && (
                    <div className="text-xs text-emerald-400 font-mono mt-0.5">
                      {formatPrice(p.price)} {lang === "uz" ? "so'm" : "сум"}
                    </div>
                  )}
                </div>
                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                    <svg
                      className="w-3.5 h-3.5 text-white"
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
            );
          })
        )}
      </div>

      {/* Miqdor */}
      {selected && (
        <div className="bg-white/3 border border-white/8 rounded-2xl p-4 mb-4">
          <div className="text-xs text-slate-400 font-bold uppercase tracking-wide mb-3">
            {lang === "uz" ? "Miqdor" : "Количество"}
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold text-lg hover:bg-slate-700 transition-all"
            >
              −
            </button>
            <span className="text-2xl font-black text-white w-12 text-center">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="w-10 h-10 rounded-xl bg-emerald-600 border border-emerald-500 text-white font-bold text-lg hover:bg-emerald-500 transition-all"
            >
              +
            </button>
            <div className="ml-auto text-right">
              <div className="text-xs text-slate-500">
                {lang === "uz" ? "Jami" : "Итого"}
              </div>
              <div className="text-emerald-400 font-black font-mono">
                {formatPrice((selected.price || 0) * quantity)}{" "}
                {lang === "uz" ? "so'm" : "сум"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Zakaz tugmasi */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#0f111a]/90 backdrop-blur-sm border-t border-white/5">
        <button
          onClick={handleOrder}
          disabled={!selected || sending}
          className="w-full py-4 rounded-2xl font-black text-base bg-linear-to-r from-emerald-500 to-teal-500 text-black shadow-xl shadow-emerald-900/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
        >
          {sending ? (
            <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
          ) : (
            <>
              🛒 {lang === "uz" ? "Zakaz berish" : "Заказать"}
              {selected &&
                ` — ${formatPrice((selected.price || 0) * quantity)} ${
                  lang === "uz" ? "so'm" : "сум"
                }`}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
