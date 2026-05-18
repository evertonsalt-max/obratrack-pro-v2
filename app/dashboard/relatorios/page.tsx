'use client'
import { useWorkLogs, useEmployees, usePayments, useEmployeeTaxes, useFinancialSummary } from '@/hooks/useData'
import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, Legend } from 'recharts'
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import * as XLSX from 'xlsx'
import { MESES, JORNADA_CONFIG, DESCONTO_TIPOS } from '@/types'
import { Download, Printer, Filter, TrendingUp, Users, DollarSign, Shield, FileText, AlertCircle } from 'lucide-react'

const fmtR$ = (v: any) => { try { return 'R$ ' + (Number(v)||0).toLocaleString } catch { return 'R$ 0,00' } // ('pt-BR',{minimumFractionDigits:2})
const fmtBR = (d: string) => { try{return format(new Date(d+'T12:00:00'),'dd/MM/yy')}catch{return d} }
type Aba = 'empresa'|'jornadas'|'financeiro'|'encargos'|'funcionario'

export default function RelatoriosPage() {
  const { logs }     = useWorkLogs()
  const { employees }= useEmployees()
  const { payments } = usePayments()
  const { taxes }    = useEmployeeTaxes()
  const summary      = useFinancialSummary(employees, logs, payments, taxes)

  const [aba,  setAba]  = useState<Aba>('empresa')
  const [fF,   setFF]   = useState('')
  const [fI,   setFI]   = useState('')
  const [fFim, setFFim] = useState('')
  const [fJ,   setFJ]   = useState('')
  const [fMes, setFMes] = useState('')
  const [fAno, setFAno] = useState(String(new Date().getFullYear()))

  const setPeriodo = (p: string) => {
    const hoje = new Date()
    if(p==='semana'){setFI(format(startOfWeek(hoje,{weekStartsOn:1}),'yyyy-MM-dd'));setFFim(format(endOfWeek(hoje,{weekStartsOn:1}),'yyyy-MM-dd'))}
    else if(p==='mes'){setFI(format(startOfMonth(hoje),'yyyy-MM-dd'));setFFim(format(endOfMonth(hoje),'yyyy-MM-dd'))}
    else if(p==='30d'){setFI(format(subDays(hoje,30),'yyyy-MM-dd'));setFFim(format(hoje,'yyyy-MM-dd'))}
    else{setFI('');setFFim('')}
  }

  const lista = logs.filter(r =>
    (!fF||r.employee_id===fF) &&
    (!fI||r.data>=fI) &&
    (!fFim||r.data<=fFim) &&
    (!fJ||r.jornada===fJ)
  ).sort((a,b)=>a.data.localeCompare(b.data))

  const listaTrabalhou = lista.filter(l=>l.jornada!=='NAO_TRABALHOU')
  const listaAusencias = lista.filter(l=>l.jornada==='NAO_TRABALHOU')
  const listaOutro     = lista.filter(l=>l.jornada==='OUTRO')
  const taxasFilt      = taxes.filter(t=>(!fF||t.employee_id===fF)&&(!fMes||t.month===Number(fMes))&&(!fAno||t.year===Number(fAno)))

  const totBruto    = summary.reduce((s,f)=>s+(f.bruto||0),0)
  const totDesc     = summary.reduce((s,f)=>s+(f.descontos||0),0)
  const totPago     = summary.reduce((s,f)=>s+(f.pago||0),0)
  const totSaldo    = summary.reduce((s,f)=>s+Math.max(0,f.saldo||0),0)
  const totINSS     = summary.reduce((s,f)=>s+(f.inss||0),0)
  const totFGTS     = summary.reduce((s,f)=>s+(f.fgts||0),0)
  const totEncargos = totINSS+totFGTS
  const totFaltas   = summary.reduce((s,f)=>s+(f.faltas||0),0)
  const totHOutro   = summary.reduce((s,f)=>s+(f.horasOutro||0),0)

  const dias7 = Array.from({length:7},(_,i)=>{
    const d=subDays(new Date(),6-i);const iso=d.toISOString().split('T')[0]
    return{name:format(d,'EEE',{locale:ptBR}),Bruto:listaTrabalhou.filter(r=>r.data===iso).reduce((s,r)=>s+(Number(r.diaria)||0),0)}
  })
  const barData = summary.slice(0,8).map(s=>({name:s.employee.apelido||s.employee.nome.split(' ')[0],Bruto:s.bruto,Descontos:s.descontos,Pago:s.pago}))
  const jornadaData = Object.entries(JORNADA_CONFIG).map(([k,v])=>({name:v.label,value:lista.filter(r=>r.jornada===k).length,fill:v.cor})).filter(d=>d.value>0)

  const exportarExcel = () => {
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([
      ['Funcionário','Data','Jornada','Local','Entrada','Saída','Horas','Diária','Desconto','Líquido','Motivo','Obs'],
      ...lista.map(r=>[r.employee_name,fmtBR(r.data),JORNADA_CONFIG[r.jornada]?.label||r.jornada,r.local||'',r.entrada||'',r.saida||'',Number(r.horas)||0,Number(r.diaria)||0,Number(r.discount_value)||Number(r.valor_vale)||0,(Number(r.diaria)||0)-(Number(r.discount_value)||Number(r.valor_vale)||0),r.absence_reason||'',r.obs||''])
    ]),'Registros')
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([
      ['Funcionário','Data','Motivo','Obs'],
      ...listaAusencias.map(r=>[r.employee_name,fmtBR(r.data),r.absence_reason||'',r.obs||''])
    ]),'Ausências')
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([
      ['Funcionário','Dias','Faltas','H.Outro','Bruto','Descontos','Líquido','Pago','Saldo','INSS','FGTS'],
      ...summary.map(s=>[s.employee.nome,s.dias,s.faltas,s.horasOutro.toFixed(1),s.bruto,s.descontos,s.liquido,s.pago,s.saldo,s.inss,s.fgts])
    ]),'Resumo')
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([
      ['Funcionário','Data','Valor','Tipo','Obs'],
      ...payments.filter(p=>!fF||p.employee_id===fF).map(p=>[p.employee_name,fmtBR(p.data),p.valor,p.tipo,p.obs||''])
    ]),'Pagamentos')
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([
      ['Funcionário','Mês','Ano','INSS','FGTS','Total','Obs'],
      ...taxasFilt.map(t=>{const emp=employees.find(e=>e.id===t.employee_id);return[emp?.nome||'',MESES[t.month-1],t.year,t.inss_value,t.fgts_value,(Number(t.inss_value)||0)+(Number(t.fgts_value)||0),t.notes||'']})
    ]),'Encargos')
    XLSX.writeFile(wb,`obratrack-${format(new Date(),'yyyy-MM-dd')}.xlsx`)
  }

  const exportarCSV = () => {
    const rows=[['Funcionário','Data','Jornada','Local','Horas','Diária','Desconto','Ausência','Obs'],...lista.map(r=>[r.employee_name,r.data,JORNADA_CONFIG[r.jornada]?.label,r.local||'',Number(r.horas)||0,Number(r.diaria)||0,Number(r.discount_value)||Number(r.valor_vale)||0,r.absence_reason||'',r.obs||''])]
    const csv=rows.map(r=>r.map(c=>'"'+String(c||'').replace(/"/g,'""')+'"').join(',')).join('\n')
    const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'})
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`obratrack-${format(new Date(),'yyyy-MM-dd')}.csv`;a.click()
  }

  const ABAS: {k:Aba;label:string;icon:any}[] = [
    {k:'empresa',    label:'Visão Geral',    icon:TrendingUp},
    {k:'jornadas',   label:'Jornadas',       icon:FileText},
    {k:'financeiro', label:'Financeiro',     icon:DollarSign},
    {k:'encargos',   label:'Encargos',       icon:Shield},
    {k:'funcionario',label:'Por Funcionário',icon:Users},
  ]

  return (
    <div className="p-6 space-y-5">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-extrabold text-white mb-1">Relatórios</h1><p className="text-gray-400 text-sm">{lista.length} registros filtrados</p></div>
        <div className="flex gap-2">
          <button onClick={()=>window.print()} className="btn-ghost"><Printer size={14}/> Imprimir</button>
          <button onClick={exportarCSV} className="btn-ghost text-cyan-400 border-cyan-400/30"><Download size={14}/> CSV</button>
          <button onClick={exportarExcel} className="bg-green-800 hover:bg-green-700 text-green-300 font-semibold px-4 py-2 rounded-lg text-sm flex items-center gap-2"><Download size={14}/> Excel</button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {ABAS.map(({k,label,icon:Icon})=>(
          <button key={k} onClick={()=>setAba(k)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${aba===k?'bg-blue-500/20 text-blue-400 border border-blue-500/30':'text-gray-400 hover:text-gray-200 border border-gray-800 hover:bg-gray-800'}`}>
            <Icon size={14}/>{label}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="flex gap-3 flex-wrap items-end">
          <div><label className="label">Funcionário</label>
            <select value={fF} onChange={e=>setFF(e.target.value)} className="input-field min-w-[160px]">
              <option value="">Todos</option>{employees.map(e=><option key={e.id} value={e.id}>{e.apelido||e.nome}</option>)}
            </select>
          </div>
          {aba!=='encargos'&&(<>
            <div><label className="label">De</label><input type="date" value={fI} onChange={e=>setFI(e.target.value)} className="input-field"/></div>
            <div><label className="label">Até</label><input type="date" value={fFim} onChange={e=>setFFim(e.target.value)} className="input-field"/></div>
            <div className="flex gap-2 self-end">{[{k:'semana',l:'Semana'},{k:'mes',l:'Mês'},{k:'30d',l:'30d'}].map(p=><button key={p.k} onClick={()=>setPeriodo(p.k)} className="btn-ghost text-xs py-2">{p.l}</button>)}</div>
          </>)}
          {aba==='jornadas'&&(<div><label className="label">Jornada</label><select value={fJ} onChange={e=>setFJ(e.target.value)} className="input-field"><option value="">Todas</option>{Object.entries(JORNADA_CONFIG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></div>)}
          {aba==='encargos'&&(<>
            <div><label className="label">Mês</label><select value={fMes} onChange={e=>setFMes(e.target.value)} className="input-field"><option value="">Todos</option>{MESES.map((m,i)=><option key={i} value={i+1}>{m}</option>)}</select></div>
            <div><label className="label">Ano</label><select value={fAno} onChange={e=>setFAno(e.target.value)} className="input-field">{[new Date().getFullYear(),new Date().getFullYear()-1].map(a=><option key={a}>{a}</option>)}</select></div>
          </>)}
          {(fF||fI||fFim||fJ||fMes)&&<button onClick={()=>{setFF('');setFI('');setFFim('');setFJ('');setFMes('')}} className="btn-ghost self-end text-xs"><Filter size={12}/> Limpar</button>}
        </div>
      </div>

      {aba==='empresa'&&(
        <div className="space-y-5">
          <div className="grid grid-cols-4 gap-4">
            {[{l:'Total Bruto',v:fmtR$(totBruto),c:'text-white'},{l:'Total Pago',v:fmtR$(totPago),c:'text-green-400'},{l:'Em Aberto',v:fmtR$(totSaldo),c:'text-red-400'},{l:'Total Encargos',v:fmtR$(totEncargos),c:'text-purple-400'}].map(({l,v,c})=><div key={l} className="card"><p className="text-xs font-semibold text-gray-400 uppercase mb-2">{l}</p><p className={`text-xl font-extrabold ${c}`}>{v}</p></div>)}
          </div>
          <div className="grid grid-cols-4 gap-4">
            {[{l:'Faltas/Ausências',v:totFaltas,c:'text-red-400'},{l:'H. Personalizadas',v:totHOutro.toFixed(1)+'h',c:'text-yellow-400'},{l:'Total INSS',v:fmtR$(totINSS),c:'text-blue-400'},{l:'Total FGTS',v:fmtR$(totFGTS),c:'text-cyan-400'}].map(({l,v,c})=><div key={l} className="card"><p className="text-xs font-semibold text-gray-400 uppercase mb-2">{l}</p><p className={`text-xl font-extrabold ${c}`}>{v}</p></div>)}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="card">
              <h3 className="text-white font-bold mb-4">Diárias — Últimos 7 dias</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={dias7}><defs><linearGradient id="gB" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937"/><XAxis dataKey="name" tick={{fill:'#6b7280',fontSize:11}} axisLine={false} tickLine={false}/><YAxis tick={{fill:'#6b7280',fontSize:11}} axisLine={false} tickLine={false}/>
                  <Tooltip contentStyle={{background:'#111827',border:'1px solid #1f2937',borderRadius:'8px',fontSize:'12px'}}/><Area type="monotone" dataKey="Bruto" stroke="#3b82f6" fill="url(#gB)" strokeWidth={2}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {jornadaData.length>0&&(<div className="card"><h3 className="text-white font-bold mb-4">Por Jornada</h3>
              <ResponsiveContainer width="100%" height={200}><PieChart><Pie data={jornadaData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={10}>{jornadaData.map((e,i)=><Cell key={i} fill={e.fill}/>)}</Pie><Tooltip contentStyle={{background:'#111827',border:'1px solid #1f2937',borderRadius:'8px',fontSize:'12px'}}/></PieChart></ResponsiveContainer>
            </div>)}
          </div>
          {barData.length>0&&(<div className="card"><h3 className="text-white font-bold mb-4">Bruto × Descontos × Pago</h3>
            <ResponsiveContainer width="100%" height={200}><BarChart data={barData}><CartesianGrid strokeDasharray="3 3" stroke="#1f2937"/><XAxis dataKey="name" tick={{fill:'#6b7280',fontSize:11}} axisLine={false} tickLine={false}/><YAxis tick={{fill:'#6b7280',fontSize:11}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{background:'#111827',border:'1px solid #1f2937',borderRadius:'8px',fontSize:'12px'}}/><Legend wrapperStyle={{fontSize:'12px',color:'#6b7280'}}/><Bar dataKey="Bruto" fill="#3b82f6" radius={[4,4,0,0]}/><Bar dataKey="Descontos" fill="#f59e0b" radius={[4,4,0,0]}/><Bar dataKey="Pago" fill="#22c55e" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer>
          </div>)}
          <div className="card"><h3 className="text-white font-bold mb-4">Resumo Geral</h3>
            <div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-gray-800">{['Funcionário','Dias','Faltas','H.Outro','Bruto','Descontos','Líquido','Pago','Saldo','INSS','FGTS'].map(h=><th key={h} className="text-left py-3 px-3 text-xs font-semibold text-gray-400 uppercase whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody>{summary.map((s,i)=><tr key={s.employee.id} className={`border-b border-gray-800 hover:bg-gray-800/50 ${i%2===1?'bg-gray-800/20':''}`}>
                <td className="py-3 px-3 text-white font-medium text-sm">{s.employee.nome}</td>
                <td className="py-3 px-3 text-green-400 text-sm">{s.dias}</td>
                <td className="py-3 px-3 text-red-400 text-sm">{s.faltas}</td>
                <td className="py-3 px-3 text-yellow-400 text-sm">{s.horasOutro.toFixed(1)}h</td>
                <td className="py-3 px-3 text-white text-sm">{fmtR$(s.bruto)}</td>
                <td className="py-3 px-3 text-yellow-400 text-sm">{fmtR$(s.descontos)}</td>
                <td className="py-3 px-3 text-blue-400 text-sm">{fmtR$(s.liquido)}</td>
                <td className="py-3 px-3 text-green-400 text-sm">{fmtR$(s.pago)}</td>
                <td className="py-3 px-3"><span className={`font-bold text-sm ${(s.saldo||0)>0?'text-red-400':'text-green-400'}`}>{fmtR$(s.saldo)}</span></td>
                <td className="py-3 px-3 text-blue-300 text-sm">{fmtR$(s.inss)}</td>
                <td className="py-3 px-3 text-cyan-400 text-sm">{fmtR$(s.fgts)}</td>
              </tr>)}</tbody>
              <tfoot><tr className="border-t-2 border-gray-700 bg-gray-800/40">
                <td className="py-3 px-3 text-white font-bold text-sm">TOTAL</td>
                <td className="py-3 px-3 text-green-400 font-bold">{summary.reduce((s,f)=>s+f.dias,0)}</td>
                <td className="py-3 px-3 text-red-400 font-bold">{totFaltas}</td>
                <td className="py-3 px-3 text-yellow-400 font-bold">{totHOutro.toFixed(1)}h</td>
                <td className="py-3 px-3 text-white font-bold">{fmtR$(totBruto)}</td>
                <td className="py-3 px-3 text-yellow-400 font-bold">{fmtR$(totDesc)}</td>
                <td className="py-3 px-3 text-blue-400 font-bold">{fmtR$(totBruto-totDesc)}</td>
                <td className="py-3 px-3 text-green-400 font-bold">{fmtR$(totPago)}</td>
                <td className="py-3 px-3 text-red-400 font-bold">{fmtR$(totSaldo)}</td>
                <td className="py-3 px-3 text-blue-300 font-bold">{fmtR$(totINSS)}</td>
                <td className="py-3 px-3 text-cyan-400 font-bold">{fmtR$(totFGTS)}</td>
              </tr></tfoot>
            </table></div>
          </div>
        </div>
      )}

      {aba==='jornadas'&&(
        <div className="space-y-5">
          <div className="grid grid-cols-4 gap-4">{Object.entries(JORNADA_CONFIG).map(([k,v])=>{const n=lista.filter(r=>r.jornada===k).length;const h=lista.filter(r=>r.jornada===k).reduce((s,r)=>s+(Number(r.horas)||0),0);return(<div key={k} className="card" style={{borderColor:v.cor+'30'}}><p className="text-xs font-semibold text-gray-400 uppercase mb-1">{v.label}</p><p className="text-2xl font-extrabold text-white">{n}</p><p className="text-xs text-gray-500 mt-1">{h.toFixed(1)}h</p></div>)})}</div>
          {listaAusencias.length>0&&(<div className="card"><div className="flex items-center gap-2 mb-4"><AlertCircle size={16} className="text-red-400"/><h3 className="text-white font-bold">Faltas e Ausências ({listaAusencias.length})</h3></div>
            <div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-gray-800">{['Funcionário','Data','Motivo','Obs'].map(h=><th key={h} className="text-left py-3 px-3 text-xs font-semibold text-gray-400 uppercase">{h}</th>)}</tr></thead>
              <tbody>{listaAusencias.map((r,i)=><tr key={r.id} className={`border-b border-gray-800 hover:bg-gray-800/50 ${i%2===1?'bg-gray-800/20':''}`}>
                <td className="py-3 px-3 text-white font-medium text-sm">{r.employee_name}</td>
                <td className="py-3 px-3 text-gray-400 text-sm">{fmtBR(r.data)}</td>
                <td className="py-3 px-3"><span className="badge-red">{r.absence_reason||'Sem motivo'}</span></td>
                <td className="py-3 px-3 text-gray-400 text-sm">{r.obs||'—'}</td>
              </tr>)}</tbody>
            </table></div>
          </div>)}
          {listaOutro.length>0&&(<div className="card"><h3 className="text-white font-bold mb-4">Horas Personalizadas ({listaOutro.length})</h3>
            <div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-gray-800">{['Funcionário','Data','Entrada','Saída','Horas','Diária','Obs'].map(h=><th key={h} className="text-left py-3 px-3 text-xs font-semibold text-gray-400 uppercase">{h}</th>)}</tr></thead>
              <tbody>{listaOutro.map((r,i)=><tr key={r.id} className={`border-b border-gray-800 hover:bg-gray-800/50 ${i%2===1?'bg-gray-800/20':''}`}>
                <td className="py-3 px-3 text-white font-medium text-sm">{r.employee_name}</td>
                <td className="py-3 px-3 text-gray-400 text-sm">{fmtBR(r.data)}</td>
                <td className="py-3 px-3 text-gray-300 text-sm">{r.entrada||'—'}</td>
                <td className="py-3 px-3 text-gray-300 text-sm">{r.saida||'—'}</td>
                <td className="py-3 px-3"><span className="badge-yellow">{Number(r.horas)||0}h</span></td>
                <td className="py-3 px-3 text-green-400 font-semibold text-sm">{fmtR$(r.diaria)}</td>
                <td className="py-3 px-3 text-gray-400 text-sm">{r.obs||'—'}</td>
              </tr>)}</tbody>
            </table></div>
          </div>)}
          <div className="card"><h3 className="text-white font-bold mb-4">Todos os Registros ({lista.length})</h3>
            <div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-gray-800">{['Funcionário','Data','Jornada','Entrada','Saída','Horas','Diária','Desconto','Obs'].map(h=><th key={h} className="text-left py-3 px-3 text-xs font-semibold text-gray-400 uppercase whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody>{lista.map((r,i)=>{const cfg=JORNADA_CONFIG[r.jornada]||JORNADA_CONFIG.DIA_INTEIRO;const desc=Number(r.discount_value)||Number(r.valor_vale)||0;const isAus=r.jornada==='NAO_TRABALHOU';return(
                <tr key={r.id} className={`border-b border-gray-800 hover:bg-gray-800/50 ${i%2===1?'bg-gray-800/20':''} ${isAus?'opacity-60':''}`}>
                  <td className="py-2 px-3 text-white font-medium text-sm">{r.employee_name}</td>
                  <td className="py-2 px-3 text-gray-400 text-sm whitespace-nowrap">{fmtBR(r.data)}</td>
                  <td className="py-2 px-3"><span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{background:cfg.corBg,color:cfg.cor}}>{cfg.label}</span></td>
                  <td className="py-2 px-3 text-gray-300 text-sm">{r.entrada||'—'}</td>
                  <td className="py-2 px-3 text-gray-300 text-sm">{r.saida||'—'}</td>
                  <td className="py-2 px-3">{isAus?<span className="badge-red">Falta</span>:<span className="badge-purple">{Number(r.horas)||0}h</span>}</td>
                  <td className="py-2 px-3 text-sm font-semibold" style={{color:isAus?'#6b7280':'#22c55e'}}>{isAus?'—':fmtR$(r.diaria)}</td>
                  <td className="py-2 px-3 text-yellow-400 text-sm">{desc>0?fmtR$(desc):'—'}</td>
                  <td className="py-2 px-3 text-gray-400 text-xs max-w-[160px] truncate">{r.absence_reason||r.obs||'—'}</td>
                </tr>
              )})}</tbody>
            </table></div>
          </div>
        </div>
      )}

      {aba==='financeiro'&&(
        <div className="space-y-5">
          <div className="grid grid-cols-4 gap-4">{[{l:'Total Bruto',v:fmtR$(totBruto),c:'text-white'},{l:'Descontos',v:fmtR$(totDesc),c:'text-yellow-400'},{l:'Líquido',v:fmtR$(totBruto-totDesc),c:'text-blue-400'},{l:'Total Pago',v:fmtR$(totPago),c:'text-green-400'}].map(({l,v,c})=><div key={l} className="card"><p className="text-xs font-semibold text-gray-400 uppercase mb-2">{l}</p><p className={`text-xl font-extrabold ${c}`}>{v}</p></div>)}</div>
          <div className="card"><h3 className="text-white font-bold mb-4">Saldo por Funcionário</h3>
            <div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-gray-800">{['Funcionário','Bruto','Descontos','Líquido','Pago','Saldo'].map(h=><th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase">{h}</th>)}</tr></thead>
              <tbody>{summary.filter(s=>!fF||s.employee.id===fF).map((s,i)=><tr key={s.employee.id} className={`border-b border-gray-800 hover:bg-gray-800/50 ${i%2===1?'bg-gray-800/20':''}`}>
                <td className="py-3 px-4 text-white font-medium text-sm">{s.employee.nome}</td>
                <td className="py-3 px-4 text-white text-sm">{fmtR$(s.bruto)}</td>
                <td className="py-3 px-4 text-yellow-400 text-sm">{fmtR$(s.descontos)}</td>
                <td className="py-3 px-4 text-blue-400 font-semibold text-sm">{fmtR$(s.liquido)}</td>
                <td className="py-3 px-4 text-green-400 text-sm">{fmtR$(s.pago)}</td>
                <td className="py-3 px-4"><span className={`font-bold text-sm ${(s.saldo||0)>0?'text-red-400':'text-green-400'}`}>{fmtR$(s.saldo)}</span></td>
              </tr>)}</tbody>
            </table></div>
          </div>
          <div className="card"><h3 className="text-white font-bold mb-4">Histórico de Pagamentos</h3>
            <div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-gray-800">{['Funcionário','Data','Valor','Tipo','Obs'].map(h=><th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase">{h}</th>)}</tr></thead>
              <tbody>{payments.filter(p=>!fF||p.employee_id===fF).map((p,i)=><tr key={p.id} className={`border-b border-gray-800 hover:bg-gray-800/50 ${i%2===1?'bg-gray-800/20':''}`}>
                <td className="py-3 px-4 text-white font-medium text-sm">{p.employee_name}</td>
                <td className="py-3 px-4 text-gray-400 text-sm">{fmtBR(p.data)}</td>
                <td className="py-3 px-4 text-green-400 font-bold text-sm">{fmtR$(p.valor)}</td>
                <td className="py-3 px-4"><span className="badge-blue">{p.tipo}</span></td>
                <td className="py-3 px-4 text-gray-500 text-sm">{p.obs||'—'}</td>
              </tr>)}</tbody>
            </table></div>
          </div>
        </div>
      )}

      {aba==='encargos'&&(
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-4">{[{l:'Total INSS',v:fmtR$(taxasFilt.reduce((s,t)=>s+(Number(t.inss_value)||0),0)),c:'text-blue-400'},{l:'Total FGTS',v:fmtR$(taxasFilt.reduce((s,t)=>s+(Number(t.fgts_value)||0),0)),c:'text-cyan-400'},{l:'Total Encargos',v:fmtR$(taxasFilt.reduce((s,t)=>s+(Number(t.inss_value)||0)+(Number(t.fgts_value)||0),0)),c:'text-purple-400'}].map(({l,v,c})=><div key={l} className="card"><p className="text-xs font-semibold text-gray-400 uppercase mb-2">{l}</p><p className={`text-xl font-extrabold ${c}`}>{v}</p></div>)}</div>
          <div className="card"><h3 className="text-white font-bold mb-4">Detalhamento</h3>
            <div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-gray-800">{['Funcionário','Mês','Ano','INSS','FGTS','Total','Obs'].map(h=><th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase">{h}</th>)}</tr></thead>
              <tbody>{taxasFilt.map((t,i)=>{const emp=employees.find(e=>e.id===t.employee_id);return(<tr key={t.id} className={`border-b border-gray-800 hover:bg-gray-800/50 ${i%2===1?'bg-gray-800/20':''}`}>
                <td className="py-3 px-4 text-white font-medium text-sm">{emp?.nome||'—'}</td>
                <td className="py-3 px-4 text-gray-400 text-sm">{MESES[t.month-1]}</td>
                <td className="py-3 px-4 text-gray-400 text-sm">{t.year}</td>
                <td className="py-3 px-4 text-blue-400 text-sm">{fmtR$(t.inss_value)}</td>
                <td className="py-3 px-4 text-cyan-400 text-sm">{fmtR$(t.fgts_value)}</td>
                <td className="py-3 px-4 text-purple-400 font-bold text-sm">{fmtR$((Number(t.inss_value)||0)+(Number(t.fgts_value)||0))}</td>
                <td className="py-3 px-4 text-gray-500 text-sm">{t.notes||'—'}</td>
              </tr>)})}</tbody>
            </table></div>
          </div>
        </div>
      )}

      {aba==='funcionario'&&(
        <div className="space-y-5">
          {summary.filter(s=>!fF||s.employee.id===fF).map(s=>{
            const empLogs=logs.filter(l=>l.employee_id===s.employee.id&&(!fI||l.data>=fI)&&(!fFim||l.data<=fFim)).sort((a,b)=>a.data.localeCompare(b.data))
            const empPags=payments.filter(p=>p.employee_id===s.employee.id)
            const ausencias=empLogs.filter(l=>l.jornada==='NAO_TRABALHOU')
            const outros=empLogs.filter(l=>l.jornada==='OUTRO')
            return(
              <div key={s.employee.id} className="card space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-gray-800">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-lg">{s.employee.nome.slice(0,2).toUpperCase()}</div>
                    <div><p className="text-white font-bold text-lg">{s.employee.nome}</p><p className="text-gray-400 text-sm">{s.employee.funcao} · Diária: {fmtR$(s.employee.diaria)}</p></div>
                  </div>
                  <div className="text-right"><p className="text-gray-400 text-xs mb-1">Saldo atual</p><p className={`text-2xl font-extrabold ${(s.saldo||0)>0?'text-red-400':'text-green-400'}`}>{fmtR$(s.saldo)}</p></div>
                </div>
                <div className="grid grid-cols-4 gap-3">{[{l:'Dias Trab.',v:s.dias,c:'text-green-400'},{l:'Faltas',v:s.faltas,c:'text-red-400'},{l:'Dia Inteiro',v:s.diasInteiros,c:'text-blue-400'},{l:'Meio Turno',v:s.meiosTurnos,c:'text-yellow-400'}].map(({l,v,c})=><div key={l} className="bg-gray-800/50 rounded-lg p-3"><p className="text-xs text-gray-400 mb-1">{l}</p><p className={`font-bold text-xl ${c}`}>{v}</p></div>)}</div>
                <div className="grid grid-cols-3 gap-3">{[{l:'Bruto',v:s.bruto,c:'text-white'},{l:'Descontos',v:s.descontos,c:'text-yellow-400'},{l:'Líquido',v:s.liquido,c:'text-blue-400'},{l:'Pago',v:s.pago,c:'text-green-400'},{l:'INSS',v:s.inss,c:'text-blue-300'},{l:'FGTS',v:s.fgts,c:'text-cyan-400'}].map(({l,v,c})=><div key={l} className="bg-gray-800/30 rounded-lg p-3"><p className="text-xs text-gray-400 mb-1">{l}</p><p className={`font-bold text-sm ${c}`}>{fmtR$(v)}</p></div>)}</div>
                {ausencias.length>0&&(<div><h4 className="text-red-400 font-semibold text-sm mb-2 flex items-center gap-1"><AlertCircle size={13}/> Faltas ({ausencias.length})</h4><div className="space-y-1">{ausencias.map(r=><div key={r.id} className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 flex items-center gap-4"><span className="text-gray-300 text-sm">{fmtBR(r.data)}</span><span className="text-red-400 text-sm">{r.absence_reason||'Sem motivo'}</span>{r.obs&&<span className="text-gray-500 text-xs">{r.obs}</span>}</div>)}</div></div>)}
                {outros.length>0&&(<div><h4 className="text-yellow-400 font-semibold text-sm mb-2">⏱ Horas Personalizadas ({outros.length}) · {s.horasOutro.toFixed(1)}h</h4><div className="space-y-1">{outros.map(r=><div key={r.id} className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2 flex items-center gap-4 flex-wrap"><span className="text-gray-300 text-sm">{fmtBR(r.data)}</span><span className="text-yellow-400 text-sm">{r.entrada||'?'}→{r.saida||'?'} ({Number(r.horas)||0}h)</span><span className="text-green-400 text-sm">{fmtR$(r.diaria)}</span>{r.obs&&<span className="text-gray-400 text-xs italic">{r.obs}</span>}</div>)}</div></div>)}
                {empPags.length>0&&(<div><h4 className="text-white font-semibold text-sm mb-2">Pagamentos</h4><div className="space-y-1">{empPags.map(p=><div key={p.id} className="bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2 flex items-center gap-4"><span className="text-gray-300 text-sm">{fmtBR(p.data)}</span><span className="text-green-400 font-bold text-sm">{fmtR$(p.valor)}</span><span className="badge-blue">{p.tipo}</span>{p.obs&&<span className="text-gray-500 text-xs">{p.obs}</span>}</div>)}</div></div>)}
                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700"><h4 className="text-white font-bold text-sm mb-3">Resumo Final</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">{[{l:'Dias trabalhados',v:s.dias,c:'text-green-400'},{l:'Faltas',v:s.faltas,c:'text-red-400'},{l:'H. personalizadas',v:s.horasOutro.toFixed(1)+'h',c:'text-yellow-400'},{l:'Total bruto',v:fmtR$(s.bruto),c:'text-white'},{l:'Total descontos',v:fmtR$(s.descontos),c:'text-yellow-400'},{l:'Total encargos',v:fmtR$(s.inss+s.fgts),c:'text-purple-400'},{l:'Total líquido',v:fmtR$(s.liquido),c:'text-blue-400'},{l:'Saldo pendente',v:fmtR$(s.saldo),c:(s.saldo||0)>0?'text-red-400':'text-green-400'}].map(({l,v,c})=><div key={l} className="flex justify-between items-center py-1 border-b border-gray-700 last:border-0"><span className="text-gray-400 text-xs">{l}</span><span className={`font-semibold text-xs ${c}`}>{v}</span></div>)}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
