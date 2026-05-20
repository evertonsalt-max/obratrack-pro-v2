'use client'
import { useMemo, useState } from 'react'

type SummaryItem = {
  employee: { nome: string; apelido?: string }
  dias?: number
  faltas?: number
  horasOutro?: number
  bruto?: number
}

type Metrica = 'dias' | 'faltas' | 'horas' | 'bruto'

const CFG: Record<Metrica, { label: string; color: string; asc: boolean; fmt: (v: number) => string }> = {
  dias:   { label: 'Dias trab.',  color: '#4a9eff', asc: false, fmt: v => v + 'd'   },
  faltas: { label: 'Faltas',      color: '#f87171', asc: true,  fmt: v => v + 'x'   },
  horas:  { label: 'H. extras',   color: '#34d399', asc: false, fmt: v => v.toFixed(1) + 'h' },
  bruto:  { label: 'Bruto',       color: '#fbbf24', asc: false, fmt: v => 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) },
}

const MEDALS = ['', '', '']

export function RankingProdutividade({ summary }: { summary: SummaryItem[] }) {
  const [metrica, setMetrica] = useState<Metrica>('dias')
  const cfg = CFG[metrica]

  const ranked = useMemo(() => {
    return [...summary]
      .map(s => ({
        nome: s.employee.apelido || s.employee.nome.split(' ')[0],
        valor: metrica === 'dias'   ? (s.dias || 0)
             : metrica === 'faltas' ? (s.faltas || 0)
             : metrica === 'horas'  ? (s.horasOutro || 0)
             : (s.bruto || 0),
      }))
      .sort((a, b) => cfg.asc ? a.valor - b.valor : b.valor - a.valor)
  }, [summary, metrica, cfg.asc])

  const max = Math.max(...ranked.map(r => r.valor), 1)

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-bold">Ranking de produtividade</h3>
        <div className="flex gap-1">
          {(Object.keys(CFG) as Metrica[]).map(k => (
            <button
              key={k}
              onClick={() => setMetrica(k)}
              className={}
            >
              {CFG[k].label}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        {ranked.map((r, i) => {
          const pct = max > 0 ? Math.round((r.valor / max) * 100) : 0
          return (
            <div key={r.nome} className="flex items-center gap-3">
              <span className="w-5 text-sm text-center">{MEDALS[i] || ''}</span>
              <span className="w-20 text-xs text-gray-400 text-right truncate">{r.nome}</span>
              <div className="flex-1 bg-gray-800/60 rounded h-5 overflow-hidden">
                <div
                  className="h-full rounded transition-all duration-500"
                  style={{
                    width: pct + '%',
                    background: cfg.color + '33',
                    border: '1px solid ' + cfg.color + '55',
                  }}
                />
              </div>
              <span className="w-24 text-xs font-semibold text-right" style={{ color: cfg.color }}>
                {cfg.fmt(r.valor)}
              </span>
            </div>
          )
        })}
        {ranked.length === 0 && (
          <p className="text-gray-600 text-sm text-center py-4">Nenhum dado no periodo.</p>
        )}
      </div>
    </div>
  )
}
