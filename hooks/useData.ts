'use client'
// hooks/useData.ts — Hooks de dados com Supabase em tempo real

import { useEffect, useState, useCallback } from 'react'
import { supabase }                          from '@/lib/supabase'
import { Employee, WorkLog, Payment, Worksite, EmployeeSummary } from '@/types'
import toast                                 from 'react-hot-toast'

// ── Funcionários ────────────────────────────────────────────
export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading,   setLoading]   = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('nome')
    if (!error) setEmployees(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch()
    // Tempo real: atualiza quando qualquer usuário muda
    const channel = supabase
      .channel('employees')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, fetch)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetch])

  const add = useCallback(async (data: Omit<Employee, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('employees').insert({ ...data, user_id: user!.id })
    if (error) throw error
    toast.success('Funcionário cadastrado!')
    fetch()
  }, [fetch])

  const update = useCallback(async (id: string, data: Partial<Employee>) => {
    const { error } = await supabase.from('employees').update(data).eq('id', id)
    if (error) throw error
    toast.success('Funcionário atualizado!')
    fetch()
  }, [fetch])

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase.from('employees').delete().eq('id', id)
    if (error) throw error
    toast.success('Funcionário removido.')
    fetch()
  }, [fetch])

  return { employees, loading, add, update, remove, refetch: fetch }
}

// ── Obras ───────────────────────────────────────────────────
export function useWorksites() {
  const [worksites, setWorksites] = useState<Worksite[]>([])

  const fetch = useCallback(async () => {
    const { data } = await supabase.from('worksites').select('*').order('nome')
    setWorksites(data || [])
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const add = useCallback(async (nome: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('worksites').insert({ nome, user_id: user!.id })
    fetch()
  }, [fetch])

  return { worksites, add, refetch: fetch }
}

// ── Registros de Jornada ────────────────────────────────────
export function useWorkLogs(filters?: { employeeId?: string; dateFrom?: string; dateTo?: string }) {
  const [logs,    setLogs]    = useState<WorkLog[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('work_logs')
      .select('*, employees(nome, apelido, diaria)')
      .order('data', { ascending: false })

    if (filters?.employeeId) query = query.eq('employee_id', filters.employeeId)
    if (filters?.dateFrom)   query = query.gte('data', filters.dateFrom)
    if (filters?.dateTo)     query = query.lte('data', filters.dateTo)

    const { data, error } = await query
    if (!error) setLogs(data || [])
    setLoading(false)
  }, [filters?.employeeId, filters?.dateFrom, filters?.dateTo])

  useEffect(() => {
    fetch()
    const channel = supabase
      .channel('work_logs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_logs' }, fetch)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetch])

  const add = useCallback(async (data: Omit<WorkLog, 'id' | 'user_id' | 'created_at'>) => {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('work_logs').insert({ ...data, user_id: user!.id })
    if (error) throw error
    toast.success('Registro salvo!')
    fetch()
  }, [fetch])

  const update = useCallback(async (id: string, data: Partial<WorkLog>) => {
    const { error } = await supabase.from('work_logs').update(data).eq('id', id)
    if (error) throw error
    toast.success('Registro atualizado!')
    fetch()
  }, [fetch])

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase.from('work_logs').delete().eq('id', id)
    if (error) throw error
    toast.success('Registro removido.')
    fetch()
  }, [fetch])

  return { logs, loading, add, update, remove, refetch: fetch }
}

// ── Pagamentos ──────────────────────────────────────────────
export function usePayments() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading,  setLoading]  = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('payments')
      .select('*, employees(nome, apelido)')
      .order('data', { ascending: false })
    if (!error) setPayments(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch()
    const channel = supabase
      .channel('payments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, fetch)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetch])

  const add = useCallback(async (data: Omit<Payment, 'id' | 'user_id' | 'created_at'>) => {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('payments').insert({ ...data, user_id: user!.id })
    if (error) throw error
    toast.success('Pagamento registrado!')
    fetch()
  }, [fetch])

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase.from('payments').delete().eq('id', id)
    if (error) throw error
    toast.success('Pagamento removido.')
    fetch()
  }, [fetch])

  return { payments, loading, add, remove, refetch: fetch }
}

// ── Resumo por funcionário ──────────────────────────────────
export function useFinancialSummary(employees: Employee[], logs: WorkLog[], payments: Payment[]): EmployeeSummary[] {
  return employees
    .filter(e => e.status === 'ativo')
    .map(employee => {
      const empLogs = logs.filter(l => l.employee_id === employee.id)
      const empPags = payments.filter(p => p.employee_id === employee.id)
      const bruto   = empLogs.reduce((s, l) => s + (l.diaria || 0), 0)
      const vales   = empLogs.reduce((s, l) => s + (l.valor_vale || 0), 0)
      const pago    = empPags.reduce((s, p) => s + (p.valor || 0), 0)
      const locais  = [...new Set(empLogs.map(l => l.local).filter(Boolean))] as string[]
      return {
        employee,
        dias:   empLogs.length,
        horas:  empLogs.reduce((s, l) => s + (l.horas || 0), 0),
        bruto, vales, pago,
        saldo:  bruto - vales - pago,
        locais,
      }
    })
    .sort((a, b) => b.saldo - a.saldo)
}
