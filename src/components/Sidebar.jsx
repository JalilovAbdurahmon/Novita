import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useOrderNotifications } from "../utils/useOrderNotifications";
import { useClientOrderNotifications } from "../utils/useClientOrderNotifications";

const BellIcon = ({ unreadCount, color = "amber" }) => {
  const colorMap = {
    amber: {
      active: "text-amber-400",
      inactive: "text-slate-600",
      badge: "bg-amber-500 shadow-amber-500/40",
      ping: "bg-amber-500",
    },
    teal: {
      active: "text-teal-400",
      inactive: "text-slate-600",
      badge: "bg-teal-500 shadow-teal-500/40",
      ping: "bg-teal-500",
    },
  };

  const c = colorMap[color];

  return (
    <span className="relative flex items-center">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className={`w-5 h-5 transition-colors duration-300 ${
          unreadCount > 0 ? c.active : c.inactive
        } ${unreadCount > 0 ? "animate-[wiggle_0.6s_ease-in-out]" : ""}`}
      >
        <path d="M5.85 3.5a.75.75 0 0 0-1.117-1 9.719 9.719 0 0 0-2.348 4.876.75.75 0 0 0 1.479.248A8.219 8.219 0 0 1 5.85 3.5ZM19.267 2.5a.75.75 0 1 0-1.118 1 8.22 8.22 0 0 1 1.987 4.124.75.75 0 0 0 1.48-.248A9.72 9.72 0 0 0 19.266 2.5Z" />
        <path
          fillRule="evenodd"
          d="M12 2.25A6.75 6.75 0 0 0 5.25 9v.75a8.217 8.217 0 0 1-2.119 5.52.75.75 0 0 0 .298 1.206c1.544.57 3.16.99 4.831 1.243a3.75 3.75 0 1 0 7.48 0 24.583 24.583 0 0 0 4.83-1.244.75.75 0 0 0 .298-1.205 8.217 8.217 0 0 1-2.118-5.52V9A6.75 6.75 0 0 0 12 2.25ZM9.75 18c0-.034 0-.067.002-.1a25.05 25.05 0 0 0 4.496 0l.002.1a2.25 2.25 0 1 1-4.5 0Z"
          clipRule="evenodd"
        />
      </svg>
      {unreadCount > 0 && (
        <span
          className={`absolute -top-2 -right-2 min-w-4.5 h-4.5 px-1 rounded-full ${c.badge} text-black text-[10px] font-black flex items-center justify-center leading-none shadow-lg animate-bounce`}
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </span>
  );
};

const Sidebar = () => {
  const navigate = useNavigate();
  const { unreadCount } = useOrderNotifications();
  const { unreadCount: clientUnreadCount } = useClientOrderNotifications();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3.5 px-4 py-3 rounded-xl text-[15px] font-medium transition-all duration-300 relative group border ${
      isActive
        ? "bg-gradient-to-r from-cyan-500/10 to-blue-500/5 text-cyan-400 font-semibold border-cyan-500/30 shadow-sm"
        : "text-slate-400 border-transparent hover:bg-slate-850/50 hover:text-cyan-300 hover:border-cyan-500/20 hover:shadow-md hover:shadow-cyan-500/5"
    }`;

  return (
    <div className="w-68 h-screen bg-[#0f111a] text-slate-200 flex flex-col p-5 border-r border-slate-800/60 justify-between select-none shrink-0">
      <div>
        <div className="flex items-center gap-3 px-2 pt-2 pb-6 mb-6 border-b border-slate-800/50">
          <div className="w-9 h-9 rounded-xl bg-linear-to-tr from-cyan-400 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-cyan-500/20">
            N
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold bg-linear-to-r from-white to-slate-300 bg-clip-text text-transparent tracking-wide">
              Novita Foods
            </span>
            <span className="text-[11px] text-cyan-500/80 font-medium tracking-widest uppercase">
              Панель управления
            </span>
          </div>
        </div>

        <nav className="flex flex-col gap-2">
          <NavLink to="/home" className={linkClass}>
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute left-0 w-1 h-6 bg-cyan-400 rounded-r-full" />
                )}
                <span className="text-lg transition-transform duration-300 group-hover:scale-110">
                  🏠
                </span>
                <span>Главная</span>
              </>
            )}
          </NavLink>

          <NavLink to="/createOrder" className={linkClass}>
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute left-0 w-1 h-6 bg-cyan-400 rounded-r-full" />
                )}
                <span className="text-lg transition-transform duration-300 group-hover:scale-110">
                  ➕
                </span>
                <span>Создать заказ</span>
              </>
            )}
          </NavLink>

          {/* Активные заказы — amber bell (eski) */}
          <NavLink to="/activeOrder" className={linkClass}>
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute left-0 w-1 h-6 bg-cyan-400 rounded-r-full" />
                )}
                <span className="text-lg transition-transform duration-300 group-hover:scale-110">
                  ⏳
                </span>
                <span className="flex-1">Активные заказы</span>
                <BellIcon unreadCount={unreadCount} color="amber" />
              </>
            )}
          </NavLink>

          <NavLink to="/historyOrder" className={linkClass}>
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute left-0 w-1 h-6 bg-cyan-400 rounded-r-full" />
                )}
                <span className="text-lg transition-transform duration-300 group-hover:scale-110">
                  📜
                </span>
                <span>История заказов</span>
              </>
            )}
          </NavLink>
        </nav>

        {/* Telegram bot bo'limi */}
        <div className="flex items-center gap-2 px-2 mt-6 mb-2">
          <div className="h-px flex-1 bg-slate-800/60" />
          <span className="text-[10px] text-slate-600 font-semibold tracking-widest uppercase">
            Telegram бот
          </span>
          <div className="h-px flex-1 bg-slate-800/60" />
        </div>

        <nav className="flex flex-col gap-2">
          {/* Заказы клиентов — teal bell (yangi) */}
          <NavLink to="/clientOrder" className={linkClass}>
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute left-0 w-1 h-6 bg-cyan-400 rounded-r-full" />
                )}
                <span className="text-lg transition-transform duration-300 group-hover:scale-110">
                  📦
                </span>
                <span className="flex-1">Заказы клиентов</span>
                <BellIcon unreadCount={clientUnreadCount} color="teal" />
              </>
            )}
          </NavLink>

          <NavLink to="/clientHistory" className={linkClass}>
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute left-0 w-1 h-6 bg-cyan-400 rounded-r-full" />
                )}
                <span className="text-lg transition-transform duration-300 group-hover:scale-110">
                  🗂️
                </span>
                <span>История клиентов</span>
              </>
            )}
          </NavLink>
        </nav>
      </div>

      <button
        onClick={handleLogout}
        className="w-full py-3 bg-slate-900/60 hover:bg-red-950/30 border border-slate-800 hover:border-red-900/40 text-slate-400 hover:text-red-400 font-medium rounded-xl transition-all duration-300 flex items-center justify-center gap-2.5 group"
      >
        <span className="transition-transform duration-300 group-hover:-translate-x-0.5">
          🚪
        </span>
        <span className="text-[14px]">Выйти из системы</span>
      </button>
    </div>
  );
};

export default Sidebar;