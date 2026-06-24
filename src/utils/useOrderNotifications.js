import { useState, useEffect, useCallback, useRef } from "react";
import axios from "../utils/axios";
import { notificationBus } from "./notificationBus";

const KNOWN_IDS_KEY = "orders_known_ids";
const POLL_INTERVAL = 3000;

export const useOrderNotifications = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const intervalRef = useRef(null);

  const checkNewOrders = useCallback(async () => {
    try {
      const res = await axios.get("/active");
      const orders = res.data || [];
      const knownRaw = localStorage.getItem(KNOWN_IDS_KEY);

      if (!knownRaw) {
        localStorage.setItem(KNOWN_IDS_KEY, JSON.stringify(orders.map((o) => o._id || o.id)));
        setUnreadCount(0);
        return;
      }

      const knownIds = new Set(JSON.parse(knownRaw));
      const newOrders = orders.filter((o) => !knownIds.has(o._id || o.id));
      setUnreadCount(newOrders.length);
    } catch {
      // jimgina o'tamiz
    }
  }, []);

  useEffect(() => {
    checkNewOrders();
    intervalRef.current = setInterval(checkNewOrders, POLL_INTERVAL);

    // ✅ window.storage o'rniga notificationBus — bir xil tabda ham ishlaydi
    const onSeen = () => setUnreadCount(0);
    notificationBus.on("orders-seen", onSeen);

    return () => {
      clearInterval(intervalRef.current);
      notificationBus.off("orders-seen", onSeen);
    };
  }, [checkNewOrders]);

  const markAllSeen = useCallback(async () => {
    try {
      const res = await axios.get("/active");
      const orders = res.data || [];
      localStorage.setItem(KNOWN_IDS_KEY, JSON.stringify(orders.map((o) => o._id || o.id)));
    } catch {
      // localStorage ni todo holda qoldiramiz
    } finally {
      setUnreadCount(0);
      // ✅ Sidebar dagi hook ni darhol trigger qiladi — refresh kerak emas
      notificationBus.emit("orders-seen");
    }
  }, []);

  return { unreadCount, checkNewOrders, markAllSeen };
};