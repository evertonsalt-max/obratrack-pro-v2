// types/index.ts — Tipos TypeScript de todo o sistema

export type JornadaTipo = 'DIA_INTEIRO' | 'MEIO_TURNO' | 'OUTRO'
export type FuncStatus  = 'ativo' | 'inativo'
export type PagTipo     = 'Semanal' | 'Quinzenal' | 'Mensal' | 'Adiantamento' | 'Acerto Final'
export type UserRole    = 'owner' | 'admin' | 'operator' | 'viewer'

export interface Profile {
  id: string
  company_id?: string
  nome?: string
  avatar_url?: string
  role: UserRole
  created_at: string
}

export interface Employee {
  id: string
  user_id: string
  company_id?: string
  nome: string
  apelido?: string
  telefone?: string
  funcao?: string
  diaria: number
  status: FuncStatus
  admissao?: string
  obs?: string
  created_at: string
  updated_at: string
}

export interface Worksite {
  id: string
  user_id: string
  nome: string
  endereco?: string
  ativo: boolean
  created_at: string
}

export interface WorkLog {
  id: string
  user_id: string
  employee_id: string
  employee_name?: string
  data: string
  local?: string
  jornada: JornadaTipo
  entrada?: string
  saida?: string
  horas: number
  diaria: number
  vale: boolean
  valor_vale: number
  obs?: string
  created_at: string
  // join
  employees?: Pick<Employee, 'nome' | 'apelido' | 'diaria'>
}

export interface Payment {
  id: string
  user_id: string
  employee_id: string
  employee_name?: string
  data: string
  valor: number
  tipo: PagTipo
  obs?: string
  created_at: string
  // join
  employees?: Pick<Employee, 'nome' | 'apelido'>
}

export interface ImportLog {
  id: string
  user_id: string
  tipo: 'funcionarios' | 'registros' | 'pagamentos'
  arquivo?: string
  total_linhas: number
  linhas_ok: number
  linhas_erro: number
  status: string
  created_at: string
}

// Resumo financeiro por funcionário
export interface EmployeeSummary {
  employee: Employee
  dias: number
  horas: number
  bruto: number
  vales: number
  pago: number
  saldo: number
  locais: string[]
}
