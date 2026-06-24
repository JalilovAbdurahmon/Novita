import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { scheduleTokenExpiry } from "../utils/axios";

const API_URL = "https://novita-backend-production.up.railway.app";

const Login = () => {
  const navigate = useNavigate();

  const [username, setUsername] = useState(
    () => localStorage.getItem("rememberedUsername") || ""
  );
  const [password, setPassword] = useState(
    () => localStorage.getItem("rememberedPassword") || ""
  );
  const [rememberMe, setRememberMe] = useState(
    () => localStorage.getItem("rememberedUsername") !== null
  );
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ✅ Checkbox o'zgarganda darhol localStorage ni yangilaydi
  const handleRememberMe = (e) => {
    const checked = e.target.checked;
    setRememberMe(checked);
    if (!checked) {
      // Checkbox olib tashlanganida darhol o'chiradi
      localStorage.removeItem("rememberedUsername");
      localStorage.removeItem("rememberedPassword");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("Пожалуйста, заполните все поля!");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error("Сервердан нотўғри жавоб келди.");
      }

      if (!response.ok || !data.success) {
        setError(data.message || "Username yoki parol xato!");
        return;
      }

      localStorage.setItem("token", data.token);

      // ✅ rememberMe holatiga qarab saqlaydi yoki o'chiradi
      if (rememberMe) {
        localStorage.setItem("rememberedUsername", username.trim());
        localStorage.setItem("rememberedPassword", password);
      } else {
        localStorage.removeItem("rememberedUsername");
        localStorage.removeItem("rememberedPassword");
      }

      scheduleTokenExpiry();
      navigate("/home");
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Серверга уланиб бўлмади."
          : err.message || "Номаълум хато юз берди."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // ... barcha JSX avvalgidek qoladi, faqat checkbox qismini o'zgartiring:
    // onChange={handleRememberMe}  <-- shu o'zgarish
    <div className="min-h-screen w-full flex items-center justify-center bg-[#090a0f] text-slate-200 p-4 font-sans antialiased relative overflow-hidden">
      {/* ... avvalgi kod */}
      <div className="absolute top-[-10%] left-[-10%] w-125 h-125 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-125 h-125 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-[#0f111a] border border-slate-800/80 rounded-2xl p-8 shadow-2xl shadow-black/50 backdrop-blur-md relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-linear-to-tr from-cyan-400 to-blue-600 flex items-center justify-center text-white font-extrabold text-xl shadow-xl shadow-cyan-500/20 mb-4 animate-pulse">
            N
          </div>
          <h2 className="text-2xl font-bold bg-linear-to-r from-white to-slate-300 bg-clip-text text-transparent tracking-wide">
            Novita Foods
          </h2>
          <p className="text-sm text-slate-400 mt-1.5">
            Войдите в систему для управления заказами
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-red-950/40 border border-red-900/40 rounded-xl text-red-400 text-sm text-center flex items-center justify-center gap-2">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1">
              Имя пользователя (Username)
            </label>
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors duration-200">
                👤
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Введите ваш username"
                className="w-full pl-11 pr-4 py-3.5 bg-slate-900/60 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 font-medium text-[15px] outline-none transition-all duration-300 focus:border-cyan-500/40 focus:bg-slate-900"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1">
              Пароль
            </label>
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors duration-200">
                🔒
              </span>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-11 py-3.5 bg-slate-900/60 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 font-medium text-[15px] outline-none transition-all duration-300 focus:border-cyan-500/40 focus:bg-slate-900"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                tabIndex={-1}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-cyan-400 transition-colors duration-200 cursor-pointer"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12c1.292 4.338 5.31 7.5 10.066 7.5 1.523 0 2.968-.326 4.27-.913M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.5a10.522 10.522 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 px-1 mt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none group">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={handleRememberMe}
                className="w-4 h-4 rounded-md accent-cyan-500 bg-slate-900 border-slate-800 cursor-pointer"
              />
              <span className="group-hover:text-slate-300 transition-colors">
                Запомнить меня
              </span>
            </label>
            <span className="hover:text-cyan-400 cursor-pointer transition-colors">
              Забыли пароль?
            </span>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-3 py-3.5 bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/10 active:scale-[0.99] transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none text-[15px] tracking-wide flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Вход...</span>
              </>
            ) : (
              <span>Войти в аккаунт</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;