'use client'
// app/recuperar-senha/page.tsx

import { useState }    from 'react'
import Link            from 'next/link'
import { useAuth }     from '@/hooks/useAuth'
import { Mail, ArrowLeft, CheckCircle, Layers } from 'lucide-react'

export default function RecuperarSenhaPage() {
  const { resetPassword } = useAuth()
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState('')

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true); setError('')
    try { await resetPassword(email); setSent(true) }
    catch { setError('Erro ao enviar e-mail. Verifique o endereço.') }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Layers size={30} color="white"/>
          </div>
          <h1 className="text-2xl font-extrabold text-white mb-1">Recuperar senha</h1>
          <p className="text-gray-400 text-sm">Enviaremos um link para seu e-mail</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          {sent ? (
            <div className="text-center">
              <div className="w-14 h-14 bg-green-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={28} className="text-green-400"/>
              </div>
              <h3 className="text-white font-bold mb-2">E-mail enviado!</h3>
              <p className="text-gray-400 text-sm mb-6">Verifique sua caixa de entrada e clique no link para redefinir sua senha.</p>
              <Link href="/login" className="btn-primary justify-center w-full">Voltar para o login</Link>
            </div>
          ) : (
            <form onSubmit={handle} className="space-y-4">
              <div>
                <label className="label">Seu e-mail</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"/>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="seu@email.com" className="input-field pl-9"/>
                </div>
              </div>
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
                {loading ? 'Enviando...' : 'Enviar link de recuperação'}
              </button>
              <Link href="/login" className="flex items-center justify-center gap-1.5 text-gray-400 hover:text-gray-200 text-sm mt-2">
                <ArrowLeft size={13}/> Voltar para o login
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
