'use client'
// app/dashboard/layout.tsx — Layout com sidebar para todas as páginas protegidas

import { useEffect }  from 'react'
import { useRouter }  from 'next/navigation'
import Link           from 'next/link'
import { usePathname }from 'next/navigation'
import { useAuth }    from '@/hooks/useAuth'
import {
  LayoutDashboard, Users, Clock, DollarSign,
  BarChart2, Mic, MapPin, Upload, Settings,
  Layers, LogOut, ChevronRight, Shield
} from 'lucide-react'
import clsx from 'clsx'

const nav = [
  { href: '/dashboard',           icon: LayoutDashboard, label: 'Dashboard'          },
  { href: '/dashboard/funcionarios',icon: Users,          label: 'Funcionários'       },
  { href: '/dashboard/horarios',  icon: Clock,            label: 'Horários'           },
  { href: '/dashboard/pagamentos',icon: DollarSign,       label: 'Pagamentos'         },
  { href: '/dashboard/relatorios',icon: BarChart2,        label: 'Relatórios'         },
  { href: '/dashboard/audio',     icon: Mic,              label: 'Reg. Áudio'         },
  { href: '/dashboard/obras',     icon: MapPin,           label: 'Obras'              },
  { href: '/dashboard/importar',  icon: Upload,           label: 'Importar Planilha'  },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth()
  const router   = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading, router])

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-gray-700 border-t-blue-500 rounded-full animate-spin"/>
    </div>
  )

  if (!user) return null

  const nome = user.user_metadata?.full_name || user.email || 'Usuário'
  const ini  = nome.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="h-14 flex items-center gap-3 px-4 border-b border-gray-800">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Layers size={16} color="white"/>
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">ObraTrack</p>
            <p className="text-gray-500 text-xs">Pro v2</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {nav.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
            return (
              <Link key={href} href={href}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  active
                    ? 'bg-blue-500/15 text-blue-400'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                )}>
                <Icon size={16}/>
                {label}
                {active && <ChevronRight size={12} className="ml-auto"/>}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-800 p-3">
          {/* Auto-save indicator */}
          <div className="flex items-center gap-1.5 mb-3 px-1">
            <Shield size={10} className="text-green-400"/>
            <span className="text-xs text-green-400 font-medium">Salvo na nuvem</span>
          </div>

          {/* User */}
          <div className="flex items-center gap-2 mb-2">
            {user.user_metadata?.avatar_url
              ? <img src={user.user_metadata.avatar_url} className="w-7 h-7 rounded-full" alt="avatar"/>
              : <div className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xs font-bold">{ini}</div>
            }
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{nome.split(' ')[0]}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          </div>

          <button onClick={signOut}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors">
            <LogOut size={13}/> Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
