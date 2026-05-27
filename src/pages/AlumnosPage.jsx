import { useState, useMemo, useEffect, useRef } from 'react'
import { Plus, QrCode, Download } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import { QRCodeCanvas } from 'qrcode.react'
import { toast } from 'sonner'
import { alumnoSchema } from '../schemas/alumnos.schema'
import { buildAlumnoQrPayload } from '../lib/alumnos-qr'
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

function getQrCodeLabel(value) {
  return (value ?? 'sin-codigo').substring(0, 8)
}

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
  const qrCanvasWrapperRef = useRef(null)

  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    dni: '',
    grado: '',
    seccion: '',
    activo: true,
  })

  useEffect(() => {
    if (selectedAlumno) {
      setFormData({ ...selectedAlumno })
      return
    }

    setFormData({
      nombre: '',
      apellido: '',
      dni: '',
      grado: '',
      seccion: '',
      activo: true,
    })
  }, [selectedAlumno])

  const activeFilters =
    (filtroGrado !== 'todos' ? 1 : 0) +
    (filtroSeccion !== 'todas' ? 1 : 0) +
    (filtroEstado !== 'todos' ? 1 : 0)

  const filteredData = useMemo(() => {
    return alumnosData.filter((alumno) => {
      const searchValue = search.toLowerCase()
      const matchSearch =
        alumno.nombre.toLowerCase().includes(searchValue) ||
        alumno.apellido.toLowerCase().includes(searchValue) ||
        alumno.dni.includes(search)
      const matchGrado = filtroGrado === 'todos' || alumno.grado === filtroGrado
      const matchSeccion = filtroSeccion === 'todas' || alumno.seccion === filtroSeccion
      const matchEstado =
        filtroEstado === 'todos' ||
        (filtroEstado === 'activo' && alumno.activo) ||
        (filtroEstado === 'inactivo' && !alumno.activo)

      return matchSearch && matchGrado && matchSeccion && matchEstado
    })
  }, [alumnosData, search, filtroGrado, filtroSeccion, filtroEstado])

  const pageSize = 10
  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize))

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredData.slice(start, start + pageSize)
  }, [filteredData, page])

  const handleSave = () => {
    const result = alumnoSchema.safeParse(formData)
    if (!result.success) {
      toast.error(result.error.errors[0].message)
      return
    }

    if (selectedAlumno) {
      updateAlumno(
        { id: selectedAlumno.id, data: result.data },
        { onSuccess: () => setDrawerOpen(false) },
      )
      return
    }

    createAlumno(
      {
        ...result.data,
        codigo_qr: crypto.randomUUID(),
      },
      { onSuccess: () => setDrawerOpen(false) },
    )
  }

  const handleExportExcel = () => {
    const exportData = filteredData.map((alumno) => ({
      Nombre: alumno.nombre,
      Apellido: alumno.apellido,
      DNI: alumno.dni,
      'Grado/Seccion': `${alumno.grado} ${alumno.seccion}`,
      Estado: alumno.activo ? 'Activo' : 'Inactivo',
      Registro: format(new Date(alumno.creado_en), 'dd/MM/yyyy', { locale: es }),
    }))

    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Alumnos')
    XLSX.writeFile(workbook, 'Alumnos.xlsx')
  }

  const handleDownloadQrPdf = () => {
    if (!alumnoQr) return

    const canvas = qrCanvasWrapperRef.current?.querySelector('canvas')
    if (!canvas) {
      toast.error('No se pudo generar el QR para descargar')
      return
    }

    try {
      const pdf = new jsPDF({ unit: 'pt', format: [320, 420] })
      const qrImage = canvas.toDataURL('image/png')
      const nombreCompleto = `${alumnoQr.nombre} ${alumnoQr.apellido}`.trim()
      const subtitulo = `${alumnoQr.grado} ${alumnoQr.seccion} | DNI: ${alumnoQr.dni}`
      const archivoBase = (nombreCompleto || alumnoQr.dni || 'alumno')
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')

      pdf.setFillColor(248, 250, 252)
      pdf.roundedRect(24, 24, 272, 372, 16, 16, 'F')
      pdf.setDrawColor(226, 232, 240)
      pdf.roundedRect(24, 24, 272, 372, 16, 16, 'S')
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(20)
      pdf.text('Codigo QR del Alumno', 160, 58, { align: 'center' })
      pdf.addImage(qrImage, 'PNG', 64, 82, 192, 192)
      pdf.setTextColor(15, 23, 42)
      pdf.setFontSize(16)
      pdf.text(nombreCompleto, 160, 300, { align: 'center' })
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(11)
      pdf.setTextColor(100, 116, 139)
      pdf.text(subtitulo, 160, 322, { align: 'center' })
      pdf.text(`Codigo: ${alumnoQr.codigo_qr ?? 'sin-codigo'}`, 160, 342, {
        align: 'center',
        maxWidth: 220,
      })

      pdf.save(`qr-${archivoBase}.pdf`)
      toast.success('QR descargado correctamente')
    } catch {
      toast.error('No se pudo descargar el QR')
    }
  }

  const columns = [
    {
      key: 'nombre',
      header: 'Alumno',
      render: (value, row) => (
        <div>
          <p style={{ fontWeight: 500, margin: 0 }}>{value} {row.apellido}</p>
          <p style={{ fontSize: 11, color: 'var(--muted-fg)', margin: 0 }}>DNI: {row.dni}</p>
        </div>
      ),
    },
    { key: 'dni', header: 'DNI' },
    {
      key: 'grado',
      header: 'Grado / Seccion',
      render: (value, row) => <span style={{ fontWeight: 500 }}>{value} {row.seccion}</span>,
    },
    {
      key: 'codigo_qr',
      header: 'Codigo QR',
      render: (value) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <QrCode size={13} style={{ color: 'var(--muted-fg)' }} />
          <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--muted-fg)' }}>
            {getQrCodeLabel(value)}...
          </span>
        </div>
      ),
    },
    {
      key: 'activo',
      header: 'Estado',
      render: (value) => <StatusBadge status={value} />,
    },
    {
      key: 'creado_en',
      header: 'Registro',
      render: (value) => format(new Date(value), 'dd/MM/yyyy', { locale: es }),
    },
    {
      key: 'acciones',
      header: 'Acciones',
      align: 'center',
      width: 160,
      render: (_, row) => (
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
          <Button
            variant="ghost"
            size="sm"
            style={{ fontSize: 11, height: 28 }}
            onClick={() => {
              setAlumnoQr(row)
              setQrDialogOpen(true)
            }}
          >
            <QrCode size={12} style={{ marginRight: 3 }} /> Ver QR
          </Button>
          <Button
            variant="ghost"
            size="sm"
            style={{ fontSize: 11, height: 28 }}
            onClick={() => {
              setSelectedAlumno(row)
              setDrawerOpen(true)
            }}
          >
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
        subtitle="Padron de estudiantes matriculados"
        actions={(
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="outline" size="sm" onClick={handleExportExcel}>
              <Download size={14} style={{ marginRight: 4 }} /> Exportar Excel
            </Button>
            <Button
              onClick={() => {
                setSelectedAlumno(null)
                setDrawerOpen(true)
              }}
              style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
            >
              <Plus size={15} style={{ marginRight: 4 }} /> Registrar Alumno
            </Button>
          </div>
        )}
      />

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar por nombre o DNI..." />
        <FilterBar
          activeCount={activeFilters}
          onClear={() => {
            setFiltroGrado('todos')
            setFiltroSeccion('todas')
            setFiltroEstado('todos')
          }}
        >
          <Select value={filtroGrado} onValueChange={setFiltroGrado}>
            <SelectTrigger style={{ width: 130, height: 36 }}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los grados</SelectItem>
              {['1ro', '2do', '3ro', '4to', '5to', '6to'].map((grado) => (
                <SelectItem key={grado} value={grado}>{grado} grado</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filtroSeccion} onValueChange={setFiltroSeccion}>
            <SelectTrigger style={{ width: 120, height: 36 }}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las secciones</SelectItem>
              {['A', 'B', 'C'].map((seccion) => (
                <SelectItem key={seccion} value={seccion}>Seccion {seccion}</SelectItem>
              ))}
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
      <TablePagination
        page={page}
        totalPages={totalPages}
        total={filteredData.length}
        pageSize={pageSize}
        onPageChange={setPage}
      />

      <Sheet
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open)
          if (!open) {
            setSelectedAlumno(null)
          }
        }}
      >
        <SheetContent style={{ width: 480, maxWidth: '95vw' }}>
          <SheetHeader>
            <SheetTitle>{selectedAlumno ? 'Editar Alumno' : 'Registrar Alumno'}</SheetTitle>
          </SheetHeader>
          <div style={{ padding: '24px 0 80px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <Label>Nombre *</Label>
                <Input
                  value={formData.nombre}
                  onChange={(event) => setFormData({ ...formData, nombre: event.target.value })}
                  placeholder="Nombre"
                  style={{ marginTop: 4 }}
                />
              </div>
              <div>
                <Label>Apellido *</Label>
                <Input
                  value={formData.apellido}
                  onChange={(event) => setFormData({ ...formData, apellido: event.target.value })}
                  placeholder="Apellidos"
                  style={{ marginTop: 4 }}
                />
              </div>
            </div>
            <div>
              <Label>DNI * (8 digitos)</Label>
              <Input
                value={formData.dni}
                onChange={(event) => setFormData({ ...formData, dni: event.target.value })}
                placeholder="12345678"
                maxLength={8}
                style={{ marginTop: 4 }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <Label>Grado *</Label>
                <Select value={formData.grado} onValueChange={(value) => setFormData({ ...formData, grado: value })}>
                  <SelectTrigger style={{ marginTop: 4 }}><SelectValue placeholder="Grado..." /></SelectTrigger>
                  <SelectContent>
                    {['1ro', '2do', '3ro', '4to', '5to', '6to'].map((grado) => (
                      <SelectItem key={grado} value={grado}>{grado}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Seccion *</Label>
                <Select value={formData.seccion} onValueChange={(value) => setFormData({ ...formData, seccion: value })}>
                  <SelectTrigger style={{ marginTop: 4 }}><SelectValue placeholder="Seccion..." /></SelectTrigger>
                  <SelectContent>
                    {['A', 'B', 'C'].map((seccion) => (
                      <SelectItem key={seccion} value={seccion}>{seccion}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {selectedAlumno && (
              <div>
                <Label>Codigo matricula</Label>
                <Input
                  value={selectedAlumno.codigo_qr ?? 'sin-codigo'}
                  readOnly
                  style={{ marginTop: 4, background: 'var(--muted)', fontSize: 11, fontFamily: 'monospace' }}
                />
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Switch
                id="alumno-activo"
                checked={formData.activo}
                onCheckedChange={(value) => setFormData({ ...formData, activo: value })}
              />
              <Label htmlFor="alumno-activo" style={{ cursor: 'pointer' }}>Alumno activo</Label>
            </div>
          </div>
          <SheetFooter
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '12px 24px',
              background: 'var(--card)',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              gap: 8,
              justifyContent: 'flex-end',
            }}
          >
            <Button variant="outline" onClick={() => setDrawerOpen(false)} disabled={isCreating || isUpdating}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={isCreating || isUpdating}
              style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
            >
              {isCreating || isUpdating ? 'Guardando...' : 'Guardar'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent style={{ maxWidth: 380 }}>
          <DialogHeader>
            <DialogTitle>Codigo QR del Alumno</DialogTitle>
          </DialogHeader>
          {alumnoQr && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '16px 0' }}>
              <div
                style={{
                  width: '100%',
                  borderRadius: 16,
                  border: '1px solid var(--border)',
                  background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
                  padding: 20,
                }}
              >
                <div
                  ref={qrCanvasWrapperRef}
                  style={{
                    width: 256,
                    margin: '0 auto 16px',
                    padding: 16,
                    background: '#ffffff',
                    borderRadius: 12,
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <QRCodeCanvas
                    value={buildAlumnoQrPayload(alumnoQr)}
                    size={256}
                    level="L"
                    includeMargin
                    bgColor="#ffffff"
                    fgColor="#0f172a"
                  />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontWeight: 600, margin: '0 0 4px' }}>{alumnoQr.nombre} {alumnoQr.apellido}</p>
                  <p style={{ fontSize: 12, color: 'var(--muted-fg)', margin: '0 0 8px' }}>
                    {alumnoQr.grado} {alumnoQr.seccion} | DNI: {alumnoQr.dni}
                  </p>
                  <p style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--muted-fg)', margin: 0 }}>
                    {alumnoQr.codigo_qr ?? 'sin-codigo'}
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setQrDialogOpen(false)}>Cerrar</Button>
            <Button onClick={handleDownloadQrPdf} style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
              Descargar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
