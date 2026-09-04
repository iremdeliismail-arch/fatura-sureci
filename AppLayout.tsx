import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { NavLink, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Header } from './Header'
import { Sidebar, navItemsFor } from './Sidebar'

export function AppLayout() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  if (!user) return <Navigate to="/giris" replace />
  const items = navItemsFor(user.role)

  return (
    <div className="flex h-screen overflow-hidden bg-paper">
      <div className="hidden md:flex">
        <Sidebar />
      </div>
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button type="button" className="absolute inset-0 bg-navy-950/40" aria-label="Kapat" onClick={() => setOpen(false)} />
          <div className="relative z-10 h-full w-[248px]">
            <Sidebar onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-ink-100 bg-white px-3 md:hidden">
          <button type="button" className="rounded-lg p-2 text-ink-700" onClick={() => setOpen((v) => !v)} aria-label="Menü">
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div className="text-sm font-bold">Fatura Yönetim</div>
        </div>
        <Header />
        <div className="flex gap-2 overflow-x-auto border-b border-ink-100 bg-white px-3 py-2 md:hidden">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${isActive ? 'bg-navy-800 text-white' : 'bg-paper text-navy-800'}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
