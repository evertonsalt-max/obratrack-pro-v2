'use client'
import { useState, useRef } from 'react'
import { useEmployees, useWorksites, useWorkLogs } from '@/hooks/useData'
import { Mic, Square, Check } from 'lucide-react'

const hoje = new Date().toISOString().split('T')[0]
const fmtR$ = (v: number) => 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
function calcH(e: string, s: string) {
  if (!e || !s) return 0
  const [eh, em] = e.split(':').map(Number)
  const [sh, sm] = s.split(':').map(Number)
  return +((sh * 60 + sm - eh * 60 - em) / 60).toFixed(1)
}

export default function AudioPage() {
  const { employees } = useEmployees()
  const { worksites, add: addSite } = useWorksites()
  const { add: addLog } = useWorkLogs()
  const [etapa, setEtapa] = useState('inicio')
  const [txt, setTxt] = useState('')
  const [dados, setDados] = useState<any>(null)
  const [seg, setSeg] = useState(0)
  const [erro, setErro] = useState('')
  const [saving, setSaving] = useState(false)
  const timerRef = useRef<any>()
  const mediaRef = useRef<any>()
  const recRef = useRef<any>()

  const iniciar = async () => {
    setErro('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream)
      rec.onstop = () => setEtapa('revisar')
      rec.start()
      mediaRef.current = rec
      const R = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (R) {
        const r = new R()
        r.lang = 'pt-BR'
        r.continuous = true
        r.interimResults = true
        r.onresult = (e: any) => {
          let t = ''
          for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript
          setTxt(t)
        }
        r.start()
        recRef.current = r
      }
      setEtapa('gravando')
      setSeg(0)
      timerRef.current = setInterval(() => setSeg(s => s + 1), 1000)
    } catch {
      setErro('Microfone não disponível')
    }
  }

  const parar = () => {
    clearInterval(timerRef.current)
    recRef.current?.stop()
    mediaRef.current?.stop()
    mediaRef.current?.stream?.getTracks().forEach((t: any) => t.stop())
  }

  const interpretar = async () => {
    if (!txt.trim()) return setErro('Digite ou grave a transcrição')
    setEtapa('ia')
    setErro('')
    try {
      const lista = employees.map(f => `id:${f.id}|"${f.apelido || f.nome}"`).join('\n')
      const prompt = `Extraia dados de registro de trabalho.\nDATA HOJE: ${hoje}\nFuncionários:\n${lista}\nTexto: "${txt}"\nResponda APENAS com JSON válido:\n{"funcionarioId":"uuid ou null","funcionarioNome":"string","data":"YYYY-MM-DD","local":"string","vale":false,"valorVale":0,"entrada":"HH:MM ou null","saida":"HH:MM ou null","obs":"string","confianca":80}`
      const r = await fetch('/api/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 500, messages: [{ role: 'user', content: prompt }] })
      })
      const data = await r.json()
      const raw = data.content?.find((b: any) => b.type === 'text')?.text || '{}'
      const res = JSON.parse(raw.replace(/```json|```/g, '').trim())
      const fn = employees.find(f => f.id === res.funcionarioId || f.nome.toLowerCase().includes((res.funcionarioNome || '').toLowerCase()))
      setDados({ ...res, funcionarioId: fn?.id || null, funcionarioNome: fn?.apelido || fn?.nome || res.funcionarioNome, diaria: fn?.diaria || 0 })
      setEtapa('preview')
    } catch {
      setErro('Erro ao interpretar. Tente novamente.')
      setEtapa('revisar')
    }
  }

  const confirmar = async () => {
    if (!dados?.funcionarioId || !dados?.local || !dados?.data) return alert('Preencha todos os campos obrigatórios')
    setSaving(true)
    try {
      await addLog({
        employee_id: dados.funcionarioId,
        employee_name: dados.funcionarioNome,
        data: dados.data,
        local: dados.local,
        jornada: 'DIA_INTEIRO',
        entrada: dados.entrada || '',
        saida: dados.saida || '',
        horas: calcH(dados.entrada || '', dados.saida || ''),
        diaria: dados.diaria,
        vale: dados.vale,
        valor_vale: dados.valorVale || 0,
        obs: dados.obs || ''
      })
      if (dados.local && !worksites.find((w: any) => w.nome === dados.local)) {
        addSite(dados.local)
      }
      setEtapa('ok')
    } catch {
      alert('Erro ao salvar')
    }
    setSaving(false)
  }

  const resetar = () => {
    setEtapa('inicio')
    setTxt('')
    setDados(null)
    setErro('')
    setSeg(0)
  }

  const mmss = `${String(Math.floor(seg / 60)).padStart(2, '0')}:${String(seg % 60).padStart(2, '0')}`

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-extrabold text-white mb-1">Registro por Áudio</h1>
      <p className="text-gray-400 text-sm mb-6">Fale o registro e a IA interpreta automaticamente</p>

      {etapa === 'ok' && (
        <div className="card text-center py-16">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={32} className="text-green-400" />
          </div>
          <h2 className="text-white font-bold text-xl mb-2">Registro Salvo!</h2>
          <p className="text-gray-400 text-sm mb-6">Os dados foram salvos na nuvem.</p>
          <button onClick={resetar} className="btn-primary mx-auto">
            <Mic size={16} /> Novo Registro
          </button>
        </div>
      )}

      {etapa === 'inicio' && (
        <div className="card space-y-4">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <p className="text-blue-400 text-sm font-semibold mb-1">Exemplo</p>
            <p className="text-gray-300 text-sm italic">"Hoje o João trabalhou na obra do Condomínio Vista Alegre e recebeu vale de 100 reais."</p>
          </div>
          {erro && <p className="text-red-400 text-sm">{erro}</p>}
          <button onClick={iniciar} className="w-full btn-primary justify-center py-3 text-base">
            <Mic size={20} /> Gravar Áudio
          </button>
          <button onClick={() => setEtapa('revisar')} className="w-full btn-ghost justify-center">
            Digitar manualmente
          </button>
        </div>
      )}

      {etapa === 'gravando' && (
        <div className="card text-center">
          <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Mic size={32} color="white" />
          </div>
          <p className="text-red-400 text-3xl font-bold mb-2">{mmss}</p>
          <p className="text-gray-400 text-sm mb-4">Gravando... fale agora</p>
          {txt && (
            <div className="bg-gray-800 rounded-lg p-3 mb-4 text-left">
              <p className="text-xs text-gray-400 mb-1">Transcrição ao vivo:</p>
              <p className="text-white text-sm">{txt}</p>
            </div>
          )}
          <button onClick={parar} className="btn-danger mx-auto">
            <Square size={16} /> Parar e Revisar
          </button>
        </div>
      )}

      {etapa === 'revisar' && (
        <div className="card space-y-4">
          <h3 className="text-white font-bold">Revisar Transcrição</h3>
          {erro && <p className="text-red-400 text-sm">{erro}</p>}
          <div>
            <label className="label">Transcrição</label>
            <textarea
              value={txt}
              onChange={e => setTxt(e.target.value)}
              rows={4}
              placeholder="Digite ou corrija a transcrição..."
              className="input-field resize-none"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={resetar} className="btn-ghost">Cancelar</button>
            <button onClick={interpretar} className="btn-primary flex-1 justify-center">
              Interpretar com IA
            </button>
          </div>
        </div>
      )}

      {etapa === 'ia' && (
        <div className="card text-center py-16">
          <div className="w-12 h-12 border-2 border-gray-700 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white font-semibold">Interpretando com IA...</p>
          <p className="text-gray-400 text-sm mt-2">Identificando funcionário, data, local e vale</p>
        </div>
      )}

      {etapa === 'preview' && dados && (
        <div className="card space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-white font-bold">Confirmar Registro</h3>
            <span className="badge-green">{dados.confianca || 0}% confiança</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Funcionário</label>
              <select
                value={dados.funcionarioId || ''}
                onChange={e => {
                  const fn = employees.find(f => f.id === e.target.value)
                  setDados((d: any) => ({ ...d, funcionarioId: fn?.id, funcionarioNome: fn?.apelido || fn?.nome, diaria: fn?.diaria || 0 }))
                }}
                className="input-field"
              >
                <option value="">— Selecione —</option>
                {employees.map(f => <option key={f.id} value={f.id}>{f.apelido || f.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Data</label>
              <input type="date" value={dados.data || ''} onChange={e => setDados((d: any) => ({ ...d, data: e.target.value }))} className="input-field" />
            </div>
          </div>
          <div>
            <label className="label">Local / Obra</label>
            <input value={dados.local || ''} onChange={e => setDados((d: any) => ({ ...d, local: e.target.value }))} list="obras-audio" className="input-field" />
            <datalist id="obras-audio">{worksites.map(w => <option key={w.id} value={w.nome} />)}</datalist>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Entrada</label>
              <input type="time" value={dados.entrada || ''} onChange={e => setDados((d: any) => ({ ...d, entrada: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="label">Saída</label>
              <input type="time" value={dados.saida || ''} onChange={e => setDados((d: any) => ({ ...d, saida: e.target.value }))} className="input-field" />
            </div>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-sm text-gray-300">
            👷 <strong className="text-white">{dados.funcionarioNome || '—'}</strong> · 📅 {dados.data || '—'} · 📍 {dados.local || '—'} · 💵 {fmtR$(dados.diaria || 0)}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setEtapa('revisar')} className="btn-ghost">Reeditar</button>
            <button
              onClick={confirmar}
              disabled={saving || !dados.funcionarioId || !dados.local || !dados.data}
              className="btn-primary flex-1 justify-center disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Confirmar e Salvar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
