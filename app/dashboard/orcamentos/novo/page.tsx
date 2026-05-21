'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { Plus, Trash2, Download, Save, ArrowLeft, ChevronDown, ChevronUp, Bold, Italic, List } from 'lucide-react'
import { gerarPDFPremium } from '@/lib/OrcamentoPDF'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const fmtR$ = (v: number) => 'R$ ' + (v||0).toLocaleString('pt-BR',{minimumFractionDigits:2})

interface Item { id:string; descricao:string; quantidade:number; unidade:string; valor_unitario:number; desconto_pct:number }
interface Secao { id:string; titulo:string; subtitulo:string; area:string; etapas:string[]; valor_mao_obra:number; obs:string }
interface FotoObra { id:string; src:string; legenda:string }
interface Reparo { id:string; titulo:string; descricao:string; fotos:FotoObra[] }
interface Referencia { id:string; empreendimento:string; contato:string; telefone:string; foto:string }

const newId = () => Math.random().toString(36).slice(2)
const novoItem = (): Item => ({ id:newId(), descricao:'', quantidade:1, unidade:'vb', valor_unitario:0, desconto_pct:0 })
const novaSecao = (): Secao => ({ id:newId(), titulo:'', subtitulo:'', area:'', etapas:[''], valor_mao_obra:0, obs:'' })
const novaFoto = (): FotoObra => ({ id:newId(), src:'', legenda:'' })
const novoReparo = (): Reparo => ({ id:newId(), titulo:'', descricao:'', fotos:[] })
const novaRef = (): Referencia => ({ id:newId(), empreendimento:'', contato:'', telefone:'', foto:'' })
const calcItem = (i: Item) => i.quantidade * i.valor_unitario * (1 - i.desconto_pct / 100)

// Comprime imagem antes de salvar
async function comprimirImagem(base64: string, maxW=800, quality=0.7): Promise<string> {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ratio = Math.min(maxW/img.width, maxW/img.height, 1)
      canvas.width = img.width * ratio
      canvas.height = img.height * ratio
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => resolve(base64)
    img.src = base64
  })
}

const MATERIAIS_SUGERIDOS: Omit<Item,'id'>[] = [
  { descricao:'Massa corrida PVA paredes internas', quantidade:0, unidade:'gl', valor_unitario:0, desconto_pct:0 },
  { descricao:'Selador acrilico fachada', quantidade:0, unidade:'lt', valor_unitario:0, desconto_pct:0 },
  { descricao:'Tinta acrilica premium', quantidade:0, unidade:'lt', valor_unitario:0, desconto_pct:0 },
  { descricao:'Tinta acrilica semibrilho areas molhadas', quantidade:0, unidade:'lt', valor_unitario:0, desconto_pct:0 },
  { descricao:'Fundo preparador de paredes', quantidade:0, unidade:'lt', valor_unitario:0, desconto_pct:0 },
  { descricao:'Impermeabilizante acrilico flexivel', quantidade:0, unidade:'lt', valor_unitario:0, desconto_pct:0 },
  { descricao:'Argamassa polimerica', quantidade:0, unidade:'kg', valor_unitario:0, desconto_pct:0 },
  { descricao:'Manta asfaltica 4mm', quantidade:0, unidade:'m2', valor_unitario:0, desconto_pct:0 },
  { descricao:'Verniz maritimo madeiras externas', quantidade:0, unidade:'lt', valor_unitario:0, desconto_pct:0 },
  { descricao:'Esmalte sintetico grades e metais', quantidade:0, unidade:'lt', valor_unitario:0, desconto_pct:0 },
  { descricao:'Lixa dagua preparacao superficie', quantidade:0, unidade:'pc', valor_unitario:0, desconto_pct:0 },
  { descricao:'Fita crepe protecao acabamento', quantidade:0, unidade:'un', valor_unitario:0, desconto_pct:0 },
  { descricao:'Rolo de la aplicacao tinta', quantidade:0, unidade:'un', valor_unitario:0, desconto_pct:0 },
  { descricao:'Primer epoxi pisos garagens', quantidade:0, unidade:'lt', valor_unitario:0, desconto_pct:0 },
  { descricao:'Textura acrilica fachada muros', quantidade:0, unidade:'kg', valor_unitario:0, desconto_pct:0 },
]

const defaultData = {
  numero:'ORC-001', status:'pendente',
  empresa_nome:'Nascimento Pinturas', empresa_cnpj:'10.212.424/0001-73',
  empresa_endereco:'Rua Mauri Alcides Scussel n 46 - Bento Goncalves - RS',
  empresa_telefone:'(54) 99704-1323', empresa_whatsapp:'(54) 99704-1323',
  empresa_email:'', empresa_instagram:'',
  empresa_responsavel:'Gabriel Nascimento', empresa_engenheiro:'Vinicius Pandini',
  empresa_crea:'RS 254904', empresa_experiencia:'mais de 20 anos',
  empresa_apresentacao:'A Nascimento Pinturas e especializada em pinturas prediais com mais de 20 anos de experiencia em Bento Goncalves e regiao.',
  cliente_nome:'', cliente_obra:'', cliente_endereco:'', cliente_telefone:'', cliente_email:'', cliente_cpf_cnpj:'',
  data_orcamento:new Date().toISOString().split('T')[0], cidade_data:'Bento Goncalves',
  validade_dias:30,
  proposta_texto:'Tendo analisado o local e as necessidades do empreendimento, apresentamos nossa proposta de prestacao de servicos.',
  proposta_objeto:'Reforma e pintura predial completa, incluindo preparacao de superficies, correcoes, tratamentos e aplicacao de tinta.',
  descricao_servico_geral:'',
  ferramentas_texto:'FERRAMENTAS E PRODUTOS UTILIZADOS SAO DE LINHA PREMIUM DE MARCAS RECONHECIDAS NO MERCADO DE CONSTRUCAO CIVIL.',
  seguranca_texto:'Nossa empresa conta com engenheiro responsavel tecnico que acompanha e valida todos os processos. Profissionais habilitados para trabalho em altura com NR18 e NR35 atualizados, EPIs completos.',
  prazo_execucao:'3 (tres) meses',
  forma_pagamento:'Parcelamento em ate 20 (vinte) vezes em parcelas iguais com a primeira no inicio da obra.',
  garantia_tinta:'Garantia de ate 8 anos conforme ficha tecnica dos produtos utilizados.',
  garantia_execucao:'Garantia vinculada a aplicacao correta do numero de demaos determinadas em contrato.',
  num_parcelas:20, valor_entrada:0, num_unidades:0, observacoes:'',
}

const IS = { background:'var(--bg-hover)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 10px', fontSize:13, color:'var(--text-primary)', width:'100%' }
const LS = { fontSize:11, color:'var(--text-muted)', fontWeight:500 as const, textTransform:'uppercase' as const, letterSpacing:'.04em' }
const FS = { display:'flex', flexDirection:'column' as const, gap:4 }
const TA = { ...IS, resize:'vertical' as const, minHeight:80 }

function parseLinhas(texto: string): Omit<Item,'id'>[] {
  return texto.split('\n').map(l=>l.trim()).filter(l=>l.length>2).map(l=>{
    const m = l.match(/^(\d+[.,]?\d*)\s*(m2|m|un|lt|bd|gl|pc|mt|hr|kg|vb)?\s+(.+)/i)
    if (m) return { descricao:m[3].trim(), quantidade:parseFloat(m[1].replace(',','.')), unidade:m[2]||'vb', valor_unitario:0, desconto_pct:0 }
    return { descricao:l, quantidade:1, unidade:'vb', valor_unitario:0, desconto_pct:0 }
  })
}

function parseRefs(texto: string): Omit<Referencia,'id'>[] {
  return texto.split('\n').map(l=>l.trim()).filter(l=>l.length>2).map(l=>{
    const parts = l.split(/[;,\t]/).map(p=>p.trim())
    return { empreendimento:parts[0]||l, contato:parts[1]||'', telefone:parts[2]||'', foto:'' }
  })
}

function Field({ label, children }: { label:string; children:React.ReactNode }) {
  return <div style={FS}><label style={LS}>{label}</label>{children}</div>
}

function ImgUpload({ label, src, onFile, legenda, onLegenda, small }: { label:string; src:string; onFile:(b:string)=>void; legenda?:string; onLegenda?:(v:string)=>void; small?:boolean }) {
  const ref = useRef<HTMLInputElement>(null)
  const h = small ? 60 : 90
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return
    const r = new FileReader()
    r.onload = async () => {
      const compressed = await comprimirImagem(r.result as string, small ? 400 : 800, 0.65)
      onFile(compressed)
    }
    r.readAsDataURL(f)
  }
  return (
    <div style={FS}>
      {label && <label style={LS}>{label}</label>}
      <div onClick={()=>ref.current?.click()} style={{ border:'1px dashed var(--border)', borderRadius:8, padding:10, textAlign:'center', cursor:'pointer', background:'var(--bg-hover)', minHeight:h, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', position:'relative' }}>
        {src ? <img src={src} style={{ maxHeight:h, maxWidth:'100%', objectFit:'contain' }} alt=""/> : <span style={{ color:'var(--text-muted)', fontSize:11 }}>Carregar imagem</span>}
        {src && <div onClick={e=>{e.stopPropagation();onFile('')}} style={{ position:'absolute', top:4, right:4, background:'rgba(0,0,0,0.6)', borderRadius:4, padding:'1px 6px', fontSize:10, color:'#fff', cursor:'pointer' }}>x</div>}
      </div>
      <input ref={ref} type="file" accept="image/*" style={{ display:'none' }} onChange={handleFile}/>
      {src && onLegenda && <input value={legenda||''} onChange={e=>onLegenda(e.target.value)} placeholder="Legenda" style={{ ...IS, fontSize:11, padding:'5px 8px', marginTop:2 }}/>}
    </div>
  )
}

function RichTextArea({ value, onChange, placeholder, minHeight=80 }: { value:string; onChange:(v:string)=>void; placeholder?:string; minHeight?:number }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const wrap = (tag: string) => {
    const el = ref.current; if (!el) return
    const start = el.selectionStart, end = el.selectionEnd
    const sel = value.substring(start, end)
    if (!sel) return
    const markers: Record<string,string> = { bold:'**', italic:'_', bullet:'\n- ' }
    const m = markers[tag]
    if (tag==='bullet') {
      const newVal = value.substring(0,start) + '\n- ' + sel.split('\n').join('\n- ') + value.substring(end)
      onChange(newVal)
    } else {
      const newVal = value.substring(0,start) + m + sel + m + value.substring(end)
      onChange(newVal)
    }
  }
  return (
    <div style={{ border:'1px solid var(--border)', borderRadius:8, overflow:'hidden' }}>
      <div style={{ display:'flex', gap:4, padding:'6px 8px', background:'var(--bg-primary)', borderBottom:'1px solid var(--border)' }}>
        {[
          { icon:<Bold size={13}/>, tag:'bold', tip:'Negrito (selecione o texto)' },
          { icon:<Italic size={13}/>, tag:'italic', tip:'Italico (selecione o texto)' },
          { icon:<List size={13}/>, tag:'bullet', tip:'Lista (selecione linhas)' },
        ].map(b=>(
          <button key={b.tag} title={b.tip} onClick={()=>wrap(b.tag)} style={{ background:'none', border:'1px solid var(--border)', borderRadius:5, padding:'3px 7px', color:'var(--text-muted)', cursor:'pointer', display:'flex', alignItems:'center' }}>
            {b.icon}
          </button>
        ))}
        <span style={{ fontSize:10, color:'var(--text-muted)', alignSelf:'center', marginLeft:4 }}>Selecione o texto e clique para formatar</span>
      </div>
      <textarea ref={ref} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{ ...TA, minHeight, border:'none', borderRadius:0, outline:'none' }}/>
    </div>
  )
}

function GaleriaFotos({ fotos, setFotos, max, titulo }: { fotos:FotoObra[]; setFotos:any; max:number; titulo:string }) {
  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <p style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.04em' }}>{titulo} — {fotos.filter(f=>f.src).length}/{max}</p>
        {fotos.length < max && (
          <button onClick={()=>setFotos((p:FotoObra[])=>[...p,novaFoto()])} style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'var(--text-muted)', padding:'5px 10px', borderRadius:7, border:'1px dashed var(--border)', background:'none', cursor:'pointer' }}>
            <Plus size={12}/> Adicionar foto
          </button>
        )}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
        {fotos.map((foto,i)=>(
          <div key={foto.id} style={{ position:'relative' }}>
            <ImgUpload label={'Foto '+(i+1)} src={foto.src}
              onFile={v=>setFotos((p:FotoObra[])=>p.map((f:FotoObra)=>f.id===foto.id?{...f,src:v}:f))}
              legenda={foto.legenda}
              onLegenda={v=>setFotos((p:FotoObra[])=>p.map((f:FotoObra)=>f.id===foto.id?{...f,legenda:v}:f))}
              small/>
            <button onClick={()=>setFotos((p:FotoObra[])=>p.filter((f:FotoObra)=>f.id!==foto.id))} style={{ position:'absolute', top:20, right:2, background:'rgba(239,68,68,0.8)', border:'none', borderRadius:4, padding:'2px 5px', color:'#fff', cursor:'pointer', fontSize:10 }}>x</button>
          </div>
        ))}
        {fotos.length===0 && <div style={{ gridColumn:'span 4', textAlign:'center', padding:24, color:'var(--text-muted)', fontSize:13 }}>Clique em adicionar foto</div>}
      </div>
    </div>
  )
}

function ReparoCard({ rep, onChange, onRemove }: { rep:Reparo; onChange:(r:Reparo)=>void; onRemove:()=>void }) {
  const [open, setOpen] = useState(true)
  return (
    <div style={{ border:'1px solid rgba(239,68,68,0.3)', borderRadius:10, overflow:'hidden', marginBottom:10 }}>
      <div onClick={()=>setOpen(o=>!o)} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'rgba(239,68,68,0.05)', cursor:'pointer' }}>
        <span style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>{rep.titulo||'Novo reparo'}</span>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button onClick={e=>{e.stopPropagation();onRemove()}} style={{ background:'rgba(239,68,68,0.1)', border:'none', borderRadius:5, padding:'3px 6px', color:'#f87171', cursor:'pointer' }}><Trash2 size={12}/></button>
          {open?<ChevronUp size={14} style={{ color:'var(--text-muted)'}}/>:<ChevronDown size={14} style={{ color:'var(--text-muted)'}}/>}
        </div>
      </div>
      {open && (
        <div style={{ padding:14, display:'flex', flexDirection:'column', gap:12 }}>
          <Field label="Titulo do reparo"><input value={rep.titulo} onChange={e=>onChange({...rep,titulo:e.target.value})} style={IS} placeholder="Ex: Trincas na fachada norte"/></Field>
          <Field label="Descricao do problema">
            <RichTextArea value={rep.descricao} onChange={v=>onChange({...rep,descricao:v})} placeholder="Descreva o problema encontrado, localizacao, extensao..." minHeight={80}/>
          </Field>
          <GaleriaFotos fotos={rep.fotos} setFotos={(fn:any)=>onChange({...rep,fotos:typeof fn==='function'?fn(rep.fotos):fn})} max={6} titulo="Fotos do reparo"/>
        </div>
      )}
    </div>
  )
}

function ModalImportar({ onClose, onImportar, onAdicionar }: { onClose:()=>void; onImportar:(i:Omit<Item,'id'>[])=>void; onAdicionar:(i:Omit<Item,'id'>[])=>void }) {
  const [texto, setTexto] = useState('')
  const [parsed, setParsed] = useState<Omit<Item,'id'>[]>([])
  const [sel, setSel] = useState<Set<number>>(new Set())
  const [step, setStep] = useState<'colar'|'selecionar'>('colar')
  const processar = () => { const l=parseLinhas(texto); setParsed(l); setSel(new Set(l.map((_,i)=>i))); setStep('selecionar') }
  const toggle = (i:number) => setSel(p=>{const n=new Set(p);n.has(i)?n.delete(i):n.add(i);return n})
  const itensSel = parsed.filter((_,i)=>sel.has(i))
  const nL = texto.split('\n').filter(l=>l.trim().length>2).length
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, width:'100%', maxWidth:560, maxHeight:'88vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', borderBottom:'1px solid var(--border)' }}>
          <p style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)' }}>{step==='colar'?'Importar materiais':'Selecionar itens'}</p>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:18 }}>x</button>
        </div>
        <div style={{ flex:1, overflow:'auto', padding:'14px 18px' }}>
          {step==='colar'?(
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <p style={{ fontSize:12, color:'var(--text-muted)' }}>Cole o texto do Word. Exemplo: <code style={{ background:'var(--bg-hover)', padding:'1px 5px', borderRadius:4 }}>10 lt Tinta acrilica</code></p>
              <textarea value={texto} onChange={e=>setTexto(e.target.value)} placeholder={'10 lt Tinta acrilica\n5 lt Selador\nMassa corrida PVA'} style={{ ...IS, minHeight:200, fontFamily:'monospace', fontSize:12 }} autoFocus/>
              <p style={{ fontSize:11, color:'var(--text-muted)' }}>{nL} linhas</p>
            </div>
          ):(
            <div>
              <div style={{ display:'flex', gap:6, marginBottom:10 }}>
                <button onClick={()=>setSel(new Set(parsed.map((_,i)=>i)))} style={{ fontSize:11, padding:'3px 8px', borderRadius:6, border:'1px solid var(--border)', background:'none', color:'var(--text-muted)', cursor:'pointer' }}>Todos</button>
                <button onClick={()=>setSel(new Set())} style={{ fontSize:11, padding:'3px 8px', borderRadius:6, border:'1px solid var(--border)', background:'none', color:'var(--text-muted)', cursor:'pointer' }}>Nenhum</button>
              </div>
              {parsed.map((item,i)=>(
                <div key={i} onClick={()=>toggle(i)} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:8, background:sel.has(i)?'rgba(96,165,250,0.08)':'var(--bg-hover)', border:sel.has(i)?'1px solid rgba(96,165,250,0.3)':'1px solid var(--border)', cursor:'pointer', marginBottom:4 }}>
                  <div style={{ width:16, height:16, borderRadius:4, background:sel.has(i)?'#60a5fa':'transparent', border:'1px solid '+(sel.has(i)?'#60a5fa':'var(--border)'), display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    {sel.has(i)&&<span style={{ color:'#fff', fontSize:10, fontWeight:700 }}>v</span>}
                  </div>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:13, color:'var(--text-primary)', margin:0 }}>{item.descricao}</p>
                    <p style={{ fontSize:11, color:'var(--text-muted)', margin:0 }}>{item.quantidade} {item.unidade}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ padding:'12px 18px', borderTop:'1px solid var(--border)', display:'flex', gap:8, justifyContent:'flex-end' }}>
          {step==='colar'?(
            <>
              <button onClick={onClose} style={{ padding:'7px 14px', borderRadius:8, border:'1px solid var(--border)', background:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:13 }}>Cancelar</button>
              <button onClick={processar} disabled={nL===0} style={{ padding:'7px 16px', borderRadius:8, background:'var(--text-primary)', color:'var(--bg-primary)', border:'none', cursor:'pointer', fontSize:13, fontWeight:600 }}>Avancar</button>
            </>
          ):(
            <>
              <button onClick={()=>setStep('colar')} style={{ padding:'7px 14px', borderRadius:8, border:'1px solid var(--border)', background:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:13 }}>Voltar</button>
              <button onClick={()=>{onAdicionar(itensSel);onClose()}} disabled={sel.size===0} style={{ padding:'7px 14px', borderRadius:8, border:'1px solid var(--border)', background:'none', color:'var(--text-primary)', cursor:'pointer', fontSize:13, opacity:sel.size>0?1:0.5 }}>+ Adicionar</button>
              <button onClick={()=>{onImportar(itensSel);onClose()}} disabled={sel.size===0} style={{ padding:'7px 16px', borderRadius:8, background:'var(--text-primary)', color:'var(--bg-primary)', border:'none', cursor:'pointer', fontSize:13, fontWeight:600, opacity:sel.size>0?1:0.5 }}>Substituir ({sel.size})</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ItemTable({ items, setItems }: { items:Item[]; setItems:React.Dispatch<React.SetStateAction<Item[]>> }) {
  const [showImportar, setShowImportar] = useState(false)
  const update = useCallback((id:string,k:string,v:any)=>setItems(p=>p.map(i=>i.id===id?{...i,[k]:v}:i)),[setItems])
  return (
    <div>
      {showImportar&&<ModalImportar onClose={()=>setShowImportar(false)} onImportar={n=>setItems(n.map(i=>({...i,id:newId()})))} onAdicionar={n=>setItems(p=>[...p,...n.map(i=>({...i,id:newId()}))])}/>}
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
          <thead><tr style={{ borderBottom:'1px solid var(--border)', background:'var(--bg-primary)' }}>
            {['Descricao','Qtd','Unid.','Valor unit.','Desc.%','Total',''].map(h=><th key={h} style={{ padding:'7px 8px', textAlign:'left', fontSize:10, color:'var(--text-muted)', fontWeight:600, textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {items.map(item=>(
              <tr key={item.id} style={{ borderBottom:'1px solid var(--border)' }}>
                <td style={{ padding:'5px 6px', minWidth:180 }}><input value={item.descricao} onChange={e=>update(item.id,'descricao',e.target.value)} style={{ ...IS, padding:'4px 7px', fontSize:12 }} placeholder="Descricao"/></td>
                <td style={{ padding:'5px 6px', width:65 }}><input type="number" value={item.quantidade} onChange={e=>update(item.id,'quantidade',+e.target.value)} style={{ ...IS, padding:'4px 7px', fontSize:12, width:65 }}/></td>
                <td style={{ padding:'5px 6px', width:72 }}><select value={item.unidade} onChange={e=>update(item.id,'unidade',e.target.value)} style={{ ...IS, padding:'4px 5px', fontSize:12, width:70 }}>{['vb','m2','m','un','lt','bd','gl','pc','mt','hr','m3','kg'].map(u=><option key={u}>{u}</option>)}</select></td>
                <td style={{ padding:'5px 6px', width:100 }}><input type="number" value={item.valor_unitario} onChange={e=>update(item.id,'valor_unitario',+e.target.value)} style={{ ...IS, padding:'4px 7px', fontSize:12, width:95 }}/></td>
                <td style={{ padding:'5px 6px', width:60 }}><input type="number" value={item.desconto_pct} min={0} max={100} onChange={e=>update(item.id,'desconto_pct',+e.target.value)} style={{ ...IS, padding:'4px 7px', fontSize:12, width:55 }}/></td>
                <td style={{ padding:'5px 8px', color:'var(--text-primary)', fontWeight:600, textAlign:'right' }}>{fmtR$(calcItem(item))}</td>
                <td style={{ padding:'5px 6px' }}><button onClick={()=>setItems(p=>p.filter(i=>i.id!==item.id))} style={{ background:'rgba(239,68,68,0.1)', border:'none', borderRadius:6, padding:'4px 6px', color:'#f87171', cursor:'pointer' }}><Trash2 size={12}/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:10, flexWrap:'wrap', gap:8 }}>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <button onClick={()=>setItems(p=>[...p,novoItem()])} style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'var(--text-muted)', padding:'5px 10px', borderRadius:7, border:'1px dashed var(--border)', background:'none', cursor:'pointer' }}><Plus size={12}/> Adicionar</button>
          <button onClick={()=>setShowImportar(true)} style={{ fontSize:12, color:'#60a5fa', padding:'5px 10px', borderRadius:7, border:'1px solid rgba(96,165,250,0.3)', background:'rgba(96,165,250,0.08)', cursor:'pointer' }}>Importar do Word</button>
          <select onChange={e=>{const s=MATERIAIS_SUGERIDOS[+e.target.value];if(s)setItems(p=>[...p,{...s,id:newId()}]);e.target.value=''}} style={{ ...IS, width:'auto', fontSize:11, padding:'5px 8px' }} defaultValue=""><option value="">+ Sugestoes</option>{MATERIAIS_SUGERIDOS.map((m,i)=><option key={i} value={i}>{m.descricao}</option>)}</select>
        </div>
        <div style={{ textAlign:'right' }}>
          <p style={{ fontSize:11, color:'var(--text-muted)' }}>Total materiais</p>
          <p style={{ fontSize:17, fontWeight:700, color:'var(--text-primary)' }}>{fmtR$(items.reduce((s,i)=>s+calcItem(i),0))}</p>
        </div>
      </div>
    </div>
  )
}

function SecaoCard({ sec, onChange, onRemove }: { sec:Secao; onChange:(s:Secao)=>void; onRemove:()=>void }) {
  const [open, setOpen] = useState(true)
  const up = (k:string,v:any) => onChange({...sec,[k]:v})
  return (
    <div style={{ border:'1px solid var(--border)', borderRadius:10, overflow:'hidden', marginBottom:10 }}>
      <div onClick={()=>setOpen(o=>!o)} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'var(--bg-primary)', cursor:'pointer' }}>
        <span style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>{sec.titulo||'Novo servico'}</span>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:12, color:'#60a5fa', fontWeight:600 }}>{sec.valor_mao_obra>0?fmtR$(sec.valor_mao_obra):''}</span>
          <button onClick={e=>{e.stopPropagation();onRemove()}} style={{ background:'rgba(239,68,68,0.1)', border:'none', borderRadius:5, padding:'3px 6px', color:'#f87171', cursor:'pointer' }}><Trash2 size={12}/></button>
          {open?<ChevronUp size={14} style={{ color:'var(--text-muted)'}}/>:<ChevronDown size={14} style={{ color:'var(--text-muted)'}}/>}
        </div>
      </div>
      {open&&(
        <div style={{ padding:14, display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
            <Field label="Titulo do servico"><input value={sec.titulo} onChange={e=>up('titulo',e.target.value)} style={IS} placeholder="Ex: Pintura Fachada"/></Field>
            <Field label="Subtitulo"><input value={sec.subtitulo} onChange={e=>up('subtitulo',e.target.value)} style={IS}/></Field>
            <Field label="Area / Local"><input value={sec.area} onChange={e=>up('area',e.target.value)} style={IS} placeholder="Ex: 500 m2"/></Field>
          </div>
          <Field label="Etapas de execucao">
            {sec.etapas.map((et,i)=>(
              <div key={i} style={{ display:'flex', gap:6, marginBottom:5 }}>
                <input value={et} onChange={e=>{ const arr=[...sec.etapas]; arr[i]=e.target.value; up('etapas',arr) }} style={{ ...IS, flex:1 }} placeholder={'Etapa '+(i+1)}/>
                <button onClick={()=>up('etapas',sec.etapas.filter((_,j)=>j!==i))} style={{ background:'rgba(239,68,68,0.1)', border:'none', borderRadius:6, padding:'4px 8px', color:'#f87171', cursor:'pointer' }}><Trash2 size={11}/></button>
              </div>
            ))}
            <button onClick={()=>up('etapas',[...sec.etapas,''])} style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'var(--text-muted)', padding:'4px 8px', borderRadius:6, border:'1px dashed var(--border)', background:'none', cursor:'pointer', marginTop:2 }}><Plus size={11}/> Etapa</button>
          </Field>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div style={FS}>
              <label style={LS}>Valor mao de obra (R$)</label>
              <input type="number" value={sec.valor_mao_obra} onChange={e=>up('valor_mao_obra',+e.target.value)} style={IS}/>
              {sec.valor_mao_obra>0&&<p style={{ fontSize:11, color:'#34d399', marginTop:2, fontWeight:600 }}>Valor: {fmtR$(sec.valor_mao_obra)}</p>}
            </div>
            <Field label="Observacao"><input value={sec.obs} onChange={e=>up('obs',e.target.value)} style={IS} placeholder="Opcional"/></Field>
          </div>
        </div>
      )}
    </div>
  )
}

export default function OrcamentoFormPage() {
  const router = useRouter()
  const params = useParams()
  const isEdit = params?.id && params.id !== 'novo'

  const [data, setData] = useState<any>(defaultData)
  const [secoes, setSecoes] = useState<Secao[]>([])
  const [materiais, setMateriais] = useState<Item[]>([])
  const [reparos, setReparos] = useState<Reparo[]>([])
  const [fotosObra, setFotosObra] = useState<FotoObra[]>([])
  const [fotosFerr, setFotosFerr] = useState<FotoObra[]>([])
  const [referencias, setReferencias] = useState<Referencia[]>([])
  const [fotosRefs, setFotosRefs] = useState<FotoObra[]>([])
  const [logoSrc, setLogoSrc] = useState('')
  const [capaSrc, setCapaSrc] = useState('')
  const [marcaDagua, setMarcaDagua] = useState('')
  const [assinaturaEmpresa, setAssinaturaEmpresa] = useState('')
  const [assinaturaEngenheiro, setAssinaturaEngenheiro] = useState('')
  const [assinaturaCliente, setAssinaturaCliente] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [tab, setTab] = useState('empresa')
  const [loadingData, setLoadingData] = useState(!!isEdit)
  const [showImportRefs, setShowImportRefs] = useState(false)
  const [textoRefs, setTextoRefs] = useState('')

  const up = (k:string) => (e:any) => setData((p:any)=>({...p,[k]:e.target.value}))

  useEffect(() => {
    if (!isEdit) return
    const load = async () => {
      setLoadingData(true)
      const { data: orc } = await supabase.from('orcamentos').select('*').eq('id', params.id).single()
      if (orc) {
        setData(orc)
        setSecoes(orc.secoes||[])
        setMateriais(orc.itens_materiais||[])
        setReparos(orc.reparos||[])
        setFotosObra(orc.fotos_obra||[])
        setFotosFerr(orc.fotos_ferramentas||[])
        setReferencias(orc.referencias||[])
        setFotosRefs(orc.fotos_referencias||[])
        const f = orc.fotos||{}
        if(f.logo) setLogoSrc(f.logo)
        if(f.capa) setCapaSrc(f.capa)
        if(f.marca_dagua) setMarcaDagua(f.marca_dagua)
        if(f.assinatura_empresa) setAssinaturaEmpresa(f.assinatura_empresa)
        if(f.assinatura_engenheiro) setAssinaturaEngenheiro(f.assinatura_engenheiro)
        if(f.assinatura_cliente) setAssinaturaCliente(f.assinatura_cliente)
      }
      setLoadingData(false)
    }
    load()
  }, [isEdit, params?.id])

  const totalMaoObra = secoes.reduce((s,sec)=>s+sec.valor_mao_obra,0)
  const totalMateriais = materiais.reduce((s,i)=>s+calcItem(i),0)
  const totalGeral = totalMaoObra + totalMateriais

  const salvar = async () => {
    setSaving(true)
    setSaveMsg('Salvando...')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setSaveMsg('Erro: usuario nao autenticado'); setSaving(false); return }
      const payload = {
        ...data, user_id: user.id,
        secoes, itens_materiais: materiais, reparos,
        fotos_obra: fotosObra,
        fotos_ferramentas: fotosFerr,
        referencias, fotos_referencias: fotosRefs,
        fotos: {
          logo:logoSrc, capa:capaSrc, marca_dagua:marcaDagua,
          assinatura_empresa:assinaturaEmpresa,
          assinatura_engenheiro:assinaturaEngenheiro,
          assinatura_cliente:assinaturaCliente
        },
        total_mao_obra: totalMaoObra, total_materiais: totalMateriais, total_geral: totalGeral,
        updated_at: new Date().toISOString(),
      }
      if (isEdit) {
        const { error } = await supabase.from('orcamentos').update(payload).eq('id', params.id)
        if (error) { setSaveMsg('Erro: '+error.message); setSaving(false); return }
        setSaveMsg('Salvo com sucesso!')
        setTimeout(()=>setSaveMsg(''), 3000)
        setSaving(false)
      } else {
        const { data: cr, error } = await supabase.from('orcamentos').insert(payload).select().single()
        if (error) { setSaveMsg('Erro: '+error.message); setSaving(false); return }
        if (cr) router.push('/dashboard/orcamentos/'+cr.id)
        else setSaving(false)
      }
    } catch(err:any) {
      setSaveMsg('Erro: '+err.message)
      setSaving(false)
    }
  }

  const baixarPDF = async () => {
    await gerarPDFPremium({
      empresa_nome:data.empresa_nome, empresa_cnpj:data.empresa_cnpj,
      empresa_endereco:data.empresa_endereco, empresa_telefone:data.empresa_telefone,
      empresa_whatsapp:data.empresa_whatsapp, empresa_email:data.empresa_email,
      empresa_instagram:data.empresa_instagram, empresa_responsavel:data.empresa_responsavel,
      empresa_engenheiro:data.empresa_engenheiro, empresa_crea:data.empresa_crea,
      empresa_apresentacao:data.empresa_apresentacao, empresa_experiencia:data.empresa_experiencia,
      cliente_nome:data.cliente_nome, cliente_obra:data.cliente_obra,
      cliente_endereco:data.cliente_endereco, cliente_telefone:data.cliente_telefone,
      numero:data.numero, data_orcamento:data.data_orcamento,
      cidade_data:data.cidade_data, validade_dias:data.validade_dias,
      logoBase64:logoSrc, foto_capa:capaSrc, marca_dagua:marcaDagua,
      fotos_obra:fotosObra,
      secoes:secoes.map(s=>({...s,etapas:s.etapas.filter(e=>e.trim())})),
      patologias:[], itens_materiais:materiais,
      referencias:referencias.map(r=>({empreendimento:r.empreendimento,contato:r.contato,telefone:r.telefone})),
      total_mao_obra:totalMaoObra, total_materiais:totalMateriais, total_geral:totalGeral,
      forma_pagamento:data.forma_pagamento, num_parcelas:+data.num_parcelas||0,
      valor_entrada:+data.valor_entrada||0, num_unidades:+data.num_unidades||0,
      prazo_execucao:data.prazo_execucao, garantia_tinta:data.garantia_tinta,
      garantia_execucao:data.garantia_execucao, observacoes:data.observacoes,
    })
  }

  const TABS = [
    { id:'empresa',    label:'1. Empresa' },
    { id:'cliente',    label:'2. Cliente' },
    { id:'proposta',   label:'3. Proposta' },
    { id:'descricao',  label:'4. Descricao' },
    { id:'reparos',    label:'5. Reparos' },
    { id:'secoes',     label:'6. Servicos' },
    { id:'materiais',  label:'7. Materiais' },
    { id:'ferramentas',label:'8. Ferramentas' },
    { id:'condicoes',  label:'9. Condicoes' },
    { id:'seguranca',  label:'10. Seguranca' },
    { id:'referencias',label:'11. Referencias' },
  ]

  if (loadingData) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', background:'var(--bg-primary)' }}>
      <p style={{ color:'var(--text-muted)', fontSize:13 }}>Carregando orcamento...</p>
    </div>
  )

  return (
    <div style={{ padding:20, background:'var(--bg-primary)', minHeight:'100vh' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={()=>router.push('/dashboard/orcamentos')} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:8, padding:'6px 10px', color:'var(--text-muted)', cursor:'pointer' }}><ArrowLeft size={15}/></button>
          <div>
            <h1 style={{ fontSize:17, fontWeight:700, color:'var(--text-primary)' }}>{isEdit?'Editando: '+data.numero:'Novo Orcamento'}</h1>
            <p style={{ fontSize:11, color:'var(--text-muted)' }}>Proposta comercial de reforma e pintura</p>
          </div>
        </div>
        <div style={{ display:'flex', gap:7, alignItems:'center' }}>
          {saveMsg && <span style={{ fontSize:12, color:saveMsg.includes('Erro')?'#f87171':'#34d399', fontWeight:500 }}>{saveMsg}</span>}
          <select value={data.status} onChange={up('status')} style={{ ...IS, width:'auto', fontSize:12 }}>
            <option value="pendente">Pendente</option>
            <option value="aprovado">Aprovado</option>
            <option value="reprovado">Reprovado</option>
            <option value="cancelado">Cancelado</option>
          </select>
          <button onClick={baixarPDF} style={{ display:'flex', alignItems:'center', gap:5, background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:8, padding:'7px 13px', fontSize:13, fontWeight:500, color:'var(--text-primary)', cursor:'pointer' }}>
            <Download size={13}/> PDF
          </button>
          <button onClick={salvar} disabled={saving} style={{ display:'flex', alignItems:'center', gap:5, background:'var(--text-primary)', color:'var(--bg-primary)', border:'none', borderRadius:8, padding:'7px 15px', fontSize:13, fontWeight:600, cursor:'pointer', opacity:saving?0.7:1 }}>
            <Save size={13}/> {saving?'Salvando...':(isEdit?'Salvar alteracoes':'Criar orcamento')}
          </button>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:14 }}>
        {[
          { label:'Mao de obra', value:fmtR$(totalMaoObra), color:'#60a5fa' },
          { label:'Materiais', value:fmtR$(totalMateriais), color:'#a78bfa' },
          { label:'Total geral', value:fmtR$(totalGeral), color:'var(--text-primary)' },
          { label:'Servicos', value:secoes.length+' secoes', color:'#34d399' },
        ].map(({label,value,color})=>(
          <div key={label} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10, padding:'10px 14px' }}>
            <p style={{ fontSize:10, color:'var(--text-muted)', marginBottom:3 }}>{label}</p>
            <p style={{ fontSize:17, fontWeight:700, color }}>{value}</p>
          </div>
        ))}
      </div>

      <div style={{ display:'flex', gap:0, marginBottom:14, borderBottom:'1px solid var(--border)', overflowX:'auto' }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{ padding:'7px 12px', fontSize:11, fontWeight:tab===t.id?600:400, color:tab===t.id?'var(--text-primary)':'var(--text-muted)', background:'none', border:'none', cursor:'pointer', whiteSpace:'nowrap', borderBottom:tab===t.id?'2px solid var(--text-primary)':'2px solid transparent', marginBottom:-1 }}>{t.label}</button>
        ))}
      </div>

      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:18 }}>

        {tab==='empresa'&&(
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14 }}>
              <ImgUpload label="Logo da empresa" src={logoSrc} onFile={setLogoSrc}/>
              <ImgUpload label="Foto de capa" src={capaSrc} onFile={setCapaSrc}/>
              <div style={FS}>
                <label style={LS}>Marca dagua</label>
                <ImgUpload label="" src={marcaDagua} onFile={setMarcaDagua}/>
                <p style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>Aparece suavemente em todas as paginas</p>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
              <Field label="Nome da empresa"><input value={data.empresa_nome} onChange={up('empresa_nome')} style={IS}/></Field>
              <Field label="CNPJ"><input value={data.empresa_cnpj} onChange={up('empresa_cnpj')} style={IS}/></Field>
              <Field label="N do orcamento"><input value={data.numero} onChange={up('numero')} style={IS}/></Field>
              <Field label="Telefone"><input value={data.empresa_telefone} onChange={up('empresa_telefone')} style={IS}/></Field>
              <Field label="WhatsApp"><input value={data.empresa_whatsapp} onChange={up('empresa_whatsapp')} style={IS}/></Field>
              <Field label="E-mail"><input value={data.empresa_email} onChange={up('empresa_email')} style={IS}/></Field>
              <Field label="Instagram"><input value={data.empresa_instagram} onChange={up('empresa_instagram')} style={IS}/></Field>
              <Field label="Responsavel"><input value={data.empresa_responsavel} onChange={up('empresa_responsavel')} style={IS}/></Field>
              <Field label="Experiencia"><input value={data.empresa_experiencia} onChange={up('empresa_experiencia')} style={IS}/></Field>
              <div style={{ ...FS, gridColumn:'span 2' }}><label style={LS}>Endereco</label><input value={data.empresa_endereco} onChange={up('empresa_endereco')} style={IS}/></div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                <Field label="Engenheiro RT"><input value={data.empresa_engenheiro} onChange={up('empresa_engenheiro')} style={IS}/></Field>
                <Field label="CREA"><input value={data.empresa_crea} onChange={up('empresa_crea')} style={IS}/></Field>
              </div>
            </div>
            <Field label="Apresentacao institucional"><RichTextArea value={data.empresa_apresentacao} onChange={v=>setData((p:any)=>({...p,empresa_apresentacao:v}))}/></Field>
          </div>
        )}

        {tab==='cliente'&&(
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="Nome do cliente"><input value={data.cliente_nome} onChange={up('cliente_nome')} style={IS}/></Field>
            <Field label="CPF / CNPJ"><input value={data.cliente_cpf_cnpj} onChange={up('cliente_cpf_cnpj')} style={IS}/></Field>
            <Field label="Nome da obra"><input value={data.cliente_obra} onChange={up('cliente_obra')} style={IS}/></Field>
            <Field label="Telefone"><input value={data.cliente_telefone} onChange={up('cliente_telefone')} style={IS}/></Field>
            <div style={{ ...FS, gridColumn:'span 2' }}><label style={LS}>Endereco da obra</label><input value={data.cliente_endereco} onChange={up('cliente_endereco')} style={IS}/></div>
            <Field label="Cidade"><input value={data.cidade_data} onChange={up('cidade_data')} style={IS}/></Field>
            <Field label="Data do orcamento"><input type="date" value={data.data_orcamento} onChange={up('data_orcamento')} style={IS}/></Field>
            <Field label="Validade (dias)"><input type="number" value={data.validade_dias} onChange={up('validade_dias')} style={IS}/></Field>
          </div>
        )}

        {tab==='proposta'&&(
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ background:'var(--bg-hover)', border:'1px solid var(--border)', borderRadius:10, padding:12 }}>
              <p style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', marginBottom:2 }}>PROPOSTA DE PRESTACAO DE SERVICOS</p>
              <p style={{ fontSize:11, color:'var(--text-muted)' }}>Esta secao aparece como cabecalho da proposta no PDF</p>
            </div>
            <Field label="Texto de abertura"><RichTextArea value={data.proposta_texto} onChange={v=>setData((p:any)=>({...p,proposta_texto:v}))} minHeight={100}/></Field>
            <Field label="Objeto / escopo geral dos servicos"><RichTextArea value={data.proposta_objeto} onChange={v=>setData((p:any)=>({...p,proposta_objeto:v}))} minHeight={80}/></Field>
          </div>
        )}

        {tab==='descricao'&&(
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ background:'var(--bg-hover)', border:'1px solid var(--border)', borderRadius:10, padding:12 }}>
              <p style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', marginBottom:2 }}>DESCRICAO GERAL DO SERVICO</p>
            </div>
            <Field label="Descricao geral"><RichTextArea value={data.descricao_servico_geral} onChange={v=>setData((p:any)=>({...p,descricao_servico_geral:v}))} minHeight={120}/></Field>
            <GaleriaFotos fotos={fotosObra} setFotos={setFotosObra} max={12} titulo="Fotos do servico"/>
          </div>
        )}

        {tab==='reparos'&&(
          <div>
            <div style={{ background:'rgba(239,68,68,0.05)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:10, padding:12, marginBottom:14 }}>
              <p style={{ fontSize:13, fontWeight:700, color:'#f87171', marginBottom:2 }}>IDENTIFICACAO DOS REPAROS</p>
              <p style={{ fontSize:11, color:'var(--text-muted)' }}>Adicione cada reparo separadamente com fotos e descricao tecnica</p>
            </div>
            {reparos.map(rep=>(
              <ReparoCard key={rep.id} rep={rep}
                onChange={r=>setReparos(rs=>rs.map(x=>x.id===r.id?r:x))}
                onRemove={()=>setReparos(rs=>rs.filter(x=>x.id!==rep.id))}/>
            ))}
            <button onClick={()=>setReparos(r=>[...r,novoReparo()])} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#f87171', padding:'7px 12px', borderRadius:8, border:'1px dashed rgba(239,68,68,0.4)', background:'none', cursor:'pointer' }}>
              <Plus size={13}/> Adicionar reparo
            </button>
          </div>
        )}

        {tab==='secoes'&&(
          <div>
            <div style={{ background:'var(--bg-hover)', border:'1px solid var(--border)', borderRadius:10, padding:12, marginBottom:14 }}>
              <p style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', marginBottom:2 }}>SERVICOS E MAO DE OBRA</p>
              <p style={{ fontSize:11, color:'var(--text-muted)' }}>Cada servico aparece com etapas e valor de mao de obra ao final no PDF</p>
            </div>
            {secoes.map(sec=>(
              <SecaoCard key={sec.id} sec={sec}
                onChange={s=>setSecoes(ss=>ss.map(x=>x.id===s.id?s:x))}
                onRemove={()=>setSecoes(ss=>ss.filter(x=>x.id!==sec.id))}/>
            ))}
            <button onClick={()=>setSecoes(s=>[...s,novaSecao()])} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--text-muted)', padding:'7px 12px', borderRadius:8, border:'1px dashed var(--border)', background:'none', cursor:'pointer' }}>
              <Plus size={13}/> Adicionar servico
            </button>
          </div>
        )}

        {tab==='materiais'&&(
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ background:'var(--bg-hover)', border:'1px solid var(--border)', borderRadius:10, padding:12 }}>
              <p style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', marginBottom:2 }}>PROPOSTA DE MATERIAIS</p>
            </div>
            <ItemTable items={materiais} setItems={setMateriais}/>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:8 }}>
              <div style={{ background:'var(--bg-hover)', border:'1px solid var(--border)', borderRadius:10, padding:14 }}>
                <p style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>TOTAL MATERIAIS</p>
                <p style={{ fontSize:22, fontWeight:700, color:'#a78bfa' }}>{fmtR$(totalMateriais)}</p>
              </div>
              <div style={{ background:'var(--bg-hover)', border:'1px solid var(--border)', borderRadius:10, padding:14 }}>
                <p style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>TOTAL MAO DE OBRA</p>
                <p style={{ fontSize:22, fontWeight:700, color:'#60a5fa' }}>{fmtR$(totalMaoObra)}</p>
              </div>
              <div style={{ background:'var(--bg-card)', border:'2px solid var(--border)', borderRadius:10, padding:14, gridColumn:'span 2' }}>
                <p style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>VALOR TOTAL MATERIAIS + MAO DE OBRA</p>
                <p style={{ fontSize:28, fontWeight:800, color:'var(--text-primary)', letterSpacing:'-.5px' }}>{fmtR$(totalGeral)}</p>
              </div>
            </div>
          </div>
        )}

        {tab==='ferramentas'&&(
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ background:'rgba(251,191,36,0.06)', border:'1px solid rgba(251,191,36,0.2)', borderRadius:10, padding:12 }}>
              <p style={{ fontSize:13, fontWeight:700, color:'#fbbf24', marginBottom:2 }}>FERRAMENTAS E PRODUTOS UTILIZADOS</p>
              <p style={{ fontSize:11, color:'var(--text-muted)' }}>SAO DE LINHA PREMIUM DE MARCAS RECONHECIDAS NO MERCADO DE CONSTRUCAO CIVIL</p>
            </div>
            <Field label="Descricao das ferramentas e produtos">
              <RichTextArea value={data.ferramentas_texto} onChange={v=>setData((p:any)=>({...p,ferramentas_texto:v}))} minHeight={100}/>
            </Field>
            <GaleriaFotos fotos={fotosFerr} setFotos={setFotosFerr} max={12} titulo="Fotos das ferramentas e produtos"/>
          </div>
        )}

        {tab==='condicoes'&&(
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ background:'var(--bg-hover)', border:'1px solid var(--border)', borderRadius:10, padding:12 }}>
              <p style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>PRAZOS, CONDICOES DE PAGAMENTO E GARANTIA</p>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Field label="Prazo de execucao"><input value={data.prazo_execucao} onChange={up('prazo_execucao')} style={IS}/></Field>
              <Field label="Validade da proposta (dias)"><input type="number" value={data.validade_dias} onChange={up('validade_dias')} style={IS}/></Field>
              <Field label="Numero de parcelas"><input type="number" value={data.num_parcelas} onChange={up('num_parcelas')} style={IS}/></Field>
              <Field label="Valor de entrada (R$)"><input type="number" value={data.valor_entrada} onChange={up('valor_entrada')} style={IS}/></Field>
              {+data.num_parcelas>1&&(
                <div style={FS}>
                  <label style={LS}>Valor por parcela</label>
                  <p style={{ fontSize:20, fontWeight:700, color:'#34d399', padding:'8px 0' }}>{fmtR$((totalGeral-(+data.valor_entrada||0))/(+data.num_parcelas||1))}</p>
                </div>
              )}
              <Field label="N de unidades/apartamentos"><input type="number" value={data.num_unidades} onChange={up('num_unidades')} style={IS} placeholder="0 = nao mostrar"/></Field>
            </div>
            <Field label="Forma de pagamento"><RichTextArea value={data.forma_pagamento} onChange={v=>setData((p:any)=>({...p,forma_pagamento:v}))} minHeight={80}/></Field>
            <Field label="Garantia da tinta"><RichTextArea value={data.garantia_tinta} onChange={v=>setData((p:any)=>({...p,garantia_tinta:v}))} minHeight={60}/></Field>
            <Field label="Garantia da execucao"><RichTextArea value={data.garantia_execucao} onChange={v=>setData((p:any)=>({...p,garantia_execucao:v}))} minHeight={60}/></Field>
            <Field label="Observacoes gerais"><RichTextArea value={data.observacoes} onChange={v=>setData((p:any)=>({...p,observacoes:v}))} minHeight={80}/></Field>
          </div>
        )}

        {tab==='seguranca'&&(
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ background:'rgba(96,165,250,0.06)', border:'1px solid rgba(96,165,250,0.2)', borderRadius:10, padding:12 }}>
              <p style={{ fontSize:13, fontWeight:700, color:'#60a5fa', marginBottom:2 }}>SEGURANCA E RESPONSABILIDADE TECNICA</p>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Field label="Engenheiro RT"><input value={data.empresa_engenheiro} onChange={up('empresa_engenheiro')} style={IS}/></Field>
              <Field label="CREA"><input value={data.empresa_crea} onChange={up('empresa_crea')} style={IS}/></Field>
            </div>
            <Field label="Descricao de seguranca e responsabilidade tecnica">
              <RichTextArea value={data.seguranca_texto} onChange={v=>setData((p:any)=>({...p,seguranca_texto:v}))} minHeight={120}/>
            </Field>
            <p style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.04em' }}>Upload de assinaturas</p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14 }}>
              <ImgUpload label="Assinatura — Responsavel empresa" src={assinaturaEmpresa} onFile={setAssinaturaEmpresa}/>
              <ImgUpload label="Assinatura — Engenheiro RT" src={assinaturaEngenheiro} onFile={setAssinaturaEngenheiro}/>
              <ImgUpload label="Assinatura — Cliente" src={assinaturaCliente} onFile={setAssinaturaCliente}/>
            </div>
            <p style={{ fontSize:11, color:'var(--text-muted)' }}>As assinaturas aparecem na pagina de encerramento do PDF. Recomendado: fundo branco ou transparente.</p>
          </div>
        )}

        {tab==='referencias'&&(
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ background:'var(--bg-hover)', border:'1px solid var(--border)', borderRadius:10, padding:12 }}>
              <p style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', marginBottom:2 }}>PORTFOLIO E REFERENCIAS</p>
              <p style={{ fontSize:11, color:'var(--text-muted)' }}>Clientes e obras anteriores. Aparece no final do PDF.</p>
            </div>

            {showImportRefs&&(
              <div style={{ background:'var(--bg-hover)', border:'1px solid var(--border)', borderRadius:10, padding:14 }}>
                <p style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)', marginBottom:8 }}>Colar lista de referencias</p>
                <p style={{ fontSize:11, color:'var(--text-muted)', marginBottom:8 }}>Uma referencia por linha. Separe campos com ponto e virgula: <code style={{ background:'var(--bg-card)', padding:'1px 5px', borderRadius:4 }}>Condominio X; Joao Silva; (54) 99999-0000</code></p>
                <textarea value={textoRefs} onChange={e=>setTextoRefs(e.target.value)} placeholder={'Residencial Palmeiras; Carlos Mendes; (54) 98888-0000\nCondominio Verde; Maria Lima; (54) 97777-0000'} style={{ ...IS, minHeight:140, fontFamily:'monospace', fontSize:12 }}/>
                <div style={{ display:'flex', gap:8, marginTop:10 }}>
                  <button onClick={()=>{
                    const novos = parseRefs(textoRefs).map(r=>({...r,id:newId()}))
                    setReferencias(r=>[...r,...novos])
                    setTextoRefs('')
                    setShowImportRefs(false)
                  }} style={{ padding:'7px 16px', borderRadius:8, background:'var(--text-primary)', color:'var(--bg-primary)', border:'none', cursor:'pointer', fontSize:13, fontWeight:600 }}>Adicionar {parseRefs(textoRefs).length} referencias</button>
                  <button onClick={()=>setShowImportRefs(false)} style={{ padding:'7px 14px', borderRadius:8, border:'1px solid var(--border)', background:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:13 }}>Cancelar</button>
                </div>
              </div>
            )}

            <div style={{ display:'flex', gap:8 }}>
              <button onClick={()=>setReferencias(r=>[...r,novaRef()])} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--text-muted)', padding:'7px 12px', borderRadius:8, border:'1px dashed var(--border)', background:'none', cursor:'pointer' }}>
                <Plus size={13}/> Adicionar
              </button>
              <button onClick={()=>setShowImportRefs(v=>!v)} style={{ fontSize:12, color:'#60a5fa', padding:'7px 12px', borderRadius:8, border:'1px solid rgba(96,165,250,0.3)', background:'rgba(96,165,250,0.08)', cursor:'pointer' }}>
                Colar lista do Word
              </button>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {referencias.map((r,i)=>(
                <div key={r.id||i} style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 80px auto', gap:8, alignItems:'end', padding:10, background:'var(--bg-hover)', borderRadius:8, border:'1px solid var(--border)' }}>
                  <Field label="Empreendimento"><input value={r.empreendimento||''} onChange={e=>setReferencias(rs=>rs.map((x,j)=>j===i?{...x,empreendimento:e.target.value}:x))} style={IS}/></Field>
                  <Field label="Contato"><input value={r.contato||''} onChange={e=>setReferencias(rs=>rs.map((x,j)=>j===i?{...x,contato:e.target.value}:x))} style={IS}/></Field>
                  <Field label="Telefone"><input value={r.telefone||''} onChange={e=>setReferencias(rs=>rs.map((x,j)=>j===i?{...x,telefone:e.target.value}:x))} style={IS}/></Field>
                  <ImgUpload label="Foto" src={r.foto||''} onFile={v=>setReferencias(rs=>rs.map((x,j)=>j===i?{...x,foto:v}:x))} small/>
                  <button onClick={()=>setReferencias(rs=>rs.filter((_,j)=>j!==i))} style={{ background:'rgba(239,68,68,0.1)', border:'none', borderRadius:6, padding:'8px', color:'#f87171', cursor:'pointer', marginBottom:1 }}><Trash2 size={13}/></button>
                </div>
              ))}
            </div>

            <GaleriaFotos fotos={fotosRefs} setFotos={setFotosRefs} max={8} titulo="Fotos de obras anteriores / portfolio"/>
          </div>
        )}

      </div>
    </div>
  )
}
