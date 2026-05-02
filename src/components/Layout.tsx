import { NavLink, Outlet } from 'react-router-dom'
import { cn, LOTTERY_TYPES } from '@/lib/utils'
import type { LotteryTypeMeta } from '@/types/lottery'

function NavItem({ meta }: { meta: LotteryTypeMeta }) {
  return (
    <NavLink
      to={`/game/${meta.id}`}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'
            : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100',
        )
      }
    >
      <span className="text-lg">{meta.icon}</span>
      <span>{meta.label}</span>
    </NavLink>
  )
}

export function Layout() {
  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 lg:flex lg:flex-col">
        <div className="flex h-14 items-center border-b border-zinc-200 px-4 dark:border-zinc-800">
          <span className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Lotería MX
          </span>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800',
              )
            }
          >
            <span className="text-lg">📊</span>
            <span>Dashboard</span>
          </NavLink>
          <div className="my-2 h-px bg-zinc-100 dark:bg-zinc-800" />
          <p className="px-3 pb-1 text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Juegos
          </p>
          {LOTTERY_TYPES.map(meta => (
            <NavItem key={meta.id} meta={meta} />
          ))}
        </nav>
      </aside>

      {/* Main */}
      <main className="flex flex-1 flex-col overflow-auto">
        {/* Mobile header */}
        <header className="flex h-14 items-center border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-900 lg:hidden">
          <span className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Lotería MX
          </span>
        </header>
        <div className="flex-1 p-4 pb-24 md:p-6 lg:pb-6">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-50 flex items-stretch border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 lg:hidden">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium transition-colors',
              isActive
                ? 'text-violet-700 dark:text-violet-300'
                : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100',
            )
          }
        >
          <span className="text-base">📊</span>
          <span>Dashboard</span>
        </NavLink>
        {LOTTERY_TYPES.map(meta => (
          <NavLink
            key={meta.id}
            to={`/game/${meta.id}`}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium transition-colors',
                isActive
                  ? 'text-violet-700 dark:text-violet-300'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100',
              )
            }
          >
            <span className="text-base">{meta.icon}</span>
            <span className="hidden xs:inline">{meta.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
