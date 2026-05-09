import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  AreaChart, Area, ResponsiveContainer, Tooltip as RechartsTip,
} from 'recharts'
import { LOTTERY_TYPES, formatNumber, formatDate } from '@/lib/utils'
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

function Sparkline({ draws, color }: { draws: DrawResult[]; color: string }) {
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
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{meta.icon}</span>
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

            {draws && draws.length > 2 && (
              <div>
                <p className="mb-1 text-[11px] text-zinc-400">Suma últimos 20 sorteos</p>
                <Sparkline draws={draws} color={meta.color} />
              </div>
            )}

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
          <Button size="sm" className={isAdmin ? 'flex-1' : 'w-full'} asChild>
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

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {[
        {
          label: 'Total sorteos',
          value: loading ? '…' : formatNumber(totalDraws),
          sub: 'Melate + Revancha + Revanchita',
        },
        {
          label: 'Último sorteo',
          value: loading ? '…' : formatDate(mostRecent),
          sub: 'Fecha más reciente en BD',
        },
        {
          label: 'Juegos activos',
          value: '3',
          sub: 'Melate, Revancha, Revanchita',
        },
        {
          label: 'Predicciones',
          value: predictionsPage ? String(predCount) : '…',
          sub: 'Combinaciones guardadas',
        },
      ].map(({ label, value, sub }) => (
        <div
          key={label}
          className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{value}</p>
          <p className="mt-0.5 text-[11px] text-zinc-400">{sub}</p>
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
        <div className="flex flex-wrap gap-1.5">
          {due.slice(0, 6).map((n: DueNumber) => (
            <div key={n.number} className="flex flex-col items-center gap-0.5">
              <span
                title={`Due score: ${n.dueScore.toFixed(2)} · ${n.drawsSinceLast} sorteos sin salir`}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white cursor-help"
                style={{ backgroundColor: meta.color, opacity: 0.5 + Math.min(n.dueScore - 1, 1) * 0.5 }}
              >
                {n.number}
              </span>
              <span className="text-[9px] tabular-nums text-zinc-400">{n.dueScore.toFixed(1)}x</span>
            </div>
          ))}
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
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    {n}
                  </span>
                ))}
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
