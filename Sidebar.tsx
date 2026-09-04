import { NavLink, useLocation } from 'react-router-dom'
import {
  BarChart3,
  Bell,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  ScrollText,
  Settings2,
  ShieldCheck,
  UserCheck,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import type { Role } from '../../types'

export const allNavItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['accounting', 'manager', 'admin'] as Role[] },
  { to: '/faturalar', label: 'Faturalar', icon: FileText, roles: ['accounting', 'manager', 'admin'] as Role[] },
  { to: '/onaylar', label: 'Onaylarım', icon: ClipboardCheck, roles: ['accounting', 'manager', 'admin'] as Role[] },
  { to: '/muhasebe-kontrol', label: 'Muhasebe Kontrolü', icon: ShieldCheck, roles: ['accounting', 'admin'] as Role[] },
  { to: '/bildirimler', label: 'Bildirimler', icon: Bell, roles: ['accounting', 'manager', 'admin'] as Role[] },
  { to: '/tanimlar', label: 'Tanımlar', icon: Settings2, roles: ['accounting', 'admin'] as Role[] },
  { to: '/vekalet', label: 'Vekalet', icon: UserCheck, roles: ['accounting', 'manager', 'admin'] as Role[] },
  { to: '/raporlar', label: 'Raporlar', icon: BarChart3, roles: ['accounting', 'admin'] as Role[] },
  { to: '/denetim', label: 'Denetim Kaydı', icon: ScrollText, roles: ['accounting', 'admin'] as Role[] },
]

export function navItemsFor(role: Role) {
  return allNavItems.filter((i) => i.roles.includes(role))
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth()
  const location = useLocation()
  const items = user ? navItemsFor(user.role) : []

  return (
    <aside className="flex h-full w-[248px] shrink-0 flex-col bg-navy-900 text-white">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500 font-bold">F</div>
        <div>
          <div className="text-sm font-bold tracking-tight">Fatura Yönetim</div>
          <div className="text-[11px] text-white/55">Onay & muhasebeleştirme</div>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 px-3 py-2">
        {items.map((item) => {
          const Icon = item.icon
          const active = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                active ? 'bg-white/10 text-white' : 'text-white/65 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon size={18} />
              {item.label}
            </NavLink>
          )
        })}
      </nav>
      <div className="border-t border-white/10 px-4 py-4 text-[11px] text-white/45">
        Prototip · E-LOGO entegrasyonu simüle edilir
      </div>
    </aside>
  )
}
