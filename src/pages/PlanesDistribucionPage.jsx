import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarCheck, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import ConfirmDialog from "../components/shared/ConfirmDialog";
import DataTable from "../components/shared/DataTable";
import PageHeader from "../components/shared/PageHeader";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Checkbox } from "../components/ui/checkbox";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "../components/ui/sheet";
import { useInventario } from "../hooks/queries/useProductos";
import {
  useAlumnosActivosCount,
  useCreatePlanDistribucion,
  useDeletePlanDistribucion,
  usePlanesDistribucion,
  useUpdatePlanDistribucion,
} from "../hooks/queries/usePlanesDistribucion";
import { planDistribucionSchema } from "../schemas/planDistribucion.schema";

function todayISO() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

const ACTIVE_OPTIONS = [
  { value: "todos", label: "Todos los estados" },
  { value: "true", label: "Activos" },
  { value: "false", label: "Inactivos" },
];

export default function PlanesDistribucionPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filterFecha, setFilterFecha] = useState("");
  const [filterActivo, setFilterActivo] = useState("todos");

  const filters = useMemo(() => {
    const f = {};
    if (filterFecha) f.fecha = filterFecha;
    if (filterActivo !== "todos") f.activo = filterActivo === "true";
    return f;
  }, [filterFecha, filterActivo]);

  const { data: planes = [], isLoading } = usePlanesDistribucion(filters);
  const { data: alumnosCount = 0 } = useAlumnosActivosCount();
  const { data: inventario = [] } = useInventario();
  const { mutate: deletePlan, isPending: isDeleting } = useDeletePlanDistribucion();

  const productosActivos = useMemo(
    () => inventario.filter((p) => p.activo !== false),
    [inventario],
  );

  const hoy = todayISO();
  const planesHoy = useMemo(
    () => planes.filter((p) => p.fecha === hoy && p.activo),
    [planes, hoy],
  );
  const totalUnidadesHoy = useMemo(
    () => planesHoy.reduce((sum, p) => sum + p.cantidad_por_alumno * alumnosCount, 0),
    [planesHoy, alumnosCount],
  );

  const columns = [
    {
      key: "fecha",
      header: "Fecha",
      render: (value) => formatDate(value),
    },
    {
      key: "producto",
      header: "Producto",
      render: (prod, row) => (
        <span>
          {prod?.nombre ?? `Producto #${row.id_producto}`}
          {prod?.unidad_medida && (
            <span style={{ color: "var(--muted-fg)", fontSize: 12 }}>
              {" "}({prod.unidad_medida})
            </span>
          )}
        </span>
      ),
    },
    {
      key: "cantidad_por_alumno",
      header: "Cant/alumno",
      render: (value) => value,
    },
    {
      key: "id",
      header: "Total estimado",
      render: (_, row) => (
        <span style={{ fontVariantNumeric: "tabular-nums" }}>
          {((row.cantidad_por_alumno ?? 0) * alumnosCount).toLocaleString()}
        </span>
      ),
    },
    {
      key: "activo",
      header: "Estado",
      render: (value) =>
        value ? (
          <Badge style={{ background: "var(--success-bg)", color: "var(--success)" }}>Activo</Badge>
        ) : (
          <Badge style={{ background: "var(--muted)", color: "var(--muted-fg)" }}>Inactivo</Badge>
        ),
    },
    {
      key: "creado_en",
      header: "Acciones",
      render: (_, row) => (
        <div style={{ display: "flex", gap: 4 }}>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => { setEditing(row); setDrawerOpen(true); }}
          >
            <Pencil size={14} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDeleteTarget(row)}
            style={{ color: "var(--danger)" }}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Planes de Distribución"
        subtitle="Define qué productos y cuántos se distribuyen por alumno cada día"
        actions={
          <Button
            onClick={() => { setEditing(null); setDrawerOpen(true); }}
            style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
          >
            <Plus size={15} style={{ marginRight: 6 }} />
            Nuevo Plan
          </Button>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
        <SummaryCard label="Productos planificados hoy" value={planesHoy.length} icon={<CalendarCheck size={18} />} />
        <SummaryCard label="Alumnos activos" value={alumnosCount} />
        <SummaryCard label="Unidades estimadas hoy" value={totalUnidadesHoy.toLocaleString()} />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <Input
          type="date"
          value={filterFecha}
          onChange={(e) => setFilterFecha(e.target.value)}
          style={{ width: 160 }}
        />
        <Select value={filterActivo} onValueChange={setFilterActivo}>
          <SelectTrigger style={{ width: 180 }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACTIVE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(filterFecha || filterActivo !== "todos") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setFilterFecha(""); setFilterActivo("todos"); }}
          >
            Limpiar
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={planes}
        loading={isLoading}
        emptyMessage="Sin planes registrados"
      />

      <PlanDrawer
        open={drawerOpen}
        onOpenChange={(v) => { setDrawerOpen(v); if (!v) setEditing(null); }}
        plan={editing}
        productosActivos={productosActivos}
        alumnosCount={alumnosCount}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="¿Eliminar plan?"
        description={
          deleteTarget
            ? `Vas a eliminar el plan de "${deleteTarget.producto?.nombre ?? "este producto"}" para el ${formatDate(deleteTarget.fecha)}.`
            : ""
        }
        onConfirm={() =>
          deletePlan(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }
        loading={isDeleting}
        variant="danger"
        confirmLabel="Eliminar"
      />
    </div>
  );
}

function SummaryCard({ label, value, icon }) {
  return (
    <Card>
      <CardContent style={{ padding: "16px", display: "flex", alignItems: "center", gap: 12 }}>
        {icon && (
          <div style={{ color: "var(--primary)", flexShrink: 0 }}>{icon}</div>
        )}
        <div>
          <p style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "var(--fg)" }}>{value}</p>
          <p style={{ fontSize: 12, color: "var(--muted-fg)", margin: 0 }}>{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function PlanDrawer({ open, onOpenChange, plan, productosActivos, alumnosCount }) {
  const isEdit = !!plan;
  const { mutate: create, isPending: isCreating } = useCreatePlanDistribucion();
  const { mutate: update, isPending: isUpdating } = useUpdatePlanDistribucion();
  const isPending = isCreating || isUpdating;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(planDistribucionSchema),
    defaultValues: {
      fecha: todayISO(),
      id_producto: "",
      cantidad_por_alumno: 1,
      activo: true,
    },
  });

  const watchProducto = watch("id_producto");
  const watchCantidad = watch("cantidad_por_alumno");
  const totalEstimado = Number(watchCantidad) > 0 ? Number(watchCantidad) * alumnosCount : 0;

  useEffect(() => {
    if (open) {
      reset(
        plan
          ? {
              fecha: plan.fecha,
              id_producto: plan.id_producto,
              cantidad_por_alumno: plan.cantidad_por_alumno,
              activo: plan.activo,
            }
          : {
              fecha: todayISO(),
              id_producto: "",
              cantidad_por_alumno: 1,
              activo: true,
            },
      );
    }
  }, [open, plan, reset]);

  const onSubmit = (values) => {
    if (isEdit) {
      update(
        { id: plan.id, data: values },
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
      <SheetContent style={{ width: 440, maxWidth: "95vw", overflowY: "auto" }}>
        <SheetHeader>
          <SheetTitle>{isEdit ? "Editar Plan" : "Nuevo Plan de Distribución"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Modifica los datos del plan"
              : "Define el producto y la cantidad por alumno para un día"}
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          style={{ display: "flex", flexDirection: "column", gap: 16, padding: "24px 0 80px" }}
        >
          <div>
            <Label>Fecha *</Label>
            <Input
              type="date"
              {...register("fecha")}
              style={{ marginTop: 4 }}
            />
            {fieldError("fecha")}
          </div>

          <div>
            <Label>Producto *</Label>
            <Select
              value={String(watchProducto ?? "")}
              onValueChange={(v) => setValue("id_producto", v, { shouldValidate: true })}
            >
              <SelectTrigger style={{ marginTop: 4 }}>
                <SelectValue placeholder="Seleccionar producto..." />
              </SelectTrigger>
              <SelectContent>
                {productosActivos.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.nombre}
                    {p.unidad_medida && ` (${p.unidad_medida})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldError("id_producto")}
          </div>

          <div>
            <Label>Cantidad por alumno *</Label>
            <Input
              type="number"
              min={1}
              {...register("cantidad_por_alumno", { valueAsNumber: true })}
              style={{ marginTop: 4 }}
            />
            {fieldError("cantidad_por_alumno")}
          </div>

          {alumnosCount > 0 && Number(watchCantidad) > 0 && (
            <div
              style={{
                background: "var(--muted)",
                borderRadius: "var(--radius)",
                padding: "10px 14px",
                fontSize: 13,
                color: "var(--muted-fg)",
              }}
            >
              <strong style={{ color: "var(--fg)" }}>{alumnosCount}</strong> alumnos activos →
              total estimado:{" "}
              <strong style={{ color: "var(--primary)" }}>
                {totalEstimado.toLocaleString()} unidades
              </strong>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Checkbox
              id="plan-activo"
              checked={watch("activo")}
              onCheckedChange={(v) => setValue("activo", v)}
            />
            <Label htmlFor="plan-activo" style={{ cursor: "pointer" }}>
              Plan activo
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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
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
              "Crear Plan"
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
