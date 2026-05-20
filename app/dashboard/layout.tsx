'use client'
import { useEffect, useState } from 'react'
import { useRouter }   from 'next/navigation'
import Link            from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth }     from '@/hooks/useAuth'
import { useTheme }    from '@/hooks/useTheme'
import {
  LayoutDashboard, Users, Clock, DollarSign,
  BarChart2, Mic, MapPin, Upload,
  LogOut, Shield, Menu, X, Sun, Moon
} from 'lucide-react'
import clsx from 'clsx'

const navGroups = [
  {
    label: 'Principal',
    items: [
      { href: '/dashboard',              icon: LayoutDashboard, label: 'Dashboard'    },
      { href: '/dashboard/funcionarios', icon: Users,           label: 'Funcionários' },
      { href: '/dashboard/horarios',     icon: Clock,           label: 'Horários'     },
    ]
  },
  {
    label: 'Financeiro',
    items: [
      { href: '/dashboard/pagamentos',   icon: DollarSign, label: 'Pagamentos'  },
      { href: '/dashboard/relatorios',   icon: BarChart2,  label: 'Relatórios'  },
    ]
  },
  {
    label: 'Ferramentas',
    items: [
      { href: '/dashboard/audio',    icon: Mic,    label: 'Reg. Áudio'       },
      { href: '/dashboard/obras',    icon: MapPin,  label: 'Obras'            },
      { href: '/dashboard/importar', icon: Upload,  label: 'Importar Planilha'},
    ]
  },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth()
  const router   = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const { theme, toggle } = useTheme()

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading, router])

  useEffect(() => { setOpen(false) }, [pathname])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="w-8 h-8 border-2 border-gray-700 border-t-white rounded-full animate-spin"/>
    </div>
  )

  if (!user) return null

  const nome = user.user_metadata?.full_name || user.email || 'Usuário'
  const ini  = nome.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)

  const SidebarContent = () => (
    <aside style={{
      width: 200, background: 'var(--bg-primary)', borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', height: '100%', flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 30, height: 30, background: 'var(--text-primary)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--bg-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-.3px', lineHeight: 1 }}>ObraTrack</p>
          <p style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 2 }}>Pro</p>
        </div>
        <button onClick={() => setOpen(false)} className="md:hidden" style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
          <X size={16}/>
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '8px 8px', overflowY: 'auto' }}>
        {navGroups.map(({ label, items }) => (
          <div key={label} style={{ marginBottom: 4 }}>
            <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.08em', padding: '8px 10px 4px', opacity: 0.5 }}>{label}</p>
            {items.map(({ href, icon: Icon, label: itemLabel }) => {
              const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
              return (
                <Link key={href} href={href} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 10px', borderRadius: 8,
                  fontSize: 12, fontWeight: active ? 600 : 500,
                  color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                  background: active ? 'var(--bg-card)' : 'transparent',
                  textDecoration: 'none', transition: 'all .15s',
                  marginBottom: 1,
                }}>
                  <Icon size={14} style={{ flexShrink: 0 }}/>
                  <span style={{ flex: 1 }}>{itemLabel}</span>
                  {active && <div style={{ width: 3, height: 14, background: 'var(--text-primary)', borderRadius: 2 }}/>}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: 10, borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8, padding: '0 4px' }}>
          <Shield size={10} style={{ color: '#4ade80' }}/>
          <span style={{ fontSize: 9, color: '#4ade80', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>Salvo na nuvem</span>
        </div>

        {/* User */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, borderRadius: 8, background: 'var(--bg-card)', marginBottom: 6 }}>
          {user.user_metadata?.avatar_url
            ? <img src={user.user_metadata.avatar_url} style={{ width: 26, height: 26, borderRadius: '50%' }} alt="avatar"/>
            : <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: 'var(--bg-primary)', flexShrink: 0 }}>{ini}</div>
          }
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nome.split(' ')[0]}</p>
            <p style={{ fontSize: 9, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</p>
          </div>
        </div>

        {/* Toggle tema */}
        <button onClick={toggle} style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 8px', borderRadius: 8, fontSize: 11, fontWeight: 500,
          color: 'var(--text-muted)', background: 'none', border: 'none',
          cursor: 'pointer', marginBottom: 2, transition: 'all .15s',
        }}
        onMouseOver={e => (e.currentTarget.style.background = 'var(--bg-card)')}
        onMouseOut={e => (e.currentTarget.style.background = 'none')}>
          {theme === 'dark' ? <Sun size={13}/> : <Moon size={13}/>}
          {theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
        </button>

        {/* Sair */}
        <button onClick={signOut} style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 8px', borderRadius: 8, fontSize: 11, fontWeight: 500,
          color: 'var(--text-muted)', background: 'none', border: 'none',
          cursor: 'pointer', transition: 'all .15s',
        }}
        onMouseOver={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#f87171' }}
        onMouseOut={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)' }}>
          <LogOut size={13}/> Sair
        </button>
      </div>
    </aside>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-primary)', overflow: 'hidden' }}>

      {/* Sidebar desktop */}
      <div className="hidden md:flex">
        <SidebarContent />
      </div>

      {/* Overlay mobile */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setOpen(false)}/>
      )}

      {/* Sidebar mobile */}
      <div className={clsx('fixed inset-y-0 left-0 z-50 flex md:hidden transition-transform duration-300', open ? 'translate-x-0' : '-translate-x-full')}>
        <SidebarContent />
      </div>

      {/* Main */}
      <main style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

        {/* Topbar mobile */}
        <div className="md:hidden" style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px',
          height: 52, borderBottom: '1px solid var(--border)',
          background: 'var(--bg-primary)', position: 'sticky', top: 0, zIndex: 30,
        }}>
          <button onClick={() => setOpen(true)} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
            <Menu size={20}/>
          </button>
          <div style={{ width: 24, height: 24, background: 'var(--text-primary)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--bg-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-.3px' }}>ObraTrack Pro</span>
          <button onClick={toggle} style={{ marginLeft: 'auto', width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}>
            {theme === 'dark' ? <Sun size={14}/> : <Moon size={14}/>}
          </button>
        </div>

        <div style={{ flex: 1 }}>
          {children}
        </div>
      </main>
    </div>
  )
}
