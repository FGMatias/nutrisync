import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { DISTRIBUCIONES_MOCK } from '../mock/distribuciones.mock'
import DataTable from '../components/shared/DataTable'
import FilterBar from '../components/shared/FilterBar'
import PageHeader from '../components/shared/PageHeader'
import SearchBar from '../components/shared/SearchBar'
import StatusBadge from '../components/shared/StatusBadge'
import TablePagination from '../components/shared/TablePagination'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select'
import { Input } from '../components/ui/input'

const total = DISTRIBUCIONES_MOCK.length
const hoy = '2025-05-25'
const distHoy = DISTRIBUCIONES_MOCK.filter(d => d.fecha === hoy)

export default function DistribucionesPage() {
  const [search, setSearch] = useState('')
  const [filtroGrado, setFiltroGrado] = useState('todos')
  const [filtroOrigen, setFiltroOrigen] = useState('todos')
  const [page, setPage] = useState(1)
  const activeFilters = (filtroGrado !== 'todos' ? 1 : 0) + (filtroOrigen !== 'todos' ? 1 : 0)
  const PAGE_SIZE = 10

  const shown = DISTRIBUCIONES_MOCK.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const columns = [
    {
      key: 'alumno_nombre',
      header: 'Alumno',
      render: (v, row) => (
        <div>
          <p style={{ fontWeight: 500, margin: 0 }}>{v}</p>
          <p style={{ fontSize: 11, color: 'var(--muted-fg)', margin: 0 }}>DNI: {row.dni}</p>
        </div>
      ),
    },
    { key: 'dni', header: 'DNI' },
    {
      key: 'grado',
      header: 'Grado / Sección',
      render: (v, row) => <span style={{ fontWeight: 500 }}>{v} {row.seccion}</span>,
    },
    {
      key: 'fecha',
      header: 'Fecha',
      render: (v) => format(new Date(v), 'dd/MM/yyyy', { locale: es }),
    },
    { key: 'hora', header: 'Hora' },
    { key: 'docente', header: 'Docente', render: (v) => <span style={{ fontSize: 12 }}>{v}</span> },
    {
      key: 'origen',
      header: 'Origen',
      render: (v) => <StatusBadge status={v} />,
    },
    {
      key: 'acciones',
      header: 'Acciones',
      align: 'center',
      width: 100,
      render: () => <Button variant="ghost" size="sm" style={{ fontSize: 11, height: 28 }}>Ver detalle</Button>,
    },
  ]

  return (
    <div>
      <PageHeader
        title="Distribuciones"
        subtitle="Registro de entregas diarias"
        actions={
          <div style={{ display: 'flex', gap: 12 }}>
            <Card style={{ border: 'none', boxShadow: 'none', background: 'var(--muted)' }}>
              <CardContent style={{ padding: '6px 16px', display: 'flex', gap: 24 }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--primary)' }}>{distHoy.length}</p>
                  <p style={{ fontSize: 11, color: 'var(--muted-fg)', margin: 0 }}>Hoy</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{total}</p>
                  <p style={{ fontSize: 11, color: 'var(--muted-fg)', margin: 0 }}>Total</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--success)' }}>92%</p>
                  <p style={{ fontSize: 11, color: 'var(--muted-fg)', margin: 0 }}>Cobertura</p>
                </div>
              </CardContent>
            </Card>
          </div>
        }
      />

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar por alumno o docente..." />
        <FilterBar activeCount={activeFilters} onClear={() => { setFiltroGrado('todos'); setFiltroOrigen('todos') }}>
          <Input type="date" style={{ width: 160, height: 36, fontSize: 13 }} defaultValue="2025-05-20" />
          <Input type="date" style={{ width: 160, height: 36, fontSize: 13 }} defaultValue="2025-05-25" />
          <Select value={filtroGrado} onValueChange={setFiltroGrado}>
            <SelectTrigger style={{ width: 130, height: 36 }}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los grados</SelectItem>
              {['1ro', '2do', '3ro', '4to', '5to', '6to'].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filtroOrigen} onValueChange={setFiltroOrigen}>
            <SelectTrigger style={{ width: 150, height: 36 }}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los orígenes</SelectItem>
              <SelectItem value="online">En línea</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
              <SelectItem value="sincronizado">Sincronizado</SelectItem>
            </SelectContent>
          </Select>
        </FilterBar>
      </div>

      <DataTable columns={columns} data={shown} loading={false} />
      <TablePagination
        page={page}
        totalPages={Math.ceil(DISTRIBUCIONES_MOCK.length / PAGE_SIZE)}
        total={DISTRIBUCIONES_MOCK.length}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />
    </div>
  )
}
