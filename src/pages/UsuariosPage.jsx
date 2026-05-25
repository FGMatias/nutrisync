import { useState } from 'react'
import { Plus } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { USUARIOS_MOCK } from '../mock/usuarios.mock'
import { ALUMNOS_MOCK } from '../mock/alumnos.mock'
import DataTable from '../components/shared/DataTable'
import FilterBar from '../components/shared/FilterBar'
import PageHeader from '../components/shared/PageHeader'
import SearchBar from '../components/shared/SearchBar'
import StatusBadge from '../components/shared/StatusBadge'
import TablePagination from '../components/shared/TablePagination'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '../components/ui/sheet'
import { Switch } from '../components/ui/switch'
import { ROLE_LABELS, ROLES } from '../constants/roles'

const ROL_BADGE_STYLE = {
  [ROLES.ADMINISTRADOR]: { background: 'hsla(174,72%,24%,0.12)', color: 'hsl(174,72%,24%)' },
  [ROLES.DIRECTOR]: { background: 'var(--info-bg)', color: 'var(--info)' },
  [ROLES.CAE]: { background: 'var(--warning-bg)', color: 'var(--warning)' },
  [ROLES.ALMACEN]: { background: 'var(--success-bg)', color: 'var(--success)' },
  [ROLES.DOCENTE]: { background: 'var(--muted)', color: 'var(--muted-fg)' },
  [ROLES.OPERARIO_LOGISTICO]: { background: 'var(--muted)', color: 'var(--fg)' },
  [ROLES.PADRE_FAMILIA]: { background: 'var(--muted)', color: 'var(--muted-fg)' },
}

export default function UsuariosPage() {
  const [search, setSearch] = useState('')
  const [filtroRol, setFiltroRol] = useState('todos')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [page, setPage] = useState(1)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedUsuario, setSelectedUsuario] = useState(null)

  const watchRol = selectedUsuario?.rol ?? ''
  const activeFilters = (filtroRol !== 'todos' ? 1 : 0) + (filtroEstado !== 'todos' ? 1 : 0)

  const columns = [
    {
      key: 'nombre_completo',
      header: 'Usuario',
      render: (v, row) => (
        <div>
          <p style={{ fontWeight: 500, margin: 0 }}>{v}</p>
          <p style={{ fontSize: 11, color: 'var(--muted-fg)', margin: 0 }}>{row.email}</p>
        </div>
      ),
    },
    {
      key: 'rol',
      header: 'Rol',
      render: (v) => {
        const st = ROL_BADGE_STYLE[v] ?? {}
        return (
          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, ...st }}>
            {ROLE_LABELS[v] ?? v}
          </span>
        )
      },
    },
    { key: 'dni', header: 'DNI', render: (v) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v || '—'}</span> },
    { key: 'telefono', header: 'Teléfono', render: (v) => <span style={{ fontSize: 12 }}>{v || '—'}</span> },
    { key: 'activo', header: 'Estado', render: (v) => <StatusBadge status={v} /> },
    {
      key: 'creado_en',
      header: 'Creado',
      render: (v) => format(new Date(v), 'dd/MM/yyyy', { locale: es }),
    },
    {
      key: 'acciones',
      header: 'Acciones',
      align: 'center',
      width: 200,
      render: (_, row) => (
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
          <Button variant="ghost" size="sm" style={{ fontSize: 11, height: 28 }} onClick={() => { setSelectedUsuario(row); setDrawerOpen(true) }}>Editar</Button>
          <Button variant="ghost" size="sm" style={{ fontSize: 11, height: 28 }}>
            {row.activo ? 'Desactivar' : 'Activar'}
          </Button>
          <Button variant="ghost" size="sm" style={{ fontSize: 11, height: 28, color: 'var(--warning)' }}>Contraseña</Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Gestión de Usuarios"
        subtitle="Cuentas y roles del sistema"
        actions={
          <Button onClick={() => { setSelectedUsuario(null); setDrawerOpen(true) }} style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
            <Plus size={15} style={{ marginRight: 4 }} /> Nuevo Usuario
          </Button>
        }
      />

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar por nombre o correo..." />
        <FilterBar activeCount={activeFilters} onClear={() => { setFiltroRol('todos'); setFiltroEstado('todos') }}>
          <Select value={filtroRol} onValueChange={setFiltroRol}>
            <SelectTrigger style={{ width: 190, height: 36 }}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los roles</SelectItem>
              {Object.entries(ROLE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filtroEstado} onValueChange={setFiltroEstado}>
            <SelectTrigger style={{ width: 150, height: 36 }}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="activo">Activos</SelectItem>
              <SelectItem value="inactivo">Inactivos</SelectItem>
            </SelectContent>
          </Select>
        </FilterBar>
      </div>

      <DataTable columns={columns} data={USUARIOS_MOCK} loading={false} />
      <TablePagination page={page} totalPages={1} total={USUARIOS_MOCK.length} pageSize={10} onPageChange={setPage} />

      <Sheet open={drawerOpen} onOpenChange={v => { setDrawerOpen(v); if (!v) setSelectedUsuario(null) }}>
        <SheetContent style={{ width: 480, maxWidth: '95vw' }}>
          <SheetHeader>
            <SheetTitle>{selectedUsuario ? 'Editar Usuario' : 'Nuevo Usuario'}</SheetTitle>
          </SheetHeader>
          <div style={{ padding: '24px 0 80px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <Label>Nombre completo *</Label>
              <Input defaultValue={selectedUsuario?.nombre_completo} placeholder="Nombre y apellidos" style={{ marginTop: 4 }} />
            </div>
            <div>
              <Label>Correo electrónico *</Label>
              <Input type="email" defaultValue={selectedUsuario?.email} placeholder="usuario@ie8060.edu.pe" style={{ marginTop: 4 }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <Label>DNI</Label>
                <Input defaultValue={selectedUsuario?.dni} placeholder="12345678" maxLength={8} style={{ marginTop: 4 }} />
              </div>
              <div>
                <Label>Teléfono</Label>
                <Input defaultValue={selectedUsuario?.telefono} placeholder="999999999" style={{ marginTop: 4 }} />
              </div>
            </div>
            <div>
              <Label>Rol *</Label>
              <Select defaultValue={selectedUsuario?.rol}>
                <SelectTrigger style={{ marginTop: 4 }}><SelectValue placeholder="Seleccionar rol..." /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {!selectedUsuario && (
              <div>
                <Label>Contraseña temporal</Label>
                <Input type="password" placeholder="Mínimo 8 caracteres" style={{ marginTop: 4 }} />
              </div>
            )}
            {watchRol === ROLES.PADRE_FAMILIA && (
              <div>
                <Label>Alumno vinculado</Label>
                <Select>
                  <SelectTrigger style={{ marginTop: 4 }}><SelectValue placeholder="Seleccionar alumno..." /></SelectTrigger>
                  <SelectContent>
                    {ALUMNOS_MOCK.map(a => <SelectItem key={a.id} value={a.id}>{a.nombre} {a.apellido}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Switch id="usuario-activo" defaultChecked={selectedUsuario?.activo ?? true} />
              <Label htmlFor="usuario-activo" style={{ cursor: 'pointer' }}>Usuario activo</Label>
            </div>
          </div>
          <SheetFooter style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 24px', background: 'var(--card)', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>Cancelar</Button>
            <Button style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>Guardar</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
