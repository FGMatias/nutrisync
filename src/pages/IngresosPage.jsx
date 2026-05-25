import { useState } from 'react'
import { Plus } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { INGRESOS_MOCK } from '../mock/ingresos.mock'
import { PROVEEDORES_MOCK } from '../mock/proveedores.mock'
import DataTable from '../components/shared/DataTable'
import FilterBar from '../components/shared/FilterBar'
import PageHeader from '../components/shared/PageHeader'
import SearchBar from '../components/shared/SearchBar'
import StatusBadge from '../components/shared/StatusBadge'
import TablePagination from '../components/shared/TablePagination'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select'
import {
  Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetDescription,
} from '../components/ui/sheet'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'

function StepIndicator({ step }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', paddingBottom: 16 }}>
      {[1, 2].map((s) => (
        <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 26, height: 26, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 600,
            background: s <= step ? 'var(--primary)' : 'var(--muted)',
            color: s <= step ? 'var(--primary-fg)' : 'var(--muted-fg)',
          }}>{s}</div>
          <span style={{ fontSize: 12, fontWeight: s === step ? 600 : 400, color: s === step ? 'var(--fg)' : 'var(--muted-fg)' }}>
            {s === 1 ? 'Información general' : 'Productos recibidos'}
          </span>
          {s < 2 && <span style={{ color: 'var(--border)', margin: '0 2px' }}>›</span>}
        </div>
      ))}
    </div>
  )
}

export default function IngresosPage() {
  const [search, setSearch] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [page, setPage] = useState(1)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerStep, setDrawerStep] = useState(1)
  const [productos, setProductos] = useState([{ id: 1 }])
  const activeFilters = filtroEstado !== 'todos' ? 1 : 0

  const columns = [
    {
      key: 'id',
      header: '# Ingreso',
      width: 130,
      render: (v) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</span>,
    },
    {
      key: 'proveedor_nombre',
      header: 'Proveedor',
      render: (v) => <span style={{ fontWeight: 500 }}>{v}</span>,
    },
    {
      key: 'fecha',
      header: 'Fecha',
      render: (v) => format(new Date(v), 'dd/MM/yyyy HH:mm', { locale: es }),
    },
    {
      key: 'detalle',
      header: 'Productos',
      render: (v) => (
        <span style={{ fontSize: 12, color: 'var(--muted-fg)' }}>
          {v.slice(0, 2).map(d => d.producto).join(', ')}{v.length > 2 ? ` +${v.length - 2} más` : ''}
        </span>
      ),
    },
    {
      key: 'peso_total_kg',
      header: 'Peso Total',
      render: (v) => <span style={{ fontWeight: 600 }}>{v} kg</span>,
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (v) => <StatusBadge status={v} />,
    },
    {
      key: 'discrepancias',
      header: 'Discrepancias',
      align: 'center',
      render: (v) => v > 0
        ? <Badge style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: 'none', fontSize: 11 }}>{v}</Badge>
        : <span style={{ color: 'var(--muted-fg)' }}>—</span>,
    },
    {
      key: 'acciones',
      header: 'Acciones',
      align: 'center',
      width: 180,
      render: () => (
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
          <Button variant="ghost" size="sm" style={{ fontSize: 11, height: 28 }}>Ver detalle</Button>
          <Button variant="ghost" size="sm" style={{ fontSize: 11, height: 28 }}>Acta</Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Ingreso de Productos"
        subtitle="Registro de recepciones del PAE"
        actions={
          <Button
            onClick={() => { setDrawerStep(1); setDrawerOpen(true) }}
            style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
          >
            <Plus size={15} style={{ marginRight: 4 }} /> Registrar Ingreso
          </Button>
        }
      />

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar por proveedor o lote..." />
        <FilterBar activeCount={activeFilters} onClear={() => setFiltroEstado('todos')}>
          <Input type="date" style={{ width: 160, height: 36, fontSize: 13 }} />
          <Input type="date" style={{ width: 160, height: 36, fontSize: 13 }} />
          <Select value={filtroEstado} onValueChange={setFiltroEstado}>
            <SelectTrigger style={{ width: 160, height: 36 }}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              <SelectItem value="registrado">Registrado</SelectItem>
              <SelectItem value="conforme">Conforme</SelectItem>
              <SelectItem value="con_discrepancia">Con Discrepancia</SelectItem>
              <SelectItem value="anulado">Anulado</SelectItem>
            </SelectContent>
          </Select>
        </FilterBar>
      </div>

      <DataTable columns={columns} data={INGRESOS_MOCK} loading={false} />
      <TablePagination page={page} totalPages={1} total={INGRESOS_MOCK.length} pageSize={10} onPageChange={setPage} />

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent style={{ width: 520, maxWidth: '95vw', overflowY: 'auto' }}>
          <SheetHeader>
            <SheetTitle>Registrar Ingreso</SheetTitle>
            <SheetDescription>Complete los datos de la recepción</SheetDescription>
          </SheetHeader>
          <div style={{ padding: '24px 0 80px' }}>
            <StepIndicator step={drawerStep} />
            {drawerStep === 1 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <Label>Proveedor *</Label>
                  <Select>
                    <SelectTrigger style={{ marginTop: 4 }}><SelectValue placeholder="Seleccionar proveedor..." /></SelectTrigger>
                    <SelectContent>
                      {PROVEEDORES_MOCK.filter(p => p.activo).map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Fecha de recepción *</Label>
                  <Input type="date" defaultValue={new Date().toISOString().split('T')[0]} style={{ marginTop: 4 }} />
                </div>
                <div>
                  <Label>Acceso vehicular (opcional)</Label>
                  <Select>
                    <SelectTrigger style={{ marginTop: 4 }}><SelectValue placeholder="Vincular ingreso vehicular..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin vincular</SelectItem>
                      <SelectItem value="1">Gloria S.A. · ABC-123 · Hoy 08:00</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Observaciones</Label>
                  <textarea
                    placeholder="Notas adicionales..."
                    style={{ marginTop: 4, width: '100%', minHeight: 80, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, resize: 'vertical', background: 'transparent', color: 'var(--fg)' }}
                  />
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {productos.map((p, i) => (
                  <div key={p.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>Producto {i + 1}</span>
                      {productos.length > 1 && (
                        <button
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 12 }}
                          onClick={() => setProductos(ps => ps.filter(pp => pp.id !== p.id))}
                        >✕</button>
                      )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div>
                        <Label style={{ fontSize: 11 }}>Producto</Label>
                        <Select>
                          <SelectTrigger style={{ marginTop: 2, height: 32 }}><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Arroz Extra Fino</SelectItem>
                            <SelectItem value="2">Leche Evaporada</SelectItem>
                            <SelectItem value="3">Aceite Vegetal</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label style={{ fontSize: 11 }}>Número de lote</Label>
                        <Input placeholder="LOTE-001" style={{ marginTop: 2, height: 32 }} />
                      </div>
                      <div>
                        <Label style={{ fontSize: 11 }}>Cantidad</Label>
                        <Input type="number" placeholder="0" style={{ marginTop: 2, height: 32 }} />
                      </div>
                      <div>
                        <Label style={{ fontSize: 11 }}>Peso (kg)</Label>
                        <Input type="number" placeholder="0.00" style={{ marginTop: 2, height: 32 }} />
                      </div>
                    </div>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setProductos(ps => [...ps, { id: Date.now() }])}>
                  + Agregar producto
                </Button>
              </div>
            )}
          </div>
          <SheetFooter style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 24px', background: 'var(--card)', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'space-between' }}>
            <Button variant="outline" onClick={() => { if (drawerStep === 1) setDrawerOpen(false); else setDrawerStep(1) }}>
              {drawerStep === 1 ? 'Cancelar' : '← Anterior'}
            </Button>
            <Button
              style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
              onClick={() => { if (drawerStep === 1) setDrawerStep(2); else setDrawerOpen(false) }}
            >
              {drawerStep === 1 ? 'Siguiente →' : 'Registrar ingreso'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
