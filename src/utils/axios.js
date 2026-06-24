import axios from "axios";
import toast from "react-hot-toast";

const instance = axios.create({
  baseURL: "http://localhost:7000",
  headers: { "Content-Type": "application/json" },
});

instance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let countdownStarted = false;
let tokenExpiryTimer = null;

function startCountdownToast() {
  if (countdownStarted) return;
  countdownStarted = true;

  localStorage.removeItem("token");
  if (tokenExpiryTimer) clearTimeout(tokenExpiryTimer);

  let seconds = 5;

  const toastId = toast(
    `⏳ Сессия истекла! Выход через ${seconds} сек...`,
    {
      duration: 7000,
      icon: "🔐",
      style: {
        background: "#0f111a",
        border: "1px solid rgba(239,68,68,0.4)",
        borderRadius: "1rem",
        color: "#f87171",
        fontWeight: "700",
        fontSize: "14px",
        boxShadow: "0 25px 50px -12px rgba(239,68,68,0.2)",
        padding: "14px 18px",
        minWidth: "280px",
      },
    }
  );

  const interval = setInterval(() => {
    seconds--;
    if (seconds <= 0) {
      clearInterval(interval);
      toast.dismiss(toastId);
      window.location.href = "/";
      return;
    }
    toast(
      `⏳ Сессия истекла! Выход через ${seconds} сек...`,
      {
        id: toastId,
        duration: (seconds + 1) * 1000,
        icon: "🔐",
        style: {
          background: "#0f111a",
          border: "1px solid rgba(239,68,68,0.4)",
          borderRadius: "1rem",
          color: "#f87171",
          fontWeight: "700",
          fontSize: "14px",
          boxShadow: "0 25px 50px -12px rgba(239,68,68,0.2)",
          padding: "14px 18px",
          minWidth: "280px",
        },
      }
    );
  }, 1000);
}

export function scheduleTokenExpiry() {
  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const msUntilExpiry = payload.exp * 1000 - Date.now();

    if (msUntilExpiry <= 0) {
      startCountdownToast();
      return;
    }

    if (tokenExpiryTimer) clearTimeout(tokenExpiryTimer);
    tokenExpiryTimer = setTimeout(() => {
      startCountdownToast();
    }, msUntilExpiry);

  } catch (e) {
    console.error("Token decode xatolik:", e);
  }
}

instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      startCountdownToast();
    }
    return Promise.reject(error);
  }
);

export default instance;