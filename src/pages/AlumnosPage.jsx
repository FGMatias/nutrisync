import { useState, useMemo, useEffect } from 'react'
import { Plus, QrCode, Download } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'
import { alumnoSchema } from '../schemas/alumnos.schema'
import { useAlumnos, useCreateAlumno, useUpdateAlumno } from '../hooks/queries/useAlumnos'
import DataTable from '../components/shared/DataTable'
import FilterBar from '../components/shared/FilterBar'
import PageHeader from '../components/shared/PageHeader'
import SearchBar from '../components/shared/SearchBar'
import StatusBadge from '../components/shared/StatusBadge'
import TablePagination from '../components/shared/TablePagination'
import { Button } from '../components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select'
import {
  Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle,
} from '../components/ui/sheet'
import { Switch } from '../components/ui/switch'

export default function AlumnosPage() {
  const { data: alumnosData = [], isLoading } = useAlumnos()
  const { mutate: createAlumno, isPending: isCreating } = useCreateAlumno()
  const { mutate: updateAlumno, isPending: isUpdating } = useUpdateAlumno()

  const [search, setSearch] = useState('')
  const [filtroGrado, setFiltroGrado] = useState('todos')
  const [filtroSeccion, setFiltroSeccion] = useState('todas')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [page, setPage] = useState(1)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedAlumno, setSelectedAlumno] = useState(null)
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [alumnoQr, setAlumnoQr] = useState(null)

  const [formData, setFormData] = useState({
    nombre: '', apellido: '', dni: '', grado: '', seccion: '', activo: true
  })

  useEffect(() => {
    if (selectedAlumno) {
      setFormData({ ...selectedAlumno })
    } else {
      setFormData({ nombre: '', apellido: '', dni: '', grado: '', seccion: '', activo: true })
    }
  }, [selectedAlumno])

  const activeFilters = (filtroGrado !== 'todos' ? 1 : 0) + (filtroSeccion !== 'todas' ? 1 : 0) + (filtroEstado !== 'todos' ? 1 : 0)

  const filteredData = useMemo(() => {
    return alumnosData.filter(alumno => {
      const matchSearch = alumno.nombre.toLowerCase().includes(search.toLowerCase()) || 
                          alumno.apellido.toLowerCase().includes(search.toLowerCase()) || 
                          alumno.dni.includes(search);
      const matchGrado = filtroGrado === 'todos' || alumno.grado === filtroGrado;
      const matchSeccion = filtroSeccion === 'todas' || alumno.seccion === filtroSeccion;
      const matchEstado = filtroEstado === 'todos' || 
                          (filtroEstado === 'activo' && alumno.activo) || 
                          (filtroEstado === 'inactivo' && !alumno.activo);
      return matchSearch && matchGrado && matchSeccion && matchEstado;
    })
  }, [alumnosData, search, filtroGrado, filtroSeccion, filtroEstado])

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  
  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [totalPages, page])

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, page])

  const handleSave = () => {
    const result = alumnoSchema.safeParse(formData);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }
    
    if (selectedAlumno) {
      updateAlumno(
        { id: selectedAlumno.id, data: result.data },
        { onSuccess: () => setDrawerOpen(false) }
      );
    } else {
      const newAlumno = {
        ...result.data,
        codigo_qr: crypto.randomUUID()
      };
      createAlumno(newAlumno, { onSuccess: () => setDrawerOpen(false) });
    }
  }

  const handleExportExcel = () => {
    const exportData = filteredData.map(alumno => ({
      Nombre: alumno.nombre,
      Apellido: alumno.apellido,
      DNI: alumno.dni,
      'Grado/Sección': `${alumno.grado} ${alumno.seccion}`,
      Estado: alumno.activo ? 'Activo' : 'Inactivo',
      Registro: format(new Date(alumno.creado_en), 'dd/MM/yyyy', { locale: es })
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Alumnos');
    XLSX.writeFile(workbook, 'Alumnos.xlsx');
  };

  const columns = [
    {
      key: 'nombre',
      header: 'Alumno',
      render: (v, row) => (
        <div>
          <p style={{ fontWeight: 500, margin: 0 }}>{v} {row.apellido}</p>
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
      key: 'codigo_qr',
      header: 'Código QR',
      render: (v) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <QrCode size={13} style={{ color: 'var(--muted-fg)' }} />
          <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--muted-fg)' }}>{v.substring(0, 8)}...</span>
        </div>
      ),
    },
    {
      key: 'activo',
      header: 'Estado',
      render: (v) => <StatusBadge status={v} />,
    },
    {
      key: 'creado_en',
      header: 'Registro',
      render: (v) => format(new Date(v), 'dd/MM/yyyy', { locale: es }),
    },
    {
      key: 'acciones',
      header: 'Acciones',
      align: 'center',
      width: 160,
      render: (_, row) => (
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
          <Button variant="ghost" size="sm" style={{ fontSize: 11, height: 28 }} onClick={() => { setAlumnoQr(row); setQrDialogOpen(true) }}>
            <QrCode size={12} style={{ marginRight: 3 }} /> Ver QR
          </Button>
          <Button variant="ghost" size="sm" style={{ fontSize: 11, height: 28 }} onClick={() => { setSelectedAlumno(row); setDrawerOpen(true) }}>
            Editar
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Alumnos"
        subtitle="Padrón de estudiantes matriculados"
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="outline" size="sm" onClick={handleExportExcel}>
              <Download size={14} style={{ marginRight: 4 }} /> Exportar Excel
            </Button>
            <Button
              onClick={() => { setSelectedAlumno(null); setDrawerOpen(true) }}
              style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
            >
              <Plus size={15} style={{ marginRight: 4 }} /> Registrar Alumno
            </Button>
          </div>
        }
      />

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar por nombre o DNI..." />
        <FilterBar activeCount={activeFilters} onClear={() => { setFiltroGrado('todos'); setFiltroSeccion('todas'); setFiltroEstado('todos') }}>
          <Select value={filtroGrado} onValueChange={setFiltroGrado}>
            <SelectTrigger style={{ width: 130, height: 36 }}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los grados</SelectItem>
              {['1ro', '2do', '3ro', '4to', '5to', '6to'].map(g => <SelectItem key={g} value={g}>{g} grado</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filtroSeccion} onValueChange={setFiltroSeccion}>
            <SelectTrigger style={{ width: 120, height: 36 }}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las secciones</SelectItem>
              {['A', 'B', 'C'].map(s => <SelectItem key={s} value={s}>Sección {s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filtroEstado} onValueChange={setFiltroEstado}>
            <SelectTrigger style={{ width: 130, height: 36 }}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              <SelectItem value="activo">Activos</SelectItem>
              <SelectItem value="inactivo">Inactivos</SelectItem>
            </SelectContent>
          </Select>
        </FilterBar>
      </div>

      <DataTable columns={columns} data={paginatedData} loading={isLoading} />
      <TablePagination page={page} totalPages={totalPages} total={filteredData.length} pageSize={pageSize} onPageChange={setPage} />

      {/* Drawer */}
      <Sheet open={drawerOpen} onOpenChange={v => { setDrawerOpen(v); if (!v) setSelectedAlumno(null) }}>
        <SheetContent style={{ width: 480, maxWidth: '95vw' }}>
          <SheetHeader>
            <SheetTitle>{selectedAlumno ? 'Editar Alumno' : 'Registrar Alumno'}</SheetTitle>
          </SheetHeader>
          <div style={{ padding: '24px 0 80px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <Label>Nombre *</Label>
                <Input value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} placeholder="Nombre" style={{ marginTop: 4 }} />
              </div>
              <div>
                <Label>Apellido *</Label>
                <Input value={formData.apellido} onChange={e => setFormData({...formData, apellido: e.target.value})} placeholder="Apellidos" style={{ marginTop: 4 }} />
              </div>
            </div>
            <div>
              <Label>DNI * (8 dígitos)</Label>
              <Input value={formData.dni} onChange={e => setFormData({...formData, dni: e.target.value})} placeholder="12345678" maxLength={8} style={{ marginTop: 4 }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <Label>Grado *</Label>
                <Select value={formData.grado} onValueChange={v => setFormData({...formData, grado: v})}>
                  <SelectTrigger style={{ marginTop: 4 }}><SelectValue placeholder="Grado..." /></SelectTrigger>
                  <SelectContent>
                    {['1ro', '2do', '3ro', '4to', '5to', '6to'].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sección *</Label>
                <Select value={formData.seccion} onValueChange={v => setFormData({...formData, seccion: v})}>
                  <SelectTrigger style={{ marginTop: 4 }}><SelectValue placeholder="Sección..." /></SelectTrigger>
                  <SelectContent>
                    {['A', 'B', 'C'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {selectedAlumno && (
              <div>
                <Label>Código matrícula</Label>
                <Input value={selectedAlumno.codigo_qr} readOnly style={{ marginTop: 4, background: 'var(--muted)', fontSize: 11, fontFamily: 'monospace' }} />
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Switch id="alumno-activo" checked={formData.activo} onCheckedChange={v => setFormData({...formData, activo: v})} />
              <Label htmlFor="alumno-activo" style={{ cursor: 'pointer' }}>Alumno activo</Label>
            </div>
          </div>
          <SheetFooter style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 24px', background: 'var(--card)', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="outline" onClick={() => setDrawerOpen(false)} disabled={isCreating || isUpdating}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isCreating || isUpdating} style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
              {isCreating || isUpdating ? 'Guardando...' : 'Guardar'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* QR Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent style={{ maxWidth: 360 }}>
          <DialogHeader>
            <DialogTitle>Código QR del Alumno</DialogTitle>
          </DialogHeader>
          {alumnoQr && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '16px 0' }}>
              <div style={{ width: 200, height: 200, background: '#1e293b', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <QrCode size={80} color="white" />
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontWeight: 600, margin: 0 }}>{alumnoQr.nombre} {alumnoQr.apellido}</p>
                <p style={{ fontSize: 12, color: 'var(--muted-fg)' }}>{alumnoQr.grado} {alumnoQr.seccion} · DNI: {alumnoQr.dni}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setQrDialogOpen(false)}>Cerrar</Button>
            <Button style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>Descargar PDF</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
