'use client'
import { useEffect, useState, useCallback } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export function useAuth() {
  const [user,    setUser]    = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const supabase = getSupabase()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = getSupabase()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    if (data.session) {
      router.push('/dashboard')
      router.refresh()
    }
  }, [router])

  const signUp = useCallback(async (email: string, password: string, nome: string) => {
    const supabase = getSupabase()
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: nome } }
    })
    if (error) throw error
    toast.success('Conta criada! Verifique seu e-mail.')
  }, [])

  const signInWithGoogle = useCallback(async () => {
    const supabase = getSupabase()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
    if (error) throw error
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    const supabase = getSupabase()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`
    })
    if (error) throw error
    toast.success('E-mail de recuperação enviado!')
  }, [])

  const signOut = useCallback(async () => {
    const supabase = getSupabase()
    await supabase.auth.signOut()
    router.push('/login')
    toast.success('Sessão encerrada.')
  }, [router])

  return { user, session, loading, signIn, signUp, signInWithGoogle, resetPassword, signOut }
}
