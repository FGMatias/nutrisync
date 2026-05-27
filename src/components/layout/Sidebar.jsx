import {
  AlertTriangle,
  BarChart3,
  Boxes,
  Building2,
  ChevronLeft,
  ChevronRight,
  FileText,
  LayoutDashboard,
  LogOut,
  PackagePlus,
  QrCode,
  Tag,
  Truck,
  UserCog,
  Users,
  Utensils,
} from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { NAV_ITEMS } from "../../constants/nav";
import { ROLE_LABELS } from "../../constants/roles";
import { useAuth, useSignOut } from "../../hooks/queries/useAuth";
import ConfirmDialog from "../shared/ConfirmDialog";

const ICON_MAP = {
  LayoutDashboard,
  Building2,
  PackagePlus,
  Boxes,
  Users,
  QrCode,
  Utensils,
  Truck,
  BarChart3,
  FileText,
  AlertTriangle,
  Tag,
  UserCog,
};

function NavIcon({ name, size = 16 }) {
  const Icon = ICON_MAP[name];
  return Icon ? <Icon size={size} /> : null;
}

function getInitials(name = "") {
  return (
    name
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "U"
  );
}

export default function Sidebar({ isMobile, isTablet, mobileOpen, onMobileClose }) {
  const { perfil } = useAuth();
  const navigate = useNavigate();
  const { mutate: signOut, isPending: isSigningOut } = useSignOut();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  const [collapsed, setCollapsed] = useState(() => {
    if (isTablet) return true;
    return localStorage.getItem("nutrisync-sidebar") === "true";
  });

  // Auto-colapsar al entrar a tablet, restaurar al volver a desktop
  useEffect(() => {
    if (isTablet) setCollapsed(true);
  }, [isTablet]);

  useEffect(() => {
    if (!isMobile && !isTablet) {
      localStorage.setItem("nutrisync-sidebar", String(collapsed));
    }
  }, [collapsed, isMobile, isTablet]);

  const filteredNav = NAV_ITEMS.filter(
    (item) => !perfil?.rol || item.roles.includes(perfil.rol),
  );

  // En mobile: drawer off-canvas (siempre expandido, slide in/out)
  // En tablet/desktop: sidebar fijo con colapso por icono
  const isDrawer = isMobile || isTablet;
  const sidebarWidth = isDrawer ? 240 : collapsed ? 64 : 240;

  const sidebarStyle = isDrawer
    ? {
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        width: 240,
        zIndex: 50,
        transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.25s ease",
        background: "var(--sidebar-bg)",
        borderRight: "1px solid var(--sidebar-border)",
        display: "flex",
        flexDirection: "column",
      }
    : {
        width: sidebarWidth,
        minWidth: sidebarWidth,
        background: "var(--sidebar-bg)",
        borderRight: "1px solid var(--sidebar-border)",
        display: "flex",
        flexDirection: "column",
        transition: "width 0.2s ease, min-width 0.2s ease",
        overflow: "hidden",
      };

  const showLabels = isDrawer ? true : !collapsed;

  return (
    <div style={sidebarStyle}>
      <div
        style={{
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: showLabels ? "space-between" : "center",
          padding: showLabels ? "0 12px 0 16px" : "0 12px",
          borderBottom: "1px solid var(--sidebar-border)",
          gap: 8,
          flexShrink: 0,
        }}
      >
        {showLabels && (
          <span
            style={{
              fontWeight: 700,
              fontSize: 15,
              color: "var(--primary)",
              letterSpacing: "-0.3px",
            }}
          >
            NutriSync
          </span>
        )}
        {/* En drawer mobile/tablet: botón de cerrar. En desktop: colapsar */}
        <button
          onClick={isDrawer ? onMobileClose : () => setCollapsed((v) => !v)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--muted-fg)",
            display: "flex",
            alignItems: "center",
            padding: 4,
            borderRadius: 4,
          }}
          title={isDrawer ? "Cerrar" : collapsed ? "Expandir" : "Colapsar"}
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      <nav style={{ flex: 1, overflowY: "auto", padding: "8px 8px" }}>
        {filteredNav.map((item) => (
          <NavLink
            key={item.key}
            to={item.href}
            title={!showLabels ? item.label : undefined}
            onClick={isDrawer ? onMobileClose : undefined}
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: 9,
              padding: showLabels ? "7px 10px" : "8px 0",
              justifyContent: showLabels ? "flex-start" : "center",
              borderRadius: "var(--radius)",
              cursor: "pointer",
              textDecoration: "none",
              fontSize: 13,
              fontWeight: isActive ? 500 : 450,
              color: isActive ? "var(--primary)" : "var(--sidebar-fg)",
              background: isActive ? "hsla(174,72%,24%,0.10)" : "transparent",
              borderLeft: isActive
                ? "3px solid var(--primary)"
                : "3px solid transparent",
              marginBottom: 1,
              transition: "background 0.1s, color 0.1s",
            })}
          >
            <NavIcon name={item.icon} size={16} />
            {showLabels && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div
        style={{
          borderTop: "1px solid var(--sidebar-border)",
          padding: showLabels ? "12px" : "12px 0",
          display: "flex",
          alignItems: "center",
          gap: 8,
          justifyContent: showLabels ? "space-between" : "center",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "var(--primary)",
              color: "var(--primary-fg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {getInitials(perfil?.nombre_completo)}
          </div>
          {showLabels && (
            <div style={{ minWidth: 0 }}>
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--sidebar-fg)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: 120,
                  margin: 0,
                }}
              >
                {perfil?.nombre_completo ?? "Usuario"}
              </p>
              <p style={{ fontSize: 11, color: "var(--muted-fg)", margin: 0 }}>
                {ROLE_LABELS[perfil?.rol] ?? ""}
              </p>
            </div>
          )}
        </div>
        {showLabels && (
          <button
            onClick={() => setLogoutDialogOpen(true)}
            title="Cerrar sesión"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--muted-fg)",
              display: "flex",
              alignItems: "center",
              padding: 4,
              borderRadius: 4,
              flexShrink: 0,
            }}
          >
            <LogOut size={15} />
          </button>
        )}
      </div>

      <ConfirmDialog
        open={logoutDialogOpen}
        onOpenChange={setLogoutDialogOpen}
        title="¿Cerrar sesión?"
        description="Estás a punto de cerrar tu sesión actual. Si tienes cambios no guardados, podrías perderlos."
        onConfirm={() =>
          signOut(undefined, {
            onSuccess: () => navigate("/login", { replace: true }),
          })
        }
        loading={isSigningOut}
        variant="danger"
        confirmLabel="Sí, cerrar sesión"
      />
    </div>
  );
}
