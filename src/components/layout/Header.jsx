import { Bell, LogOut, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { NAV_ITEMS } from "../../constants/nav";
import { useAuth, useSignOut } from "../../hooks/queries/useAuth";
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

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { perfil } = useAuth();
  const { mutate: signOut } = useSignOut();
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
        padding: "0 24px",
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 14, fontWeight: 500, color: "var(--fg)" }}>
        {getPageLabel(location.pathname)}
      </span>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDark((v) => !v)}
          title="Cambiar tema"
        >
          {dark ? <Sun size={16} /> : <Moon size={16} />}
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
              }}
            >
              {getInitials(perfil?.nombre_completo)}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" style={{ minWidth: 160 }}>
            <div style={{ padding: "8px 12px" }}>
              <p style={{ fontSize: 12, fontWeight: 500 }}>
                {perfil?.nombre_completo}
              </p>
              <p style={{ fontSize: 11, color: "var(--muted-fg)" }}>
                {perfil?.rol}
              </p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() =>
                signOut(undefined, {
                  onSuccess: () => navigate("/login", { replace: true }),
                })
              }
              style={{ color: "var(--danger)", cursor: "pointer" }}
            >
              <LogOut size={14} className="mr-2" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
