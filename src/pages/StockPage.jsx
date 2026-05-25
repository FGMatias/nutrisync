import { useState } from 'react'
import { PackageSearch } from 'lucide-react'
import { PRODUCTOS_MOCK } from '../mock/productos.mock'
import DataTable from '../components/shared/DataTable'
import FilterBar from '../components/shared/FilterBar'
import PageHeader from '../components/shared/PageHeader'
import SearchBar from '../components/shared/SearchBar'
import TablePagination from '../components/shared/TablePagination'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Progress } from '../components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '../components/ui/sheet'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'

function getStockStatus(actual, minimo) {
  const pct = actual / minimo
  if (pct >= 1) return { label: 'Normal', color: 'var(--success)', bg: 'var(--success-bg)', pct: Math.min(100, Math.round(pct * 100)) }
  if (pct >= 0.5) return { label: 'Bajo mínimo', color: 'var(--warning)', bg: 'var(--warning-bg)', pct: Math.round(pct * 100) }
  return { label: 'Crítico', color: 'var(--danger)', bg: 'var(--danger-bg)', pct: Math.round(pct * 100) }
}

export default function StockPage() {
  const [search, setSearch] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('todas')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [page, setPage] = useState(1)
  const [ajusteOpen, setAjusteOpen] = useState(false)
  const [selectedProducto, setSelectedProducto] = useState(null)

  const activeFilters = (filtroCategoria !== 'todas' ? 1 : 0) + (filtroEstado !== 'todos' ? 1 : 0)
  const bajoMinimo = PRODUCTOS_MOCK.filter(p => p.stock_actual < p.stock_minimo).length

  const columns = [
    { key: 'codigo', header: 'Código', width: 90, render: (v) => <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--muted-fg)' }}>{v}</span> },
    {
      key: 'nombre',
      header: 'Producto',
      render: (v, row) => (
        <div>
          <p style={{ fontWeight: 500, margin: 0 }}>{v}</p>
          <p style={{ fontSize: 11, color: 'var(--muted-fg)', margin: 0 }}>{row.proveedor_nombre}</p>
        </div>
      ),
    },
    { key: 'categoria', header: 'Categoría' },
    {
      key: 'stock_actual',
      header: 'Stock Actual',
      render: (v, row) => <span style={{ fontWeight: 600 }}>{v} {row.unidad}</span>,
    },
    {
      key: 'stock_minimo',
      header: 'Stock Mínimo',
      render: (v, row) => <span style={{ color: 'var(--muted-fg)' }}>{v} {row.unidad}</span>,
    },
    {
      key: 'id',
      header: 'Estado Stock',
      render: (_, row) => {
        const st = getStockStatus(row.stock_actual, row.stock_minimo)
        return (
          <div style={{ minWidth: 130 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: st.color, background: st.bg, padding: '2px 6px', borderRadius: 4 }}>{st.label}</span>
            </div>
            <Progress value={st.pct} className="h-1" indicatorClassName={st.pct < 50 ? 'bg-red-500' : st.pct < 100 ? 'bg-yellow-500' : 'bg-green-600'} />
          </div>
        )
      },
    },
    {
      key: 'acciones',
      header: 'Acciones',
      align: 'center',
      width: 120,
      render: (_, row) => (
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
          <Button variant="ghost" size="sm" style={{ fontSize: 12, height: 28 }}>Historial</Button>
          <Button
            variant="outline"
            size="sm"
            style={{ fontSize: 12, height: 28 }}
            onClick={() => { setSelectedProducto(row); setAjusteOpen(true) }}
          >
            Ajustar
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Inventario"
        subtitle="Stock actual de productos"
        actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--muted-fg)' }}>
              15 productos · <span style={{ color: 'var(--danger)' }}>{bajoMinimo} bajo mínimo</span> · Actualizado hace 2 min
            </span>
            <Button variant="outline" size="sm">
              <PackageSearch size={14} style={{ marginRight: 4 }} /> Ajustar stock
            </Button>
          </div>
        }
      />

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar producto..." />
        <FilterBar activeCount={activeFilters} onClear={() => { setFiltroCategoria('todas'); setFiltroEstado('todos') }}>
          <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
            <SelectTrigger style={{ width: 160, height: 36 }}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las categorías</SelectItem>
              {['Cereales', 'Menestras', 'Lácteos', 'Aceites', 'Conservas', 'Tubérculos', 'General'].map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filtroEstado} onValueChange={setFiltroEstado}>
            <SelectTrigger style={{ width: 150, height: 36 }}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="bajo">Bajo mínimo</SelectItem>
              <SelectItem value="critico">Crítico</SelectItem>
            </SelectContent>
          </Select>
        </FilterBar>
      </div>

      <DataTable columns={columns} data={PRODUCTOS_MOCK} loading={false} />
      <TablePagination page={page} totalPages={2} total={PRODUCTOS_MOCK.length} pageSize={10} onPageChange={setPage} />

      {/* Ajuste Drawer */}
      <Sheet open={ajusteOpen} onOpenChange={setAjusteOpen}>
        <SheetContent style={{ width: 420, maxWidth: '95vw' }}>
          <SheetHeader>
            <SheetTitle>Ajustar Stock</SheetTitle>
          </SheetHeader>
          {selectedProducto && (
            <div style={{ padding: '24px 0 80px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: 'var(--muted)', padding: '12px 16px', borderRadius: 8 }}>
                <p style={{ fontWeight: 600, margin: 0 }}>{selectedProducto.nombre}</p>
                <p style={{ fontSize: 12, color: 'var(--muted-fg)', margin: 0 }}>Stock actual: {selectedProducto.stock_actual} {selectedProducto.unidad}</p>
              </div>
              <div>
                <Label>Cantidad a ajustar</Label>
                <Input placeholder="Ej: -5 (descuento) o 20 (entrada)" style={{ marginTop: 4 }} />
              </div>
              <div>
                <Label>Tipo de ajuste</Label>
                <Select>
                  <SelectTrigger style={{ marginTop: 4 }}>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="correccion">Corrección</SelectItem>
                    <SelectItem value="sincronizacion">Sincronización</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Motivo del ajuste</Label>
                <textarea
                  placeholder="Describe el motivo..."
                  style={{ marginTop: 4, width: '100%', minHeight: 80, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, resize: 'vertical', background: 'transparent' }}
                />
              </div>
              {/* TODO: conectar useAjustarStock */}
            </div>
          )}
          <SheetFooter style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 24px', background: 'var(--card)', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="outline" onClick={() => setAjusteOpen(false)}>Cancelar</Button>
            <Button style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>Guardar ajuste</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
