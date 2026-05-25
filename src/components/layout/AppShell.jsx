import Header from "./Header";
import Sidebar from "./Sidebar";

export default function AppShell({ children }) {
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar />
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        <Header />
        <main
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px",
            background: "var(--bg)",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
