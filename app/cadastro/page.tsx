'use client'
// app/cadastro/page.tsx

import { useState }    from 'react'
import Link            from 'next/link'
import { useForm }     from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z }           from 'zod'
import { useAuth }     from '@/hooks/useAuth'
import { Layers, User, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'

const schema = z.object({
  nome:     z.string().min(2, 'Informe seu nome'),
  email:    z.string().email('E-mail inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  confirm:  z.string(),
}).refine(d => d.password === d.confirm, { message: 'Senhas não conferem', path: ['confirm'] })

type FormData = z.infer<typeof schema>

export default function CadastroPage() {
  const { signUp, signInWithGoogle } = useAuth()
  const [showPwd,  setShowPwd]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [success,  setSuccess]  = useState(false)
  const [error,    setError]    = useState('')

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema)
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true); setError('')
    try {
      await signUp(data.email, data.password, data.nome)
      setSuccess(true)
    } catch (e: any) {
      setError(e.message?.includes('already registered')
        ? 'Este e-mail já está cadastrado.'
        : 'Erro ao criar conta. Tente novamente.')
    }
    setLoading(false)
  }

  if (success) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} className="text-green-400"/>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Conta criada!</h2>
        <p className="text-gray-400 text-sm mb-6">Enviamos um link de confirmação para o seu e-mail. Clique no link para ativar sua conta.</p>
        <Link href="/login" className="btn-primary justify-center">Ir para o login</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Layers size={30} color="white"/>
          </div>
          <h1 className="text-2xl font-extrabold text-white mb-1">Criar conta</h1>
          <p className="text-gray-400 text-sm">Grátis para começar</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          <button onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 border border-gray-700 hover:border-gray-600 bg-gray-800 text-white font-medium py-2.5 rounded-xl text-sm transition-all mb-4">
            <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Criar conta com Google
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gray-800"/>
            <span className="text-gray-500 text-xs">ou</span>
            <div className="flex-1 h-px bg-gray-800"/>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Nome</label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"/>
                <input {...register('nome')} placeholder="Seu nome" className="input-field pl-9"/>
              </div>
              {errors.nome && <p className="text-red-400 text-xs mt-1">{errors.nome.message}</p>}
            </div>
            <div>
              <label className="label">E-mail</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"/>
                <input {...register('email')} type="email" placeholder="seu@email.com" className="input-field pl-9"/>
              </div>
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="label">Senha</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"/>
                <input {...register('password')} type={showPwd ? 'text' : 'password'} placeholder="Mínimo 8 caracteres" className="input-field pl-9 pr-9"/>
                <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  {showPwd ? <EyeOff size={14}/> : <Eye size={14}/>}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
            </div>
            <div>
              <label className="label">Confirmar senha</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"/>
                <input {...register('confirm')} type="password" placeholder="Repita a senha" className="input-field pl-9"/>
              </div>
              {errors.confirm && <p className="text-red-400 text-xs mt-1">{errors.confirm.message}</p>}
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <AlertCircle size={14} className="text-red-400 flex-shrink-0"/>
                <p className="text-red-400 text-xs">{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
              {loading
                ? <><div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"/>Criando conta...</>
                : 'Criar conta grátis'
              }
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            Já tem conta?{' '}
            <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium">Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
