import { useState } from 'react'
import { FileText, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { VEHICULOS_MOCK } from '../mock/vehiculos.mock'
import { PROVEEDORES_MOCK } from '../mock/proveedores.mock'
import DataTable from '../components/shared/DataTable'
import FilterBar from '../components/shared/FilterBar'
import PageHeader from '../components/shared/PageHeader'
import SearchBar from '../components/shared/SearchBar'
import TablePagination from '../components/shared/TablePagination'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '../components/ui/sheet'

export default function VehiculosPage() {
  const [search, setSearch] = useState('')
  const [filtroProveedor, setFiltroProveedor] = useState('todos')
  const [soloEnPlanta, setSoloEnPlanta] = useState(false)
  const [page, setPage] = useState(1)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const activeFilters = (filtroProveedor !== 'todos' ? 1 : 0) + (soloEnPlanta ? 1 : 0)

  const columns = [
    {
      key: 'proveedor_nombre',
      header: 'Proveedor',
      render: (v) => <span style={{ fontWeight: 500 }}>{v}</span>,
    },
    {
      key: 'placa',
      header: 'Placa',
      render: (v) => <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 13 }}>{v}</span>,
    },
    { key: 'conductor', header: 'Conductor' },
    {
      key: 'hora_entrada',
      header: 'Hora Entrada',
      render: (v) => format(new Date(v), 'dd/MM HH:mm', { locale: es }),
    },
    {
      key: 'hora_salida',
      header: 'Hora Salida',
      render: (v) => v
        ? (
          <Badge style={{ background: 'var(--success-bg)', color: 'var(--success)', border: 'none', fontSize: 11 }}>
            ✓ Completado
          </Badge>
        )
        : (
          <Badge style={{ background: 'var(--warning-bg)', color: 'var(--warning)', border: 'none', fontSize: 11 }}>
            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--warning)', marginRight: 4, animation: 'pulse 1.5s infinite' }} />
            En planta
          </Badge>
        ),
    },
    {
      key: 'manifiesto_url',
      header: 'Manifiesto',
      align: 'center',
      render: (v) => v
        ? <Button variant="ghost" size="sm" style={{ fontSize: 11, height: 28 }}><FileText size={12} style={{ marginRight: 4 }} />Ver</Button>
        : <span style={{ color: 'var(--muted-fg)' }}>—</span>,
    },
    {
      key: 'acciones',
      header: 'Acciones',
      align: 'center',
      width: 130,
      render: (_, row) => (
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
          {!row.hora_salida && (
            <Button variant="outline" size="sm" style={{ fontSize: 11, height: 28 }}>Reg. Salida</Button>
          )}
          <Button variant="ghost" size="sm" style={{ fontSize: 11, height: 28 }}>Ver</Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Control Vehicular"
        subtitle="Registro de accesos de proveedores"
        actions={
          <Button onClick={() => setDrawerOpen(true)} style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
            <Plus size={15} style={{ marginRight: 4 }} /> Registrar Entrada
          </Button>
        }
      />

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar por placa o conductor..." />
        <FilterBar activeCount={activeFilters} onClear={() => { setFiltroProveedor('todos'); setSoloEnPlanta(false) }}>
          <Input type="date" style={{ width: 160, height: 36, fontSize: 13 }} />
          <Input type="date" style={{ width: 160, height: 36, fontSize: 13 }} />
          <Select value={filtroProveedor} onValueChange={setFiltroProveedor}>
            <SelectTrigger style={{ width: 200, height: 36 }}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los proveedores</SelectItem>
              {PROVEEDORES_MOCK.filter(p => p.activo).map(p => (
                <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant={soloEnPlanta ? 'default' : 'outline'}
            size="sm"
            style={{ height: 36, ...(soloEnPlanta ? { background: 'var(--primary)', color: 'var(--primary-fg)' } : {}) }}
            onClick={() => setSoloEnPlanta(v => !v)}
          >
            Solo en planta
          </Button>
        </FilterBar>
      </div>

      <DataTable columns={columns} data={VEHICULOS_MOCK} loading={false} />
      <TablePagination page={page} totalPages={1} total={VEHICULOS_MOCK.length} pageSize={10} onPageChange={setPage} />

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent style={{ width: 480, maxWidth: '95vw' }}>
          <SheetHeader>
            <SheetTitle>Registrar Entrada Vehicular</SheetTitle>
          </SheetHeader>
          <div style={{ padding: '24px 0 80px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <Label>Proveedor *</Label>
              <Select>
                <SelectTrigger style={{ marginTop: 4 }}><SelectValue placeholder="Seleccionar proveedor..." /></SelectTrigger>
                <SelectContent>
                  {PROVEEDORES_MOCK.filter(p => p.activo).map(p => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <Label>Placa *</Label>
                <Input placeholder="ABC-123" style={{ marginTop: 4 }} />
              </div>
              <div>
                <Label>Conductor *</Label>
                <Input placeholder="Nombre del conductor" style={{ marginTop: 4 }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <Label>Hora de entrada</Label>
                <Input type="datetime-local" style={{ marginTop: 4 }} defaultValue={new Date().toISOString().slice(0, 16)} />
              </div>
              <div>
                <Label>Hora de salida (opcional)</Label>
                <Input type="datetime-local" style={{ marginTop: 4 }} />
              </div>
            </div>
            <div>
              <Label>Adjuntar manifiesto</Label>
              <Input type="file" accept=".pdf,.jpg,.png" style={{ marginTop: 4 }} />
            </div>
            <div>
              <Label>Observaciones</Label>
              <textarea
                placeholder="Notas adicionales..."
                style={{ marginTop: 4, width: '100%', minHeight: 80, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, resize: 'vertical', background: 'transparent', color: 'var(--fg)' }}
              />
            </div>
          </div>
          <SheetFooter style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 24px', background: 'var(--card)', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>Cancelar</Button>
            <Button style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>Registrar entrada</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
