'use client'
import { usePayments, useEmployees, useWorkLogs, useFinancialSummary, useEmployeeTaxes } from '@/hooks/useData'
import { useState } from 'react'
import { DollarSign, Plus, X } from 'lucide-react'
import { format } from 'date-fns'

const hoje = new Date().toISOString().split('T')[0]
const fmtR$ = (v: any) => { const n = Number(v); return 'R$ ' + (isNaN(n) ? 0 : n).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }

export default function PagamentosPage() {
  const { payments, loading, add, remove } = usePayments()
  const { employees } = useEmployees()
  const { logs } = useWorkLogs()
  const { taxes } = useEmployeeTaxes(); const summary = useFinancialSummary(employees, logs, payments, taxes)
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ employee_id: '', data: hoje, valor: '', tipo: 'Semanal', obs: '' })
  const up = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }))

  const salvar = async () => {
    if (!form.employee_id || !form.valor) return alert('Preencha os campos obrigatórios')
    setSaving(true)
    try {
      const emp = employees.find(e => e.id === form.employee_id)!
      await add({ employee_id: form.employee_id, employee_name: emp.apelido || emp.nome.split(' ')[0], data: form.data, valor: Number(form.valor), tipo: form.tipo as any, obs: form.obs })
      setModal(false)
      setForm({ employee_id: '', data: hoje, valor: '', tipo: 'Semanal', obs: '' })
    } catch { alert('Erro ao salvar') }
    setSaving(false)
  }

  const totalBruto = summary.reduce((s, f) => s + f.bruto, 0)
  const totalPago = summary.reduce((s, f) => s + f.pago + f.vales, 0)
  const totalAberto = summary.reduce((s, f) => s + Math.max(0, f.saldo), 0)

  if (loading) return <div className="p-6 flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-gray-700 border-t-blue-500 rounded-full animate-spin"/></div>

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {[{ l: 'Total Bruto', v: fmtR$(totalBruto), c: 'text-white' }, { l: 'Total Pago', v: fmtR$(totalPago), c: 'text-green-400' }, { l: 'Em Aberto', v: fmtR$(totalAberto), c: 'text-red-400' }].map(({ l, v, c }) => (
          <div key={l} className="card"><p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{l}</p><p className={`text-2xl font-extrabold ${c}`}>{v}</p></div>
        ))}
      </div>

      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white font-bold">Saldo por Funcionário</h3>
          <button onClick={() => setModal(true)} className="btn-primary"><Plus size={14}/> Registrar Pagamento</button>
        </div>
        {summary.length === 0 ? <p className="text-gray-400 text-center py-8">Nenhum funcionário ativo</p> : (
          <div className="overflow-x-auto"><table className="w-full">
            <thead><tr className="border-b border-gray-800">{['Funcionário','Dias','Bruto','Vales','Pago','Saldo',''].map(h => <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase">{h}</th>)}</tr></thead>
            <tbody>{summary.map((s, i) => (
              <tr key={s.employee.id} className={`border-b border-gray-800 hover:bg-gray-800/50 ${i % 2 === 1 ? 'bg-gray-800/20' : ''}`}>
                <td className="py-3 px-4"><div className="flex items-center gap-2"><div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${s.saldo > 0 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>{s.employee.nome.slice(0,2).toUpperCase()}</div><div><p className="text-white text-sm font-medium">{s.employee.nome}</p><p className="text-gray-500 text-xs">{s.employee.funcao}</p></div></div></td>
                <td className="py-3 px-4 text-gray-300 text-sm">{s.dias}</td>
                <td className="py-3 px-4 text-white text-sm">{fmtR$(s.bruto)}</td>
                <td className="py-3 px-4 text-yellow-400 text-sm">{fmtR$(s.vales)}</td>
                <td className="py-3 px-4 text-green-400 text-sm">{fmtR$(s.pago)}</td>
                <td className="py-3 px-4"><span className={`text-base font-bold ${s.saldo > 0 ? 'text-red-400' : 'text-green-400'}`}>{fmtR$(s.saldo)}</span></td>
                <td className="py-3 px-4"><button onClick={() => { setForm(p => ({ ...p, employee_id: s.employee.id, valor: String(Math.max(0, s.saldo)) })); setModal(true) }} className="btn-primary text-xs py-1 px-3">Registrar</button></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>

      <div className="card">
        <h3 className="text-white font-bold mb-4">Histórico de Pagamentos</h3>
        {payments.length === 0 ? <p className="text-gray-400 text-center py-8">Nenhum pagamento registrado</p> : (
          <div className="overflow-x-auto"><table className="w-full">
            <thead><tr className="border-b border-gray-800">{['Funcionário','Data','Valor','Tipo','Obs',''].map(h => <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase">{h}</th>)}</tr></thead>
            <tbody>{payments.map((p, i) => (
              <tr key={p.id} className={`border-b border-gray-800 hover:bg-gray-800/50 ${i % 2 === 1 ? 'bg-gray-800/20' : ''}`}>
                <td className="py-3 px-4 text-white font-medium text-sm">{p.employee_name}</td>
                <td className="py-3 px-4 text-gray-400 text-sm">{p.data ? format(new Date(p.data + 'T12:00:00'), 'dd/MM/yy') : '—'}</td>
                <td className="py-3 px-4 text-green-400 font-bold text-sm">{fmtR$(p.valor || 0)}</td>
                <td className="py-3 px-4"><span className="badge-blue">{p.tipo}</span></td>
                <td className="py-3 px-4 text-gray-500 text-sm">{p.obs || '—'}</td>
                <td className="py-3 px-4"><button onClick={() => { if (confirm('Excluir?')) remove(p.id) }} className="text-red-400 text-xs border border-red-400/30 px-2 py-1 rounded">Excluir</button></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>

      {modal && (
        <div onClick={e => { if (e.target === e.currentTarget) setModal(false) }} className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center p-5 border-b border-gray-800"><h2 className="text-white font-bold text-lg">Registrar Pagamento</h2><button onClick={() => setModal(false)} className="text-gray-400 hover:text-white"><X size={20}/></button></div>
            <div className="p-5 space-y-4">
              <div><label className="label">Funcionário *</label><select value={form.employee_id} onChange={up('employee_id')} className="input-field"><option value="">— Selecione —</option>{summary.map(s => <option key={s.employee.id} value={s.employee.id}>{s.employee.apelido || s.employee.nome} → saldo: {fmtR$(s.saldo)}</option>)}</select></div>
              <div><label className="label">Data *</label><input type="date" value={form.data} onChange={up('data')} className="input-field"/></div>
              <div><label className="label">Valor (R$) *</label><input type="number" value={form.valor} onChange={up('valor')} placeholder="0,00" className="input-field"/></div>
              <div><label className="label">Tipo</label><select value={form.tipo} onChange={up('tipo')} className="input-field">{['Semanal','Quinzenal','Mensal','Adiantamento','Acerto Final'].map(t => <option key={t}>{t}</option>)}</select></div>
              <div><label className="label">Observações</label><input value={form.obs} onChange={up('obs')} placeholder="Opcional..." className="input-field"/></div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-gray-800"><button onClick={() => setModal(false)} className="btn-ghost">Cancelar</button><button onClick={salvar} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-lg text-sm">{saving ? 'Salvando...' : '✓ Confirmar'}</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
