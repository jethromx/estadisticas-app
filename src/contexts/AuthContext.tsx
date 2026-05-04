import { createContext, useContext, useState, type ReactNode } from 'react'
import type { AuthUser } from '@/types/auth'

interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  login: (token: string, user: AuthUser) => void
  logout: () => void
  isAuthenticated: boolean
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('lottery_token'))
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem('lottery_user')
    return stored ? JSON.parse(stored) : null
  })

  const login = (newToken: string, newUser: AuthUser) => {
    localStorage.setItem('lottery_token', newToken)
    localStorage.setItem('lottery_user', JSON.stringify(newUser))
    setToken(newToken)
    setUser(newUser)
  }

  const logout = () => {
    localStorage.removeItem('lottery_token')
    localStorage.removeItem('lottery_user')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{
      user, token,
      login, logout,
      isAuthenticated: !!token && !!user,
      isAdmin: user?.role === 'ADMIN',
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
