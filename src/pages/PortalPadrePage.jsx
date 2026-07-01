import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle2, LogOut, User } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ConfirmDialog from "../components/shared/ConfirmDialog";
import { Button } from "../components/ui/button";
import { useAuth, useSignOut } from "../hooks/queries/useAuth";
import {
  useAlumnoVinculado,
  useDistribucionesAlumno,
} from "../hooks/queries/usePortalPadre";

function getLocalDateString(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function getLast10Days() {
  return Array.from({ length: 10 }, (_, i) => getLocalDateString(i));
}

function getInitials(nombre = "", apellido = "") {
  return `${nombre[0] ?? ""}${apellido[0] ?? ""}`.toUpperCase();
}

export default function PortalPadrePage() {
  const navigate = useNavigate();
  const { mutate: signOut, isPending: isSigningOut } = useSignOut();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const { perfil } = useAuth();

  const idAlumno = perfil?.id_alumno ?? null;

  const { data: alumno, isLoading: isLoadingAlumno } =
    useAlumnoVinculado(idAlumno);
  const { data: distribuciones = [], isLoading: isLoadingDist } =
    useDistribucionesAlumno(idAlumno);

  const isLoading = isLoadingAlumno || isLoadingDist;
  const today = getLocalDateString();
  const last10Days = getLast10Days();

  const distByDate = Object.fromEntries(
    distribuciones.map((d) => [d.fecha, d]),
  );
  const todayDist = distByDate[today];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 20px",
          borderBottom: "1px solid var(--border)",
          background: "var(--card)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              background: "var(--primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>
              C
            </span>
          </div>
          <div>
            <p
              style={{
                fontWeight: 700,
                fontSize: 14,
                margin: 0,
                color: "var(--primary)",
              }}
            >
              Chasquis
            </p>
            <p style={{ fontSize: 11, color: "var(--muted-fg)", margin: 0 }}>
              Portal de Padres
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLogoutDialogOpen(true)}
        >
          <LogOut size={14} style={{ marginRight: 4 }} /> Cerrar sesión
        </Button>
      </header>

      <main
        style={{
          flex: 1,
          maxWidth: 480,
          margin: "0 auto",
          width: "100%",
          padding: 24,
        }}
      >
        {isLoading ? (
          <div
            style={{ textAlign: "center", padding: 48, color: "var(--muted-fg)" }}
          >
            Cargando...
          </div>
        ) : !idAlumno || !alumno ? (
          <div style={{ textAlign: "center", padding: 48 }}>
            <User
              size={48}
              style={{ color: "var(--muted-fg)", margin: "0 auto 16px", display: "block" }}
            />
            <h2 style={{ fontWeight: 600, marginBottom: 8 }}>
              Sin alumno vinculado
            </h2>
            <p style={{ color: "var(--muted-fg)", fontSize: 14, margin: 0 }}>
              Tu cuenta no tiene ningún alumno asociado. Contacta al
              administrador del sistema.
            </p>
          </div>
        ) : (
          <>
            <div
              style={{
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: 24,
                marginBottom: 24,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  background: "var(--primary)",
                  color: "#fff",
                  fontSize: 24,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                }}
              >
                {getInitials(alumno.nombre, alumno.apellido)}
              </div>
              <h2 style={{ fontWeight: 700, fontSize: 18, margin: "0 0 4px" }}>
                {alumno.nombre} {alumno.apellido}
              </h2>
              <p
                style={{
                  color: "var(--muted-fg)",
                  fontSize: 13,
                  margin: "0 0 20px",
                }}
              >
                {alumno.grado} Grado · Sección {alumno.seccion}
              </p>

              {todayDist ? (
                <div
                  style={{
                    background: "var(--success-bg)",
                    border: "1px solid hsl(142,60%,82%)",
                    borderRadius: 10,
                    padding: 16,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      marginBottom: 6,
                    }}
                  >
                    <CheckCircle2
                      size={22}
                      style={{ color: "var(--success)" }}
                    />
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: 15,
                        color: "var(--success)",
                      }}
                    >
                      Ración entregada hoy
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: "var(--muted-fg)", margin: 0 }}>
                    Registrado a las {String(todayDist.hora).slice(0, 5)}
                    {todayDist.docente?.nombre_completo
                      ? ` · Docente: ${todayDist.docente.nombre_completo}`
                      : ""}
                  </p>
                </div>
              ) : (
                <div
                  style={{
                    background: "var(--muted)",
                    borderRadius: 10,
                    padding: 16,
                  }}
                >
                  <p style={{ fontWeight: 600, margin: "0 0 4px" }}>
                    ⏳ Aún no registrado
                  </p>
                  <p style={{ fontSize: 12, color: "var(--muted-fg)", margin: 0 }}>
                    La distribución se registra durante el refrigerio escolar
                  </p>
                </div>
              )}
            </div>

            <div>
              <h3 style={{ fontWeight: 600, fontSize: 15, marginBottom: 16 }}>
                Historial últimos 10 días
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {last10Days.map((fecha) => {
                  const dist = distByDate[fecha];
                  const entregado = !!dist;
                  return (
                    <div
                      key={fecha}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 16px",
                        borderRadius: 8,
                        background: entregado
                          ? "var(--success-bg)"
                          : "var(--muted)",
                        border: `1px solid ${entregado ? "hsl(142,60%,88%)" : "var(--border)"}`,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          textTransform: "capitalize",
                        }}
                      >
                        {format(
                          new Date(`${fecha}T12:00:00`),
                          "EEEE d 'de' MMMM",
                          { locale: es },
                        )}
                      </span>
                      {entregado ? (
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: "var(--success)",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <CheckCircle2 size={14} /> Entregado
                        </span>
                      ) : (
                        <span
                          style={{ fontSize: 12, color: "var(--muted-fg)" }}
                        >
                          No registrado
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </main>

      <footer
        style={{
          textAlign: "center",
          padding: "16px",
          borderTop: "1px solid var(--border)",
          fontSize: 11,
          color: "var(--muted-fg)",
        }}
      >
        Chasquis · Sistema de Alimentación Escolar PAE · IE 8060 Los Chasquis
      </footer>

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
