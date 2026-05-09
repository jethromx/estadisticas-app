import { useState, useRef, useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { LogOut, Shield, ChevronDown, Mail, BadgeCheck, Sun, Moon } from 'lucide-react'
import { useIsFetching } from '@tanstack/react-query'
import { cn, LOTTERY_TYPES } from '@/lib/utils'
import type { LotteryTypeMeta } from '@/types/lottery'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { UserAvatar } from '@/components/ui/user-avatar'

const navLink = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'
      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100',
  )

function GameNavItem({ meta }: { meta: LotteryTypeMeta }) {
  return (
    <NavLink to={`/game/${meta.id}`} className={navLink}>
      <span className="text-base">{meta.icon}</span>
      <span>{meta.label}</span>
    </NavLink>
  )
}

function ProfilePopover({ onClose }: { onClose: () => void }) {
  const { user, logout, isAdmin } = useAuth()
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="absolute left-2 right-2 top-full mt-1 z-50 rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-100 dark:border-zinc-700">
        <UserAvatar username={user?.username ?? '?'} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-zinc-900 dark:text-zinc-100">{user?.username}</p>
          {isAdmin && (
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 dark:bg-violet-900/40 px-2 py-0.5 text-[10px] font-bold text-violet-700 dark:text-violet-300">
              <BadgeCheck className="h-3 w-3" /> Admin
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="px-4 py-2.5 flex flex-col gap-1.5">
        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <Mail className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{user?.email}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="px-2 pb-2 flex flex-col gap-0.5">
        {/* Dark mode toggle */}
        <button
          onClick={toggleTheme}
          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
        >
          <span className="flex items-center gap-2.5">
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          </span>
          <span className={cn(
            'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors',
            theme === 'dark' ? 'bg-violet-600' : 'bg-zinc-200',
          )}>
            <span className={cn(
              'inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
              theme === 'dark' ? 'translate-x-4' : 'translate-x-0',
            )} />
          </span>
        </button>

        <button
          onClick={() => { onClose(); logout() }}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}

export function Layout() {
  const { user, logout, isAdmin } = useAuth()
  const [analysisOpen, setAnalysisOpen] = useState(true)
  const [profileOpen, setProfileOpen] = useState(false)
  const desktopProfileRef = useRef<HTMLDivElement>(null)
  const mobileProfileRef  = useRef<HTMLDivElement>(null)
  const isFetching = useIsFetching()

  useEffect(() => {
    if (!profileOpen) return
    function handleClick(e: MouseEvent) {
      const t = e.target as Node
      const insideDesktop = desktopProfileRef.current?.contains(t)
      const insideMobile  = mobileProfileRef.current?.contains(t)
      if (!insideDesktop && !insideMobile) setProfileOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [profileOpen])

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">

      {/* ── Sidebar (desktop) ── */}
      <aside className="hidden w-60 shrink-0 border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 lg:flex lg:flex-col">

        {/* Brand */}
        <div className="flex h-14 items-center border-b border-zinc-200 px-4 dark:border-zinc-800">
          <span className="text-base font-semibold text-zinc-900 dark:text-zinc-100">🎱 Lotería MX</span>
        </div>

        {/* User — popover trigger */}
        <div ref={desktopProfileRef} className="relative border-b border-zinc-200 dark:border-zinc-800 px-3 py-2">
          <button
            onClick={() => setProfileOpen(o => !o)}
            className={cn(
              'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 transition-colors',
              profileOpen
                ? 'bg-zinc-100 dark:bg-zinc-800'
                : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/60',
            )}
          >
            <UserAvatar username={user?.username ?? '?'} size="sm" />
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{user?.username}</p>
              {isAdmin && <p className="text-[10px] font-medium text-violet-600 dark:text-violet-400">Admin</p>}
            </div>
            <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 text-zinc-400 transition-transform', profileOpen && 'rotate-180')} />
          </button>
          {profileOpen && <ProfilePopover onClose={() => setProfileOpen(false)} />}
        </div>

        <nav className="flex flex-col gap-1 p-3 flex-1 overflow-y-auto">

          {/* Inicio */}
          <NavLink to="/dashboard" end className={navLink}>
            <span className="text-lg">🏠</span>
            <span>Inicio</span>
          </NavLink>

          {/* Predicciones — primer nivel */}
          <NavLink to="/predicciones" className={navLink}>
            <span className="text-lg">🔮</span>
            <span>Predicciones</span>
          </NavLink>

          <div className="my-2 h-px bg-zinc-100 dark:bg-zinc-800" />

          {/* Análisis — sección colapsable */}
          <button
            onClick={() => setAnalysisOpen(o => !o)}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors w-full"
          >
            <span className="flex-1 text-left">Análisis</span>
            <ChevronDown
              className={cn('h-3.5 w-3.5 transition-transform', analysisOpen ? 'rotate-0' : '-rotate-90')}
            />
          </button>

          {analysisOpen && (
            <div className="flex flex-col gap-0.5 pl-2">
              <NavLink to="/comparative" className={navLink}>
                <span className="text-base">🔍</span>
                <span>Comparativo</span>
              </NavLink>
              {LOTTERY_TYPES.map(meta => (
                <GameNavItem key={meta.id} meta={meta} />
              ))}
            </div>
          )}

          <div className="my-2 h-px bg-zinc-100 dark:bg-zinc-800" />

          {/* Admin */}
          {isAdmin && (
            <NavLink to="/admin" className={navLink}>
              <Shield className="h-4 w-4" />
              <span>Admin</span>
            </NavLink>
          )}
        </nav>
      </aside>

      {/* ── Main content ── */}
      <main className="flex flex-1 flex-col overflow-auto">
        {/* Global loading bar */}
        <div className={cn(
          'h-0.5 shrink-0 bg-violet-500 transition-opacity duration-300',
          isFetching > 0 ? 'opacity-100 animate-pulse' : 'opacity-0',
        )} />

        {/* Mobile header */}
        <header className="flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-900 lg:hidden">
          <span className="text-base font-semibold text-zinc-900 dark:text-zinc-100">🎱 Lotería MX</span>
          <div ref={mobileProfileRef} className="relative">
            <button
              onClick={() => setProfileOpen(o => !o)}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <UserAvatar username={user?.username ?? '?'} size="sm" />
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{user?.username}</span>
              <ChevronDown className={cn('h-3.5 w-3.5 text-zinc-400 transition-transform', profileOpen && 'rotate-180')} />
            </button>
            {profileOpen && (
              <div className="absolute right-0 top-full mt-1 w-64 z-50 rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900 overflow-hidden">
                <ProfilePopover onClose={() => setProfileOpen(false)} />
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 p-4 pb-24 md:p-6 lg:pb-6">
          <Outlet />
        </div>
      </main>

      {/* ── Mobile bottom nav ── */}
      <nav className="fixed bottom-0 inset-x-0 z-50 flex items-stretch border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 lg:hidden">
        <NavLink
          to="/dashboard"
          end
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium transition-colors',
              isActive ? 'text-violet-700 dark:text-violet-300' : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400',
            )
          }
        >
          <span className="text-base">🏠</span>
          <span>Inicio</span>
        </NavLink>

        <NavLink
          to="/predicciones"
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium transition-colors',
              isActive ? 'text-violet-700 dark:text-violet-300' : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400',
            )
          }
        >
          <span className="text-base">🔮</span>
          <span>Predicc.</span>
        </NavLink>

        <NavLink
          to="/comparative"
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium transition-colors',
              isActive ? 'text-violet-700 dark:text-violet-300' : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400',
            )
          }
        >
          <span className="text-base">🔍</span>
          <span>Comp.</span>
        </NavLink>

        {LOTTERY_TYPES.map(meta => (
          <NavLink
            key={meta.id}
            to={`/game/${meta.id}`}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium transition-colors',
                isActive ? 'text-violet-700 dark:text-violet-300' : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400',
              )
            }
          >
            <span className="text-base">{meta.icon}</span>
            <span className="hidden xs:inline">{meta.label}</span>
          </NavLink>
        ))}

        {isAdmin && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium transition-colors',
                isActive ? 'text-violet-700 dark:text-violet-300' : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400',
              )
            }
          >
            <Shield className="h-4 w-4" />
            <span>Admin</span>
          </NavLink>
        )}
      </nav>
    </div>
  )
}
