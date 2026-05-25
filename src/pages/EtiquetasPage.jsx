import { useState } from 'react'
import { Download, Printer, QrCode } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { INGRESOS_MOCK } from '../mock/ingresos.mock'
import DataTable from '../components/shared/DataTable'
import PageHeader from '../components/shared/PageHeader'
import SearchBar from '../components/shared/SearchBar'
import TablePagination from '../components/shared/TablePagination'
import { Button } from '../components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog'

const ETIQUETAS_MOCK = INGRESOS_MOCK.flatMap(ingreso =>
  ingreso.detalle.map((d, i) => ({
    id: `ETQ-${ingreso.id}-${i + 1}`,
    lote: d.lote,
    producto: d.producto,
    ingreso_id: ingreso.id,
    proveedor: ingreso.proveedor_nombre,
    cantidad: `${d.cantidad} kg`,
    fecha_ingreso: ingreso.fecha,
    fecha_vencimiento: new Date(new Date(ingreso.fecha).setMonth(new Date(ingreso.fecha).getMonth() + 12)).toISOString(),
  }))
)

export default function EtiquetasPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [selectedEtiqueta, setSelectedEtiqueta] = useState(null)
  const PAGE_SIZE = 10

  const shown = ETIQUETAS_MOCK.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const columns = [
    {
      key: 'lote',
      header: 'Lote',
      render: (v) => <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 12 }}>{v}</span>,
    },
    { key: 'producto', header: 'Producto', render: (v) => <span style={{ fontWeight: 500 }}>{v}</span> },
    {
      key: 'ingreso_id',
      header: 'Ingreso',
      render: (v) => <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--muted-fg)' }}>{v}</span>,
    },
    { key: 'proveedor', header: 'Proveedor', render: (v) => <span style={{ fontSize: 12 }}>{v}</span> },
    { key: 'cantidad', header: 'Cantidad' },
    {
      key: 'fecha_vencimiento',
      header: 'Vencimiento',
      render: (v) => <span style={{ fontWeight: 500 }}>{format(new Date(v), 'MM/yyyy', { locale: es })}</span>,
    },
    {
      key: 'acciones',
      header: 'Acciones',
      align: 'center',
      width: 200,
      render: (_, row) => (
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
          <Button variant="ghost" size="sm" style={{ height: 28, fontSize: 11 }} onClick={() => { setSelectedEtiqueta(row); setPreviewOpen(true) }}>
            <QrCode size={12} style={{ marginRight: 3 }} /> Ver QR
          </Button>
          <Button variant="ghost" size="sm" style={{ height: 28, fontSize: 11 }}>
            <Printer size={12} style={{ marginRight: 3 }} /> Imprimir
          </Button>
          <Button variant="ghost" size="sm" style={{ height: 28, fontSize: 11 }}>
            <Download size={12} />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Etiquetas QR de Lotes"
        subtitle="Generación de etiquetas para el almacén"
        actions={
          <Button variant="outline">
            <Printer size={14} style={{ marginRight: 6 }} /> Imprimir todas
          </Button>
        }
      />

      <div style={{ marginBottom: 16 }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar por lote o producto..." />
      </div>

      <DataTable columns={columns} data={shown} loading={false} />
      <TablePagination
        page={page}
        totalPages={Math.ceil(ETIQUETAS_MOCK.length / PAGE_SIZE)}
        total={ETIQUETAS_MOCK.length}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent style={{ maxWidth: 380 }}>
          <DialogHeader>
            <DialogTitle>Vista previa de etiqueta</DialogTitle>
          </DialogHeader>
          {selectedEtiqueta && (
            <div style={{ border: '2px solid var(--border)', borderRadius: 8, padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{ textAlign: 'center', width: '100%' }}>
                <p style={{ fontWeight: 700, fontSize: 13, margin: 0 }}>IE 8060 Los Chasquis</p>
                <p style={{ fontSize: 11, color: 'var(--muted-fg)', margin: '2px 0 0' }}>Sistema PAE · Programa de Alimentación Escolar</p>
              </div>
              <p style={{ fontWeight: 700, fontSize: 15, margin: 0, textAlign: 'center' }}>{selectedEtiqueta.producto}</p>
              <p style={{ fontSize: 12, color: 'var(--muted-fg)', margin: 0 }}>LOTE: <strong style={{ fontFamily: 'monospace' }}>{selectedEtiqueta.lote}</strong></p>
              <div style={{ width: 120, height: 120, background: '#1e293b', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <QrCode size={60} color="white" />
              </div>
              <div style={{ textAlign: 'center', fontSize: 12 }}>
                <p style={{ margin: '2px 0' }}><span style={{ color: 'var(--muted-fg)' }}>Proveedor:</span> {selectedEtiqueta.proveedor}</p>
                <p style={{ margin: '2px 0' }}><span style={{ color: 'var(--muted-fg)' }}>Cantidad:</span> {selectedEtiqueta.cantidad}</p>
                <p style={{ margin: '2px 0' }}><span style={{ color: 'var(--muted-fg)' }}>Ingreso:</span> {format(new Date(selectedEtiqueta.fecha_ingreso), 'dd/MM/yyyy', { locale: es })}</p>
                <p style={{ margin: '2px 0' }}><span style={{ color: 'var(--muted-fg)' }}>Vence:</span> <strong>{format(new Date(selectedEtiqueta.fecha_vencimiento), 'MM/yyyy', { locale: es })}</strong></p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Cerrar</Button>
            <Button variant="outline">
              <Printer size={14} style={{ marginRight: 6 }} /> Imprimir
            </Button>
            <Button style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
              <Download size={14} style={{ marginRight: 6 }} /> Descargar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
