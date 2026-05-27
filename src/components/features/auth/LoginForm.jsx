import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useSignIn } from "../../../hooks/queries/useAuth";
import { parseAuthError } from "../../../lib/auth-errors";
import { loginSchema } from "../../../schemas/auth.schema";
import { Alert, AlertDescription } from "../../ui/alert";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const { mutate: signIn, isPending } = useSignIn();

  const onSubmit = (values) => {
    setAuthError("");
    // Navigation is handled reactively by LoginPage's useEffect once
    // AuthProvider sets the session after onAuthStateChange(SIGNED_IN).
    signIn(values, {
      onError: (error) => {
        setAuthError(parseAuthError(error));
      },
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {authError && (
        <Alert variant="destructive">
          <AlertDescription>{authError}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-1">
        <Label htmlFor="email">Correo electrónico</Label>
        <Input
          id="email"
          type="email"
          placeholder="usuario@ie8060.edu.pe"
          autoComplete="email"
          {...register("email")}
          className={
            errors.email ? "border-red-500 focus-visible:ring-red-500" : ""
          }
        />
        {errors.email && (
          <p className="text-xs text-red-500">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="password">Contraseña</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            autoComplete="current-password"
            {...register("password")}
            className={
              errors.password
                ? "border-red-500 focus-visible:ring-red-500 pr-10"
                : "pr-10"
            }
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {errors.password && (
          <p className="text-xs text-red-500">{errors.password.message}</p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
        disabled={isPending}
      >
        {isPending ? (
          <>
            <Loader2 size={16} className="mr-2 animate-spin" />
            Ingresando...
          </>
        ) : (
          "Iniciar Sesión"
        )}
      </Button>
    </form>
  );
}
