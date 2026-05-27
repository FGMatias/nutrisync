import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import DataTable from "../components/shared/DataTable";
import FilterBar from "../components/shared/FilterBar";
import PageHeader from "../components/shared/PageHeader";
import SearchBar from "../components/shared/SearchBar";
import StatusBadge from "../components/shared/StatusBadge";
import TablePagination from "../components/shared/TablePagination";
import { useDistribuciones } from "../hooks/queries/useDistribuciones";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

const PAGE_SIZE = 10;

function toDateLabel(value) {
  const normalized = normalizeDateKey(value);
  if (normalized) {
    const [year, month, day] = normalized.split("-");
    return `${day}/${month}/${year}`;
  }

  return format(new Date(value), "dd/MM/yyyy", { locale: es });
}

function normalizeDateKey(value) {
  if (!value) return "";

  if (typeof value === "string") {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) {
      return match[1];
    }
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDistribucionDateKey(item) {
  return (
    item?.fecha_key ||
    normalizeDateKey(item?.creado_en) ||
    normalizeDateKey(item?.fecha)
  );
}

export default function DistribucionesPage() {
  const { data: distribuciones = [], isLoading } = useDistribuciones();

  const [search, setSearch] = useState("");
  const [filtroGrado, setFiltroGrado] = useState("todos");
  const [filtroOrigen, setFiltroOrigen] = useState("todos");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [page, setPage] = useState(1);
  const [selectedDistribucion, setSelectedDistribucion] = useState(null);

  const grados = useMemo(
    () =>
      Array.from(new Set(distribuciones.map((item) => item.grado).filter(Boolean))),
    [distribuciones],
  );

  const activeFilters =
    (filtroGrado !== "todos" ? 1 : 0) +
    (filtroOrigen !== "todos" ? 1 : 0) +
    (fechaDesde ? 1 : 0) +
    (fechaHasta ? 1 : 0);

  const filteredData = useMemo(() => {
    const searchValue = search.trim().toLowerCase();
    const desdeKey = normalizeDateKey(fechaDesde);
    const hastaKey = normalizeDateKey(fechaHasta);

    return distribuciones.filter((item) => {
      const alumno = item.alumno_nombre.toLowerCase();
      const docente = item.docente.toLowerCase();
      const gradoSeccion = `${item.grado} ${item.seccion}`.toLowerCase();
      const fechaItemKey = getDistribucionDateKey(item);
      const matchSearch =
        !searchValue ||
        alumno.includes(searchValue) ||
        docente.includes(searchValue) ||
        item.dni.includes(searchValue) ||
        gradoSeccion.includes(searchValue);

      const matchGrado = filtroGrado === "todos" || item.grado === filtroGrado;
      const matchOrigen =
        filtroOrigen === "todos" || item.origen === filtroOrigen;
      const matchDesde =
        !desdeKey || (fechaItemKey && fechaItemKey >= desdeKey);
      const matchHasta =
        !hastaKey || (fechaItemKey && fechaItemKey <= hastaKey);

      return (
        matchSearch &&
        matchGrado &&
        matchOrigen &&
        matchDesde &&
        matchHasta
      );
    });
  }, [distribuciones, search, filtroGrado, filtroOrigen, fechaDesde, fechaHasta]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [search, filtroGrado, filtroOrigen, fechaDesde, fechaHasta]);

  const shown = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredData.slice(start, start + PAGE_SIZE);
  }, [filteredData, page]);

  const todayString = normalizeDateKey(new Date());
  const distribucionesHoy = distribuciones.filter(
    (item) => getDistribucionDateKey(item) === todayString,
  ).length;
  const offlineCount = distribuciones.filter(
    (item) => item.origen === "offline",
  ).length;
  const onlineCount = distribuciones.filter(
    (item) => item.origen === "online",
  ).length;

  const columns = [
    {
      key: "alumno_nombre",
      header: "Alumno",
      render: (value, row) => (
        <div>
          <p style={{ fontWeight: 500, margin: 0 }}>{value}</p>
          <p style={{ fontSize: 11, color: "var(--muted-fg)", margin: 0 }}>
            DNI: {row.dni}
          </p>
        </div>
      ),
    },
    { key: "dni", header: "DNI" },
    {
      key: "grado",
      header: "Grado / Seccion",
      render: (value, row) => (
        <span style={{ fontWeight: 500 }}>
          {value} {row.seccion}
        </span>
      ),
    },
    {
      key: "fecha",
      header: "Fecha",
      render: (_, row) => toDateLabel(getDistribucionDateKey(row) || row.fecha),
    },
    { key: "hora", header: "Hora" },
    {
      key: "docente",
      header: "Docente",
      render: (value) => <span style={{ fontSize: 12 }}>{value}</span>,
    },
    {
      key: "origen",
      header: "Origen",
      render: (value) => <StatusBadge status={value} />,
    },
    {
      key: "acciones",
      header: "Acciones",
      align: "center",
      width: 120,
      render: (_, row) => (
        <Button
          variant="ghost"
          size="sm"
          style={{ fontSize: 11, height: 28 }}
          onClick={() => setSelectedDistribucion(row)}
        >
          Ver detalle
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Distribuciones"
        subtitle="Registro de entregas por escaneo QR"
        actions={
          <div style={{ display: "flex", gap: 12 }}>
            <Card
              style={{
                border: "none",
                boxShadow: "none",
                background: "var(--muted)",
              }}
            >
              <CardContent
                style={{ padding: "6px 16px", display: "flex", gap: 24 }}
              >
                <div style={{ textAlign: "center" }}>
                  <p
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      margin: 0,
                      color: "var(--primary)",
                    }}
                  >
                    {distribucionesHoy}
                  </p>
                  <p style={{ fontSize: 11, color: "var(--muted-fg)", margin: 0 }}>
                    Hoy
                  </p>
                </div>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
                    {distribuciones.length}
                  </p>
                  <p style={{ fontSize: 11, color: "var(--muted-fg)", margin: 0 }}>
                    Total
                  </p>
                </div>
                <div style={{ textAlign: "center" }}>
                  <p
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      margin: 0,
                      color: "var(--success)",
                    }}
                  >
                    {onlineCount}/{offlineCount}
                  </p>
                  <p style={{ fontSize: 11, color: "var(--muted-fg)", margin: 0 }}>
                    En linea / Offline
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        }
      />

      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Buscar por alumno, DNI o docente..."
        />
        <FilterBar
          activeCount={activeFilters}
          onClear={() => {
            setFiltroGrado("todos");
            setFiltroOrigen("todos");
            setFechaDesde("");
            setFechaHasta("");
          }}
        >
          <Input
            type="date"
            style={{ width: 160, height: 36, fontSize: 13 }}
            value={fechaDesde}
            onChange={(event) => setFechaDesde(event.target.value)}
          />
          <Input
            type="date"
            style={{ width: 160, height: 36, fontSize: 13 }}
            value={fechaHasta}
            onChange={(event) => setFechaHasta(event.target.value)}
          />
          <Select value={filtroGrado} onValueChange={setFiltroGrado}>
            <SelectTrigger style={{ width: 130, height: 36 }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los grados</SelectItem>
              {grados.map((grado) => (
                <SelectItem key={grado} value={grado}>
                  {grado}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filtroOrigen} onValueChange={setFiltroOrigen}>
            <SelectTrigger style={{ width: 150, height: 36 }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los origenes</SelectItem>
              <SelectItem value="online">En linea</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
              <SelectItem value="sincronizado">Sincronizado</SelectItem>
            </SelectContent>
          </Select>
        </FilterBar>
      </div>

      <DataTable columns={columns} data={shown} loading={isLoading} />
      <TablePagination
        page={page}
        totalPages={totalPages}
        total={filteredData.length}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />

      <Dialog
        open={Boolean(selectedDistribucion)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedDistribucion(null);
          }
        }}
      >
        <DialogContent style={{ maxWidth: 440 }}>
          <DialogHeader>
            <DialogTitle>Detalle de la distribucion</DialogTitle>
          </DialogHeader>

          {selectedDistribucion && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
                paddingTop: 8,
              }}
            >
              {[
                ["Nombres", selectedDistribucion.nombre],
                ["Apellidos", selectedDistribucion.apellido],
                ["DNI", selectedDistribucion.dni],
                [
                  "Grado / Seccion",
                  `${selectedDistribucion.grado} ${selectedDistribucion.seccion}`,
                ],
                [
                  "Fecha",
                  toDateLabel(
                    getDistribucionDateKey(selectedDistribucion) ||
                      selectedDistribucion.fecha,
                  ),
                ],
                ["Hora", selectedDistribucion.hora],
                ["Docente", selectedDistribucion.docente],
                ["Origen", selectedDistribucion.origen],
              ].map(([label, value]) => (
                <div key={label} style={{ minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: 11,
                      color: "var(--muted-fg)",
                      margin: "0 0 4px",
                    }}
                  >
                    {label}
                  </p>
                  <p style={{ fontWeight: 600, margin: 0 }}>{value || "-"}</p>
                </div>
              ))}

              {selectedDistribucion.pendiente_local && (
                <div
                  style={{
                    gridColumn: "1 / -1",
                    background: "var(--warning-bg)",
                    color: "var(--warning)",
                    borderRadius: 10,
                    padding: "10px 12px",
                    fontSize: 12,
                    fontWeight: 500,
                  }}
                >
                  Registro guardado localmente. Se sincronizara cuando vuelva el
                  internet.
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedDistribucion(null)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
