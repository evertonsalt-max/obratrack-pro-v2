// components/relatorios/TabelaDetalhadaFuncionario.tsx
// Adicionar abaixo do componente <ResumoFinal /> na aba "Por Funcionário"

import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download,
  Filter,
  X,
  ChevronsUpDown,
  TableIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type TipoJornada = "Dia Inteiro" | "Meio Turno" | "Não Trabalhou";

export interface RegistroDiario {
  id: string;
  funcionario: string;
  data: string;              // "2026-05-01"
  jornada: TipoJornada;
  local: string;
  horario_entrada: string;   // "07:00" ou null
  horario_saida: string;     // "17:00" ou null
  horas: number;             // 0 se não trabalhou
  diaria: number;            // valor bruto da diária
  desconto: number;          // desconto aplicado
  motivo: string;            // motivo da falta/desconto
  obs: string;               // observação livre
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

const jornadaConfig: Record<
  TipoJornada,
  { label: string; className: string }
> = {
  "Dia Inteiro": {
    label: "Dia Inteiro",
    className:
      "bg-blue-950 text-blue-400 border border-blue-800 hover:bg-blue-950",
  },
  "Meio Turno": {
    label: "Meio Turno",
    className:
      "bg-amber-950 text-amber-400 border border-amber-800 hover:bg-amber-950",
  },
  "Não Trabalhou": {
    label: "Não Trabalhou",
    className:
      "bg-red-950 text-red-400 border border-red-900 hover:bg-red-950",
  },
};

// ─── Componente ───────────────────────────────────────────────────────────────

interface Props {
  registros: RegistroDiario[];
  /** Nome do funcionário para o nome do arquivo exportado */
  nomeFuncionario?: string;
}

type SortKey = "data" | "horas" | "diaria" | "liquido";

export function TabelaDetalhadaFuncionario({
  registros,
  nomeFuncionario = "funcionario",
}: Props) {
  const [showFilter, setShowFilter] = useState(false);
  const [filterJornada, setFilterJornada] = useState<string>("all");
  const [filterLocal, setFilterLocal] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("data");
  const [sortAsc, setSortAsc] = useState(true);

  // Locais únicos para o filtro
  const locais = useMemo(
    () => [...new Set(registros.map((r) => r.local).filter(Boolean))].sort(),
    [registros]
  );

  // Filtragem + ordenação
  const dados = useMemo(() => {
    let arr = [...registros];

    if (filterJornada !== "all")
      arr = arr.filter((r) => r.jornada === filterJornada);
    if (filterLocal !== "all")
      arr = arr.filter((r) => r.local === filterLocal);

    arr.sort((a, b) => {
      let av: number | string, bv: number | string;
      if (sortKey === "data") { av = a.data; bv = b.data; }
      else if (sortKey === "horas") { av = a.horas; bv = b.horas; }
      else if (sortKey === "diaria") { av = a.diaria; bv = b.diaria; }
      else { av = a.diaria - a.desconto; bv = b.diaria - b.desconto; }

      if (typeof av === "number" && typeof bv === "number")
        return sortAsc ? av - bv : bv - av;
      return sortAsc
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });

    return arr;
  }, [registros, filterJornada, filterLocal, sortKey, sortAsc]);

  // Totalizadores do rodapé
  const totais = useMemo(
    () =>
      dados.reduce(
        (acc, r) => ({
          horas: acc.horas + r.horas,
          bruto: acc.bruto + r.diaria,
          descontos: acc.descontos + r.desconto,
          liquido: acc.liquido + (r.diaria - r.desconto),
        }),
        { horas: 0, bruto: 0, descontos: 0, liquido: 0 }
      ),
    [dados]
  );

  // Ordenação por coluna
  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(true); }
  };

  // Exportar CSV
  const exportCSV = () => {
    const headers = [
      "Data","Jornada","Local","Entrada","Saída",
      "Horas","Diária","Desconto","Líquido","Motivo","Obs",
    ];
    const lines = dados.map((r) =>
      [
        fmtDate(r.data),
        r.jornada,
        r.local || "—",
        r.horario_entrada || "—",
        r.horario_saida || "—",
        r.horas.toFixed(1),
        r.diaria.toFixed(2),
        r.desconto.toFixed(2),
        (r.diaria - r.desconto).toFixed(2),
        r.motivo || "—",
        r.obs || "—",
      ].join(";")
    );
    const blob = new Blob([[headers.join(";"), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio_${nomeFuncionario.toLowerCase().replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const SortIcon = () => (
    <ChevronsUpDown className="inline h-3 w-3 ml-0.5 opacity-50" />
  );

  return (
    <div className="mt-4 rounded-xl border border-[#1e2a3a] bg-[#0f1623] overflow-hidden">
      {/* ── Cabeçalho ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1e2a3a]">
        <div className="flex items-center gap-2">
          <TableIcon className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-medium text-slate-200">
            Registros detalhados
          </span>
          <Badge
            variant="outline"
            className="text-[11px] bg-[#1a2740] text-blue-400 border-[#1e3a5f] px-2"
          >
            {dados.length} registros
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-[#1e2a3a] bg-[#1a2233] text-slate-400 hover:bg-[#1e2a3a] hover:text-slate-200"
            onClick={() => setShowFilter((v) => !v)}
          >
            <Filter className="h-3 w-3 mr-1" />
            Filtrar
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-[#1e2a3a] bg-[#1a2233] text-slate-400 hover:bg-[#1e2a3a] hover:text-slate-200"
            onClick={exportCSV}
          >
            <Download className="h-3 w-3 mr-1" />
            Exportar
          </Button>
        </div>
      </div>

      {/* ── Filtros (condicional) ───────────────────────────────── */}
      {showFilter && (
        <div className="flex flex-wrap items-center gap-3 px-5 py-2.5 bg-[#0a1020] border-b border-[#1e2a3a]">
          <Select value={filterJornada} onValueChange={setFilterJornada}>
            <SelectTrigger className="h-7 w-44 text-xs bg-[#0f1623] border-[#1e2a3a] text-slate-300">
              <SelectValue placeholder="Todas as jornadas" />
            </SelectTrigger>
            <SelectContent className="bg-[#0f1623] border-[#1e2a3a] text-slate-300 text-xs">
              <SelectItem value="all">Todas as jornadas</SelectItem>
              <SelectItem value="Dia Inteiro">Dia Inteiro</SelectItem>
              <SelectItem value="Meio Turno">Meio Turno</SelectItem>
              <SelectItem value="Não Trabalhou">Não Trabalhou</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterLocal} onValueChange={setFilterLocal}>
            <SelectTrigger className="h-7 w-44 text-xs bg-[#0f1623] border-[#1e2a3a] text-slate-300">
              <SelectValue placeholder="Todos os locais" />
            </SelectTrigger>
            <SelectContent className="bg-[#0f1623] border-[#1e2a3a] text-slate-300 text-xs">
              <SelectItem value="all">Todos os locais</SelectItem>
              {locais.map((l) => (
                <SelectItem key={l} value={l}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-slate-500 hover:text-slate-300"
            onClick={() => { setFilterJornada("all"); setFilterLocal("all"); }}
          >
            <X className="h-3 w-3 mr-1" />
            Limpar
          </Button>
        </div>
      )}

      {/* ── Tabela ─────────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <Table className="text-xs min-w-[860px]">
          <TableHeader>
            <TableRow className="bg-[#0a1020] hover:bg-[#0a1020] border-[#1e2a3a]">
              <TableHead
                className="text-[#5a7a9a] uppercase tracking-wide text-[10px] cursor-pointer select-none"
                onClick={() => handleSort("data")}
              >
                Data <SortIcon />
              </TableHead>
              <TableHead className="text-[#5a7a9a] uppercase tracking-wide text-[10px]">
                Jornada
              </TableHead>
              <TableHead className="text-[#5a7a9a] uppercase tracking-wide text-[10px]">
                Local
              </TableHead>
              <TableHead className="text-[#5a7a9a] uppercase tracking-wide text-[10px]">
                Entrada
              </TableHead>
              <TableHead className="text-[#5a7a9a] uppercase tracking-wide text-[10px]">
                Saída
              </TableHead>
              <TableHead
                className="text-[#5a7a9a] uppercase tracking-wide text-[10px] text-right cursor-pointer select-none"
                onClick={() => handleSort("horas")}
              >
                Horas <SortIcon />
              </TableHead>
              <TableHead
                className="text-[#5a7a9a] uppercase tracking-wide text-[10px] text-right cursor-pointer select-none"
                onClick={() => handleSort("diaria")}
              >
                Diária <SortIcon />
              </TableHead>
              <TableHead className="text-[#5a7a9a] uppercase tracking-wide text-[10px] text-right">
                Desconto
              </TableHead>
              <TableHead
                className="text-[#5a7a9a] uppercase tracking-wide text-[10px] text-right cursor-pointer select-none"
                onClick={() => handleSort("liquido")}
              >
                Líquido <SortIcon />
              </TableHead>
              <TableHead className="text-[#5a7a9a] uppercase tracking-wide text-[10px]">
                Motivo
              </TableHead>
              <TableHead className="text-[#5a7a9a] uppercase tracking-wide text-[10px]">
                Obs.
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {dados.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={11}
                  className="text-center text-slate-600 py-8 border-[#131c2a]"
                >
                  Nenhum registro encontrado para os filtros selecionados.
                </TableCell>
              </TableRow>
            )}

            {dados.map((r) => {
              const liquido = r.diaria - r.desconto;
              const cfg = jornadaConfig[r.jornada];
              return (
                <TableRow
                  key={r.id}
                  className="border-[#131c2a] hover:bg-[#0d1829] transition-colors"
                >
                  {/* Data */}
                  <TableCell className="text-slate-400 font-mono text-[11px]">
                    {fmtDate(r.data)}
                  </TableCell>

                  {/* Jornada */}
                  <TableCell>
                    <Badge className={cn("text-[11px] px-2 py-0", cfg.className)}>
                      {cfg.label}
                    </Badge>
                  </TableCell>

                  {/* Local */}
                  <TableCell className="text-sky-300/80 text-[11.5px]">
                    {r.local || (
                      <span className="text-slate-600 italic">—</span>
                    )}
                  </TableCell>

                  {/* Entrada */}
                  <TableCell className="text-slate-500 font-mono text-[11px]">
                    {r.horario_entrada || (
                      <span className="text-slate-700">—</span>
                    )}
                  </TableCell>

                  {/* Saída */}
                  <TableCell className="text-slate-500 font-mono text-[11px]">
                    {r.horario_saida || (
                      <span className="text-slate-700">—</span>
                    )}
                  </TableCell>

                  {/* Horas */}
                  <TableCell className="text-right">
                    {r.horas > 0 ? (
                      <span className="text-blue-400 font-medium">
                        {r.horas.toFixed(1)}h
                      </span>
                    ) : (
                      <span className="text-slate-700">—</span>
                    )}
                  </TableCell>

                  {/* Diária */}
                  <TableCell className="text-right text-slate-300">
                    {r.diaria > 0 ? fmt(r.diaria) : (
                      <span className="text-slate-700">—</span>
                    )}
                  </TableCell>

                  {/* Desconto */}
                  <TableCell className="text-right">
                    {r.desconto > 0 ? (
                      <span className="text-amber-400">{fmt(r.desconto)}</span>
                    ) : (
                      <span className="text-slate-700">—</span>
                    )}
                  </TableCell>

                  {/* Líquido */}
                  <TableCell className="text-right font-medium">
                    <span
                      className={cn(
                        liquido > 0 && "text-emerald-400",
                        liquido < 0 && "text-red-400",
                        liquido === 0 && "text-slate-600"
                      )}
                    >
                      {fmt(liquido)}
                    </span>
                  </TableCell>

                  {/* Motivo */}
                  <TableCell className="text-slate-400 text-[11.5px] max-w-[140px] truncate">
                    {r.motivo || <span className="text-slate-700">—</span>}
                  </TableCell>

                  {/* Obs */}
                  <TableCell
                    className="text-slate-500 text-[11px] max-w-[120px] truncate"
                    title={r.obs}
                  >
                    {r.obs || <span className="text-slate-700">—</span>}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* ── Rodapé de totais ───────────────────────────────────── */}
      <div className="grid grid-cols-4 divide-x divide-[#1e2a3a] border-t border-[#1e2a3a] bg-[#0a1020]">
        {[
          { label: "Total horas", value: `${totais.horas.toFixed(1)}h`, className: "text-blue-400" },
          { label: "Total bruto", value: fmt(totais.bruto), className: "text-slate-400" },
          { label: "Total descontos", value: totais.descontos > 0 ? fmt(totais.descontos) : "—", className: "text-amber-400" },
          {
            label: "Total líquido",
            value: fmt(totais.liquido),
            className: cn(
              totais.liquido > 0 && "text-emerald-400",
              totais.liquido < 0 && "text-red-400",
              totais.liquido === 0 && "text-slate-600"
            ),
          },
        ].map(({ label, value, className }) => (
          <div key={label} className="px-4 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-slate-600 mb-0.5">
              {label}
            </p>
            <p className={cn("text-sm font-medium", className)}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
