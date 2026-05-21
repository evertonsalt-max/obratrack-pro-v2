'use client'
import { useEmployees } from '@/hooks/useData'
import { useState } from 'react'
import { Users, Plus, X, Pencil } from 'lucide-react'

const hoje = new Date().toISOString().split('T')[0]
const fmtR$ = (v: number) => 'R$ ' + (v||0).toLocaleString('pt-BR',{minimumFractionDigits:2})

const formVazio = { nome:'', apelido:'', telefone:'', funcao:'', diaria:'', status:'ativo', admissao: hoje }

export default function FuncionariosPage() {
  const { employees, loading, add, update, remove } = useEmployees()
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string|null>(null)
  const [form, setForm] = useState(formVazio)

  const up = (k: string) => (e: any) => setForm(p => ({...p, [k]: e.target.value}))

  const abrirNovo = () => {
    setEditId(null)
    setForm(formVazio)
    setModal(true)
  }

  const abrirEdicao = (emp: any) => {
    setEditId(emp.id)
    setForm({
      nome: emp.nome || '',
      apelido: emp.apelido || '',
      telefone: emp.telefone || '',
      funcao: emp.funcao || '',
      diaria: String(emp.diaria || ''),
      status: emp.status || 'ativo',
      admissao: emp.admissao || hoje,
    })
    setModal(true)
  }

  const fecharModal = () => {
    setModal(false)
    setEditId(null)
    setForm(formVazio)
  }

  const salvar = async () => {
    if (!form.nome || !form.funcao) return alert('Nome e função são obrigatórios')
    setSaving(true)
    try {
      const payload = {
        nome: form.nome, apelido: form.apelido, telefone: form.telefone,
        funcao: form.funcao, diaria: Number(form.diaria) || 0,
        status: form.status as any, admissao: form.admissao, obs: '',
      }
      if (editId) {
        await update(editId, payload)
      } else {
        await add(payload)
      }
      fecharModal()
    } catch(e) { alert('Erro ao salvar') }
    setSaving(false)
  }

  if (loading) return (
    <div className="p-6 flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-gray-700 border-t-blue-500 rounded-full animate-spin"/>
    </div>
  )

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white mb-1">Funcionários</h1>
          <p className="text-gray-400 text-sm">{employees.length} cadastrados</p>
        </div>
        <button onClick={abrirNovo} className="btn-primary">
          <Plus size={16}/> Novo Funcionário
        </button>
      </div>

      <div className="card">
        {employees.length === 0 ? (
          <div className="text-center py-16">
            <Users size={40} className="text-gray-600 mx-auto mb-4"/>
            <p className="text-gray-400 font-medium">Nenhum funcionário cadastrado</p>
            <p className="text-gray-500 text-sm mt-1">Clique em "Novo Funcionário" para começar</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                {['Nome','Função','Diária','Status','Ações'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((e, i) => (
                <tr key={e.id} className={`border-b border-gray-800 hover:bg-gray-800/50 transition-colors ${i%2===1?'bg-gray-800/20':''}`}>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xs font-bold">
                        {e.nome.slice(0,2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">{e.nome}</p>
                        {e.apelido && <p className="text-gray-500 text-xs">{e.apelido}</p>}
                        {e.telefone && <p className="text-gray-500 text-xs">{e.telefone}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-300 text-sm">{e.funcao || '—'}</td>
                  <td className="py-3 px-4 text-green-400 font-semibold text-sm">{fmtR$(e.diaria||0)}</td>
                  <td className="py-3 px-4">
                    <span className={e.status==='ativo'?'badge-green':'badge-gray'}>{e.status}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => abrirEdicao(e)}
                        className="text-blue-400 hover:text-blue-300 text-xs border border-blue-400/30 hover:border-blue-400 px-2 py-1 rounded transition-colors flex items-center gap-1">
                        <Pencil size={11}/> Editar
                      </button>
                      <button
                        onClick={() => { if(confirm(`Excluir ${e.nome}?`)) remove(e.id) }}
                        className="text-red-400 hover:text-red-300 text-xs border border-red-400/30 hover:border-red-400 px-2 py-1 rounded transition-colors">
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div onClick={e => { if(e.target===e.currentTarget) fecharModal() }}
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex justify-between items-center p-5 border-b border-gray-800">
              <h2 className="text-white font-bold text-lg">
                {editId ? 'Editar Funcionário' : 'Novo Funcionário'}
              </h2>
              <button onClick={fecharModal} className="text-gray-400 hover:text-white"><X size={20}/></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Nome Completo *</label>
                  <input value={form.nome} onChange={up('nome')} placeholder="João da Silva" className="input-field"/>
                </div>
                <div>
                  <label className="label">Apelido</label>
                  <input value={form.apelido} onChange={up('apelido')} placeholder="João" className="input-field"/>
                </div>
                <div>
                  <label className="label">Telefone</label>
                  <input value={form.telefone} onChange={up('telefone')} placeholder="(11) 99999-0000" className="input-field"/>
                </div>
                <div>
                  <label className="label">Função *</label>
                  <input value={form.funcao} onChange={up('funcao')} placeholder="Pedreiro" className="input-field"/>
                </div>
                <div>
                  <label className="label">Valor Diária (R$)</label>
                  <input type="number" value={form.diaria} onChange={up('diaria')} placeholder="180" className="input-field"/>
                </div>
                <div>
                  <label className="label">Status</label>
                  <select value={form.status} onChange={up('status')} className="input-field">
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Data Admissão</label>
                <input type="date" value={form.admissao} onChange={up('admissao')} className="input-field"/>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-gray-800">
              <button onClick={fecharModal} className="btn-ghost">Cancelar</button>
              <button onClick={salvar} disabled={saving} className="btn-primary">
                {saving ? 'Salvando...' : editId ? 'Salvar Alterações' : 'Salvar Funcionário'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
