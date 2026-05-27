import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CheckCircle2, LogOut } from 'lucide-react'
<<<<<<< HEAD
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, useSignOut } from '../hooks/queries/useAuth'
import ConfirmDialog from '../components/shared/ConfirmDialog'
=======
import { useSignOut } from '../hooks/queries/useAuth'
>>>>>>> origin/claude/pensive-heisenberg-KTWpe
import { Button } from '../components/ui/button'

const alumnoMock = {
  nombre: 'Lucía Huamán Ccallo',
  grado: '4to Grado',
  seccion: 'Sección A',
  initials: 'LH',
}

const hoy = '2025-05-25'

const historial = [
  { fecha: '2025-05-25', entregado: true, hora: '12:35', docente: 'Carmen Quispe Huanca' },
  { fecha: '2025-05-24', entregado: false },
  { fecha: '2025-05-23', entregado: true, hora: '12:42', docente: 'Roberto Mamani Torres' },
  { fecha: '2025-05-22', entregado: true, hora: '12:30', docente: 'Carmen Quispe Huanca' },
  { fecha: '2025-05-21', entregado: true, hora: '12:38', docente: 'Silvia García López' },
  { fecha: '2025-05-20', entregado: true, hora: '12:31', docente: 'Carmen Quispe Huanca' },
  { fecha: '2025-05-19', entregado: false },
  { fecha: '2025-05-16', entregado: true, hora: '12:45', docente: 'Roberto Mamani Torres' },
  { fecha: '2025-05-15', entregado: true, hora: '12:33', docente: 'Carmen Quispe Huanca' },
  { fecha: '2025-05-14', entregado: true, hora: '12:40', docente: 'Silvia García López' },
]

const entregadoHoy = historial[0].entregado

export default function PortalPadrePage() {
<<<<<<< HEAD
  const navigate = useNavigate()
  const { mutate: signOut, isPending: isSigningOut } = useSignOut()
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)

  const handleLogout = () => {
    setLogoutDialogOpen(true)
  }

=======
  const { mutate: signOut } = useSignOut()

>>>>>>> origin/claude/pensive-heisenberg-KTWpe
  return (
    <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border)', background: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 6, background: 'hsl(174,72%,24%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>C</span>
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: 14, margin: 0, color: 'hsl(174,72%,24%)' }}>Chasquis</p>
            <p style={{ fontSize: 11, color: 'var(--muted-fg)', margin: 0 }}>Portal de Padres</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => signOut()}>
          <LogOut size={14} style={{ marginRight: 4 }} /> Cerrar sesión
        </Button>
      </header>

      {/* Content */}
      <main style={{ flex: 1, maxWidth: 480, margin: '0 auto', width: '100%', padding: 24 }}>
        {/* Estado hoy */}
        <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 24, marginBottom: 24, textAlign: 'center' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'hsl(174,72%,24%)',
            color: '#fff', fontSize: 24, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            {alumnoMock.initials}
          </div>
          <h2 style={{ fontWeight: 700, fontSize: 18, margin: '0 0 4px' }}>{alumnoMock.nombre}</h2>
          <p style={{ color: 'var(--muted-fg)', fontSize: 13, margin: '0 0 20px' }}>{alumnoMock.grado} · {alumnoMock.seccion}</p>

          {entregadoHoy ? (
            <div style={{ background: 'var(--success-bg)', border: '1px solid hsl(142,60%,82%)', borderRadius: 10, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 6 }}>
                <CheckCircle2 size={22} style={{ color: 'var(--success)' }} />
                <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--success)' }}>Ración entregada hoy</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--muted-fg)', margin: 0 }}>
                Registrado a las {historial[0].hora} · Docente: {historial[0].docente}
              </p>
            </div>
          ) : (
            <div style={{ background: 'var(--muted)', borderRadius: 10, padding: 16 }}>
              <p style={{ fontWeight: 600, margin: '0 0 4px' }}>⏳ Aún no registrado</p>
              <p style={{ fontSize: 12, color: 'var(--muted-fg)', margin: 0 }}>
                La distribución se registra durante el refrigerio escolar
              </p>
            </div>
          )}
        </div>

        {/* Historial */}
        <div>
          <h3 style={{ fontWeight: 600, fontSize: 15, marginBottom: 16 }}>Historial últimos 10 días</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {historial.map((item) => (
              <div
                key={item.fecha}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 16px', borderRadius: 8,
                  background: item.entregado ? 'var(--success-bg)' : 'var(--muted)',
                  border: `1px solid ${item.entregado ? 'hsl(142,60%,88%)' : 'var(--border)'}`,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 500, textTransform: 'capitalize' }}>
                  {format(new Date(item.fecha), "EEEE d 'de' MMMM", { locale: es })}
                </span>
                {item.entregado ? (
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle2 size={14} /> Entregado
                  </span>
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--muted-fg)' }}>No registrado</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer style={{ textAlign: 'center', padding: '16px', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--muted-fg)' }}>
        Chasquis · Sistema de Alimentación Escolar PAE · IE 8060 Los Chasquis
      </footer>

      <ConfirmDialog
        open={logoutDialogOpen}
        onOpenChange={setLogoutDialogOpen}
        title="¿Cerrar sesión?"
        description="Estás a punto de cerrar tu sesión actual. Si tienes cambios no guardados, podrías perderlos."
        onConfirm={() =>
          signOut(undefined, {
            onSuccess: () => navigate('/login', { replace: true }),
          })
        }
        loading={isSigningOut}
        variant="danger"
        confirmLabel="Sí, cerrar sesión"
      />
    </div>
  )
}
