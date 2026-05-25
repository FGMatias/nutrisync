import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { TIPOS_PRODUCTO_PROVEEDOR } from "../../../constants/enums";
import {
  useCreateProveedor,
  useUpdateProveedor,
} from "../../../hooks/queries/useProveedores";
import { proveedorSchema } from "../../../schemas/proveedor.schema";
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

export default function ProveedorDrawer({ open, onOpenChange, proveedor }) {
  const isEdit = !!proveedor;
  const { mutate: create, isPending: isCreating } = useCreateProveedor();
  const { mutate: update, isPending: isUpdating } = useUpdateProveedor();
  const isPending = isCreating || isUpdating;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(proveedorSchema),
    defaultValues: { activo: true, tipo_producto: "" },
  });

  useEffect(() => {
    if (open) {
      reset(
        proveedor
          ? { ...proveedor }
          : {
              nombre: "",
              ruc: "",
              contacto: "",
              telefono: "",
              direccion: "",
              tipo_producto: "",
              activo: true,
            },
      );
    }
  }, [open, proveedor, reset]);

  const onSubmit = (values) => {
    if (isEdit) {
      update(
        { id: proveedor.id, data: values },
        {
          onSuccess: () => onOpenChange(false),
        },
      );
    } else {
      create(values, {
        onSuccess: () => onOpenChange(false),
      });
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
          <SheetTitle>
            {isEdit ? "Editar Proveedor" : "Nuevo Proveedor"}
          </SheetTitle>
          <SheetDescription>
            Completa la información del proveedor
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            padding: "24px 0 80px",
          }}
        >
          <div>
            <Label>Nombre del Proveedor *</Label>
            <Input
              {...register("nombre")}
              placeholder="Nombre de la empresa"
              style={{ marginTop: 4 }}
            />
            {fieldError("nombre")}
          </div>

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <div>
              <Label>RUC *</Label>
              <Input
                {...register("ruc")}
                placeholder="20123456789"
                maxLength={11}
                style={{ marginTop: 4 }}
              />
              {fieldError("ruc")}
            </div>
            <div>
              <Label>Teléfono</Label>
              <Input
                {...register("telefono")}
                placeholder="01-234-5678"
                style={{ marginTop: 4 }}
              />
              {fieldError("telefono")}
            </div>
          </div>

          <div>
            <Label>Nombre de Contacto</Label>
            <Input
              {...register("contacto")}
              placeholder="Nombre del representante"
              style={{ marginTop: 4 }}
            />
            {fieldError("contacto")}
          </div>

          <div>
            <Label>Dirección</Label>
            <Input
              {...register("direccion")}
              placeholder="Av. ejemplo 123, Lima"
              style={{ marginTop: 4 }}
            />
            {fieldError("direccion")}
          </div>

          <div>
            <Label>Tipo de Producto *</Label>
            <Select
              value={watch("tipo_producto")}
              onValueChange={(val) =>
                setValue("tipo_producto", val, { shouldValidate: true })
              }
            >
              <SelectTrigger style={{ marginTop: 4 }}>
                <SelectValue placeholder="Seleccionar tipo..." />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_PRODUCTO_PROVEEDOR.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldError("tipo_producto")}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Checkbox
              id="activo"
              checked={watch("activo")}
              onCheckedChange={(v) => setValue("activo", v)}
            />
            <Label htmlFor="activo" style={{ cursor: "pointer" }}>
              Proveedor activo
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
              <>
                <Loader2 size={14} className="mr-2 animate-spin" /> Guardando...
              </>
            ) : isEdit ? (
              "Actualizar"
            ) : (
              "Crear Proveedor"
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
