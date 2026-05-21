'use client'
import { useWorkLogs, useEmployees, useWorksites } from '@/hooks/useData'
import { useState } from 'react'
import { Clock, Plus, X, Trash2, Pencil } from 'lucide-react'
import { format } from 'date-fns'
import { JORNADA_CONFIG, AUSENCIA_MOTIVOS, JornadaTipo } from '@/types'

const hoje = new Date().toISOString().split('T')[0]
const fmtR$ = (v: any) => 'R$ ' + (Number(v)||0).toLocaleString('pt-BR',{minimumFractionDigits:2})
function calcH(e:string,s:string){if(!e||!s)return 0;const[eh,em]=e.split(':').map(Number),[sh,sm]=s.split(':').map(Number);return+((sh*60+sm-eh*60-em)/60).toFixed(1)}
const JORNADAS = Object.entries(JORNADA_CONFIG) as [JornadaTipo, typeof JORNADA_CONFIG[JornadaTipo]][]

export default function HorariosPage() {
  const { logs, loading, add, update, remove } = useWorkLogs()
  const { employees } = useEmployees()
  const { worksites, add: addSite } = useWorksites()
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string|null>(null)
  const [editId, setEditId] = useState<string|null>(null)
  const [fF, setFF] = useState('')
  const [fD, setFD] = useState('')
  const [fJ, setFJ] = useState('')
  const [form, setForm] = useState({
    employee_id: '', data: hoje, local: '',
    jornada: 'DIA_INTEIRO' as JornadaTipo,
    entrada: '07:00', saida: '18:00',
    vale: false, discount_value: '', obs: '', absence_reason: '',
    diaria_custom: '', usar_diaria_custom: false,
  })
  const up = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }))
  const mudarJornada = (j: JornadaTipo) => {
    const cfg = JORNADA_CONFIG[j]
    setForm(p => ({ ...p, jornada: j, entrada: cfg.entrada, saida: cfg.saida }))
  }
  const lista = logs.filter(r =>
    (!fF || r.employee_id === fF) &&
    (!fD || r.data === fD) &&
    (!fJ || r.jornada === fJ)
  ).sort((a,b) => b.data.localeCompare(a.data))


  const abrirEdicao = (r: any) => {
    setEditId(r.id)
    setForm({
      employee_id: r.employee_id,
      data: r.data,
      local: r.local || '',
      jornada: r.jornada,
      entrada: r.entrada || '07:00',
      saida: r.saida || '18:00',
      vale: (Number(r.discount_value)||0) > 0,
      discount_value: String(Number(r.discount_value)||0||''),
      obs: r.obs || '',
      absence_reason: r.absence_reason || '',
      diaria_custom: String(r.diaria||''),
      usar_diaria_custom: false,
    })
    setModal(true)
  }

  const salvar = async () => {
    if (!form.employee_id || !form.data) return alert('Preencha os campos obrigatórios')
    const isAus = form.jornada === 'NAO_TRABALHOU'
    if (!isAus && !form.local) return alert('Informe o local/obra')
    if (form.jornada === 'OUTRO' && !form.obs.trim()) return alert('Descreva o motivo nas observações')
    setSaving(true)
    try {
      const emp = employees.find(e => e.id === form.employee_id)!
      const horas = isAus ? 0 : calcH(form.entrada, form.saida)
      if (editId) {
        await update(editId, {
          employee_id: form.employee_id,
          employee_name: emp.apelido || emp.nome.split(' ')[0],
          data: form.data, local: isAus ? '' : form.local,
          jornada: form.jornada, entrada: isAus ? null : (form.entrada || null),
          saida: isAus ? null : (form.saida || null), horas,
          diaria: diariaFinal,
          discount_value: (!isAus && form.discount_value) ? Number(form.discount_value) : 0,
          absence_reason: isAus ? form.absence_reason : '',
          obs: form.obs,
        })
      } else {
      await add({
        employee_id: form.employee_id,
        employee_name: emp.apelido || emp.nome.split(' ')[0],
        data: form.data, local: isAus ? '' : form.local,
        jornada: form.jornada, entrada: isAus ? null : (form.entrada || null),
        saida: isAus ? null : (form.saida || null), horas,
        diaria: diariaFinal,
        vale: false, valor_vale: 0,
        discount_value: (!isAus && form.discount_value) ? Number(form.discount_value) : 0,
        absence_reason: isAus ? form.absence_reason : '',
        obs: form.obs,
      })
      if (!isAus && form.local && !worksites.find(w => w.nome === form.local)) addSite(form.local)
      }
      setModal(false)
      setEditId(null)
      setForm({ employee_id:'', data:hoje, local:'', jornada:'DIA_INTEIRO', entrada:'07:00', saida:'18:00', vale:false, discount_value:'', obs:'', absence_reason:'', diaria_custom:'', usar_diaria_custom:false })
    } catch { alert('Erro ao salvar') }
    setSaving(false)
  }

  const abrirEdicao = (r: any) => {
    setEditId(r.id)
    setForm({
      employee_id: r.employee_id,
      data: r.data,
      local: r.local || '',
      jornada: r.jornada,
      entrada: r.entrada || '07:00',
      saida: r.saida || '18:00',
      vale: (Number(r.discount_value)||Number(r.valor_vale)||0) > 0,
      discount_value: String(Number(r.discount_value)||Number(r.valor_vale)||0||''),
      obs: r.obs || '',
      absence_reason: r.absence_reason || '',
    })
    setModal(true)
  }

  const emp = employees.find(e => e.id === form.employee_id)
  const horas = calcH(form.entrada, form.saida)
  const isAusencia = form.jornada === 'NAO_TRABALHOU'
  const naoTrab = lista.filter(l => l.jornada === 'NAO_TRABALHOU').length
  const trab = lista.filter(l => l.jornada !== 'NAO_TRABALHOU').length

  if (loading) return <div className="p-6 flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-gray-700 border-t-blue-500 rounded-full animate-spin"/></div>

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-extrabold text-white mb-1">Horários</h1><p className="text-gray-400 text-sm">{logs.length} registros</p></div>
        <button onClick={() => {setEditId(null);setForm({ employee_id:'', data:hoje, local:'', jornada:'DIA_INTEIRO', entrada:'07:00', saida:'18:00', vale:false, discount_value:'', obs:'', absence_reason:'', diaria_custom:'', usar_diaria_custom:false });setModal(true)}} className="btn-primary"><Plus size={16}/> Novo Registro</button>
      </div>

      <div className="card mb-6 flex gap-4 flex-wrap items-end">
        <div><label className="label">Funcionário</label>
          <select value={fF} onChange={e => setFF(e.target.value)} className="input-field min-w-[160px]">
            <option value="">Todos</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.apelido||e.nome}</option>)}
          </select>
        </div>
        <div><label className="label">Data</label><input type="date" value={fD} onChange={e => setFD(e.target.value)} className="input-field"/></div>
        <div><label className="label">Jornada</label>
          <select value={fJ} onChange={e => setFJ(e.target.value)} className="input-field">
            <option value="">Todas</option>
            {JORNADAS.map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        {(fF||fD||fJ) && <button onClick={() => {setFF('');setFD('');setFJ('')}} className="btn-ghost self-end">Limpar</button>}
      </div>

      <div className="grid grid-cols-5 gap-4 mb-6">
        {[
          {l:'Registros',v:lista.length,c:'text-blue-400'},
          {l:'Trabalhados',v:trab,c:'text-green-400'},
          {l:'Faltas',v:naoTrab,c:'text-red-400'},
          {l:'Total Horas',v:lista.filter(l=>l.jornada!=='NAO_TRABALHOU').reduce((s,r)=>s+(Number(r.horas)||0),0).toFixed(1)+'h',c:'text-purple-400'},
          {l:'Total Bruto',v:fmtR$(lista.reduce((s,r)=>s+(Number(r.diaria)||0),0)),c:'text-white'},
        ].map(({l,v,c}) => (
          <div key={l} className="card"><p className="text-xs font-semibold text-gray-400 uppercase mb-2">{l}</p><p className={`text-xl font-extrabold ${c}`}>{v}</p></div>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        {JORNADAS.map(([k,cfg]) => {
          const n = lista.filter(l => l.jornada === k).length
          const active = fJ === k
          return (
            <button key={k} onClick={() => setFJ(fJ===k?'':k)}
              className="card text-left transition-all hover:opacity-90"
              style={{borderColor: active ? cfg.cor : undefined, background: active ? cfg.corBg : undefined}}>
              <p className="text-xl mb-1">{k==='DIA_INTEIRO'?'☀️':k==='MEIO_TURNO'?'🌤️':k==='OUTRO'?'🕐':'🚫'}</p>
              <p className="text-xs font-semibold text-gray-400 uppercase mb-1">{cfg.label}</p>
              <p className="text-2xl font-extrabold" style={{color: active ? cfg.cor : '#fff'}}>{n}</p>
            </button>
          )
        })}
      </div>

      <div className="card">
        {lista.length === 0 ? (
          <div className="text-center py-16"><Clock size={40} className="text-gray-600 mx-auto mb-4"/><p className="text-gray-400">Nenhum registro encontrado</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-gray-800">{['Funcionário','Data','Jornada','Local','Entrada','Saída','Horas','Diária','Desconto','Motivo/Obs',''].map(h=><th key={h} className="text-left py-3 px-3 text-xs font-semibold text-gray-400 uppercase whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody>
                {lista.map((r,i) => {
                  const cfg = JORNADA_CONFIG[r.jornada] || JORNADA_CONFIG.DIA_INTEIRO
                  const desc = Number(r.discount_value)||Number(r.valor_vale)||0
                  const isAus = r.jornada === 'NAO_TRABALHOU'
                  return (
                    <tr key={r.id} className={`border-b border-gray-800 hover:bg-gray-800/50 ${i%2===1?'bg-gray-800/20':''} ${isAus?'opacity-70':''}`}>
                      <td className="py-3 px-3 text-white font-medium text-sm">{r.employee_name}</td>
                      <td className="py-3 px-3 text-gray-400 text-sm whitespace-nowrap">{r.data?format(new Date(r.data+'T12:00:00'),'dd/MM/yy'):'—'}</td>
                      <td className="py-3 px-3"><span className="text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap" style={{background:cfg.corBg,color:cfg.cor}}>{cfg.label}</span></td>
                      <td className="py-3 px-3 text-gray-400 text-sm max-w-[100px] truncate">{r.local||'—'}</td>
                      <td className="py-3 px-3 text-gray-300 text-sm">{r.entrada||'—'}</td>
                      <td className="py-3 px-3 text-gray-300 text-sm">{r.saida||'—'}</td>
                      <td className="py-3 px-3">{isAus?<span className="badge-red">Falta</span>:<span className="badge-purple">{Number(r.horas)||0}h</span>}</td>
                      <td className="py-3 px-3 text-sm font-semibold" style={{color:isAus?'#6b7280':'#22c55e'}}>{isAus?'—':fmtR$(r.diaria)}</td>
                      <td className="py-3 px-3 text-yellow-400 text-sm">{desc>0?fmtR$(desc):'—'}</td>
                      <td className="py-3 px-3 text-gray-400 text-xs max-w-[140px] truncate">{r.absence_reason||r.obs||'—'}</td>
                      <td className="py-3 px-3"><div className="flex gap-1">
                      <button onClick={()=>abrirEdicao(r)} className="text-blue-400 hover:text-blue-300 p-1 rounded hover:bg-blue-500/10"><Pencil size={13}/></button>
                      <button onClick={()=>{if(confirm('Excluir?'))remove(r.id)}} className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/10"><Trash2 size={13}/></button>
                    </div></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div onClick={e=>{if(e.target===e.currentTarget)setModal(false)}} className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-xl shadow-2xl max-h-[94vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
              <h2 className="text-white font-bold text-lg">{editId ? "Editar Registro" : "Novo Registro"}</h2>
              <button onClick={()=>{setModal(false);setEditId(null)}} className="text-gray-400 hover:text-white"><X size={20}/></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Funcionário *</label>
                  <select value={form.employee_id} onChange={up('employee_id')} className="input-field">
                    <option value="">— Selecione —</option>
                    {employees.filter(e=>e.status==='ativo').map(e=><option key={e.id} value={e.id}>{e.apelido||e.nome}</option>)}
                  </select>
                </div>
                <div><label className="label">Data *</label><input type="date" value={form.data} onChange={up('data')} className="input-field"/></div>
              </div>

              <div><label className="label">Tipo de Jornada *</label>
                <div className="grid grid-cols-2 gap-2">
                  {JORNADAS.map(([k,cfg]) => (
                    <button key={k} type="button" onClick={()=>mudarJornada(k)}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${form.jornada===k?'':'border-gray-700 bg-gray-800'}`}
                      style={form.jornada===k?{borderColor:cfg.cor,background:cfg.corBg}:{}}>
                      <span className="text-lg mr-2">{k==='DIA_INTEIRO'?'☀️':k==='MEIO_TURNO'?'🌤️':k==='OUTRO'?'🕐':'🚫'}</span>
                      <span className={`text-sm font-semibold ${form.jornada===k?'':'text-gray-400'}`} style={form.jornada===k?{color:cfg.cor}:{}}>{cfg.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-lg p-3 text-sm" style={{background:JORNADA_CONFIG[form.jornada].corBg,border:`1px solid ${JORNADA_CONFIG[form.jornada].cor}30`}}>
                <p style={{color:JORNADA_CONFIG[form.jornada].cor}}>
                  {form.jornada==='DIA_INTEIRO' && 'Jornada completa — 07:00 às 18:00.'}
                  {form.jornada==='MEIO_TURNO' && 'Meio turno — 07:00 às 12:30.'}
                  {form.jornada==='OUTRO' && 'Preencha os horários e descreva o motivo.'}
                  {form.jornada==='NAO_TRABALHOU' && 'Ausência registrada. Nenhuma diária será gerada.'}
                </p>
              </div>

              {isAusencia ? (
                <div className="space-y-3">
                  <div><label className="label">Motivo da ausência</label>
                    <select value={form.absence_reason} onChange={up('absence_reason')} className="input-field">
                      <option value="">— Selecione —</option>
                      {AUSENCIA_MOTIVOS.map(m=><option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div><label className="label">Detalhe adicional</label><input value={form.obs} onChange={up('obs')} placeholder="Opcional..." className="input-field"/></div>
                </div>
              ) : (
                <>
                  <div><label className="label">Local / Obra *</label>
                    <input value={form.local} onChange={up('local')} list="obras-list" placeholder="Nome da obra..." className="input-field"/>
                    <datalist id="obras-list">{worksites.map(w=><option key={w.id} value={w.nome}/>)}</datalist>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="label">Entrada</label><input type="time" value={form.entrada} onChange={up('entrada')} className="input-field"/></div>
                    <div><label className="label">Saída</label><input type="time" value={form.saida} onChange={up('saida')} className="input-field"/></div>
                  </div>
                  {form.entrada && form.saida && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-sm flex gap-6">
                      <span className="text-blue-400">⏱ <strong>{horas}h</strong></span>
                      {emp && <span className="text-gray-400">💵 <strong className="text-white">{fmtR$(emp.diaria||0)}</strong></span>}
                    </div>
                  )}
                  <div className="bg-gray-800 rounded-xl p-4 mb-3">
                    <p className="label mb-3">Valor da Diária</p>
                    <div className="flex gap-3 mb-3">
                      {[false,true].map(v=>(
                        <button key={String(v)} type="button" onClick={()=>setForm(p=>({...p,usar_diaria_custom:v}))}
                          className={`flex-1 py-2 rounded-lg border-2 text-sm font-semibold transition-all ${form.usar_diaria_custom===v?(v?'border-blue-500 bg-blue-500/15 text-blue-400':'border-green-500 bg-green-500/15 text-green-400'):'border-gray-600 text-gray-400'}`}>
                          {v?'💰 Valor personalizado':'✓ Usar diária do cadastro'}
                        </button>
                      ))}
                    </div>
                    {form.usar_diaria_custom ? (
                      <div><label className="label">Valor da diária (R$)</label><input type="number" value={form.diaria_custom} onChange={up('diaria_custom')} placeholder="Ex: 250" className="input-field"/></div>
                    ) : (
                      emp && <p className="text-sm text-gray-400">Diária cadastrada: <span className="text-green-400 font-semibold">R$ {(emp.diaria||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</span></p>
                    )}
                  </div>
                  <div className="bg-gray-800 rounded-xl p-4">
                    <p className="label mb-3">Desconto / Adiantamento</p>
                    <div className="flex gap-3 mb-3">
                      {[true,false].map(v=>(
                        <button key={String(v)} type="button" onClick={()=>setForm(p=>({...p,vale:v,discount_value:v?p.discount_value:''}))}
                          className={`flex-1 py-2 rounded-lg border-2 text-sm font-semibold transition-all ${form.vale===v?(v?'border-green-500 bg-green-500/15 text-green-400':'border-red-500 bg-red-500/15 text-red-400'):'border-gray-600 text-gray-400'}`}>
                          {v?'✓ Houve desconto':'✗ Sem desconto'}
                        </button>
                      ))}
                    </div>
                    {form.vale && <div><label className="label">Valor (R$)</label><input type="number" value={form.discount_value} onChange={up('discount_value')} placeholder="0,00" className="input-field"/></div>}
                  </div>
                  <div>
                    <label className={`label ${form.jornada==='OUTRO'?'text-yellow-400':''}`}>Observações {form.jornada==='OUTRO'?'* (obrigatório)':''}</label>
                    <textarea value={form.obs} onChange={up('obs')} rows={2} placeholder={form.jornada==='OUTRO'?'Descreva o motivo...':'Opcional...'} className={`input-field resize-none ${form.jornada==='OUTRO'&&!form.obs.trim()?'border-yellow-500':''}`}/>
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-gray-800">
              <button onClick={()=>{setModal(false);setEditId(null)}} className="btn-ghost">Cancelar</button>
              <button onClick={salvar} disabled={saving} className="btn-primary">
                {saving?'Salvando...':isAusencia?'🚫 Registrar Ausência':editId?'Salvar Alterações':'Salvar Registro'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
