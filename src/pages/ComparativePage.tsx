import { useMemo, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Legend, CartesianGrid, ReferenceLine,
  BarChart, Bar, Cell,
} from 'recharts'
import {
  useDueNumbers, useWindowedFrequencies,
  useBalanceAnalysis, useSumDistribution,
  usePairAnalysis, useChiSquare, useBacktest, useBayesianAnalysis,
} from '@/api/queries'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageSpinner } from '@/components/ui/spinner'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Tooltip as Tip } from '@/components/ui/tooltip'
import { cn, formatNumber } from '@/lib/utils'
import type {
  LotteryTypeId, DueNumber, WindowedFrequency, BalanceAnalysis, SumDistribution,
  NumberPair, ChiSquareResult, BacktestResult, BayesianNumber,
} from '@/types/lottery'

// ── Constants ────────────────────────────────────────────────────────────────

const GAMES: LotteryTypeId[] = ['MELATE', 'REVANCHA', 'REVANCHITA']

const GAME_COLOR: Record<string, string> = {
  MELATE:     '#7c3aed',
  REVANCHA:   '#0ea5e9',
  REVANCHITA: '#10b981',
}
const GAME_LABEL: Record<string, string> = {
  MELATE:     'Melate',
  REVANCHA:   'Revancha',
  REVANCHITA: 'Revanchita',
}
const GAME_ICON: Record<string, string> = {
  MELATE: '🟣', REVANCHA: '🔵', REVANCHITA: '🟢',
}

// ── Scoring ──────────────────────────────────────────────────────────────────

interface NumberScore {
  number: number
  consensusScore: number      // 0..1 normalized
  gamesInTop10: number        // 0..3
  details: { game: LotteryTypeId; dueScore: number; trend: number }[]
}

function computeScores(
  dueMap:   Record<string, DueNumber[]>,
  trendMap: Record<string, WindowedFrequency[]>,
): NumberScore[] {
  const maxDue = Object.fromEntries(
    GAMES.map(g => [g, Math.max(...(dueMap[g]?.map(d => d.dueScore) ?? [1]), 0.01)]),
  )
  const maxPosTrend = Object.fromEntries(
    GAMES.map(g => [g, Math.max(...(trendMap[g]?.map(w => w.trend).filter(t => t > 0) ?? [1]), 1)]),
  )

  return Array.from({ length: 56 }, (_, i) => i + 1).map(num => {
    const details = GAMES.map(game => ({
      game,
      dueScore: dueMap[game]?.find(d => d.number === num)?.dueScore ?? 0,
      trend:    trendMap[game]?.find(w => w.number === num)?.trend   ?? 0,
    }))

    const totalScore = details.reduce((sum, { game, dueScore, trend }) => {
      const normDue   = dueScore / maxDue[game]
      const normTrend = Math.max(trend, 0) / maxPosTrend[game]
      return sum + normDue * 0.65 + normTrend * 0.35
    }, 0)

    const gamesInTop10 = GAMES.filter(game => {
      const rank = dueMap[game]?.findIndex(d => d.number === num) ?? -1
      return rank >= 0 && rank < 10
    }).length

    return { number: num, consensusScore: totalScore / GAMES.length, gamesInTop10, details }
  })
}

/** Picks 6 numbers from candidates maintaining 3-odd/3-even balance */
function pickBalanced(ranked: NumberScore[]): number[] {
  const odd  = ranked.filter(s => s.number % 2 !== 0)
  const even = ranked.filter(s => s.number % 2 === 0)
  return [
    ...odd.slice(0, 3).map(s => s.number),
    ...even.slice(0, 3).map(s => s.number),
  ].sort((a, b) => a - b)
}

// ── Sub-components ───────────────────────────────────────────────────────────

function ConsensusGrid({ scores }: { scores: NumberScore[] }) {
  const byNumber = Object.fromEntries(scores.map(s => [s.number, s]))
  const maxScore = Math.max(...scores.map(s => s.consensusScore))

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4 flex-wrap text-xs text-zinc-500 dark:text-zinc-400">
        <span>Intensidad del consenso:</span>
        {[0, 1, 2, 3].map(n => (
          <span key={n} className="flex items-center gap-1">
            <span className={cn(
              'inline-flex w-5 h-5 rounded-full',
              n === 3 ? 'bg-violet-700'
              : n === 2 ? 'bg-violet-500'
              : n === 1 ? 'bg-violet-300'
              : 'bg-zinc-200 dark:bg-zinc-700',
            )} />
            {n === 0 ? 'Bajo' : n === 1 ? 'Medio' : n === 2 ? 'Alto' : `${n} juegos`}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-14 gap-1.5">
        {Array.from({ length: 56 }, (_, i) => i + 1).map(n => {
          const s    = byNumber[n]
          const norm = s ? s.consensusScore / maxScore : 0
          const top3 = s && scores.indexOf(s) < 6

          return (
            <div
              key={n}
              title={s ? `Nº${n} · score ${s.consensusScore.toFixed(2)} · ${s.gamesInTop10} juegos top-10` : `Nº${n}`}
              className={cn(
                'flex items-center justify-center rounded-lg text-xs font-bold aspect-square cursor-default select-none transition-all',
                top3 && 'ring-2 ring-offset-1 ring-amber-400 dark:ring-offset-zinc-900',
                norm > 0.75 ? 'bg-violet-700 text-white'
                : norm > 0.50 ? 'bg-violet-500 text-white'
                : norm > 0.25 ? 'bg-violet-300 text-violet-900'
                : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
              )}
            >
              {n}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CombinedSuggestion({
  numbers,
  scores,
  sumDists,
}: {
  numbers: number[]
  scores: NumberScore[]
  sumDists: Record<string, SumDistribution | undefined>
}) {
  const total = numbers.reduce((a, b) => a + b, 0)
  const byNumber = Object.fromEntries(scores.map(s => [s.number, s]))

  const allOptRanges = GAMES.map(g => sumDists[g]).filter(Boolean) as SumDistribution[]
  const sharedMin = allOptRanges.length ? Math.max(...allOptRanges.map(d => d.optimalMin)) : 0
  const sharedMax = allOptRanges.length ? Math.min(...allOptRanges.map(d => d.optimalMax)) : 999
  const inRange   = total >= sharedMin && total <= sharedMax

  const oddCount  = numbers.filter(n => n % 2 !== 0).length
  const evenCount = numbers.length - oddCount

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
        {numbers.map(n => {
          const s = byNumber[n]
          return (
            <div key={n} className="flex flex-col items-center gap-1">
              <span className={cn(
                'inline-flex h-12 w-12 items-center justify-center rounded-full font-bold text-lg text-white',
                s && s.gamesInTop10 === 3 ? 'bg-amber-500'
                : s && s.gamesInTop10 === 2 ? 'bg-violet-600'
                : 'bg-violet-400',
              )}>
                {n}
              </span>
              <div className="flex gap-0.5">
                {GAMES.map(g => (
                  <span
                    key={g}
                    title={g}
                    className="w-2 h-2 rounded-full"
                    style={{
                      background: (s?.details.find(d => d.game === g)?.dueScore ?? 0) > 0.5
                        ? GAME_COLOR[g] : '#d1d5db',
                    }}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/60 p-3">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Suma total</p>
          <p className={cn(
            'text-xl font-bold',
            inRange ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500',
          )}>
            {total}
          </p>
          <p className="text-xs text-zinc-400 mt-0.5">
            {inRange ? `✓ rango ${sharedMin}–${sharedMax}` : `fuera de ${sharedMin}–${sharedMax}`}
          </p>
        </div>
        <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/60 p-3">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Balance</p>
          <p className="text-xl font-bold text-zinc-800 dark:text-zinc-100">
            {oddCount}I · {evenCount}P
          </p>
          <p className="text-xs text-zinc-400 mt-0.5">impar · par</p>
        </div>
        <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/60 p-3">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Consenso</p>
          <p className="text-xl font-bold text-violet-700 dark:text-violet-300">
            {numbers.filter(n => (byNumber[n]?.gamesInTop10 ?? 0) >= 2).length}/6
          </p>
          <p className="text-xs text-zinc-400 mt-0.5">en ≥2 juegos</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        <span>Leyenda:</span>
        <span className="flex items-center gap-1"><span className="w-4 h-4 rounded-full bg-amber-500 inline-block" /> top-3 en los 3 juegos</span>
        <span className="flex items-center gap-1"><span className="w-4 h-4 rounded-full bg-violet-600 inline-block" /> top-10 en 2 juegos</span>
        <span className="flex items-center gap-1"><span className="w-4 h-4 rounded-full bg-violet-400 inline-block" /> top-10 en 1 juego</span>
      </div>
    </div>
  )
}

function TopConsensusTable({ scores }: { scores: NumberScore[] }) {
  const top15 = scores.slice(0, 15)
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-sm min-w-[480px]">
        <thead>
          <tr className="text-left text-xs text-zinc-400 dark:text-zinc-500 border-b border-zinc-100 dark:border-zinc-800">
            <th className="pb-2 pr-3">#</th>
            <th className="pb-2 pr-3">Nº</th>
            <th className="pb-2 pr-3">🟣 Melate</th>
            <th className="pb-2 pr-3">🔵 Revancha</th>
            <th className="pb-2 pr-3">🟢 Revanchita</th>
            <th className="pb-2 pr-3">Score</th>
            <th className="pb-2">Juegos</th>
          </tr>
        </thead>
        <tbody>
          {top15.map((s, rank) => (
            <tr key={s.number} className="border-b border-zinc-50 dark:border-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
              <td className="py-2 pr-3 text-zinc-400 text-xs">{rank + 1}</td>
              <td className="py-2 pr-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-white font-bold text-sm">
                  {s.number}
                </span>
              </td>
              {s.details.map(d => (
                <td key={d.game} className="py-2 pr-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-zinc-700 dark:text-zinc-300 text-xs">
                      {d.dueScore > 0 ? d.dueScore.toFixed(2) : '–'}
                    </span>
                    <span className={cn(
                      'text-xs',
                      d.trend > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-400',
                    )}>
                      {d.trend > 0 ? '▲' : '▼'} {Math.abs(d.trend).toFixed(1)}%
                    </span>
                  </div>
                </td>
              ))}
              <td className="py-2 pr-3">
                <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full bg-violet-500"
                    style={{ width: `${(s.consensusScore / (scores[0]?.consensusScore ?? 1)) * 100}%` }}
                  />
                </div>
              </td>
              <td className="py-2">
                <div className="flex gap-1">
                  {[1, 2, 3].map(n => (
                    <span
                      key={n}
                      className={cn(
                        'w-2 h-4 rounded-sm',
                        n <= s.gamesInTop10 ? 'bg-violet-500' : 'bg-zinc-200 dark:bg-zinc-700',
                      )}
                    />
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SumOverlayChart({
  sumDists,
}: {
  sumDists: Record<string, SumDistribution | undefined>
}) {
  const chartData = useMemo(() => {
    const allSums = GAMES.flatMap(g =>
      Object.keys(sumDists[g]?.histogram ?? {}).map(Number),
    )
    if (allSums.length === 0) return []

    const minS = Math.min(...allSums)
    const maxS = Math.max(...allSums)

    return Array.from({ length: maxS - minS + 1 }, (_, i) => {
      const s = minS + i
      const point: Record<string, number> = { sum: s }
      GAMES.forEach(g => {
        const hist  = sumDists[g]?.histogram ?? {}
        const total = sumDists[g]?.totalDraws ?? 1
        point[g] = Math.round(((hist[s] ?? 0) / total) * 10000) / 100  // %
      })
      return point
    }).filter(p => GAMES.some(g => (p[g] as number) > 0))
  }, [sumDists])

  const optRanges = GAMES.map(g => sumDists[g]).filter(Boolean) as SumDistribution[]
  const sharedMin = optRanges.length ? Math.max(...optRanges.map(d => d.optimalMin)) : undefined
  const sharedMax = optRanges.length ? Math.min(...optRanges.map(d => d.optimalMax)) : undefined

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Las líneas <span className="font-medium text-violet-600">punteadas verticales</span> marcan
        el rango óptimo compartido ({sharedMin}–{sharedMax}),
        donde se concentran los sorteos en los tres juegos.
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
          <XAxis dataKey="sum" tick={{ fontSize: 9 }} interval={Math.ceil(chartData.length / 20) - 1} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} />
          <Tooltip formatter={(v: unknown, name: unknown) => [`${Number(v).toFixed(2)}%`, GAME_LABEL[String(name)] ?? String(name)]} labelFormatter={l => `Suma ${l}`} />
          <Legend formatter={name => GAME_LABEL[name] ?? name} />
          {sharedMin && <ReferenceLine x={sharedMin} stroke="#7c3aed" strokeDasharray="4 2" opacity={0.6} />}
          {sharedMax && <ReferenceLine x={sharedMax} stroke="#7c3aed" strokeDasharray="4 2" opacity={0.6} />}
          {GAMES.map(g => (
            <Line
              key={g}
              type="monotone"
              dataKey={g}
              stroke={GAME_COLOR[g]}
              dot={false}
              strokeWidth={2}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* Per-game stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        {GAMES.map(g => {
          const d = sumDists[g]
          if (!d) return null
          return (
            <div key={g} className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 text-xs">
              <p className="font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                {GAME_ICON[g]} {GAME_LABEL[g]}
              </p>
              <div className="space-y-1 text-zinc-500 dark:text-zinc-400">
                <p>Media: <b className="text-zinc-700 dark:text-zinc-300">{d.mean.toFixed(1)}</b></p>
                <p>Desv: <b className="text-zinc-700 dark:text-zinc-300">±{d.stdDev.toFixed(1)}</b></p>
                <p>Óptimo: <b className="text-violet-700 dark:text-violet-300">{d.optimalMin}–{d.optimalMax}</b></p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function BalanceComparison({ balances }: { balances: Record<string, BalanceAnalysis | undefined> }) {
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-sm min-w-[360px]">
        <thead>
          <tr className="text-left text-xs text-zinc-400 dark:text-zinc-500 border-b border-zinc-100 dark:border-zinc-800">
            <th className="pb-2 pr-4">Juego</th>
            <th className="pb-2 pr-4">Óptimo Imp/Par</th>
            <th className="pb-2 pr-4">% sorteos</th>
            <th className="pb-2 pr-4">Óptimo Alt/Baj</th>
            <th className="pb-2">% sorteos</th>
          </tr>
        </thead>
        <tbody>
          {GAMES.map(g => {
            const b = balances[g]
            if (!b) return null
            const oddPct  = ((b.oddEvenDistribution[b.optimalOddCount]  ?? 0) / b.totalDraws * 100).toFixed(1)
            const highPct = ((b.highLowDistribution[b.optimalHighCount] ?? 0) / b.totalDraws * 100).toFixed(1)
            return (
              <tr key={g} className="border-b border-zinc-50 dark:border-zinc-900">
                <td className="py-3 pr-4">
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    {GAME_ICON[g]} {GAME_LABEL[g]}
                  </span>
                </td>
                <td className="py-3 pr-4">
                  <Badge variant="secondary" className="font-mono">
                    {b.optimalOddCount}I + {b.optimalEvenCount}P
                  </Badge>
                </td>
                <td className="py-3 pr-4 text-zinc-600 dark:text-zinc-400">{oddPct}%</td>
                <td className="py-3 pr-4">
                  <Badge variant="secondary" className="font-mono">
                    {b.optimalHighCount}A + {b.optimalLowCount}B
                  </Badge>
                </td>
                <td className="py-3 text-zinc-600 dark:text-zinc-400">{highPct}%</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">
        I = impar · P = par · A = alto (&gt; punto medio) · B = bajo (≤ punto medio) ·
        Punto medio = {balances['MELATE']?.midpoint ?? 28}
      </p>
    </div>
  )
}

// ── DueComparison ─────────────────────────────────────────────────────────────

function DueComparison({ dueMap }: { dueMap: Record<string, DueNumber[]> }) {
  const tops = useMemo(
    () => Object.fromEntries(
      GAMES.map(g => [
        g,
        [...(dueMap[g] ?? [])].sort((a, b) => b.dueScore - a.dueScore).slice(0, 10),
      ]),
    ),
    [dueMap],
  )

  const heatData = useMemo(
    () =>
      Array.from({ length: 56 }, (_, i) => i + 1).map(num => {
        const scores = GAMES.map(g => dueMap[g]?.find(d => d.number === num)?.dueScore ?? 0)
        const avg = scores.reduce((a, b) => a + b, 0) / GAMES.length
        return { num, avg, scores }
      }),
    [dueMap],
  )

  const maxAvg = Math.max(...heatData.map(d => d.avg), 0.01)

  return (
    <div className="flex flex-col gap-6">

      {/* ── Heatmap grid ── */}
      <Card>
        <CardHeader>
          <CardTitle>Mapa de calor — Números más pendientes</CardTitle>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Intensidad = dueScore promedio entre los 3 juegos.
            Los puntos de color muestran en qué juego el número tiene mayor deuda.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-14 gap-1.5">
            {heatData.map(({ num, avg, scores }) => {
              const norm  = avg / maxAvg
              const top6  = [...heatData].sort((a, b) => b.avg - a.avg).slice(0, 6).some(d => d.num === num)
              return (
                <div
                  key={num}
                  title={`Nº${num} · avg ${avg.toFixed(2)} · ${GAMES.map((g, i) => `${GAME_LABEL[g]}: ${scores[i].toFixed(2)}`).join(' · ')}`}
                  className={cn(
                    'flex flex-col items-center justify-center rounded-lg aspect-square cursor-default select-none transition-all gap-0.5',
                    top6 && 'ring-2 ring-offset-1 ring-amber-400 dark:ring-offset-zinc-900',
                    norm > 0.75 ? 'bg-red-500 text-white'
                    : norm > 0.50 ? 'bg-orange-400 text-white'
                    : norm > 0.25 ? 'bg-amber-300 text-amber-900'
                    : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
                  )}
                >
                  <span className="text-xs font-bold leading-none">{num}</span>
                  <div className="flex gap-px">
                    {GAMES.map((g, i) => (
                      <span
                        key={g}
                        className="w-1 h-1 rounded-full"
                        style={{ background: scores[i] >= 1.0 ? GAME_COLOR[g] : 'transparent' }}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex items-center gap-4 flex-wrap text-xs text-zinc-500 dark:text-zinc-400 mt-3">
            <span>Urgencia:</span>
            <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-red-500 inline-block" /> Muy alta</span>
            <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-orange-400 inline-block" /> Alta</span>
            <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-amber-300 inline-block" /> Media</span>
            <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-zinc-200 dark:bg-zinc-700 inline-block" /> Baja</span>
          </div>
        </CardContent>
      </Card>

      {/* ── Top 10 per game ── */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 por juego</CardTitle>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            dueScore = sorteos sin salir ÷ intervalo promedio histórico.
            Score ≥ 1.0 indica que el número lleva más tiempo del habitual sin aparecer.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-3">
            {GAMES.map(g => (
              <div key={g} className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  {GAME_ICON[g]} {GAME_LABEL[g]}
                </p>
                {tops[g].map((dn, rank) => {
                  const pct   = Math.min((dn.dueScore / 2) * 100, 100)
                  const hot   = dn.dueScore >= 1.5
                  const warn  = dn.dueScore >= 1.0
                  return (
                    <div key={dn.number} className="flex items-center gap-2 py-1.5 border-b border-zinc-50 dark:border-zinc-800/60 last:border-0">
                      <span className="w-4 text-right text-[10px] text-zinc-400 shrink-0">{rank + 1}</span>
                      <span
                        className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full font-bold text-sm text-white"
                        style={{ background: GAME_COLOR[g] }}
                      >
                        {dn.number}
                      </span>
                      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs text-zinc-600 dark:text-zinc-400 tabular-nums">
                            {dn.drawsSinceLast} sorteos
                          </span>
                          <span className={cn(
                            'text-[10px] font-bold tabular-nums',
                            hot ? 'text-red-500' : warn ? 'text-amber-500' : 'text-zinc-400',
                          )}>
                            {dn.dueScore.toFixed(2)}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                          <div
                            className={cn('h-full rounded-full', hot ? 'bg-red-500' : warn ? 'bg-amber-400' : 'bg-violet-400')}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Cross-game top numbers ── */}
      <Card>
        <CardHeader>
          <CardTitle>Números con mayor deuda en varios juegos</CardTitle>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Números que están entre el top-10 de pendientes en más de un juego simultáneamente.
          </p>
        </CardHeader>
        <CardContent>
          {(() => {
            const top10Sets = Object.fromEntries(
              GAMES.map(g => [g, new Set(tops[g].map(d => d.number))]),
            )
            const shared = Array.from({ length: 56 }, (_, i) => i + 1)
              .map(num => ({ num, count: GAMES.filter(g => top10Sets[g].has(num)).length }))
              .filter(d => d.count >= 2)
              .sort((a, b) => b.count - a.count)

            if (!shared.length) return (
              <p className="text-sm text-zinc-400 dark:text-zinc-500">
                Ningún número está en el top-10 de más de un juego simultáneamente.
              </p>
            )
            return (
              <div className="flex flex-wrap gap-3">
                {shared.map(({ num, count }) => {
                  const avgScore = GAMES.reduce((s, g) => s + (dueMap[g]?.find(d => d.number === num)?.dueScore ?? 0), 0) / GAMES.length
                  return (
                    <div key={num} className="flex flex-col items-center gap-1">
                      <span className={cn(
                        'inline-flex h-12 w-12 items-center justify-center rounded-full font-bold text-lg text-white',
                        count === 3 ? 'bg-amber-500' : 'bg-violet-600',
                      )}>
                        {num}
                      </span>
                      <div className="flex gap-0.5">
                        {GAMES.map(g => (
                          <span
                            key={g}
                            className="w-2 h-2 rounded-full"
                            style={{ background: top10Sets[g].has(num) ? GAME_COLOR[g] : '#e5e7eb' }}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                        {avgScore.toFixed(2)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </CardContent>
      </Card>

    </div>
  )
}

// ── PairsComparison ───────────────────────────────────────────────────────────

function PairsComparison({
  pairsMap,
  top15Numbers,
}: {
  pairsMap: Record<string, NumberPair[] | undefined>
  top15Numbers: Set<number>
}) {
  const hasAny = GAMES.some(g => (pairsMap[g]?.length ?? 0) > 0)
  if (!hasAny) {
    return <p className="text-sm text-zinc-400 dark:text-zinc-500 py-4">Sin datos de pares.</p>
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {GAMES.map(g => {
        const pairs = pairsMap[g]?.slice(0, 15) ?? []
        const maxFreq = pairs[0]?.frequency ?? 1

        return (
          <div key={g} className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              {GAME_ICON[g]} {GAME_LABEL[g]}
            </p>
            {pairs.length === 0 ? (
              <p className="text-xs text-zinc-400">Sin datos</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {pairs.map((p, i) => {
                  const bothInTop15 = top15Numbers.has(p.number1) && top15Numbers.has(p.number2)
                  return (
                    <div
                      key={`${p.number1}-${p.number2}`}
                      className={cn(
                        'flex items-center gap-2 rounded-md px-2 py-1.5 text-xs',
                        bothInTop15
                          ? 'bg-amber-50 dark:bg-amber-900/20 ring-1 ring-amber-300 dark:ring-amber-700'
                          : 'bg-zinc-50 dark:bg-zinc-800/50',
                      )}
                    >
                      <span className="w-5 shrink-0 text-zinc-400 font-mono">{i + 1}</span>
                      <span className="font-bold text-zinc-700 dark:text-zinc-300 shrink-0 tabular-nums">
                        {String(p.number1).padStart(2, '0')} ⊕ {String(p.number2).padStart(2, '0')}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700">
                          <div
                            className="h-1.5 rounded-full"
                            style={{
                              width: `${(p.frequency / maxFreq) * 100}%`,
                              background: GAME_COLOR[g],
                            }}
                          />
                        </div>
                      </div>
                      <span className="shrink-0 text-zinc-500 dark:text-zinc-400 tabular-nums">
                        {formatNumber(p.frequency)}×
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── BayesianComparison ────────────────────────────────────────────────────────

function BayesianComparison({
  bayesMap,
}: {
  bayesMap: Record<string, BayesianNumber[] | undefined>
}) {
  const hasAny = GAMES.some(g => (bayesMap[g]?.length ?? 0) > 0)
  if (!hasAny) {
    return <p className="text-sm text-zinc-400 dark:text-zinc-500 py-4">Sin datos bayesianos.</p>
  }

  // Build a unified top-15 sorted by average posterior across games
  const allNumbers = new Set<number>()
  GAMES.forEach(g => bayesMap[g]?.forEach(b => allNumbers.add(b.number)))

  const byGame: Record<string, Record<number, BayesianNumber>> = {}
  GAMES.forEach(g => {
    byGame[g] = {}
    bayesMap[g]?.forEach(b => { byGame[g][b.number] = b })
  })

  const ranked = Array.from(allNumbers)
    .map(num => {
      const entries = GAMES.map(g => byGame[g][num]).filter(Boolean)
      const avgPosterior = entries.length
        ? entries.reduce((s, b) => s + b.posteriorMean, 0) / entries.length
        : 0
      return { num, avgPosterior }
    })
    .sort((a, b) => b.avgPosterior - a.avgPosterior)
    .slice(0, 15)

  // Numbers with positive lift in all 3 games
  const triplePositive = ranked
    .map(r => r.num)
    .filter(num => GAMES.every(g => (byGame[g][num]?.lift ?? -1) > 0))

  return (
    <div className="flex flex-col gap-6">
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="text-left text-xs text-zinc-400 dark:text-zinc-500 border-b border-zinc-100 dark:border-zinc-800">
              <th className="pb-2 pr-3">#</th>
              <th className="pb-2 pr-3">Número</th>
              <th className="pb-2 pr-3">🟣 Posterior</th>
              <th className="pb-2 pr-3">lift</th>
              <th className="pb-2 pr-3">🔵 Posterior</th>
              <th className="pb-2 pr-3">lift</th>
              <th className="pb-2 pr-3">🟢 Posterior</th>
              <th className="pb-2">lift</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map(({ num }, rank) => (
              <tr key={num} className="border-b border-zinc-50 dark:border-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                <td className="py-2 pr-3 text-zinc-400 text-xs">{rank + 1}</td>
                <td className="py-2 pr-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-white font-bold text-sm">
                    {num}
                  </span>
                </td>
                {GAMES.map(g => {
                  const b = byGame[g][num]
                  return (
                    <>
                      <td key={`${g}-post`} className="py-2 pr-3 text-zinc-700 dark:text-zinc-300 tabular-nums text-xs">
                        {b ? b.posteriorMean.toFixed(4) : '–'}
                      </td>
                      <td key={`${g}-lift`} className={cn(
                        'py-2 pr-3 tabular-nums text-xs font-semibold',
                        !b ? 'text-zinc-400'
                        : b.lift > 0 ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-500 dark:text-red-400',
                      )}>
                        {b ? `${b.lift > 0 ? '+' : ''}${b.lift.toFixed(2)}` : '–'}
                      </td>
                    </>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {triplePositive.length > 0 && (
        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-4">
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300 mb-2">
            Números con lift positivo en los 3 juegos
          </p>
          <div className="flex flex-wrap gap-2">
            {triplePositive.map(num => (
              <span
                key={num}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-sm"
              >
                {num}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── BacktestComparison ────────────────────────────────────────────────────────

function BacktestComparison({
  backtestMap,
}: {
  backtestMap: Record<string, BacktestResult | undefined>
}) {
  const hasAny = GAMES.some(g => backtestMap[g] !== undefined)
  if (!hasAny) {
    return <p className="text-sm text-zinc-400 dark:text-zinc-500 py-4">Sin datos de backtest.</p>
  }

  const chartData = GAMES.map(g => {
    const b = backtestMap[g]
    return {
      name: GAME_LABEL[g],
      hitRate: b ? Math.round(b.hitRate * 10000) / 100 : 0,
      expected: b ? Math.round(b.expectedRandomRate * 10000) / 100 : 0,
      color: GAME_COLOR[g],
    }
  })

  return (
    <div className="flex flex-col gap-6">
      {/* Summary table */}
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-sm min-w-[480px]">
          <thead>
            <tr className="text-left text-xs text-zinc-400 dark:text-zinc-500 border-b border-zinc-100 dark:border-zinc-800">
              <th className="pb-2 pr-4">Juego</th>
              <th className="pb-2 pr-4">Números predichos</th>
              <th className="pb-2 pr-4">Hit rate</th>
              <th className="pb-2 pr-4">vs Aleatorio</th>
              <th className="pb-2">Aciertos prom.</th>
            </tr>
          </thead>
          <tbody>
            {GAMES.map(g => {
              const b = backtestMap[g]
              if (!b) return (
                <tr key={g} className="border-b border-zinc-50 dark:border-zinc-900">
                  <td className="py-3 pr-4 font-medium text-zinc-800 dark:text-zinc-200">
                    {GAME_ICON[g]} {GAME_LABEL[g]}
                  </td>
                  <td colSpan={4} className="py-3 text-xs text-zinc-400">Sin datos</td>
                </tr>
              )
              const hitPct = (b.hitRate * 100).toFixed(1)
              const randPct = (b.expectedRandomRate * 100).toFixed(1)
              const beats = b.hitRate > b.expectedRandomRate
              const diff = ((b.hitRate - b.expectedRandomRate) * 100).toFixed(1)
              return (
                <tr key={g} className="border-b border-zinc-50 dark:border-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                  <td className="py-3 pr-4 font-medium text-zinc-800 dark:text-zinc-200">
                    {GAME_ICON[g]} {GAME_LABEL[g]}
                  </td>
                  <td className="py-3 pr-4 text-xs text-zinc-600 dark:text-zinc-400">
                    {b.topK} números
                  </td>
                  <td className="py-3 pr-4">
                    <span className={cn(
                      'font-bold tabular-nums',
                      beats ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400',
                    )}>
                      {hitPct}%
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={cn(
                      'text-xs font-semibold tabular-nums',
                      beats ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400',
                    )}>
                      {beats ? '+' : ''}{diff}pp vs {randPct}%
                    </span>
                  </td>
                  <td className="py-3 text-zinc-600 dark:text-zinc-400 tabular-nums text-sm">
                    {b.avgMatches.toFixed(2)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Predicted numbers circles */}
      <div className="grid gap-4 sm:grid-cols-3">
        {GAMES.map(g => {
          const b = backtestMap[g]
          if (!b) return null
          return (
            <div key={g} className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                {GAME_ICON[g]} {GAME_LABEL[g]} — predichos
              </p>
              <div className="flex flex-wrap gap-1.5">
                {b.predictedNumbers.map(n => (
                  <span
                    key={n}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full font-bold text-xs text-white"
                    style={{ background: GAME_COLOR[g] }}
                  >
                    {n}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Bar chart */}
      <div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
          Hit rate vs tasa aleatoria esperada por juego
        </p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} />
            <Tooltip formatter={(v: unknown) => [`${Number(v).toFixed(2)}%`]} />
            <Legend />
            <Bar dataKey="hitRate" name="Hit rate" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
            <Bar dataKey="expected" name="Aleatorio" fill="#d1d5db" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ── ChiSquareComparison ───────────────────────────────────────────────────────

function ChiSquareComparison({
  chiMap,
}: {
  chiMap: Record<string, ChiSquareResult | undefined>
}) {
  const hasAny = GAMES.some(g => chiMap[g] !== undefined)
  if (!hasAny) {
    return <p className="text-sm text-zinc-400 dark:text-zinc-500 py-4">Sin datos de chi-cuadrado.</p>
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-sm min-w-[420px]">
          <thead>
            <tr className="text-left text-xs text-zinc-400 dark:text-zinc-500 border-b border-zinc-100 dark:border-zinc-800">
              <th className="pb-2 pr-4">Juego</th>
              <th className="pb-2 pr-4">χ²</th>
              <th className="pb-2 pr-4">gl</th>
              <th className="pb-2 pr-4">p-valor</th>
              <th className="pb-2">Resultado</th>
            </tr>
          </thead>
          <tbody>
            {GAMES.map(g => {
              const c = chiMap[g]
              if (!c) return (
                <tr key={g} className="border-b border-zinc-50 dark:border-zinc-900">
                  <td className="py-3 pr-4 font-medium text-zinc-800 dark:text-zinc-200">
                    {GAME_ICON[g]} {GAME_LABEL[g]}
                  </td>
                  <td colSpan={4} className="py-3 text-xs text-zinc-400">Sin datos</td>
                </tr>
              )
              const uniform = c.pValue > 0.05
              return (
                <tr key={g} className="border-b border-zinc-50 dark:border-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                  <td className="py-3 pr-4 font-medium text-zinc-800 dark:text-zinc-200">
                    {GAME_ICON[g]} {GAME_LABEL[g]}
                  </td>
                  <td className="py-3 pr-4 tabular-nums text-zinc-700 dark:text-zinc-300">
                    {c.chiSquare.toFixed(2)}
                  </td>
                  <td className="py-3 pr-4 tabular-nums text-zinc-600 dark:text-zinc-400">
                    {c.degreesOfFreedom}
                  </td>
                  <td className="py-3 pr-4 tabular-nums text-zinc-600 dark:text-zinc-400">
                    {c.pValue < 0.0001 ? '<0.0001' : c.pValue.toFixed(4)}
                  </td>
                  <td className="py-3">
                    <Badge
                      variant="secondary"
                      className={cn(
                        'font-medium',
                        uniform
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
                      )}
                    >
                      {uniform ? 'Uniforme' : 'No uniforme'}
                    </Badge>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Card className="border-dashed">
        <CardContent className="pt-5">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            <b className="text-zinc-600 dark:text-zinc-300">Prueba chi-cuadrado de uniformidad:</b>{' '}
            Contrasta si los números del 1 al 56 aparecen con la misma frecuencia esperada.
            Un <em>p-valor &gt; 0.05</em> indica que no hay evidencia estadística de sesgo
            (la distribución es compatible con la uniformidad). Un valor bajo sugiere que
            algunos números aparecen significativamente más o menos que lo esperado por azar.
            Los grados de libertad (gl) corresponden al número de valores posibles menos uno (55).
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

// ── ArimaComparison ───────────────────────────────────────────────────────────

function ArimaComparison({
  arimaForecasts,
  arimaReady,
}: {
  arimaForecasts: Record<string, Record<number, number>>
  arimaReady: boolean
}) {
  if (!arimaReady) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-300 border-t-violet-600" />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Calculando pronóstico ARIMA para los 3 juegos…
        </p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          Entrenando modelos AR(1) para cada número en 6 ventanas temporales
        </p>
      </div>
    )
  }

  // Per-game top-10 by forecast value
  const perGameTop10 = useMemo(() => {
    return Object.fromEntries(
      GAMES.map(g => {
        const forecasts = arimaForecasts[g] ?? {}
        const ranked = Array.from({ length: 56 }, (_, i) => i + 1)
          .map(n => ({ n, v: forecasts[n] ?? 0 }))
          .sort((a, b) => b.v - a.v)
          .slice(0, 10)
        return [g, ranked]
      }),
    )
  }, [arimaForecasts])

  // Combined top-6 balanced (3 odd + 3 even) by average forecast
  const combinedTop6 = useMemo(() => {
    const avgForecast: Record<number, number> = {}
    Array.from({ length: 56 }, (_, i) => i + 1).forEach(num => {
      const vals = GAMES.map(g => arimaForecasts[g]?.[num] ?? 0)
      avgForecast[num] = vals.reduce((a, b) => a + b, 0) / GAMES.length
    })
    const ranked = Array.from({ length: 56 }, (_, i) => i + 1)
      .sort((a, b) => (avgForecast[b] ?? 0) - (avgForecast[a] ?? 0))
    const odd  = ranked.filter(n => n % 2 !== 0).slice(0, 3)
    const even = ranked.filter(n => n % 2 === 0).slice(0, 3)
    return { numbers: [...odd, ...even].sort((a, b) => a - b), avgForecast }
  }, [arimaForecasts])

  // Bar chart data: top-10 per game
  const barChartData = useMemo(() => {
    return Array.from({ length: 10 }, (_, i) => {
      const entry: Record<string, number | string> = { rank: `#${i + 1}` }
      GAMES.forEach(g => {
        const item = perGameTop10[g]?.[i]
        if (item) {
          entry[`${g}_num`] = item.n
          entry[g] = Math.max(item.v, 0)
        }
      })
      return entry
    })
  }, [perGameTop10])

  const maxForecast = Math.max(
    ...GAMES.flatMap(g => Object.values(arimaForecasts[g] ?? {}).filter(v => v > 0)),
    0.01,
  )

  return (
    <div className="flex flex-col gap-6">

      {/* Per-game top-10 in 3 columns */}
      <div className="grid gap-4 sm:grid-cols-3">
        {GAMES.map(g => (
          <div key={g} className="flex flex-col gap-1.5">
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              {GAME_ICON[g]} {GAME_LABEL[g]}
            </p>
            {(perGameTop10[g] ?? []).map(({ n, v }, rank) => (
              <div key={n} className="flex items-center gap-2 py-1 border-b border-zinc-50 dark:border-zinc-800/60 last:border-0">
                <span className="w-4 text-right text-[10px] text-zinc-400 shrink-0">{rank + 1}</span>
                <span
                  className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full font-bold text-sm text-white"
                  style={{ background: GAME_COLOR[g] }}
                >
                  {n}
                </span>
                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className="h-1.5 rounded-full"
                      style={{
                        width: `${(Math.max(v, 0) / maxForecast) * 100}%`,
                        background: GAME_COLOR[g],
                      }}
                    />
                  </div>
                </div>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 tabular-nums shrink-0">
                  {v.toFixed(3)}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Combined top-6 */}
      <div className="rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 p-4">
        <p className="text-sm font-semibold text-violet-800 dark:text-violet-300 mb-3">
          Combinación ARIMA — Top-6 promedio (3 impares + 3 pares)
        </p>
        <div className="flex flex-wrap gap-3">
          {combinedTop6.numbers.map(n => {
            const avg = combinedTop6.avgForecast[n] ?? 0
            const norm = avg / maxForecast
            return (
              <div key={n} className="flex flex-col items-center gap-1">
                <span
                  className="inline-flex h-12 w-12 items-center justify-center rounded-full font-bold text-lg text-white"
                  style={{
                    background: norm > 0.75 ? '#7c3aed' : norm > 0.5 ? '#8b5cf6' : '#a78bfa',
                  }}
                >
                  {n}
                </span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                  {avg.toFixed(3)}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Bar chart of top-10 forecast values per game */}
      <div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
          Pronóstico ARIMA — Top 10 por juego (valor de frecuencia predicha)
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={barChartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="rank" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => v.toFixed(2)} />
            <Tooltip
              formatter={(v: unknown, name: unknown) => [Number(v).toFixed(4), GAME_LABEL[String(name)] ?? String(name)]}
            />
            <Legend formatter={name => GAME_LABEL[name] ?? name} />
            {GAMES.map(g => (
              <Bar key={g} dataKey={g} name={g} fill={GAME_COLOR[g]} radius={[3, 3, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Methodology note */}
      <div className="rounded-lg border border-dashed border-zinc-200 dark:border-zinc-700 p-3">
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
          <b className="text-zinc-600 dark:text-zinc-300">Tendencia lineal — 3 períodos:</b>{' '}
          Para cada número se calculan las frecuencias en tres períodos consecutivos:
          sorteos 101–300 (antiguo), 51–100 (intermedio) y 1–50 (reciente).
          El pronóstico es la extrapolación lineal por mínimos cuadrados:{' '}
          <em>forecast = reciente + (reciente − antiguo) / 2</em>.
          Un valor alto indica que la frecuencia del número ha aumentado en los sorteos más recientes.
        </p>
      </div>

    </div>
  )
}

// ── ComparativeSuggestions ────────────────────────────────────────────────────

function ComparativeSuggestions({
  rankedScores,
  bayesMap,
  balMap,
  sumMap,
  chiMap,
  backtestMap,
  pairsMap,
  arimaNumbers,
}: {
  rankedScores:  NumberScore[]
  bayesMap:      Record<string, BayesianNumber[] | undefined>
  balMap:        Record<string, BalanceAnalysis | undefined>
  sumMap:        Record<string, SumDistribution | undefined>
  chiMap:        Record<string, ChiSquareResult | undefined>
  backtestMap:   Record<string, BacktestResult | undefined>
  pairsMap:      Record<string, NumberPair[] | undefined>
  arimaNumbers?: number[]
}) {
  const bayesLookup = useMemo(() => {
    const lk: Record<string, Record<number, BayesianNumber>> = {}
    GAMES.forEach(g => {
      lk[g] = {}
      bayesMap[g]?.forEach(b => { lk[g][b.number] = b })
    })
    return lk
  }, [bayesMap])

  const pairCountMap = useMemo(() => {
    const cm: Record<number, number> = {}
    GAMES.forEach(g => {
      const nums = new Set<number>()
      pairsMap[g]?.slice(0, 5).forEach(p => { nums.add(p.number1); nums.add(p.number2) })
      nums.forEach(n => { cm[n] = (cm[n] ?? 0) + 1 })
    })
    return cm
  }, [pairsMap])

  const rankedEnhanced = useMemo(() => {
    const maxLift = Math.max(
      ...GAMES.flatMap(g => bayesMap[g]?.map(b => b.lift) ?? []).filter(l => l > 0),
      0.01,
    )
    return [...rankedScores]
      .map(s => {
        const bayesScores = GAMES.map(g => {
          const b = bayesLookup[g][s.number]
          return b ? Math.max(b.lift, 0) / maxLift : 0
        })
        const avgBayes    = bayesScores.reduce((a, x) => a + x, 0) / GAMES.length
        const consistency = s.gamesInTop10 / 3
        const pairScore   = (pairCountMap[s.number] ?? 0) / 3
        const enhanced    = s.consensusScore * 0.40 + avgBayes * 0.30 + consistency * 0.15 + pairScore * 0.15
        return { ...s, enhancedScore: enhanced, avgBayes }
      })
      .sort((a, b) => b.enhancedScore - a.enhancedScore)
  }, [rankedScores, bayesLookup, pairCountMap, bayesMap])

  const selectedNums = useMemo(() => pickBalanced(rankedEnhanced), [rankedEnhanced])

  const byEnhanced = useMemo(
    () => Object.fromEntries(rankedEnhanced.map(s => [s.number, s])),
    [rankedEnhanced],
  )

  const { total, inRange, sharedMin, sharedMax } = useMemo(() => {
    const t   = selectedNums.reduce((a, b) => a + b, 0)
    const opt = GAMES.map(g => sumMap[g]).filter(Boolean) as SumDistribution[]
    const mn  = opt.length ? Math.max(...opt.map(d => d.optimalMin)) : 0
    const mx  = opt.length ? Math.min(...opt.map(d => d.optimalMax)) : 999
    return { total: t, inRange: t >= mn && t <= mx, sharedMin: mn, sharedMax: mx }
  }, [selectedNums, sumMap])

  const avgBacktestLift = useMemo(() => {
    const games = GAMES.filter(g => backtestMap[g] !== undefined)
    if (!games.length) return 0
    return games.reduce((s, g) => {
      const b = backtestMap[g]!
      return s + (b.hitRate - b.expectedRandomRate)
    }, 0) / games.length
  }, [backtestMap])

  const allUniform = GAMES.every(g => (chiMap[g]?.pValue ?? 0) > 0.05)

  const oddCount  = selectedNums.filter(n => n % 2 !== 0).length
  const evenCount = selectedNums.length - oddCount
  const optOdd    = balMap['MELATE']?.optimalOddCount ?? 3
  const optEven   = balMap['MELATE']?.optimalEvenCount ?? 3

  // Analysis rows for convergence table
  const analysisRows = useMemo(() => {
    function balanced6(ranked: number[]): number[] {
      const odd  = ranked.filter(n => n % 2 !== 0)
      const even = ranked.filter(n => n % 2 === 0)
      return [...odd.slice(0, 3), ...even.slice(0, 3)].sort((a, b) => a - b)
    }

    const rows: { label: string; numbers: number[]; color: string }[] = []

    // 1. Selección maestra
    rows.push({ label: 'Selección Maestra', numbers: selectedNums, color: '#7c3aed' })

    // 2. Por salir — top por dueScore acumulado entre los 3 juegos
    const dueRanked = [...rankedScores]
      .map(s => ({
        num:      s.number,
        totalDue: s.details.reduce((acc, d) => acc + d.dueScore, 0),
      }))
      .sort((a, b) => b.totalDue - a.totalDue)
      .map(r => r.num)
    rows.push({ label: 'Por salir', numbers: balanced6(dueRanked), color: '#ef4444' })

    // 3. Consenso puro (due + trend)
    rows.push({ label: 'Consenso', numbers: pickBalanced([...rankedScores]), color: '#6366f1' })

    // 3. Bayesiano — top por posterior medio entre juegos
    const bayesRanked = Array.from({ length: 56 }, (_, i) => i + 1)
      .map(num => {
        const entries = GAMES.map(g => bayesLookup[g][num]).filter(Boolean)
        const avg = entries.length
          ? entries.reduce((s, b) => s + b.posteriorMean, 0) / entries.length
          : 0
        return { num, avg }
      })
      .sort((a, b) => b.avg - a.avg)
    rows.push({ label: 'Bayesiano', numbers: balanced6(bayesRanked.map(r => r.num)), color: '#0ea5e9' })

    // 4-6. Backtest por juego
    GAMES.forEach(g => {
      const b = backtestMap[g]
      if (b?.predictedNumbers?.length) {
        rows.push({
          label: `Backtest ${GAME_LABEL[g]}`,
          numbers: [...b.predictedNumbers].sort((a, b) => a - b),
          color: GAME_COLOR[g],
        })
      }
    })

    // 7. Co-ocurrencia — números más conectados en pares top-10
    const pairFreq: Record<number, number> = {}
    GAMES.forEach(g => {
      pairsMap[g]?.slice(0, 10).forEach(p => {
        pairFreq[p.number1] = (pairFreq[p.number1] ?? 0) + p.frequency
        pairFreq[p.number2] = (pairFreq[p.number2] ?? 0) + p.frequency
      })
    })
    const pairRanked = Object.entries(pairFreq)
      .map(([n, freq]) => ({ num: Number(n), freq }))
      .sort((a, b) => b.freq - a.freq)
      .map(r => r.num)
    rows.push({ label: 'Co-ocurrencia', numbers: balanced6(pairRanked), color: '#10b981' })

    // ARIMA row
    if (arimaNumbers?.length) {
      rows.push({ label: 'ARIMA', numbers: arimaNumbers, color: '#8b5cf6' })
    }

    return rows
  }, [selectedNums, rankedScores, bayesLookup, backtestMap, pairsMap, arimaNumbers])

  // Count how many analyses suggest each number
  const coincidenceMap = useMemo(() => {
    const cm: Record<number, number> = {}
    analysisRows.forEach(row => row.numbers.forEach(n => { cm[n] = (cm[n] ?? 0) + 1 }))
    return cm
  }, [analysisRows])

  // Three distinct conclusion combinations
  const conclusionCombos = useMemo(() => {
    function balanced6(ranked: number[], sumOpt: { min: number; max: number } | null): number[] {
      const odd  = ranked.filter(n => n % 2 !== 0)
      const even = ranked.filter(n => n % 2 === 0)
      const pick = [...odd.slice(0, 3), ...even.slice(0, 3)].sort((a, b) => a - b)
      if (!sumOpt) return pick
      // Adjust if sum is out of range: swap the worst candidate for the next best
      const sum = pick.reduce((a, b) => a + b, 0)
      if (sum >= sumOpt.min && sum <= sumOpt.max) return pick
      return pick // return as-is if no better option (kept simple)
    }

    const opt = GAMES.map(g => sumMap[g]).filter(Boolean) as SumDistribution[]
    const sumOpt = opt.length ? {
      min: Math.max(...opt.map(d => d.optimalMin)),
      max: Math.min(...opt.map(d => d.optimalMax)),
    } : null

    // Combo 1 — Alta convergencia: most analyses agree
    const byConvergence = Array.from({ length: 56 }, (_, i) => i + 1)
      .sort((a, b) => (coincidenceMap[b] ?? 0) - (coincidenceMap[a] ?? 0))
    const combo1 = balanced6(byConvergence, sumOpt)

    // Combo 2 — Bayesiano + Tendencia: recent momentum
    const maxLift = Math.max(
      ...GAMES.flatMap(g => bayesMap[g]?.map(b => b.lift) ?? []).filter(l => l > 0),
      0.01,
    )
    const maxTrend = Math.max(
      ...rankedScores.flatMap(s => s.details.map(d => Math.max(d.trend, 0))),
      0.01,
    )
    const bayesTrendRanked = Array.from({ length: 56 }, (_, i) => i + 1)
      .map(num => {
        const avgLift = GAMES.reduce((s, g) => {
          const b = bayesLookup[g][num]
          return s + (b ? Math.max(b.lift, 0) / maxLift : 0)
        }, 0) / GAMES.length
        const avgTrend = (rankedScores.find(s => s.number === num)
          ?.details.reduce((s, d) => s + Math.max(d.trend, 0) / maxTrend, 0) ?? 0) / GAMES.length
        return { num, score: avgLift * 0.6 + avgTrend * 0.4 }
      })
      .sort((a, b) => b.score - a.score)
      .map(r => r.num)
    const combo2 = balanced6(bayesTrendRanked, sumOpt)

    // Combo 3 — Due + Pares: historical debt weighted by pair network
    const maxDue  = Math.max(...rankedScores.map(s => s.consensusScore), 0.01)
    const maxPair = Math.max(...Object.values(analysisRows
      .find(r => r.label === 'Co-ocurrencia')
      ? (() => {
          const pf: Record<number, number> = {}
          GAMES.forEach(g => {
            pairsMap[g]?.slice(0, 10).forEach(p => {
              pf[p.number1] = (pf[p.number1] ?? 0) + p.frequency
              pf[p.number2] = (pf[p.number2] ?? 0) + p.frequency
            })
          })
          return pf
        })()
      : {}), 0.01)
    const pairFreqFull: Record<number, number> = {}
    GAMES.forEach(g => {
      pairsMap[g]?.slice(0, 10).forEach(p => {
        pairFreqFull[p.number1] = (pairFreqFull[p.number1] ?? 0) + p.frequency
        pairFreqFull[p.number2] = (pairFreqFull[p.number2] ?? 0) + p.frequency
      })
    })
    const duePairsRanked = rankedScores
      .map(s => ({
        num: s.number,
        score: (s.consensusScore / maxDue) * 0.65 +
               ((pairFreqFull[s.number] ?? 0) / maxPair) * 0.35,
      }))
      .sort((a, b) => b.score - a.score)
      .map(r => r.num)
    const combo3 = balanced6(duePairsRanked, sumOpt)

    // Combo 4 — Por salir · Consistencia multi-juego
    const maxTotalDue = Math.max(
      ...rankedScores.map(s => s.details.reduce((acc, d) => acc + d.dueScore, 0)),
      0.01,
    )
    const dueConsistencyRanked = rankedScores
      .map(s => ({
        num: s.number,
        score: (s.details.reduce((acc, d) => acc + d.dueScore, 0) / maxTotalDue) * 0.55 +
               (s.gamesInTop10 / 3) * 0.45,
      }))
      .sort((a, b) => b.score - a.score)
      .map(r => r.num)
    const combo4 = balanced6(dueConsistencyRanked, sumOpt)

    // Combo 5 — Backtest + Posterior: números predichos por backtest con mayor respaldo bayesiano
    const backtestCount: Record<number, number> = {}
    GAMES.forEach(g => {
      backtestMap[g]?.predictedNumbers?.forEach(n => {
        backtestCount[n] = (backtestCount[n] ?? 0) + 1
      })
    })
    const maxPost = Math.max(
      ...GAMES.flatMap(g => bayesMap[g]?.map(b => b.posteriorMean) ?? []),
      0.01,
    )
    const backtestBayesRanked = Array.from({ length: 56 }, (_, i) => i + 1)
      .map(num => {
        const btScore   = (backtestCount[num] ?? 0) / 3
        const avgPost   = GAMES.reduce((s, g) => {
          const b = bayesLookup[g][num]
          return s + (b ? b.posteriorMean / maxPost : 0)
        }, 0) / GAMES.length
        return { num, score: btScore * 0.55 + avgPost * 0.45 }
      })
      .sort((a, b) => b.score - a.score)
      .map(r => r.num)
    const combo5 = balanced6(backtestBayesRanked, sumOpt)

    return [
      {
        title: 'Convergencia Máxima',
        desc:  'Números respaldados por el mayor número de análisis',
        numbers: combo1,
        color: '#f59e0b',
      },
      {
        title: 'Momentum Reciente',
        desc:  'Lift bayesiano 60% + tendencia positiva 40%',
        numbers: combo2,
        color: '#0ea5e9',
      },
      {
        title: 'Deuda Histórica + Pares',
        desc:  'Due score 65% + red de co-ocurrencia 35%',
        numbers: combo3,
        color: '#7c3aed',
      },
      {
        title: 'Por salir · Consistencia',
        desc:  'Due acumulado 55% + presencia en top-10 de los 3 juegos 45%',
        numbers: combo4,
        color: '#ef4444',
      },
      {
        title: 'Backtest + Posterior',
        desc:  'Predichos por backtest en varios juegos 55% + posterior bayesiano 45%',
        numbers: combo5,
        color: '#10b981',
      },
    ]
  }, [coincidenceMap, bayesMap, rankedScores, bayesLookup, sumMap, pairsMap, analysisRows, backtestMap])

  // Combinations derived from numbers repeated across the 5 conclusionCombos
  const derivedCombos = useMemo(() => {
    const hits: Record<number, number> = {}
    conclusionCombos.forEach(c => c.numbers.forEach(n => { hits[n] = (hits[n] ?? 0) + 1 }))

    // Pool: numbers appearing in 2+ combos, sorted by hit count then value
    const pool = Array.from({ length: 56 }, (_, i) => i + 1)
      .filter(n => (hits[n] ?? 0) >= 2)
      .sort((a, b) => (hits[b] ?? 0) - (hits[a] ?? 0))

    if (pool.length < 6) return []

    function pickBalance(ranked: number[], nOdd: number, nEven: number): number[] {
      const odd  = ranked.filter(n => n % 2 !== 0)
      const even = ranked.filter(n => n % 2 === 0)
      return [...odd.slice(0, nOdd), ...even.slice(0, nEven)].sort((a, b) => a - b)
    }

    const maxHit = Math.max(...pool.map(n => hits[n] ?? 0), 1)

    return [
      {
        title:   'Repetidos · 3I + 3P',
        desc:    'Números que coinciden en ≥2 combinaciones — balance estándar',
        numbers: pickBalance(pool, 3, 3),
        color:   '#dc2626',
        hits,
        maxHit,
      },
      {
        title:   'Repetidos · 4I + 2P',
        desc:    'Mismos candidatos repetidos priorizando impares',
        numbers: pickBalance(pool, 4, 2),
        color:   '#d97706',
        hits,
        maxHit,
      },
      {
        title:   'Repetidos · 2I + 4P',
        desc:    'Mismos candidatos repetidos priorizando pares',
        numbers: pickBalance(pool, 2, 4),
        color:   '#7c3aed',
        hits,
        maxHit,
      },
    ]
  }, [conclusionCombos])

  // Mega vote map combining ALL sources
  const megaVoteMap = useMemo(() => {
    const mv: Record<number, number> = {}
    analysisRows.forEach(r => r.numbers.forEach(n => { mv[n] = (mv[n] ?? 0) + 1 }))
    conclusionCombos.forEach(r => r.numbers.forEach(n => { mv[n] = (mv[n] ?? 0) + 1 }))
    derivedCombos.forEach(r => r.numbers.forEach(n => { mv[n] = (mv[n] ?? 0) + 1 }))
    return mv
  }, [analysisRows, conclusionCombos, derivedCombos])

  return (
    <div className="flex flex-col gap-6">

      {/* ── Master selection ── */}
      <Card>
        <CardHeader>
          <CardTitle>Selección Maestra Multi-Juego</CardTitle>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Fórmula integrada: consenso 40% · bayesiano 30% · consistencia entre juegos 15% · red de pares 15%
            — con restricción de balance {optOdd}I/{optEven}P
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-5">

            {/* Number balls */}
            <div className="flex flex-wrap gap-4 justify-center sm:justify-start">
              {selectedNums.map(n => {
                const s        = byEnhanced[n]
                const gamesTop = s?.gamesInTop10 ?? 0
                const bayesPos = GAMES.filter(g => (bayesLookup[g][n]?.lift ?? -1) > 0).length
                return (
                  <div key={n} className="flex flex-col items-center gap-1.5">
                    <span className={cn(
                      'inline-flex h-14 w-14 items-center justify-center rounded-full font-bold text-xl text-white shadow-sm',
                      gamesTop === 3 ? 'bg-amber-500' : gamesTop === 2 ? 'bg-violet-600' : 'bg-violet-400',
                    )}>
                      {n}
                    </span>
                    <div className="flex gap-0.5">
                      {GAMES.map(g => (
                        <span
                          key={g}
                          title={`${GAME_LABEL[g]}: due=${s?.details.find(d => d.game === g)?.dueScore.toFixed(2)}`}
                          className="w-2 h-2 rounded-full"
                          style={{
                            background: (s?.details.find(d => d.game === g)?.dueScore ?? 0) > 0.3
                              ? GAME_COLOR[g] : '#d1d5db',
                          }}
                        />
                      ))}
                    </div>
                    {bayesPos > 0 && (
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                        +{bayesPos}↑
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <Tip content={`Suma de los 6 números seleccionados. El rango óptimo histórico compartido entre los 3 juegos es ${sharedMin}–${sharedMax}. Las combinaciones dentro de ese rango han ganado con mayor frecuencia.`} className="block">
                <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/60 p-3 cursor-help">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Suma</p>
                  <p className={cn('text-lg font-bold', inRange ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500')}>
                    {total}
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {inRange ? `✓ ${sharedMin}–${sharedMax}` : `fuera de ${sharedMin}–${sharedMax}`}
                  </p>
                </div>
              </Tip>
              <Tip content="Distribución de impares y pares. Los sorteos históricos favorecen 3 impares + 3 pares. I = impar · P = par" className="block">
                <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/60 p-3 cursor-help">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Balance</p>
                  <p className="text-lg font-bold text-zinc-800 dark:text-zinc-100">{oddCount}I · {evenCount}P</p>
                  <p className="text-xs text-zinc-400 mt-0.5">impar · par</p>
                </div>
              </Tip>
              <Tip content="Cuántos de los 6 números elegidos están en el top-10 de pendientes en 2 o más juegos simultáneamente. Mayor valor = mayor consenso entre los 3 sorteos" className="block">
                <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/60 p-3 cursor-help">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Consenso ≥2 juegos</p>
                  <p className="text-lg font-bold text-violet-700 dark:text-violet-300">
                    {selectedNums.filter(n => (byEnhanced[n]?.gamesInTop10 ?? 0) >= 2).length}/6
                  </p>
                </div>
              </Tip>
              <Tip content="Cuántos de los 6 números tienen lift bayesiano positivo en al menos un juego. Lift positivo = el modelo bayesiano estima que este número es más probable que el promedio histórico" className="block">
                <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/60 p-3 cursor-help">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Lift bayesiano +</p>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {selectedNums.filter(n => GAMES.some(g => (bayesLookup[g][n]?.lift ?? -1) > 0)).length}/6
                  </p>
                </div>
              </Tip>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Confidence context ── */}
      <Card>
        <CardHeader>
          <CardTitle>Contexto de Confianza</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">

            <div className={cn(
              'rounded-lg border p-4',
              avgBacktestLift > 0
                ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20'
                : 'border-amber-200  dark:border-amber-800  bg-amber-50  dark:bg-amber-900/20',
            )}>
              <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-2">
                Rendimiento histórico (Backtest)
              </p>
              {GAMES.map(g => {
                const b = backtestMap[g]
                if (!b) return null
                const beats = b.hitRate > b.expectedRandomRate
                return (
                  <p key={g} className="text-xs flex justify-between py-0.5">
                    <span className="text-zinc-500 dark:text-zinc-400">{GAME_ICON[g]} {GAME_LABEL[g]}</span>
                    <span className={cn('font-semibold tabular-nums', beats ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400')}>
                      {(b.hitRate * 100).toFixed(1)}% vs {(b.expectedRandomRate * 100).toFixed(1)}%
                    </span>
                  </p>
                )
              })}
              <p className={cn('text-xs font-bold mt-2', avgBacktestLift > 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300')}>
                {avgBacktestLift > 0
                  ? `✓ Supera al azar en ${(avgBacktestLift * 100).toFixed(1)}pp promedio`
                  : `⚠ No supera consistentemente al azar`}
              </p>
            </div>

            <div className={cn(
              'rounded-lg border p-4',
              allUniform
                ? 'border-blue-200   dark:border-blue-800   bg-blue-50   dark:bg-blue-900/20'
                : 'border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20',
            )}>
              <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-2">
                Uniformidad estadística (Chi²)
              </p>
              {GAMES.map(g => {
                const c = chiMap[g]
                if (!c) return null
                const uniform = c.pValue > 0.05
                return (
                  <p key={g} className="text-xs flex justify-between items-center py-0.5">
                    <span className="text-zinc-500 dark:text-zinc-400">{GAME_ICON[g]} {GAME_LABEL[g]}</span>
                    <Badge
                      variant="secondary"
                      className={cn(
                        'text-[10px] h-5',
                        uniform
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : 'bg-amber-100   text-amber-800   dark:bg-amber-900/40   dark:text-amber-300',
                      )}
                    >
                      {uniform ? 'Uniforme' : 'No uniforme'} · p={c.pValue < 0.0001 ? '<0.0001' : c.pValue.toFixed(3)}
                    </Badge>
                  </p>
                )
              })}
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                {allUniform
                  ? 'Los 3 juegos son estadísticamente uniformes: los sesgos son pequeños.'
                  : 'Al menos un juego muestra sesgos estadísticos: algunos números tienen frecuencia anómala.'}
              </p>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* ── Per-number signal breakdown ── */}
      <Card>
        <CardHeader>
          <CardTitle>Señales por Número Seleccionado</CardTitle>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Detalle de señales activas en los 3 juegos para cada número elegido
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            {selectedNums.map(n => {
              const s = byEnhanced[n]
              return (
                <div key={n} className="rounded-lg border border-zinc-100 dark:border-zinc-800 p-3">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={cn(
                      'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-bold text-white text-sm',
                      (s?.gamesInTop10 ?? 0) === 3 ? 'bg-amber-500'
                      : (s?.gamesInTop10 ?? 0) === 2 ? 'bg-violet-600'
                      : 'bg-violet-400',
                    )}>
                      {n}
                    </span>
                    <div className="flex flex-1 flex-wrap gap-1.5">
                      {(s?.gamesInTop10 ?? 0) >= 2 && (
                        <Badge variant="secondary" className="bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300 text-[10px]">
                          Top-10 en {s!.gamesInTop10} juegos
                        </Badge>
                      )}
                      {(pairCountMap[n] ?? 0) > 0 && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 text-[10px]">
                          Pares frecuentes ×{pairCountMap[n]}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-zinc-400 shrink-0 tabular-nums">
                      {s?.enhancedScore.toFixed(3)}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {GAMES.map(g => {
                      const d   = s?.details.find(dd => dd.game === g)
                      const bay = bayesLookup[g][n]
                      return (
                        <div key={g} className="text-xs rounded-md bg-zinc-50 dark:bg-zinc-800/50 px-2 py-1.5">
                          <p className="font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                            {GAME_ICON[g]} {GAME_LABEL[g]}
                          </p>
                          <Tip content="DueScore = sorteos sin salir ÷ intervalo promedio histórico. ≥1.0 = lleva más tiempo del habitual sin aparecer. ≥1.5 = muy pendiente" side="bottom">
                            <p className="text-zinc-500 cursor-help w-full">
                              Due: <span className="font-medium text-zinc-700 dark:text-zinc-300">
                                {d ? d.dueScore.toFixed(2) : '–'}
                              </span>
                            </p>
                          </Tip>
                          <Tip content="Tendencia reciente: variación de frecuencia respecto al promedio histórico en los últimos 100 sorteos. ▲ = aparece más, ▼ = aparece menos" side="bottom">
                            <p className={cn('cursor-help w-full', (d?.trend ?? 0) > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-500')}>
                              Trend: <span className="font-medium">
                                {d ? `${d.trend > 0 ? '▲' : '▼'}${Math.abs(d.trend).toFixed(1)}%` : '–'}
                              </span>
                            </p>
                          </Tip>
                          {bay && (
                            <Tip content="Lift bayesiano = (posterior − prior) / prior. Positivo = el modelo estima mayor probabilidad que el promedio histórico tras actualizar con sorteos recientes" side="bottom">
                              <p className={cn('cursor-help w-full', bay.lift > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-400')}>
                                Lift: <span className="font-medium">
                                  {bay.lift > 0 ? '+' : ''}{bay.lift.toFixed(2)}
                                </span>
                              </p>
                            </Tip>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Convergence table ── */}
      <Card>
        <CardHeader>
          <CardTitle>Convergencia por Análisis</CardTitle>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Números sugeridos por cada método. Los que coinciden en más análisis aparecen
            resaltados: <span className="font-semibold text-amber-600 dark:text-amber-400">dorado ≥ 5</span>{' '}·{' '}
            <span className="font-semibold text-violet-600 dark:text-violet-400">violeta ≥ 3</span>{' '}·{' '}
            <span className="font-semibold text-blue-600 dark:text-blue-400">azul ≥ 2</span>
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            {analysisRows.map(row => (
              <div key={row.label} className="flex items-start gap-3 py-1.5 border-b border-zinc-50 dark:border-zinc-800/60 last:border-0">
                <span className="w-36 shrink-0 text-xs text-zinc-500 dark:text-zinc-400 pt-1 leading-tight">
                  {row.label}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {row.numbers.map(n => {
                    const count = coincidenceMap[n] ?? 0
                    return (
                      <span
                        key={n}
                        title={`${n} · aparece en ${count} análisis`}
                        className={cn(
                          'inline-flex h-8 w-8 items-center justify-center rounded-full font-bold text-xs text-white transition-all',
                          count >= 5
                            ? 'ring-2 ring-offset-1 ring-amber-400 dark:ring-offset-zinc-900'
                            : count >= 3
                            ? 'ring-2 ring-offset-1 ring-violet-400 dark:ring-offset-zinc-900'
                            : count >= 2
                            ? 'ring-2 ring-offset-1 ring-blue-400 dark:ring-offset-zinc-900'
                            : '',
                        )}
                        style={{ background: row.color }}
                      >
                        {n}
                      </span>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Three conclusion combos */}
          <div className="mt-5 flex flex-col gap-3">
            <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              Combinaciones sugeridas
            </p>
            {conclusionCombos.map(combo => {
              const sum      = combo.numbers.reduce((a, b) => a + b, 0)
              const opt      = GAMES.map(g => sumMap[g]).filter(Boolean) as SumDistribution[]
              const sMin     = opt.length ? Math.max(...opt.map(d => d.optimalMin)) : 0
              const sMax     = opt.length ? Math.min(...opt.map(d => d.optimalMax)) : 999
              const inR      = sum >= sMin && sum <= sMax
              const oddC     = combo.numbers.filter(n => n % 2 !== 0).length
              const evenC    = combo.numbers.length - oddC
              const totalR   = analysisRows.length

              return (
                <div
                  key={combo.title}
                  className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-3 flex flex-col gap-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                        {combo.title}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">{combo.desc}</p>
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end gap-0.5">
                      <Tip content={`Suma de los 6 números. Rango óptimo histórico: ${sMin}–${sMax}. ${inR ? '✓ Dentro del rango' : '⚠ Fuera del rango'}`}>
                        <p className={cn('text-sm font-bold tabular-nums cursor-help', inR ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500')}>
                          Σ {sum}
                        </p>
                      </Tip>
                      <Tip content="Distribución de impares y pares en la combinación. I = impar · P = par">
                        <p className="text-[10px] text-zinc-400 cursor-help">{oddC}I · {evenC}P</p>
                      </Tip>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {combo.numbers.map(n => {
                      const count = coincidenceMap[n] ?? 0
                      return (
                        <Tip
                          key={n}
                          content={`Nº${n} aparece en ${count} de ${totalR} métodos de análisis. ${count >= 5 ? 'Respaldo muy alto' : count >= 3 ? 'Respaldo alto' : count >= 2 ? 'Respaldo medio' : 'Respaldo bajo'}`}
                        >
                          <div className="flex flex-col items-center gap-0.5">
                            <span
                              className={cn(
                                'inline-flex h-10 w-10 items-center justify-center rounded-full font-bold text-sm text-white cursor-help',
                                count >= 5
                                  ? 'ring-2 ring-offset-1 ring-amber-400 dark:ring-offset-zinc-900'
                                  : count >= 3
                                  ? 'ring-2 ring-offset-1 ring-violet-400 dark:ring-offset-zinc-900'
                                  : count >= 2
                                  ? 'ring-2 ring-offset-1 ring-blue-400 dark:ring-offset-zinc-900'
                                  : '',
                              )}
                              style={{ background: combo.color }}
                            >
                              {n}
                            </span>
                            <span className="text-[10px] text-zinc-400 tabular-nums">
                              {count}/{totalR}
                            </span>
                          </div>
                        </Tip>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Derived combos from repeated numbers */}
          {derivedCombos.length > 0 && (
            <div className="mt-6 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 shrink-0 px-2">
                  Derivadas de números repetidos entre las 5 combinaciones
                </p>
                <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
              </div>

              {/* Pool summary */}
              {(() => {
                const hits: Record<number, number> = {}
                conclusionCombos.forEach(c => c.numbers.forEach(n => { hits[n] = (hits[n] ?? 0) + 1 }))
                const pool = Array.from({ length: 56 }, (_, i) => i + 1)
                  .filter(n => (hits[n] ?? 0) >= 2)
                  .sort((a, b) => (hits[b] ?? 0) - (hits[a] ?? 0))
                return (
                  <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/50 p-3">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                      Pool de <b className="text-zinc-700 dark:text-zinc-200">{pool.length} números</b> que
                      aparecen en 2 o más de las 5 combinaciones anteriores:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {pool.map(n => (
                        <div key={n} className="flex flex-col items-center gap-0.5">
                          <span
                            className={cn(
                              'inline-flex h-8 w-8 items-center justify-center rounded-full font-bold text-xs text-white',
                              (hits[n] ?? 0) >= 4 ? 'bg-amber-500'
                              : (hits[n] ?? 0) === 3 ? 'bg-violet-600'
                              : 'bg-zinc-400 dark:bg-zinc-600',
                            )}
                          >
                            {n}
                          </span>
                          <span className="text-[10px] text-zinc-400 tabular-nums">
                            {hits[n]}/5
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {derivedCombos.map(combo => {
                const sum   = combo.numbers.reduce((a, b) => a + b, 0)
                const opt   = GAMES.map(g => sumMap[g]).filter(Boolean) as SumDistribution[]
                const sMin  = opt.length ? Math.max(...opt.map(d => d.optimalMin)) : 0
                const sMax  = opt.length ? Math.min(...opt.map(d => d.optimalMax)) : 999
                const inR   = sum >= sMin && sum <= sMax
                const oddC  = combo.numbers.filter(n => n % 2 !== 0).length
                const evenC = combo.numbers.length - oddC

                return (
                  <div
                    key={combo.title}
                    className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-3 flex flex-col gap-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                          {combo.title}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">{combo.desc}</p>
                      </div>
                      <div className="text-right shrink-0 flex flex-col items-end gap-0.5">
                        <Tip content={`Suma de los 6 números. Rango óptimo histórico: ${sMin}–${sMax}. ${inR ? '✓ Dentro del rango' : '⚠ Fuera del rango'}`}>
                          <p className={cn('text-sm font-bold tabular-nums cursor-help', inR ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500')}>
                            Σ {sum}
                          </p>
                        </Tip>
                        <Tip content="Distribución de impares y pares en la combinación. I = impar · P = par">
                          <p className="text-[10px] text-zinc-400 cursor-help">{oddC}I · {evenC}P</p>
                        </Tip>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {combo.numbers.map(n => (
                        <Tip
                          key={n}
                          content={`Nº${n} aparece en ${combo.hits[n] ?? 0} de las 5 combinaciones principales. ${(combo.hits[n] ?? 0) >= 4 ? 'Respaldo muy alto' : (combo.hits[n] ?? 0) === 3 ? 'Respaldo alto' : 'Respaldo medio'}`}
                        >
                          <div className="flex flex-col items-center gap-0.5">
                            <span
                              className={cn(
                                'inline-flex h-10 w-10 items-center justify-center rounded-full font-bold text-sm text-white cursor-help',
                                (combo.hits[n] ?? 0) >= 4
                                  ? 'ring-2 ring-offset-1 ring-amber-400 dark:ring-offset-zinc-900'
                                  : (combo.hits[n] ?? 0) === 3
                                  ? 'ring-2 ring-offset-1 ring-violet-400 dark:ring-offset-zinc-900'
                                  : 'ring-2 ring-offset-1 ring-blue-300 dark:ring-offset-zinc-900',
                              )}
                              style={{ background: combo.color }}
                            >
                              {n}
                            </span>
                            <span className="text-[10px] text-zinc-400 tabular-nums">
                              {combo.hits[n] ?? 0}/5
                            </span>
                          </div>
                        </Tip>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Top-10 enhanced ranking ── */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 — Ranking Integrado</CardTitle>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Los 10 candidatos más fuertes según la fórmula combinada.
            Los resaltados forman la selección final.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-1.5">
            {rankedEnhanced.slice(0, 10).map((s, rank) => {
              const isSelected = selectedNums.includes(s.number)
              return (
                <div
                  key={s.number}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2',
                    isSelected
                      ? 'bg-violet-50 dark:bg-violet-900/20 ring-1 ring-violet-200 dark:ring-violet-800'
                      : 'bg-zinc-50 dark:bg-zinc-800/30',
                  )}
                >
                  <span className="text-xs text-zinc-400 w-4 shrink-0">{rank + 1}</span>
                  <span className={cn(
                    'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold text-xs text-white',
                    isSelected ? 'bg-violet-600' : 'bg-zinc-400 dark:bg-zinc-600',
                  )}>
                    {s.number}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={cn('h-2 rounded-full', isSelected ? 'bg-violet-500' : 'bg-zinc-300 dark:bg-zinc-600')}
                        style={{ width: `${(s.enhancedScore / (rankedEnhanced[0]?.enhancedScore ?? 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex gap-0.5 shrink-0">
                    {GAMES.map(g => (
                      <span
                        key={g}
                        className="w-1.5 h-5 rounded-sm"
                        style={{
                          background: (s.details.find(d => d.game === g)?.dueScore ?? 0) > 0.3
                            ? GAME_COLOR[g] : '#e5e7eb',
                        }}
                      />
                    ))}
                  </div>
                  {isSelected && (
                    <Badge variant="secondary" className="bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 text-[10px] shrink-0">
                      ✓
                    </Badge>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Mejores Propuestas ── */}
      {(() => {
        const totalSources = analysisRows.length + 5 + derivedCombos.length
        const topVoted = Array.from({ length: 56 }, (_, i) => i + 1)
          .sort((a, b) => (megaVoteMap[b] ?? 0) - (megaVoteMap[a] ?? 0))
        const maxVotes = megaVoteMap[topVoted[0]] ?? 1

        const opt  = GAMES.map(g => sumMap[g]).filter(Boolean) as SumDistribution[]
        const sMin = opt.length ? Math.max(...opt.map(d => d.optimalMin)) : 0
        const sMax = opt.length ? Math.min(...opt.map(d => d.optimalMax)) : 999
        // Absolute bounds across all draws (for the range bar)
        const absMin = opt.length ? Math.min(...opt.map(d => d.minSum)) : 21
        const absMax = opt.length ? Math.max(...opt.map(d => d.maxSum)) : 336
        const target = Math.round((sMin + sMax) / 2)

        // Exhaustive search over top-10 candidates per parity to maximise
        // megaVote total while keeping Σ inside [sMin, sMax].
        function combos(arr: number[], k: number): number[][] {
          if (k === 0) return [[]]
          if (arr.length < k) return []
          const [first, ...rest] = arr
          return [
            ...combos(rest, k - 1).map(c => [first, ...c]),
            ...combos(rest, k),
          ]
        }

        function pickMejorInRange(nOdd: number, nEven: number): { numbers: number[]; inRange: boolean } {
          const oddPool  = topVoted.filter(n => n % 2 !== 0).slice(0, 10)
          const evenPool = topVoted.filter(n => n % 2 === 0).slice(0, 10)

          let bestNums:     number[] = []
          let bestVotes     = -1
          let fallbackNums: number[] = []
          let fallbackDist  = Infinity

          for (const oc of combos(oddPool, nOdd)) {
            for (const ec of combos(evenPool, nEven)) {
              const combo = [...oc, ...ec]
              const sum   = combo.reduce((a, b) => a + b, 0)
              const votes = combo.reduce((a, n) => a + (megaVoteMap[n] ?? 0), 0)
              if (sum >= sMin && sum <= sMax) {
                if (votes > bestVotes) { bestVotes = votes; bestNums = combo }
              } else {
                const dist = Math.abs(sum - target)
                if (dist < fallbackDist) { fallbackDist = dist; fallbackNums = combo }
              }
            }
          }

          const inRange = bestNums.length > 0
          return {
            numbers: (inRange ? bestNums : fallbackNums).sort((a, b) => a - b),
            inRange,
          }
        }

        const propuestas = [
          { title: '3I + 3P', desc: 'Balance estándar — 3 impares + 3 pares', ...pickMejorInRange(3, 3) },
          { title: '4I + 2P', desc: 'Priorizando impares',                     ...pickMejorInRange(4, 2) },
          { title: '2I + 4P', desc: 'Priorizando pares',                       ...pickMejorInRange(2, 4) },
        ]

        return (
          <Card className="border-2 border-amber-300 dark:border-amber-700 bg-amber-50/30 dark:bg-amber-900/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                🏆 Mejores Propuestas
              </CardTitle>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Síntesis final — números respaldados por la mayor cantidad de análisis y combinaciones,
                con suma optimizada dentro del rango óptimo histórico
                (<b className="text-zinc-700 dark:text-zinc-200">Σ {sMin}–{sMax}</b>).
                Se consideraron <b className="text-zinc-700 dark:text-zinc-200">{totalSources} listas</b> en total
                ({analysisRows.length} métodos · 5 combinaciones · {derivedCombos.length} derivadas).
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                {propuestas.map(prop => {
                  const sum  = prop.numbers.reduce((a, b) => a + b, 0)
                  const oddC = prop.numbers.filter(n => n % 2 !== 0).length
                  const evnC = prop.numbers.length - oddC

                  // Position of sum in the absolute range [absMin, absMax] (0–100 %)
                  const totalSpan  = absMax - absMin || 1
                  const pctSum     = Math.max(0, Math.min(100, ((sum  - absMin) / totalSpan) * 100))
                  const pctOptL    = Math.max(0, Math.min(100, ((sMin - absMin) / totalSpan) * 100))
                  const pctOptW    = Math.max(0, Math.min(100 - pctOptL, ((sMax - sMin) / totalSpan) * 100))

                  return (
                    <div key={prop.title} className="rounded-xl border border-amber-200 dark:border-amber-800 bg-white dark:bg-zinc-900 p-4 flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100">{prop.title}</p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">{prop.desc}</p>
                        </div>
                        <div className="text-right shrink-0 flex flex-col items-end gap-0.5">
                          <Tip content={`Suma de los 6 números. Rango óptimo histórico: ${sMin}–${sMax}. ${prop.inRange ? '✓ Dentro del rango' : '⚠ Fuera del rango — no existe combinación en el top-10 que alcance el rango exacto'}`}>
                            <p className={cn('text-sm font-bold tabular-nums cursor-help',
                              prop.inRange ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500')}>
                              Σ {sum} {prop.inRange ? '✓' : '~'}
                            </p>
                          </Tip>
                          <p className="text-[10px] text-zinc-400">{oddC}I · {evnC}P</p>
                        </div>
                      </div>

                      {/* Σ range bar */}
                      <div className="flex flex-col gap-1">
                        <div className="relative h-3 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                          {/* optimal zone */}
                          <div
                            className="absolute top-0 h-full rounded-full bg-emerald-200 dark:bg-emerald-900/60"
                            style={{ left: `${pctOptL}%`, width: `${pctOptW}%` }}
                          />
                          {/* sum marker */}
                          <div
                            className={cn(
                              'absolute top-0 h-full w-1 rounded-full -translate-x-1/2',
                              prop.inRange ? 'bg-emerald-500' : 'bg-amber-400',
                            )}
                            style={{ left: `${pctSum}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[9px] text-zinc-400 tabular-nums">
                          <span>{absMin}</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">óptimo {sMin}–{sMax}</span>
                          <span>{absMax}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {prop.numbers.map(n => {
                          const votes = megaVoteMap[n] ?? 0
                          const norm  = votes / maxVotes
                          return (
                            <Tip key={n} content={`Nº${n} — respaldado por ${votes} de ${totalSources} listas`}>
                              <div className="flex flex-col items-center gap-0.5">
                                <span
                                  className={cn(
                                    'inline-flex h-12 w-12 items-center justify-center rounded-full font-bold text-lg text-white cursor-help shadow-sm',
                                    norm > 0.75 ? 'ring-4 ring-amber-400 ring-offset-2 dark:ring-offset-zinc-900'
                                    : norm > 0.5 ? 'ring-2 ring-violet-400 ring-offset-1 dark:ring-offset-zinc-900'
                                    : '',
                                  )}
                                  style={{
                                    background: norm > 0.75 ? '#f59e0b' : norm > 0.5 ? '#7c3aed' : '#8b5cf6',
                                  }}
                                >
                                  {n}
                                </span>
                                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                                  {votes}/{totalSources}
                                </span>
                              </div>
                            </Tip>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )
      })()}

    </div>
  )
}

// ── CombinationGenerator ──────────────────────────────────────────────────────

interface GenWeights {
  due:       number
  bayes:     number
  arima:     number
  backtest:  number
  pairs:     number
  consensus: number
}

interface GeneratedCombo {
  numbers: number[]
  sum:     number
  inRange: boolean
  scores:  { due: number; bayes: number; arima: number; backtest: number; pairs: number; consensus: number }
}

const WEIGHT_LABELS: Record<keyof GenWeights, string> = {
  due: 'Por salir', bayes: 'Bayesiano', arima: 'ARIMA',
  backtest: 'Backtest', pairs: 'Co-ocurrencia', consensus: 'Consenso',
}
const WEIGHT_COLORS: Record<keyof GenWeights, string> = {
  due: '#f59e0b', bayes: '#8b5cf6', arima: '#ec4899',
  backtest: '#0ea5e9', pairs: '#10b981', consensus: '#7c3aed',
}

function CombinationGenerator({
  rankedScores, bayesMap, dueMap, backtestMap, pairsMap, sumMap, arimaForecasts, arimaReady,
}: {
  rankedScores:   NumberScore[]
  bayesMap:       Record<string, BayesianNumber[] | undefined>
  dueMap:         Record<string, DueNumber[]>
  backtestMap:    Record<string, BacktestResult | undefined>
  pairsMap:       Record<string, NumberPair[] | undefined>
  sumMap:         Record<string, SumDistribution | undefined>
  arimaForecasts: Record<string, Record<number, number>>
  arimaReady:     boolean
}) {
  const [weights, setWeights] = useState<GenWeights>({
    due: 70, bayes: 80, arima: 50, backtest: 65, pairs: 40, consensus: 75,
  })
  const [numCombos,   setNumCombos]   = useState(5)
  const [balance,     setBalance]     = useState<'3+3' | '4+2' | '2+4' | 'libre'>('3+3')
  const [sigmaStrict, setSigmaStrict] = useState(true)
  const [diversity,   setDiversity]   = useState(65)
  const [results,     setResults]     = useState<GeneratedCombo[]>([])
  const [generated,   setGenerated]   = useState(false)

  const opt = useMemo(() => {
    const arr = GAMES.map(g => sumMap[g]).filter(Boolean) as SumDistribution[]
    return {
      sMin:   arr.length ? Math.max(...arr.map(d => d.optimalMin)) : 0,
      sMax:   arr.length ? Math.min(...arr.map(d => d.optimalMax)) : 999,
      absMin: arr.length ? Math.min(...arr.map(d => d.minSum)) : 21,
      absMax: arr.length ? Math.max(...arr.map(d => d.maxSum)) : 336,
    }
  }, [sumMap])

  // Per-number normalized scores for each analysis (all values 0–1)
  const baseScores = useMemo(() => {
    const nums = Array.from({ length: 56 }, (_, i) => i + 1)

    const dueRaw: Record<number, number> = {}
    nums.forEach(n => {
      dueRaw[n] = GAMES.reduce((acc, g) => acc + (dueMap[g]?.find(d => d.number === n)?.dueScore ?? 0), 0) / GAMES.length
    })
    const maxDue = Math.max(...Object.values(dueRaw), 0.001)

    const bayesRaw: Record<number, number> = {}
    nums.forEach(n => {
      bayesRaw[n] = GAMES.map(g => Math.max(bayesMap[g]?.find(b => b.number === n)?.lift ?? 0, 0))
        .reduce((a, b) => a + b, 0) / GAMES.length
    })
    const maxBayes = Math.max(...Object.values(bayesRaw), 0.001)

    const arimaRaw: Record<number, number> = {}
    nums.forEach(n => {
      arimaRaw[n] = GAMES.map(g => arimaForecasts[g]?.[n] ?? 0).reduce((a, b) => a + b, 0) / GAMES.length
    })
    const maxArima = Math.max(...Object.values(arimaRaw), 0.001)

    const raw = nums.map(n => ({
      n,
      due:      dueRaw[n] / maxDue,
      bayes:    bayesRaw[n] / maxBayes,
      arima:    arimaRaw[n] / maxArima,
      backtest: GAMES.filter(g => backtestMap[g]?.predictedNumbers.includes(n)).length / GAMES.length,
      pairs:    GAMES.reduce((acc, g) => acc + (pairsMap[g]?.slice(0, 10).some(p => p.number1 === n || p.number2 === n) ? 1 : 0), 0) / GAMES.length,
      consensus: 0,
    }))

    return raw.map(s => {
      const idx = rankedScores.findIndex(r => r.number === s.n)
      return { ...s, consensus: idx >= 0 ? 1 - idx / (raw.length - 1) : 0 }
    })
  }, [rankedScores, bayesMap, dueMap, backtestMap, pairsMap, arimaForecasts])

  function generate() {
    const { sMin, sMax } = opt
    const totalW = Math.max(
      weights.due + weights.bayes + weights.arima + weights.backtest + weights.pairs + weights.consensus,
      1,
    )

    function wscore(s: typeof baseScores[0]): number {
      return (
        s.due      * weights.due +
        s.bayes    * weights.bayes +
        s.arima    * weights.arima +
        s.backtest * weights.backtest +
        s.pairs    * weights.pairs +
        s.consensus * weights.consensus
      ) / totalW
    }

    function combArr(arr: number[], k: number): number[][] {
      if (k === 0) return [[]]
      if (arr.length < k) return []
      const [first, ...rest] = arr
      return [...combArr(rest, k - 1).map(c => [first, ...c]), ...combArr(rest, k)]
    }

    const usage: Record<number, number> = {}
    const target = (sMin + sMax) / 2
    const divFactor = diversity / 100
    const combos: GeneratedCombo[] = []

    for (let iter = 0; iter < numCombos; iter++) {
      // Apply diversity penalty to already-used numbers
      const scoreMap: Record<number, number> = {}
      baseScores.forEach(s => {
        scoreMap[s.n] = wscore(s) * Math.pow(1 - divFactor * 0.4, Math.min(usage[s.n] ?? 0, 4))
      })
      const ranked = Array.from({ length: 56 }, (_, i) => i + 1)
        .sort((a, b) => (scoreMap[b] ?? 0) - (scoreMap[a] ?? 0))

      let bestCombo:    number[] | null = null
      let bestScore     = -1
      let fallbackCombo: number[] | null = null
      let fallbackDist  = Infinity

      const POOL = 12

      function search(pool: number[][]) {
        for (const combo of pool) {
          const sum = combo.reduce((a, b) => a + b, 0)
          const sc  = combo.reduce((a, n) => a + (scoreMap[n] ?? 0), 0)
          if (sum >= sMin && sum <= sMax) {
            if (sc > bestScore) { bestScore = sc; bestCombo = combo }
          } else {
            const dist = Math.abs(sum - target)
            if (dist < fallbackDist) { fallbackDist = dist; fallbackCombo = combo }
          }
        }
      }

      function bestOf(pool: number[][]): number[] {
        return pool.reduce((best, c) => {
          const sc = c.reduce((a, n) => a + (scoreMap[n] ?? 0), 0)
          const bsc = best.reduce((a, n) => a + (scoreMap[n] ?? 0), 0)
          return sc > bsc ? c : best
        }, pool[0] ?? [])
      }

      if (balance === 'libre') {
        const pool = combArr(ranked.slice(0, 15), 6)
        if (sigmaStrict) { search(pool) } else { bestCombo = bestOf(pool) }
      } else {
        const nOdd  = balance === '4+2' ? 4 : balance === '2+4' ? 2 : 3
        const nEven = 6 - nOdd
        const odds  = ranked.filter(n => n % 2 !== 0).slice(0, POOL)
        const evens = ranked.filter(n => n % 2 === 0).slice(0, POOL)
        const pool  = combArr(odds, nOdd).flatMap(oc => combArr(evens, nEven).map(ec => [...oc, ...ec]))
        if (sigmaStrict) { search(pool) } else { bestCombo = bestOf(pool) }
      }

      const final = (sigmaStrict
        ? (bestCombo ?? fallbackCombo ?? ranked.slice(0, 6))
        : (bestCombo ?? ranked.slice(0, 6))
      ).sort((a, b) => a - b)

      final.forEach(n => { usage[n] = (usage[n] ?? 0) + 1 })

      const avgS = (key: keyof GenWeights) =>
        final.reduce((a, n) => a + (baseScores.find(s => s.n === n)?.[key] ?? 0), 0) / final.length

      const sum = final.reduce((a, b) => a + b, 0)
      combos.push({
        numbers: final,
        sum,
        inRange: sum >= sMin && sum <= sMax,
        scores: {
          due:       avgS('due'),
          bayes:     avgS('bayes'),
          arima:     avgS('arima'),
          backtest:  avgS('backtest'),
          pairs:     avgS('pairs'),
          consensus: avgS('consensus'),
        },
      })
    }

    setResults(combos)
    setGenerated(true)
  }

  const { sMin, sMax, absMin, absMax } = opt

  return (
    <div className="flex flex-col gap-6">

      {/* ── Config card ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">⚙️ Parámetros de Generación</CardTitle>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Ajusta el peso de cada análisis para orientar la selección de números.
            La suma (Σ) óptima compartida entre los 3 juegos es{' '}
            <b className="text-zinc-700 dark:text-zinc-200">{sMin}–{sMax}</b>.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-5">

            {/* Weight sliders */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 mb-3">
                Peso por análisis
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {(Object.keys(weights) as (keyof GenWeights)[]).map(key => (
                  <div key={key} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-zinc-600 dark:text-zinc-400">
                        {WEIGHT_LABELS[key]}
                        {key === 'arima' && !arimaReady && (
                          <span className="ml-1 text-[9px] text-zinc-400">(calculando…)</span>
                        )}
                      </label>
                      <span className="text-xs font-bold tabular-nums" style={{ color: WEIGHT_COLORS[key] }}>
                        {weights[key]}%
                      </span>
                    </div>
                    <input
                      type="range" min={0} max={100} step={5}
                      value={weights[key]}
                      disabled={key === 'arima' && !arimaReady}
                      onChange={e => setWeights(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                      className="w-full h-1.5 accent-violet-600"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Settings row */}
            <div className="flex flex-wrap gap-4 items-end border-t border-zinc-100 dark:border-zinc-800 pt-4">

              {/* Num combos */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-500 dark:text-zinc-400">Combinaciones</label>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setNumCombos(v => Math.max(1, v - 1))}
                    className="w-7 h-7 rounded-md border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-bold flex items-center justify-center"
                  >−</button>
                  <span className="w-8 text-center font-bold text-zinc-800 dark:text-zinc-200 tabular-nums text-sm">
                    {numCombos}
                  </span>
                  <button
                    onClick={() => setNumCombos(v => Math.min(10, v + 1))}
                    className="w-7 h-7 rounded-md border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-bold flex items-center justify-center"
                  >+</button>
                </div>
              </div>

              {/* Balance */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-500 dark:text-zinc-400">Balance I/P</label>
                <div className="flex gap-1">
                  {(['3+3', '4+2', '2+4', 'libre'] as const).map(b => (
                    <button
                      key={b}
                      onClick={() => setBalance(b)}
                      className={cn(
                        'px-2.5 py-1 rounded-md text-xs font-medium border transition-colors',
                        balance === b
                          ? 'bg-violet-600 text-white border-violet-600'
                          : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800',
                      )}
                    >
                      {b === 'libre' ? 'Libre' : b}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sigma mode */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-500 dark:text-zinc-400">Σ Rango</label>
                <div className="flex gap-1">
                  {([true, false] as const).map(strict => (
                    <button
                      key={String(strict)}
                      onClick={() => setSigmaStrict(strict)}
                      className={cn(
                        'px-2.5 py-1 rounded-md text-xs font-medium border transition-colors',
                        sigmaStrict === strict
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800',
                      )}
                    >
                      {strict ? `Óptimo ${sMin}–${sMax}` : 'Flexible'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Diversity */}
              <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
                <Tip
                  content="Penaliza números que ya aparecieron en combinaciones anteriores, forzando mayor variedad entre combinaciones."
                  side="top"
                >
                  <div className="flex items-center justify-between w-full cursor-help">
                    <label className="text-xs text-zinc-500 dark:text-zinc-400">Diversidad</label>
                    <span className="text-xs font-bold tabular-nums text-violet-600">{diversity}%</span>
                  </div>
                </Tip>
                <input
                  type="range" min={0} max={100} step={5}
                  value={diversity}
                  onChange={e => setDiversity(Number(e.target.value))}
                  className="w-full h-1.5 accent-violet-600"
                />
              </div>

            </div>

            {/* Generate button */}
            <button
              onClick={generate}
              className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white font-bold text-sm transition-colors"
            >
              🎲 Generar {numCombos} combinación{numCombos !== 1 ? 'es' : ''}
            </button>

          </div>
        </CardContent>
      </Card>

      {/* ── Results ── */}
      {generated && results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-violet-800 dark:text-violet-300">🎯 Combinaciones Generadas</CardTitle>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Rango Σ óptimo: <b className="text-zinc-700 dark:text-zinc-200">{sMin}–{sMax}</b> ·
              Verde = impares · Azul = pares · Las barras muestran el aporte de cada análisis.
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              {results.map((combo, idx) => {
                const totalSpan = absMax - absMin || 1
                const pctSum  = Math.max(0, Math.min(100, ((combo.sum  - absMin) / totalSpan) * 100))
                const pctOptL = Math.max(0, Math.min(100, ((sMin - absMin) / totalSpan) * 100))
                const pctOptW = Math.max(0, Math.min(100 - pctOptL, ((sMax - sMin) / totalSpan) * 100))

                return (
                  <div
                    key={idx}
                    className={cn(
                      'rounded-xl border p-4 flex flex-col gap-3',
                      combo.inRange
                        ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-900/10'
                        : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900',
                    )}
                  >
                    {/* Header row */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 w-5 shrink-0">
                        #{idx + 1}
                      </span>
                      <div className="flex flex-wrap gap-1.5 flex-1">
                        {combo.numbers.map(n => (
                          <span
                            key={n}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full font-bold text-base text-white shadow-sm"
                            style={{ background: n % 2 !== 0 ? '#7c3aed' : '#0ea5e9' }}
                          >
                            {n}
                          </span>
                        ))}
                      </div>
                      <div className="flex flex-col items-end gap-0.5 shrink-0">
                        <Tip content={`Suma de los 6 números. Rango óptimo: ${sMin}–${sMax}. ${combo.inRange ? '✓ Dentro del rango' : '⚠ Fuera del rango'}`}>
                          <span className={cn(
                            'text-sm font-bold tabular-nums cursor-help',
                            combo.inRange ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500',
                          )}>
                            Σ {combo.sum} {combo.inRange ? '✓' : '~'}
                          </span>
                        </Tip>
                        <button
                          onClick={() => navigator.clipboard?.writeText(combo.numbers.join(' - '))}
                          className="text-[10px] text-zinc-400 hover:text-violet-500 transition-colors"
                        >
                          📋 copiar
                        </button>
                      </div>
                    </div>

                    {/* Σ range bar */}
                    <div className="flex flex-col gap-0.5">
                      <div className="relative h-2.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                        <div
                          className="absolute top-0 h-full rounded-full bg-emerald-200 dark:bg-emerald-900/60"
                          style={{ left: `${pctOptL}%`, width: `${pctOptW}%` }}
                        />
                        <div
                          className={cn(
                            'absolute top-0 h-full w-1 rounded-full -translate-x-1/2',
                            combo.inRange ? 'bg-emerald-500' : 'bg-amber-400',
                          )}
                          style={{ left: `${pctSum}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[9px] text-zinc-400 tabular-nums">
                        <span>{absMin}</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          óptimo {sMin}–{sMax}
                        </span>
                        <span>{absMax}</span>
                      </div>
                    </div>

                    {/* Per-analysis score breakdown */}
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                      {(Object.keys(combo.scores) as (keyof GenWeights)[]).map(key => {
                        const val  = combo.scores[key]
                        const wPct = weights[key]
                        return (
                          <Tip key={key} content={`${WEIGHT_LABELS[key]}: score promedio ${(val * 100).toFixed(0)}% · peso ${wPct}%`}>
                            <div className="flex flex-col items-center gap-1 cursor-help w-full">
                              <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                                <div
                                  className="h-1.5 rounded-full"
                                  style={{ width: `${val * 100}%`, background: WEIGHT_COLORS[key] }}
                                />
                              </div>
                              <span className="text-[9px] text-zinc-400 text-center leading-tight">
                                {WEIGHT_LABELS[key]}
                              </span>
                            </div>
                          </Tip>
                        )
                      })}
                    </div>

                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function ComparativePage() {
  // Core data — gates the whole page render
  const { data: dueMelate,     isLoading: l1 } = useDueNumbers('MELATE',     56)
  const { data: dueRevancha,   isLoading: l2 } = useDueNumbers('REVANCHA',   56)
  const { data: dueRevanchita, isLoading: l3 } = useDueNumbers('REVANCHITA', 56)

  const { data: wfMelate,      isLoading: l4 } = useWindowedFrequencies('MELATE',     100)
  const { data: wfRevancha,    isLoading: l5 } = useWindowedFrequencies('REVANCHA',   100)
  const { data: wfRevanchita,  isLoading: l6 } = useWindowedFrequencies('REVANCHITA', 100)

  // Trend windows — w=100 already loaded above; only w=50 and w=300 are new (6 extra calls).
  const { data: wf50Melate      } = useWindowedFrequencies('MELATE',       50)
  const { data: wf300Melate     } = useWindowedFrequencies('MELATE',      300)
  const { data: wf50Revancha    } = useWindowedFrequencies('REVANCHA',     50)
  const { data: wf300Revancha   } = useWindowedFrequencies('REVANCHA',    300)
  const { data: wf50Revanchita  } = useWindowedFrequencies('REVANCHITA',   50)
  const { data: wf300Revanchita } = useWindowedFrequencies('REVANCHITA',  300)

  // Linear trend forecast — synchronous, no external library.
  // For 3 evenly-spaced points [oldest, middle, recent], least-squares slope = (recent − oldest)/2,
  // so forecast = recent + slope. Equivalent to AR(1) extrapolation on a 3-point series.
  const arimaForecasts = useMemo(() => {
    if (
      !wf50Melate || !wfMelate || !wf300Melate ||
      !wf50Revancha || !wfRevancha || !wf300Revancha ||
      !wf50Revanchita || !wfRevanchita || !wf300Revanchita
    ) return {} as Record<string, Record<number, number>>

    const byGame: Record<string, Record<number, WindowedFrequency[]>> = {
      MELATE:     { 50: wf50Melate,     100: wfMelate,     300: wf300Melate },
      REVANCHA:   { 50: wf50Revancha,   100: wfRevancha,   300: wf300Revancha },
      REVANCHITA: { 50: wf50Revanchita, 100: wfRevanchita, 300: wf300Revanchita },
    }

    const result: Record<string, Record<number, number>> = {}
    for (const game of GAMES) {
      result[game] = {}
      const wnd = byGame[game]
      for (let num = 1; num <= 56; num++) {
        const f = (w: number) => wnd[w]?.find(wf => wf.number === num)?.frequency ?? 0
        const oldest = Math.max(f(300) - f(100), 0)  // draws 101-300
        const recent = Math.max(f(50), 0)             // draws 1-50
        const slope  = (recent - oldest) / 2
        result[game][num] = Math.max(recent + slope, 0)
      }
    }
    return result
  }, [
    wf50Melate, wfMelate, wf300Melate,
    wf50Revancha, wfRevancha, wf300Revancha,
    wf50Revanchita, wfRevanchita, wf300Revanchita,
  ])

  const arimaReady = Object.keys(arimaForecasts).length > 0

  // Distribucion tab data (loads independently)
  const { data: balMelate     } = useBalanceAnalysis('MELATE')
  const { data: balRevancha   } = useBalanceAnalysis('REVANCHA')
  const { data: balRevanchita } = useBalanceAnalysis('REVANCHITA')

  const { data: sumMelate     } = useSumDistribution('MELATE')
  const { data: sumRevancha   } = useSumDistribution('REVANCHA')
  const { data: sumRevanchita } = useSumDistribution('REVANCHITA')

  // Pares tab
  const { data: pairsMelate     } = usePairAnalysis('MELATE',     15)
  const { data: pairsRevancha   } = usePairAnalysis('REVANCHA',   15)
  const { data: pairsRevanchita } = usePairAnalysis('REVANCHITA', 15)

  // Chi-square tab
  const { data: chiMelate     } = useChiSquare('MELATE')
  const { data: chiRevancha   } = useChiSquare('REVANCHA')
  const { data: chiRevanchita } = useChiSquare('REVANCHITA')

  // Backtest tab
  const { data: btMelate     } = useBacktest('MELATE',     6, 100)
  const { data: btRevancha   } = useBacktest('REVANCHA',   6, 100)
  const { data: btRevanchita } = useBacktest('REVANCHITA', 6, 100)

  // Bayesian tab
  const { data: bayMelate     } = useBayesianAnalysis('MELATE',     50)
  const { data: bayRevancha   } = useBayesianAnalysis('REVANCHA',   50)
  const { data: bayRevanchita } = useBayesianAnalysis('REVANCHITA', 50)

  // Only core data blocks the spinner
  const loading = l1 || l2 || l3 || l4 || l5 || l6

  const dueMap: Record<string, DueNumber[]> = {
    MELATE:     dueMelate     ?? [],
    REVANCHA:   dueRevancha   ?? [],
    REVANCHITA: dueRevanchita ?? [],
  }
  const trendMap: Record<string, WindowedFrequency[]> = {
    MELATE:     wfMelate     ?? [],
    REVANCHA:   wfRevancha   ?? [],
    REVANCHITA: wfRevanchita ?? [],
  }
  const balMap: Record<string, BalanceAnalysis | undefined> = {
    MELATE:     balMelate,
    REVANCHA:   balRevancha,
    REVANCHITA: balRevanchita,
  }
  const sumMap: Record<string, SumDistribution | undefined> = {
    MELATE:     sumMelate,
    REVANCHA:   sumRevancha,
    REVANCHITA: sumRevanchita,
  }
  const pairsMap: Record<string, NumberPair[] | undefined> = {
    MELATE:     pairsMelate,
    REVANCHA:   pairsRevancha,
    REVANCHITA: pairsRevanchita,
  }
  const chiMap: Record<string, ChiSquareResult | undefined> = {
    MELATE:     chiMelate,
    REVANCHA:   chiRevancha,
    REVANCHITA: chiRevanchita,
  }
  const backtestMap: Record<string, BacktestResult | undefined> = {
    MELATE:     btMelate,
    REVANCHA:   btRevancha,
    REVANCHITA: btRevanchita,
  }
  const bayesMap: Record<string, BayesianNumber[] | undefined> = {
    MELATE:     bayMelate,
    REVANCHA:   bayRevancha,
    REVANCHITA: bayRevanchita,
  }

  const hasData = GAMES.every(g => dueMap[g].length > 0 && trendMap[g].length > 0)

  const scores = useMemo(
    () => hasData ? computeScores(dueMap, trendMap) : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hasData, dueMelate, dueRevancha, dueRevanchita, wfMelate, wfRevancha, wfRevanchita],
  )

  const rankedScores = useMemo(
    () => [...scores].sort((a, b) => b.consensusScore - a.consensusScore),
    [scores],
  )

  const combinedSuggestion = useMemo(
    () => rankedScores.length ? pickBalanced(rankedScores) : [],
    [rankedScores],
  )

  // Set of top-15 consensus numbers (for pair highlighting)
  const top15Set = useMemo(
    () => new Set(rankedScores.slice(0, 15).map(s => s.number)),
    [rankedScores],
  )

  // ARIMA top-6 balanced for ComparativeSuggestions
  const arimaTopNumbers = useMemo(() => {
    if (Object.keys(arimaForecasts).length === 0) return []
    const avgForecast: Record<number, number> = {}
    Array.from({ length: 56 }, (_, i) => i + 1).forEach(num => {
      const vals = GAMES.map(g => arimaForecasts[g]?.[num] ?? 0)
      avgForecast[num] = vals.reduce((a, b) => a + b, 0) / GAMES.length
    })
    const ranked = Array.from({ length: 56 }, (_, i) => i + 1)
      .sort((a, b) => (avgForecast[b] ?? 0) - (avgForecast[a] ?? 0))
    const odd  = ranked.filter(n => n % 2 !== 0).slice(0, 3)
    const even = ranked.filter(n => n % 2 === 0).slice(0, 3)
    return [...odd, ...even].sort((a, b) => a - b)
  }, [arimaForecasts])

  if (loading) return <PageSpinner />

  if (!hasData) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-zinc-500 dark:text-zinc-400 text-sm">
          Sin datos para el análisis comparativo.
        </p>
        <p className="text-zinc-400 dark:text-zinc-500 text-xs">
          Sincroniza Melate, Revancha y Revanchita desde cada página de juego.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          Análisis Comparativo
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          🟣 Melate · 🔵 Revancha · 🟢 Revanchita — rango 1–56, 6 números
        </p>
      </div>

      <Tabs defaultValue="consenso">
        <TabsList>
          <TabsTrigger value="consenso">Consenso</TabsTrigger>
          <TabsTrigger value="due">Por salir</TabsTrigger>
          <TabsTrigger value="distribucion">Distribución</TabsTrigger>
          <TabsTrigger value="pares">Pares</TabsTrigger>
          <TabsTrigger value="bayesiano">Bayesiano</TabsTrigger>
          <TabsTrigger value="backtest">Backtest</TabsTrigger>
          <TabsTrigger value="chisq">Chi²</TabsTrigger>
          <TabsTrigger value="arima">ARIMA</TabsTrigger>
          <TabsTrigger value="sugerencias">Sugerencias</TabsTrigger>
          <TabsTrigger value="generador">Generador</TabsTrigger>
        </TabsList>

        {/* ── Tab: Consenso ── */}
        <TabsContent value="consenso">
          <div className="flex flex-col gap-6">

            <Card>
              <CardHeader>
                <CardTitle>Mapa de Calor — Consenso por número</CardTitle>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Intensidad = score combinado de dueScore + tendencia reciente en los 3 juegos.
                  Los <span className="font-medium text-amber-500">6 primeros</span> llevan borde dorado.
                </p>
              </CardHeader>
              <CardContent>
                <ConsensusGrid scores={rankedScores} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sugerencia Combinada</CardTitle>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Top-6 por consenso con balance 3 impares + 3 pares · los puntos debajo de cada
                  número indican en qué juego tiene alta puntuación
                </p>
              </CardHeader>
              <CardContent>
                {combinedSuggestion.length > 0 && (
                  <CombinedSuggestion
                    numbers={combinedSuggestion}
                    scores={rankedScores}
                    sumDists={sumMap}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top 15 por Consenso — Detalle por juego</CardTitle>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Score = ponderación de dueScore (65%) + tendencia reciente positiva (35%) normalizada por juego.
                  Las barras de "Juegos" muestran cuántos de los 3 tienen este número en su top-10.
                </p>
              </CardHeader>
              <CardContent>
                <TopConsensusTable scores={rankedScores} />
              </CardContent>
            </Card>

          </div>
        </TabsContent>

        {/* ── Tab: Por salir ── */}
        <TabsContent value="due">
          <DueComparison dueMap={dueMap} />
        </TabsContent>

        {/* ── Tab: Distribución ── */}
        <TabsContent value="distribucion">
          <div className="flex flex-col gap-6">

            <Card>
              <CardHeader>
                <CardTitle>Distribución de Sumas — Los 3 juegos</CardTitle>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Porcentaje de sorteos históricos según la suma de los 6 números.
                  Los tres juegos usan el mismo rango 1–56, por lo que sus distribuciones deben ser similares.
                </p>
              </CardHeader>
              <CardContent>
                <SumOverlayChart sumDists={sumMap} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Balance Óptimo Comparado</CardTitle>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Combinación de par/impar y alto/bajo más frecuente en el histórico de cada juego.
                </p>
              </CardHeader>
              <CardContent>
                <BalanceComparison balances={balMap} />
              </CardContent>
            </Card>

          </div>
        </TabsContent>

        {/* ── Tab: Pares ── */}
        <TabsContent value="pares">
          <Card>
            <CardHeader>
              <CardTitle>Co-ocurrencia de Pares — Top 15 por juego</CardTitle>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Pares de números que han salido juntos con mayor frecuencia en el histórico.
                Los pares resaltados en <span className="font-medium text-amber-600">ámbar</span> tienen
                ambos números dentro del top-15 de consenso.
              </p>
            </CardHeader>
            <CardContent>
              <PairsComparison pairsMap={pairsMap} top15Numbers={top15Set} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Bayesiano ── */}
        <TabsContent value="bayesiano">
          <Card>
            <CardHeader>
              <CardTitle>Análisis Bayesiano Comparado</CardTitle>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Posterior medio actualizado con los sorteos recientes (ventana 50).
                El <em>lift</em> mide cuánto se aparta el posterior del prior uniforme:
                positivo = más probable que el promedio, negativo = menos probable.
                Top 15 ordenados por posterior promedio entre los 3 juegos.
              </p>
            </CardHeader>
            <CardContent>
              <BayesianComparison bayesMap={bayesMap} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Backtest ── */}
        <TabsContent value="backtest">
          <Card>
            <CardHeader>
              <CardTitle>Backtest de Hit Rate — Comparativa</CardTitle>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Evalúa si predecir los top-6 números por dueScore habría acertado más sorteos
                que una selección aleatoria, sobre los últimos 100 sorteos.
                Verde = supera la tasa aleatoria · Rojo = por debajo.
              </p>
            </CardHeader>
            <CardContent>
              <BacktestComparison backtestMap={backtestMap} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Chi² ── */}
        <TabsContent value="chisq">
          <Card>
            <CardHeader>
              <CardTitle>Prueba Chi-Cuadrado de Uniformidad</CardTitle>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Contrasta si la distribución histórica de cada número se ajusta a la
                uniformidad esperada (1/56 de probabilidad por sorteo).
              </p>
            </CardHeader>
            <CardContent>
              <ChiSquareComparison chiMap={chiMap} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: ARIMA ── */}
        <TabsContent value="arima">
          <Card>
            <CardHeader>
              <CardTitle>Tendencia — Frecuencia por período</CardTitle>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Extrapolación lineal sobre 3 períodos (sorteos 101–300 · 51–100 · 1–50).
                Números con mayor valor tienen frecuencia creciente en los sorteos más recientes.
              </p>
            </CardHeader>
            <CardContent>
              <ArimaComparison arimaForecasts={arimaForecasts} arimaReady={arimaReady} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Sugerencias ── */}
        <TabsContent value="sugerencias">
          <ComparativeSuggestions
            rankedScores={rankedScores}
            bayesMap={bayesMap}
            balMap={balMap}
            sumMap={sumMap}
            chiMap={chiMap}
            backtestMap={backtestMap}
            pairsMap={pairsMap}
            arimaNumbers={arimaTopNumbers}
          />
        </TabsContent>

        {/* ── Tab: Generador ── */}
        <TabsContent value="generador">
          <CombinationGenerator
            rankedScores={rankedScores}
            bayesMap={bayesMap}
            dueMap={dueMap}
            backtestMap={backtestMap}
            pairsMap={pairsMap}
            sumMap={sumMap}
            arimaForecasts={arimaForecasts}
            arimaReady={arimaReady}
          />
        </TabsContent>

      </Tabs>

      {/* Methodology note */}
      <Card className="border-dashed">
        <CardContent className="pt-5">
          <p className="text-xs text-zinc-400 dark:text-zinc-500 leading-relaxed">
            <b className="text-zinc-500 dark:text-zinc-400">Nota metodológica:</b>{' '}
            El consenso entre tres juegos independientes que comparten el mismo rango (1–56)
            aumenta la señal estadística. Un número que aparece como pendiente en Melate,
            Revancha <em>y</em> Revanchita tiene mayor evidencia de sesgo que si solo aparece en uno.
            Sin embargo, los sorteos son eventos independientes y ningún análisis estadístico
            garantiza resultados futuros.
          </p>
        </CardContent>
      </Card>

    </div>
  )
}
