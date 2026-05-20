'use client'
import { useWorkLogs, useEmployees, usePayments, useFinancialSummary } from '@/hooks/useData'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'

const fmtR$ = (v: number) => 'R$ ' + (v||0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
const hoje  = new Date().toISOString().split('T')[0]

export default function DashboardPage() {
  const { employees } = useEmployees()
  const { logs }      = useWorkLogs()
  const { payments }  = usePayments()
  const summary       = useFinancialSummary(employees, logs, payments)

  const ativos  = employees.filter(e => e.status === 'ativo').length
  const rHoje   = logs.filter(r => r.data === hoje).length
  const bruto   = logs.reduce((s, r) => s + (Number(r.diaria) || 0), 0)
  const pago    = payments.reduce((s, p) => s + (Number(p.valor) || 0), 0)
  const vales   = logs.reduce((s, r) => s + (Number(r.valor_vale) || 0), 0)
  const aberto  = Math.max(0, bruto - vales - pago)
  const faltas  = logs.filter(r => r.jornada === 'NAO_TRABALHOU').length
  const horas   = logs.filter(r => r.jornada !== 'NAO_TRABALHOU').reduce((s, r) => s + (Number(r.horas) || 0), 0)
  const pctPago = bruto > 0 ? Math.round(((vales + pago) / bruto) * 100) : 0

  const nome = ''
  const saudacao = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Bom dia'
    if (h < 18) return 'Boa tarde'
    return 'Boa noite'
  }

  const dias7 = Array.from({ length: 7 }, (_, i) => {
    const d   = subDays(new Date(), 6 - i)
    const iso = d.toISOString().split('T')[0]
    return {
      name: format(d, 'EEE', { locale: ptBR }),
      Diárias: logs.filter(r => r.data === iso).reduce((s, r) => s + (Number(r.diaria) || 0), 0)
    }
  })

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh' }} className="pb-6">

      {/* Hero header */}
      <div style={{ padding: '20px 20px 16px', background: 'var(--bg-primary)' }}>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>{saudacao()},</p>
        <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 10 }}>Dashboard</p>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--bg-card)', border: '1px solid #2a2a3e', borderRadius: 20, padding: '4px 12px', fontSize: 11, color: '#8b8fa8' }}>
          {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
        </span>
      </div>

      {/* Card roxo destaque */}
      <div style={{ margin: '0 16px 16px', background: '#5b4fff', borderRadius: 20, padding: 20, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -24, right: -24, width: 90, height: 90, background: '#7c6fff', borderRadius: '50%' }}/>
        <div style={{ position: 'absolute', bottom: -32, right: 24, width: 70, height: 70, background: '#4a3ee0', borderRadius: '50%' }}/>
        <p style={{ fontSize: 11, color: '#c4b8ff', fontWeight: 500, marginBottom: 4, position: 'relative', zIndex: 1 }}>Total bruto acumulado</p>
        <p style={{ fontSize: 30, fontWeight: 800, color: 'var(--text-primary)', position: 'relative', zIndex: 1 }}>{fmtR$(bruto)}</p>
        <p style={{ fontSize: 11, color: '#c4b8ff', marginTop: 2, marginBottom: 14, position: 'relative', zIndex: 1 }}>{ativos} funcionários ativos</p>
        <div style={{ display: 'flex', gap: 8, position: 'relative', zIndex: 1 }}>
          {[
            { label: 'Pago', val: fmtR$(pago + vales) },
            { label: 'Em aberto', val: fmtR$(aberto) },
            { label: '% pago', val: pctPago + '%' },
          ].map(({ label, val }) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '8px 10px', flex: 1 }}>
              <p style={{ fontSize: 9, color: '#c4b8ff', marginBottom: 2 }}>{label}</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{val}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stats grid 2x2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '0 16px 16px' }}>
        {[
          { label: 'Funcionarios', val: ativos,        bg: 'var(--stat-blue-bg)',  ibg: 'var(--stat-blue-ibg)',  ic: '#3b82f6', icon: '👷' },
          { label: 'Horas trabalhadas', val: horas.toFixed(1)+'h', bg: 'var(--stat-green-bg)', ibg: 'var(--stat-green-ibg)', ic: '#10b981', icon: '⏱' },
          { label: 'Registros hoje', val: rHoje,        bg: 'var(--stat-amber-bg)', ibg: 'var(--stat-amber-ibg)', ic: '#f59e0b', icon: '📋' },
          { label: 'Faltas',        val: faltas,        bg: 'var(--stat-red-bg)',   ibg: 'var(--stat-red-ibg)',   ic: '#ef4444', icon: '🚫' },
        ].map(({ label, val, bg, ibg, ic, icon }) => (
          <div key={label} style={{ background: bg, borderRadius: 16, padding: 14 }}>
            <div style={{ width: 32, height: 32, background: ibg, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, marginBottom: 8 }}>{icon}</div>
            <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>{val}</p>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500, marginTop: 2 }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Gráfico 7 dias */}
      <div style={{ margin: '0 16px 16px', background: 'var(--bg-card)', borderRadius: 16, padding: 16 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Diárias — últimos 7 dias</p>
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={dias7} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gV" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#5b4fff" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#5b4fff" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e"/>
            <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false}/>
            <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false}/>
            <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid #2a2a3e', borderRadius: 8, fontSize: 11 }}/>
            <Area type="monotone" dataKey="Diárias" stroke="#5b4fff" fill="url(#gV)" strokeWidth={2}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Acesso rápido */}
      <div style={{ padding: '0 16px' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>Acesso rápido</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { href: '/dashboard/horarios',  icon: '🕐', label: 'Registrar horário',   sub: 'Lançar jornada de hoje',        badge: 'Hoje',  bc: '#1e3a6e', bt: '#60a5fa' },
            { href: '/dashboard/audio',     icon: '🎙️', label: 'Registro por áudio', sub: 'Usar inteligência artificial',   badge: 'IA',    bc: '#0a2e1a', bt: '#34d399' },
            { href: '/dashboard/relatorios',icon: '📊', label: 'Relatórios',          sub: 'Ver resumo por funcionário',     badge: '5 abas',bc: 'var(--stat-amber-ibg)', bt: '#fbbf24' },
            { href: '/dashboard/pagamentos',icon: '💰', label: 'Pagamentos',          sub: fmtR$(aberto) + ' em aberto',    badge: aberto > 0 ? '!' : 'OK', bc: aberto > 0 ? 'var(--stat-red-ibg)' : '#0a2e1a', bt: aberto > 0 ? '#f87171' : '#34d399' },
          ].map(({ href, icon, label, sub, badge, bc, bt }) => (
            <Link key={href} href={href} style={{ background: 'var(--bg-card)', borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{icon}</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{label}</p>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '2px 0 0' }}>{sub}</p>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: bc, color: bt, flexShrink: 0 }}>{badge}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Pendentes */}
      {summary.filter(s => (s.saldo||0) > 0).length > 0 && (
        <div style={{ margin: '16px 16px 0', background: 'var(--bg-card)', borderRadius: 16, padding: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Saldos pendentes</p>
          {summary.filter(s => (s.saldo||0) > 0).slice(0, 4).map(s => (
            <div key={s.employee.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#5b4fff22', border: '1px solid #5b4fff44', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#7c6fff' }}>
                  {(s.employee.apelido || s.employee.nome).slice(0,2).toUpperCase()}
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{s.employee.apelido || s.employee.nome.split(' ')[0]}</p>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>Bruto: {fmtR$(s.bruto||0)}</p>
                </div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#f87171', background: 'var(--stat-red-ibg)', padding: '4px 10px', borderRadius: 20 }}>{fmtR$(s.saldo||0)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
