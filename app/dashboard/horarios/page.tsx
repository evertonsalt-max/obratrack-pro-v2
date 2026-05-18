'use client'
import { useWorkLogs } from '@/hooks/useData'
import { Clock } from 'lucide-react'
import { format } from 'date-fns'

export default function HorariosPage() {
  const { logs, loading } = useWorkLogs()

  if (loading) return (
    <div className="p-6 flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-gray-700 border-t-blue-500 rounded-full animate-spin"/>
    </div>
  )

  const JORNADAS: Record<string, {label: string, color: string}> = {
    DIA_INTEIRO: { label: '☀️ Dia Inteiro', color: 'badge-green' },
    MEIO_TURNO:  { label: '🌤️ Meio Turno',  color: 'badge-yellow' },
    OUTRO:       { label: '🕐 Outro',        color: 'badge-gray' },
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white mb-1">Horários</h1>
          <p className="text-gray-400 text-sm">{logs.length} registros</p>
        </div>
      </div>

      <div className="card">
        {logs.length === 0 ? (
          <div className="text-center py-16">
            <Clock size={40} className="text-gray-600 mx-auto mb-4"/>
            <p className="text-gray-400 font-medium">Nenhum registro lançado</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                {['Funcionário','Data','Jornada','Local','Horas','Diária','Vale'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((r, i) => (
                <tr key={r.id} className={`border-b border-gray-800 hover:bg-gray-800/50 ${i % 2 === 1 ? 'bg-gray-800/20' : ''}`}>
                  <td className="py-3 px-4 text-white font-medium text-sm">{r.employee_name}</td>
                  <td className="py-3 px-4 text-gray-400 text-sm">{r.data ? format(new Date(r.data + 'T12:00:00'), 'dd/MM/yy') : '—'}</td>
                  <td className="py-3 px-4">
                    <span className={JORNADAS[r.jornada]?.color || 'badge-gray'}>
                      {JORNADAS[r.jornada]?.label || r.jornada}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-400 text-sm max-w-[160px] truncate">{r.local || '—'}</td>
                  <td className="py-3 px-4"><span className="badge-purple">{r.horas || 0}h</span></td>
                  <td className="py-3 px-4 text-green-400 font-semibold text-sm">R$ {(r.diaria || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                  <td className="py-3 px-4">
                    {r.vale ? <span className="badge-yellow">R$ {(r.valor_vale || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span> : <span className="badge-gray">Não</span>}
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
