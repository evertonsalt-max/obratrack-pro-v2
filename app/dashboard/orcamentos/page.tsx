'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Plus, FileText, CheckCircle, Clock, XCircle, Eye, Copy, Trash2 } from 'lucide-react'
import { format } from 'date-fns'


const fmtR$ = (v) => 'R$ ' + (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })

const statusConfig = {
  pendente:  { label: 'Pendente',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
  aprovado:  { label: 'Aprovado',  color: '#22c55e', bg: 'rgba(34,197,94,0.12)'   },
  reprovado: { label: 'Reprovado', color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  cancelado: { label: 'Cancelado', color: '#71717a', bg: 'rgba(113,113,122,0.12)' },
}

export default function OrcamentosPage() {
  const router = useRouter()
  const [orcamentos, setOrcamentos] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('orcamentos').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setOrcamentos(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const duplicar = async (orc) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const count = orcamentos.length + 1
    const { data } = await supabase.from('orcamentos').insert({
      ...orc, id: undefined, user_id: user.id,
      numero: 'ORC-' + String(count).padStart(3, '0'),
      status: 'pendente', created_at: undefined, updated_at: undefined,
    }).select().single()
    if (data) { load(); router.push('/dashboard/orcamentos/' + data.id) }
  }

  const excluir = async (id) => {
    if (!confirm('Excluir este orcamento?')) return
    await supabase.from('orcamentos').delete().eq('id', id)
    load()
  }

  const totais = {
    total: orcamentos.reduce((s, o) => s + (o.total_geral || 0), 0),
    aprovados: orcamentos.filter(o => o.status === 'aprovado').length,
    pendentes: orcamentos.filter(o => o.status === 'pendente').length,
    mes: orcamentos.filter(o => o.created_at?.startsWith(new Date().toISOString().slice(0, 7))).length,
  }

  return (
    <div style={{ padding: 24, background: 'var(--bg-primary)', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-.4px' }}>Orcamentos</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Gerencie suas propostas comerciais</p>
        </div>
        <Link href="/dashboard/orcamentos/novo" style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--text-primary)', color: 'var(--bg-primary)', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
          <Plus size={15}/> Novo orcamento
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Orcamentos do mes', value: totais.mes, color: '#60a5fa' },
          { label: 'Valor total', value: fmtR$(totais.total), color: 'var(--text-primary)' },
          { label: 'Aprovados', value: totais.aprovados, color: '#22c55e' },
          { label: 'Pendentes', value: totais.pendentes, color: '#f59e0b' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: 500 }}>{label}</p>
            <p style={{ fontSize: 20, fontWeight: 700, color, letterSpacing: '-.5px' }}>{value}</p>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Carregando...</div>
        ) : orcamentos.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 8 }}>Nenhum orcamento ainda</p>
            <Link href="/dashboard/orcamentos/novo" style={{ color: '#60a5fa', fontSize: 13, textDecoration: 'none' }}>Criar primeiro orcamento</Link>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-primary)' }}>
                {['N', 'Cliente / Obra', 'Data', 'Status', 'Total', ''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orcamentos.map((o) => {
                const st = statusConfig[o.status] || statusConfig.pendente
                return (
                  <tr key={o.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 14px', color: 'var(--text-muted)', fontWeight: 500 }}>{o.numero}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <p style={{ color: 'var(--text-primary)', fontWeight: 600, margin: 0 }}>{o.cliente_nome || '-'}</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: 0 }}>{o.cliente_obra || ''}</p>
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>{o.data_orcamento || '-'}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: st.bg, color: st.color }}>{st.label}</span>
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-primary)', fontWeight: 600 }}>{fmtR$(o.total_geral)}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <Link href={'/dashboard/orcamentos/' + o.id} style={{ padding: '4px 8px', borderRadius: 6, background: 'var(--bg-hover)', color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center' }}><Eye size={13}/></Link>
                        <button onClick={() => duplicar(o)} style={{ padding: '4px 8px', borderRadius: 6, background: 'var(--bg-hover)', color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}><Copy size={13}/></button>
                        <button onClick={() => excluir(o.id)} style={{ padding: '4px 8px', borderRadius: 6, background: 'rgba(239,68,68,0.1)', color: '#f87171', border: 'none', cursor: 'pointer' }}><Trash2 size={13}/></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
