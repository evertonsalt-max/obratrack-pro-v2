'use client'
import { usePayments } from '@/hooks/useData'
import { DollarSign } from 'lucide-react'
import { format } from 'date-fns'

export default function PagamentosPage() {
  const { payments, loading } = usePayments()

  if (loading) return (
    <div className="p-6 flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-gray-700 border-t-blue-500 rounded-full animate-spin"/>
    </div>
  )

  const total = payments.reduce((s, p) => s + (p.valor || 0), 0)

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white mb-1">Pagamentos</h1>
          <p className="text-gray-400 text-sm">{payments.length} registros · Total: R$ {total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
        </div>
      </div>

      <div className="card">
        {payments.length === 0 ? (
          <div className="text-center py-16">
            <DollarSign size={40} className="text-gray-600 mx-auto mb-4"/>
            <p className="text-gray-400 font-medium">Nenhum pagamento registrado</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                {['Funcionário','Data','Valor','Tipo','Obs'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.map((p, i) => (
                <tr key={p.id} className={`border-b border-gray-800 hover:bg-gray-800/50 ${i % 2 === 1 ? 'bg-gray-800/20' : ''}`}>
                  <td className="py-3 px-4 text-white font-medium text-sm">{p.employee_name}</td>
                  <td className="py-3 px-4 text-gray-400 text-sm">{p.data ? format(new Date(p.data + 'T12:00:00'), 'dd/MM/yy') : '—'}</td>
                  <td className="py-3 px-4 text-green-400 font-bold text-sm">R$ {(p.valor || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                  <td className="py-3 px-4"><span className="badge-blue">{p.tipo}</span></td>
                  <td className="py-3 px-4 text-gray-500 text-sm">{p.obs || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
