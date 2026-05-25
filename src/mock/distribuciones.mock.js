// MOCK DATA — solo para desarrollo
// TODO: eliminar cuando el hook correspondiente esté conectado

const docentes = ['Carmen Quispe Huanca', 'Roberto Mamani Torres', 'Ana Flores Apaza', 'Luis Condori Quispe', 'Silvia García López']

const origenPesos = [
  ...Array(16).fill('online'),
  ...Array(3).fill('sincronizado'),
  ...Array(1).fill('offline'),
]

function randomOrigen() {
  return origenPesos[Math.floor(Math.random() * origenPesos.length)]
}

const alumnosBase = [
  { alumno_id: '1', alumno_nombre: 'Milagros Quispe Huanca', dni: '76543210', grado: '1ro', seccion: 'A' },
  { alumno_id: '2', alumno_nombre: 'Bryan Mamani Torres', dni: '76543211', grado: '2do', seccion: 'B' },
  { alumno_id: '3', alumno_nombre: 'Yaneth Condori Quispe', dni: '76543212', grado: '3ro', seccion: 'A' },
  { alumno_id: '4', alumno_nombre: 'Kevin Flores Apaza', dni: '76543213', grado: '1ro', seccion: 'C' },
  { alumno_id: '5', alumno_nombre: 'Lucía Huamán Ccallo', dni: '76543214', grado: '4to', seccion: 'A' },
]

const fechas = [
  '2025-05-14', '2025-05-15', '2025-05-16', '2025-05-19', '2025-05-20',
  '2025-05-21', '2025-05-22', '2025-05-23', '2025-05-24', '2025-05-25',
]

export const DISTRIBUCIONES_MOCK = fechas.flatMap((fecha, di) =>
  alumnosBase.map((al, ai) => ({
    id: `DIST-${di + 1}-${ai + 1}`,
    alumno_id: al.alumno_id,
    alumno_nombre: al.alumno_nombre,
    dni: al.dni,
    grado: al.grado,
    seccion: al.seccion,
    fecha,
    hora: `${12 + Math.floor(Math.random() * 2)}:${String(Math.floor(Math.random() * 59)).padStart(2, '0')}:${String(Math.floor(Math.random() * 59)).padStart(2, '0')}`,
    docente: docentes[(di + ai) % docentes.length],
    origen: randomOrigen(),
  }))
)
