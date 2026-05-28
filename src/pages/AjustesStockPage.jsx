import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Minus, Plus, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import ConfirmDialog from "../components/shared/ConfirmDialog";
import DataTable from "../components/shared/DataTable";
import PageHeader from "../components/shared/PageHeader";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { useInventario, useAjustarStock, useAjustesStock } from "../hooks/queries/useProductos";

const TIPO_OPTIONS = [
  { value: "manual", label: "Manual" },
  { value: "correccion", label: "Corrección" },
];

const ajusteSchema = z.object({
  id_producto: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number({ required_error: "Selecciona un producto" }).int().positive("Selecciona un producto"),
  ),
  cantidad: z.preprocess(
    (v) => (v === "" ? undefined : Number(v)),
    z.number({ invalid_type_error: "Ingresa una cantidad" }).int().min(1, "Mínimo 1"),
  ),
  tipo_ajuste: z.enum(["manual", "correccion"]).default("manual"),
  motivo: z.string().max(300).optional().or(z.literal("")),
});

function formatDateTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" }) +
    " " + d.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
}

export default function AjustesStockPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sign, setSign] = useState(1);
  const [filterProducto, setFilterProducto] = useState("");
  const [filterTipo, setFilterTipo] = useState("todos");

  const filters = useMemo(() => {
    const f = {};
    if (filterProducto) f.id_producto = Number(filterProducto);
    if (filterTipo !== "todos") f.tipo_ajuste = filterTipo;
    return f;
  }, [filterProducto, filterTipo]);

  const { data: ajustes = [], isLoading } = useAjustesStock(filters);
  const { data: inventario = [] } = useInventario();
  const productosActivos = useMemo(() => inventario.filter((p) => p.activo !== false), [inventario]);

  const today = new Date().toISOString().slice(0, 10);
  const ajustesHoy = useMemo(
    () => ajustes.filter((a) => a.creado_en?.slice(0, 10) === today),
    [ajustes, today],
  );
  const sumaPositiva = useMemo(
    () => ajustesHoy.filter((a) => a.cantidad_delta > 0).reduce((s, a) => s + a.cantidad_delta, 0),
    [ajustesHoy],
  );
  const sumaNegativa = useMemo(
    () => ajustesHoy.filter((a) => a.cantidad_delta < 0).reduce((s, a) => s + a.cantidad_delta, 0),
    [ajustesHoy],
  );

  const columns = [
    {
      key: "creado_en",
      header: "Fecha",
      render: (value) => formatDateTime(value),
    },
    {
      key: "producto",
      header: "Producto",
      render: (prod, row) =>
        prod?.nombre ?? `Producto #${row.id_producto}`,
    },
    {
      key: "cantidad_delta",
      header: "Delta",
      render: (value, row) => (
        <span
          style={{
            fontWeight: 600,
            color: value > 0 ? "var(--success)" : "var(--danger)",
          }}
        >
          {value > 0 ? "+" : ""}
          {value}
          {row.producto?.unidad_medida && (
            <span style={{ fontWeight: 400, color: "var(--muted-fg)", fontSize: 12 }}>
              {" "}{row.producto.unidad_medida}
            </span>
          )}
        </span>
      ),
    },
    {
      key: "tipo_ajuste",
      header: "Tipo",
      render: (value) => (
        <Badge style={{ background: "var(--muted)", color: "var(--muted-fg)", textTransform: "capitalize" }}>
          {value}
        </Badge>
      ),
    },
    {
      key: "motivo",
      header: "Motivo",
      render: (value) => (
        <span style={{ color: "var(--muted-fg)", fontSize: 13 }}>
          {value ?? "—"}
        </span>
      ),
    },
    {
      key: "usuario",
      header: "Usuario",
      render: (value) => value?.nombre_completo ?? "—",
    },
  ];

  return (
    <div>
      <PageHeader
        title="Ajustes de Stock"
        subtitle="Registra correcciones manuales al inventario"
        actions={
          <Button
            onClick={() => { setSign(1); setDialogOpen(true); }}
            style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
          >
            <Plus size={15} style={{ marginRight: 6 }} />
            Nuevo Ajuste
          </Button>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
        <SummaryCard label="Ajustes hoy" value={ajustesHoy.length} icon={<SlidersHorizontal size={18} />} />
        <SummaryCard label="Suma entradas hoy" value={`+${sumaPositiva}`} color="var(--success)" />
        <SummaryCard label="Suma salidas hoy" value={sumaNegativa} color="var(--danger)" />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <Select value={filterProducto || "todos"} onValueChange={(v) => setFilterProducto(v === "todos" ? "" : v)}>
          <SelectTrigger style={{ width: 200 }}>
            <SelectValue placeholder="Todos los productos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los productos</SelectItem>
            {productosActivos.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>{p.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger style={{ width: 160 }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los tipos</SelectItem>
            {TIPO_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(filterProducto || filterTipo !== "todos") && (
          <Button variant="ghost" size="sm" onClick={() => { setFilterProducto(""); setFilterTipo("todos"); }}>
            Limpiar
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={ajustes}
        loading={isLoading}
        emptyMessage="Sin ajustes registrados"
      />

      <AjusteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialSign={sign}
        productosActivos={productosActivos}
      />
    </div>
  );
}

function SummaryCard({ label, value, icon, color }) {
  return (
    <Card>
      <CardContent style={{ padding: "16px", display: "flex", alignItems: "center", gap: 12 }}>
        {icon && (
          <div style={{ color: "var(--primary)", flexShrink: 0 }}>{icon}</div>
        )}
        <div>
          <p style={{ fontSize: 22, fontWeight: 700, margin: 0, color: color ?? "var(--fg)" }}>
            {value}
          </p>
          <p style={{ fontSize: 12, color: "var(--muted-fg)", margin: 0 }}>{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function AjusteDialog({ open, onOpenChange, initialSign = 1, productosActivos }) {
  const [sign, setSign] = useState(initialSign);
  const { mutate: ajustar, isPending } = useAjustarStock();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(ajusteSchema),
    defaultValues: {
      id_producto: "",
      cantidad: 1,
      tipo_ajuste: "manual",
      motivo: "",
    },
  });

  const watchProducto = watch("id_producto");
  const watchTipo = watch("tipo_ajuste");

  const handleOpenChange = (v) => {
    onOpenChange(v);
    if (!v) { reset(); setSign(initialSign); }
  };

  const onSubmit = (values) => {
    ajustar(
      {
        id_producto: values.id_producto,
        tipo_ajuste: values.tipo_ajuste,
        cantidad_delta: sign * values.cantidad,
        motivo: values.motivo || (sign > 0 ? "Entrada de stock" : "Salida de stock"),
      },
      { onSuccess: () => handleOpenChange(false) },
    );
  };

  const fieldError = (key) =>
    errors[key] && (
      <p style={{ fontSize: 11, color: "var(--danger)", marginTop: 2 }}>
        {errors[key].message}
      </p>
    );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent style={{ maxWidth: 440 }}>
        <DialogHeader>
          <DialogTitle>Nuevo Ajuste de Stock</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
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
            <Label>Cantidad *</Label>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <div style={{ display: "flex", borderRadius: "var(--radius)", overflow: "hidden", border: "1px solid var(--border)" }}>
                <button
                  type="button"
                  onClick={() => setSign(1)}
                  style={{
                    padding: "6px 14px",
                    background: sign === 1 ? "var(--success)" : "transparent",
                    color: sign === 1 ? "#fff" : "var(--fg)",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontWeight: 500,
                  }}
                >
                  <Plus size={14} /> Entrada
                </button>
                <button
                  type="button"
                  onClick={() => setSign(-1)}
                  style={{
                    padding: "6px 14px",
                    background: sign === -1 ? "var(--danger)" : "transparent",
                    color: sign === -1 ? "#fff" : "var(--fg)",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontWeight: 500,
                  }}
                >
                  <Minus size={14} /> Salida
                </button>
              </div>
              <Input
                type="number"
                min={1}
                {...register("cantidad", { valueAsNumber: true })}
                style={{ flex: 1 }}
              />
            </div>
            {fieldError("cantidad")}
          </div>

          <div>
            <Label>Tipo</Label>
            <Select
              value={watchTipo}
              onValueChange={(v) => setValue("tipo_ajuste", v)}
            >
              <SelectTrigger style={{ marginTop: 4 }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPO_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Motivo</Label>
            <Textarea
              {...register("motivo")}
              placeholder="Descripción del ajuste..."
              style={{ marginTop: 4, resize: "vertical", minHeight: 72 }}
            />
          </div>
        </form>

        <DialogFooter style={{ gap: 8 }}>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit(onSubmit)}
            disabled={isPending}
            style={{
              background: sign === 1 ? "var(--success)" : "var(--danger)",
              color: "#fff",
            }}
          >
            {isPending ? (
              <><Loader2 size={14} className="mr-2 animate-spin" /> Guardando...</>
            ) : sign === 1 ? (
              "Registrar Entrada"
            ) : (
              "Registrar Salida"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
