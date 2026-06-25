import { useState, useEffect, useCallback, useRef } from "react";
import axios from "../utils/axios";
import { notificationBus } from "./notificationBus";

const CLIENT_KNOWN_IDS_KEY = "client_orders_known_ids"; // activeOrder kalit bilan FARQ qiladi
const POLL_INTERVAL = 3000;

export const useClientOrderNotifications = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const intervalRef = useRef(null);

  const checkNewOrders = useCallback(async () => {
    try {
      const res = await axios.get("/api/bot/orders");
      const orders = res.data || [];

      // Faqat "new" statusdagilarni hisoblaymiz
      const newStatusOrders = orders.filter((o) => o.status === "new");

      const knownRaw = localStorage.getItem(CLIENT_KNOWN_IDS_KEY);

      if (!knownRaw) {
        localStorage.setItem(
          CLIENT_KNOWN_IDS_KEY,
          JSON.stringify(newStatusOrders.map((o) => o._id || o.id))
        );
        setUnreadCount(0);
        return;
      }

      const knownIds = new Set(JSON.parse(knownRaw));
      const unseen = newStatusOrders.filter(
        (o) => !knownIds.has(o._id || o.id)
      );
      setUnreadCount(unseen.length);
    } catch {
      // jimgina o'tamiz
    }
  }, []);

  useEffect(() => {
    checkNewOrders();
    intervalRef.current = setInterval(checkNewOrders, POLL_INTERVAL);

    const onSeen = () => setUnreadCount(0);
    notificationBus.on("client-orders-seen", onSeen);

    return () => {
      clearInterval(intervalRef.current);
      notificationBus.off("client-orders-seen", onSeen);
    };
  }, [checkNewOrders]);

  const markAllSeen = useCallback(async () => {
    try {
      const res = await axios.get("/api/bot/orders");
      const orders = res.data || [];
      const newStatusOrders = orders.filter((o) => o.status === "new");
      localStorage.setItem(
        CLIENT_KNOWN_IDS_KEY,
        JSON.stringify(newStatusOrders.map((o) => o._id || o.id))
      );
    } catch {
      // localStorage ni todo holda qoldiramiz
    } finally {
      setUnreadCount(0);
      notificationBus.emit("client-orders-seen");
    }
  }, []);

  return { unreadCount, checkNewOrders, markAllSeen };
};
