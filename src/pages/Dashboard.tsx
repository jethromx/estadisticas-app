import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react'
import { LOTTERY_TYPES, formatNumber, formatDate, cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import {
  useStatistics, useSync, useSavedPredictions, useDueNumbers, useStreakAnalysis,
  useAggregateAccuracy,
} from '@/api/queries'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EVCard } from '@/components/EVCard'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useNextDraw } from '@/hooks/useNextDraw'
import type { LotteryTypeId } from '@/types/lottery'

// ── helpers ──────────────────────────────────────────────────────────────────

function daysSince(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null
  const diff = Date.now() - new Date(dateStr).getTime()
  return Math.floor(diff / 86_400_000)
}

function StaleBadge({ days }: { days: number | null }) {
  if (days === null) return null
  if (days <= 3)
    return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">Al día</Badge>
  if (days <= 7)
    return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">{days}d sin actualizar</Badge>
  return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">{days}d sin actualizar</Badge>
}

// ── GameCard (navegación simple) ──────────────────────────────────────────────

function useSyncTimestamp(id: LotteryTypeId) {
  const [ts, setTs] = useState<string | null>(() => localStorage.getItem(`lastSync_${id}`))
  useEffect(() => {
    const handler = () => setTs(localStorage.getItem(`lastSync_${id}`))
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [id])
  return ts
}

function GameCard({ id }: { id: LotteryTypeId }) {
  const meta  = LOTTERY_TYPES.find(t => t.id === id)!
  const { data: stats, isLoading } = useStatistics(id)
  const sync  = useSync(id)
  const { isAdmin } = useAuth()
  const days  = daysSince(stats?.lastDrawDate)
  const stored = useSyncTimestamp(id)

  return (
    <Link
      to={`/analisis/${id}`}
      className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 hover:border-violet-300 dark:hover:border-violet-700 transition-colors group"
      style={{ borderTopColor: meta.color, borderTopWidth: 3 }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-lg text-xl shrink-0"
            style={{ background: meta.color + '20' }}
          >
            {meta.icon}
          </span>
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-violet-700 dark:group-hover:text-violet-300 transition-colors">
              {meta.label}
            </p>
            <p className="text-xs text-zinc-400">Rango {meta.range} · {meta.numbers} números</p>
          </div>
        </div>
        <StaleBadge days={days} />
      </div>

      {isLoading ? (
        <div className="h-4 w-32 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
      ) : stats ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Último sorteo: <span className="font-medium text-zinc-700 dark:text-zinc-300">{formatDate(stats.lastDrawDate)}</span>
          {' '}· <span className="tabular-nums">{formatNumber(stats.totalDraws)}</span> sorteos
        </p>
      ) : (
        <p className="text-xs text-zinc-400">Sin datos — pendiente de sincronización</p>
      )}

      {stored && (
        <p className="text-[10px] text-zinc-400">
          Sincronizado: {new Date(stored).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
        </p>
      )}

      {isAdmin && (
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-auto"
          onClick={(e) => {
            e.preventDefault()
            sync.mutate(undefined, {
              onSuccess: () => {
                window.dispatchEvent(new Event('storage'))
                toast.success(`${meta.label} sincronizado`)
              },
              onError: (err) => toast.error(`Error al sincronizar: ${err.message}`),
            })
          }}
          disabled={sync.isPending}
        >
          {sync.isPending ? <Spinner className="h-3 w-3" /> : null}
          Sincronizar
        </Button>
      )}
    </Link>
  )
}

// ── SyncAllButton ─────────────────────────────────────────────────────────────

function SyncAllButton() {
  const sync = useSync('ALL')
  return (
    <Button
      onClick={() => sync.mutate(undefined, {
        onSuccess: () => {
          window.dispatchEvent(new Event('storage'))
          toast.success('Todos los juegos sincronizados')
        },
        onError: (err) => toast.error(`Error al sincronizar: ${err.message}`),
      })}
      disabled={sync.isPending}
      variant="outline"
    >
      {sync.isPending ? <Spinner className="h-4 w-4" /> : null}
      Sincronizar todo
    </Button>
  )
}

// ── Zona 1: Próximo sorteo ────────────────────────────────────────────────────

function ProximoSorteo() {
  const next    = useNextDraw()
  const navigate = useNavigate()
  const { data: dueNums      } = useDueNumbers('MELATE',     3)
  const { data: dueRevancha  } = useDueNumbers('REVANCHA',   3)
  const { data: dueRevanchita} = useDueNumbers('REVANCHITA', 3)
  const { data: stats        } = useStatistics('MELATE')

  const pad = (n: number) => String(n).padStart(2, '0')
  const countdown = next.days > 0
    ? `${next.days}d ${pad(next.hours)}h ${pad(next.mins)}m`
    : `${pad(next.hours)}h ${pad(next.mins)}m ${pad(next.secs)}s`

  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-4"
      style={{ background: 'linear-gradient(135deg, #7c3aed18 0%, #7c3aed06 100%)', borderLeft: '4px solid #7c3aed' }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xl">🎱</span>
            <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Próximo sorteo</span>
            {stats?.totalDraws && (
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                · Sorteo #{formatNumber(stats.totalDraws + 1)}
              </span>
            )}
            <span className="text-sm text-zinc-500 dark:text-zinc-400 capitalize">
              · {next.dayName}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Clock className="h-4 w-4 text-violet-500 shrink-0" />
            <span className={cn(
              'text-base font-bold tabular-nums',
              next.isSoon ? 'text-red-600 dark:text-red-400' : 'text-violet-700 dark:text-violet-300',
            )}>
              Faltan {countdown}
            </span>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={() => navigate('/predicciones')}
            className="text-white border-0 shrink-0"
            style={{ background: '#7c3aed' }}
          >
            Generar predicción →
          </Button>
          <Button onClick={() => navigate('/boleto')} variant="outline" className="shrink-0">
            🎫 Boleto Triple →
          </Button>
        </div>
      </div>

      {/* Los 3 juegos — números pendientes */}
      <div className="flex flex-col gap-2">
        {[
          { id: 'MELATE',     label: 'Melate',     color: '#7c3aed', nums: dueNums ?? [] },
          { id: 'REVANCHA',   label: 'Revancha',   color: '#0ea5e9', nums: dueRevancha ?? [] },
          { id: 'REVANCHITA', label: 'Revanchita', color: '#10b981', nums: dueRevanchita ?? [] },
        ].map(({ id, label, color, nums }) => (
          <div key={id} className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider w-20 shrink-0" style={{ color }}>{label}</span>
            <div className="flex gap-1.5">
              {nums.slice(0, 3).map(n => (
                <span
                  key={n.number}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full font-bold text-xs text-white shadow-sm"
                  style={{ background: n.dueScore >= 1.5 ? '#ef4444' : n.dueScore >= 1.0 ? '#f59e0b' : color }}
                  title={`Due score: ${n.dueScore.toFixed(2)}`}
                >
                  {n.number}
                </span>
              ))}
            </div>
            {nums.length === 0 && <span className="text-xs text-zinc-400">Sincroniza para ver datos</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Zona 2: Tus predicciones ──────────────────────────────────────────────────

function TusPredicciones() {
  const { data: page, isLoading } = useSavedPredictions(0, 3)
  const { data: aggregate } = useAggregateAccuracy('MELATE', !!(page?.totalElements && page.totalElements > 0))
  const total    = page?.totalElements ?? 0
  const navigate = useNavigate()

  if (isLoading) return <div className="h-28 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />

  if (total === 0) {
    return (
      <Card>
        <CardContent className="py-6 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Guarda tu primera predicción y sigue su desempeño.
          </p>
          <Button size="sm" onClick={() => navigate('/predicciones')}>Crear predicción</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="py-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-violet-700 dark:text-violet-300 tabular-nums">{total}</p>
              <p className="text-[10px] uppercase tracking-wider text-zinc-400">predicciones</p>
            </div>
            {aggregate && (
              <>
                <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-700" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">{aggregate.bestMatchEver}/6</p>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-400">mejor acierto</p>
                </div>
                <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-700" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-sky-700 dark:text-sky-300 tabular-nums">{aggregate.avgMatchesPerCombo.toFixed(1)}</p>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-400">prom. aciertos</p>
                </div>
              </>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/predicciones')}>
            Ver predicciones →
          </Button>
        </div>
        {/* Últimas 3 predicciones */}
        {page?.content && page.content.length > 0 && (
          <div className="flex flex-col gap-1 border-t border-zinc-100 dark:border-zinc-800 pt-2">
            {page.content.slice(0, 3).map(s => (
              <div key={s.id} className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ background: s.lotteryType === 'MELATE' ? '#7c3aed' : s.lotteryType === 'REVANCHA' ? '#0ea5e9' : '#10b981' }} />
                <span className="truncate flex-1">{s.label}</span>
                <span className="tabular-nums shrink-0 text-zinc-400">{s.combos.length} combo{s.combos.length !== 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Zona 3: Alertas inteligentes ──────────────────────────────────────────────

function AlertasInteligentes() {
  const dueMelate     = useDueNumbers('MELATE',     1)
  const dueRevancha   = useDueNumbers('REVANCHA',   1)
  const dueRevanchita = useDueNumbers('REVANCHITA', 1)
  const statsMelate     = useStatistics('MELATE')
  const statsRevancha   = useStatistics('REVANCHA')
  const statsRevanchita = useStatistics('REVANCHITA')

  const dueResults   = [dueMelate,     dueRevancha,   dueRevanchita]
  const statsResults = [statsMelate, statsRevancha, statsRevanchita]
  const types        = ['MELATE', 'REVANCHA', 'REVANCHITA'] as const

  const { data: streakData } = useStreakAnalysis('MELATE')

  const criticalNumbers = streakData?.numbers
    .filter(n => n.currentDryStreak > n.longestDryStreak * 0.85 && n.longestDryStreak > 10)
    .sort((a, b) => (b.currentDryStreak / b.longestDryStreak) - (a.currentDryStreak / a.longestDryStreak))
    .slice(0, 3) ?? []

  interface Alert { icon: React.ReactNode; text: string; variant: 'warning' | 'info' | 'success' }
  const alerts: Alert[] = []

  // Alert 1: due score > 2.0 for top number
  types.forEach((type, i) => {
    const top = dueResults[i].data?.[0]
    if (top && top.dueScore > 2.0) {
      alerts.push({
        icon: <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />,
        text: `El número ${top.number} de ${type} lleva ${top.drawsSinceLast} sorteos sin salir (score ${top.dueScore.toFixed(1)}×)`,
        variant: 'warning',
      })
    }
  })

  // Alert 2: stale data
  types.forEach((type, i) => {
    const lastDate = statsResults[i].data?.lastDrawDate
    if (lastDate) {
      const days = Math.floor((Date.now() - new Date(lastDate).getTime()) / 86400000)
      if (days > 7) {
        alerts.push({
          icon: <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />,
          text: `Datos de ${type} sin actualizar (${days} días). Sincroniza antes del próximo sorteo.`,
          variant: 'info',
        })
      }
    }
  })

  // Alert 3: total draws available
  const totalDraws = statsResults.reduce((acc, r) => acc + (r.data?.totalDraws ?? 0), 0)
  if (totalDraws > 0) {
    alerts.push({
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />,
      text: `${formatNumber(totalDraws)} sorteos históricos disponibles para análisis`,
      variant: 'success',
    })
  }

  if (alerts.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Alertas inteligentes
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {alerts.map((alert, i) => (
          <div
            key={i}
            className={cn(
              'flex items-start gap-3 rounded-lg px-3 py-2.5 text-xs',
              alert.variant === 'warning'
                ? 'bg-red-50 dark:bg-red-900/10 text-red-800 dark:text-red-300'
                : alert.variant === 'info'
                  ? 'bg-amber-50 dark:bg-amber-900/10 text-amber-800 dark:text-amber-300'
                  : 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-800 dark:text-emerald-300',
            )}
          >
            {alert.icon}
            <span>{alert.text}</span>
          </div>
        ))}
        {criticalNumbers.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-zinc-100 dark:border-zinc-800 pt-2 mt-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Rachas críticas MELATE</p>
            {criticalNumbers.map(n => (
              <div key={n.number} className="flex items-center gap-2 text-xs bg-red-50 dark:bg-red-900/10 rounded-lg px-3 py-2">
                <span className="text-red-500 shrink-0">⚠️</span>
                <span className="text-red-800 dark:text-red-300">
                  El <b className="text-zinc-900 dark:text-zinc-100">número {n.number}</b> lleva{' '}
                  <b>{n.currentDryStreak}</b> sorteos sin salir
                  {' '}(récord: {n.longestDryStreak} · {Math.round(n.currentDryStreak / n.longestDryStreak * 100)}% del máximo)
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export function Dashboard() {
  const { isAdmin } = useAuth()
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Dashboard</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {new Date().toLocaleDateString('es-MX', { dateStyle: 'long' })}
          </p>
        </div>
        {isAdmin && <SyncAllButton />}
      </div>

      {/* Zona 1: Próximo sorteo */}
      <ProximoSorteo />

      {/* Zona 1.5: Valor esperado (bolsa + combo EV-optimizado) */}
      <EVCard type="MELATE" />

      {/* Zona 2: Tus predicciones */}
      <TusPredicciones />

      {/* Zona 3: Alertas inteligentes */}
      <AlertasInteligentes />

      {/* Accesos rápidos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Análisis', desc: 'Estadísticas comparativas', icon: '📊', to: '/analisis', color: '#7c3aed' },
          { label: 'Boleto Triple', desc: 'IA para los 3 juegos', icon: '🎫', to: '/boleto', color: '#6366f1' },
          { label: 'Predicciones', desc: 'Genera y analiza', icon: '✨', to: '/predicciones', color: '#f59e0b' },
          { label: 'Comparativo', desc: 'Melate vs Revancha vs Revanchita', icon: '🔀', to: '/analisis', color: '#0ea5e9' },
        ].map(({ label, desc, icon, to }) => (
          <Link
            key={label}
            to={to}
            className="flex flex-col gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3 hover:border-violet-300 dark:hover:border-violet-700 transition-colors"
          >
            <span className="text-2xl">{icon}</span>
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{label}</p>
            <p className="text-[10px] text-zinc-400">{desc}</p>
          </Link>
        ))}
      </div>

      {/* Zona 4: Juegos — cards de navegación */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">Por juego</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {LOTTERY_TYPES.map(t => (
            <GameCard key={t.id} id={t.id} />
          ))}
        </div>
      </div>
    </div>
  )
}
