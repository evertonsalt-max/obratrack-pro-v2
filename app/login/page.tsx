'use client'
// app/login/page.tsx

import { useState }     from 'react'
import Link             from 'next/link'
import { useForm }      from 'react-hook-form'
import { zodResolver }  from '@hookform/resolvers/zod'
import { z }            from 'zod'
import { useAuth }      from '@/hooks/useAuth'
import { Layers, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react'
import toast            from 'react-hot-toast'

const schema = z.object({
  email:    z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const { signIn, signInWithGoogle } = useAuth()
  const [showPwd,   setShowPwd]   = useState(false)
  const [loadEmail, setLoadEmail] = useState(false)
  const [loadGoogle,setLoadGoogle]= useState(false)
  const [error,     setError]     = useState('')

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema)
  })

  const onSubmit = async (data: FormData) => {
    setLoadEmail(true); setError('')
    try { await signIn(data.email, data.password) }
    catch (e: any) {
      setError(e.message === 'Invalid login credentials'
        ? 'E-mail ou senha incorretos.'
        : 'Erro ao entrar. Tente novamente.')
    }
    setLoadEmail(false)
  }

  const handleGoogle = async () => {
    setLoadGoogle(true); setError('')
    try { await signInWithGoogle() }
    catch { setError('Erro ao entrar com Google.'); setLoadGoogle(false) }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Layers size={30} color="white"/>
          </div>
          <h1 className="text-2xl font-extrabold text-white mb-1">ObraTrack Pro</h1>
          <p className="text-gray-400 text-sm">Gestão de obras e funcionários</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          <h2 className="text-lg font-bold text-white mb-1">Entrar</h2>
          <p className="text-gray-400 text-sm mb-6">Acesse seus dados de qualquer dispositivo</p>

          {/* Google */}
          <button onClick={handleGoogle} disabled={loadGoogle}
            className="w-full flex items-center justify-center gap-3 border border-gray-700 hover:border-gray-600 bg-gray-800 hover:bg-gray-750 text-white font-medium py-2.5 rounded-xl text-sm transition-all mb-4 disabled:opacity-50">
            {loadGoogle
              ? <div className="w-4 h-4 border-2 border-gray-600 border-t-white rounded-full animate-spin"/>
              : <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            }
            {loadGoogle ? 'Conectando...' : 'Continuar com Google'}
          </button>

          {/* Divisor */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gray-800"/>
            <span className="text-gray-500 text-xs">ou</span>
            <div className="flex-1 h-px bg-gray-800"/>
          </div>

          {/* Formulário email/senha */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">E-mail</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"/>
                <input {...register('email')} type="email" placeholder="seu@email.com"
                  className="input-field pl-9"/>
              </div>
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">Senha</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"/>
                <input {...register('password')} type={showPwd ? 'text' : 'password'} placeholder="••••••••"
                  className="input-field pl-9 pr-9"/>
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  {showPwd ? <EyeOff size={14}/> : <Eye size={14}/>}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <div className="flex justify-end">
              <Link href="/recuperar-senha" className="text-xs text-blue-400 hover:text-blue-300">
                Esqueci minha senha
              </Link>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <AlertCircle size={14} className="text-red-400 flex-shrink-0"/>
                <p className="text-red-400 text-xs">{error}</p>
              </div>
            )}

            <button type="submit" disabled={loadEmail} className="btn-primary w-full justify-center py-2.5">
              {loadEmail
                ? <><div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"/> Entrando...</>
                : 'Entrar'
              }
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            Não tem conta?{' '}
            <Link href="/cadastro" className="text-blue-400 hover:text-blue-300 font-medium">
              Criar conta grátis
            </Link>
          </p>
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          ObraTrack Pro © {new Date().getFullYear()} · obratrackpro.com.br
        </p>
      </div>
    </div>
  )
}
