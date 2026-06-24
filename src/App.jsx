import React from "react";
import { Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Layout from "./pages/Layout";
import Login from "./pages/Login";
import CreateOrder from "./pages/CreateOrder";
import "leaflet/dist/leaflet.css";
import ActiveOrders from "./pages/ActiveOrder";
import OrderHistory from "./pages/HIstoryOrder";
import { Toaster } from "react-hot-toast";
import MiniApp from "./pages/MiniApp";


const App = () => {
  return (
    <div>
      <Toaster position="top-center" />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route element={<Layout />}>
          <Route path="/home" element={<Home />} />
          <Route path="/createOrder" element={<CreateOrder />} />
          <Route path="/activeOrder" element={<ActiveOrders />} />
          <Route path="/historyOrder" element={<OrderHistory />} />
          <Route path="/miniapp" element={<MiniApp />} />
        </Route>
      </Routes>
    </div>
  );
};

export default App;
