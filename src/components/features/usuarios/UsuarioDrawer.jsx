import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { ALUMNOS_MOCK } from "../../../mock/alumnos.mock";
import { usuarioCreateSchema, usuarioSchema } from "../../../schemas/usuario.schema";
import { ROLE_LABELS, ROLES } from "../../../constants/roles";
import {
  useCreateUsuario,
  useUpdateUsuario,
} from "../../../hooks/queries/useUsuarios";
import { Button } from "../../ui/button";
import { Checkbox } from "../../ui/checkbox";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "../../ui/sheet";

export default function UsuarioDrawer({ open, onOpenChange, usuario }) {
  const isEdit = !!usuario;
  const schema = isEdit ? usuarioSchema : usuarioCreateSchema;

  const { mutate: create, isPending: isCreating } = useCreateUsuario();
  const { mutate: update, isPending: isUpdating } = useUpdateUsuario();
  const isPending = isCreating || isUpdating;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { activo: true, rol: "", id_alumno: null },
  });

  const watchRol = watch("rol");

  useEffect(() => {
    if (open) {
      reset(
        usuario
          ? {
              nombre_completo: usuario.nombre_completo,
              email: usuario.email,
              dni: usuario.dni ?? "",
              telefono: usuario.telefono ?? "",
              rol: usuario.rol,
              activo: usuario.activo,
              id_alumno: usuario.id_alumno ?? null,
            }
          : {
              nombre_completo: "",
              email: "",
              dni: "",
              telefono: "",
              rol: "",
              activo: true,
              id_alumno: null,
            },
      );
    }
  }, [open, usuario, reset]);

  const onSubmit = (values) => {
    if (isEdit) {
      const { email: _email, ...rest } = values;
      update(
        { id: usuario.id, data: rest },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      create(values, { onSuccess: () => onOpenChange(false) });
    }
  };

  const fieldError = (key) =>
    errors[key] && (
      <p style={{ fontSize: 11, color: "var(--danger)", marginTop: 2 }}>
        {errors[key].message}
      </p>
    );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent style={{ width: 480, maxWidth: "95vw", overflowY: "auto" }}>
        <SheetHeader>
          <SheetTitle>{isEdit ? "Editar Usuario" : "Nuevo Usuario"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Modifica los datos del usuario"
              : "Completa los datos para crear la cuenta"}
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          style={{ display: "flex", flexDirection: "column", gap: 16, padding: "24px 0 80px" }}
        >
          <div>
            <Label>Nombre completo *</Label>
            <Input
              {...register("nombre_completo")}
              placeholder="Nombre y apellidos"
              style={{ marginTop: 4 }}
            />
            {fieldError("nombre_completo")}
          </div>

          <div>
            <Label>Correo electrónico {!isEdit && "*"}</Label>
            <Input
              {...register("email")}
              type="email"
              placeholder="usuario@ie8060.edu.pe"
              readOnly={isEdit}
              style={{
                marginTop: 4,
                ...(isEdit && {
                  background: "var(--muted)",
                  cursor: "default",
                  color: "var(--muted-fg)",
                }),
              }}
            />
            {isEdit && (
              <p style={{ fontSize: 11, color: "var(--muted-fg)", marginTop: 2 }}>
                El correo no puede modificarse desde aquí.
              </p>
            )}
            {fieldError("email")}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <Label>DNI</Label>
              <Input
                {...register("dni")}
                placeholder="12345678"
                maxLength={8}
                style={{ marginTop: 4 }}
              />
              {fieldError("dni")}
            </div>
            <div>
              <Label>Teléfono</Label>
              <Input
                {...register("telefono")}
                placeholder="999 999 999"
                style={{ marginTop: 4 }}
              />
              {fieldError("telefono")}
            </div>
          </div>

          <div>
            <Label>Rol *</Label>
            <Select
              value={watchRol}
              onValueChange={(v) => {
                setValue("rol", v, { shouldValidate: true });
                if (v !== ROLES.PADRE_FAMILIA) {
                  setValue("id_alumno", null);
                }
              }}
            >
              <SelectTrigger style={{ marginTop: 4 }}>
                <SelectValue placeholder="Seleccionar rol..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ROLE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldError("rol")}
          </div>

          {watchRol === ROLES.PADRE_FAMILIA && (
            <div>
              <Label>Alumno vinculado</Label>
              <Select
                value={watch("id_alumno") ?? ""}
                onValueChange={(v) =>
                  setValue("id_alumno", v || null, { shouldValidate: true })
                }
              >
                <SelectTrigger style={{ marginTop: 4 }}>
                  <SelectValue placeholder="Seleccionar alumno..." />
                </SelectTrigger>
                <SelectContent>
                  {ALUMNOS_MOCK.filter((a) => a.activo).map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.nombre} {a.apellido} — {a.grado} {a.seccion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldError("id_alumno")}
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Checkbox
              id="usuario-activo"
              checked={watch("activo")}
              onCheckedChange={(v) => setValue("activo", v)}
            />
            <Label htmlFor="usuario-activo" style={{ cursor: "pointer" }}>
              Usuario activo
            </Label>
          </div>
        </form>

        <SheetFooter
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "12px 24px",
            background: "var(--card)",
            borderTop: "1px solid var(--border)",
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
          }}
        >
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit(onSubmit)}
            disabled={isPending}
            style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
          >
            {isPending ? (
              <><Loader2 size={14} className="mr-2 animate-spin" /> Guardando...</>
            ) : isEdit ? (
              "Actualizar"
            ) : (
              "Crear Usuario"
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
