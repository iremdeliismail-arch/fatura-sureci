import { createContext, createElement, useContext, useMemo, useState, type ReactNode } from 'react'
import { USERS } from '../data/mock'
import type { User } from '../types'

interface AuthContextValue {
  user: User | null
  login: (userId: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = sessionStorage.getItem('fy-user')
    return USERS.find((u) => u.id === saved) ?? null
  })

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      login: (userId: string) => {
        const found = USERS.find((u) => u.id === userId) ?? null
        setUser(found)
        if (found) sessionStorage.setItem('fy-user', found.id)
      },
      logout: () => {
        setUser(null)
        sessionStorage.removeItem('fy-user')
      },
    }),
    [user],
  )

  return createElement(AuthContext.Provider, { value }, children)
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('AuthProvider missing')
  return ctx
}
