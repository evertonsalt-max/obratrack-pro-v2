'use client'
import { useState, useRef, useEffect } from 'react'
import { useEmployees, useWorksites, useWorkLogs } from '@/hooks/useData'
import { Mic, Square, Check, RefreshCw } from 'lucide-react'

const hoje = new Date().toISOString().split('T')[0]
const fmtR$ = (v: number) => 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
function calcH(e: string, s: string) { if (!e || !s) return 0; const [eh, em] = e.split(':').map(Number), [sh, sm] = s.split(':').map(Number); return +((sh * 60 + sm - eh * 60 - em) / 60).toFixed(1) }

export default function AudioPage() {
  const { employees } = useEmployees()
  const { worksites, add: addSite } = useWorksites()
  const { add: addLog } = useWorkLogs()
  const [etapa, setEtapa] = useState<'inicio'|'gravando'|'revisar'|'ia'|'preview'|'ok'>('inicio')
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
      const chunks: BlobPart[] = []
      rec.ondataavailable = e => chunks.push(e.data)
      rec.onstop = () => { setEtapa('revisar') }
      rec.start(); mediaRef.current = rec
      const R = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (R) { const r = new R(); r.lang = 'pt-BR'; r.continuous = true; r.interimResults = true; r.onresult = (e: any) => { let t = ''; for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript; setTxt(t) }; r.start(); recRef.current = r }
      setEtapa('gravando'); setSeg(0)
      timerRef.current = setInterval(() => setSeg(s => s + 1), 1000)
    } catch { setErro('Microfone não disponível') }
  }

  const parar = () => { clearInterval(timerRef.current); recRef.current?.stop(); mediaRef.current?.stop(); mediaRef.current?.stream?.getTracks().forEach((t: any) => t.stop()) }

  const interpretar = async () => {
    if (!txt.trim()) return setErro('Digite ou grave a transcrição')
    setEtapa('ia'); setErro('')
    try {
      const lista = employees.map(f => `id:${f.id}|"${f.apelido||f.nome}"`).join('\n')
      const prompt = `Extraia dados de registro de trabalho.\nDATA HOJE: ${hoje}\nFuncionários:\n${lista}\nTexto: "${txt}"\nResponda APENAS com JSON:\n{"funcionarioId":"uuid","funcionarioNome":"string","data":"YYYY-MM-DD","local":"string","vale":true/false,"valorVale":0,"entrada":"HH:MM","saida":"HH:MM","obs":"string","confianca":0}`
      const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 500, messages: [{ role: 'user', content: prompt }] }) })
      const data = await r.json()
      const raw = data.content?.find((b: any) => b.type === 'text')?.text || '{}'
      const res = JSON.parse(raw.replace(/```json|```/g, '').trim())
      const fn = employees.find(f => f.id === res.funcionarioId || f.nome.toLowerCase().includes((res.funcionarioNome || '').toLowerCase()))
      setDados({ ...res, funcionarioId: fn?.id || res.funcionarioId, funcionarioNome: fn?.apelido || fn?.nome || res.funcionarioNome, diaria: fn?.diaria || 0 })
      setEtapa('preview')
    } catch (e) { setErro('Erro ao interpretar. Tente novamente.'); setEtapa('revisar') }
  }

  const confirmar = async () => {
    if (!dados?.funcionarioId || !dados?.local || !dados?.data) return alert('Preencha todos os campos')
    setSaving(true)
    try {
      await addLog({ employee_id: dados.funcionarioId, employee_name: dados.funcionarioNome, data: dados.data, local: dados.local, jornada: 'DIA_INTEIRO', entrada: dados.entrada || '', saida: dados.saida || '', horas: calcH(dados.entrada, dados.saida), diaria: dados.diaria, vale: dados.vale, valor_vale: dados.valorVale || 0, obs: dados.obs || '' })
      if (dados.local && !worksites.find((w: any) => w.nome === dados.local)) addSite(dados.local)
      setEtapa('ok')
    } catch { alert('Erro ao salvar') }
    setSaving(false)
  }

  const resetar = () => { setEtapa('inicio'); setTxt(''); setDados(null); setErro(''); setSeg(0) }
  const mmss = `${String(Math.floor(seg / 60)).padStart(2, '0')}:${String(seg % 60).padStart(2, '0')}`

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-extrabold text-white mb-1">Registro por Áudio</h1>
      <p className="text-gray-400 text-sm mb-6">Fale o registro e a IA interpreta automaticamente</p>

      {etapa === 'ok' && (
        <div className="card text-center py-16">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4"><Check size={32} className="text-green-400"/></div>
          <h2 className="text-white font-bold text-xl mb-2">Registro Salvo!</h2>
          <p className="text-gray-400 text-sm mb-6">Os dados foram salvos na nuvem.</p>
          <button onClick={resetar} className="btn-primary mx-auto"><Mic size={16}/> Novo Registro</button>
        </div>
      )}

      {etapa === 'inicio' && (
        <div className="card space-y-4">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <p className="text-blue-400 text-sm font-semibold mb-1">💡 Exemplo</p>
            <p className="text-gray-300 text-sm italic">"Hoje o João trabalhou na obra do Condomínio Vista Alegre e recebeu vale de 100 reais."</p>
          </div>
          {erro && <p className="text-red-400 text-sm">{erro}</p>}
          <button onClick={iniciar} className="w-full btn-primary justify-center py-3 text-base"><Mic size={20}/> Gravar Áudio</button>
          <button onClick={() => setEtapa('revisar')} className="w-full btn-ghost justify-center">Digitar manualmente</button>
        </div>
      )}

      {etapa === 'gravando' && (
        <div className="card text-center">
          <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse"><Mic size={32} color="white"/></div>
          <p className="text-red-400 text-3xl font-bold mb-2">{mmss}</p>
          <p className="text-gray-400 text-sm mb-4">Gravando... fale agora</p>
          {txt && <div className="bg-gray-800 rounded-lg p-3 mb-4 text-left"><p className="text-xs text-gray-400 mb-1">Transcrição ao vivo:</p><p className="text-white text-sm">{txt}</p></div>}
          <button onClick={parar} className="btn-danger mx-auto"><Square size={16}/> Parar e Revisar</button>
        </div>
      )}

      {etapa === 'revisar' && (
        <div className="card space-y-4">
          <h3 className="text-white font-bold">Revisar Transcrição</h3>
          {erro && <p className="text-red-400 text-sm">{erro}</p>}
          <div>
            <label className="label">Transcrição *</label>
            <textarea value={txt} onChange={e => setTxt(e.target.value)} rows={4} placeholder='"Hoje o João trabalhou na obra Rua São Paulo e recebeu vale de 100 reais."' className="input-field resize-none"/>
          </div>
          <div className="flex gap-3">
            <button onClick={resetar} className="btn-ghost">Cancelar</button>
            <button onClick={interpretar} className="btn-primary flex-1 justify-center">Interpretar com IA →</button>
          </div>
        </div>
      )}

      {etapa === 'ia' && (
        <div className="card text-center py-16">
          <div className="w-12 h-12 border-2 border-gray-700 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"/>
          <p className="text-white font-semibold">Interpretando com IA...</p>
          <p className="text-gray-400 text-sm mt-2">Identificando funcionário, data, local e vale</p>
        </div>
      )}

      {etapa === 'preview' && dados && (
        <div className="card space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-white font-bold">Confirmar Registro</h3>
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${(dados.confianca || 0) > 75 ? 'badge-green' : 'badge-yellow'}`}>{dados.confianca || 0}% confiança</span>
          </div>
          {(!dados.funcionarioId || !dados.local || !dados.data) && <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-yellow-400 text-sm">⚠ Preencha os campos obrigatórios antes de salvar</div>}
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Funcionário *</label>
              <select value={dados.funcionarioId || ''} onChange={e => { const fn = employees.find(f => f.id === e.target.value); setDados((d: any) => ({ ...d, funcionarioId: fn?.id, funcionarioNome: fn?.apelido || fn?.nome, diaria: fn?.diaria || 0 })) }} className="input-field">
                <option value="">— Selecione —</option>{employees.map(f => <option key={f.id} value={f.id}>{f.apelido || f.nome}</option>)}</select></div>
            <div><label className="label">Data *</label><input type="date" value={dados.data || ''} onChange={e => setDados((d: any) => ({ ...d, data: e.target.value }))} className="input-field"/></div>
          </div>
          <div><label className="label">Local / Obra *</label><input value={dados.local || ''} onChange={e => setDados((d: any) => ({ ...d, local: e.target.value }))} list="obras-prev" className="input-field"/><datalist id="obras-prev">{worksites.map(w => <option key={w.id} value={w.nome}/>)}</datalist></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Entrada</label><input type="time" value={dados.entrada || ''} onChange={e => setDados((d: any) => ({ ...d, entrada: e.target.value }))} className="input-field"/></div>
            <div><label className="label">Saída</label><input type="time" value={dados.saida || ''} onChange={e => setDados((d: any) => ({ ...d, saida: e.target.value }))} className="input-field"/></div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4">
            <p className="label mb-3">Vale</p>
            <div className="flex gap-3 mb-3">{[true, false].map(v => <button key={String(v)} onClick={() => setDados((d: any) => ({ ...d, vale: v, valorVale: v ? d.valorVale : 0 }))} className={`flex-1 py-2 rounded-lg border-2 text-sm font-semibold ${dados.vale === v ? (v ? 'border-green-500 bg-green-500/15 text-green-400' : 'border-red-500 bg-red-500/15 text-red-400') : 'border-gray-600 text-gray-400'}`}>{v ? '✓ Recebeu' : '✗ Não recebeu'}</button>)}</div>
            {dados.vale && <div><label className="label">Valor (R$)</label><input type="number" value={dados.valorVale || ''} onChange={e => setDados((d: any) => ({ ...d, valorVale: Number(e.target.value) }))} className="input-field"/></div>}
          </div>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-sm text-gray-300">
            👷 <strong className="text-white">{dados.funcionarioNome || '—'}</strong> · 📅 {dados.data || '—'} · 📍 {dados.local || '—'} · 💵 {fmtR$(dados.diaria || 0)} {dados.vale ? `· 🟠 Vale: ${fmtR$(dados.valorVale || 0)}` : '· 🟢 Sem vale'}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setEtapa('revisar')} className="btn-ghost">← Reeditar</button>
            <button onClick={confirmar} disabled={saving || !dados.funcionarioId || !dados.local || !dados.data} className="btn-pr
cat > app/dashboard/importar/page.tsx << 'EOF'
'use client'
import { useState, useRef } from 'react'
import { useEmployees, useWorkLogs, usePayments, useWorksites } from '@/hooks/useData'
import { Upload, Download, Check, AlertCircle } from 'lucide-react'
import * as XLSX from 'xlsx'

const hoje = new Date().toISOString().split('T')[0]
const fmtBR = (d: string) => { try { return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') } catch { return d } }

export default function ImportarPage() {
  const { employees, add: addEmp } = useEmployees()
  const { add: addLog } = useWorkLogs()
  const { add: addPag } = usePayments()
  const { add: addSite, worksites } = useWorksites()
  const [tipo, setTipo] = useState<'funcionarios'|'registros'|'pagamentos'>('funcionarios')
  const [etapa, setEtapa] = useState<'inicio'|'preview'|'sucesso'>('inicio')
  const [linhas, setLinhas] = useState<any[]>([])
  const [selecionadas, setSelecionadas] = useState<number[]>([])
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const TIPOS = { funcionarios: { label: 'Funcionários', icon: '👷', desc: 'Importar cadastro em massa' }, registros: { label: 'Registros de Horas', icon: '⏱️', desc: 'Importar dias trabalhados' }, pagamentos: { label: 'Pagamentos', icon: '💰', desc: 'Importar histórico de pagamentos' } }

  const baixarModelo = () => {
    const wb = XLSX.utils.book_new()
    if (tipo === 'funcionarios') XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Nome*','Apelido','Telefone','Função*','Diária*','Status*'],['João Silva','João','(11)99999-0001','Pedreiro','180','ativo']]), 'Funcionários')
    else if (tipo === 'registros') XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Nome Funcionário*','Data* (AAAA-MM-DD)','Local*','Entrada','Saída','Vale (sim/não)','Valor Vale'],['João Silva',hoje,'Obra Centro','07:00','17:00','não','0']]), 'Registros')
    else XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Nome Funcionário*','Data* (AAAA-MM-DD)','Valor*','Tipo*'],['João Silva',hoje,'540','Semanal']]), 'Pagamentos')
    XLSX.writeFile(wb, `modelo-${tipo}.xlsx`)
  }

  const processarArquivo = async (file: File) => {
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf, { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][]
    if (rawRows.length < 2) return alert('Planilha vazia')
    const headers = rawRows[0].map((h: any) => String(h).trim())
    const rows = rawRows.slice(1).filter(r => r.some((v: any) => v !== '')).map(row => { const obj: any = {}; row.forEach((v: any, i: number) => { obj[i] = v; if (headers[i]) obj[headers[i]] = v }); return obj })
    const parsed = rows.map((row, i) => {
      const erros: string[] = []
      if (tipo === 'funcionarios') {
        const nome = String(row[0] || row['Nome*'] || '').trim()
        const funcao = String(row[3] || row['Função*'] || '').trim()
        const diaria = parseFloat(String(row[4] || row['Diária*'] || '0').replace(',', '.'))
        if (!nome) erros.push('Nome obrigatório')
        if (!funcao) erros.push('Função obrigatória')
        return { _linha: i + 2, _erros: erros, _ok: erros.length === 0, nome, apelido: String(row[1] || '').trim(), telefone: String(row[2] || '').trim(), funcao, diaria: isNaN(diaria) ? 0 : diaria, status: String(row[5] || 'ativo').trim() }
      } else if (tipo === 'registros') {
        const nomeRaw = String(row[0] || row['Nome Funcionário*'] || '').trim()
        const data = String(row[1] || row['Data* (AAAA-MM-DD)'] || '').trim()
        const local = String(row[2] || row['Local*'] || '').trim()
        const fn = employees.find(f => f.nome.toLowerCase().includes(nomeRaw.toLowerCase()) || (f.apelido || '').toLowerCase() === nomeRaw.toLowerCase())
        if (!nomeRaw) erros.push('Nome obrigatório')
        else if (!fn) erros.push(`Funcionário "${nomeRaw}" não encontrado`)
        if (!data) erros.push('Data obrigatória')
        if (!local) erros.push('Local obrigatório')
        const entrada = String(row[3] || '').trim()
        const saida = String(row[4] || '').trim()
        const valeRaw = String(row[5] || 'não').toLowerCase()
        const vale = valeRaw === 'sim' || valeRaw === 's'
        return { _linha: i + 2, _erros: erros, _ok: erros.length === 0, _nomeRaw: nomeRaw, employee_id: fn?.id, employee_name: fn?.apelido || fn?.nome?.split(' ')[0] || nomeRaw, data, local, jornada: 'DIA_INTEIRO', entrada, saida, horas: 0, diaria: fn?.diaria || 0, vale, valor_vale: vale ? parseFloat(String(row[6] || '0')) : 0, obs: '' }
      } else {
        const nomeRaw = String(row[0] || row['Nome Funcionário*'] || '').trim()
        const data = String(row[1] || row['Data* (AAAA-MM-DD)'] || '').trim()
        const valor = parseFloat(String(row[2] || row['Valor*'] || '0').replace(',', '.'))
        const tipo2 = String(row[3] || row['Tipo*'] || 'Semanal').trim()
        const fn = employees.find(f => f.nome.toLowerCase().includes(nomeRaw.toLowerCase()) || (f.apelido || '').toLowerCase() === nomeRaw.toLowerCase())
        if (!nomeRaw) erros.push('Nome obrigatório')
        else if (!fn) erros.push(`Funcionário "${nomeRaw}" não encontrado`)
        if (!data) erros.push('Data obrigatória')
        if (!valor || valor <= 0) erros.push('Valor inválido')
        return { _linha: i + 2, _erros: erros, _ok: erros.length === 0, _nomeRaw: nomeRaw, employee_id: fn?.id, employee_name: fn?.apelido || fn?.nome?.split(' ')[0] || nomeRaw, data, valor, tipo: tipo2, obs: '' }
      }
    })
    setLinhas(parsed)
    setSelecionadas(parsed.filter(r => r._ok).map((_, i) => i))
    setEtapa('preview')
  }

  const confirmar = async () => {
    const ok = selecionadas.map(i => linhas[i]).filter(l => l._ok)
    if (ok.length === 0) return alert('Nenhuma linha válida')
    setImporting(true)
    try {
      if (tipo === 'funcionarios') { for (const l of ok) await addEmp({ nome: l.nome, apelido: l.apelido, telefone: l.telefone, funcao: l.funcao, diaria: l.diaria, status: l.status as any, obs: '' }) }
      else if (tipo === 'registros') { for (const l of ok) { await addLog({ employee_id: l.employee_id, employee_name: l.employee_name, data: l.data, local: l.local, jornada: 'DIA_INTEIRO', entrada: l.entrada, saida: l.saida, horas: l.horas, diaria: l.diaria, vale: l.vale, valor_vale: l.valor_vale, obs: l.obs }); if (l.local && !worksites.find((w: any) => w.nome === l.local)) addSite(l.local) } }
      else { for (const l of ok) await addPag({ employee_id: l.employee_id, employee_name: l.employee_name, data: l.data, valor: l.valor, tipo: l.tipo as any, obs: l.obs }) }
      setEtapa('sucesso')
    } catch { alert('Erro ao importar') }
    setImporting(false)
  }

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-extrabold text-white mb-1">Importar Planilha</h1>
      <p className="text-gray-400 text-sm mb-6">Importe dados em massa via Excel ou CSV</p>

      {etapa === 'sucesso' && (
        <div className="card text-center py-16">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4"><Check size={32} className="text-green-400"/></div>
          <h2 className="text-white font-bold text-xl mb-2">Importação Concluída!</h2>
          <p className="text-green-400 font-semibold mb-6">{selecionadas.length} registros importados</p>
          <button onClick={() => { setEtapa('inicio'); setLinhas([]) }} className="btn-primary mx-auto"><Upload size={16}/> Nova Importação</button>
        </div>
      )}

      {etapa === 'inicio' && (
        <div className="space-y-6">
          <div className="card"><p className="label mb-3">1. Selecione o tipo de dados</p>
            <div className="grid grid-cols-3 gap-3">{Object.entries(TIPOS).map(([k, v]) => <button key={k} onClick={() => setTipo(k as any)} className={`p-4 rounded-xl border-2 text-left transition-all ${tipo === k ? 'border-blue-500 bg-blue-500/15' : 'border-gray-700 bg-gray-800'}`}><p className="text-2xl mb-2">{v.icon}</p><p className={`font-semibold text-sm ${tipo === k ? 'text-blue-400' : 'text-white'}`}>{v.label}</p><p className="text-gray-400 text-xs">{v.desc}</p></button>)}</div>
          </div>
          <div className="card flex justify-between items-center">
            <div><p className="text-white font-semibold mb-1">2. Baixe o modelo Excel</p><p className="text-gray-400 text-sm">Preencha com seus dados seguindo o formato correto</p></div>
            <button onClick={baixarModelo} className="bg-green-800 hover:bg-green-700 text-green-300 font-semibold px-4 py-2 rounded-lg text-sm flex items-center gap-2"><Download size={16}/> Baixar Modelo</button>
          </div>
          <div onClick={() => fileRef.current?.click()} className="card border-2 border-dashed border-gray-700 hover:border-blue-500 cursor-pointer text-center py-12 transition-colors">
            <Upload size={40} className="text-gray-500 mx-auto mb-4"/>
            <p className="text-white font-semibold mb-1">3. Faça upload da planilha</p>
            <p className="text-gray-400 text-sm">Clique ou arraste o arquivo aqui</p>
            <div className="flex gap-2 justify-center mt-3">{['.xlsx','.xls','.csv'].map(e => <span key={e} className="badge-gray">{e}</span>)}</div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => { if (e.target.files?.[0]) processarArquivo(e.target.files[0]); e.target.value = '' }}/>
          </div>
        </div>
      )}

      {etapa === 'preview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[{ l: 'Total', v: linhas.length, c: 'text-white' }, { l: 'Válidas', v: linhas.filter(l => l._ok).length, c: 'text-green-400' }, { l: 'Com erro', v: linhas.filter(l => !l._ok).length, c: 'text-red-400' }].map(({ l, v, c }) => <div key={l} className="card"><p className="text-xs text-gray-400 uppercase mb-1">{l}</p><p className={`text-2xl font-bold ${c}`}>{v}</p></div>)}
          </div>
          <div className="card overflow-x-auto">
            <div className="flex justify-between items-center mb-4">
              <p className="text-white font-semibold">Prévia dos dados</p>
              <div className="flex gap-2">
                <button onClick={() => setEtapa('inicio')} className="btn-ghost text-xs">Trocar arquivo</button>
                <button onClick={() => setSelecionadas(linhas.filter(l => l._ok).map((_, i) => i))} className="btn-ghost text-xs">Selecionar todos</button>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-800"><th className="text-left py-2 px-3 text-xs text-gray-400">✓</th><th className="text-left py-2 px-3 text-xs text-gray-400">Linha</th><th className="text-left py-2 px-3 text-xs text-gray-400">Status</th><th className="text-left py-2 px-3 text-xs text-gray-400">{tipo === 'funcionarios' ? 'Nome' : 'Funcionário'}</th><th className="text-left py-2 px-3 text-xs text-gray-400">Detalhes</th><th className="text-left py-2 px-3 text-xs text-gray-400">Erros</th></tr></thead>
              <tbody>{linhas.map((row, i) => <tr key={i} className={`border-b border-gray-800 ${!row._ok ? 'bg-red-500/5' : selecionadas.includes(i) ? 'bg-green-500/5' : ''}`}>
                <td className="py-2 px-3">{row._ok ? <input type="checkbox" checked={selecionadas.includes(i)} onChange={() => setSelecionadas(p => p.includes(i) ? p.filter(x => x !== i) : [...p, i])} className="w-4 h-4 cursor-pointer" style={{accentColor:'#22c55e'}}/> : <span className="text-red-400">✗</span>}</td>
                <td className="py-2 px-3 text-gray-400">{row._linha}</td>
                <td className="py-2 px-3">{row._ok ? <span className="badge-green">✓ Válido</span> : <span className="badge-red">✗ Erro</span>}</td>
                <td className="py-2 px-3 text-white">{row.nome || row._nomeRaw || '—'}</td>
                <td className="py-2 px-3 text-gray-400 text-xs">{tipo === 'funcionarios' ? row.funcao : tipo === 'pagamentos' ? `R$ ${row.valor} · ${row.tipo}` : row.data}</td>
                <td className="py-2 px-3 text-red-400 text-xs">{row._erros.join(' · ') || '—'}</td>
              </tr>)}</tbody>
            </table>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setEtapa('inicio')} className="btn-ghost">Voltar</button>
            <button onClick={confirmar} disabled={importing || selecionadas.length === 0} className="btn-primary disabled:opacity-50">{importing ? 'Importando...' : `Importar ${selecionadas.length} registros`}</button>
          </div>
        </div>
      )}
    </div>
  )
}
