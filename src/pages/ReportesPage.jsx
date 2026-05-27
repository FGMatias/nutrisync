import { useMemo, useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import PageHeader from "../components/shared/PageHeader";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { useGenerarReporte, useReportes } from "../hooks/queries/useReportes";
import { getReporteSignedUrl } from "../services/reportes.service";

const TIPO_OPTIONS = [
  { value: "inventario", label: "Inventario" },
  { value: "distribuciones", label: "Distribuciones" },
  { value: "movimientos", label: "Movimientos" },
  { value: "recepcion", label: "Recepción de productos" },
  { value: "alumnos", label: "Padrón de alumnos" },
  { value: "stock", label: "Stock actual" },
];

const FORMATO_OPTIONS = [
  { value: "pdf", label: "PDF" },
  { value: "xlsx", label: "Excel (XLSX)" },
];

function getTodayDate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getMonthStartDate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

function triggerDownload(url, filename) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export default function ReportesPage() {
  const [tipoReporte, setTipoReporte] = useState("distribuciones");
  const [formatoReporte, setFormatoReporte] = useState("pdf");
  const [fechaInicio, setFechaInicio] = useState(getMonthStartDate());
  const [fechaFin, setFechaFin] = useState(getTodayDate());
  const [filtroGrado, setFiltroGrado] = useState("todos");
  const [downloadingId, setDownloadingId] = useState(null);

  const { data: reportes = [], isLoading } = useReportes();
  const { mutateAsync: generarReporte, isPending: generating } = useGenerarReporte();

  const reportesMes = useMemo(() => {
    const now = new Date();
    return reportes.filter((r) => {
      const date = new Date(r.fecha);
      return (
        date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
      );
    }).length;
  }, [reportes]);

  const handleGenerar = async () => {
    await generarReporte({
      tipo: tipoReporte,
      formato: formatoReporte,
      rango_inicio: fechaInicio,
      rango_fin: fechaFin,
      filtro_grado: tipoReporte === "distribuciones" ? filtroGrado : "",
    });
  };

  const handleDescargar = async (reporte) => {
    try {
      setDownloadingId(reporte.id);
      const signedUrl = await getReporteSignedUrl(reporte.ruta_archivo);
      const ext = reporte.formato === "xlsx" ? "xlsx" : "pdf";
      const fileName = `reporte-${reporte.tipo}-${reporte.id}.${ext}`;
      triggerDownload(signedUrl, fileName);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div>
      <PageHeader title="Reportes" subtitle="Generación y descarga de informes" />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 2fr",
          gap: 20,
          alignItems: "start",
        }}
      >
        <Card>
          <CardHeader>
            <CardTitle style={{ fontSize: 14 }}>Generar Reporte</CardTitle>
          </CardHeader>
          <CardContent style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <Label>Tipo de reporte</Label>
              <Select value={tipoReporte} onValueChange={setTipoReporte}>
                <SelectTrigger style={{ marginTop: 4 }}>
                  <SelectValue placeholder="Seleccionar tipo..." />
                </SelectTrigger>
                <SelectContent>
                  {TIPO_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Fecha inicio *</Label>
              <Input
                type="date"
                value={fechaInicio}
                onChange={(event) => setFechaInicio(event.target.value)}
                style={{ marginTop: 4 }}
              />
            </div>
            <div>
              <Label>Fecha fin *</Label>
              <Input
                type="date"
                value={fechaFin}
                onChange={(event) => setFechaFin(event.target.value)}
                style={{ marginTop: 4 }}
              />
            </div>

            {tipoReporte === "distribuciones" && (
              <div>
                <Label>Filtrar por grado</Label>
                <Select value={filtroGrado} onValueChange={setFiltroGrado}>
                  <SelectTrigger style={{ marginTop: 4 }}>
                    <SelectValue placeholder="Todos los grados..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los grados</SelectItem>
                    {["1ro", "2do", "3ro", "4to", "5to", "6to"].map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Formato</Label>
              <Select value={formatoReporte} onValueChange={setFormatoReporte}>
                <SelectTrigger style={{ marginTop: 4 }}>
                  <SelectValue placeholder="PDF o Excel..." />
                </SelectTrigger>
                <SelectContent>
                  {FORMATO_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              style={{
                width: "100%",
                marginTop: 8,
                background: "var(--primary)",
                color: "var(--primary-fg)",
              }}
              onClick={handleGenerar}
              disabled={generating || !tipoReporte || !formatoReporte || !fechaInicio || !fechaFin}
            >
              {generating ? (
                <>
                  <Loader2
                    size={14}
                    style={{ marginRight: 6, animation: "spin 1s linear infinite" }}
                  />
                  Generando...
                </>
              ) : (
                <>
                  <FileText size={14} style={{ marginRight: 6 }} /> Generar Reporte
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader style={{ paddingBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <CardTitle style={{ fontSize: 14 }}>Historial de Reportes</CardTitle>
              <span style={{ fontSize: 12, color: "var(--muted-fg)" }}>
                {reportesMes} reportes este mes
              </span>
            </div>
          </CardHeader>
          <CardContent style={{ padding: 0 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--muted)", height: 36 }}>
                  {["Tipo", "Período", "Formato", "Generado por", "Fecha", ""].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "0 12px",
                        textAlign: "left",
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        color: "var(--muted-fg)",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reportes.map((r) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid var(--border)", height: 48 }}>
                    <td style={{ padding: "0 12px", fontSize: 12, fontWeight: 500 }}>
                      {r.tipo_label}
                    </td>
                    <td style={{ padding: "0 12px", fontSize: 11, color: "var(--muted-fg)" }}>
                      {r.periodo}
                    </td>
                    <td style={{ padding: "0 12px" }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "2px 6px",
                          borderRadius: 4,
                          background:
                            r.formato === "pdf" ? "hsl(0,68%,96%)" : "hsl(142,60%,95%)",
                          color: r.formato === "pdf" ? "hsl(0,68%,48%)" : "hsl(142,60%,30%)",
                        }}
                      >
                        {String(r.formato).toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: "0 12px", fontSize: 12 }}>{r.generado_por || "-"}</td>
                    <td style={{ padding: "0 12px", fontSize: 11, color: "var(--muted-fg)" }}>
                      {format(new Date(r.fecha), "dd/MM HH:mm", { locale: es })}
                    </td>
                    <td style={{ padding: "0 12px" }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        style={{ height: 28 }}
                        onClick={() => handleDescargar(r)}
                        disabled={downloadingId === r.id}
                      >
                        {downloadingId === r.id ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Download size={13} />
                        )}
                      </Button>
                    </td>
                  </tr>
                ))}
                {!isLoading && reportes.length === 0 && (
                  <tr style={{ borderBottom: "1px solid var(--border)", height: 48 }}>
                    <td colSpan={6} style={{ padding: "0 12px", fontSize: 12, color: "var(--muted-fg)" }}>
                      Aún no hay reportes generados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
