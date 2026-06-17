import { useState } from "react";
import { FileText, Plus } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import DataTable from "../components/shared/DataTable";
import FilterBar from "../components/shared/FilterBar";
import PageHeader from "../components/shared/PageHeader";
import SearchBar from "../components/shared/SearchBar";
import TablePagination from "../components/shared/TablePagination";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
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
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "../components/ui/sheet";
import { toast } from "sonner";

import { useAuth } from "../hooks/queries/useAuth";
import { useProveedores } from "../hooks/queries/useProveedores";
import {
  useAccesosVehiculares,
  useRegistrarEntrada,
  useRegistrarSalida,
} from "../hooks/queries/useVehiculos";
import { getManifiestoUrl } from "../services/vehiculos.service";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";

const PAGE_SIZE = 10;

export default function VehiculosPage() {
  const { perfil } = useAuth();
  const [search, setSearch] = useState("");
  const [filtroProveedor, setFiltroProveedor] = useState("todos");
  const [soloEnPlanta, setSoloEnPlanta] = useState(false);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [vehiculoDetalle, setVehiculoDetalle] = useState(null);

  const getLocalDatetimeString = (date = new Date()) => {
    const tzOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  // Form states
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState("");
  const [placa, setPlaca] = useState("");
  const [conductor, setConductor] = useState("");
  const [horaEntrada, setHoraEntrada] = useState(getLocalDatetimeString());
  const [horaSalida, setHoraSalida] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [archivo, setArchivo] = useState(null);

  const activeFilters =
    (filtroProveedor !== "todos" ? 1 : 0) +
    (soloEnPlanta ? 1 : 0) +
    (fechaInicio ? 1 : 0) +
    (fechaFin ? 1 : 0);

  // Queries
  const { data: vehiculosData, isFetching: isFetchingVehiculos } =
    useAccesosVehiculares({
      page,
      pageSize: PAGE_SIZE,
      search,
      proveedorId: filtroProveedor,
      soloEnPlanta,
      fechaInicio,
      fechaFin,
    });

  const { data: proveedoresData } = useProveedores({ pageSize: 1000, activo: true });
  const proveedoresList = proveedoresData?.data ?? [];

  // Mutations
  const { mutate: registrarEntrada, isPending: isRegistrando } = useRegistrarEntrada();
  const { mutate: registrarSalida, isPending: isSaliendo } = useRegistrarSalida();

  const handleRegistrarEntrada = () => {
    if (!proveedorSeleccionado) {
      toast.error("Seleccione un proveedor");
      return;
    }
    if (!placa) {
      toast.error("Ingrese la placa");
      return;
    }
    if (!conductor) {
      toast.error("Ingrese el conductor");
      return;
    }

    registrarEntrada(
      {
        payload: {
          id_proveedor: proveedorSeleccionado,
          placa,
          conductor,
          hora_entrada: new Date(horaEntrada).toISOString(),
          hora_salida: horaSalida ? new Date(horaSalida).toISOString() : null,
          observaciones,
          registrado_por: perfil?.id,
        },
        file: archivo,
      },
      {
        onSuccess: () => {
          setDrawerOpen(false);
          // reset form
          setProveedorSeleccionado("");
          setPlaca("");
          setConductor("");
          setHoraEntrada(getLocalDatetimeString());
          setHoraSalida("");
          setObservaciones("");
          setArchivo(null);
        },
      },
    );
  };

  const handleRegistrarSalida = (row) => {
    let salida = new Date();
    // Prevent check constraint violation if manually registering exit before recorded entry
    if (salida < new Date(row.hora_entrada)) {
      salida = new Date(new Date(row.hora_entrada).getTime() + 60000);
    }
    registrarSalida({ id: row.id, hora_salida: salida.toISOString() });
  };

  const handleVerManifiesto = async (filePath) => {
    try {
      const newWindow = window.open("", "_blank");
      if (newWindow) newWindow.document.write("Cargando manifiesto...");
      const url = await getManifiestoUrl(filePath);
      if (newWindow) {
        newWindow.location.href = url;
      } else {
        window.location.href = url;
      }
    } catch (error) {
      toast.error("No se pudo obtener el archivo");
    }
  };

  const columns = [
    {
      key: "proveedor_nombre",
      header: "Proveedor",
      render: (v, row) => (
        <span style={{ fontWeight: 500 }}>{row.proveedores?.nombre ?? "-"}</span>
      ),
    },
    {
      key: "placa",
      header: "Placa",
      render: (v) => (
        <span style={{ fontFamily: "monospace", fontWeight: 600, fontSize: 13 }}>
          {v}
        </span>
      ),
    },
    { key: "conductor", header: "Conductor" },
    {
      key: "hora_entrada",
      header: "Hora Entrada",
      render: (v) => format(new Date(v), "dd/MM HH:mm", { locale: es }),
    },
    {
      key: "hora_salida",
      header: "Hora Salida",
      render: (v) => {
        const isCompletado = v && new Date(v) <= new Date();
        return isCompletado ? (
          <Badge
            style={{
              background: "var(--success-bg)",
              color: "var(--success)",
              border: "none",
              fontSize: 11,
            }}
          >
            ✓ Completado
          </Badge>
        ) : (
          <Badge
            style={{
              background: "var(--warning-bg)",
              color: "var(--warning)",
              border: "none",
              fontSize: 11,
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--warning)",
                marginRight: 4,
                animation: "pulse 1.5s infinite",
              }}
            />
            En planta
          </Badge>
        );
      },
    },
    {
      key: "manifiesto_url",
      header: "Manifiesto",
      align: "center",
      render: (_, row) =>
        row.ruta_manifiesto ? (
          <Button 
            variant="ghost" 
            size="sm" 
            style={{ fontSize: 11, height: 28 }}
            onClick={() => handleVerManifiesto(row.ruta_manifiesto)}
          >
            <FileText size={12} style={{ marginRight: 4 }} />
            Ver
          </Button>
        ) : (
          <span style={{ color: "var(--muted-fg)" }}>—</span>
        ),
    },
    {
      key: "acciones",
      header: "Acciones",
      align: "center",
      width: 130,
      render: (_, row) => {
        const isCompletado = row.hora_salida && new Date(row.hora_salida) <= new Date();
        return (
          <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
            {!isCompletado && (
              <Button
                variant="outline"
                size="sm"
                style={{ fontSize: 11, height: 28 }}
                onClick={() => handleRegistrarSalida(row)}
                disabled={isSaliendo}
              >
                Reg. Salida
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              style={{ fontSize: 11, height: 28 }}
              onClick={() => setVehiculoDetalle(row)}
            >
              Ver
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Control Vehicular"
        subtitle="Registro de accesos de proveedores"
        actions={
          <Button
            onClick={() => setDrawerOpen(true)}
            style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
          >
            <Plus size={15} style={{ marginRight: 4 }} /> Registrar Entrada
          </Button>
        }
      />

      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 16,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Buscar por placa o conductor..."
        />
        <FilterBar
          activeCount={activeFilters}
          onClear={() => {
            setFiltroProveedor("todos");
            setSoloEnPlanta(false);
            setFechaInicio("");
            setFechaFin("");
            setPage(1);
          }}
        >
          <Input
            type="date"
            style={{ width: 160, height: 36, fontSize: 13 }}
            value={fechaInicio}
            onChange={(e) => {
              setFechaInicio(e.target.value);
              setPage(1);
            }}
          />
          <Input
            type="date"
            style={{ width: 160, height: 36, fontSize: 13 }}
            value={fechaFin}
            onChange={(e) => {
              setFechaFin(e.target.value);
              setPage(1);
            }}
          />
          <Select
            value={filtroProveedor}
            onValueChange={(val) => {
              setFiltroProveedor(val);
              setPage(1);
            }}
          >
            <SelectTrigger style={{ width: 200, height: 36 }}>
              <SelectValue placeholder="Todos los proveedores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los proveedores</SelectItem>
              {proveedoresList.map((p) => (
                <SelectItem key={p.id} value={p.id.toString()}>
                  {p.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant={soloEnPlanta ? "default" : "outline"}
            size="sm"
            style={{
              height: 36,
              ...(soloEnPlanta
                ? { background: "var(--primary)", color: "var(--primary-fg)" }
                : {}),
            }}
            onClick={() => {
              setSoloEnPlanta((v) => !v);
              setPage(1);
            }}
          >
            Solo en planta
          </Button>
        </FilterBar>
      </div>

      <DataTable
        columns={columns}
        data={vehiculosData?.data ?? []}
        loading={isFetchingVehiculos}
      />
      <TablePagination
        page={page}
        totalPages={Math.ceil((vehiculosData?.count ?? 0) / PAGE_SIZE) || 1}
        total={vehiculosData?.count ?? 0}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent style={{ width: 480, maxWidth: "95vw" }}>
          <SheetHeader>
            <SheetTitle>Registrar Entrada Vehicular</SheetTitle>
          </SheetHeader>
          <div
            style={{
              padding: "24px 0 80px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div>
              <Label>Proveedor *</Label>
              <Select
                value={proveedorSeleccionado}
                onValueChange={setProveedorSeleccionado}
              >
                <SelectTrigger style={{ marginTop: 4 }}>
                  <SelectValue placeholder="Seleccionar proveedor..." />
                </SelectTrigger>
                <SelectContent>
                  {proveedoresList.map((p) => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <Label>Placa *</Label>
                <Input
                  placeholder="ABC-123"
                  style={{ marginTop: 4 }}
                  value={placa}
                  onChange={(e) => setPlaca(e.target.value)}
                />
              </div>
              <div>
                <Label>Conductor *</Label>
                <Input
                  placeholder="Nombre del conductor"
                  style={{ marginTop: 4 }}
                  value={conductor}
                  onChange={(e) => setConductor(e.target.value)}
                />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <Label>Hora de entrada</Label>
                <Input
                  type="datetime-local"
                  style={{ marginTop: 4 }}
                  value={horaEntrada}
                  onChange={(e) => setHoraEntrada(e.target.value)}
                />
              </div>
              <div>
                <Label>Hora de salida (opcional)</Label>
                <Input
                  type="datetime-local"
                  style={{ marginTop: 4 }}
                  value={horaSalida}
                  onChange={(e) => setHoraSalida(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label>Adjuntar manifiesto</Label>
              <Input
                type="file"
                accept=".pdf,.jpg,.png"
                style={{ marginTop: 4 }}
                onChange={(e) => setArchivo(e.target.files[0])}
              />
            </div>
            <div>
              <Label>Observaciones</Label>
              <textarea
                placeholder="Notas adicionales..."
                style={{
                  marginTop: 4,
                  width: "100%",
                  minHeight: 80,
                  padding: "8px 12px",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  fontSize: 13,
                  resize: "vertical",
                  background: "transparent",
                  color: "var(--fg)",
                }}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
              />
            </div>
          </div>
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
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>
              Cancelar
            </Button>
            <Button
              style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
              onClick={handleRegistrarEntrada}
              disabled={isRegistrando}
            >
              {isRegistrando ? "Registrando..." : "Registrar entrada"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={!!vehiculoDetalle} onOpenChange={(o) => !o && setVehiculoDetalle(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalle de Acceso Vehicular</DialogTitle>
          </DialogHeader>
          {vehiculoDetalle && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "16px 0", fontSize: 14 }}>
               <div><strong>Proveedor:</strong> {vehiculoDetalle.proveedores?.nombre ?? "-"}</div>
               <div><strong>Placa:</strong> {vehiculoDetalle.placa}</div>
               <div><strong>Conductor:</strong> {vehiculoDetalle.conductor}</div>
               <div><strong>Hora Entrada:</strong> {format(new Date(vehiculoDetalle.hora_entrada), "dd/MM/yyyy HH:mm")}</div>
               <div>
                  <strong>Hora Salida:</strong>{" "}
                  {vehiculoDetalle.hora_salida 
                    ? format(new Date(vehiculoDetalle.hora_salida), "dd/MM/yyyy HH:mm") 
                    : "En planta"}
               </div>
               <div><strong>Observaciones:</strong> {vehiculoDetalle.observaciones || "Ninguna"}</div>
            </div>
          )}
          <DialogFooter>
             <Button onClick={() => setVehiculoDetalle(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
