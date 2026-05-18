'use client'
import { useEmployees } from '@/hooks/useData'
import { useState } from 'react'
import { Users, Plus } from 'lucide-react'

export default function FuncionariosPage() {
  const { employees, loading, add, update, remove } = useEmployees()

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
        <button className="btn-primary">
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
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Nome</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Função</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Diária</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e, i) => (
                <tr key={e.id} className={`border-b border-gray-800 hover:bg-gray-800/50 transition-colors ${i % 2 === 1 ? 'bg-gray-800/20' : ''}`}>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xs font-bold">
                        {e.nome.slice(0,2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">{e.nome}</p>
                        {e.telefone && <p className="text-gray-500 text-xs">{e.telefone}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-300 text-sm">{e.funcao || '—'}</td>
                  <td className="py-3 px-4 text-green-400 font-semibold text-sm">
                    R$ {(e.diaria || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                  </td>
                  <td className="py-3 px-4">
                    <span className={e.status === 'ativo' ? 'badge-green' : 'badge-gray'}>
                      {e.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
