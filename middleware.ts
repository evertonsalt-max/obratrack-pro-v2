// middleware.ts
// Protege todas as rotas — redireciona para login se não autenticado

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Rotas de API sempre passam livre
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next()
  }
  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) { return request.cookies.get(name)?.value },
        set(name, value, options) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name, options) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  const pathname = request.nextUrl.pathname

  // Rotas públicas (não precisam de login)
  const publicRoutes = ['/login', '/cadastro', '/recuperar-senha', '/auth/callback', '/api/backup']
  const isPublic = publicRoutes.some(r => pathname.startsWith(r))

  // Se não está autenticado e tenta acessar rota protegida → login
  if (!session && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Se está autenticado e tenta acessar login/cadastro → dashboard
  if (session && isPublic && !pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api|.*\.svg).*)'],
}
