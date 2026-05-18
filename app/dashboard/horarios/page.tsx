'use client'
import { useWorkLogs, useEmployees, useWorksites } from '@/hooks/useData'
import { useState } from 'react'
import { Clock, Plus, X } from 'lucide-react'
import { format } from 'date-fns'

const hoje = new Date().toISOString().split('T')[0]
const JORNADAS = [
  { k: 'DIA_INTEIRO', label: '☀️ Dia Inteiro', entrada: '07:00', saida: '17:00' },
  { k: 'MEIO_TURNO',  label: '🌤️ Meio Turno',  entrada: '07:00', saida: '12:00' },
  { k: 'OUTRO',       label: '🕐 Outro',         entrada: '',      saida: ''      },
]
const BADGE: Record<string,string> = { DIA_INTEIRO:'badge-green', MEIO_TURNO:'badge-yellow', OUTRO:'badge-gray' }
function calcH(e:string,s:string){if(!e||!s)return 0;const[eh,em]=e.split(':').map(Number),[sh,sm]=s.split(':').map(Number);return+((sh*60+sm-eh*60-em)/60).toFixed(1)}
const fmtR$=(v:number)=>'R$ '+v.toLocaleString('pt-BR',{minimumFractionDigits:2})

export default function HorariosPage(){
  const{logs,loading,add}=useWorkLogs()
  const{employees}=useEmployees()
  const{worksites,add:addSite}=useWorksites()
  const[modal,setModal]=useState(false)
  const[saving,setSaving]=useState(false)
  const[form,setForm]=useState({employee_id:'',data:hoje,local:'',jornada:'DIA_INTEIRO',entrada:'07:00',saida:'17:00',vale:false,valor_vale:'',obs:''})
  const up=(k:string)=>(e:any)=>setForm(p=>({...p,[k]:e.target.value}))
  const mudarJornada=(k:string)=>{const j=JORNADAS.find(x=>x.k===k)!;setForm(p=>({...p,jornada:k,entrada:j.entrada,saida:j.saida}))}
  const salvar=async()=>{
    if(!form.employee_id||!form.data||!form.local)return alert('Preencha os campos obrigatórios')
    if(form.jornada==='OUTRO'&&!form.obs.trim())return alert('Descreva o motivo nas observações')
    setSaving(true)
    try{
      const emp=employees.find(e=>e.id===form.employee_id)!
      await add({employee_id:form.employee_id,employee_name:emp.apelido||emp.nome.split(' ')[0],data:form.data,local:form.local,jornada:form.jornada as any,entrada:form.entrada,saida:form.saida,horas:calcH(form.entrada,form.saida),diaria:emp.diaria||0,vale:form.vale,valor_vale:form.vale?Number(form.valor_vale)||0:0,obs:form.obs})
      if(form.local&&!worksites.find(w=>w.nome===form.local))addSite(form.local)
      setModal(false);setForm({employee_id:'',data:hoje,local:'',jornada:'DIA_INTEIRO',entrada:'07:00',saida:'17:00',vale:false,valor_vale:'',obs:''})
    }catch{alert('Erro ao salvar')}
    setSaving(false)
  }
  const emp=employees.find(e=>e.id===form.employee_id)
  const horas=calcH(form.entrada,form.saida)
  if(loading)return<div className="p-6 flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-gray-700 border-t-blue-500 rounded-full animate-spin"/></div>
  return(
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-extrabold text-white mb-1">Horários</h1><p className="text-gray-400 text-sm">{logs.length} registros</p></div>
        <button onClick={()=>setModal(true)} className="btn-primary"><Plus size={16}/> Novo Registro</button>
      </div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[{l:'Registros',v:logs.length,c:'text-blue-400'},{l:'Total Horas',v:logs.reduce((s,r)=>s+(r.horas||0),0).toFixed(1)+'h',c:'text-purple-400'},{l:'Total Bruto',v:fmtR$(logs.reduce((s,r)=>s+(r.diaria||0),0)),c:'text-green-400'},{l:'Total Vales',v:fmtR$(logs.reduce((s,r)=>s+(r.valor_vale||0),0)),c:'text-yellow-400'}].map(({l,v,c})=>(
          <div key={l} className="card"><p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{l}</p><p className={`text-xl font-extrabold ${c}`}>{v}</p></div>
        ))}
      </div>
      <div className="card">
        {logs.length===0?(<div className="text-center py-16"><Clock size={40} className="text-gray-600 mx-auto mb-4"/><p className="text-gray-400">Nenhum registro lançado</p></div>):(
          <div className="overflow-x-auto"><table className="w-full">
            <thead><tr className="border-b border-gray-800">{['Funcionário','Data','Jornada','Local','Horas','Diária','Vale','Saldo'].map(h=><th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase">{h}</th>)}</tr></thead>
            <tbody>{logs.map((r,i)=><tr key={r.id} className={`border-b border-gray-800 hover:bg-gray-800/50 ${i%2===1?'bg-gray-800/20':''}`}>
              <td className="py-3 px-4 text-white font-medium text-sm">{r.employee_name}</td>
              <td className="py-3 px-4 text-gray-400 text-sm">{r.data?format(new Date(r.data+'T12:00:00'),'dd/MM/yy'):'—'}</td>
              <td className="py-3 px-4"><span className={BADGE[r.jornada]||'badge-gray'}>{JORNADAS.find(j=>j.k===r.jornada)?.label||r.jornada}</span></td>
              <td className="py-3 px-4 text-gray-400 text-sm max-w-[120px] truncate">{r.local||'—'}</td>
              <td className="py-3 px-4"><span className="badge-purple">{r.horas||0}h</span></td>
              <td className="py-3 px-4 text-green-400 font-semibold text-sm">{fmtR$(r.diaria||0)}</td>
              <td className="py-3 px-4">{r.vale?<span className="badge-yellow">{fmtR$(r.valor_vale||0)}</span>:<span className="badge-gray">Não</span>}</td>
              <td className="py-3 px-4 text-white font-semibold text-sm">{fmtR$((r.diaria||0)-(r.valor_vale||0))}</td>
            </tr>)}</tbody>
          </table></div>
        )}
      </div>
      {modal&&(
        <div onClick={e=>{if(e.target===e.currentTarget)setModal(false)}} className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-xl shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b border-gray-800 sticky top-0 bg-gray-900"><h2 className="text-white font-bold text-lg">Novo Registro</h2><button onClick={()=>setModal(false)} className="text-gray-400 hover:text-white"><X size={20}/></button></div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Funcionário *</label><select value={form.employee_id} onChange={up('employee_id')} className="input-field"><option value="">— Selecione —</option>{employees.filter(e=>e.status==='ativo').map(e=><option key={e.id} value={e.id}>{e.apelido||e.nome}</option>)}</select></div>
                <div><label className="label">Data *</label><input type="date" value={form.data} onChange={up('data')} className="input-field"/></div>
              </div>
              <div><label className="label">Local / Obra *</label><input value={form.local} onChange={up('local')} list="obras-list" placeholder="Nome da obra..." className="input-field"/><datalist id="obras-list">{worksites.map(w=><option key={w.id} value={w.nome}/>)}</datalist></div>
              <div><label className="label">Tipo de Jornada *</label>
                <div className="grid grid-cols-3 gap-2">{JORNADAS.map(j=><button key={j.k} type="button" onClick={()=>mudarJornada(j.k)} className={`p-3 rounded-xl border-2 text-center transition-all ${form.jornada===j.k?'border-blue-500 bg-blue-500/15':'border-gray-700 bg-gray-800'}`}><p className="text-lg mb-1">{j.label.split(' ')[0]}</p><p className={`text-xs font-semibold ${form.jornada===j.k?'text-blue-400':'text-gray-400'}`}>{j.label.split(' ').slice(1).join(' ')}</p></button>)}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Entrada</label><input type="time" value={form.entrada} onChange={up('entrada')} className="input-field"/></div>
                <div><label className="label">Saída</label><input type="time" value={form.saida} onChange={up('saida')} className="input-field"/></div>
              </div>
              {form.entrada&&form.saida&&<div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 flex gap-6 text-sm"><span className="text-blue-400">⏱ <strong>{horas}h</strong></span>{emp&&<span className="text-gray-400">💵 <strong className="text-white">{fmtR$(emp.diaria||0)}</strong></span>}</div>}
              <div className="bg-gray-800 rounded-xl p-4"><p className="label mb-3">Vale</p>
                <div className="flex gap-3 mb-3">{[true,false].map(v=><button key={String(v)} type="button" onClick={()=>setForm(p=>({...p,vale:v,valor_vale:v?p.valor_vale:''}))} className={`flex-1 py-2 rounded-lg border-2 text-sm font-semibold transition-all ${form.vale===v?(v?'border-green-500 bg-green-500/15 text-green-400':'border-red-500 bg-red-500/15 text-red-400'):'border-gray-600 text-gray-400'}`}>{v?'✓ Recebeu vale':'✗ Não recebeu'}</button>)}</div>
                {form.vale&&<div><label className="label">Valor (R$)</label><input type="number" value={form.valor_vale} onChange={up('valor_vale')} placeholder="0,00" className="input-field"/></div>}
              </div>
              <div><label className={`label ${form.jornada==='OUTRO'?'text-yellow-400':''}`}>Observações {form.jornada==='OUTRO'?'* (obrigatório)':''}</label><textarea value={form.obs} onChange={up('obs')} rows={3} placeholder={form.jornada==='OUTRO'?'Descreva o motivo...':'Opcional...'} className={`input-field resize-none ${form.jornada==='OUTRO'&&!form.obs.trim()?'border-yellow-500':''}`}/></div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-gray-800"><button onClick={()=>setModal(false)} className="btn-ghost">Cancelar</button><button onClick={salvar} disabled={saving} className="btn-primary">{saving?'Salvando...':'Salvar Registro'}</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
