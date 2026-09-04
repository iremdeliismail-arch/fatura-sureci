import { Bell, LogOut, Plus } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useApp } from '../../context/AppContext'
import { Button } from '../ui/Button'

const roleLabel = {
  accounting: 'Muhasebe',
  manager: 'Departman Yöneticisi',
  admin: 'Sistem Yöneticisi',
}

export function Header() {
  const { user, logout } = useAuth()
  const app = useApp()
  const navigate = useNavigate()
  if (!user) return null

  const unread = app.notifications.filter((n) => n.userId === user.id && !n.read).length

  return (
    <header className="flex h-16 items-center justify-between border-b border-ink-100 bg-white px-6">
      <div>
        <div className="text-sm font-semibold text-ink-900">Merhaba, {user.name.split(' ')[0]}</div>
        <div className="text-xs text-ink-500">
          {user.title} · {roleLabel[user.role]}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {user.role === 'accounting' && (
          <Button onClick={() => navigate('/faturalar/yeni')}>
            <Plus size={16} />
            Yeni fatura
          </Button>
        )}
        <Link
          to="/bildirimler"
          className="relative rounded-lg p-2 text-ink-500 hover:bg-navy-50"
          aria-label="Bildirimler"
        >
          <Bell size={18} />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unread}
            </span>
          )}
        </Link>
        <div className="flex items-center gap-2 rounded-xl border border-ink-100 bg-paper px-2 py-1.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-800 text-xs font-semibold text-white">
            {user.initials}
          </div>
          <div className="hidden pr-1 md:block">
            <div className="text-xs font-semibold text-ink-900">{user.name}</div>
            <div className="text-[11px] text-ink-500">{user.department}</div>
          </div>
          <button
            type="button"
            onClick={() => {
              logout()
              navigate('/giris')
            }}
            className="rounded-lg p-1.5 text-ink-500 hover:bg-white"
            title="Çıkış"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  )
}

