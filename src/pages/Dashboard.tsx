import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  AreaChart, Area, ReferenceLine, ResponsiveContainer, Tooltip as RechartsTip,
} from 'recharts'
import { BarChart2, CalendarDays, Gamepad2, Star, Trophy } from 'lucide-react'
import { LOTTERY_TYPES, formatNumber, formatDate, cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { EmptyState } from '@/components/ui/empty-state'
import {
  useStatistics, useSync, useDrawResults, useSavedPredictions, useDueNumbers,
} from '@/api/queries'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { GameCardSkeleton, RecentPredictionSkeleton } from '@/components/ui/skeleton'
import { NextDrawBanner } from '@/components/ui/next-draw-countdown'
import type { LotteryTypeId, LotteryStatistics, DrawResult, SavedPredictionSet, DueNumber } from '@/types/lottery'

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

// ── Sparkline ─────────────────────────────────────────────────────────────────

function Sparkline({ draws, color, avg }: { draws: DrawResult[]; color: string; avg?: number }) {
  const data = [...draws]
    .slice(0, 20)
    .reverse()
    .map(d => ({ sum: d.numbers.reduce((a, b) => a + b, 0) }))

  if (data.length < 3) return null

  return (
    <ResponsiveContainer width="100%" height={48}>
      <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
        <defs>
          <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={color} stopOpacity={0.25} />
            <stop offset="95%" stopColor={color} stopOpacity={0}    />
          </linearGradient>
        </defs>
        <RechartsTip
          content={({ active, payload }) =>
            active && payload?.length
              ? <div className="rounded bg-zinc-900 px-2 py-1 text-xs text-white">Suma: {payload[0].value}</div>
              : null
          }
        />
        <Area
          type="monotone"
          dataKey="sum"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#grad-${color.replace('#', '')})`}
          dot={false}
          isAnimationActive={false}
        />
        {avg != null && (
          <ReferenceLine
            y={avg}
            stroke={color}
            strokeDasharray="3 3"
            strokeOpacity={0.6}
            strokeWidth={1}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ── Números más frecuentes (pills) ────────────────────────────────────────────

function HotNumbers({ stats, color }: { stats: LotteryStatistics; color: string }) {
  const top = stats.mostFrequent.slice(0, 6)
  const maxFreq = top[0]?.frequency ?? 1

  return (
    <div className="flex flex-wrap gap-1">
      {top.map(n => {
        const intensity = n.frequency / maxFreq
        return (
          <span
            key={n.number}
            title={`${n.frequency} apariciones`}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-white"
            style={{ backgroundColor: color, opacity: 0.4 + intensity * 0.6 }}
          >
            {n.number}
          </span>
        )
      })}
    </div>
  )
}

// ── GameCard ──────────────────────────────────────────────────────────────────

function useSyncTimestamp(id: LotteryTypeId) {
  const [ts, setTs] = useState<string | null>(() => localStorage.getItem(`lastSync_${id}`))
  useEffect(() => {
    const handler = () => setTs(localStorage.getItem(`lastSync_${id}`))
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [id])
  return ts
}

function SyncFooter({ id, lastDrawDate }: { id: LotteryTypeId; lastDrawDate: string | null | undefined }) {
  const stored = useSyncTimestamp(id)
  if (!stored && !lastDrawDate) return null

  const label = stored ? 'Sincronizado' : 'Datos al'
  const value = stored
    ? new Date(stored).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
    : formatDate(lastDrawDate)

  return (
    <p className="text-[11px] text-zinc-400 dark:text-zinc-500 text-center pt-1">
      {label}: <span className="font-medium text-zinc-500 dark:text-zinc-400">{value}</span>
    </p>
  )
}

function GameCard({ id }: { id: LotteryTypeId }) {
  const meta  = LOTTERY_TYPES.find(t => t.id === id)!
  const { data: stats, isLoading: statsLoading } = useStatistics(id)
  const { data: draws, isLoading: drawsLoading } = useDrawResults(id, 20)
  const sync  = useSync(id)
  const { isAdmin } = useAuth()
  const days  = daysSince(stats?.lastDrawDate)
  const loading = statsLoading || drawsLoading

  return (
    <Card className="flex flex-col overflow-hidden" style={{ borderTopColor: meta.color, borderTopWidth: 3 }}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-lg text-xl shrink-0"
              style={{ background: meta.color + '20' }}
            >
              {meta.icon}
            </span>
            <div>
              <CardTitle className="text-base">{meta.label}</CardTitle>
              <CardDescription className="text-xs">Rango {meta.range} · {meta.numbers} números</CardDescription>
            </div>
          </div>
          <StaleBadge days={days} />
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3">
        {loading ? (
          <GameCardSkeleton />
        ) : stats ? (
          <>
            <dl className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <dt className="text-[11px] text-zinc-500 dark:text-zinc-400">Sorteos</dt>
                <dd className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{formatNumber(stats.totalDraws)}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-zinc-500 dark:text-zinc-400">Último</dt>
                <dd className="font-semibold text-zinc-900 dark:text-zinc-100">{formatDate(stats.lastDrawDate)}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-zinc-500 dark:text-zinc-400">Sin salir</dt>
                <dd className="font-semibold text-zinc-900 dark:text-zinc-100">{stats.numbersNeverDrawn.length}</dd>
              </div>
            </dl>

            {draws && draws.length > 2 && (() => {
              const sums = draws.slice(0, 20).map(d => d.numbers.reduce((a, b) => a + b, 0))
              const avg  = Math.round(sums.reduce((a, b) => a + b, 0) / sums.length)
              const min  = Math.min(...sums)
              const max  = Math.max(...sums)
              return (
                <div>
                  <div className="flex items-baseline justify-between mb-1">
                    <p className="text-[11px] text-zinc-400">Suma últimos 20 sorteos</p>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-400 tabular-nums">
                      <span>mín <strong className="text-zinc-600 dark:text-zinc-300">{min}</strong></span>
                      <span className="font-semibold text-violet-600 dark:text-violet-400">ø {avg}</span>
                      <span>máx <strong className="text-zinc-600 dark:text-zinc-300">{max}</strong></span>
                    </div>
                  </div>
                  <Sparkline draws={draws} color={meta.color} avg={avg} />
                </div>
              )
            })()}

            <div>
              <p className="mb-1.5 text-[11px] text-zinc-400">Números más frecuentes</p>
              <HotNumbers stats={stats} color={meta.color} />
            </div>
          </>
        ) : (
          <EmptyState
            compact
            illustration="noData"
            title="Sin datos"
            description="El administrador debe sincronizar primero."
          />
        )}

        <div className="mt-auto flex gap-2 pt-1">
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                sync.mutate(undefined, {
                  onSuccess: () => {
                    window.dispatchEvent(new Event('storage'))
                    toast.success(`${meta.label} sincronizado`)
                  },
                  onError: (err) => toast.error(`Error al sincronizar: ${err.message}`),
                })
              }}
              disabled={sync.isPending}
              className="flex-1"
            >
              {sync.isPending ? <Spinner className="h-3 w-3" /> : null}
              Sincronizar
            </Button>
          )}
          <Button
            size="sm"
            className={cn(isAdmin ? 'flex-1' : 'w-full', 'text-white border-0')}
            style={{ background: meta.color }}
            asChild
          >
            <Link to={`/game/${id}`}>Analizar</Link>
          </Button>
        </div>

        <SyncFooter id={id} lastDrawDate={stats?.lastDrawDate} />
      </CardContent>
    </Card>
  )
}

// ── KPIs globales ─────────────────────────────────────────────────────────────

function GlobalKPIs() {
  const games = ['MELATE', 'REVANCHA', 'REVANCHITA'] as const
  const results = games.map(id => useStatistics(id))  // eslint-disable-line react-hooks/rules-of-hooks
  const { data: predictionsPage } = useSavedPredictions()
  const predCount = predictionsPage?.totalElements ?? 0

  const totalDraws = results.reduce((acc, r) => acc + (r.data?.totalDraws ?? 0), 0)
  const loading    = results.some(r => r.isLoading)

  const lastDates = results
    .map(r => r.data?.lastDrawDate)
    .filter(Boolean) as string[]
  const mostRecent = lastDates.sort().at(-1) ?? null

  const kpis = [
    {
      label: 'Total sorteos',
      value: loading ? '…' : formatNumber(totalDraws),
      sub:   'Melate + Revancha + Revanchita',
      icon:  BarChart2,
      iconBg: 'bg-violet-100 dark:bg-violet-900/40',
      iconColor: 'text-violet-600 dark:text-violet-400',
      valueColor: 'text-violet-700 dark:text-violet-300',
    },
    {
      label: 'Último sorteo',
      value: loading ? '…' : formatDate(mostRecent),
      sub:   'Fecha más reciente en BD',
      icon:  CalendarDays,
      iconBg: 'bg-sky-100 dark:bg-sky-900/40',
      iconColor: 'text-sky-600 dark:text-sky-400',
      valueColor: 'text-sky-700 dark:text-sky-300',
    },
    {
      label: 'Juegos activos',
      value: '3',
      sub:   'Melate, Revancha, Revanchita',
      icon:  Gamepad2,
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      valueColor: 'text-emerald-700 dark:text-emerald-300',
    },
    {
      label: 'Predicciones',
      value: predictionsPage ? String(predCount) : '…',
      sub:   'Combinaciones guardadas',
      icon:  Star,
      iconBg: 'bg-amber-100 dark:bg-amber-900/40',
      iconColor: 'text-amber-600 dark:text-amber-400',
      valueColor: 'text-amber-700 dark:text-amber-300',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {kpis.map(({ label, value, sub, icon: Icon, iconBg, iconColor, valueColor }) => (
        <div
          key={label}
          className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 flex flex-col gap-3"
        >
          <div className={cn('inline-flex h-9 w-9 items-center justify-center rounded-lg', iconBg)}>
            <Icon className={cn('h-4 w-4', iconColor)} />
          </div>
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
            <p className={cn('mt-0.5 text-2xl font-bold tabular-nums', valueColor)}>{value}</p>
            <p className="mt-0.5 text-[11px] text-zinc-400">{sub}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Números pendientes (due numbers) ─────────────────────────────────────────

function DueNumbersRow({ id }: { id: LotteryTypeId }) {
  const meta = LOTTERY_TYPES.find(t => t.id === id)!
  const { data: due, isLoading } = useDueNumbers(id, 6)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-base">{meta.icon}</span>
        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{meta.label}</span>
      </div>

      {isLoading ? (
        <div className="flex gap-1.5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-9 w-9 rounded-full bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
          ))}
        </div>
      ) : due?.length ? (
        <div className="flex flex-col gap-1.5">
          {due.slice(0, 6).map((n: DueNumber) => {
            const heat = Math.min((n.dueScore - 1) / 2, 1)   // 0 at 1x, 1 at 3x+
            const heatColor = heat > 0.66 ? '#ef4444' : heat > 0.33 ? '#f59e0b' : meta.color
            return (
              <div key={n.number} className="flex items-center gap-2">
                <span
                  title={`Due score: ${n.dueScore.toFixed(2)} · ${n.drawsSinceLast} sorteos sin salir`}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white cursor-help"
                  style={{ background: heatColor }}
                >
                  {n.number}
                </span>
                <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                  <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${Math.max(heat * 100, 4)}%`, background: heatColor }}
                    />
                  </div>
                  <span className="text-[9px] tabular-nums text-zinc-400">{n.dueScore.toFixed(1)}× · {n.drawsSinceLast}s</span>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-xs text-zinc-400">Sin datos</p>
      )}
    </div>
  )
}

function DueNumbersSection() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Números pendientes hoy</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Los que más sorteos llevan sin aparecer respecto a su intervalo histórico. El multiplicador indica cuántas veces su intervalo promedio ha sido superado.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/comparative">Ver análisis completo</Link>
        </Button>
      </div>

      <div className="grid gap-5 sm:grid-cols-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
        {(['MELATE', 'REVANCHA', 'REVANCHITA'] as LotteryTypeId[]).map(id => (
          <DueNumbersRow key={id} id={id} />
        ))}
      </div>
    </div>
  )
}

// ── Predicciones recientes ────────────────────────────────────────────────────

function RecentPredictions() {
  const { data: predictionsPage, isLoading } = useSavedPredictions()
  const predictions = predictionsPage?.content ?? []
  const { data: drawsMelate     } = useDrawResults('MELATE')
  const { data: drawsRevancha   } = useDrawResults('REVANCHA')
  const { data: drawsRevanchita } = useDrawResults('REVANCHITA')

  const drawsMap: Record<string, DrawResult[]> = {
    MELATE:     drawsMelate     ?? [],
    REVANCHA:   drawsRevancha   ?? [],
    REVANCHITA: drawsRevanchita ?? [],
  }

  if (isLoading) return (
    <div className="flex flex-col gap-3">
      {[...Array(3)].map((_, i) => <RecentPredictionSkeleton key={i} />)}
    </div>
  )
  if (!predictions.length) return null

  const recent = [...predictions]
    .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
    .slice(0, 3)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Predicciones recientes
        </h2>
        <Button variant="outline" size="sm" asChild>
          <Link to="/predicciones">Ver todas</Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {recent.map((p: SavedPredictionSet) => {
          const newDraws = Object.values(drawsMap).flat()
            .filter(d => !p.latestDrawDate || d.drawDate > p.latestDrawDate).length
          const meta = LOTTERY_TYPES.find(t => t.id === p.lotteryType)

          return (
            <Link
              key={p.id}
              to="/predicciones"
              className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 hover:border-violet-300 dark:hover:border-violet-700 transition-colors block"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">{p.label}</p>
                {newDraws > 0 && (
                  <span className="shrink-0 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded-full">
                    {newDraws} nuevo{newDraws !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-zinc-400">{formatDate(p.savedAt)}</p>
              {meta && (
                <p className="mt-1 text-[11px] text-zinc-400">{meta.icon} {meta.label} · {p.combos.length} combo{p.combos.length !== 1 ? 's' : ''}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-1">
                {[...(p.combos[0]?.numbers ?? [])].sort((a: number, b: number) => a - b).map((n: number) => (
                  <span
                    key={n}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                    style={{ background: meta?.color ?? '#7c3aed' }}
                  >
                    {n}
                  </span>
                ))}
                {p.combos.length > 1 && (
                  <span className="inline-flex h-6 px-1.5 items-center justify-center rounded-full text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                    +{p.combos.length - 1}
                  </span>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
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

// ── Último sorteo ─────────────────────────────────────────────────────────────

function LastDrawResults() {
  const types = LOTTERY_TYPES
  const results = types.map(t => useDrawResults(t.id as LotteryTypeId, 1)) // eslint-disable-line react-hooks/rules-of-hooks
  const isLoading = results.some(r => r.isLoading)
  const hasAny = results.some(r => (r.data?.length ?? 0) > 0)

  if (isLoading) return (
    <div className="grid gap-3 sm:grid-cols-3">
      {types.map(t => (
        <div key={t.id} className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-4 animate-pulse bg-zinc-50 dark:bg-zinc-800/50 h-28" />
      ))}
    </div>
  )

  if (!hasAny) return null

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
        Resultado del último sorteo
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {types.map((meta, i) => {
          const draw = results[i].data?.[0]
          if (!draw) return null
          const fmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })
          return (
            <div
              key={meta.id}
              className="rounded-xl border-2 bg-white dark:bg-zinc-900 p-4 flex flex-col gap-3 overflow-hidden relative"
              style={{ borderColor: meta.color + '55' }}
            >
              {/* color accent strip */}
              <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl" style={{ background: meta.color }} />

              {/* header */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xl">{meta.icon}</span>
                  <span className="text-sm font-bold text-zinc-800 dark:text-zinc-100">{meta.label}</span>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-medium text-zinc-400">#{draw.drawNumber}</p>
                  <p className="text-[10px] text-zinc-400">
                    {new Date(draw.drawDate).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>

              {/* jackpot as hero */}
              {draw.jackpotAmount != null && (
                <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: meta.color + '15' }}>
                  <Trophy className="h-4 w-4 shrink-0" style={{ color: meta.color }} />
                  <div>
                    <p className="text-[10px] text-zinc-400">Bolsa</p>
                    <p className="text-base font-bold" style={{ color: meta.color }}>
                      {fmt.format(draw.jackpotAmount)}
                    </p>
                  </div>
                  {draw.firstPrizeWinners != null && (
                    <div className="ml-auto text-right">
                      <p className="text-[10px] text-zinc-400">Ganadores</p>
                      <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                        {draw.firstPrizeWinners === 0 ? 'Sin ganador' : draw.firstPrizeWinners}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* numbers */}
              <div className="flex gap-1.5 flex-wrap">
                {[...draw.numbers].sort((a, b) => a - b).map(n => (
                  <span
                    key={n}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full font-bold text-sm tabular-nums text-white shadow-sm"
                    style={{ background: meta.color }}
                  >
                    {String(n).padStart(2, '0')}
                  </span>
                ))}
              </div>

              {/* fallback winners if no jackpot */}
              {draw.jackpotAmount == null && draw.firstPrizeWinners != null && (
                <div className="border-t border-zinc-100 dark:border-zinc-800 pt-2 text-right">
                  <p className="text-[10px] text-zinc-400">Ganadores</p>
                  <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                    {draw.firstPrizeWinners === 0 ? 'Sin ganador' : draw.firstPrizeWinners}
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
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

      <NextDrawBanner />

      <LastDrawResults />

      <GlobalKPIs />

      <DueNumbersSection />

      <div className="grid gap-4 sm:grid-cols-3">
        {LOTTERY_TYPES.map(t => (
          <GameCard key={t.id} id={t.id} />
        ))}
      </div>

      <RecentPredictions />
    </div>
  )
}
