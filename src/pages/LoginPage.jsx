import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LoginForm from "../components/features/auth/LoginForm";
import { ROLE_DEFAULT_VIEW } from "../constants/roles";
import { useAuth } from "../hooks/queries/useAuth";

function NutriSyncLogo({ size = 48 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="24" cy="24" r="22" fill="hsl(174,72%,24%)" opacity="0.12" />
      <path
        d="M24 8 C16 8 10 16 10 24 C10 32 16 38 24 38"
        stroke="hsl(174,72%,24%)"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M24 8 C32 8 38 16 38 24 C38 32 32 38 24 38"
        stroke="hsl(174,72%,24%)"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M15 28 Q24 22 33 28"
        stroke="hsl(174,72%,24%)"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="24" cy="24" r="3" fill="hsl(174,72%,24%)" />
      <path
        d="M24 12 C20 16 20 20 24 20 C28 20 28 16 24 12Z"
        fill="hsl(174,72%,24%)"
        opacity="0.7"
      />
    </svg>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, perfil } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated && perfil) {
      const destino = ROLE_DEFAULT_VIEW[perfil.rol] ?? "/dashboard";
      navigate(destino, { replace: true });
    }
  }, [isAuthenticated, isLoading, perfil, navigate]);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: "#0d3d30" }}
    >
      <div
        className="w-full max-w-sm rounded-lg p-8"
        style={{
          background: "var(--card)",
          color: "var(--card-fg)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
        }}
      >
        <div className="flex flex-col items-center mb-6">
          <NutriSyncLogo size={52} />
          <h1
            className="mt-2 text-xl font-bold"
            style={{ color: "hsl(174,72%,24%)" }}
          >
            Chasquis
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted-fg)" }}>
            IE 8060 · Sistema PAE
          </p>
        </div>

        <LoginForm />

        <p className="mt-6 text-center text-xs" style={{ color: "var(--muted-fg)" }}>
          Chasquis v1.0 · Programa de Alimentación Escolar
        </p>
      </div>
    </div>
  );
}
