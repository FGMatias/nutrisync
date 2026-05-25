import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CheckCircle2, QrCode } from 'lucide-react'
import { useAuth } from '../hooks/queries/useAuth'
import { Badge } from '../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'

export default function QRScannerPage() {
  const { perfil } = useAuth()
  const hoy = format(new Date(), "EEEE d 'de' MMMM yyyy", { locale: es })

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Escaneo QR</h1>
          <p style={{ fontSize: 13, color: 'var(--muted-fg)', margin: '2px 0 0' }}>{hoy}</p>
        </div>
        <Badge style={{ background: 'var(--success-bg)', color: 'var(--success)', border: 'none', padding: '6px 12px' }}>
          <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', marginRight: 6 }} />
          En línea
        </Badge>
      </div>

      <Card style={{ marginBottom: 20 }}>
        <CardHeader style={{ paddingBottom: 0 }}>
          <CardTitle style={{ fontSize: 14 }}>Escáner de cámara</CardTitle>
        </CardHeader>
        <CardContent style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, paddingTop: 16 }}>
          {/* Camera placeholder */}
          <div style={{
            width: 320, height: 320,
            background: '#1a1a2e',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Scanning corner brackets */}
            {[
              { top: 20, left: 20, borderTop: '3px solid hsl(174,72%,50%)', borderLeft: '3px solid hsl(174,72%,50%)' },
              { top: 20, right: 20, borderTop: '3px solid hsl(174,72%,50%)', borderRight: '3px solid hsl(174,72%,50%)' },
              { bottom: 20, left: 20, borderBottom: '3px solid hsl(174,72%,50%)', borderLeft: '3px solid hsl(174,72%,50%)' },
              { bottom: 20, right: 20, borderBottom: '3px solid hsl(174,72%,50%)', borderRight: '3px solid hsl(174,72%,50%)' },
            ].map((st, i) => (
              <div key={i} style={{ position: 'absolute', width: 24, height: 24, borderRadius: 2, ...st }} />
            ))}
            <div style={{ textAlign: 'center' }}>
              <QrCode size={64} color="rgba(255,255,255,0.4)" />
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 8 }}>Cámara activa</p>
            </div>
            {/* TODO: integrar html5-qrcode o ZXing-js */}
          </div>

          {/* Resultado mock */}
          <div style={{ width: '100%', background: 'var(--success-bg)', border: '1px solid hsl(142,60%,82%)', borderRadius: 10, padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
            <CheckCircle2 size={32} style={{ color: 'var(--success)', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, color: 'var(--success)', margin: '0 0 2px' }}>Escaneo registrado</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--primary)', color: 'var(--primary-fg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>
                  MG
                </div>
                <div>
                  <p style={{ fontWeight: 600, margin: 0, fontSize: 13 }}>María García López</p>
                  <p style={{ fontSize: 11, color: 'var(--muted-fg)', margin: 0 }}>4to Grado · Sección A</p>
                </div>
              </div>
              <p style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 6 }}>13:42:07 · En línea</p>
            </div>
          </div>

          {/* Stats del día */}
          <div style={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { label: 'Atendidos', value: 287, color: 'var(--success)' },
              { label: 'Pendientes', value: 25, color: 'var(--warning)' },
              { label: 'Cobertura', value: '92%', color: 'var(--primary)' },
            ].map((s) => (
              <div key={s.label} style={{ background: 'var(--muted)', borderRadius: 8, padding: '12px 8px', textAlign: 'center' }}>
                <p style={{ fontSize: 22, fontWeight: 700, margin: 0, color: s.color }}>{s.value}</p>
                <p style={{ fontSize: 11, color: 'var(--muted-fg)', margin: 0 }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Connectivity badge */}
          <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--success-bg)', borderRadius: 8, border: '1px solid hsl(142,60%,82%)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', display: 'block' }} />
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--success)' }}>Conectado — Supabase en línea</span>
            </div>
            {/* TODO: navigator.onLine + Dexie queue offline */}
          </div>

          <p style={{ fontSize: 12, color: 'var(--muted-fg)', textAlign: 'center', margin: 0 }}>
            Registrando como: <strong>{perfil?.nombre_completo ?? 'Usuario'}</strong>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
