'use client'
import { useWorksites, useWorkLogs } from '@/hooks/useData'
import { useState } from 'react'
import { MapPin, Plus, X } from 'lucide-react'

const fmtR$ = (v: number) => 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })

export default function ObrasPage() {
  const { worksites, add, refetch } = useWorksites()
  const { logs } = useWorkLogs()
  const [nova, setNova] = useState('')
  const [saving, setSaving] = useState(false)

  const addObra = async () => {
    if (!nova.trim()) return
    if (worksites.find(w => w.nome === nova.trim())) return alert('Obra já existe')
    setSaving(true)
    try { await add(nova.trim()); setNova('') } catch { alert('Erro ao salvar') }
    setSaving(false)
  }

  const lista = worksites.map(w => ({
    ...w,
    regs: logs.filter(r => r.local === w.nome).length,
    total: logs.filter(r => r.local === w.nome).reduce((s, r) => s + (r.diaria || 0), 0),
  })).sort((a, b) => b.regs - a.regs)

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-extrabold text-white mb-1">Obras</h1><p className="text-gray-400 text-sm">{worksites.length} cadastradas</p></div>
      </div>
      <div className="card mb-6">
        <div className="flex gap-3">
          <input value={nova} onChange={e => setNova(e.target.value)} onKeyDown={e => e.key === 'Enter' && addObra()} placeholder="Nome da nova obra ou local..." className="input-field flex-1"/>
          <button onClick={addObra} disabled={saving} className="btn-primary"><Plus size={16}/> {saving ? 'Salvando...' : 'Adicionar'}</button>
        </div>
      </div>
      <div className="card">
        {lista.length === 0 ? (
          <div className="text-center py-16"><MapPin size={40} className="text-gray-600 mx-auto mb-4"/><p className="text-gray-400">Nenhuma obra cadastrada</p><p className="text-gray-500 text-sm mt-1">As obras também são criadas automaticamente ao lançar um registro</p></div>
        ) : (
          <table className="w-full"><thead><tr className="border-b border-gray-800">{['Obra / Local','Registros','Total Diárias'].map(h => <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase">{h}</th>)}</tr></thead>
            <tbody>{lista.map((w, i) => (
              <tr key={w.id} className={`border-b border-gray-800 hover:bg-gray-800/50 ${i % 2 === 1 ? 'bg-gray-800/20' : ''}`}>
                <td className="py-3 px-4"><div className="flex items-center gap-2"><MapPin size={14} className="text-blue-400"/><span className="text-white font-medium text-sm">{w.nome}</span></div></td>
                <td className="py-3 px-4"><span className="badge-blue">{w.regs} reg.</span></td>
                <td className="py-3 px-4 text-green-400 font-semibold text-sm">{fmtR$(w.total)}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  )
}
