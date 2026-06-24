import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";

const Layout = () => {
  return (
    <div className="flex min-h-screen bg-[#f4f6f9] overflow-hidden">
      
      {/* 1. Sidebar uchun qat'iy joy (Kengligi 256px / w-64 dan kamaymaydi) */}
      <div className="w-64 min-w-[256px] h-screen sticky top-0 z-50 bg-[#0f111a]">
        <Sidebar />
      </div>

      {/* 2. O'ng tomondagi asosiy kontent qismi */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <main className="p-6 md:p-8 flex-1">
          {/* Sahifalar (Home, Active, History) shu yerga chiroyli joylashadi */}
          <Outlet />
        </main>
      </div>

    </div>
  );
};

export default Layout;