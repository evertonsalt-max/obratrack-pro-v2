'use client'
// hooks/useAuth.ts — Hook de autenticação global

import { useEffect, useState, useCallback } from 'react'
import { User, Session }                     from '@supabase/supabase-js'
import { supabase }                          from '@/lib/supabase'
import { useRouter }                         from 'next/navigation'
import toast                                 from 'react-hot-toast'

export function useAuth() {
  const [user,    setUser]    = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Pegar sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Escutar mudanças de sessão em tempo real
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Login com email e senha
  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    router.push('/dashboard')
  }, [router])

  // Cadastro com email e senha
  const signUp = useCallback(async (email: string, password: string, nome: string) => {
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: nome } }
    })
    if (error) throw error
    toast.success('Conta criada! Verifique seu e-mail para confirmar.')
  }, [])

  // Login com Google
  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { access_type: 'offline', prompt: 'consent' }
      }
    })
    if (error) throw error
  }, [])

  // Recuperar senha
  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`
    })
    if (error) throw error
    toast.success('E-mail de recuperação enviado!')
  }, [])

  // Logout
  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    router.push('/login')
    toast.success('Sessão encerrada.')
  }, [router])

  return { user, session, loading, signIn, signUp, signInWithGoogle, resetPassword, signOut }
}
