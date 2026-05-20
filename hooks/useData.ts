'use client'
import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Employee, WorkLog, Payment, Worksite, EmployeeSummary, EmployeeTax } from '@/types'
import toast from 'react-hot-toast'

function sb() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await sb().from('employees').select('*').order('nome')
    setEmployees(data || [])
    setLoading(false)
  }, [])
  useEffect(() => { fetch() }, [fetch])
  const add = useCallback(async (data: Omit<Employee,'id'|'user_id'|'created_at'|'updated_at'>) => {
    const { data: { user } } = await sb().auth.getUser()
    const { error } = await sb().from('employees').insert({ ...data, user_id: user!.id })
    if (error) throw error
    toast.success('Funcionário cadastrado!')
    fetch()
  }, [fetch])
  const update = useCallback(async (id: string, data: Partial<Employee>) => {
    const { error } = await sb().from('employees').update(data).eq('id', id)
    if (error) throw error
    toast.success('Atualizado!')
    fetch()
  }, [fetch])
  const remove = useCallback(async (id: string) => {
    const { error } = await sb().from('employees').delete().eq('id', id)
    if (error) throw error
    toast.success('Removido.')
    fetch()
  }, [fetch])
  return { employees, loading, add, update, remove, refetch: fetch }
}

export function useWorksites() {
  const [worksites, setWorksites] = useState<Worksite[]>([])
  const fetch = useCallback(async () => {
    const { data } = await sb().from('worksites').select('*').order('nome')
    setWorksites(data || [])
  }, [])
  useEffect(() => { fetch() }, [fetch])
  const add = useCallback(async (nome: string) => {
    const { data: { user } } = await sb().auth.getUser()
    await sb().from('worksites').insert({ nome, user_id: user!.id })
    fetch()
  }, [fetch])
  return { worksites, add, refetch: fetch }
}

export function useWorkLogs(filters?: { employeeId?: string; dateFrom?: string; dateTo?: string; jornada?: string }) {
  const [logs, setLogs] = useState<WorkLog[]>([])
  const [loading, setLoading] = useState(true)
  const fetch = useCallback(async () => {
    setLoading(true)
    let query = sb().from('work_logs').select('*, employees(nome,apelido,diaria)').order('data', { ascending: false })
    if (filters?.employeeId) query = query.eq('employee_id', filters.employeeId)
    if (filters?.dateFrom)   query = query.gte('data', filters.dateFrom)
    if (filters?.dateTo)     query = query.lte('data', filters.dateTo)
    if (filters?.jornada)    query = query.eq('jornada', filters.jornada)
    const { data } = await query
    setLogs(data || [])
    setLoading(false)
  }, [filters?.employeeId, filters?.dateFrom, filters?.dateTo, filters?.jornada])
  useEffect(() => {
    fetch()
    const ch = sb().channel('wl').on('postgres_changes',{event:'*',schema:'public',table:'work_logs'},fetch).subscribe()
    return () => { sb().removeChannel(ch) }
  }, [fetch])

  const add = useCallback(async (data: Omit<WorkLog,'id'|'user_id'|'created_at'>) => {
    const { data: { user } } = await sb().auth.getUser()
    const { error } = await sb().from('work_logs').insert({ ...data, user_id: user!.id })
    if (error) throw error
    toast.success('Registro salvo!')
    fetch()
  }, [fetch])
  const update = useCallback(async (id: string, data: Partial<WorkLog>) => {
    const { error } = await sb().from('work_logs').update(data).eq('id', id)
    if (error) throw error
    toast.success('Atualizado!')
    fetch()
  }, [fetch])
  const remove = useCallback(async (id: string) => {
    const { error } = await sb().from('work_logs').delete().eq('id', id)
    if (error) throw error
    toast.success('Removido.')
    fetch()
  }, [fetch])
  return { logs, loading, add, update, remove, refetch: fetch }
}

export function usePayments() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await sb().from('payments').select('*, employees(nome,apelido)').order('data', { ascending: false })
    setPayments(data || [])
    setLoading(false)
  }, [])
  useEffect(() => {
    fetch()
    const ch = sb().channel('pay').on('postgres_changes',{event:'*',schema:'public',table:'payments'},fetch).subscribe()
    return () => { sb().removeChannel(ch) }
  }, [fetch])
  const add = useCallback(async (data: Omit<Payment,'id'|'user_id'|'created_at'>) => {
    const { data: { user } } = await sb().auth.getUser()
    const { error } = await sb().from('payments').insert({ ...data, user_id: user!.id })
    if (error) throw error
    toast.success('Pagamento registrado!')
    fetch()
  }, [fetch])
  const remove = useCallback(async (id: string) => {
    const { error } = await sb().from('payments').delete().eq('id', id)
    if (error) throw error
    toast.success('Removido.')
    fetch()
  }, [fetch])
  return { payments, loading, add, remove, refetch: fetch }
}

export function useEmployeeTaxes() {
  const [taxes, setTaxes] = useState<EmployeeTax[]>([])
  const [loading, setLoading] = useState(true)
  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await sb().from('employee_taxes').select('*, employees(nome,apelido)').order('year',{ascending:false}).order('month',{ascending:false})
    setTaxes(data || [])
    setLoading(false)
  }, [])
  useEffect(() => { fetch() }, [fetch])
  const add = useCallback(async (data: Omit<EmployeeTax,'id'|'user_id'|'created_at'>) => {
    const { data: { user } } = await sb().auth.getUser()
    const { error } = await sb().from('employee_taxes').upsert({ ...data, user_id: user!.id },{onConflict:'employee_id,month,year'})
    if (error) throw error
    toast.success('Encargo registrado!')
    fetch()
  }, [fetch])
  const remove = useCallback(async (id: string) => {
    const { error } = await sb().from('employee_taxes').delete().eq('id', id)
    if (error) throw error
    toast.success('Removido.')
    fetch()
  }, [fetch])
  return { taxes, loading, add, remove, refetch: fetch }
}

export function useFinancialSummary(
  employees: Employee[], logs: WorkLog[], payments: Payment[], taxes: EmployeeTax[] = []
): EmployeeSummary[] {
  return employees
    .filter(e => e.status === 'ativo')
    .map(employee => {
      const empLogs  = logs.filter(l => l.employee_id === employee.id)
      const empPags  = payments.filter(p => p.employee_id === employee.id)
      const empTaxes = taxes.filter(t => t.employee_id === employee.id)
      const trabalhados = empLogs.filter(l => l.jornada !== 'NAO_TRABALHOU')
      const faltas      = empLogs.filter(l => l.jornada === 'NAO_TRABALHOU')
      const bruto    = trabalhados.reduce((s,l) => s + (Number(l.diaria)||0), 0)
      const descontos= trabalhados.reduce((s,l) => s + (Number(l.discount_value)||Number(l.valor_vale)||0), 0)
      const pago     = empPags.reduce((s,p) => s + (Number(p.valor)||0), 0)
      const inss     = empTaxes.reduce((s,t) => s + (Number(t.inss_value)||0), 0)
      const fgts     = empTaxes.reduce((s,t) => s + (Number(t.fgts_value)||0), 0)
      const locais   = [...new Set(trabalhados.map(l => l.local).filter(Boolean))] as string[]
      return {
        employee, locais,
        dias:         trabalhados.length,
        faltas:       faltas.length,
        diasInteiros: empLogs.filter(l => l.jornada === 'DIA_INTEIRO').length,
        meiosTurnos:  empLogs.filter(l => l.jornada === 'MEIO_TURNO').length,
        horasOutro:   empLogs.filter(l => l.jornada === 'OUTRO').reduce((s,l) => s+(Number(l.horas)||0), 0),
        horas:        trabalhados.reduce((s,l) => s+(Number(l.horas)||0), 0),
        bruto, descontos, pago, inss, fgts,
        liquido: bruto - descontos,
        saldo:   bruto - descontos - pago,
      }
    })
    .sort((a,b) => b.saldo - a.saldo)
}
