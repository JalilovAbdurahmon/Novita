// LocationPicker.jsx
// Mini-app ichida foydalanuvchi xaritada aniq joyini belgilaydi
// Leaflet ishlatiladi (CDN orqali, npm kerak emas)

import { useEffect, useRef, useState } from "react";

const TEXTS = {
  uz: {
    title: "📍 Joylashuvingizni belgilang",
    subtitle: "Xaritada o'zingiz turgan joyga bosing yoki suring",
    gpsBtn: "📡 GPS bilan aniqlash",
    gpsLoading: "Aniqlanmoqda...",
    confirmBtn: "✅ Tasdiqlash",
    gpsError: "GPS ishlamadi. Xaritadan qo'lda tanlang.",
    accuracy: (m) => `Aniqlik: ~${Math.round(m)} metr`,
    accuracyGood: "✅ Aniq joylashuv",
    accuracyBad: "⚠️ Signal zaif — aniqroq joy tanlang",
  },
  ru: {
    title: "📍 Укажите ваше местоположение",
    subtitle: "Нажмите на карту или перетащите маркер",
    gpsBtn: "📡 Определить по GPS",
    gpsLoading: "Определяется...",
    confirmBtn: "✅ Подтвердить",
    gpsError: "GPS не сработал. Выберите точку на карте вручную.",
    accuracy: (m) => `Точность: ~${Math.round(m)} метров`,
    accuracyGood: "✅ Точное местоположение",
    accuracyBad: "⚠️ Слабый сигнал — выберите точнее",
  },
};

export default function LocationPicker({ lang = "uz", onConfirm }) {
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const markerRef = useRef(null);
  const [position, setPosition] = useState(null); // { lat, lng, accuracy }
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState("");
  const [mapReady, setMapReady] = useState(false);

  const tx = TEXTS[lang] || TEXTS.uz;

  // Leaflet CSS + JS ni CDN dan yuklash
  useEffect(() => {
    if (document.getElementById("leaflet-css")) {
      initMap();
      return;
    }

    const link = document.createElement("link");
    link.id = "leaflet-css";
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => initMap();
    document.head.appendChild(script);
  }, []);

  function initMap() {
    if (leafletMap.current) return;

    // Default: Toshkent markazi
    const defaultLat = 41.2995;
    const defaultLng = 69.2401;

    const map = window.L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: false,
    }).setView([defaultLat, defaultLng], 15);

    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    // Custom marker icon
    const icon = window.L.divIcon({
      className: "",
      html: `<div style="
        width: 32px; height: 32px;
        background: #f97316;
        border: 3px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      "></div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });

    // Marker — boshlang'ich pozitsiyasiz, foydalanuvchi bosguncha ko'rinmaydi
    const marker = window.L.marker([defaultLat, defaultLng], {
      icon,
      draggable: true,
    });

    markerRef.current = marker;
    leafletMap.current = map;
    setMapReady(true);

    // Xaritaga bosilganda marker o'sha joyga ko'chadi
    map.on("click", (e) => {
      const { lat, lng } = e.latlng;
      placeMarker(lat, lng, null);
    });

    // Marker sudrab olib borilganda
    marker.on("dragend", () => {
      const { lat, lng } = marker.getLatLng();
      placeMarker(lat, lng, null);
    });
  }

  function placeMarker(lat, lng, accuracy) {
    const map = leafletMap.current;
    const marker = markerRef.current;
    if (!map || !marker) return;

    if (!map.hasLayer(marker)) {
      marker.addTo(map);
    }
    marker.setLatLng([lat, lng]);
    setPosition({ lat, lng, accuracy });
  }

  // GPS bilan aniq joylashuvni olish
  const handleGPS = () => {
    if (!navigator.geolocation) {
      setGpsError(tx.gpsError);
      return;
    }
    setGpsLoading(true);
    setGpsError("");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        placeMarker(latitude, longitude, accuracy);
        leafletMap.current?.setView([latitude, longitude], 17);
        setGpsLoading(false);
      },
      (err) => {
        setGpsError(tx.gpsError);
        setGpsLoading(false);
      },
      {
        enableHighAccuracy: true, // GPS dan aniq koordinat olish
        timeout: 10000,
        maximumAge: 0,            // Keshlangan eski koordinatni ishlatma
      }
    );
  };

  const handleConfirm = () => {
    if (!position) return;
    onConfirm({ lat: position.lat, lng: position.lng });
  };

  const accuracyOk = position?.accuracy == null || position.accuracy <= 80;

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100vh",
      background: "#0d0f1a", fontFamily: "sans-serif",
    }}>
      {/* Header */}
      <div style={{
        padding: "12px 16px 8px",
        background: "#13151e",
        borderBottom: "1px solid #1e2130",
      }}>
        <div style={{ color: "#f97316", fontWeight: 900, fontSize: 16 }}>{tx.title}</div>
        <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>{tx.subtitle}</div>
      </div>

      {/* Map */}
      <div ref={mapRef} style={{ flex: 1, width: "100%" }} />

      {/* Bottom panel */}
      <div style={{
        padding: "12px 16px",
        background: "#13151e",
        borderTop: "1px solid #1e2130",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}>
        {/* GPS button */}
        <button
          onClick={handleGPS}
          disabled={gpsLoading}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: 12,
            border: "1px solid #334155",
            background: gpsLoading ? "#1e2130" : "#1e293b",
            color: gpsLoading ? "#64748b" : "#38bdf8",
            fontWeight: 700,
            fontSize: 14,
            cursor: gpsLoading ? "not-allowed" : "pointer",
          }}
        >
          {gpsLoading ? tx.gpsLoading : tx.gpsBtn}
        </button>

        {gpsError && (
          <div style={{
            background: "#450a0a", border: "1px solid #7f1d1d",
            borderRadius: 10, padding: "8px 12px",
            color: "#fca5a5", fontSize: 12,
          }}>
            {gpsError}
          </div>
        )}

        {/* Accuracy indicator */}
        {position && (
          <div style={{
            background: accuracyOk ? "#052e16" : "#451a03",
            border: `1px solid ${accuracyOk ? "#166534" : "#92400e"}`,
            borderRadius: 10, padding: "8px 12px",
            color: accuracyOk ? "#86efac" : "#fcd34d",
            fontSize: 12, fontWeight: 600,
          }}>
            {position.accuracy != null
              ? `${tx.accuracy(position.accuracy)} — ${accuracyOk ? "✅" : "⚠️"}`
              : tx.accuracyGood}
          </div>
        )}

        {/* Confirm button */}
        <button
          onClick={handleConfirm}
          disabled={!position}
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: 12,
            border: "none",
            background: position ? "linear-gradient(to right, #ea580c, #f97316)" : "#1e2130",
            color: position ? "white" : "#334155",
            fontWeight: 900,
            fontSize: 15,
            cursor: position ? "pointer" : "not-allowed",
            boxShadow: position ? "0 4px 20px rgba(249,115,22,0.3)" : "none",
          }}
        >
          {tx.confirmBtn}
        </button>
      </div>
    </div>
  );
}