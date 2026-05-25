import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { AlertTriangle, PackagePlus, QrCode, Users } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { DASHBOARD_MOCK } from '../mock/dashboard.mock'
import { MOVIMIENTOS_MOCK } from '../mock/movimientos.mock'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Progress } from '../components/ui/progress'
import { Badge } from '../components/ui/badge'
import PageHeader from '../components/shared/PageHeader'

function StatCard({ title, value, subtitle, icon: Icon, iconColor, children }) {
  return (
    <Card>
      <CardContent style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12, color: 'var(--muted-fg)', fontWeight: 500, marginBottom: 4 }}>{title}</p>
            <p style={{ fontSize: 26, fontWeight: 700, marginBottom: 4, lineHeight: 1 }}>{value}</p>
            <p style={{ fontSize: 12, color: 'var(--muted-fg)' }}>{subtitle}</p>
          </div>
          <div style={{ width: 40, height: 40, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${iconColor}18`, flexShrink: 0 }}>
            <Icon size={18} style={{ color: iconColor }} />
          </div>
        </div>
        {children && <div style={{ marginTop: 12 }}>{children}</div>}
      </CardContent>
    </Card>
  )
}

const TIPO_LABELS = {
  LOGIN: 'Acceso',
  INGRESO_CREADO: 'Ingreso',
  DISTRIBUCION_QR: 'Distribución QR',
  STOCK_AJUSTADO: 'Ajuste Stock',
  REPORTE_GENERADO: 'Reporte',
  PROVEEDOR_ACTUALIZADO: 'Proveedor',
  ALUMNO_REGISTRADO: 'Alumno',
}

export default function DashboardPage() {
  const d = DASHBOARD_MOCK
  const hoy = format(new Date(), "EEEE d 'de' MMMM yyyy", { locale: es })
  const ultimosMovimientos = MOVIMIENTOS_MOCK.slice(0, 5)

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={`Resumen del sistema — ${hoy}`}
      />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard
          title="Alumnos atendidos hoy"
          value={`${d.alumnosConDistribucionHoy}/${d.totalAlumnos}`}
          subtitle={<span style={{ color: 'var(--success)' }}>↑ {d.porcentajeCobertura}% de cobertura</span>}
          icon={Users}
          iconColor="hsl(174,72%,24%)"
        >
          <Progress value={d.porcentajeCobertura} className="h-1.5" />
        </StatCard>

        <StatCard
          title="Productos con stock bajo"
          value={d.productosConStockBajo}
          subtitle="Requieren reposición urgente"
          icon={AlertTriangle}
          iconColor="hsl(35,85%,44%)"
        >
          <Badge style={{ background: 'var(--warning-bg)', color: 'var(--warning)', border: 'none', animation: 'pulse 2s infinite', fontSize: 11 }}>
            ⚠ Alerta
          </Badge>
        </StatCard>

        <StatCard
          title="Ingresos este mes"
          value={d.ingresosEsteMes}
          subtitle="Último: hace 2 días"
          icon={PackagePlus}
          iconColor="hsl(210,55%,42%)"
        />

        <StatCard
          title="Distribuciones hoy"
          value={d.distribucionesHoy}
          subtitle="Actualizado: 13:45"
          icon={QrCode}
          iconColor="hsl(142,60%,30%)"
        />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>
        <Card>
          <CardHeader style={{ paddingBottom: 8 }}>
            <CardTitle style={{ fontSize: 14 }}>Distribuciones esta semana</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={d.distribucionesEstaSemanaPorDia} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
                <XAxis dataKey="dia" tick={{ fontSize: 12, fill: 'var(--muted-fg)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--muted-fg)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid var(--border)' }} />
                <Bar dataKey="cantidad" radius={[4, 4, 0, 0]}>
                  {d.distribucionesEstaSemanaPorDia.map((entry, i) => (
                    <Cell key={i} fill={entry.cantidad > 0 ? 'hsl(174,72%,24%)' : 'hsl(220,13%,88%)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader style={{ paddingBottom: 8 }}>
            <CardTitle style={{ fontSize: 14 }}>Alertas de Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {d.alertasStock.map((item, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 500 }}>{item.producto}</span>
                    <span style={{ fontSize: 11, color: 'var(--danger)' }}>{item.stock} {item.unidad} / {item.minimo} mín</span>
                  </div>
                  <Progress
                    value={Math.round((item.stock / item.minimo) * 100)}
                    className="h-1.5"
                    indicatorClassName="bg-red-500"
                  />
                </div>
              ))}
            </div>
            <button
              style={{ marginTop: 16, fontSize: 12, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              onClick={() => window.location.href = '/stock'}
            >
              Ver inventario completo →
            </button>
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader style={{ paddingBottom: 8 }}>
          <CardTitle style={{ fontSize: 14 }}>Actividad reciente</CardTitle>
        </CardHeader>
        <CardContent style={{ padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--muted)', height: 36 }}>
                {['Acción', 'Usuario', 'Descripción', 'Fecha / Hora'].map(h => (
                  <th key={h} style={{ padding: '0 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted-fg)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ultimosMovimientos.map((m) => (
                <tr key={m.id} style={{ borderBottom: '1px solid var(--border)', height: 48 }}>
                  <td style={{ padding: '0 16px' }}>
                    <span style={{ fontSize: 12, fontWeight: 500 }}>{TIPO_LABELS[m.tipo_accion] ?? m.tipo_accion}</span>
                  </td>
                  <td style={{ padding: '0 16px', fontSize: 12, color: 'var(--muted-fg)' }}>{m.usuario}</td>
                  <td style={{ padding: '0 16px', fontSize: 12, maxWidth: 320 }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{m.descripcion}</span>
                  </td>
                  <td style={{ padding: '0 16px', fontSize: 12, color: 'var(--muted-fg)', whiteSpace: 'nowrap' }}>
                    {format(new Date(m.fecha), 'dd/MM/yyyy HH:mm', { locale: es })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
            <a href="/movimientos" style={{ fontSize: 12, color: 'var(--primary)', textDecoration: 'none' }}>Ver todo el historial →</a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
