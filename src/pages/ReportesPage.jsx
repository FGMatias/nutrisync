import { useState } from 'react'
import { Download, FileText, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import PageHeader from '../components/shared/PageHeader'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'

const HISTORIAL_MOCK = [
  { id: '1', tipo: 'Distribuciones', periodo: '01/05 – 25/05/2025', formato: 'pdf', generado_por: 'Ana Flores Apaza', fecha: '2025-05-25T10:20:00Z' },
  { id: '2', tipo: 'Inventario', periodo: '01/05 – 25/05/2025', formato: 'xlsx', generado_por: 'Luis Condori Quispe', fecha: '2025-05-24T14:30:00Z' },
  { id: '3', tipo: 'Padrón de alumnos', periodo: '01/03 – 25/05/2025', formato: 'pdf', generado_por: 'Carmen Quispe Huanca', fecha: '2025-05-23T09:00:00Z' },
  { id: '4', tipo: 'Movimientos', periodo: '15/05 – 22/05/2025', formato: 'pdf', generado_por: 'Ana Flores Apaza', fecha: '2025-05-22T11:00:00Z' },
  { id: '5', tipo: 'Stock actual', periodo: 'Al 21/05/2025', formato: 'xlsx', generado_por: 'Luis Condori Quispe', fecha: '2025-05-21T08:00:00Z' },
  { id: '6', tipo: 'Recepción de productos', periodo: '01/05 – 20/05/2025', formato: 'pdf', generado_por: 'Carmen Quispe Huanca', fecha: '2025-05-20T10:00:00Z' },
  { id: '7', tipo: 'Distribuciones', periodo: '01/04 – 30/04/2025', formato: 'xlsx', generado_por: 'Ana Flores Apaza', fecha: '2025-05-01T08:30:00Z' },
  { id: '8', tipo: 'Inventario', periodo: 'Al 30/04/2025', formato: 'pdf', generado_por: 'Luis Condori Quispe', fecha: '2025-04-30T16:00:00Z' },
  { id: '9', tipo: 'Padrón de alumnos', periodo: 'Al 25/04/2025', formato: 'xlsx', generado_por: 'Carmen Quispe Huanca', fecha: '2025-04-25T09:00:00Z' },
  { id: '10', tipo: 'Movimientos', periodo: '01/04 – 24/04/2025', formato: 'pdf', generado_por: 'Ana Flores Apaza', fecha: '2025-04-24T14:00:00Z' },
]

export default function ReportesPage() {
  const [tipoReporte, setTipoReporte] = useState('')
  const [formatoReporte, setFormatoReporte] = useState('')
  const [filtroGrado, setFiltroGrado] = useState('')
  const [generating, setGenerating] = useState(false)

  const handleGenerar = () => {
    setGenerating(true)
    setTimeout(() => setGenerating(false), 2000)
    // TODO: conectar jsPDF y SheetJS
  }

  return (
    <div>
      <PageHeader title="Reportes" subtitle="Generación y descarga de informes" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20, alignItems: 'start' }}>
        {/* Generador */}
        <Card>
          <CardHeader>
            <CardTitle style={{ fontSize: 14 }}>Generar Reporte</CardTitle>
          </CardHeader>
          <CardContent style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <Label>Tipo de reporte</Label>
              <Select value={tipoReporte} onValueChange={setTipoReporte}>
                <SelectTrigger style={{ marginTop: 4 }}><SelectValue placeholder="Seleccionar tipo..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="inventario">Inventario</SelectItem>
                  <SelectItem value="distribuciones">Distribuciones</SelectItem>
                  <SelectItem value="movimientos">Movimientos</SelectItem>
                  <SelectItem value="recepcion">Recepción de productos</SelectItem>
                  <SelectItem value="alumnos">Padrón de alumnos</SelectItem>
                  <SelectItem value="stock">Stock actual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Fecha inicio *</Label>
              <Input type="date" style={{ marginTop: 4 }} />
            </div>
            <div>
              <Label>Fecha fin *</Label>
              <Input type="date" defaultValue="2025-05-25" style={{ marginTop: 4 }} />
            </div>

            {tipoReporte === 'distribuciones' && (
              <div>
                <Label>Filtrar por grado</Label>
                <Select value={filtroGrado} onValueChange={setFiltroGrado}>
                  <SelectTrigger style={{ marginTop: 4 }}><SelectValue placeholder="Todos los grados..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los grados</SelectItem>
                    {['1ro', '2do', '3ro', '4to', '5to', '6to'].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Formato</Label>
              <Select value={formatoReporte} onValueChange={setFormatoReporte}>
                <SelectTrigger style={{ marginTop: 4 }}><SelectValue placeholder="PDF o Excel..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              style={{ width: '100%', marginTop: 8, background: 'var(--primary)', color: 'var(--primary-fg)' }}
              onClick={handleGenerar}
              disabled={generating}
            >
              {generating ? (
                <><Loader2 size={14} style={{ marginRight: 6, animation: 'spin 1s linear infinite' }} /> Generando...</>
              ) : (
                <><FileText size={14} style={{ marginRight: 6 }} /> Generar Reporte</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Historial */}
        <Card>
          <CardHeader style={{ paddingBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <CardTitle style={{ fontSize: 14 }}>Historial de Reportes</CardTitle>
              <span style={{ fontSize: 12, color: 'var(--muted-fg)' }}>23 reportes este mes</span>
            </div>
          </CardHeader>
          <CardContent style={{ padding: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--muted)', height: 36 }}>
                  {['Tipo', 'Período', 'Formato', 'Generado por', 'Fecha', ''].map(h => (
                    <th key={h} style={{ padding: '0 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted-fg)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HISTORIAL_MOCK.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--border)', height: 48 }}>
                    <td style={{ padding: '0 12px', fontSize: 12, fontWeight: 500 }}>{r.tipo}</td>
                    <td style={{ padding: '0 12px', fontSize: 11, color: 'var(--muted-fg)' }}>{r.periodo}</td>
                    <td style={{ padding: '0 12px' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '2px 6px', borderRadius: 4,
                        background: r.formato === 'pdf' ? 'hsl(0,68%,96%)' : 'hsl(142,60%,95%)',
                        color: r.formato === 'pdf' ? 'hsl(0,68%,48%)' : 'hsl(142,60%,30%)',
                      }}>
                        {r.formato.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '0 12px', fontSize: 12 }}>{r.generado_por}</td>
                    <td style={{ padding: '0 12px', fontSize: 11, color: 'var(--muted-fg)' }}>
                      {format(new Date(r.fecha), 'dd/MM HH:mm', { locale: es })}
                    </td>
                    <td style={{ padding: '0 12px' }}>
                      <Button variant="ghost" size="sm" style={{ height: 28 }}>
                        <Download size={13} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
