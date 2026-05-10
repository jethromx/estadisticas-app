import { Link } from 'react-router-dom'
import { useNextDraw } from '@/hooks/useNextDraw'
import { cn } from '@/lib/utils'

function Seg({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="tabular-nums font-bold text-xl leading-none">
        {String(value).padStart(2, '0')}
      </span>
      <span className="text-[10px] uppercase tracking-wider opacity-70 mt-0.5">{label}</span>
    </div>
  )
}

function Colon({ className }: { className?: string }) {
  return <span className={cn('font-bold text-xl opacity-40 -mt-3', className)}>:</span>
}

/** Banner compacto para el Dashboard */
export function NextDrawBanner() {
  const { days, hours, mins, secs, dayName, isToday, isSoon } = useNextDraw()

  const label = isToday
    ? 'El sorteo es hoy'
    : `Próximo sorteo: ${dayName}`

  return (
    <div className={cn(
      'flex items-center justify-between gap-4 rounded-xl px-5 py-3 border',
      isSoon
        ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-700'
        : 'bg-violet-50 border-violet-200 dark:bg-violet-900/20 dark:border-violet-800',
    )}>
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-xl shrink-0">{isSoon ? '🔔' : '🎱'}</span>
        <div className="min-w-0">
          <p className={cn(
            'text-xs font-semibold uppercase tracking-wide',
            isSoon ? 'text-amber-700 dark:text-amber-300' : 'text-violet-700 dark:text-violet-300',
          )}>
            {label}
          </p>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Melate · Revancha · Revanchita — 21:15 CDMX
          </p>
        </div>
      </div>

      <div className="flex items-center gap-6 shrink-0">
        <div className={cn(
          'flex items-center gap-1.5',
          isSoon ? 'text-amber-800 dark:text-amber-200' : 'text-violet-800 dark:text-violet-200',
        )}>
          {days > 0 && <><Seg value={days} label="días" /><Colon /></>}
          <Seg value={hours} label="hrs" />
          <Colon />
          <Seg value={mins} label="min" />
          <Colon />
          <Seg value={secs} label="seg" />
        </div>
        <Link
          to="/mejores"
          className={cn(
            'shrink-0 inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-extrabold tracking-wide uppercase transition-all duration-200',
            'shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:shadow-md',
            'ring-2 ring-offset-2',
            isSoon
              ? 'bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white ring-amber-400 ring-offset-amber-50 dark:ring-offset-amber-950'
              : 'bg-linear-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white ring-violet-400 ring-offset-violet-50 dark:ring-offset-violet-950',
          )}
        >
          <span className="animate-pulse">✨</span>
          Ver mejores
        </Link>
      </div>
    </div>
  )
}

/** Widget compacto para el hero del Landing */
export function NextDrawPill() {
  const { days, hours, mins, dayName, isToday, isSoon } = useNextDraw()

  const timeStr = days > 0
    ? `${days}d ${hours}h ${mins}m`
    : hours > 0
      ? `${hours}h ${mins}m`
      : `${mins}m`

  const label = isToday
    ? `¡Sorteo hoy! faltan ${timeStr}`
    : `Próximo sorteo (${dayName}) en ${timeStr}`

  return (
    <div className={cn(
      'inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium',
      isSoon
        ? 'bg-amber-400/20 border border-amber-400/40 text-amber-200'
        : 'bg-white/10 border border-white/20 text-white/90',
    )}>
      <span>{isSoon ? '🔔' : '⏰'}</span>
      {label}
    </div>
  )
}
