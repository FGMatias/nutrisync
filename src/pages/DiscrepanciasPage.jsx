import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { INGRESOS_MOCK } from '../mock/ingresos.mock'
import DataTable from '../components/shared/DataTable'
import FilterBar from '../components/shared/FilterBar'
import PageHeader from '../components/shared/PageHeader'
import SearchBar from '../components/shared/SearchBar'
import TablePagination from '../components/shared/TablePagination'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'

const DISCREPANCIAS_MOCK = [
  { id: '1', ingreso_id: 'ING-2025-003', producto: 'Aceite Vegetal', lote: 'ALI-2025-031', esperado: 50, recibido: 38, diferencia: -12, unidad: 'l', observaciones: 'Faltaron 12 litros, conductor confirmó faltante.', fecha: '2025-05-06T08:45:00Z', estado: 'registrada' },
  { id: '2', ingreso_id: 'ING-2025-003', producto: 'Azúcar Rubia', lote: 'ALI-2025-032', esperado: 67, recibido: 47, diferencia: -20, unidad: 'kg', observaciones: 'Saco roto en transporte. Documentado con foto.', fecha: '2025-05-06T08:45:00Z', estado: 'registrada' },
  { id: '3', ingreso_id: 'ING-2025-009', producto: 'Aceite Vegetal', lote: 'ALI-2025-038', esperado: 42, recibido: 42, diferencia: 0, unidad: 'l', observaciones: 'Lata con golpe visible, contenido íntegro.', fecha: '2025-05-19T09:00:00Z', estado: 'resuelta' },
  { id: '4', ingreso_id: 'ING-2025-003', producto: 'Lentejas', lote: 'CAN-2025-014', esperado: 100, recibido: 85, diferencia: -15, unidad: 'kg', observaciones: 'Peso inferior al guía de remisión.', fecha: '2025-05-06T09:00:00Z', estado: 'registrada' },
]

export default function DiscrepanciasPage() {
  const [search, setSearch] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [page, setPage] = useState(1)
  const [detailDialog, setDetailDialog] = useState(null)

  const sinResolver = DISCREPANCIAS_MOCK.filter(d => d.estado === 'registrada').length

  const columns = [
    {
      key: 'ingreso_id',
      header: '# Ingreso',
      width: 140,
      render: (v) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</span>,
    },
    { key: 'producto', header: 'Producto', render: (v) => <span style={{ fontWeight: 500 }}>{v}</span> },
    { key: 'lote', header: 'Lote', render: (v) => <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{v}</span> },
    {
      key: 'esperado',
      header: 'Esperado',
      render: (v, row) => <span>{v} {row.unidad}</span>,
    },
    {
      key: 'recibido',
      header: 'Recibido',
      render: (v, row) => <span>{v} {row.unidad}</span>,
    },
    {
      key: 'diferencia',
      header: 'Diferencia',
      render: (v, row) => v < 0
        ? <span style={{ fontWeight: 600, color: 'var(--danger)' }}>−{Math.abs(v)} {row.unidad}</span>
        : <span style={{ color: 'var(--success)' }}>✓ Sin diferencia</span>,
    },
    {
      key: 'observaciones',
      header: 'Observaciones',
      render: (v) => <span style={{ fontSize: 12, color: 'var(--muted-fg)' }}>{v.substring(0, 40)}{v.length > 40 ? '...' : ''}</span>,
    },
    {
      key: 'fecha',
      header: 'Fecha',
      render: (v) => format(new Date(v), 'dd/MM/yyyy', { locale: es }),
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (v) => v === 'resuelta'
        ? <span style={{ fontSize: 11, fontWeight: 600, background: 'var(--success-bg)', color: 'var(--success)', padding: '2px 8px', borderRadius: 4 }}>Resuelta</span>
        : <span style={{ fontSize: 11, fontWeight: 600, background: 'var(--warning-bg)', color: 'var(--warning)', padding: '2px 8px', borderRadius: 4 }}>Registrada</span>,
    },
    {
      key: 'acciones',
      header: 'Acciones',
      align: 'center',
      width: 80,
      render: (_, row) => (
        <Button variant="ghost" size="sm" style={{ height: 28, fontSize: 11 }} onClick={() => setDetailDialog(row)}>
          Ver
        </Button>
      ),
    },
  ]

  const tableData = DISCREPANCIAS_MOCK.map(d => ({
    ...d,
    _rowStyle: d.diferencia < 0 ? { background: 'hsla(0,68%,48%,0.04)' } : {},
  }))

  return (
    <div>
      <PageHeader
        title="Discrepancias"
        subtitle="Diferencias en recepciones de productos"
        actions={
          <Badge style={{ background: 'var(--warning-bg)', color: 'var(--warning)', border: 'none', padding: '6px 12px', fontSize: 12 }}>
            ⚠ {sinResolver} sin resolver
          </Badge>
        }
      />

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar por ingreso o producto..." />
        <FilterBar activeCount={filtroEstado !== 'todos' ? 1 : 0} onClear={() => setFiltroEstado('todos')}>
          <Input type="date" style={{ width: 160, height: 36, fontSize: 13 }} />
          <Input type="date" style={{ width: 160, height: 36, fontSize: 13 }} />
          <Select value={filtroEstado} onValueChange={setFiltroEstado}>
            <SelectTrigger style={{ width: 160, height: 36 }}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              <SelectItem value="registrada">Registrada</SelectItem>
              <SelectItem value="resuelta">Resuelta</SelectItem>
              <SelectItem value="en_revision">En revisión</SelectItem>
            </SelectContent>
          </Select>
        </FilterBar>
      </div>

      <DataTable columns={columns} data={DISCREPANCIAS_MOCK} loading={false} />
      <TablePagination page={page} totalPages={1} total={DISCREPANCIAS_MOCK.length} pageSize={10} onPageChange={setPage} />

      <Dialog open={!!detailDialog} onOpenChange={() => setDetailDialog(null)}>
        <DialogContent style={{ maxWidth: 480 }}>
          <DialogHeader>
            <DialogTitle>Detalle de Discrepancia</DialogTitle>
          </DialogHeader>
          {detailDialog && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div><span style={{ color: 'var(--muted-fg)' }}>Ingreso:</span> <strong>{detailDialog.ingreso_id}</strong></div>
                <div><span style={{ color: 'var(--muted-fg)' }}>Lote:</span> <span style={{ fontFamily: 'monospace' }}>{detailDialog.lote}</span></div>
                <div><span style={{ color: 'var(--muted-fg)' }}>Producto:</span> <strong>{detailDialog.producto}</strong></div>
                <div><span style={{ color: 'var(--muted-fg)' }}>Fecha:</span> {format(new Date(detailDialog.fecha), 'dd/MM/yyyy', { locale: es })}</div>
                <div><span style={{ color: 'var(--muted-fg)' }}>Esperado:</span> {detailDialog.esperado} {detailDialog.unidad}</div>
                <div><span style={{ color: 'var(--muted-fg)' }}>Recibido:</span> {detailDialog.recibido} {detailDialog.unidad}</div>
              </div>
              <div style={{ background: detailDialog.diferencia < 0 ? 'var(--danger-bg)' : 'var(--success-bg)', padding: '8px 12px', borderRadius: 6 }}>
                <span style={{ fontWeight: 600, color: detailDialog.diferencia < 0 ? 'var(--danger)' : 'var(--success)' }}>
                  Diferencia: {detailDialog.diferencia < 0 ? '−' : ''}{Math.abs(detailDialog.diferencia)} {detailDialog.unidad}
                </span>
              </div>
              <div>
                <p style={{ color: 'var(--muted-fg)', marginBottom: 4 }}>Observaciones:</p>
                <p style={{ margin: 0 }}>{detailDialog.observaciones}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialog(null)}>Cerrar</Button>
            {detailDialog?.estado === 'registrada' && (
              <Button style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>Marcar como resuelta</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
