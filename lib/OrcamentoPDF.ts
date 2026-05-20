// lib/OrcamentoPDF.ts
// Gerador de PDF profissional para orçamentos de reforma e pintura
// Instalar: npm install jspdf jspdf-autotable

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const fmtR$ = (v: number) =>
  'R$ ' + (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })

const fmtDate = (iso: string) => {
  try {
    const [y, m, d] = iso.split('-')
    return `${d}/${m}/${y}`
  } catch { return iso }
}

interface Item {
  descricao: string
  quantidade: number
  unidade: string
  valor_unitario: number
  desconto_pct: number
}

const calcItem = (i: Item) => i.quantidade * i.valor_unitario * (1 - i.desconto_pct / 100)

interface PDFParams {
  data: any
  itensMaoObra: Item[]
  itensMateriais: Item[]
  totalMaoObra: number
  totalMateriais: number
  totalGeral: number
  logoBase64?: string
  imgFoto1?: string
  imgFoto2?: string
  legendaFoto1?: string
  legendaFoto2?: string
}

export async function gerarPDF(params: PDFParams) {
  const { data, itensMaoObra, itensMateriais, totalMaoObra, totalMateriais, totalGeral, logoBase64, imgFoto1, imgFoto2, legendaFoto1, legendaFoto2 } = params

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210
  const H = 297
  const M = 15 // margin

  const addWatermark = () => {
    pdf.setTextColor(220, 220, 220)
    pdf.setFontSize(48)
    pdf.setFont('helvetica', 'bold')
    const nome = (data.empresa_nome || 'NASCIMENTO PINTURAS').toUpperCase()
    pdf.text(nome, W / 2, H / 2, { align: 'center', angle: 45 })
    pdf.setTextColor(0, 0, 0)
  }

  const addHeader = (pageTitle: string) => {
    // Barra de cabeçalho
    pdf.setFillColor(30, 30, 30)
    pdf.rect(0, 0, W, 18, 'F')

    // Logo no cabeçalho
    if (logoBase64) {
      try { pdf.addImage(logoBase64, 'PNG', M, 2, 24, 14) } catch (_) {}
    }

    // Nome da empresa
    pdf.setTextColor(255, 255, 255)
    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'bold')
    pdf.text(data.empresa_nome || 'Empresa', logoBase64 ? 42 : M, 10)
    pdf.setFontSize(7)
    pdf.setFont('helvetica', 'normal')
    pdf.text(pageTitle, logoBase64 ? 42 : M, 15)

    // Número do orçamento
    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'bold')
    pdf.text(data.numero || '', W - M, 10, { align: 'right' })
    pdf.setTextColor(0, 0, 0)
  }

  const addFooter = () => {
    const y = H - 10
    pdf.setFillColor(245, 245, 245)
    pdf.rect(0, y - 4, W, 14, 'F')
    pdf.setFontSize(7)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(100, 100, 100)
    const contacts = [
      data.empresa_telefone && `Tel: ${data.empresa_telefone}`,
      data.empresa_whatsapp && `WhatsApp: ${data.empresa_whatsapp}`,
      data.empresa_email && data.empresa_email,
      data.empresa_instagram && data.empresa_instagram,
    ].filter(Boolean).join('   |   ')
    pdf.text(contacts, W / 2, y + 2, { align: 'center' })
    pdf.setTextColor(0, 0, 0)
  }

  // ─── PÁGINA 1: CAPA ──────────────────────────────────────────────────────────
  addWatermark()

  // Fundo superior escuro
  pdf.setFillColor(20, 20, 20)
  pdf.rect(0, 0, W, 80, 'F')

  // Logo grande centralizado
  if (logoBase64) {
    try { pdf.addImage(logoBase64, 'PNG', W / 2 - 25, 10, 50, 30) } catch (_) {}
  } else {
    pdf.setTextColor(255, 255, 255)
    pdf.setFontSize(22)
    pdf.setFont('helvetica', 'bold')
    pdf.text(data.empresa_nome || 'EMPRESA', W / 2, 35, { align: 'center' })
  }

  // CNPJ
  pdf.setTextColor(180, 180, 180)
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'normal')
  pdf.text(`CNPJ: ${data.empresa_cnpj || ''}`, W / 2, 48, { align: 'center' })

  // Faixa branca com título
  pdf.setFillColor(255, 255, 255)
  pdf.rect(0, 80, W, 24, 'F')
  pdf.setTextColor(20, 20, 20)
  pdf.setFontSize(18)
  pdf.setFont('helvetica', 'bold')
  pdf.text('PROPOSTA COMERCIAL', W / 2, 93, { align: 'center' })
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(100, 100, 100)
  pdf.text('Reforma Residencial e Pintura', W / 2, 100, { align: 'center' })

  // Imagem de fundo/serviço
  if (imgFoto1) {
    try {
      pdf.addImage(imgFoto1, 'JPEG', M, 108, W - 2 * M, 60)
      if (legendaFoto1) {
        pdf.setFontSize(8)
        pdf.setFont('helvetica', 'italic')
        pdf.setTextColor(120, 120, 120)
        pdf.text(legendaFoto1, W / 2, 171, { align: 'center' })
        pdf.setTextColor(0, 0, 0)
      }
    } catch (_) {}
  } else {
    pdf.setFillColor(245, 245, 245)
    pdf.rect(M, 108, W - 2 * M, 60, 'F')
    pdf.setTextColor(200, 200, 200)
    pdf.setFontSize(10)
    pdf.text('[Imagem do serviço]', W / 2, 140, { align: 'center' })
  }

  // Info do cliente na capa
  pdf.setFillColor(30, 30, 30)
  pdf.rect(M, 172, W - 2 * M, 45, 'F')
  pdf.setTextColor(180, 180, 180)
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'normal')
  pdf.text('CLIENTE', M + 6, 181)
  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(13)
  pdf.setFont('helvetica', 'bold')
  pdf.text(data.cliente_nome || '—', M + 6, 190)
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(180, 180, 180)
  pdf.text(data.cliente_obra || '', M + 6, 197)
  pdf.text(data.cliente_endereco || '', M + 6, 203)

  pdf.setTextColor(180, 180, 180)
  pdf.setFontSize(8)
  pdf.text('DATA', W - M - 50, 181)
  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(11)
  pdf.text(fmtDate(data.data_orcamento), W - M - 50, 190)
  pdf.setFontSize(8)
  pdf.setTextColor(180, 180, 180)
  pdf.text(`Validade: ${data.validade_dias || 30} dias`, W - M - 50, 197)

  addFooter()

  // ─── PÁGINA 2: SOBRE A EMPRESA ────────────────────────────────────────────────
  pdf.addPage()
  addWatermark()
  addHeader('Sobre a Empresa')

  let y = 26
  pdf.setTextColor(20, 20, 20)
  pdf.setFontSize(13)
  pdf.setFont('helvetica', 'bold')
  pdf.text('SOBRE NÓS', M, y)
  y += 2
  pdf.setDrawColor(20, 20, 20)
  pdf.setLineWidth(0.5)
  pdf.line(M, y, M + 40, y)
  y += 6

  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(60, 60, 60)
  const apresentacao = data.empresa_apresentacao || ''
  const linhas = pdf.splitTextToSize(apresentacao, W - 2 * M)
  pdf.text(linhas, M, y)
  y += linhas.length * 5 + 8

  // Destaques
  const destaques = [
    { icon: '✓', texto: 'Equipe própria, qualificada e registrada' },
    { icon: '✓', texto: 'Profissionais habilitados para trabalho em altura (NR18 e NR35)' },
    { icon: '✓', texto: 'Responsável Técnico (engenheiro civil)' },
    { icon: '✓', texto: 'Equipamentos certificados e de linha premium' },
    { icon: '✓', texto: 'Mais de 20 anos de experiência em pinturas prediais' },
  ]

  pdf.setFontSize(11)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(20, 20, 20)
  pdf.text('NOSSOS DIFERENCIAIS', M, y)
  y += 6

  destaques.forEach(d => {
    pdf.setFillColor(245, 245, 245)
    pdf.roundedRect(M, y - 3, W - 2 * M, 8, 2, 2, 'F')
    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(20, 20, 20)
    pdf.text(d.icon, M + 4, y + 2)
    pdf.setFont('helvetica', 'normal')
    pdf.text(d.texto, M + 10, y + 2)
    y += 10
  })

  y += 4
  // Foto 2
  if (imgFoto2) {
    try {
      pdf.addImage(imgFoto2, 'JPEG', M, y, W - 2 * M, 50)
      y += 52
      if (legendaFoto2) {
        pdf.setFontSize(8)
        pdf.setFont('helvetica', 'italic')
        pdf.setTextColor(120, 120, 120)
        pdf.text(legendaFoto2, W / 2, y, { align: 'center' })
        pdf.setTextColor(0, 0, 0)
        y += 5
      }
    } catch (_) {}
    y += 2
  }

  // Dados de contato
  y += 4
  pdf.setFontSize(11)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(20, 20, 20)
  pdf.text('CONTATOS', M, y)
  y += 6

  const contatos = [
    ['Endereço', data.empresa_endereco || ''],
    ['Telefone', data.empresa_telefone || ''],
    ['WhatsApp', data.empresa_whatsapp || ''],
    ['E-mail', data.empresa_email || '—'],
    ['Instagram', data.empresa_instagram || '—'],
    ['Engenheiro RT', `${data.empresa_engenheiro || ''} — CREA: ${data.empresa_crea || ''}`],
  ]

  contatos.forEach(([k, v]) => {
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(100, 100, 100)
    pdf.text(k + ':', M, y)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(20, 20, 20)
    pdf.text(v, M + 32, y)
    y += 6
  })

  addFooter()

  // ─── PÁGINA 3: ORÇAMENTO ─────────────────────────────────────────────────────
  pdf.addPage()
  addWatermark()
  addHeader('Orçamento Detalhado')

  y = 26

  // Dados do cliente
  pdf.setFillColor(245, 245, 245)
  pdf.roundedRect(M, y, W - 2 * M, 28, 3, 3, 'F')
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(100, 100, 100)
  pdf.text('DESTINATÁRIO', M + 4, y + 6)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  pdf.setTextColor(20, 20, 20)
  pdf.text(data.cliente_nome || '—', M + 4, y + 13)
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(80, 80, 80)
  pdf.text(data.cliente_obra || '', M + 4, y + 19)
  pdf.text(data.cliente_endereco || '', M + 4, y + 24)

  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(100, 100, 100)
  pdf.text('DATA', W - M - 45, y + 6)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(20, 20, 20)
  pdf.setFontSize(9)
  pdf.text(fmtDate(data.data_orcamento), W - M - 45, y + 13)
  pdf.setFontSize(8)
  pdf.setTextColor(100, 100, 100)
  pdf.text(`Validade: ${data.validade_dias || 30} dias`, W - M - 45, y + 19)
  y += 34

  // Tabela mão de obra
  if (itensMaoObra.length > 0) {
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(20, 20, 20)
    pdf.text('MÃO DE OBRA', M, y)
    y += 4

    autoTable(pdf, {
      startY: y,
      head: [['Descrição', 'Qtd', 'Unid.', 'Valor Unit.', 'Desc.%', 'Total']],
      body: itensMaoObra.map(i => [
        i.descricao,
        i.quantidade,
        i.unidade,
        fmtR$(i.valor_unitario),
        i.desconto_pct > 0 ? `${i.desconto_pct}%` : '—',
        fmtR$(calcItem(i)),
      ]),
      foot: [['', '', '', '', 'Total mão de obra:', fmtR$(totalMaoObra)]],
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [30, 30, 30], textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: [245, 245, 245], textColor: [20, 20, 20], fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 75 }, 1: { cellWidth: 12 }, 2: { cellWidth: 12 }, 3: { cellWidth: 25 }, 4: { cellWidth: 15 }, 5: { cellWidth: 25, halign: 'right' } },
      margin: { left: M, right: M },
    })
    y = (pdf as any).lastAutoTable.finalY + 8
  }

  // Tabela materiais
  if (itensMateriais.length > 0) {
    if (y > 200) { pdf.addPage(); addWatermark(); addHeader('Orçamento — Materiais'); y = 26 }

    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(20, 20, 20)
    pdf.text('MATERIAIS', M, y)
    y += 4

    autoTable(pdf, {
      startY: y,
      head: [['Descrição', 'Unid.', 'Qtd', 'Valor Unit.', 'Desc.%', 'Total']],
      body: itensMateriais.map(i => [
        i.descricao,
        i.unidade,
        i.quantidade,
        fmtR$(i.valor_unitario),
        i.desconto_pct > 0 ? `${i.desconto_pct}%` : '—',
        fmtR$(calcItem(i)),
      ]),
      foot: [['', '', '', '', 'Total materiais:', fmtR$(totalMateriais)]],
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [30, 30, 30], textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: [245, 245, 245], textColor: [20, 20, 20], fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 75 }, 1: { cellWidth: 12 }, 2: { cellWidth: 12 }, 3: { cellWidth: 25 }, 4: { cellWidth: 15 }, 5: { cellWidth: 25, halign: 'right' } },
      margin: { left: M, right: M },
    })
    y = (pdf as any).lastAutoTable.finalY + 8
  }

  // Total geral destacado
  pdf.setFillColor(20, 20, 20)
  pdf.roundedRect(M, y, W - 2 * M, 14, 3, 3, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'bold')
  pdf.text('VALOR TOTAL DA PROPOSTA', M + 6, y + 9)
  pdf.setFontSize(13)
  pdf.text(fmtR$(totalGeral), W - M - 6, y + 9, { align: 'right' })
  y += 20

  // Condições
  if (y > 220) { pdf.addPage(); addWatermark(); addHeader('Condições Gerais'); y = 26 }

  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(20, 20, 20)
  pdf.text('CONDIÇÕES GERAIS', M, y)
  y += 2
  pdf.line(M, y, M + 50, y)
  y += 6

  const condicoes = [
    ['Prazo de execução', data.prazo_execucao],
    ['Forma de pagamento', data.forma_pagamento],
    ['Garantia', data.garantia],
    ['Observações', data.observacoes],
  ].filter(([, v]) => v)

  condicoes.forEach(([titulo, texto]) => {
    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(20, 20, 20)
    pdf.text(titulo + ':', M, y)
    y += 4
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(60, 60, 60)
    pdf.setFontSize(8)
    const linhasTexto = pdf.splitTextToSize(texto || '', W - 2 * M)
    pdf.text(linhasTexto, M, y)
    y += linhasTexto.length * 4.5 + 5
  })

  // Assinaturas
  y += 10
  if (y > 240) { pdf.addPage(); addWatermark(); addHeader('Assinaturas'); y = 26 }

  pdf.setDrawColor(100, 100, 100)
  pdf.setLineWidth(0.3)
  const col1 = M + 5
  const col2 = W / 2 + 10

  pdf.line(col1, y, col1 + 70, y)
  pdf.line(col2, y, col2 + 70, y)
  y += 4
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(20, 20, 20)
  pdf.text(data.empresa_responsavel || 'Responsável', col1, y)
  pdf.text(data.cliente_nome || 'Cliente', col2, y)
  y += 4
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(100, 100, 100)
  pdf.text(data.empresa_nome || '', col1, y)
  pdf.text(`Data: ___/___/______`, col2, y)

  // QR Code WhatsApp (texto)
  y += 14
  const waNum = (data.empresa_whatsapp || '').replace(/\D/g, '')
  if (waNum) {
    pdf.setFillColor(37, 211, 102)
    pdf.roundedRect(M, y, 70, 12, 3, 3, 'F')
    pdf.setTextColor(255, 255, 255)
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'bold')
    pdf.text(`WhatsApp: ${data.empresa_whatsapp}`, M + 35, y + 7, { align: 'center' })
  }

  addFooter()

  // Salvar
  const nomeArq = `Orcamento_${data.numero}_${(data.cliente_nome || 'cliente').replace(/\s+/g, '_')}.pdf`
  pdf.save(nomeArq)
}
