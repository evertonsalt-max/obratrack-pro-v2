export type JornadaTipo  = 'DIA_INTEIRO' | 'MEIO_TURNO' | 'OUTRO' | 'NAO_TRABALHOU'
export type FuncStatus   = 'ativo' | 'inativo'
export type PagTipo      = 'Semanal' | 'Quinzenal' | 'Mensal' | 'Adiantamento' | 'Acerto Final'
export type UserRole     = 'owner' | 'admin' | 'operator' | 'viewer'

export const JORNADA_CONFIG: Record<JornadaTipo, { label: string; icon: string; cor: string; corBg: string; entrada: string; saida: string; horas: number; geraValor: boolean }> = {
  DIA_INTEIRO:   { label: 'Dia Inteiro',   icon: 'sun',   cor: '#22c55e', corBg: '#22c55e18', entrada: '07:00', saida: '18:00', horas: 11,  geraValor: true  },
  MEIO_TURNO:    { label: 'Meio Turno',    icon: 'half',  cor: '#f59e0b', corBg: '#f59e0b18', entrada: '07:00', saida: '12:30', horas: 5.5, geraValor: true  },
  OUTRO:         { label: 'Outro',         icon: 'clock', cor: '#7c8ba1', corBg: '#7c8ba118', entrada: '',      saida: '',      horas: 0,   geraValor: true  },
  NAO_TRABALHOU: { label: 'Não Trabalhou', icon: 'x',     cor: '#ef4444', corBg: '#ef444418', entrada: '',      saida: '',      horas: 0,   geraValor: false },
}

export const AUSENCIA_MOTIVOS = ['Falta injustificada','Atestado médico','Folga','Chuva / Condições climáticas','Problema pessoal','Feriado','Outro motivo']

export const DESCONTO_TIPOS: Record<string, string> = { adiantamento: 'Adiantamento', falta: 'Falta', dano: 'Dano / Prejuízo', multa: 'Multa', outro: 'Outro' }

export const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

export interface Employee {
  id: string; user_id: string; company_id?: string
  nome: string; apelido?: string; telefone?: string; funcao?: string
  diaria: number; status: FuncStatus; admissao?: string; obs?: string
  created_at: string; updated_at: string
}

export interface Worksite { id: string; user_id: string; nome: string; endereco?: string; ativo: boolean; created_at: string }

export interface WorkLog {
  id: string; user_id: string; employee_id: string; employee_name?: string
  data: string; local?: string; jornada: JornadaTipo
  entrada?: string; saida?: string; horas: number; diaria: number
  vale: boolean; valor_vale: number
  discount_value?: number; discount_type?: string; discount_notes?: string
  absence_reason?: string; custom_hours?: number
  obs?: string; created_at: string
  employees?: Pick<Employee, 'nome' | 'apelido' | 'diaria'>
}

export interface Payment {
  id: string; user_id: string; employee_id: string; employee_name?: string
  data: string; valor: number; tipo: PagTipo; obs?: string; created_at: string
  employees?: Pick<Employee, 'nome' | 'apelido'>
}

export interface EmployeeTax {
  id: string; user_id: string; employee_id: string
  month: number; year: number
  inss_value: number; fgts_value: number; notes?: string; created_at: string
  employees?: Pick<Employee, 'nome' | 'apelido'>
}

export interface EmployeeSummary {
  employee: Employee; dias: number; horas: number
  diasInteiros: number; meiosTurnos: number; horasOutro: number; faltas: number
  bruto: number; descontos: number; pago: number; saldo: number
  inss: number; fgts: number; liquido: number; locais: string[]
}
