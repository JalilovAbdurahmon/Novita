// LocationPicker.jsx — Google Maps uslubidagi chiroyli xarita
import { useEffect, useRef, useState } from "react";

const TEXTS = {
  uz: {
    title: "Manzilni belgilang",
    subtitle: "Xaritani suring yoki GPS bosing",
    gpsBtn: "Mening joylashuvim",
    gpsLoading: "Aniqlanmoqda...",
    confirmBtn: "Shu manzilni tasdiqlash",
    gpsError: "GPS ishlamadi. Xaritadan tanlang.",
    searching: "Manzil aniqlanmoqda...",
    noAddress: "Manzil topilmadi",
  },
  ru: {
    title: "Укажите адрес",
    subtitle: "Перетащите карту или нажмите GPS",
    gpsBtn: "Моё местоположение",
    gpsLoading: "Определяется...",
    confirmBtn: "Подтвердить этот адрес",
    gpsError: "GPS не сработал. Выберите на карте.",
    searching: "Определяем адрес...",
    noAddress: "Адрес не найден",
  },
};

// Reverse geocoding — koordinatdan manzil olish (OpenStreetMap Nominatim)
async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      { headers: { "Accept-Language": "ru" } }
    );
    const data = await res.json();
    if (data?.display_name) {
      // Qisqa manzil: ko'cha + shahar
      const a = data.address || {};
      const parts = [
        a.road || a.pedestrian || a.footway,
        a.house_number,
        a.suburb || a.neighbourhood || a.quarter,
        a.city || a.town || a.village,
      ].filter(Boolean);
      return parts.length ? parts.join(", ") : data.display_name.split(",").slice(0, 3).join(",");
    }
  } catch {}
  return null;
}

export default function LocationPicker({ lang = "uz", onConfirm }) {
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const markerRef = useRef(null);
  const geocodeTimer = useRef(null);

  const [position, setPosition] = useState(null); // { lat, lng }
  const [address, setAddress] = useState("");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState("");
  const [geocoding, setGeocoding] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const tx = TEXTS[lang] || TEXTS.uz;

  // Leaflet yuklash
  useEffect(() => {
    if (window.L) { initMap(); return; }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = initMap;
    document.head.appendChild(script);
  }, []);

  function createPinIcon(L) {
    return L.divIcon({
      className: "",
      html: `
        <div style="position:relative; width:40px; height:52px; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.35));">
          <svg viewBox="0 0 40 52" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:40px;height:52px">
            <path d="M20 0C9 0 0 9 0 20C0 34 20 52 20 52C20 52 40 34 40 20C40 9 31 0 20 0Z" fill="#4285F4"/>
            <path d="M20 2C10.06 2 2 10.06 2 20C2 33 20 50 20 50C20 50 38 33 38 20C38 10.06 29.94 2 20 2Z" fill="#4285F4"/>
            <circle cx="20" cy="20" r="8" fill="white"/>
            <circle cx="20" cy="20" r="5" fill="#4285F4"/>
          </svg>
        </div>
      `,
      iconSize: [40, 52],
      iconAnchor: [20, 52],
    });
  }

  function initMap() {
    if (leafletMap.current || !mapRef.current) return;
    const L = window.L;

    // Default: Toshkent
    const lat = 41.2995, lng = 69.2401;

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([lat, lng], 15);

    // Google Maps uslubidagi tile (OpenStreetMap)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    // Zoom tugmalari — o'ng pastga
    L.control.zoom({ position: "bottomright" }).addTo(map);

    const marker = L.marker([lat, lng], {
      icon: createPinIcon(L),
      draggable: true,
    }).addTo(map);

    markerRef.current = marker;
    leafletMap.current = map;

    // Boshlang'ich pozitsiyani set qilamiz
    updatePosition(lat, lng);

    // Xarita bosilsa
    map.on("click", (e) => {
      updatePosition(e.latlng.lat, e.latlng.lng);
      marker.setLatLng(e.latlng);
    });

    // Marker sudralsa
    marker.on("drag", (e) => {
      const { lat, lng } = e.target.getLatLng();
      updatePosition(lat, lng, false); // geocode qilmaymiz drag paytida
    });
    marker.on("dragend", (e) => {
      const { lat, lng } = e.target.getLatLng();
      updatePosition(lat, lng);
    });
  }

  function updatePosition(lat, lng, doGeocode = true) {
    setPosition({ lat, lng });
    setConfirmed(false);

    if (!doGeocode) return;

    // Debounce — har xarita harakatda so'rov ketmasin
    clearTimeout(geocodeTimer.current);
    setGeocoding(true);
    setAddress("");
    geocodeTimer.current = setTimeout(async () => {
      const addr = await reverseGeocode(lat, lng);
      setAddress(addr || tx.noAddress);
      setGeocoding(false);
    }, 600);
  }

  const handleGPS = () => {
    if (!navigator.geolocation) { setGpsError(tx.gpsError); return; }
    setGpsLoading(true);
    setGpsError("");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const map = leafletMap.current;
        const marker = markerRef.current;
        if (map && marker) {
          map.setView([latitude, longitude], 17, { animate: true });
          marker.setLatLng([latitude, longitude]);
        }
        updatePosition(latitude, longitude);
        setGpsLoading(false);
      },
      () => {
        setGpsError(tx.gpsError);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleConfirm = () => {
    if (!position) return;
    setConfirmed(true);
    setTimeout(() => onConfirm({ lat: position.lat, lng: position.lng }), 300);
  };

  return (
    <div style={{
      position: "fixed", inset: 0,
      display: "flex", flexDirection: "column",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      background: "#f5f5f5",
    }}>

      {/* ── Top bar — Google Maps uslubida ── */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        zIndex: 1000, padding: "12px 12px 8px",
        pointerEvents: "none",
      }}>
        {/* Sarlavha kartochkasi */}
        <div style={{
          background: "white",
          borderRadius: 16,
          padding: "12px 16px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.1)",
          pointerEvents: "auto",
        }}>
          <div style={{
            fontSize: 15, fontWeight: 700, color: "#1a1a1a", marginBottom: 2,
          }}>
            {tx.title}
          </div>
          <div style={{ fontSize: 12, color: "#888" }}>{tx.subtitle}</div>
        </div>
      </div>

      {/* ── Xarita ── */}
      <div ref={mapRef} style={{ flex: 1, width: "100%" }} />

      {/* ── GPS tugmasi — xarita ustida o'ng tomonda ── */}
      <button
        onClick={handleGPS}
        disabled={gpsLoading}
        style={{
          position: "absolute",
          right: 12,
          bottom: 210,
          zIndex: 1000,
          width: 48, height: 48,
          borderRadius: 12,
          background: "white",
          border: "none",
          boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
          cursor: gpsLoading ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "transform 0.15s",
        }}
        onMouseDown={e => e.currentTarget.style.transform = "scale(0.93)"}
        onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
        onTouchStart={e => e.currentTarget.style.transform = "scale(0.93)"}
        onTouchEnd={e => e.currentTarget.style.transform = "scale(1)"}
      >
        {gpsLoading ? (
          <div style={{
            width: 20, height: 20, borderRadius: "50%",
            border: "2.5px solid #e0e0e0",
            borderTopColor: "#4285F4",
            animation: "spin 0.8s linear infinite",
          }} />
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="3.5" fill="#4285F4"/>
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="#4285F4" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="12" cy="12" r="8" stroke="#4285F4" strokeWidth="1.5" strokeDasharray="3 2"/>
          </svg>
        )}
      </button>

      {/* ── Pastki panel ── */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        zIndex: 1000,
        background: "white",
        borderRadius: "20px 20px 0 0",
        boxShadow: "0 -4px 24px rgba(0,0,0,0.12)",
        padding: "16px 16px calc(16px + env(safe-area-inset-bottom, 0px))",
      }}>

        {/* Manzil qatori */}
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 10,
          marginBottom: 14,
          minHeight: 48,
        }}>
          {/* Pin ikona */}
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: "#EAF2FF",
            display: "flex", alignItems: "center", justifyContent: "center",
            marginTop: 2,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#4285F4"/>
              <circle cx="12" cy="9" r="2.5" fill="white"/>
            </svg>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {geocoding ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6, paddingTop: 8 }}>
                <div style={{
                  width: 14, height: 14, borderRadius: "50%",
                  border: "2px solid #e0e0e0", borderTopColor: "#4285F4",
                  animation: "spin 0.8s linear infinite", flexShrink: 0,
                }} />
                <span style={{ fontSize: 13, color: "#888" }}>{tx.searching}</span>
              </div>
            ) : (
              <>
                <div style={{
                  fontSize: 14, fontWeight: 600, color: "#1a1a1a",
                  lineHeight: 1.4, wordBreak: "break-word",
                }}>
                  {address || (position ? tx.noAddress : "—")}
                </div>
                {position && (
                  <div style={{ fontSize: 11, color: "#bbb", marginTop: 2, fontFamily: "monospace" }}>
                    {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* GPS xato */}
        {gpsError && (
          <div style={{
            background: "#FFF3F3", border: "1px solid #FFCDD2",
            borderRadius: 10, padding: "8px 12px",
            color: "#C62828", fontSize: 12, fontWeight: 500,
            marginBottom: 12,
          }}>
            ⚠️ {gpsError}
          </div>
        )}

        {/* Tasdiqlash tugmasi */}
        <button
          onClick={handleConfirm}
          disabled={!position || confirmed}
          style={{
            width: "100%", padding: "15px",
            borderRadius: 14, border: "none",
            background: position && !confirmed
              ? "linear-gradient(135deg, #4285F4 0%, #1a73e8 100%)"
              : "#f0f0f0",
            color: position && !confirmed ? "white" : "#bbb",
            fontSize: 15, fontWeight: 700,
            cursor: position && !confirmed ? "pointer" : "not-allowed",
            boxShadow: position && !confirmed
              ? "0 4px 16px rgba(66,133,244,0.35)"
              : "none",
            transition: "all 0.2s",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            letterSpacing: -0.2,
          }}
        >
          {confirmed ? (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17L4 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              ✓
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="white"/>
                <circle cx="12" cy="9" r="2.5" fill="#4285F4"/>
              </svg>
              {tx.confirmBtn}
            </>
          )}
        </button>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .leaflet-control-zoom {
          border: none !important;
          box-shadow: 0 2px 10px rgba(0,0,0,0.2) !important;
          border-radius: 12px !important;
          overflow: hidden;
          margin-bottom: 220px !important;
          margin-right: 12px !important;
        }
        .leaflet-control-zoom a {
          width: 40px !important; height: 40px !important;
          line-height: 40px !important;
          font-size: 18px !important;
          color: #4285F4 !important;
          font-weight: 700 !important;
        }
        .leaflet-control-zoom a:hover { background: #f5f5f5 !important; }
      `}</style>
    </div>
  );
}