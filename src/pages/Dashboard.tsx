import { Link } from 'react-router-dom'
import {
  AreaChart, Area, ResponsiveContainer, Tooltip as RechartsTip,
} from 'recharts'
import { LOTTERY_TYPES, formatNumber, formatDate } from '@/lib/utils'
import {
  useStatistics, useSync, useDrawResults, useSavedPredictions,
} from '@/api/queries'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import type { LotteryTypeId, LotteryStatistics, DrawResult, SavedPredictionSet } from '@/types/lottery'

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

// ── Sparkline (suma de números de los últimos 20 sorteos) ─────────────────────

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

// ── Números calientes (pills) ─────────────────────────────────────────────────

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

function GameCard({ id }: { id: LotteryTypeId }) {
  const meta  = LOTTERY_TYPES.find(t => t.id === id)!
  const { data: stats, isLoading: statsLoading } = useStatistics(id)
  const { data: draws, isLoading: drawsLoading } = useDrawResults(id, 20)
  const sync  = useSync(id)
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
          <Spinner className="mx-auto my-4" />
        ) : stats ? (
          <>
            {/* KPIs */}
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

            {/* Sparkline suma últimos sorteos */}
            {draws && draws.length > 2 && (
              <div>
                <p className="mb-1 text-[11px] text-zinc-400">Suma últimos 20 sorteos</p>
                <Sparkline draws={draws} color={meta.color} />
              </div>
            )}

            {/* Hot numbers */}
            <div>
              <p className="mb-1.5 text-[11px] text-zinc-400">Números más frecuentes</p>
              <HotNumbers stats={stats} color={meta.color} />
            </div>
          </>
        ) : (
          <p className="text-sm text-zinc-500">Sin datos — sincroniza primero.</p>
        )}

        {/* Actions */}
        <div className="mt-auto flex gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => sync.mutate()}
            disabled={sync.isPending}
            className="flex-1"
          >
            {sync.isPending ? <Spinner className="h-3 w-3" /> : null}
            Sincronizar
          </Button>
          <Button size="sm" className="flex-1" asChild>
            <Link to={`/game/${id}`}>Analizar</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ── GlobalKPIs ────────────────────────────────────────────────────────────────

function GlobalKPIs() {
  const games = ['MELATE', 'REVANCHA', 'REVANCHITA'] as const
  const results = games.map(id => useStatistics(id))  // eslint-disable-line react-hooks/rules-of-hooks

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
          sub: 'Fecha más reciente',
        },
        {
          label: 'Juegos activos',
          value: '3',
          sub: 'Melate, Revancha, Revanchita',
        },
        {
          label: 'Gana Gato',
          value: '1–5',
          sub: '8 números por sorteo',
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

// ── Predicciones recientes ────────────────────────────────────────────────────

function RecentPredictions() {
  const { data: predictions, isLoading } = useSavedPredictions()

  if (isLoading) return <Spinner className="mx-auto" />
  if (!predictions?.length) return null

  const recent = [...predictions]
    .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
    .slice(0, 3)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Predicciones guardadas recientes
        </h2>
        <Button variant="outline" size="sm" asChild>
          <Link to="/predictions">Ver todas</Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {recent.map((p: SavedPredictionSet) => (
          <div
            key={p.id}
            className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">{p.label}</p>
            <p className="mt-0.5 text-xs text-zinc-400">{formatDate(p.savedAt)}</p>
            <p className="mt-2 text-xs text-zinc-500">
              {p.combos.length} combo{p.combos.length !== 1 ? 's' : ''}
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {p.combos[0]?.numbers.map((n: number) => (
                <span
                  key={n}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  {n}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── SyncAllButton ─────────────────────────────────────────────────────────────

function SyncAllButton() {
  const sync = useSync('ALL')
  return (
    <Button onClick={() => sync.mutate()} disabled={sync.isPending} variant="outline">
      {sync.isPending ? <Spinner className="h-4 w-4" /> : null}
      Sincronizar todo
    </Button>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export function Dashboard() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Dashboard</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Resumen general · {new Date().toLocaleDateString('es-MX', { dateStyle: 'long' })}
          </p>
        </div>
        <SyncAllButton />
      </div>

      {/* KPIs globales */}
      <GlobalKPIs />

      {/* Tarjetas por juego */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {LOTTERY_TYPES.map(t => (
          <GameCard key={t.id} id={t.id} />
        ))}
      </div>

      {/* Predicciones recientes */}
      <RecentPredictions />
    </div>
  )
}
