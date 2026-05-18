'use client'
// app/dashboard/page.tsx

import { useWorkLogs }        from '@/hooks/useData'
import { useEmployees }       from '@/hooks/useData'
import { usePayments }        from '@/hooks/useData'
import { useFinancialSummary }from '@/hooks/useData'
import { Users, Clock, DollarSign, AlertTriangle, TrendingUp } from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format, subDays }    from 'date-fns'
import { ptBR }               from 'date-fns/locale'

const fmtR$ = (v: number) => 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
const hoje  = new Date().toISOString().split('T')[0]

export default function DashboardPage() {
  const { employees }    = useEmployees()
  const { logs }         = useWorkLogs()
  const { payments }     = usePayments()
  const summary          = useFinancialSummary(employees, logs, payments)

  const ativos  = employees.filter(e => e.status === 'ativo').length
  const rHoje   = logs.filter(r => r.data === hoje).length
  const bruto   = logs.reduce((s, r) => s + (r.diaria || 0), 0)
  const pago    = payments.reduce((s, p) => s + (p.valor || 0), 0)
  const vales   = logs.reduce((s, r) => s + (r.valor_vale || 0), 0)
  const aberto  = Math.max(0, bruto - vales - pago)

  // Gráfico 7 dias
  const dias7 = Array.from({ length: 7 }, (_, i) => {
    const d   = subDays(new Date(), 6 - i)
    const iso = d.toISOString().split('T')[0]
    return {
      name: format(d, 'EEE', { locale: ptBR }),
      Diárias: logs.filter(r => r.data === iso).reduce((s, r) => s + (r.diaria || 0), 0)
    }
  })

  // Gráfico por funcionário
  const barData = summary.slice(0, 6).map(s => ({
    name:  (s.employee.apelido || s.employee.nome.split(' ')[0]),
    Bruto: s.bruto,
    Vales: s.vales,
  }))

  const kpis = [
    { label: 'Funcionários Ativos', value: ativos,        icon: Users,          color: 'text-blue-400',   bg: 'bg-blue-500/15'  },
    { label: 'Registros Hoje',      value: rHoje,          icon: Clock,          color: 'text-purple-400', bg: 'bg-purple-500/15'},
    { label: 'Total Bruto',         value: fmtR$(bruto),  icon: DollarSign,     color: 'text-green-400',  bg: 'bg-green-500/15' },
    { label: 'Em Aberto',           value: fmtR$(aberto), icon: AlertTriangle,   color: 'text-yellow-400', bg: 'bg-yellow-500/15'},
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white mb-1">Dashboard</h1>
        <p className="text-gray-400 text-sm">{format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {kpis.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{label}</p>
              <p className="text-2xl font-extrabold text-white">{value}</p>
            </div>
            <div className={`${bg} rounded-xl p-2.5`}>
              <Icon size={20} className={color}/>
            </div>
          </div>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={14} className="text-blue-400"/>
            <h3 className="text-sm font-semibold text-white">Diárias — Últimos 7 dias</h3>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={dias7} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gBlue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937"/>
              <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`}/>
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '8px', fontSize: '12px' }}/>
              <Area type="monotone" dataKey="Diárias" stroke="#3b82f6" fill="url(#gBlue)" strokeWidth={2}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="text-sm font-semibold text-white mb-4">Resumo Financeiro</h3>
          {[
            { l: 'Total Diárias', v: bruto,  c: 'text-white'        },
            { l: 'Vales Pagos',   v: vales,  c: 'text-yellow-400'   },
            { l: 'Pagamentos',    v: pago,   c: 'text-green-400'    },
            { l: 'Em Aberto',     v: aberto, c: 'text-red-400'      },
          ].map(({ l, v, c }) => (
            <div key={l} className="flex justify-between items-center py-2.5 border-b border-gray-800 last:border-0">
              <span className="text-gray-400 text-xs">{l}</span>
              <span className={`${c} text-sm font-semibold`}>{fmtR$(v)}</span>
            </div>
          ))}
          <div className="mt-3 pt-3 border-t border-gray-800 flex justify-between">
            <span className="text-green-400 text-xs font-semibold">% PAGO</span>
            <span className="text-green-400 text-sm font-bold">
              {bruto > 0 ? Math.round(((vales + pago) / bruto) * 100) : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Gráfico barras */}
      {barData.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-white mb-4">Bruto × Vales por Funcionário</h3>
          <div className="flex gap-4 mb-3">
            {[{ cor: '#3b82f6', lb: 'Bruto' }, { cor: '#f59e0b', lb: 'Vales' }].map(l => (
              <div key={l.lb} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: l.cor }}/>
                <span className="text-xs text-gray-400">{l.lb}</span>
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={barData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937"/>
              <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`}/>
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '8px', fontSize: '12px' }}/>
              <Bar dataKey="Bruto" fill="#3b82f6" radius={[4, 4, 0, 0]}/>
              <Bar dataKey="Vales" fill="#f59e0b" radius={[4, 4, 0, 0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Pendentes */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <h3 className="text-sm font-semibold text-white mb-4">Pagamentos Pendentes</h3>
          {summary.filter(s => s.saldo > 0).slice(0, 5).length === 0
            ? <p className="text-gray-500 text-sm py-4 text-center">Nenhum saldo pendente ✓</p>
            : summary.filter(s => s.saldo > 0).slice(0, 5).map(s => (
              <div key={s.employee.id} className="flex items-center justify-between py-2.5 border-b border-gray-800 last:border-0">
                <div>
                  <p className="text-sm font-medium text-white">{s.employee.apelido || s.employee.nome.split(' ')[0]}</p>
                  <p className="text-xs text-gray-500">Bruto: {fmtR$(s.bruto)}</p>
                </div>
                <span className="badge-yellow">{fmtR$(s.saldo)}</span>
              </div>
            ))
          }
        </div>

        <div className="card">
          <h3 className="text-sm font-semibold text-white mb-4">Últimos Registros</h3>
          {logs.slice(0, 5).map(r => (
            <div key={r.id} className="flex items-center justify-between py-2.5 border-b border-gray-800 last:border-0">
              <div>
                <p className="text-sm font-medium text-white">{r.employee_name}</p>
                <p className="text-xs text-gray-500">{r.local} · {r.data ? format(new Date(r.data + 'T12:00:00'), 'dd/MM/yy') : ''}</p>
              </div>
              <div className="text-right">
                <p className="text-green-400 text-sm font-semibold">{fmtR$(r.diaria)}</p>
                {r.vale && <p className="text-yellow-400 text-xs">Vale: {fmtR$(r.valor_vale)}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
