'use client'
import { useState, useMemo } from "react"
import { Download, Filter, X, ChevronsUpDown } from "lucide-react"

export type TipoJornada = "Dia Inteiro" | "Meio Turno" | "Nao Trabalhou"

export interface RegistroDiario {
  id: string
  funcionario: string
  data: string
  jornada: TipoJornada
  local: string
  horario_entrada: string
  horario_saida: string
  horas: number
  diaria: number
  desconto: number
  motivo: string
  obs: string
}

const fmtBRL = (v: number) =>
  "R$ " + (isNaN(v) ? 0 : v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })

const fmtDate = (iso: string) => {
  try {
    const parts = iso.split("-")
    return parts[2] + "/" + parts[1] + "/" + parts[0]
  } catch {
    return iso
  }
}

const jornadaBg: Record<string, string> = {
  "Dia Inteiro":   "rgba(59,130,246,0.15)",
  "Meio Turno":    "rgba(245,158,11,0.15)",
  "Nao Trabalhou": "rgba(239,68,68,0.15)",
}
const jornadaColor: Record<string, string> = {
  "Dia Inteiro":   "#60a5fa",
  "Meio Turno":    "#fbbf24",
  "Nao Trabalhou": "#f87171",
}

type SortKey = "data" | "horas" | "diaria" | "liquido"

interface Props {
  registros: RegistroDiario[]
  nomeFuncionario?: string
}

export function TabelaDetalhadaFuncionario({ registros, nomeFuncionario = "funcionario" }: Props) {
  const [showFilter, setShowFilter] = useState(false)
  const [filterJornada, setFilterJornada] = useState("")
  const [filterLocal, setFilterLocal] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("data")
  const [sortAsc, setSortAsc] = useState(true)

  const locais = useMemo(
    () => [...new Set(registros.map((r) => r.local).filter(Boolean))].sort(),
    [registros]
  )

  const dados = useMemo(() => {
    let arr = [...registros]
    if (filterJornada) arr = arr.filter((r) => r.jornada === filterJornada)
    if (filterLocal) arr = arr.filter((r) => r.local === filterLocal)
    arr.sort((a, b) => {
      let av: number | string
      let bv: number | string
      if (sortKey === "data") { av = a.data; bv = b.data }
      else if (sortKey === "horas") { av = a.horas; bv = b.horas }
      else if (sortKey === "diaria") { av = a.diaria; bv = b.diaria }
      else { av = a.diaria - a.desconto; bv = b.diaria - b.desconto }
      if (typeof av === "number" && typeof bv === "number")
        return sortAsc ? av - bv : bv - av
      return sortAsc
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av))
    })
    return arr
  }, [registros, filterJornada, filterLocal, sortKey, sortAsc])

  const totais = useMemo(
    () =>
      dados.reduce(
        (acc, r) => ({
          horas:     acc.horas     + r.horas,
          bruto:     acc.bruto     + r.diaria,
          descontos: acc.descontos + r.desconto,
          liquido:   acc.liquido   + (r.diaria - r.desconto),
        }),
        { horas: 0, bruto: 0, descontos: 0, liquido: 0 }
      ),
    [dados]
  )

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v)
    else { setSortKey(key); setSortAsc(true) }
  }

  const exportCSV = () => {
    const headers = ["Data","Jornada","Local","Entrada","Saida","Horas","Diaria","Desconto","Liquido","Motivo","Obs"]
    const lines = dados.map((r) =>
      [
        fmtDate(r.data), r.jornada, r.local || "",
        r.horario_entrada || "", r.horario_saida || "",
        r.horas.toFixed(1), r.diaria.toFixed(2), r.desconto.toFixed(2),
        (r.diaria - r.desconto).toFixed(2), r.motivo || "", r.obs || "",
      ].join(";")
    )
    const blob = new Blob([[headers.join(";"), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8;",
    })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = "relatorio_" + nomeFuncionario.toLowerCase().replace(/\s+/g, "_") + ".csv"
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const TH: React.CSSProperties = {
    padding: "8px 12px",
    fontSize: "10px",
    fontWeight: 500,
    color: "#4a6a8a",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    whiteSpace: "nowrap",
    background: "#0a1020",
    borderBottom: "1px solid #1e2a3a",
  }
  const TD: React.CSSProperties = {
    padding: "9px 12px",
    fontSize: "12px",
    color: "#c8d8e8",
    borderBottom: "1px solid #131c2a",
    whiteSpace: "nowrap",
  }

  const colunas = [
    { label: "Data",     sk: "data"    as SortKey, right: false },
    { label: "Jornada",  sk: null,                 right: false },
    { label: "Local",    sk: null,                 right: false },
    { label: "Entrada",  sk: null,                 right: false },
    { label: "Saida",    sk: null,                 right: false },
    { label: "Horas",    sk: "horas"   as SortKey, right: true  },
    { label: "Diaria",   sk: "diaria"  as SortKey, right: true  },
    { label: "Desconto", sk: null,                 right: true  },
    { label: "Liquido",  sk: "liquido" as SortKey, right: true  },
    { label: "Motivo",   sk: null,                 right: false },
    { label: "Obs",      sk: null,                 right: false },
  ]

  return (
    <div style={{ marginTop: "16px", borderRadius: "12px", border: "1px solid #1e2a3a", background: "#0f1623", overflow: "hidden" }}>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #1e2a3a" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "#e2e8f0" }}>Registros detalhados</span>
          <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "20px", background: "#1a2740", color: "#4a9eff", border: "1px solid #1e3a5f" }}>
            {dados.length} registros
          </span>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            onClick={() => setShowFilter((v) => !v)}
            style={{ display: "flex", alignItems: "center", gap: "4px", padding: "4px 10px", fontSize: "11px", background: "#1a2233", border: "1px solid #1e2a3a", borderRadius: "6px", color: "#8899aa", cursor: "pointer" }}
          >
            <Filter size={12} /> Filtrar
          </button>
          <button
            onClick={exportCSV}
            style={{ display: "flex", alignItems: "center", gap: "4px", padding: "4px 10px", fontSize: "11px", background: "#1a2233", border: "1px solid #1e2a3a", borderRadius: "6px", color: "#8899aa", cursor: "pointer" }}
          >
            <Download size={12} /> Exportar
          </button>
        </div>
      </div>

      {showFilter && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", padding: "10px 16px", background: "#0a1020", borderBottom: "1px solid #1e2a3a", alignItems: "center" }}>
          <select
            value={filterJornada}
            onChange={(e) => setFilterJornada(e.target.value)}
            style={{ fontSize: "12px", padding: "4px 8px", background: "#0f1623", border: "1px solid #1e2a3a", color: "#c8d8e8", borderRadius: "6px" }}
          >
            <option value="">Todas as jornadas</option>
            <option value="Dia Inteiro">Dia Inteiro</option>
            <option value="Meio Turno">Meio Turno</option>
            <option value="Nao Trabalhou">Nao Trabalhou</option>
          </select>
          <select
            value={filterLocal}
            onChange={(e) => setFilterLocal(e.target.value)}
            style={{ fontSize: "12px", padding: "4px 8px", background: "#0f1623", border: "1px solid #1e2a3a", color: "#c8d8e8", borderRadius: "6px" }}
          >
            <option value="">Todos os locais</option>
            {locais.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          <button
            onClick={() => { setFilterJornada(""); setFilterLocal("") }}
            style={{ display: "flex", alignItems: "center", gap: "4px", padding: "4px 8px", fontSize: "11px", background: "transparent", border: "1px solid #1e2a3a", borderRadius: "6px", color: "#64748b", cursor: "pointer" }}
          >
            <X size={11} /> Limpar
          </button>
        </div>
      )}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "860px" }}>
          <thead>
            <tr>
              {colunas.map(({ label, sk, right }) => (
                <th
                  key={label}
                  style={{ ...TH, cursor: sk ? "pointer" : "default", textAlign: right ? "right" : "left" }}
                  onClick={() => sk && handleSort(sk)}
                >
                  {label}{" "}
                  {sk && <ChevronsUpDown size={10} style={{ display: "inline", opacity: 0.5 }} />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dados.length === 0 && (
              <tr>
                <td colSpan={11} style={{ ...TD, textAlign: "center", color: "#4a6070", padding: "24px" }}>
                  Nenhum registro encontrado.
                </td>
              </tr>
            )}
            {dados.map((r) => {
              const liquido = r.diaria - r.desconto
              const bg    = jornadaBg[r.jornada]    || "rgba(59,130,246,0.15)"
              const color = jornadaColor[r.jornada] || "#60a5fa"
              return (
                <tr key={r.id}>
                  <td style={{ ...TD, color: "#94a3b8", fontFamily: "monospace" }}>{fmtDate(r.data)}</td>
                  <td style={TD}>
                    <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "20px", background: bg, color, fontWeight: 500 }}>
                      {r.jornada}
                    </span>
                  </td>
                  <td style={{ ...TD, color: "#7dd3fc" }}>{r.local || "-"}</td>
                  <td style={{ ...TD, color: "#64748b", fontFamily: "monospace" }}>{r.horario_entrada || "-"}</td>
                  <td style={{ ...TD, color: "#64748b", fontFamily: "monospace" }}>{r.horario_saida || "-"}</td>
                  <td style={{ ...TD, textAlign: "right", color: r.horas > 0 ? "#60a5fa" : "#334155", fontWeight: 500 }}>
                    {r.horas > 0 ? r.horas.toFixed(1) + "h" : "-"}
                  </td>
                  <td style={{ ...TD, textAlign: "right", color: "#e2e8f0" }}>
                    {r.diaria > 0 ? fmtBRL(r.diaria) : "-"}
                  </td>
                  <td style={{ ...TD, textAlign: "right", color: r.desconto > 0 ? "#fbbf24" : "#334155" }}>
                    {r.desconto > 0 ? fmtBRL(r.desconto) : "-"}
                  </td>
                  <td style={{ ...TD, textAlign: "right", fontWeight: 500, color: liquido > 0 ? "#34d399" : liquido < 0 ? "#f87171" : "#475569" }}>
                    {fmtBRL(liquido)}
                  </td>
                  <td style={{ ...TD, color: "#94a3b8", maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {r.motivo || "-"}
                  </td>
                  <td style={{ ...TD, color: "#64748b", maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {r.obs || "-"}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", borderTop: "1px solid #1e2a3a", background: "#0a1020" }}>
        {[
          { label: "Total horas",     value: totais.horas.toFixed(1) + "h", color: "#60a5fa" },
          { label: "Total bruto",     value: fmtBRL(totais.bruto),          color: "#94a3b8" },
          { label: "Total descontos", value: totais.descontos > 0 ? fmtBRL(totais.descontos) : "-", color: "#fbbf24" },
          { label: "Total liquido",   value: fmtBRL(totais.liquido),        color: totais.liquido >= 0 ? "#34d399" : "#f87171" },
        ].map(({ label, value, color }, i) => (
          <div key={label} style={{ padding: "10px 14px", borderLeft: i > 0 ? "1px solid #1e2a3a" : "none" }}>
            <p style={{ fontSize: "10px", color: "#4a6070", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "3px" }}>{label}</p>
            <p style={{ fontSize: "14px", fontWeight: 600, color }}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
