// lib/supabase.ts
// Cliente Supabase para uso no browser (componentes React)

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Instância singleton para uso nos hooks
export const supabase = createClient()
