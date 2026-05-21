// lib/OrcamentoPDF.ts — Gerador de PDF Premium v2.0
// npm install jspdf jspdf-autotable
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const fmtR$ = (v: number) => 'R$ ' + (v||0).toLocaleString('pt-BR',{minimumFractionDigits:2})
const fmtDate = (iso: string) => { try { const [y,m,d]=iso.split('-'); return `${d}/${m}/${y}` } catch { return iso } }

export interface ItemOrcamento {
  descricao: string
  quantidade: number
  unidade: string
  valor_unitario: number
  desconto_pct: number
}

export interface SecaoServico {
  titulo: string
  subtitulo?: string
  area?: string
  etapas: string[]
  valor_mao_obra: number
  obs?: string
}

export interface Patologia {
  nome: string
  descricao: string
  foto?: string
}

export interface Referencia {
  empreendimento: string
  contato: string
  telefone: string
}

export interface PDFParams {
  // Empresa
  empresa_nome: string
  empresa_cnpj?: string
  empresa_endereco?: string
  empresa_telefone?: string
  empresa_whatsapp?: string
  empresa_email?: string
  empresa_instagram?: string
  empresa_responsavel?: string
  empresa_engenheiro?: string
  empresa_crea?: string
  empresa_apresentacao?: string
  empresa_experiencia?: string
  empresa_especialidades?: string
  // Cliente
  cliente_nome?: string
  cliente_obra?: string
  cliente_endereco?: string
  cliente_telefone?: string
  // Datas
  numero?: string
  data_orcamento?: string
  cidade_data?: string
  validade_dias?: number
  // Fotos
  logoBase64?: string
  foto_capa?: string
  foto_obra1?: string
  legenda_foto_obra1?: string
  foto_obra2?: string
  legenda_foto_obra2?: string
  foto_obra3?: string
  legenda_foto_obra3?: string
  foto_obra4?: string
  legenda_foto_obra4?: string
  // Conteudo
  secoes: SecaoServico[]
  patologias?: Patologia[]
  itens_materiais: ItemOrcamento[]
  referencias?: Referencia[]
  // Financeiro
  total_mao_obra: number
  total_materiais: number
  total_geral: number
  forma_pagamento?: string
  num_parcelas?: number
  valor_entrada?: number
  num_unidades?: number
  // Condicoes
  prazo_execucao?: string
  garantia_tinta?: string
  garantia_execucao?: string
  observacoes?: string
  // Assinaturas
  assinatura_responsavel?: string
  assinatura_engenheiro?: string
}

const W = 210
const H = 297
const M = 14
const ACCENT = [20, 20, 20] as [number,number,number]
const LIGHT = [245, 245, 245] as [number,number,number]


function addImg(pdf: jsPDF, b64: string, x: number, y: number, w: number, h: number) {
  if (!b64 || b64.length < 100) return
  try {
    let fmt = 'JPEG'
    let data = b64
    if (b64.includes('data:image/png')) { fmt = 'PNG'; data = b64.split(',')[1] }
    else if (b64.includes('data:image/jpeg') || b64.includes('data:image/jpg')) { fmt = 'JPEG'; data = b64.split(',')[1] }
    else if (b64.includes('data:image/webp')) { fmt = 'JPEG'; data = b64.split(',')[1] }
    else if (b64.includes(',')) { data = b64.split(',')[1] }
    pdf.addImage(data, fmt, x, y, w, h)
  } catch(_) {}
}

function addWatermark(pdf: jsPDF, texto: string, imgBase64?: string) {
  if (imgBase64) {
    try {
      pdf.saveGraphicsState()
      pdf.setGState(new (pdf as any).GState({ opacity: 0.06 }))
      pdf.addImage(imgBase64, "PNG", W/2-40, H/2-40, 80, 80)
      pdf.restoreGraphicsState()
    } catch(_) {}
    return
  }
  pdf.saveGraphicsState()
  pdf.setGState(new (pdf as any).GState({ opacity: 0.04 }))
  pdf.setTextColor(0, 0, 0)
  pdf.setFontSize(52)
  pdf.setFont('helvetica', 'bold')
  pdf.text(texto.toUpperCase(), W/2, H/2, { align: 'center', angle: 45 })
  pdf.restoreGraphicsState()
  pdf.setTextColor(0, 0, 0)
}

function addHeader(pdf: jsPDF, p: PDFParams, titulo: string, pageNum: number) {
  pdf.setFillColor(...ACCENT)
  pdf.rect(0, 0, W, 16, 'F')
  if (p.logoBase64) {
    try { addImg(pdf, p.logoBase64, M, 1, 20, 14) } catch(_) {}
  }
  pdf.setTextColor(255,255,255)
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'bold')
  pdf.text(p.empresa_nome || '', p.logoBase64 ? 37 : M, 8)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7)
  pdf.text(titulo, p.logoBase64 ? 37 : M, 13)
  pdf.setFontSize(8)
  pdf.text(`${p.numero || ''} | Pág. ${pageNum}`, W-M, 8, { align: 'right' })
  pdf.setTextColor(0,0,0)
}

function addFooter(pdf: jsPDF, p: PDFParams) {
  pdf.setFillColor(...LIGHT)
  pdf.rect(0, H-12, W, 12, 'F')
  pdf.setDrawColor(220,220,220)
  pdf.setLineWidth(0.3)
  pdf.line(0, H-12, W, H-12)
  pdf.setFontSize(7)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(120,120,120)
  const parts = [
    p.empresa_telefone && `Tel: ${p.empresa_telefone}`,
    p.empresa_whatsapp && `WhatsApp: ${p.empresa_whatsapp}`,
    p.empresa_email,
    p.empresa_instagram,
  ].filter(Boolean).join('   ·   ')
  pdf.text(parts, W/2, H-5, { align: 'center' })
  pdf.setTextColor(0,0,0)
}

function sectionTitle(pdf: jsPDF, titulo: string, y: number, cor?: [number,number,number]): number {
  const c = cor || ACCENT
  pdf.setFillColor(...c)
  pdf.rect(M, y, W-2*M, 8, 'F')
  pdf.setTextColor(255,255,255)
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'bold')
  pdf.text(titulo.toUpperCase(), M+4, y+5.5)
  pdf.setTextColor(0,0,0)
  return y+12
}

function linha(pdf: jsPDF, y: number) {
  pdf.setDrawColor(220,220,220)
  pdf.setLineWidth(0.3)
  pdf.line(M, y, W-M, y)
}

export async function gerarPDFPremium(p: PDFParams) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  let page = 1

  const newPage = (titulo: string) => {
    pdf.addPage()
    page++
    addWatermark(pdf, p.empresa_nome || 'EMPRESA', p.marca_dagua || 'EMPRESA')
    addHeader(pdf, p, titulo, page)
    addFooter(pdf, p)
    return 22
  }

  // ═══════════════════════════════════════════════════════
  // PÁGINA 1 — CAPA
  // ═══════════════════════════════════════════════════════
  addWatermark(pdf, p.empresa_nome || 'EMPRESA', p.marca_dagua || 'EMPRESA')

  // Fundo superior
  pdf.setFillColor(...ACCENT)
  pdf.rect(0, 0, W, 90, 'F')

  // Logo
  if (p.logoBase64) {
    try { addImg(pdf, p.logoBase64, W/2-28, 8, 56, 36) } catch(_) {}
  } else {
    pdf.setTextColor(255,255,255)
    pdf.setFontSize(24)
    pdf.setFont('helvetica', 'bold')
    pdf.text(p.empresa_nome || '', W/2, 35, { align: 'center' })
  }

  pdf.setTextColor(200,200,200)
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'normal')
  if (p.empresa_cnpj) pdf.text(`CNPJ: ${p.empresa_cnpj}`, W/2, 50, { align: 'center' })
  if (p.empresa_endereco) pdf.text(p.empresa_endereco, W/2, 55, { align: 'center' })

  // Faixa PROPOSTA COMERCIAL
  pdf.setFillColor(255,255,255)
  pdf.rect(0, 90, W, 22, 'F')
  pdf.setTextColor(...ACCENT)
  pdf.setFontSize(18)
  pdf.setFont('helvetica', 'bold')
  pdf.text('PROPOSTA COMERCIAL', W/2, 102, { align: 'center' })
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(100,100,100)
  pdf.text('Reforma Predial e Pintura', W/2, 109, { align: 'center' })

  // Foto capa
  if (p.foto_capa) {
    try { addImg(pdf, p.foto_capa, M, 116, W-2*M, 62) } catch(_) {}
  } else {
    pdf.setFillColor(230,230,230)
    pdf.rect(M, 116, W-2*M, 62, 'F')
    pdf.setTextColor(180,180,180)
    pdf.setFontSize(10)
    pdf.text('[Foto da obra]', W/2, 148, { align: 'center' })
  }

  // Box cliente/obra
  pdf.setFillColor(20,20,20)
  pdf.rect(M, 181, W-2*M, 52, 'F')

  pdf.setTextColor(150,150,150)
  pdf.setFontSize(7)
  pdf.setFont('helvetica', 'bold')
  pdf.text('CLIENTE / RESPONSÁVEL', M+5, 190)
  pdf.setTextColor(255,255,255)
  pdf.setFontSize(13)
  pdf.setFont('helvetica', 'bold')
  pdf.text(p.cliente_nome || '—', M+5, 199)
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(180,180,180)
  if (p.cliente_obra) pdf.text(p.cliente_obra, M+5, 206)
  if (p.cliente_endereco) pdf.text(p.cliente_endereco, M+5, 212)

  // Info direita
  pdf.setTextColor(150,150,150)
  pdf.setFontSize(7)
  pdf.setFont('helvetica', 'bold')
  pdf.text('ORÇAMENTO Nº', W-M-52, 190)
  pdf.setTextColor(255,255,255)
  pdf.setFontSize(11)
  pdf.text(p.numero || 'ORC-001', W-M-52, 199)
  pdf.setFontSize(7)
  pdf.setTextColor(150,150,150)
  pdf.text('DATA', W-M-52, 207)
  pdf.setTextColor(255,255,255)
  pdf.setFontSize(9)
  if (p.data_orcamento) pdf.text(fmtDate(p.data_orcamento), W-M-52, 214)
  pdf.setFontSize(7)
  pdf.setTextColor(150,150,150)
  if (p.cidade_data) pdf.text(p.cidade_data, W-M-52, 220)
  pdf.setFontSize(7)
  pdf.text(`Validade: ${p.validade_dias||30} dias`, W-M-52, 226)

  addFooter(pdf, p)

  // ═══════════════════════════════════════════════════════
  // PÁGINA 2 — APRESENTAÇÃO DA EMPRESA
  // ═══════════════════════════════════════════════════════
  let y = newPage('Apresentação da Empresa')

  y = sectionTitle(pdf, 'Sobre a Empresa', y)

  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(60,60,60)
  const textoApres = p.empresa_apresentacao || `A ${p.empresa_nome} é uma empresa especializada em pinturas e reformas prediais com ${p.empresa_experiencia||'mais de 20 anos'} de experiência. Atuamos com equipe própria, qualificada e registrada, em conformidade com a CLT e as exigências do Ministério do Trabalho.`
  const linhasApres = pdf.splitTextToSize(textoApres, W-2*M)
  pdf.text(linhasApres, M, y)
  y += linhasApres.length*4.5 + 6

  // Diferenciais em cards 2x2
  y = sectionTitle(pdf, 'Nossos Diferenciais', y)
  const diffs = [
    { icon: '✓', titulo: 'Equipe Própria', desc: 'Profissionais registrados e qualificados com vínculo empregatício formal.' },
    { icon: '✓', titulo: 'Segurança Total', desc: 'NR18 e NR35 atualizados, EPIs completos, habilitação para trabalho em altura.' },
    { icon: '✓', titulo: 'Responsável Técnico', desc: `Engenheiro Civil: ${p.empresa_engenheiro||''} — CREA: ${p.empresa_crea||''}` },
    { icon: '✓', titulo: 'Equipamentos Premium', desc: 'Linha premium de marcas reconhecidas no mercado de construção civil.' },
    { icon: '✓', titulo: 'APR e Linha de Vida', desc: 'APRs elaboradas, inspeção rigorosa em balancim, linha de vida e demais procedimentos.' },
    { icon: '✓', titulo: 'Garantia Estendida', desc: 'Garantia técnica de até 8 anos conforme ficha técnica dos produtos utilizados.' },
  ]
  const cw = (W-2*M-6)/2
  diffs.forEach((d, i) => {
    const col = i%2
    const row = Math.floor(i/2)
    const x = M + col*(cw+6)
    const ry = y + row*20
    pdf.setFillColor(...LIGHT)
    pdf.roundedRect(x, ry, cw, 17, 2, 2, 'F')
    pdf.setDrawColor(220,220,220)
    pdf.setLineWidth(0.3)
    pdf.roundedRect(x, ry, cw, 17, 2, 2, 'S')
    pdf.setFillColor(...ACCENT)
    pdf.rect(x, ry, 3, 17, 'F')
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(20,20,20)
    pdf.text(d.titulo, x+7, ry+6)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7)
    pdf.setTextColor(80,80,80)
    const dl = pdf.splitTextToSize(d.desc, cw-10)
    pdf.text(dl.slice(0,2), x+7, ry+11)
  })
  y += Math.ceil(diffs.length/2)*20 + 6

  // Contatos
  y = sectionTitle(pdf, 'Contatos', y)
  const ctts = [
    ['Endereço', p.empresa_endereco||''],
    ['Telefone', p.empresa_telefone||''],
    ['WhatsApp', p.empresa_whatsapp||''],
    ['E-mail', p.empresa_email||''],
    ['Instagram', p.empresa_instagram||''],
    ['Engenheiro RT', `${p.empresa_engenheiro||''} · CREA: ${p.empresa_crea||''}`],
  ].filter(([,v]) => v)

  ctts.forEach(([k,v]) => {
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(80,80,80)
    pdf.text(`${k}:`, M, y)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(20,20,20)
    pdf.text(v, M+30, y)
    y += 6
  })

  // ═══════════════════════════════════════════════════════
  // PÁGINA 3 — IDENTIFICAÇÃO DA OBRA
  // ═══════════════════════════════════════════════════════
  y = newPage('Identificação da Obra')
  y = sectionTitle(pdf, 'Identificação do Empreendimento', y)

  const infoObra = [
    ['Obra / Empreendimento', p.cliente_obra||''],
    ['Cliente / Responsável', p.cliente_nome||''],
    ['Endereço', p.cliente_endereco||''],
    ['Telefone', p.cliente_telefone||''],
    ['Data do orçamento', p.data_orcamento ? fmtDate(p.data_orcamento) : ''],
    ['Validade da proposta', `${p.validade_dias||30} dias`],
  ].filter(([,v]) => v)

  infoObra.forEach(([k,v], i) => {
    if (i%2===0) { pdf.setFillColor(...LIGHT) } else { pdf.setFillColor(255,255,255) }
    pdf.rect(M, y-3, W-2*M, 7, 'F')
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(80,80,80)
    pdf.text(`${k}:`, M+3, y+1.5)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(20,20,20)
    pdf.text(v, M+55, y+1.5)
    y += 7
  })
  y += 4

  // Galeria de fotos da obra
  y = sectionTitle(pdf, 'Estado Atual da Obra', y)

  const fotosArray = p.fotos_obra && p.fotos_obra.length > 0
    ? p.fotos_obra.filter(f => f.src)
    : [
        p.foto_obra1 && { src: p.foto_obra1, legenda: p.legenda_foto_obra1 || 'Foto 1' },
        p.foto_obra2 && { src: p.foto_obra2, legenda: p.legenda_foto_obra2 || 'Foto 2' },
        p.foto_obra3 && { src: p.foto_obra3, legenda: p.legenda_foto_obra3 || 'Foto 3' },
        p.foto_obra4 && { src: p.foto_obra4, legenda: p.legenda_foto_obra4 || 'Foto 4' },
      ].filter(Boolean) as Array<{src:string;legenda:string}>

  if (fotosArray.length > 0) {
    const cols = fotosArray.length <= 4 ? 2 : fotosArray.length <= 9 ? 3 : 4
    const fw = (W-2*M-(cols-1)*3)/cols
    const fh = cols === 2 ? 45 : cols === 3 ? 38 : 30
    fotosArray.forEach((f, i) => {
      if (i > 0 && i % (cols*2) === 0) {
        y = newPage('Galeria da Obra — continuacao')
        y = sectionTitle(pdf, 'Estado Atual da Obra (cont.)', y)
      }
      const col = i % cols
      const row = Math.floor(i / cols)
      const fx = M + col*(fw+3)
      const fy = y + row*(fh+10)
      try { addImg(pdf, f.src, fx, fy, fw, fh) } catch(_) {}
      pdf.setFillColor(20,20,20)
      pdf.rect(fx, fy+fh, fw, 8, 'F')
      pdf.setTextColor(255,255,255)
      pdf.setFontSize(6.5)
      pdf.setFont('helvetica', 'normal')
      pdf.text(f.legenda || `Foto ${i+1}`, fx+fw/2, fy+fh+5.5, { align: 'center' })
    })
    y += Math.ceil(fotosArray.length/cols)*(fh+10) + 4
  } else {
    pdf.setFillColor(240,240,240)
    pdf.rect(M, y, W-2*M, 30, 'F')
    pdf.setTextColor(180,180,180)
    pdf.setFontSize(9)
    pdf.text('[Fotos da situação atual]', W/2, y+17, { align: 'center' })
    y += 34
  }

  // ═══════════════════════════════════════════════════════
  // PÁGINA 4 — DIAGNÓSTICO TÉCNICO (patologias)
  // ═══════════════════════════════════════════════════════
  if (p.patologias && p.patologias.length > 0) {
    y = newPage('Diagnóstico Técnico')
    y = sectionTitle(pdf, 'Patologias Identificadas', y)

    p.patologias.forEach((pat, i) => {
      if (y > 240) { y = newPage('Diagnóstico Técnico — continuação'); y = sectionTitle(pdf, 'Patologias Identificadas (cont.)', y) }
      pdf.setFillColor(255,245,245)
      pdf.roundedRect(M, y, W-2*M, pat.foto ? 50 : 18, 2, 2, 'F')
      pdf.setDrawColor(240,180,180)
      pdf.setLineWidth(0.3)
      pdf.roundedRect(M, y, W-2*M, pat.foto ? 50 : 18, 2, 2, 'S')
      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(150,30,30)
      pdf.text(`${i+1}. ${pat.nome}`, M+4, y+7)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8)
      pdf.setTextColor(60,60,60)
      const desc = pdf.splitTextToSize(pat.descricao, pat.foto ? W-2*M-50 : W-2*M-10)
      pdf.text(desc, M+4, y+13)
      if (pat.foto) {
        try { addImg(pdf, pat.foto, W-M-44, y+2, 40, 46) } catch(_) {}
      }
      y += (pat.foto ? 54 : 22)
    })
    y += 4
  }

  // ═══════════════════════════════════════════════════════
  // PÁGINAS DE SERVIÇOS
  // ═══════════════════════════════════════════════════════
  if (p.secoes && p.secoes.length > 0) {
    y = newPage('Serviços — Escopo Detalhado')
    y = sectionTitle(pdf, 'Escopo de Serviços', y)

    p.secoes.forEach((sec, si) => {
      if (y > 220) { y = newPage('Serviços — continuação'); y = sectionTitle(pdf, 'Escopo de Serviços (cont.)', y) }

      // Cabeçalho da seção
      pdf.setFillColor(30,30,30)
      pdf.roundedRect(M, y, W-2*M, 12, 2, 2, 'F')
      pdf.setTextColor(255,255,255)
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'bold')
      pdf.text(`${si+1}. ${sec.titulo.toUpperCase()}`, M+5, y+8)
      if (sec.area) {
        pdf.setFontSize(8)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(180,180,180)
        pdf.text(sec.area, W-M-5, y+8, { align: 'right' })
      }
      y += 14

      if (sec.subtitulo) {
        pdf.setFontSize(8)
        pdf.setFont('helvetica', 'italic')
        pdf.setTextColor(80,80,80)
        pdf.text(sec.subtitulo, M+2, y)
        y += 5
      }

      // Etapas numeradas
      pdf.setFontSize(8)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(40,40,40)
      pdf.text('Etapas de execução:', M+2, y)
      y += 4

      sec.etapas.forEach((etapa, ei) => {
        if (y > 255) { y = newPage('Serviços — continuação'); y += 2 }
        const etapaLinhas = pdf.splitTextToSize(etapa, W-2*M-14)
        const h = etapaLinhas.length*4+4
        if (ei%2===0) { pdf.setFillColor(248,248,248) } else { pdf.setFillColor(255,255,255) }
        pdf.rect(M, y-1, W-2*M, h, 'F')
        pdf.setFillColor(...ACCENT)
        pdf.rect(M, y-1, 1.5, h, 'F')
        pdf.setFontSize(7.5)
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(20,20,20)
        pdf.text(`${ei+1}.`, M+4, y+3)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(50,50,50)
        pdf.text(etapaLinhas, M+10, y+3)
        y += h+1
      })

      // Box valor
      pdf.setFillColor(20,20,20)
      pdf.roundedRect(W-M-60, y+2, 60, 10, 2, 2, 'F')
      pdf.setTextColor(255,255,255)
      pdf.setFontSize(7)
      pdf.setFont('helvetica', 'normal')
      pdf.text('Valor mão de obra:', W-M-56, y+7)
      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'bold')
      pdf.text(fmtR$(sec.valor_mao_obra), W-M-3, y+7, { align: 'right' })

      if (sec.obs) {
        pdf.setFontSize(7)
        pdf.setFont('helvetica', 'italic')
        pdf.setTextColor(120,120,120)
        const obsLinhas = pdf.splitTextToSize(`Obs: ${sec.obs}`, W-2*M-70)
        pdf.text(obsLinhas, M+2, y+6)
      }

      y += 18
      linha(pdf, y-2)
    })
  }

  // ═══════════════════════════════════════════════════════
  // PÁGINA — QUADRO DE VALORES
  // ═══════════════════════════════════════════════════════
  y = newPage('Quadro de Valores')
  y = sectionTitle(pdf, 'Resumo Financeiro', y)

  // Tabela de seções com valores
  if (p.secoes && p.secoes.length > 0) {
    autoTable(pdf, {
      startY: y,
      head: [['Serviço / Seção', 'Valor mão de obra']],
      body: p.secoes.map(s => [s.titulo, fmtR$(s.valor_mao_obra)]),
      foot: [['Total mão de obra', fmtR$(p.total_mao_obra)]],
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [30,30,30], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      footStyles: { fillColor: [245,245,245], textColor: [20,20,20], fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 130 }, 1: { cellWidth: 46, halign: 'right' } },
      margin: { left: M, right: M },
    })
    y = (pdf as any).lastAutoTable.finalY + 8
  }

  // Cards de totais
  const cards = [
    { label: 'Total mão de obra', value: fmtR$(p.total_mao_obra), bg: [240,240,250] as [number,number,number] },
    { label: 'Total materiais', value: fmtR$(p.total_materiais), bg: [240,250,240] as [number,number,number] },
  ]
  const cw2 = (W-2*M-6)/2
  cards.forEach((c, i) => {
    const cx = M + i*(cw2+6)
    pdf.setFillColor(...c.bg)
    pdf.roundedRect(cx, y, cw2, 18, 3, 3, 'F')
    pdf.setDrawColor(200,200,200)
    pdf.setLineWidth(0.3)
    pdf.roundedRect(cx, y, cw2, 18, 3, 3, 'S')
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(100,100,100)
    pdf.text(c.label, cx+5, y+7)
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(20,20,20)
    pdf.text(c.value, cx+5, y+15)
  })
  y += 24

  // Box total geral
  pdf.setFillColor(20,20,20)
  pdf.roundedRect(M, y, W-2*M, 18, 3, 3, 'F')
  pdf.setTextColor(255,255,255)
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'normal')
  pdf.text('VALOR TOTAL DA PROPOSTA', M+6, y+11)
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  pdf.text(fmtR$(p.total_geral), W-M-5, y+12, { align: 'right' })
  y += 24

  // Parcelamento
  if (p.num_parcelas && p.num_parcelas > 1) {
    const parcela = (p.total_geral-(p.valor_entrada||0)) / p.num_parcelas
    pdf.setFillColor(248,248,248)
    pdf.roundedRect(M, y, W-2*M, 22, 3, 3, 'F')
    pdf.setDrawColor(220,220,220)
    pdf.setLineWidth(0.3)
    pdf.roundedRect(M, y, W-2*M, 22, 3, 3, 'S')
    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(20,20,20)
    pdf.text('Simulação de Parcelamento', M+5, y+8)
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(60,60,60)
    if (p.valor_entrada) pdf.text(`Entrada: ${fmtR$(p.valor_entrada)}`, M+5, y+15)
    pdf.text(`${p.num_parcelas}x de ${fmtR$(parcela)}`, M+5, y+(p.valor_entrada?19:15))
    if (p.num_unidades && p.num_unidades > 1) {
      pdf.text(`Valor por unidade/apartamento: ${fmtR$(p.total_geral/p.num_unidades)}`, W-M-5, y+15, { align: 'right' })
    }
    y += 28
  }

  // ═══════════════════════════════════════════════════════
  // PÁGINA — PROPOSTA DE MATERIAIS
  // ═══════════════════════════════════════════════════════
  if (p.itens_materiais && p.itens_materiais.length > 0) {
    y = newPage('Proposta de Materiais')
    y = sectionTitle(pdf, 'Materiais Utilizados', y)

    const calcItem = (i: ItemOrcamento) => i.quantidade * i.valor_unitario * (1-i.desconto_pct/100)

    autoTable(pdf, {
      startY: y,
      head: [['Produto / Descrição', 'Unid.', 'Qtd', 'Valor Unit.', 'Desc.%', 'Total']],
      body: p.itens_materiais.map(i => [
        i.descricao,
        i.unidade,
        i.quantidade,
        fmtR$(i.valor_unitario),
        i.desconto_pct > 0 ? `${i.desconto_pct}%` : '—',
        fmtR$(calcItem(i)),
      ]),
      foot: [['', '', '', '', 'Total materiais:', fmtR$(p.total_materiais)]],
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [30,30,30], textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: [245,245,245], textColor: [20,20,20], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 75 },
        1: { cellWidth: 12 },
        2: { cellWidth: 12 },
        3: { cellWidth: 25 },
        4: { cellWidth: 15 },
        5: { cellWidth: 25, halign: 'right' },
      },
      margin: { left: M, right: M },
      alternateRowStyles: { fillColor: [248,248,248] },
    })
    y = (pdf as any).lastAutoTable.finalY + 8

    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'italic')
    pdf.setTextColor(120,120,120)
    pdf.text('* Ferramentas e produtos utilizados são de linha premium de marcas reconhecidas no mercado de construção civil.', M, y)
    y += 10
  }

  // ═══════════════════════════════════════════════════════
  // PÁGINA — PRAZOS E CONDIÇÕES
  // ═══════════════════════════════════════════════════════
  y = newPage('Prazos, Condições e Garantias')

  // Prazos
  y = sectionTitle(pdf, 'Prazos', y)
  const prazos = [
    ['Prazo de execução', p.prazo_execucao||''],
    ['Validade da proposta', `${p.validade_dias||30} dias corridos`],
  ].filter(([,v]) => v)
  prazos.forEach(([k,v]) => {
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(60,60,60)
    pdf.text(`${k}:`, M, y)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(20,20,20)
    const vl = pdf.splitTextToSize(v, W-2*M-40)
    pdf.text(vl, M+42, y)
    y += vl.length*4.5+4
  })
  y += 4

  // Condições de pagamento
  y = sectionTitle(pdf, 'Condições de Pagamento', y)
  if (p.forma_pagamento) {
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(50,50,50)
    const fp = pdf.splitTextToSize(p.forma_pagamento, W-2*M)
    pdf.text(fp, M, y)
    y += fp.length*4.5+6
  }
  if (p.num_parcelas && p.num_parcelas > 1) {
    const parc = (p.total_geral-(p.valor_entrada||0))/p.num_parcelas
    pdf.setFillColor(20,20,20)
    pdf.roundedRect(M, y, W-2*M, 12, 2, 2, 'F')
    pdf.setTextColor(255,255,255)
    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'bold')
    pdf.text(`Parcelamento: ${p.num_parcelas}x de ${fmtR$(parc)} com primeira parcela no início da obra`, W/2, y+7.5, { align: 'center' })
    y += 18
  }
  y += 4

  // Garantia
  y = sectionTitle(pdf, 'Garantia', y)
  const gars = [
    ['Garantia da tinta', p.garantia_tinta||''],
    ['Garantia da execução', p.garantia_execucao||''],
  ].filter(([,v]) => v)
  gars.forEach(([k,v]) => {
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(60,60,60)
    pdf.text(`${k}:`, M, y)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(20,20,20)
    const vl = pdf.splitTextToSize(v, W-2*M-42)
    pdf.text(vl, M+42, y)
    y += vl.length*4.5+4
  })
  y += 4

  // Segurança
  y = sectionTitle(pdf, 'Segurança e Responsabilidade Técnica', y)
  const segTexto = `Nossa empresa conta com o suporte de um engenheiro responsável técnico que acompanha e valida todos os processos executivos. Esse acompanhamento inclui a elaboração de APRs (Análises Preliminares de Risco), inspeções rigorosas em atividades como montagem de balancim, instalação de linha de vida e demais procedimentos de segurança. Contamos com profissionais habilitados para trabalho em altura, com documentação completa, treinamentos NR18 e NR35 atualizados e EPIs completos.`
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(50,50,50)
  const segL = pdf.splitTextToSize(segTexto, W-2*M)
  pdf.text(segL, M, y)
  y += segL.length*4.5+4

  const engInfo = [
    ['Engenheiro Civil', p.empresa_engenheiro||''],
    ['CREA', p.empresa_crea||''],
  ].filter(([,v]) => v)
  engInfo.forEach(([k,v]) => {
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(60,60,60)
    pdf.text(`${k}:`, M, y)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(20,20,20)
    pdf.text(v, M+30, y)
    y += 5.5
  })

  if (p.observacoes) {
    y += 4
    y = sectionTitle(pdf, 'Observações Gerais', y)
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(60,60,60)
    const obsL = pdf.splitTextToSize(p.observacoes, W-2*M)
    pdf.text(obsL, M, y)
    y += obsL.length*4.5+4
  }

  // ═══════════════════════════════════════════════════════
  // PÁGINA — ASSINATURAS
  // ═══════════════════════════════════════════════════════
  y = newPage('Assinaturas')
  y = sectionTitle(pdf, 'Aceite e Assinaturas', y)

  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(80,80,80)
  pdf.text(`${p.cidade_data||''}, ${p.data_orcamento ? fmtDate(p.data_orcamento) : '___/___/______'}`, M, y)
  y += 12

  const col1x = M+5
  const col2x = W/2+10
  const sigW = 80

  // Assinatura 1 — Empresa
  pdf.setFillColor(248,248,248)
  pdf.roundedRect(col1x-5, y, sigW+10, 38, 2, 2, 'F')
  pdf.setDrawColor(200,200,200)
  pdf.roundedRect(col1x-5, y, sigW+10, 38, 2, 2, 'S')
  pdf.setDrawColor(80,80,80)
  pdf.setLineWidth(0.4)
  pdf.line(col1x, y+28, col1x+sigW, y+28)
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(20,20,20)
  pdf.text(p.empresa_responsavel || 'Sócio Proprietário', col1x+sigW/2, y+33, { align: 'center' })
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7)
  pdf.setTextColor(80,80,80)
  pdf.text(p.empresa_nome || '', col1x+sigW/2, y+37, { align: 'center' })

  // Assinatura 2 — Engenheiro
  pdf.setFillColor(248,248,248)
  pdf.roundedRect(col2x-5, y, sigW+10, 38, 2, 2, 'F')
  pdf.setDrawColor(200,200,200)
  pdf.roundedRect(col2x-5, y, sigW+10, 38, 2, 2, 'S')
  pdf.setDrawColor(80,80,80)
  pdf.line(col2x, y+28, col2x+sigW, y+28)
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(20,20,20)
  pdf.text(p.empresa_engenheiro || 'Engenheiro Civil', col2x+sigW/2, y+33, { align: 'center' })
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7)
  pdf.setTextColor(80,80,80)
  pdf.text(`CREA: ${p.empresa_crea||''}`, col2x+sigW/2, y+37, { align: 'center' })
  y += 46

  // Assinatura 3 — Cliente
  pdf.setFillColor(248,248,248)
  pdf.roundedRect(col1x-5, y, sigW+10, 38, 2, 2, 'F')
  pdf.setDrawColor(200,200,200)
  pdf.roundedRect(col1x-5, y, sigW+10, 38, 2, 2, 'S')
  pdf.setDrawColor(80,80,80)
  pdf.line(col1x, y+28, col1x+sigW, y+28)
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(20,20,20)
  pdf.text(p.cliente_nome || 'Cliente / Responsável', col1x+sigW/2, y+33, { align: 'center' })
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7)
  pdf.setTextColor(80,80,80)
  pdf.text(`Data: ___/___/______`, col1x+sigW/2, y+37, { align: 'center' })
  y += 50

  // WhatsApp CTA
  const waNum = (p.empresa_whatsapp || '').replace(/\D/g,'')
  if (waNum) {
    pdf.setFillColor(37,211,102)
    pdf.roundedRect(M, y, 80, 12, 3, 3, 'F')
    pdf.setTextColor(255,255,255)
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'bold')
    pdf.text(`WhatsApp: ${p.empresa_whatsapp}`, M+40, y+7.5, { align: 'center' })
  }

  // ═══════════════════════════════════════════════════════
  // PÁGINA FINAL — PORTFÓLIO / REFERÊNCIAS
  // ═══════════════════════════════════════════════════════
  if (p.referencias && p.referencias.length > 0) {
    y = newPage('Portfólio e Referências')
    y = sectionTitle(pdf, 'Clientes Atendidos — Referências', y)

    autoTable(pdf, {
      startY: y,
      head: [['Empreendimento / Cliente', 'Contato', 'Telefone']],
      body: p.referencias.map(r => [r.empreendimento, r.contato, r.telefone]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [30,30,30], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 90 },
        1: { cellWidth: 50 },
        2: { cellWidth: 36 },
      },
      margin: { left: M, right: M },
      alternateRowStyles: { fillColor: [248,248,248] },
    })
  }

  // Salvar
  const nome = `Orcamento_${p.numero||'001'}_${(p.cliente_nome||'cliente').replace(/\s+/g,'_')}.pdf`
  pdf.save(nome)
}
