'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { Plus, Trash2, Download, Save, ArrowLeft, Image as ImageIcon } from 'lucide-react'
import { gerarPDF } from '@/lib/OrcamentoPDF'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
const sb = () => supabase

const fmtR$ = (v: number) => 'R$ ' + (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })

interface Item {
  id: string
  descricao: string
  quantidade: number
  unidade: string
  valor_unitario: number
  desconto_pct: number
}

const novoItem = (): Item => ({
  id: Math.random().toString(36).slice(2),
  descricao: '',
  quantidade: 1,
  unidade: 'vb',
  valor_unitario: 0,
  desconto_pct: 0,
})

const calcItem = (item: Item) => item.quantidade * item.valor_unitario * (1 - item.desconto_pct / 100)

const defaultData = {
  numero: 'ORC-001',
  status: 'pendente',
  empresa_nome: 'Nascimento Pinturas',
  empresa_cnpj: '10.212.424/0001-73',
  empresa_endereco: 'Rua Mauri Alcides Scussel nº 46 – Bento Gonçalves - RS',
  empresa_telefone: '(54) 99704-1323',
  empresa_whatsapp: '(54) 99704-1323',
  empresa_email: '',
  empresa_instagram: '',
  empresa_responsavel: 'Gabriel Nascimento',
  empresa_engenheiro: 'Vinicius Pandini',
  empresa_crea: 'RS 254904',
  empresa_apresentacao: 'A Nascimento Pinturas (CNPJ 10.212.424/0001-73) é especializada em pinturas prediais com mais de 20 anos de experiência em Bento Gonçalves e região. Contamos com equipe própria, qualificada e registrada, atuando de forma totalmente legalizada.',
  cliente_nome: '',
  cliente_obra: '',
  cliente_endereco: '',
  cliente_telefone: '',
  cliente_email: '',
  cliente_cpf_cnpj: '',
  data_orcamento: new Date().toISOString().split('T')[0],
  cidade_data: 'Bento Gonçalves',
  validade_dias: 30,
  prazo_execucao: '3 (três) meses',
  forma_pagamento: 'Parcelamento em até 20 (vinte) vezes em parcelas iguais com a primeira no início da obra.',
  garantia: 'Garantia de até 8 anos, conforme as condições específicas previstas em ficha técnica de produtos utilizados.',
  observacoes: '',
}

function ImgUpload({ label, src, onClick, inputRef, onChange, legenda, onLegenda, inputStyle }: any) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</label>
      <div onClick={onClick} style={{ border: '1px dashed var(--border)', borderRadius: 8, padding: 16, textAlign: 'center', cursor: 'pointer', background: 'var(--bg-hover)', minHeight: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {src
          ? <img src={src} style={{ maxHeight: 80, maxWidth: '100%', objectFit: 'contain' }} alt="preview"/>
          : <div style={{ color: 'var(--text-muted)', fontSize: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 20 }}>🖼</span> Clique para carregar
            </div>
        }
      </div>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onChange}/>
      {src && (
        <input
          value={legenda || ''}
          onChange={e => onLegenda && onLegenda(e.target.value)}
          placeholder="Legenda da foto (opcional)"
          style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', fontSize: 12, color: 'var(--text-primary)', width: '100%', marginTop: 2 }}
        />
      )}
    </div>
  )
}

export default function OrcamentoFormPage() {
  const router = useRouter()
  const params = useParams()
  const isEdit = params?.id && params.id !== 'novo'

  const [data, setData] = useState<any>(defaultData)
  const [itensMaoObra, setItensMaoObra] = useState<Item[]>([])
  const [itensMateriais, setItensMateriais] = useState<Item[]>([])
  const [logoBase64, setLogoBase64] = useState<string>('')
  const [imgFoto1, setImgFoto1] = useState<string>('')
  const [imgFoto2, setImgFoto2] = useState<string>('')
  const [legendaLogo, setLegendaLogo] = useState<string>('')
  const [legendaFoto1, setLegendaFoto1] = useState<string>('')
  const [legendaFoto2, setLegendaFoto2] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'empresa'|'cliente'|'maoobra'|'materiais'|'condicoes'>('empresa')

  const logoRef = useRef<HTMLInputElement>(null)
  const foto1Ref = useRef<HTMLInputElement>(null)
  const foto2Ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEdit) {
      const load = async () => {
        const { data: orc } = await sb().from('orcamentos').select('*').eq('id', params.id).single()
        if (orc) {
          setData(orc)
          setItensMaoObra(orc.itens_mao_obra || [])
          setItensMateriais(orc.itens_materiais || [])
        }
      }
      load()
    }
  }, [isEdit, params?.id])

  const up = (k: string) => (e: any) => setData((p: any) => ({ ...p, [k]: e.target.value }))

  const totalMaoObra = itensMaoObra.reduce((s, i) => s + calcItem(i), 0)
  const totalMateriais = itensMateriais.reduce((s, i) => s + calcItem(i), 0)
  const totalGeral = totalMaoObra + totalMateriais

  const updateItem = (list: Item[], setList: any, id: string, key: string, value: any) => {
    setList(list.map((item: Item) => item.id === id ? { ...item, [key]: value } : item))
  }

  const salvar = async () => {
    setSaving(true)
    const { data: { user } } = await sb().auth.getUser()
    if (!user) return
    const payload = {
      ...data,
      user_id: user.id,
      itens_mao_obra: itensMaoObra,
      itens_materiais: itensMateriais,
      total_mao_obra: totalMaoObra,
      total_materiais: totalMateriais,
      total_geral: totalGeral,
      updated_at: new Date().toISOString(),
    }
    if (isEdit) {
      await sb().from('orcamentos').update(payload).eq('id', params.id)
    } else {
      const { data: { user } } = await sb().auth.getUser()
      const { data: created } = await sb().from('orcamentos').insert({ ...payload, user_id: user!.id }).select().single()
      if (created) { router.push(`/dashboard/orcamentos/${created.id}`); return }
    }
    setSaving(false)
  }

  const handleImagem = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setter(reader.result as string)
    reader.readAsDataURL(file)
  }

  const baixarPDF = async () => {
    await gerarPDF({
      data, itensMaoObra, itensMateriais,
      totalMaoObra, totalMateriais, totalGeral,
      logoBase64, imgFoto1, imgFoto2, legendaFoto1, legendaFoto2,
    })
  }

  const fieldStyle = { display: 'flex', flexDirection: 'column' as const, gap: 4 }
  const labelStyle = { fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '.04em' }
  const inputStyle = { background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)', width: '100%' }
  const textareaStyle = { ...inputStyle, resize: 'vertical' as const, minHeight: 80 }

  const tabs = [
    { id: 'empresa',   label: 'Empresa' },
    { id: 'cliente',   label: 'Cliente' },
    { id: 'maoobra',   label: 'Mão de obra' },
    { id: 'materiais', label: 'Materiais' },
    { id: 'condicoes', label: 'Condições' },
  ]

  const ItemTable = ({ items, setItems, label }: { items: Item[], setItems: any, label: string }) => (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-primary)' }}>
              {['Descrição', 'Qtd', 'Unid.', 'Valor unit.', 'Desc. %', 'Total', ''].map(h => (
                <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '6px 8px', minWidth: 200 }}>
                  <input value={item.descricao} onChange={e => updateItem(items, setItems, item.id, 'descricao', e.target.value)} style={{ ...inputStyle, padding: '5px 8px', fontSize: 12 }} placeholder="Descrição do serviço/material"/>
                </td>
                <td style={{ padding: '6px 8px', width: 70 }}>
                  <input type="number" value={item.quantidade} onChange={e => updateItem(items, setItems, item.id, 'quantidade', +e.target.value)} style={{ ...inputStyle, padding: '5px 8px', fontSize: 12, width: 70 }}/>
                </td>
                <td style={{ padding: '6px 8px', width: 80 }}>
                  <select value={item.unidade} onChange={e => updateItem(items, setItems, item.id, 'unidade', e.target.value)} style={{ ...inputStyle, padding: '5px 6px', fontSize: 12, width: 75 }}>
                    {['vb','m²','m','un','lt','bd','gl','pc','mt','hr'].map(u => <option key={u}>{u}</option>)}
                  </select>
                </td>
                <td style={{ padding: '6px 8px', width: 110 }}>
                  <input type="number" value={item.valor_unitario} onChange={e => updateItem(items, setItems, item.id, 'valor_unitario', +e.target.value)} style={{ ...inputStyle, padding: '5px 8px', fontSize: 12, width: 100 }}/>
                </td>
                <td style={{ padding: '6px 8px', width: 70 }}>
                  <input type="number" value={item.desconto_pct} min={0} max={100} onChange={e => updateItem(items, setItems, item.id, 'desconto_pct', +e.target.value)} style={{ ...inputStyle, padding: '5px 8px', fontSize: 12, width: 60 }}/>
                </td>
                <td style={{ padding: '6px 8px', color: 'var(--text-primary)', fontWeight: 600, whiteSpace: 'nowrap', textAlign: 'right' }}>
                  {fmtR$(calcItem(item))}
                </td>
                <td style={{ padding: '6px 8px' }}>
                  <button onClick={() => setItems(items.filter((i: Item) => i.id !== item.id))} style={{ background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: 6, padding: '4px 6px', color: '#f87171', cursor: 'pointer' }}>
                    <Trash2 size={12}/>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
        <button onClick={() => setItems([...items, novoItem()])} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', padding: '6px 12px', borderRadius: 8, border: '1px dashed var(--border)', background: 'none', cursor: 'pointer' }}>
          <Plus size={13}/> Adicionar item
        </button>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Total {label}</p>
          <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{fmtR$(items.reduce((s, i) => s + calcItem(i), 0))}</p>
        </div>
      </div>
    </div>
  )



  return (
    <div style={{ padding: 24, background: 'var(--bg-primary)', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.push('/dashboard/orcamentos')} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <ArrowLeft size={16}/>
          </button>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-.3px' }}>
              {isEdit ? `Orçamento ${data.numero}` : 'Novo Orçamento'}
            </h1>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Proposta comercial de reforma e pintura</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={data.status} onChange={up('status')} style={{ ...inputStyle, width: 'auto', fontSize: 12 }}>
            <option value="pendente">Pendente</option>
            <option value="aprovado">Aprovado</option>
            <option value="reprovado">Reprovado</option>
            <option value="cancelado">Cancelado</option>
          </select>
          <button onClick={baixarPDF} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', cursor: 'pointer' }}>
            <Download size={14}/> Baixar PDF
          </button>
          <button onClick={salvar} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--text-primary)', color: 'var(--bg-primary)', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <Save size={14}/> {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>

      {/* Totais rápidos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Mão de obra', value: fmtR$(totalMaoObra), color: '#60a5fa' },
          { label: 'Materiais', value: fmtR$(totalMateriais), color: '#a78bfa' },
          { label: 'Total geral', value: fmtR$(totalGeral), color: 'var(--text-primary)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px' }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 500 }}>{label}</p>
            <p style={{ fontSize: 18, fontWeight: 700, color, letterSpacing: '-.5px' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} style={{
            padding: '8px 16px', fontSize: 13, fontWeight: tab === t.id ? 600 : 400,
            color: tab === t.id ? 'var(--text-primary)' : 'var(--text-muted)',
            background: 'none', border: 'none', cursor: 'pointer',
            borderBottom: tab === t.id ? '2px solid var(--text-primary)' : '2px solid transparent',
            marginBottom: -1,
          }}>{t.label}</button>
        ))}
      </div>

      {/* Conteúdo das tabs */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>

        {tab === 'empresa' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <ImgUpload label="Logo da empresa" src={logoBase64} onClick={() => logoRef.current?.click()} inputRef={logoRef} onChange={handleImagem(setLogoBase64)} legenda={legendaLogo} onLegenda={setLegendaLogo}/>
              <ImgUpload label="Foto do serviço 1" src={imgFoto1} onClick={() => foto1Ref.current?.click()} inputRef={foto1Ref} onChange={handleImagem(setImgFoto1)} legenda={legendaFoto1} onLegenda={setLegendaFoto1}/>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div style={fieldStyle}><label style={labelStyle}>Nome da empresa</label><input value={data.empresa_nome} onChange={up('empresa_nome')} style={inputStyle}/></div>
              <div style={fieldStyle}><label style={labelStyle}>CNPJ</label><input value={data.empresa_cnpj} onChange={up('empresa_cnpj')} style={inputStyle}/></div>
              <div style={fieldStyle}><label style={labelStyle}>Nº do orçamento</label><input value={data.numero} onChange={up('numero')} style={inputStyle}/></div>
              <div style={fieldStyle}><label style={labelStyle}>Telefone</label><input value={data.empresa_telefone} onChange={up('empresa_telefone')} style={inputStyle}/></div>
              <div style={fieldStyle}><label style={labelStyle}>WhatsApp</label><input value={data.empresa_whatsapp} onChange={up('empresa_whatsapp')} style={inputStyle}/></div>
              <div style={fieldStyle}><label style={labelStyle}>E-mail</label><input value={data.empresa_email} onChange={up('empresa_email')} style={inputStyle}/></div>
              <div style={fieldStyle}><label style={labelStyle}>Instagram</label><input value={data.empresa_instagram} onChange={up('empresa_instagram')} style={inputStyle}/></div>
              <div style={fieldStyle}><label style={labelStyle}>Responsável</label><input value={data.empresa_responsavel} onChange={up('empresa_responsavel')} style={inputStyle}/></div>
              <div style={fieldStyle}><label style={labelStyle}>Engenheiro RT</label><input value={data.empresa_engenheiro} onChange={up('empresa_engenheiro')} style={inputStyle}/></div>
              <div style={{ ...fieldStyle, gridColumn: 'span 2' }}><label style={labelStyle}>Endereço</label><input value={data.empresa_endereco} onChange={up('empresa_endereco')} style={inputStyle}/></div>
              <div style={fieldStyle}><label style={labelStyle}>CREA</label><input value={data.empresa_crea} onChange={up('empresa_crea')} style={inputStyle}/></div>
            </div>
            <div style={fieldStyle}><label style={labelStyle}>Apresentação da empresa (aparece no PDF)</label><textarea value={data.empresa_apresentacao} onChange={up('empresa_apresentacao')} style={textareaStyle}/></div>
          </div>
        )}

        {tab === 'cliente' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={fieldStyle}><label style={labelStyle}>Nome do cliente</label><input value={data.cliente_nome} onChange={up('cliente_nome')} style={inputStyle} placeholder="Nome completo"/></div>
            <div style={fieldStyle}><label style={labelStyle}>CPF / CNPJ</label><input value={data.cliente_cpf_cnpj} onChange={up('cliente_cpf_cnpj')} style={inputStyle}/></div>
            <div style={fieldStyle}><label style={labelStyle}>Nome da obra / empreendimento</label><input value={data.cliente_obra} onChange={up('cliente_obra')} style={inputStyle} placeholder="Ex: Residencial Vila Verde"/></div>
            <div style={fieldStyle}><label style={labelStyle}>Telefone</label><input value={data.cliente_telefone} onChange={up('cliente_telefone')} style={inputStyle}/></div>
            <div style={{ ...fieldStyle, gridColumn: 'span 2' }}><label style={labelStyle}>Endereço da obra</label><input value={data.cliente_endereco} onChange={up('cliente_endereco')} style={inputStyle}/></div>
            <div style={fieldStyle}><label style={labelStyle}>Cidade / Data</label><input value={data.cidade_data} onChange={up('cidade_data')} style={inputStyle} placeholder="Ex: Caxias do Sul"/></div>
            <div style={fieldStyle}><label style={labelStyle}>Data do orçamento</label><input type="date" value={data.data_orcamento} onChange={up('data_orcamento')} style={inputStyle}/></div>
            <div style={fieldStyle}><label style={labelStyle}>Validade (dias)</label><input type="number" value={data.validade_dias} onChange={up('validade_dias')} style={inputStyle}/></div>
          </div>
        )}

        {tab === 'maoobra' && <ItemTable items={itensMaoObra} setItems={setItensMaoObra} label="mão de obra"/>}
        {tab === 'materiais' && <ItemTable items={itensMateriais} setItems={setItensMateriais} label="materiais"/>}

        {tab === 'condicoes' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={fieldStyle}><label style={labelStyle}>Prazo de execução</label><input value={data.prazo_execucao} onChange={up('prazo_execucao')} style={inputStyle}/></div>
            <div style={fieldStyle}><label style={labelStyle}>Validade da proposta (dias)</label><input type="number" value={data.validade_dias} onChange={up('validade_dias')} style={inputStyle}/></div>
            <div style={{ ...fieldStyle, gridColumn: 'span 2' }}><label style={labelStyle}>Forma de pagamento</label><textarea value={data.forma_pagamento} onChange={up('forma_pagamento')} style={{ ...textareaStyle, minHeight: 60 }}/></div>
            <div style={{ ...fieldStyle, gridColumn: 'span 2' }}><label style={labelStyle}>Garantia</label><textarea value={data.garantia} onChange={up('garantia')} style={{ ...textareaStyle, minHeight: 60 }}/></div>
            <div style={{ ...fieldStyle, gridColumn: 'span 2' }}><label style={labelStyle}>Observações gerais</label><textarea value={data.observacoes} onChange={up('observacoes')} style={textareaStyle}/></div>
            <div style={{ gridColumn: 'span 2' }}>
              <ImgUpload label="Foto adicional (aparece no PDF)" src={imgFoto2} onClick={() => foto2Ref.current?.click()} inputRef={foto2Ref} onChange={handleImagem(setImgFoto2)} legenda={legendaFoto2} onLegenda={setLegendaFoto2}/>
              <input ref={foto2Ref} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImagem(setImgFoto2)}/>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
