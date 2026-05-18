// app/auth/callback/route.ts
// Processa o retorno do Google OAuth e recuperação de senha

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse }  from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')

  if (code) {
    const supabase = createServerSupabaseClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Recuperação de senha → vai para página de redefinição
  if (type === 'recovery') {
    return NextResponse.redirect(`${origin}/nova-senha`)
  }

  // Login normal → vai para dashboard
  return NextResponse.redirect(`${origin}/dashboard`)
}
