import { useEffect, useState } from "react";
import { useAccesibilidad } from "../../hooks/useAccesibilidad";
import { useMobile } from "../../hooks/useMobile";
import AccesibilidadPanel from "./AccesibilidadPanel";
import Header from "./Header";
import Sidebar from "./Sidebar";

// Filtros SVG para simulación de tipos de daltonismo (matrices de Machado et al.)
function A11ySVGFilters() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
    >
      <defs>
        <filter id="a11y-deuteranopia">
          <feColorMatrix
            type="matrix"
            values="0.625 0.375 0    0 0
                    0.7   0.3   0    0 0
                    0     0.3   0.7  0 0
                    0     0     0    1 0"
          />
        </filter>
        <filter id="a11y-protanopia">
          <feColorMatrix
            type="matrix"
            values="0.567 0.433 0     0 0
                    0.558 0.442 0     0 0
                    0     0.242 0.758 0 0
                    0     0     0     1 0"
          />
        </filter>
        <filter id="a11y-tritanopia">
          <feColorMatrix
            type="matrix"
            values="0.95  0.05  0     0 0
                    0     0.433 0.567 0 0
                    0     0.475 0.525 0 0
                    0     0     0     1 0"
          />
        </filter>
      </defs>
    </svg>
  );
}

// Overlay que sigue al cursor oscureciendo todo excepto una banda horizontal
function MascaraLectura() {
  const [posY, setPosY] = useState(() => window.innerHeight / 2);
  const BANDA = 90;

  useEffect(() => {
    const onMouseMove = (e) => setPosY(e.clientY);
    const onTouchMove = (e) => setPosY(e.touches[0].clientY);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  const top = Math.max(0, posY - BANDA / 2);
  const bottom = posY + BANDA / 2;

  const overlay = {
    position: "fixed",
    left: 0,
    right: 0,
    background: "rgba(0,0,0,0.52)",
    pointerEvents: "none",
    zIndex: 9990,
  };

  return (
    <>
      <div aria-hidden="true" style={{ ...overlay, top: 0, height: top }} />
      <div aria-hidden="true" style={{ ...overlay, top: bottom, bottom: 0 }} />
    </>
  );
}

export default function AppShell({ children }) {
  const { isMobile, isTablet } = useMobile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accesibilidadOpen, setAccesibilidadOpen] = useState(false);
  const a11y = useAccesibilidad();

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <A11ySVGFilters />

      {a11y.mascaraLectura && <MascaraLectura />}

      {/* Backdrop para mobile */}
      {(isMobile || isTablet) && mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            zIndex: 40,
          }}
        />
      )}

      <Sidebar
        isMobile={isMobile}
        isTablet={isTablet}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        <Header
          onMenuToggle={() => setMobileOpen((v) => !v)}
          onAccesibilidadToggle={() => setAccesibilidadOpen((v) => !v)}
        />
        <AccesibilidadPanel
          open={accesibilidadOpen}
          onOpenChange={setAccesibilidadOpen}
          a11y={a11y}
        />
        <main
          style={{
            flex: 1,
            overflowY: "auto",
            padding: isMobile ? "16px" : "24px",
            background: "var(--bg)",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
