import { Accessibility, Bell, LogOut, Menu, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { NAV_ITEMS } from "../../constants/nav";
import { useMobile } from "../../hooks/useMobile";
import { useAuth, useSignOut } from "../../hooks/queries/useAuth";
import ConfirmDialog from "../shared/ConfirmDialog";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

function getPageLabel(pathname) {
  const item = NAV_ITEMS.find((n) => pathname.startsWith(n.href));
  return item?.label ?? "Dashboard";
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

export default function Header({ onMenuToggle, onAccesibilidadToggle }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { perfil } = useAuth();
  const { isMobile, isTablet } = useMobile();
  const { mutate: signOut, isPending: isSigningOut } = useSignOut();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains("dark"),
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <header
      style={{
        height: 56,
        background: "var(--card)",
        borderBottom: "1px solid var(--border)",
        boxShadow: "var(--shadow)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px",
        flexShrink: 0,
        gap: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        {/* Hamburger visible en mobile y tablet */}
        {(isMobile || isTablet) && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuToggle}
            title="Abrir menú"
            style={{ flexShrink: 0 }}
          >
            <Menu size={18} />
          </Button>
        )}
        <span
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: "var(--fg)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {getPageLabel(location.pathname)}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDark((v) => !v)}
          title="Cambiar tema"
        >
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </Button>

        <Button
          variant="outline"
          onClick={onAccesibilidadToggle}
          aria-label="Abrir panel de accesibilidad"
          title="Accesibilidad"
          style={{ gap: 6, fontSize: 13, height: 34, paddingInline: 12 }}
        >
          <Accessibility size={15} />
          {!isMobile && <span>Accesibilidad</span>}
        </Button>

        <div style={{ position: "relative" }}>
          <Button variant="ghost" size="icon" title="Notificaciones">
            <Bell size={16} />
          </Button>
          <span
            style={{
              position: "absolute",
              top: 6,
              right: 6,
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--danger)",
              border: "1.5px solid var(--card)",
            }}
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "var(--primary)",
                color: "var(--primary-fg)",
                border: "none",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {getInitials(perfil?.nombre_completo)}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" style={{ minWidth: 160 }}>
            <div style={{ padding: "8px 12px" }}>
              <p style={{ fontSize: 12, fontWeight: 500, margin: 0 }}>
                {perfil?.nombre_completo}
              </p>
              <p style={{ fontSize: 11, color: "var(--muted-fg)", margin: 0 }}>
                {perfil?.rol}
              </p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setLogoutDialogOpen(true)}
              style={{ color: "var(--danger)", cursor: "pointer" }}
            >
              <LogOut size={14} className="mr-2" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
    </header>
  );
}
