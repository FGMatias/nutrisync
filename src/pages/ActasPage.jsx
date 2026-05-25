import { useState } from 'react'
import { Download, Eye, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { INGRESOS_MOCK } from '../mock/ingresos.mock'
import DataTable from '../components/shared/DataTable'
import PageHeader from '../components/shared/PageHeader'
import SearchBar from '../components/shared/SearchBar'
import TablePagination from '../components/shared/TablePagination'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog'

const ACTAS_MOCK = INGRESOS_MOCK.filter(i => i.estado === 'conforme' || i.estado === 'con_discrepancia').map((i, idx) => ({
  id: `ACTA-2025-${String(idx + 1).padStart(3, '0')}`,
  ingreso_id: i.id,
  proveedor: i.proveedor_nombre,
  fecha: i.fecha,
  generado_por: 'Luis Condori Quispe',
  estado: idx < 6 ? 'disponible' : 'generando',
  detalle: i.detalle,
  peso_total: i.peso_total_kg,
}))

export default function ActasPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [selectedActa, setSelectedActa] = useState(null)

  const columns = [
    {
      key: 'id',
      header: '# Acta',
      width: 150,
      render: (v) => <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>{v}</span>,
    },
    {
      key: 'ingreso_id',
      header: 'Ingreso vinculado',
      render: (v) => <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--muted-fg)' }}>{v}</span>,
    },
    { key: 'proveedor', header: 'Proveedor', render: (v) => <span style={{ fontWeight: 500 }}>{v}</span> },
    {
      key: 'fecha',
      header: 'Fecha',
      render: (v) => format(new Date(v), 'dd/MM/yyyy', { locale: es }),
    },
    { key: 'generado_por', header: 'Generado por', render: (v) => <span style={{ fontSize: 12 }}>{v}</span> },
    {
      key: 'estado',
      header: 'Estado',
      render: (v) => v === 'disponible'
        ? <span style={{ fontSize: 11, fontWeight: 600, background: 'var(--success-bg)', color: 'var(--success)', padding: '2px 8px', borderRadius: 4 }}>✓ Disponible</span>
        : <span style={{ fontSize: 11, fontWeight: 600, background: 'var(--warning-bg)', color: 'var(--warning)', padding: '2px 8px', borderRadius: 4 }}>⏳ Generando...</span>,
    },
    {
      key: 'acciones',
      header: 'Acciones',
      align: 'center',
      width: 150,
      render: (_, row) => (
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
          <Button variant="ghost" size="sm" style={{ height: 28 }} onClick={() => { setSelectedActa(row); setPreviewOpen(true) }}>
            <Eye size={13} style={{ marginRight: 4 }} /> Vista previa
          </Button>
          <Button variant="ghost" size="sm" style={{ height: 28 }}>
            <Download size={13} />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Actas de Recepción"
        subtitle="Documentación oficial de recepciones"
        actions={
          <Button variant="outline">
            <FileText size={14} style={{ marginRight: 6 }} /> Generar Acta
          </Button>
        }
      />

      <div style={{ marginBottom: 16 }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar por acta o proveedor..." />
      </div>

      <DataTable columns={columns} data={ACTAS_MOCK} loading={false} />
      <TablePagination page={page} totalPages={1} total={ACTAS_MOCK.length} pageSize={10} onPageChange={setPage} />

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent style={{ maxWidth: 620 }}>
          <DialogHeader>
            <DialogTitle>Vista Previa de Acta</DialogTitle>
          </DialogHeader>
          {selectedActa && (
            <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 24, fontSize: 12 }}>
              <div style={{ textAlign: 'center', borderBottom: '2px solid var(--border)', paddingBottom: 12, marginBottom: 16 }}>
                <p style={{ fontWeight: 700, fontSize: 14, margin: 0 }}>ACTA DE RECEPCIÓN N° {selectedActa.id}</p>
                <p style={{ color: 'var(--muted-fg)', margin: '4px 0 0' }}>IE 8060 Los Chasquis — Programa de Alimentación Escolar PAE</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                <div><span style={{ color: 'var(--muted-fg)' }}>Fecha:</span> {format(new Date(selectedActa.fecha), 'dd/MM/yyyy', { locale: es })}</div>
                <div><span style={{ color: 'var(--muted-fg)' }}>Proveedor:</span> {selectedActa.proveedor}</div>
                <div><span style={{ color: 'var(--muted-fg)' }}>N° Ingreso:</span> {selectedActa.ingreso_id}</div>
                <div><span style={{ color: 'var(--muted-fg)' }}>Peso total:</span> {selectedActa.peso_total} kg</div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
                <thead>
                  <tr style={{ background: 'var(--muted)' }}>
                    {['Producto', 'Lote', 'Cantidad', 'Peso (kg)'].map(h => (
                      <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontSize: 11, fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selectedActa.detalle.map((d, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '6px 10px' }}>{d.producto}</td>
                      <td style={{ padding: '6px 10px', fontFamily: 'monospace' }}>{d.lote}</td>
                      <td style={{ padding: '6px 10px' }}>{d.cantidad}</td>
                      <td style={{ padding: '6px 10px' }}>{d.peso_kg} kg</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ height: 40, borderBottom: '1px solid var(--fg)', marginBottom: 4 }} />
                  <p style={{ color: 'var(--muted-fg)', margin: 0 }}>Firma del CAE</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ height: 40, borderBottom: '1px solid var(--fg)', marginBottom: 4 }} />
                  <p style={{ color: 'var(--muted-fg)', margin: 0 }}>Firma del Proveedor</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Cerrar</Button>
            <Button style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
              <Download size={14} style={{ marginRight: 6 }} /> Descargar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
