import { useState } from "react";
import { useMobile } from "../../hooks/useMobile";
import Header from "./Header";
import Sidebar from "./Sidebar";

export default function AppShell({ children }) {
  const { isMobile, isTablet } = useMobile();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
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
        <Header onMenuToggle={() => setMobileOpen((v) => !v)} />
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
