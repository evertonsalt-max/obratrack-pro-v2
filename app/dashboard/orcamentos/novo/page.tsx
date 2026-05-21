'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { Plus, Trash2, Download, Save, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react'
import { gerarPDFPremium } from '@/lib/OrcamentoPDF'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const fmtR$ = (v: number) => 'R$ ' + (v||0).toLocaleString('pt-BR',{minimumFractionDigits:2})

interface Item { id:string; descricao:string; quantidade:number; unidade:string; valor_unitario:number; desconto_pct:number }
interface Secao { id:string; titulo:string; subtitulo:string; area:string; etapas:string[]; valor_mao_obra:number; obs:string }
interface Patologia { id:string; nome:string; descricao:string; foto:string }
interface Referencia { id:string; empreendimento:string; contato:string; telefone:string }
interface FotoObra { id:string; src:string; legenda:string }

const newId = () => Math.random().toString(36).slice(2)
const novoItem = (): Item => ({ id:newId(), descricao:'', quantidade:1, unidade:'vb', valor_unitario:0, desconto_pct:0 })
const novaSecao = (): Secao => ({ id:newId(), titulo:'', subtitulo:'', area:'', etapas:[''], valor_mao_obra:0, obs:'' })
const novaPatologia = (): Patologia => ({ id:newId(), nome:'', descricao:'', foto:'' })
const novaRef = (): Referencia => ({ id:newId(), empreendimento:'', contato:'', telefone:'' })
const novaFoto = (): FotoObra => ({ id:newId(), src:'', legenda:'' })
const calcItem = (i: Item) => i.quantidade * i.valor_unitario * (1 - i.desconto_pct / 100)

// Materiais pré-sugeridos baseados no orçamento de referência
const MATERIAIS_SUGERIDOS: Omit<Item,'id'>[] = [
  { descricao:'Massa corrida PVA – paredes internas', quantidade:0, unidade:'gl', valor_unitario:0, desconto_pct:0 },
  { descricao:'Selador acrílico – fachada', quantidade:0, unidade:'lt', valor_unitario:0, desconto_pct:0 },
  { descricao:'Tinta acrílica premium – cor a definir', quantidade:0, unidade:'lt', valor_unitario:0, desconto_pct:0 },
  { descricao:'Tinta acrílica semibrilho – áreas molhadas', quantidade:0, unidade:'lt', valor_unitario:0, desconto_pct:0 },
  { descricao:'Fundo preparador de paredes', quantidade:0, unidade:'lt', valor_unitario:0, desconto_pct:0 },
  { descricao:'Impermeabilizante acrílico flexível', quantidade:0, unidade:'lt', valor_unitario:0, desconto_pct:0 },
  { descricao:'Argamassa polimérica – rejunte e vedação', quantidade:0, unidade:'kg', valor_unitario:0, desconto_pct:0 },
  { descricao:'Manta asfáltica 4mm – impermeabilização', quantidade:0, unidade:'m²', valor_unitario:0, desconto_pct:0 },
  { descricao:'Verniz maritimo – madeiras externas', quantidade:0, unidade:'lt', valor_unitario:0, desconto_pct:0 },
  { descricao:'Esmalte sintético – grades e metais', quantidade:0, unidade:'lt', valor_unitario:0, desconto_pct:0 },
  { descricao:'Lixa d\'água – preparação de superfície', quantidade:0, unidade:'pc', valor_unitario:0, desconto_pct:0 },
  { descricao:'Fita crepe – proteção e acabamento', quantidade:0, unidade:'un', valor_unitario:0, desconto_pct:0 },
  { descricao:'Rolo de lã – aplicação de tinta', quantidade:0, unidade:'un', valor_unitario:0, desconto_pct:0 },
  { descricao:'Primer epóxi – pisos e garagens', quantidade:0, unidade:'lt', valor_unitario:0, desconto_pct:0 },
  { descricao:'Textura acrílica – fachada e muros', quantidade:0, unidade:'kg', valor_unitario:0, desconto_pct:0 },
]

const defaultData = {
  numero:'ORC-001', status:'pendente',
  empresa_nome:'Nascimento Pinturas', empresa_cnpj:'10.212.424/0001-73',
  empresa_endereco:'Rua Mauri Alcides Scussel nº 46 – Bento Gonçalves - RS',
  empresa_telefone:'(54) 99704-1323', empresa_whatsapp:'(54) 99704-1323',
  empresa_email:'', empresa_instagram:'',
  empresa_responsavel:'Gabriel Nascimento', empresa_engenheiro:'Vinicius Pandini',
  empresa_crea:'RS 254904', empresa_experiencia:'mais de 20 anos',
  empresa_apresentacao:'A Nascimento Pinturas é especializada em pinturas prediais com mais de 20 anos de experiência em Bento Gonçalves e região. Contamos com equipe própria, qualificada e registrada, atuando de forma totalmente legalizada e em conformidade com a CLT e as exigências do Ministério do Trabalho.',
  cliente_nome:'', cliente_obra:'', cliente_endereco:'', cliente_telefone:'', cliente_email:'', cliente_cpf_cnpj:'',
  data_orcamento:new Date().toISOString().split('T')[0], cidade_data:'Bento Gonçalves',
  validade_dias:30, prazo_execucao:'3 (três) meses',
  garantia_tinta:'Garantia de até 8 anos conforme ficha técnica dos produtos utilizados.',
  garantia_execucao:'Garantia vinculada à aplicação correta do número de demãos determinadas em contrato.',
  forma_pagamento:'Parcelamento em até 20 (vinte) vezes em parcelas iguais com a primeira no início da obra.',
  num_parcelas:20, valor_entrada:0, num_unidades:0, observacoes:'',
}

const IS = { background:'var(--bg-hover)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 10px', fontSize:13, color:'var(--text-primary)', width:'100%' }
const LS = { fontSize:11, color:'var(--text-muted)', fontWeight:500 as const, textTransform:'uppercase' as const, letterSpacing:'.04em' }
const FS = { display:'flex', flexDirection:'column' as const, gap:4 }
const TA = { ...IS, resize:'vertical' as const, minHeight:72 }

function Field({ label, children }: { label:string; children:React.ReactNode }) {
  return <div style={FS}><label style={LS}>{label}</label>{children}</div>
}

function ImgUpload({ label, src, onFile, legenda, onLegenda, small }: { label:string; src:string; onFile:(b:string)=>void; legenda?:string; onLegenda?:(v:string)=>void; small?:boolean }) {
  const ref = useRef<HTMLInputElement>(null)
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return
    const r = new FileReader(); r.onload = () => onFile(r.result as string); r.readAsDataURL(f)
  }
  const h = small ? 56 : 80
  return (
    <div style={FS}>
      <label style={LS}>{label}</label>
      <div onClick={() => ref.current?.click()} style={{ border:'1px dashed var(--border)', borderRadius:8, padding:10, textAlign:'center', cursor:'pointer', background:'var(--bg-hover)', minHeight:h, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', position:'relative' }}>
        {src
          ? <img src={src} style={{ maxHeight:h, maxWidth:'100%', objectFit:'contain' }} alt=""/>
          : <span style={{ color:'var(--text-muted)', fontSize:11 }}>🖼 Carregar</span>
        }
        {src && <div style={{ position:'absolute', top:4, right:4, background:'rgba(0,0,0,0.5)', borderRadius:4, padding:'1px 5px', fontSize:9, color:'#fff', cursor:'pointer' }} onClick={e=>{e.stopPropagation();onFile('')}}>✕</div>}
      </div>
      <input ref={ref} type="file" accept="image/*" style={{ display:'none' }} onChange={onChange}/>
      {src && onLegenda && <input value={legenda||''} onChange={e=>onLegenda(e.target.value)} placeholder="Legenda" style={{ ...IS, fontSize:11, padding:'5px 8px', marginTop:2 }}/>}
    </div>
  )
}

function parseLinhas(texto: string): Omit<Item,'id'>[] {
  return texto.split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 2)
    .map(l => {
      // Tenta extrair quantidade e unidade do inicio: "10 m² Tinta acrílica"
      const match = l.match(/^(\d+[.,]?\d*)\s*(m2|m²|m|un|lt|bd|gl|pc|mt|hr|kg|vb)?\s+(.+)/i)
      if (match) {
        return {
          descricao: match[3].trim(),
          quantidade: parseFloat(match[1].replace(',','.')),
          unidade: (match[2] || 'vb').replace('m2','m²'),
          valor_unitario: 0,
          desconto_pct: 0,
        }
      }
      return { descricao: l, quantidade: 1, unidade: 'vb', valor_unitario: 0, desconto_pct: 0 }
    })
}

function ModalImportar({ onClose, onImportar, onAdicionar }: {
  onClose: () => void
  onImportar: (items: Omit<Item,'id'>[]) => void
  onAdicionar: (items: Omit<Item,'id'>[]) => void
}) {
  const [texto, setTexto] = useState('')
  const [parsed, setParsed] = useState<Omit<Item,'id'>[]>([])
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set())
  const [step, setStep] = useState<'colar'|'selecionar'>('colar')

  const processar = () => {
    const linhas = parseLinhas(texto)
    setParsed(linhas)
    setSelecionados(new Set(linhas.map((_,i) => i)))
    setStep('selecionar')
  }

  const toggleItem = (i: number) => {
    setSelecionados(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  const itensSelecionados = parsed.filter((_,i) => selecionados.has(i))

  const IS2 = { background:'var(--bg-hover)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 10px', fontSize:13, color:'var(--text-primary)', width:'100%' }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, width:'100%', maxWidth:600, maxHeight:'90vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>
        
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', borderBottom:'1px solid var(--border)' }}>
          <div>
            <p style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)' }}>
              {step === 'colar' ? 'Importar lista de materiais' : `${parsed.length} itens encontrados`}
            </p>
            <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>
              {step === 'colar' ? 'Cole o texto do Word — cada linha vira um item' : 'Selecione os itens que deseja importar'}
            </p>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:18 }}>✕</button>
        </div>

        {/* Conteúdo */}
        <div style={{ flex:1, overflow:'auto', padding:'14px 18px' }}>
          {step === 'colar' ? (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <p style={{ fontSize:12, color:'var(--text-muted)' }}>
                Cole aqui o texto copiado do Word. Cada linha será interpretada como um item. 
                Você pode incluir quantidade e unidade no início: <code style={{ background:'var(--bg-hover)', padding:'1px 5px', borderRadius:4, fontSize:11 }}>10 lt Tinta acrílica premium</code>
              </p>
              <textarea
                value={texto}
                onChange={e => setTexto(e.target.value)}
                placeholder={"Ex:\n10 lt Tinta acrílica premium\n5 lt Selador acrílico\nMassa corrida PVA\n20 m² Impermeabilizante"}
                style={{ ...IS2, minHeight:200, resize:'vertical', fontFamily:'monospace', fontSize:12 }}
                autoFocus
              />
              <p style={{ fontSize:11, color:'var(--text-muted)' }}>
                {texto.split('\n').filter(l=>l.trim().length>2).length} linhas detectadas
              </p>
            </div>
          ) : (
            <div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <p style={{ fontSize:12, color:'var(--text-muted)' }}>{selecionados.size} de {parsed.length} selecionados</p>
                <div style={{ display:'flex', gap:6 }}>
                  <button onClick={()=>setSelecionados(new Set(parsed.map((_,i)=>i)))} style={{ fontSize:11, padding:'3px 8px', borderRadius:6, border:'1px solid var(--border)', background:'none', color:'var(--text-muted)', cursor:'pointer' }}>Selecionar todos</button>
                  <button onClick={()=>setSelecionados(new Set())} style={{ fontSize:11, padding:'3px 8px', borderRadius:6, border:'1px solid var(--border)', background:'none', color:'var(--text-muted)', cursor:'pointer' }}>Limpar seleção</button>
                </div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                {parsed.map((item, i) => (
                  <div key={i} onClick={()=>toggleItem(i)} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:8, background: selecionados.has(i) ? 'rgba(96,165,250,0.08)' : 'var(--bg-hover)', border: selecionados.has(i) ? '1px solid rgba(96,165,250,0.3)' : '1px solid var(--border)', cursor:'pointer', transition:'all .15s' }}>
                    <div style={{ width:16, height:16, borderRadius:4, background: selecionados.has(i) ? '#60a5fa' : 'transparent', border: selecionados.has(i) ? '1px solid #60a5fa' : '1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      {selecionados.has(i) && <span style={{ color:'#fff', fontSize:10, fontWeight:700 }}>✓</span>}
                    </div>
                    <div style={{ flex:1 }}>
                      <p style={{ fontSize:13, color:'var(--text-primary)', margin:0 }}>{item.descricao}</p>
                      <p style={{ fontSize:11, color:'var(--text-muted)', margin:0 }}>{item.quantidade} {item.unidade}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'12px 18px', borderTop:'1px solid var(--border)', display:'flex', gap:8, justifyContent:'flex-end' }}>
          {step === 'colar' ? (
            <>
              <button onClick={onClose} style={{ padding:'7px 14px', borderRadius:8, border:'1px solid var(--border)', background:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:13 }}>Cancelar</button>
              <button onClick={processar} disabled={texto.split('\n').filter(l=>l.trim().length>2).length===0} style={{ padding:'7px 16px', borderRadius:8, background:'var(--text-primary)', color:'var(--bg-primary)', border:'none', cursor:'pointer', fontSize:13, fontWeight:600, opacity:texto.trim()?1:0.5 }}>
                Avançar →
              </button>
            </>
          ) : (
            <>
              <button onClick={()=>setStep('colar')} style={{ padding:'7px 14px', borderRadius:8, border:'1px solid var(--border)', background:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:13 }}>← Voltar</button>
              <button onClick={()=>{onAdicionar(itensSelecionados);onClose()}} disabled={selecionados.size===0} style={{ padding:'7px 14px', borderRadius:8, border:'1px solid var(--border)', background:'none', color:'var(--text-primary)', cursor:'pointer', fontSize:13, opacity:selecionados.size?1:0.5 }}>
                + Adicionar à lista
              </button>
              <button onClick={()=>{onImportar(itensSelecionados);onClose()}} disabled={selecionados.size===0} style={{ padding:'7px 16px', borderRadius:8, background:'var(--text-primary)', color:'var(--bg-primary)', border:'none', cursor:'pointer', fontSize:13, fontWeight:600, opacity:selecionados.size?1:0.5 }}>
                Substituir lista ({selecionados.size})
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ItemTable({ items, setItems }: { items:Item[]; setItems:React.Dispatch<React.SetStateAction<Item[]>> }) {
  const [showImportar, setShowImportar] = useState(false)
  const update = useCallback((id:string,k:string,v:any) => setItems(p=>p.map(i=>i.id===id?{...i,[k]:v}:i)),[setItems])
  return (
    <div>
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
          <thead>
            <tr style={{ borderBottom:'1px solid var(--border)', background:'var(--bg-primary)' }}>
              {['Descrição','Qtd','Unid.','Valor unit.','Desc.%','Total',''].map(h=>(
                <th key={h} style={{ padding:'7px 8px', textAlign:'left', fontSize:10, color:'var(--text-muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.04em', whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map(item=>(
              <tr key={item.id} style={{ borderBottom:'1px solid var(--border)' }}>
                <td style={{ padding:'5px 6px', minWidth:180 }}><input value={item.descricao} onChange={e=>update(item.id,'descricao',e.target.value)} style={{ ...IS, padding:'4px 7px', fontSize:12 }} placeholder="Descrição"/></td>
                <td style={{ padding:'5px 6px', width:65 }}><input type="number" value={item.quantidade} onChange={e=>update(item.id,'quantidade',+e.target.value)} style={{ ...IS, padding:'4px 7px', fontSize:12, width:65 }}/></td>
                <td style={{ padding:'5px 6px', width:72 }}>
                  <select value={item.unidade} onChange={e=>update(item.id,'unidade',e.target.value)} style={{ ...IS, padding:'4px 5px', fontSize:12, width:70 }}>
                    {['vb','m²','m','un','lt','bd','gl','pc','mt','hr','m³','kg'].map(u=><option key={u}>{u}</option>)}
                  </select>
                </td>
                <td style={{ padding:'5px 6px', width:100 }}><input type="number" value={item.valor_unitario} onChange={e=>update(item.id,'valor_unitario',+e.target.value)} style={{ ...IS, padding:'4px 7px', fontSize:12, width:95 }}/></td>
                <td style={{ padding:'5px 6px', width:60 }}><input type="number" value={item.desconto_pct} min={0} max={100} onChange={e=>update(item.id,'desconto_pct',+e.target.value)} style={{ ...IS, padding:'4px 7px', fontSize:12, width:55 }}/></td>
                <td style={{ padding:'5px 8px', color:'var(--text-primary)', fontWeight:600, whiteSpace:'nowrap', textAlign:'right' }}>{fmtR$(calcItem(item))}</td>
                <td style={{ padding:'5px 6px' }}><button onClick={()=>setItems(p=>p.filter(i=>i.id!==item.id))} style={{ background:'rgba(239,68,68,0.1)', border:'none', borderRadius:6, padding:'4px 6px', color:'#f87171', cursor:'pointer' }}><Trash2 size={12}/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:10, flexWrap:'wrap', gap:8 }}>
        <div style={{ display:'flex', gap:6 }}>
          <button onClick={()=>setItems(p=>[...p,novoItem()])} style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'var(--text-muted)', padding:'5px 10px', borderRadius:7, border:'1px dashed var(--border)', background:'none', cursor:'pointer' }}>
            <Plus size={12}/> Adicionar item
          </button>
          <button onClick={()=>setShowImportar(true)} style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'#60a5fa', padding:'5px 10px', borderRadius:7, border:'1px solid rgba(96,165,250,0.3)', background:'rgba(96,165,250,0.08)', cursor:'pointer' }}>
            📋 Importar do Word
          </button>
          <div style={{ position:'relative' }}>
            <select onChange={e=>{
              const s = MATERIAIS_SUGERIDOS[+e.target.value]
              if (s) setItems(p=>[...p,{...s,id:newId()}])
              e.target.value = ''
            }} style={{ ...IS, width:'auto', fontSize:11, padding:'5px 8px', cursor:'pointer' }} defaultValue="">
              <option value="">+ Sugestões de materiais</option>
              {MATERIAIS_SUGERIDOS.map((m,i)=><option key={i} value={i}>{m.descricao}</option>)}
            </select>
          </div>
        </div>
        <div style={{ textAlign:'right' }}>
          <p style={{ fontSize:11, color:'var(--text-muted)', marginBottom:2 }}>Total materiais</p>
          <p style={{ fontSize:17, fontWeight:700, color:'var(--text-primary)' }}>{fmtR$(items.reduce((s,i)=>s+calcItem(i),0))}</p>
        </div>
      </div>
    </div>
    {showImportar && (
      <ModalImportar
        onClose={()=>setShowImportar(false)}
        onImportar={novos=>setItems(novos.map(i=>({...i,id:newId()})))}
        onAdicionar={novos=>setItems(p=>[...p,...novos.map(i=>({...i,id:newId()}))])}
      />
    )}
  )
}

function SecaoCard({ sec, onChange, onRemove }: { sec:Secao; onChange:(s:Secao)=>void; onRemove:()=>void }) {
  const [open, setOpen] = useState(true)
  const up = (k:string,v:any) => onChange({...sec,[k]:v})
  return (
    <div style={{ border:'1px solid var(--border)', borderRadius:10, overflow:'hidden', marginBottom:10 }}>
      <div onClick={()=>setOpen(o=>!o)} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'var(--bg-primary)', cursor:'pointer' }}>
        <span style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>{sec.titulo||'Nova seção'}</span>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:12, color:'var(--text-muted)' }}>{fmtR$(sec.valor_mao_obra)}</span>
          <button onClick={e=>{e.stopPropagation();onRemove()}} style={{ background:'rgba(239,68,68,0.1)', border:'none', borderRadius:5, padding:'3px 6px', color:'#f87171', cursor:'pointer' }}><Trash2 size={12}/></button>
          {open ? <ChevronUp size={14} style={{ color:'var(--text-muted)' }}/> : <ChevronDown size={14} style={{ color:'var(--text-muted)' }}/>}
        </div>
      </div>
      {open && (
        <div style={{ padding:14, display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
            <Field label="Título"><input value={sec.titulo} onChange={e=>up('titulo',e.target.value)} style={IS} placeholder="Ex: Alvenaria Externa"/></Field>
            <Field label="Subtítulo"><input value={sec.subtitulo} onChange={e=>up('subtitulo',e.target.value)} style={IS} placeholder="Ex: Fachadas e muros"/></Field>
            <Field label="Área / Local"><input value={sec.area} onChange={e=>up('area',e.target.value)} style={IS} placeholder="Ex: 500 m²"/></Field>
          </div>
          <Field label="Etapas de execução">
            {sec.etapas.map((et,i)=>(
              <div key={i} style={{ display:'flex', gap:6, marginBottom:5 }}>
                <input value={et} onChange={e=>{ const arr=[...sec.etapas]; arr[i]=e.target.value; up('etapas',arr) }} style={{ ...IS, flex:1 }} placeholder={`Etapa ${i+1}`}/>
                <button onClick={()=>up('etapas',sec.etapas.filter((_,j)=>j!==i))} style={{ background:'rgba(239,68,68,0.1)', border:'none', borderRadius:6, padding:'4px 8px', color:'#f87171', cursor:'pointer' }}><Trash2 size={11}/></button>
              </div>
            ))}
            <button onClick={()=>up('etapas',[...sec.etapas,''])} style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'var(--text-muted)', padding:'4px 8px', borderRadius:6, border:'1px dashed var(--border)', background:'none', cursor:'pointer', marginTop:2 }}>
              <Plus size={11}/> Adicionar etapa
            </button>
          </Field>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <Field label="Valor mão de obra (R$)"><input type="number" value={sec.valor_mao_obra} onChange={e=>up('valor_mao_obra',+e.target.value)} style={IS}/></Field>
            <Field label="Observação"><input value={sec.obs} onChange={e=>up('obs',e.target.value)} style={IS} placeholder="Opcional"/></Field>
          </div>
        </div>
      )}
    </div>
  )
}

function PatologiaCard({ pat, onChange, onRemove }: { pat:Patologia; onChange:(p:Patologia)=>void; onRemove:()=>void }) {
  return (
    <div style={{ border:'1px solid var(--border)', borderRadius:10, padding:14, marginBottom:8, display:'grid', gridTemplateColumns:'1fr 130px', gap:10 }}>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        <Field label="Patologia"><input value={pat.nome} onChange={e=>onChange({...pat,nome:e.target.value})} style={IS} placeholder="Ex: Trincas na fachada"/></Field>
        <Field label="Descrição"><textarea value={pat.descricao} onChange={e=>onChange({...pat,descricao:e.target.value})} style={{ ...TA, minHeight:56 }} placeholder="Descreva o problema"/></Field>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        <ImgUpload label="Foto" src={pat.foto} onFile={v=>onChange({...pat,foto:v})} small/>
        <button onClick={onRemove} style={{ background:'rgba(239,68,68,0.1)', border:'none', borderRadius:6, padding:'6px', color:'#f87171', cursor:'pointer' }}><Trash2 size={13}/></button>
      </div>
    </div>
  )
}

function RefCard({ ref: r, onChange, onRemove }: { ref:Referencia; onChange:(r:Referencia)=>void; onRemove:()=>void }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr auto', gap:8, marginBottom:6, alignItems:'end' }}>
      <Field label="Empreendimento"><input value={r.empreendimento} onChange={e=>onChange({...r,empreendimento:e.target.value})} style={IS} placeholder="Nome do cliente/obra"/></Field>
      <Field label="Contato"><input value={r.contato} onChange={e=>onChange({...r,contato:e.target.value})} style={IS} placeholder="Nome do contato"/></Field>
      <Field label="Telefone"><input value={r.telefone} onChange={e=>onChange({...r,telefone:e.target.value})} style={IS} placeholder="(00) 00000-0000"/></Field>
      <button onClick={onRemove} style={{ background:'rgba(239,68,68,0.1)', border:'none', borderRadius:6, padding:'8px', color:'#f87171', cursor:'pointer', marginBottom:1 }}><Trash2 size={13}/></button>
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
  const [patologias, setPatologias] = useState<Patologia[]>([])
  const [referencias, setReferencias] = useState<Referencia[]>([])
  const [fotosObra, setFotosObra] = useState<FotoObra[]>([])
  const [logoSrc, setLogoSrc] = useState('')
  const [capaSrc, setCapaSrc] = useState('')
  const [marcaDagua, setMarcaDagua] = useState('')
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('empresa')
  const [loadingData, setLoadingData] = useState(!!isEdit)

  const up = (k:string) => (e:any) => setData((p:any)=>({...p,[k]:e.target.value}))

  useEffect(() => {
    if (!isEdit) return
    const load = async () => {
      setLoadingData(true)
      const { data: orc } = await supabase.from('orcamentos').select('*').eq('id', params.id).single()
      if (orc) {
        setData(orc)
        setSecoes(orc.secoes || [])
        setMateriais(orc.itens_materiais || [])
        setPatologias(orc.patologias || [])
        setReferencias(orc.referencias || [])
        setFotosObra(orc.fotos_obra || [])
        if (orc.fotos?.logo) setLogoSrc(orc.fotos.logo)
        if (orc.fotos?.capa) setCapaSrc(orc.fotos.capa)
        if (orc.fotos?.marca_dagua) setMarcaDagua(orc.fotos.marca_dagua)
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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    const payload = {
      ...data, user_id: user.id,
      secoes, itens_materiais: materiais, patologias, referencias,
      fotos_obra: fotosObra,
      fotos: { logo: logoSrc, capa: capaSrc, marca_dagua: marcaDagua },
      total_mao_obra: totalMaoObra, total_materiais: totalMateriais, total_geral: totalGeral,
      updated_at: new Date().toISOString(),
    }
    if (isEdit) {
      await supabase.from('orcamentos').update(payload).eq('id', params.id)
      setSaving(false)
    } else {
      const { data: cr } = await supabase.from('orcamentos').insert(payload).select().single()
      if (cr) router.push(`/dashboard/orcamentos/${cr.id}`)
      else setSaving(false)
    }
  }

  const baixarPDF = async () => {
    await gerarPDFPremium({
      empresa_nome: data.empresa_nome, empresa_cnpj: data.empresa_cnpj,
      empresa_endereco: data.empresa_endereco, empresa_telefone: data.empresa_telefone,
      empresa_whatsapp: data.empresa_whatsapp, empresa_email: data.empresa_email,
      empresa_instagram: data.empresa_instagram, empresa_responsavel: data.empresa_responsavel,
      empresa_engenheiro: data.empresa_engenheiro, empresa_crea: data.empresa_crea,
      empresa_apresentacao: data.empresa_apresentacao, empresa_experiencia: data.empresa_experiencia,
      cliente_nome: data.cliente_nome, cliente_obra: data.cliente_obra,
      cliente_endereco: data.cliente_endereco, cliente_telefone: data.cliente_telefone,
      numero: data.numero, data_orcamento: data.data_orcamento,
      cidade_data: data.cidade_data, validade_dias: data.validade_dias,
      logoBase64: logoSrc, foto_capa: capaSrc, marca_dagua: marcaDagua,
      fotos_obra: fotosObra,
      secoes: secoes.map(s=>({...s, etapas:s.etapas.filter(e=>e.trim())})),
      patologias, itens_materiais: materiais, referencias,
      total_mao_obra: totalMaoObra, total_materiais: totalMateriais, total_geral: totalGeral,
      forma_pagamento: data.forma_pagamento, num_parcelas: +data.num_parcelas||0,
      valor_entrada: +data.valor_entrada||0, num_unidades: +data.num_unidades||0,
      prazo_execucao: data.prazo_execucao, garantia_tinta: data.garantia_tinta,
      garantia_execucao: data.garantia_execucao, observacoes: data.observacoes,
    })
  }

  const TABS = [
    { id:'empresa',    label:'Empresa' },
    { id:'cliente',    label:'Cliente' },
    { id:'fotos',      label:'Fotos' },
    { id:'patologias', label:'Diagnóstico' },
    { id:'secoes',     label:'Serviços' },
    { id:'materiais',  label:'Materiais' },
    { id:'financeiro', label:'Financeiro' },
    { id:'condicoes',  label:'Condições' },
    { id:'referencias',label:'Referências' },
  ]

  if (loadingData) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', background:'var(--bg-primary)' }}>
      <div style={{ textAlign:'center' }}>
        <div className="w-8 h-8 border-2 border-gray-700 border-t-white rounded-full animate-spin" style={{ margin:'0 auto 12px' }}/>
        <p style={{ color:'var(--text-muted)', fontSize:13 }}>Carregando orçamento...</p>
      </div>
    </div>
  )

  return (
    <div style={{ padding:20, background:'var(--bg-primary)', minHeight:'100vh' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={()=>router.push('/dashboard/orcamentos')} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:8, padding:'6px 10px', color:'var(--text-muted)', cursor:'pointer' }}><ArrowLeft size={15}/></button>
          <div>
            <h1 style={{ fontSize:17, fontWeight:700, color:'var(--text-primary)', letterSpacing:'-.3px' }}>
              {isEdit ? `Editando: ${data.numero}` : 'Novo Orçamento'}
            </h1>
            <p style={{ fontSize:11, color:'var(--text-muted)' }}>Proposta comercial de reforma e pintura</p>
          </div>
        </div>
        <div style={{ display:'flex', gap:7 }}>
          <select value={data.status} onChange={up('status')} style={{ ...IS, width:'auto', fontSize:12 }}>
            <option value="pendente">Pendente</option>
            <option value="aprovado">Aprovado</option>
            <option value="reprovado">Reprovado</option>
            <option value="cancelado">Cancelado</option>
          </select>
          <button onClick={baixarPDF} style={{ display:'flex', alignItems:'center', gap:5, background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:8, padding:'7px 13px', fontSize:13, fontWeight:500, color:'var(--text-primary)', cursor:'pointer' }}>
            <Download size={13}/> PDF Premium
          </button>
          <button onClick={salvar} disabled={saving} style={{ display:'flex', alignItems:'center', gap:5, background:'var(--text-primary)', color:'var(--bg-primary)', border:'none', borderRadius:8, padding:'7px 15px', fontSize:13, fontWeight:600, cursor:'pointer', opacity:saving?0.7:1 }}>
            <Save size={13}/> {saving ? 'Salvando...' : (isEdit ? 'Salvar alterações' : 'Criar orçamento')}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:14 }}>
        {[
          { label:'Mão de obra', value:fmtR$(totalMaoObra), color:'#60a5fa' },
          { label:'Materiais',   value:fmtR$(totalMateriais), color:'#a78bfa' },
          { label:'Total geral', value:fmtR$(totalGeral), color:'var(--text-primary)' },
          { label:'Fotos da obra', value:fotosObra.filter(f=>f.src).length+'/12', color:'#34d399' },
        ].map(({label,value,color})=>(
          <div key={label} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10, padding:'10px 14px' }}>
            <p style={{ fontSize:10, color:'var(--text-muted)', marginBottom:3, fontWeight:500 }}>{label}</p>
            <p style={{ fontSize:17, fontWeight:700, color, letterSpacing:'-.4px' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:0, marginBottom:14, borderBottom:'1px solid var(--border)', overflowX:'auto' }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            padding:'7px 14px', fontSize:12, fontWeight:tab===t.id?600:400,
            color:tab===t.id?'var(--text-primary)':'var(--text-muted)',
            background:'none', border:'none', cursor:'pointer', whiteSpace:'nowrap',
            borderBottom:tab===t.id?'2px solid var(--text-primary)':'2px solid transparent',
            marginBottom:-1,
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:18 }}>

        {/* EMPRESA */}
        {tab==='empresa' && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
              <Field label="Nome da empresa"><input value={data.empresa_nome} onChange={up('empresa_nome')} style={IS}/></Field>
              <Field label="CNPJ"><input value={data.empresa_cnpj} onChange={up('empresa_cnpj')} style={IS}/></Field>
              <Field label="Nº do orçamento"><input value={data.numero} onChange={up('numero')} style={IS}/></Field>
              <Field label="Telefone"><input value={data.empresa_telefone} onChange={up('empresa_telefone')} style={IS}/></Field>
              <Field label="WhatsApp"><input value={data.empresa_whatsapp} onChange={up('empresa_whatsapp')} style={IS}/></Field>
              <Field label="E-mail"><input value={data.empresa_email} onChange={up('empresa_email')} style={IS}/></Field>
              <Field label="Instagram"><input value={data.empresa_instagram} onChange={up('empresa_instagram')} style={IS}/></Field>
              <Field label="Responsável"><input value={data.empresa_responsavel} onChange={up('empresa_responsavel')} style={IS}/></Field>
              <Field label="Experiência"><input value={data.empresa_experiencia} onChange={up('empresa_experiencia')} style={IS} placeholder="Ex: mais de 20 anos"/></Field>
              <div style={{ ...FS, gridColumn:'span 2' }}><label style={LS}>Endereço</label><input value={data.empresa_endereco} onChange={up('empresa_endereco')} style={IS}/></div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                <Field label="Engenheiro RT"><input value={data.empresa_engenheiro} onChange={up('empresa_engenheiro')} style={IS}/></Field>
                <Field label="CREA"><input value={data.empresa_crea} onChange={up('empresa_crea')} style={IS}/></Field>
              </div>
            </div>
            <Field label="Apresentação institucional"><textarea value={data.empresa_apresentacao} onChange={up('empresa_apresentacao')} style={TA}/></Field>
          </div>
        )}

        {/* CLIENTE */}
        {tab==='cliente' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="Nome do cliente"><input value={data.cliente_nome} onChange={up('cliente_nome')} style={IS} placeholder="Nome completo"/></Field>
            <Field label="CPF / CNPJ"><input value={data.cliente_cpf_cnpj} onChange={up('cliente_cpf_cnpj')} style={IS}/></Field>
            <Field label="Nome da obra / empreendimento"><input value={data.cliente_obra} onChange={up('cliente_obra')} style={IS} placeholder="Ex: Residencial Vila Verde"/></Field>
            <Field label="Telefone"><input value={data.cliente_telefone} onChange={up('cliente_telefone')} style={IS}/></Field>
            <div style={{ ...FS, gridColumn:'span 2' }}><label style={LS}>Endereço da obra</label><input value={data.cliente_endereco} onChange={up('cliente_endereco')} style={IS}/></div>
            <Field label="Cidade / Estado"><input value={data.cidade_data} onChange={up('cidade_data')} style={IS}/></Field>
            <Field label="Data do orçamento"><input type="date" value={data.data_orcamento} onChange={up('data_orcamento')} style={IS}/></Field>
            <Field label="Validade (dias)"><input type="number" value={data.validade_dias} onChange={up('validade_dias')} style={IS}/></Field>
          </div>
        )}

        {/* FOTOS */}
        {tab==='fotos' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14 }}>
              <ImgUpload label="Logo da empresa" src={logoSrc} onFile={setLogoSrc}/>
              <ImgUpload label="Foto de capa (página 1)" src={capaSrc} onFile={setCapaSrc}/>
              <div style={FS}>
                <label style={LS}>Marca d'água das páginas</label>
                <ImgUpload label="" src={marcaDagua} onFile={setMarcaDagua}/>
                <p style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>Aparece suavemente no fundo de todas as páginas</p>
              </div>
            </div>

            <div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <p style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.04em' }}>
                  Galeria da obra — {fotosObra.filter(f=>f.src).length}/12 fotos
                </p>
                {fotosObra.length < 12 && (
                  <button onClick={()=>setFotosObra(p=>[...p,novaFoto()])} style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'var(--text-muted)', padding:'5px 10px', borderRadius:7, border:'1px dashed var(--border)', background:'none', cursor:'pointer' }}>
                    <Plus size={12}/> Adicionar foto
                  </button>
                )}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
                {fotosObra.map((foto,i)=>(
                  <div key={foto.id} style={{ position:'relative' }}>
                    <ImgUpload
                      label={`Foto ${i+1}`}
                      src={foto.src}
                      onFile={v=>setFotosObra(p=>p.map(f=>f.id===foto.id?{...f,src:v}:f))}
                      legenda={foto.legenda}
                      onLegenda={v=>setFotosObra(p=>p.map(f=>f.id===foto.id?{...f,legenda:v}:f))}
                      small
                    />
                    <button onClick={()=>setFotosObra(p=>p.filter(f=>f.id!==foto.id))} style={{ position:'absolute', top:20, right:2, background:'rgba(239,68,68,0.8)', border:'none', borderRadius:4, padding:'2px 5px', color:'#fff', cursor:'pointer', fontSize:10 }}>✕</button>
                  </div>
                ))}
                {fotosObra.length === 0 && (
                  <div style={{ gridColumn:'span 4', textAlign:'center', padding:32, color:'var(--text-muted)', fontSize:13 }}>
                    Clique em "Adicionar foto" para incluir fotos da obra (máx. 12)
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* DIAGNÓSTICO */}
        {tab==='patologias' && (
          <div>
            <p style={{ fontSize:12, color:'var(--text-muted)', marginBottom:12 }}>Registre as patologias encontradas na obra. Cada uma pode ter foto e descrição técnica.</p>
            {patologias.map(pat=>(
              <PatologiaCard key={pat.id} pat={pat}
                onChange={p=>setPatologias(ps=>ps.map(x=>x.id===p.id?p:x))}
                onRemove={()=>setPatologias(ps=>ps.filter(x=>x.id!==pat.id))}/>
            ))}
            <button onClick={()=>setPatologias(p=>[...p,novaPatologia()])} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--text-muted)', padding:'7px 12px', borderRadius:8, border:'1px dashed var(--border)', background:'none', cursor:'pointer', marginTop:4 }}>
              <Plus size={13}/> Adicionar patologia
            </button>
          </div>
        )}

        {/* SERVIÇOS */}
        {tab==='secoes' && (
          <div>
            <p style={{ fontSize:12, color:'var(--text-muted)', marginBottom:12 }}>Cada seção vira uma página de serviço no PDF com etapas detalhadas e valor.</p>
            {secoes.map(sec=>(
              <SecaoCard key={sec.id} sec={sec}
                onChange={s=>setSecoes(ss=>ss.map(x=>x.id===s.id?s:x))}
                onRemove={()=>setSecoes(ss=>ss.filter(x=>x.id!==sec.id))}/>
            ))}
            <button onClick={()=>setSecoes(s=>[...s,novaSecao()])} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--text-muted)', padding:'7px 12px', borderRadius:8, border:'1px dashed var(--border)', background:'none', cursor:'pointer' }}>
              <Plus size={13}/> Adicionar seção de serviço
            </button>
          </div>
        )}

        {/* MATERIAIS */}
        {tab==='materiais' && <ItemTable items={materiais} setItems={setMateriais}/>}

        {/* FINANCEIRO */}
        {tab==='financeiro' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div style={{ ...FS, gridColumn:'span 2', background:'var(--bg-hover)', border:'1px solid var(--border)', borderRadius:10, padding:14 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                {[
                  {l:'Mão de obra', v:fmtR$(totalMaoObra), c:'#60a5fa'},
                  {l:'Materiais',   v:fmtR$(totalMateriais), c:'#a78bfa'},
                  {l:'Total geral', v:fmtR$(totalGeral), c:'var(--text-primary)'},
                ].map(({l,v,c})=>(
                  <div key={l}><p style={{ fontSize:11, color:'var(--text-muted)', marginBottom:3 }}>{l}</p><p style={{ fontSize:20, fontWeight:700, color:c }}>{v}</p></div>
                ))}
              </div>
            </div>
            <Field label="Número de parcelas"><input type="number" value={data.num_parcelas} onChange={up('num_parcelas')} style={IS}/></Field>
            <Field label="Valor de entrada (R$)"><input type="number" value={data.valor_entrada} onChange={up('valor_entrada')} style={IS}/></Field>
            <Field label="Nº de unidades/apartamentos"><input type="number" value={data.num_unidades} onChange={up('num_unidades')} style={IS} placeholder="0 = não mostrar"/></Field>
            {+data.num_parcelas > 1 && (
              <div style={FS}>
                <label style={LS}>Valor por parcela</label>
                <p style={{ fontSize:20, fontWeight:700, color:'#34d399', padding:'8px 0' }}>
                  {fmtR$((totalGeral-(+data.valor_entrada||0))/(+data.num_parcelas||1))}
                </p>
              </div>
            )}
            {+data.num_unidades > 1 && (
              <div style={FS}>
                <label style={LS}>Valor por unidade</label>
                <p style={{ fontSize:20, fontWeight:700, color:'#fbbf24', padding:'8px 0' }}>{fmtR$(totalGeral/(+data.num_unidades||1))}</p>
              </div>
            )}
            <div style={{ ...FS, gridColumn:'span 2' }}>
              <label style={LS}>Forma de pagamento</label>
              <textarea value={data.forma_pagamento} onChange={up('forma_pagamento')} style={TA}/>
            </div>
          </div>
        )}

        {/* CONDIÇÕES */}
        {tab==='condicoes' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="Prazo de execução"><input value={data.prazo_execucao} onChange={up('prazo_execucao')} style={IS}/></Field>
            <Field label="Validade (dias)"><input type="number" value={data.validade_dias} onChange={up('validade_dias')} style={IS}/></Field>
            <div style={{ ...FS, gridColumn:'span 2' }}><label style={LS}>Garantia da tinta</label><textarea value={data.garantia_tinta} onChange={up('garantia_tinta')} style={{ ...TA, minHeight:56 }}/></div>
            <div style={{ ...FS, gridColumn:'span 2' }}><label style={LS}>Garantia da execução</label><textarea value={data.garantia_execucao} onChange={up('garantia_execucao')} style={{ ...TA, minHeight:56 }}/></div>
            <div style={{ ...FS, gridColumn:'span 2' }}><label style={LS}>Observações gerais</label><textarea value={data.observacoes} onChange={up('observacoes')} style={TA}/></div>
          </div>
        )}

        {/* REFERÊNCIAS */}
        {tab==='referencias' && (
          <div>
            <p style={{ fontSize:12, color:'var(--text-muted)', marginBottom:12 }}>Lista de clientes e obras anteriores que aparecem no portfólio do PDF.</p>
            {referencias.map(r=>(
              <RefCard key={r.id} ref={r}
                onChange={nr=>setReferencias(rs=>rs.map(x=>x.id===nr.id?nr:x))}
                onRemove={()=>setReferencias(rs=>rs.filter(x=>x.id!==r.id))}/>
            ))}
            <button onClick={()=>setReferencias(r=>[...r,novaRef()])} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--text-muted)', padding:'7px 12px', borderRadius:8, border:'1px dashed var(--border)', background:'none', cursor:'pointer', marginTop:4 }}>
              <Plus size={13}/> Adicionar referência
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
