import { useState, useMemo } from 'react'
import { useParams, Navigate, useSearchParams } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
  LineChart, Line, Legend,
} from 'recharts'
import { LOTTERY_TYPES, formatNumber, formatDate, formatPct, getLotteryMeta, cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import {
  useStatistics, useFrequencies, useHotNumbers, useColdNumbers,
  useDueNumbers, useWindowedFrequencies,
  useBalanceAnalysis, useSumDistribution, useSync,
  usePairAnalysis, useChiSquare, useBacktest, useBayesianAnalysis,
  useSavePrediction, usePositionAnalysis, useConsecutiveAnalysis, useCalendarFrequency,
} from '@/api/queries'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner, PageSpinner } from '@/components/ui/spinner'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import type { LotteryTypeId, NumberFrequency, DueNumber, WindowedFrequency, BalanceAnalysis, SumDistribution, NumberPair, ChiSquareResult, BayesianNumber, GeneratedCombo, PositionAnalysis, PositionStats, ConsecutiveAnalysis, CalendarFrequency } from '@/types/lottery'
import { SuggestedCombosCard, buildCombo } from '@/components/SuggestedCombosCard'
import type { SuggestedCombo } from '@/components/SuggestedCombosCard'
import { InfoTip } from '@/components/ui/info-tip'


function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
        <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{value}</p>
      </CardContent>
    </Card>
  )
}

function FrequencyRow({ nf, rank }: { nf: NumberFrequency; rank: number }) {
  return (
    <div className="flex items-center gap-2 py-2 text-sm border-b border-zinc-100 dark:border-zinc-800 last:border-0">
      <span className="w-5 text-right text-zinc-400 text-xs shrink-0">{rank}</span>
      <span className="w-8 h-8 flex items-center justify-center rounded-full bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300 font-bold text-sm shrink-0">
        {nf.number}
      </span>
      <div className="flex-1 min-w-0">
        <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-violet-500"
            style={{ width: `${Math.min(nf.percentage * 5, 100)}%` }}
          />
        </div>
      </div>
      <span className="w-14 text-right text-zinc-700 dark:text-zinc-300 font-medium shrink-0">
        {formatNumber(nf.frequency)}×
      </span>
      <span className="hidden sm:inline w-14 text-right text-zinc-400 dark:text-zinc-500 shrink-0">
        {formatPct(nf.percentage)}
      </span>
    </div>
  )
}

function DueNumberCard({ dn, rank }: { dn: DueNumber; rank: number }) {
  const pct   = Math.min((dn.dueScore / 2) * 100, 100)
  const level = dn.dueScore >= 1.5 ? 'hot' : dn.dueScore >= 1.0 ? 'warning' : 'secondary'
  const label = dn.dueScore >= 1.5 ? 'Muy pendiente' : dn.dueScore >= 1.0 ? 'Pendiente' : 'Normal'

  return (
    <div className="flex items-center gap-3 py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
      <span className="w-5 text-right text-zinc-400 text-xs shrink-0">{rank}</span>
      <span className="w-10 h-10 flex items-center justify-center rounded-full bg-violet-600 text-white font-bold text-base shrink-0">
        {dn.number}
      </span>
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Sale c/ <span className="font-bold">{dn.avgInterval.toFixed(1)}</span> sorteos
          </span>
          <Badge variant={level}>{label}</Badge>
        </div>
        <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${dn.dueScore >= 1.0 ? 'bg-red-500' : 'bg-violet-400'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex gap-3 text-xs text-zinc-500 dark:text-zinc-400">
          <span>Sin salir: <b className="text-zinc-700 dark:text-zinc-300">{dn.drawsSinceLast}</b></span>
          <span className="flex items-center gap-1">
            Score: <b className="text-zinc-700 dark:text-zinc-300">{dn.dueScore.toFixed(2)}</b>
            <InfoTip text="Due-score = sorteos sin salir ÷ intervalo promedio histórico. Un score > 1.0 indica que ya lleva más sorteos sin aparecer que su promedio." />
          </span>
          <span className="hidden sm:inline">Apariciones: <b className="text-zinc-700 dark:text-zinc-300">{formatNumber(dn.frequency)}</b></span>
        </div>
      </div>
    </div>
  )
}

// ── Tendencia (windowed frequency) ──────────────────────────────────────────

const WINDOW_OPTIONS = [50, 100, 200, 500] as const

function TrendRow({ wf }: { wf: WindowedFrequency }) {
  const up   = wf.trend > 0
  const down = wf.trend < 0
  return (
    <div className="flex items-center gap-2 py-2 text-sm border-b border-zinc-100 dark:border-zinc-800 last:border-0">
      <span className="w-8 h-8 flex items-center justify-center rounded-full bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300 font-bold text-sm shrink-0">
        {wf.number}
      </span>
      <div className="flex-1 min-w-0">
        <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
          <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.min(wf.percentage * 5, 100)}%` }} />
        </div>
      </div>
      <span className="w-12 text-right text-zinc-700 dark:text-zinc-300 font-medium shrink-0text-xs">
        {wf.frequency}×
      </span>
      <span className={`w-16 text-right text-xs font-semibold shrink-0 ${up ? 'text-emerald-600 dark:text-emerald-400' : down ? 'text-red-500 dark:text-red-400' : 'text-zinc-400'}`}>
        {up ? '▲' : down ? '▼' : '─'} {Math.abs(wf.trend).toFixed(1)}%
      </span>
    </div>
  )
}

const EVOLUTION_COLORS = ['#7c3aed', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444']

function WindowedFrequenciesTab({ typeId }: { typeId: LotteryTypeId }) {
  const [winSize, setWinSize] = useState<number>(100)
  const { data, isLoading } = useWindowedFrequencies(typeId, winSize)
  const { data: w50  } = useWindowedFrequencies(typeId, 50)
  const { data: w100 } = useWindowedFrequencies(typeId, 100)
  const { data: w200 } = useWindowedFrequencies(typeId, 200)
  const { data: w500 } = useWindowedFrequencies(typeId, 500)
  const saveMutation = useSavePrediction()
  const [savedKey] = useState<string | null>(null)

  const chartData = data?.map(wf => ({
    number: wf.number,
    frequency: wf.frequency,
    trend: wf.trend,
  })) ?? []

  // Top-5 numbers from the smallest available window, tracked across all windows
  const evolutionChart = useMemo(() => {
    const base = w50 ?? w100 ?? data
    if (!base) return null
    const top5 = [...base].sort((a, b) => b.frequency - a.frequency).slice(0, 5).map(wf => wf.number)
    const windows = [
      { label: '50s',  data: w50  },
      { label: '100s', data: w100 },
      { label: '200s', data: w200 },
      { label: '500s', data: w500 },
    ].filter(w => w.data)
    if (windows.length < 2) return null
    return {
      top5,
      rows: windows.map(w => {
        const row: Record<string, number | string> = { ventana: w.label }
        top5.forEach(n => {
          row[`Nº${n}`] = w.data!.find(wf => wf.number === n)?.frequency ?? 0
        })
        return row
      }),
    }
  }, [w50, w100, w200, w500, data])

  return (
    <div className="flex flex-col gap-4">
      {/* Window selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-zinc-500 dark:text-zinc-400">Ventana:</span>
        {WINDOW_OPTIONS.map(w => (
          <button
            key={w}
            onClick={() => setWinSize(w)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              winSize === w
                ? 'bg-violet-600 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
            }`}
          >
            {w} sorteos
          </button>
        ))}
      </div>

      {isLoading ? <PageSpinner /> : data && data.length > 0 ? (
        <>
          {/* ── Combinaciones sugeridas por tendencia ── */}
          {(() => {
            const meta = getLotteryMeta(typeId)
            const k    = meta.numbers
            const rising  = [...data].sort((a, b) => b.trend - a.trend).slice(0, k).map(d => d.number)
            const falling = [...data].sort((a, b) => a.trend - b.trend).slice(0, k).map(d => d.number)
            const balanced = [
              ...[...data].sort((a, b) => b.trend - a.trend).slice(0, Math.ceil(k / 2)).map(d => d.number),
              ...[...data].sort((a, b) => a.trend - b.trend).slice(0, Math.floor(k / 2)).map(d => d.number),
            ]

            const propuestas: { key: string; title: string; desc: string; color: string; combo: GeneratedCombo }[] = [
              { key: 'rising',   title: 'Momentum alcista',  desc: `Top ${k} en racha positiva — aparecen más que su promedio reciente`,   color: '#059669', combo: buildCombo(rising) },
              { key: 'falling',  title: 'Rebote bajista',    desc: `Top ${k} en racha negativa — podrían rebotar tras ausencia reciente`,   color: '#7c3aed', combo: buildCombo(falling) },
              { key: 'balanced', title: 'Mixta equilibrada', desc: `${Math.ceil(k/2)} alcistas + ${Math.floor(k/2)} bajistas`,              color: '#0284c7', combo: buildCombo(balanced) },
            ]

            return (
              <Card className="border-2 border-violet-200 dark:border-violet-800 bg-violet-50/30 dark:bg-violet-900/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-violet-800 dark:text-violet-300">
                    🎯 Combinaciones sugeridas por tendencia
                  </CardTitle>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Generadas a partir de las tendencias de la ventana de <b className="text-zinc-700 dark:text-zinc-200">{winSize} sorteos</b>. Guárdalas en Predicciones para analizarlas después.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-4">
                    {propuestas.map(({ key, title, desc, color, combo }) => (
                      <div key={key} className="rounded-xl border border-violet-100 dark:border-violet-900 bg-white dark:bg-zinc-900 p-4 flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100">{title}</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">{desc}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {savedKey === key
                              ? <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">✓ Guardada</span>
                              : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={saveMutation.isPending}
                                  onClick={() => {
                                    saveMutation.mutate(
                                      { label: `Tendencia ${winSize}s — ${title} (${typeId})`, latestDrawDate: null, combos: [combo], lotteryType: typeId },
                                      { onSuccess: () => toast.success('Combinación guardada'), onError: () => toast.error('Error al guardar') },
                                    )
                                  }}
                                >
                                  Guardar
                                </Button>
                              )
                            }
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-4">
                          {combo.numbers.map(n => (
                            <div key={n} className="flex flex-col items-center gap-1.5">
                              <span
                                className="inline-flex h-11 w-11 items-center justify-center rounded-full font-bold text-base text-white shadow-sm"
                                style={{ background: color }}
                              >
                                {n}
                              </span>
                            </div>
                          ))}
                          <div className="flex flex-col justify-center ml-auto">
                            <span className="text-sm font-bold tabular-nums text-zinc-700 dark:text-zinc-300">Σ {combo.sum}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })()}

          {/* Bar chart colored by trend */}
          <Card>
            <CardHeader>
              <CardTitle>Frecuencia en últimos {data[0]?.windowDrawCount ?? winSize} sorteos</CardTitle>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Barras <span className="text-emerald-600 font-medium">verdes</span> = aparece más que su promedio histórico ·
                <span className="text-red-500 font-medium"> rojas</span> = por debajo del promedio
              </p>
            </CardHeader>
            <CardContent className="px-2 sm:px-5">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <XAxis dataKey="number" tick={{ fontSize: 10 }} interval={Math.ceil(chartData.length / 15) - 1} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={((v: unknown, name: string) => {
                      if (name === 'frequency') return [v, 'Apariciones']
                      return [v, name]
                    }) as never}
                    labelFormatter={(l) => `Número ${l}`}
                  />
                  <Bar dataKey="frequency" radius={[3, 3, 0, 0]}>
                    {chartData.map((d) => (
                      <Cell
                        key={d.number}
                        fill={d.trend > 10 ? '#059669' : d.trend > 0 ? '#34d399' : d.trend < -10 ? '#ef4444' : d.trend < 0 ? '#fca5a5' : '#a78bfa'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Evolución temporal top-5 */}
          {evolutionChart && (
            <Card>
              <CardHeader>
                <CardTitle>Evolución temporal — top 5 números</CardTitle>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Frecuencia de los 5 números más activos en ventanas de 50, 100, 200 y 500 sorteos
                </p>
              </CardHeader>
              <CardContent className="px-2 sm:px-5">
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={evolutionChart.rows} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
                    <XAxis dataKey="ventana" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip labelFormatter={(l) => `Ventana: ${l}`} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    {evolutionChart.top5.map((n, i) => (
                      <Line
                        key={n}
                        type="monotone"
                        dataKey={`Nº${n}`}
                        stroke={EVOLUTION_COLORS[i]}
                        strokeWidth={2}
                        dot={{ r: 3, fill: EVOLUTION_COLORS[i] }}
                        isAnimationActive={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Sorted list: top trending up */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>En racha positiva (↑ vs histórico)</CardTitle></CardHeader>
              <CardContent>
                {[...data].sort((a, b) => b.trend - a.trend).slice(0, 15).map(wf => (
                  <TrendRow key={wf.number} wf={wf} />
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>En racha negativa (↓ vs histórico)</CardTitle></CardHeader>
              <CardContent>
                {[...data].sort((a, b) => a.trend - b.trend).slice(0, 15).map(wf => (
                  <TrendRow key={wf.number} wf={wf} />
                ))}
              </CardContent>
            </Card>
          </div>

        </>
      ) : (
        <p className="text-sm text-zinc-500">Sin datos. Sincroniza primero.</p>
      )}
    </div>
  )
}

// ── Balance par/impar y alto/bajo ────────────────────────────────────────────

function BalanceBar({ label, count, total, highlight }: { label: string; count: number; total: number; highlight: boolean }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div className={`flex items-center gap-3 py-2 rounded-lg px-2 ${highlight ? 'bg-violet-50 dark:bg-violet-900/20' : ''}`}>
      <span className={`w-8 text-center text-sm font-bold shrink-0 ${highlight ? 'text-violet-700 dark:text-violet-300' : 'text-zinc-600 dark:text-zinc-400'}`}>
        {label}
      </span>
      <div className="flex-1 h-3 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
        <div
          className={`h-full rounded-full ${highlight ? 'bg-violet-500' : 'bg-zinc-400 dark:bg-zinc-600'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-20 text-right text-xs text-zinc-500 dark:text-zinc-400 shrink-0">
        {formatNumber(count)} ({pct.toFixed(1)}%)
      </span>
    </div>
  )
}

function BalanceTab({ balance, typeId }: { balance: BalanceAnalysis; typeId: LotteryTypeId }) {
  const totalOdd  = Object.values(balance.oddEvenDistribution).reduce((a, b) => a + b, 0)
  const totalHigh = Object.values(balance.highLowDistribution).reduce((a, b) => a + b, 0)
  const { data: freqs } = useFrequencies(typeId)
  const saveMutation = useSavePrediction()
  const [savedKey] = useState<string | null>(null)

  const balanceCombos = useMemo(() => {
    const k    = balance.numbersPerDraw
    const mid  = balance.midpoint

    // Sort by frequency desc; fallback to ascending order if no freqs yet
    const byFreq = (nums: number[]) =>
      freqs
        ? [...nums].sort((a, b) => {
            const fa = freqs.find(f => f.number === a)?.frequency ?? 0
            const fb = freqs.find(f => f.number === b)?.frequency ?? 0
            return fb - fa
          })
        : nums

    const odds  = byFreq(Array.from({ length: 56 }, (_, i) => i + 1).filter(n => n % 2 !== 0))
    const evens = byFreq(Array.from({ length: 56 }, (_, i) => i + 1).filter(n => n % 2 === 0))

    function pick(nOdd: number, _nEven: number, nHigh: number, nLow: number): number[] {
      // Pick numbers satisfying both odd/even AND high/low constraints
      const pool: number[] = []
      const used = new Set<number>()

      // Odd-high
      const oh = odds.filter(n => n > mid)
      const nOH = Math.min(nOdd, nHigh, oh.length)
      oh.slice(0, nOH).forEach(n => { pool.push(n); used.add(n) })

      // Odd-low
      const ol = odds.filter(n => n <= mid && !used.has(n))
      const nOL = Math.min(nOdd - nOH, ol.length)
      ol.slice(0, nOL).forEach(n => { pool.push(n); used.add(n) })

      // Even-high
      const eh = evens.filter(n => n > mid && !used.has(n))
      const nEH = Math.min(nHigh - nOH, eh.length)
      eh.slice(0, nEH).forEach(n => { pool.push(n); used.add(n) })

      // Even-low
      const el = evens.filter(n => n <= mid && !used.has(n))
      const nEL = Math.min(nLow - nOL, el.length)
      el.slice(0, nEL).forEach(n => { pool.push(n); used.add(n) })

      // Fill any remaining spots from most-frequent unused
      if (pool.length < k) {
        byFreq(Array.from({ length: 56 }, (_, i) => i + 1))
          .filter(n => !used.has(n))
          .slice(0, k - pool.length)
          .forEach(n => pool.push(n))
      }

      return pool.sort((a, b) => a - b).slice(0, k)
    }

    const oOpt = balance.optimalOddCount
    const eOpt = balance.optimalEvenCount
    const hOpt = balance.optimalHighCount
    const lOpt = balance.optimalLowCount

    const variants = [
      { key: 'optimal',  title: 'Balance óptimo',       desc: `${oOpt}I·${eOpt}P · ${hOpt}A·${lOpt}B — patrón más frecuente históricamente`, color: '#7c3aed', nums: pick(oOpt, eOpt, hOpt, lOpt) },
      { key: 'oddHigh',  title: 'Más impares y altos',  desc: `${Math.min(oOpt+1,k)}I · ${Math.min(hOpt+1,k)}A`, color: '#059669', nums: pick(Math.min(oOpt+1,k), Math.max(eOpt-1,0), Math.min(hOpt+1,k), Math.max(lOpt-1,0)) },
      { key: 'evenLow',  title: 'Más pares y bajos',    desc: `${Math.min(eOpt+1,k)}P · ${Math.min(lOpt+1,k)}B`, color: '#0284c7', nums: pick(Math.max(oOpt-1,0), Math.min(eOpt+1,k), Math.max(hOpt-1,0), Math.min(lOpt+1,k)) },
    ]

    return variants.map(v => ({
      ...v,
      combo: buildCombo(v.nums),
    }))
  }, [balance, freqs])

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* ── Combinaciones sugeridas por balance ── */}
      <Card className="md:col-span-2 border-2 border-violet-200 dark:border-violet-800 bg-violet-50/30 dark:bg-violet-900/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-violet-800 dark:text-violet-300">
            🎯 Combinaciones sugeridas por balance
          </CardTitle>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Números más frecuentes dentro de cada categoría (impar/par · alto/bajo), respetando el patrón óptimo histórico.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {balanceCombos.map(({ key, title, desc, color, combo }) => (
              <div key={key} className="rounded-xl border border-violet-100 dark:border-violet-900 bg-white dark:bg-zinc-900 p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100">{title}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{desc}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {savedKey === key
                      ? <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">✓ Guardada</span>
                      : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={saveMutation.isPending}
                          onClick={() => {
                            saveMutation.mutate(
                              { label: `Balance — ${title} (${typeId})`, latestDrawDate: null, combos: [combo], lotteryType: typeId },
                              { onSuccess: () => toast.success('Combinación guardada'), onError: () => toast.error('Error al guardar') },
                            )
                          }}
                        >
                          Guardar
                        </Button>
                      )
                    }
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  {combo.numbers.map(n => (
                    <div key={n} className="flex flex-col items-center gap-1.5">
                      <span
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full font-bold text-base text-white shadow-sm"
                        style={{ background: color }}
                      >
                        {n}
                      </span>
                    </div>
                  ))}
                  <div className="flex flex-col justify-center ml-auto">
                    <span className="text-sm font-bold tabular-nums text-zinc-700 dark:text-zinc-300">Σ {combo.sum}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Balance Par / Impar</CardTitle>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Punto medio del rango: {balance.midpoint} ·
            Óptimo: <span className="font-semibold text-violet-700 dark:text-violet-300">{balance.optimalOddCount} imp / {balance.optimalEvenCount} par</span>
          </p>
        </CardHeader>
        <CardContent>
          {Object.entries(balance.oddEvenDistribution).map(([k, v]) => (
            <BalanceBar
              key={k}
              label={`${k}I/${balance.numbersPerDraw - Number(k)}P`}
              count={Number(v)}
              total={totalOdd}
              highlight={Number(k) === balance.optimalOddCount}
            />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Balance Alto / Bajo</CardTitle>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Mitad del rango: {balance.midpoint} ·
            Óptimo: <span className="font-semibold text-violet-700 dark:text-violet-300">{balance.optimalHighCount} alto / {balance.optimalLowCount} bajo</span>
          </p>
        </CardHeader>
        <CardContent>
          {Object.entries(balance.highLowDistribution).map(([k, v]) => (
            <BalanceBar
              key={k}
              label={`${k}A/${balance.numbersPerDraw - Number(k)}B`}
              count={Number(v)}
              total={totalHigh}
              highlight={Number(k) === balance.optimalHighCount}
            />
          ))}
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader><CardTitle>Patrón óptimo histórico</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-violet-50 dark:bg-violet-900/20 p-4">
              <p className="text-xs font-medium text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-1">Par / Impar</p>
              <p className="text-2xl font-bold text-violet-800 dark:text-violet-200">
                {balance.optimalOddCount} impares · {balance.optimalEvenCount} pares
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Aparece en el {((balance.oddEvenDistribution[balance.optimalOddCount] ?? 0) / balance.totalDraws * 100).toFixed(1)}% de los sorteos
              </p>
            </div>
            <div className="rounded-lg bg-violet-50 dark:bg-violet-900/20 p-4">
              <p className="text-xs font-medium text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-1">Alto / Bajo</p>
              <p className="text-2xl font-bold text-violet-800 dark:text-violet-200">
                {balance.optimalHighCount} altos · {balance.optimalLowCount} bajos
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Aparece en el {((balance.highLowDistribution[balance.optimalHighCount] ?? 0) / balance.totalDraws * 100).toFixed(1)}% de los sorteos
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  )
}

// ── Distribución de suma ─────────────────────────────────────────────────────

function SumDistributionTab({ dist, typeId }: { dist: SumDistribution; typeId: LotteryTypeId }) {
  const chartData = Object.entries(dist.histogram).map(([k, v]) => ({
    sum: Number(k),
    frequency: Number(v),
    inOptimal: Number(k) >= dist.optimalMin && Number(k) <= dist.optimalMax,
  }))

  const { data: freqs } = useFrequencies(typeId)
  const saveMutation = useSavePrediction()
  const [savedKey] = useState<string | null>(null)
  const meta = getLotteryMeta(typeId)

  const sumCombos = useMemo(() => {
    const k = meta.numbers
    const byFreq = freqs
      ? [...freqs].sort((a, b) => b.frequency - a.frequency).map(f => f.number)
      : Array.from({ length: 56 }, (_, i) => i + 1)

    function pickClosestSum(target: number): GeneratedCombo {
      // Greedy: start with top-frequency numbers, swap to get closer to target
      let nums = byFreq.slice(0, k)
      let sum  = nums.reduce((a, b) => a + b, 0)
      const used = new Set(nums)

      // One pass of improvements: try swapping each picked number with an unused one
      for (let iter = 0; iter < 30; iter++) {
        let improved = false
        for (let i = 0; i < nums.length; i++) {
          for (const candidate of byFreq) {
            if (used.has(candidate)) continue
            const newSum = sum - nums[i] + candidate
            if (Math.abs(newSum - target) < Math.abs(sum - target)) {
              used.delete(nums[i])
              used.add(candidate)
              nums[i] = candidate
              sum = newSum
              improved = true
              break
            }
          }
        }
        if (!improved) break
      }

      return buildCombo(nums)
    }

    const target1 = Math.round(dist.mean)
    const target2 = dist.optimalMin + Math.round((dist.optimalMax - dist.optimalMin) * 0.25)
    const target3 = dist.optimalMin + Math.round((dist.optimalMax - dist.optimalMin) * 0.75)

    return [
      { key: 'media',  title: 'Cerca de la media',        desc: `Suma objetivo: ${target1} (media histórica)`,           color: '#7c3aed', combo: pickClosestSum(target1) },
      { key: 'low',    title: 'Rango óptimo — parte baja', desc: `Suma objetivo: ${target2} (cuartil inferior del rango)`, color: '#059669', combo: pickClosestSum(target2) },
      { key: 'high',   title: 'Rango óptimo — parte alta', desc: `Suma objetivo: ${target3} (cuartil superior del rango)`, color: '#0284c7', combo: pickClosestSum(target3) },
    ]
  }, [dist, freqs, meta.numbers])

  return (
    <div className="flex flex-col gap-4">
      {/* ── Combinaciones sugeridas por suma ── */}
      <Card className="border-2 border-violet-200 dark:border-violet-800 bg-violet-50/30 dark:bg-violet-900/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-violet-800 dark:text-violet-300">
            🎯 Combinaciones sugeridas por suma
          </CardTitle>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Números más frecuentes ajustados para que la suma caiga dentro del rango óptimo histórico
            (<b className="text-zinc-700 dark:text-zinc-200">Σ {dist.optimalMin}–{dist.optimalMax}</b>).
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {sumCombos.map(({ key, title, desc, color, combo }) => (
              <div key={key} className="rounded-xl border border-violet-100 dark:border-violet-900 bg-white dark:bg-zinc-900 p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100">{title}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{desc}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {savedKey === key
                      ? <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">✓ Guardada</span>
                      : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={saveMutation.isPending}
                          onClick={() => {
                            saveMutation.mutate(
                              { label: `Suma — ${title} (${typeId})`, latestDrawDate: null, combos: [combo], lotteryType: typeId },
                              { onSuccess: () => toast.success('Combinación guardada'), onError: () => toast.error('Error al guardar') },
                            )
                          }}
                        >
                          Guardar
                        </Button>
                      )
                    }
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  {combo.numbers.map(n => (
                    <div key={n} className="flex flex-col items-center gap-1.5">
                      <span
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full font-bold text-base text-white shadow-sm"
                        style={{ background: color }}
                      >
                        {n}
                      </span>
                    </div>
                  ))}
                  <div className="flex flex-col justify-center ml-auto">
                    <span className={`text-sm font-bold tabular-nums ${combo.sum >= dist.optimalMin && combo.sum <= dist.optimalMax ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}`}>
                      Σ {combo.sum} {combo.sum >= dist.optimalMin && combo.sum <= dist.optimalMax ? '✓' : '~'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stats row */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <StatCard label="Media"              value={dist.mean.toFixed(1)} />
        <StatCard label="Desv. estándar"     value={dist.stdDev.toFixed(1)} />
        <StatCard label="Rango óptimo min"   value={dist.optimalMin} />
        <StatCard label="Rango óptimo max"   value={dist.optimalMax} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histograma de sumas</CardTitle>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Rango óptimo <span className="font-semibold text-violet-700 dark:text-violet-300">{dist.optimalMin}–{dist.optimalMax}</span> (media ± 1 desv. estándar) ·
            Percentiles: P25={dist.p25.toFixed(0)}, P50={dist.p50.toFixed(0)}, P75={dist.p75.toFixed(0)}
          </p>
        </CardHeader>
        <CardContent className="px-2 sm:px-5">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <XAxis dataKey="sum" tick={{ fontSize: 9 }} interval={Math.ceil(chartData.length / 20) - 1} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                formatter={((v: unknown) => [formatNumber(Number(v ?? 0)), 'Sorteos']) as never}
                labelFormatter={(l) => `Suma ${l}`}
              />
              <ReferenceLine x={dist.optimalMin} stroke="#7c3aed" strokeDasharray="4 2" />
              <ReferenceLine x={dist.optimalMax} stroke="#7c3aed" strokeDasharray="4 2" />
              <ReferenceLine x={Math.round(dist.mean)} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: 'Media', fontSize: 10, fill: '#f59e0b' }} />
              <Bar dataKey="frequency" radius={[2, 2, 0, 0]}>
                {chartData.map((d) => (
                  <Cell key={d.sum} fill={d.inOptimal ? '#7c3aed' : '#a78bfa'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Cómo usar este análisis</CardTitle></CardHeader>
        <CardContent className="text-sm text-zinc-600 dark:text-zinc-300 space-y-2">
          <p>
            Al elegir tus números, verifica que su <b>suma total</b> caiga en el rango <b className="text-violet-700 dark:text-violet-300">{dist.optimalMin}–{dist.optimalMax}</b>.
          </p>
          <p>
            Este rango corresponde a la media ({dist.mean.toFixed(0)}) ± una desviación estándar y concentra
            el <b>{Math.round(chartData.filter(d => d.inOptimal).reduce((a, b) => a + b.frequency, 0) / dist.totalDraws * 100)}%</b> de los sorteos históricos.
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Esto se basa en el Teorema del Límite Central: al sumar números aleatorios del mismo rango, la distribución de sumas tiende a ser normal.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Análisis de pares ────────────────────────────────────────────────────────

const PAIR_LIMIT_OPTIONS = [20, 50, 100] as const

function PairAnalysisTab({ typeId }: { typeId: LotteryTypeId }) {
  const [limit, setLimit] = useState<number>(20)
  const { data, isLoading } = usePairAnalysis(typeId, limit)
  const saveMutation = useSavePrediction()
  const [savedKey] = useState<string | null>(null)
  const meta = getLotteryMeta(typeId)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-zinc-500 dark:text-zinc-400">Top pares:</span>
        {PAIR_LIMIT_OPTIONS.map(l => (
          <button key={l} onClick={() => setLimit(l)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              limit === l ? 'bg-violet-600 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
            }`}>{l}</button>
        ))}
      </div>

      {isLoading ? <PageSpinner /> : data && data.length > 0 ? (
        <>
          {(() => {
            const k = meta.numbers
            const scoreMap: Record<number, number> = {}
            data.forEach((p: NumberPair) => {
              scoreMap[p.number1] = (scoreMap[p.number1] ?? 0) + p.frequency
              scoreMap[p.number2] = (scoreMap[p.number2] ?? 0) + p.frequency
            })
            const byScore = Object.entries(scoreMap)
              .map(([n, s]) => ({ n: Number(n), s }))
              .sort((a, b) => b.s - a.s)

            const topN = byScore.slice(0, k).map(x => x.n)

            const greedyNums: number[] = []
            const greedyUsed = new Set<number>()
            for (const p of data) {
              if (greedyNums.length >= k) break
              if (!greedyUsed.has(p.number1)) { greedyNums.push(p.number1); greedyUsed.add(p.number1) }
              if (greedyNums.length >= k) break
              if (!greedyUsed.has(p.number2)) { greedyNums.push(p.number2); greedyUsed.add(p.number2) }
            }

            const combos: SuggestedCombo[] = [
              { key: 'score',  title: 'Mayor co-ocurrencia', desc: `Top ${k} números que aparecen en más pares frecuentes`, color: '#7c3aed', label: 'Mayor co-ocurrencia', combo: buildCombo(topN) },
              { key: 'greedy', title: 'Pares más frecuentes', desc: 'Construida cubriendo los pares con mayor frecuencia histórica', color: '#059669', label: 'Pares más frecuentes', combo: buildCombo(greedyNums) },
            ]
            return (
              <SuggestedCombosCard
                subtitle={`Basadas en los top ${limit} pares más frecuentes.`}
                combos={combos}
                savedKey={savedKey}
                isPending={saveMutation.isPending}
                onSave={(_key, combo, lbl) => {
                  saveMutation.mutate(
                    { label: `Pares — ${lbl} (${typeId})`, latestDrawDate: null, combos: [combo], lotteryType: typeId },
                    { onSuccess: () => toast.success('Combinación guardada'), onError: () => toast.error('Error al guardar') },
                  )
                }}
              />
            )
          })()}
          <Card>
            <CardHeader>
              <CardTitle>Pares más frecuentes</CardTitle>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Número de veces que cada par de números apareció en el mismo sorteo
              </p>
            </CardHeader>
            <CardContent>
              {data.map((p: NumberPair, i) => (
                <div key={`${p.number1}-${p.number2}`}
                  className="flex items-center gap-3 py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                  <span className="w-6 text-right text-xs text-zinc-400 shrink-0">{i + 1}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300 font-bold text-sm">
                      {p.number1}
                    </span>
                    <span className="text-zinc-400 text-xs">+</span>
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300 font-bold text-sm">
                      {p.number2}
                    </span>
                  </div>
                  <div className="flex-1 h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <div className="h-full rounded-full bg-violet-500"
                      style={{ width: `${Math.min(p.percentage * 4, 100)}%` }} />
                  </div>
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 shrink-0 w-14 text-right">
                    {formatNumber(p.frequency)}×
                  </span>
                  <span className="text-xs text-zinc-400 dark:text-zinc-500 shrink-0 w-14 text-right hidden sm:inline">
                    {p.percentage.toFixed(2)}%
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      ) : (
        <p className="text-sm text-zinc-500">Sin datos. Sincroniza primero.</p>
      )}
    </div>
  )
}

// ── Chi-cuadrado ─────────────────────────────────────────────────────────────

function ChiSquareTab({ result }: { result: ChiSquareResult }) {
  const isUniform = result.pValue >= 0.05
  const badgeVariant = result.pValue < 0.001 ? 'hot' : result.pValue < 0.05 ? 'warning' : 'success'
  const badgeLabel   = result.pValue < 0.001 ? 'No uniforme' : result.pValue < 0.05 ? 'Ligero sesgo' : 'Uniforme'

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <StatCard label="Chi-cuadrado" value={result.chiSquare.toFixed(2)} />
        <StatCard label="Grados de libertad" value={result.degreesOfFreedom} />
        <div className="relative">
          <StatCard label="p-valor" value={result.pValue < 0.0001 ? '< 0.0001' : result.pValue.toFixed(5)} />
          <span className="absolute top-4 right-3">
            <InfoTip side="bottom" text="p-valor < 0.05 indica que la distribución de frecuencias difiere significativamente del azar. Valores altos (> 0.05) sugieren un sorteo justo." />
          </span>
        </div>
        <StatCard label="Frec. esperada" value={formatNumber(Math.round(result.expectedFrequency))} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <CardTitle>Resultado del test</CardTitle>
            <Badge variant={badgeVariant}>{badgeLabel}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-zinc-700 dark:text-zinc-300">{result.interpretation}</p>
          <div className={`rounded-lg p-4 ${isUniform ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-amber-50 dark:bg-amber-900/20'}`}>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {isUniform
                ? 'La distribución de frecuencias no difiere significativamente de lo que cabría esperar por azar. Esto confirma que la lotería opera de manera justa desde el punto de vista estadístico.'
                : `El estadístico χ² = ${result.chiSquare.toFixed(2)} con ${result.degreesOfFreedom} grados de libertad produce un p-valor de ${result.pValue.toFixed(5)}, lo que indica que algunos números han salido más o menos veces de lo esperado. Sin embargo, esto puede deberse a variación natural en muestras finitas.`
              }
            </p>
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Total observaciones: {formatNumber(result.totalObservations)} ·
            Frecuencia esperada por número: {result.expectedFrequency.toFixed(1)}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Backtesting ───────────────────────────────────────────────────────────────

const TEST_DRAWS_OPTIONS = [50, 100, 200, 500] as const

function BacktestTab({ typeId, defaultK }: { typeId: LotteryTypeId; defaultK: number }) {
  const [testDraws, setTestDraws] = useState<number>(100)
  const { data, isLoading } = useBacktest(typeId, defaultK, testDraws)
  const saveMutation = useSavePrediction()
  const [savedKey] = useState<string | null>(null)

  const chartData = data
    ? Object.entries(data.matchDistribution)
        .map(([k, v]) => ({ matches: Number(k), count: Number(v) }))
        .filter(d => d.count > 0)
    : []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-zinc-500 dark:text-zinc-400">Sorteos a evaluar:</span>
        {TEST_DRAWS_OPTIONS.map(d => (
          <button key={d} onClick={() => setTestDraws(d)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              testDraws === d ? 'bg-violet-600 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
            }`}>{d}</button>
        ))}
      </div>

      {isLoading ? <PageSpinner /> : data ? (
        <>
          {(() => {
            const nums = data.predictedNumbers.slice(0, defaultK)
            const combos: SuggestedCombo[] = [
              { key: 'predicted', title: `Top ${defaultK} predichos`, desc: `Los ${defaultK} números más frecuentes en los últimos ${data.totalDrawsTested} sorteos evaluados`, color: '#7c3aed', label: `Top ${defaultK} predichos`, combo: buildCombo(nums) },
            ]
            return (
              <SuggestedCombosCard
                subtitle={`Combinación validada por backtest sobre ${data.totalDrawsTested} sorteos (hit rate ${(data.hitRate * 100).toFixed(1)}%).`}
                combos={combos}
                savedKey={savedKey}
                isPending={saveMutation.isPending}
                onSave={(_key, combo, lbl) => {
                  saveMutation.mutate(
                    { label: `Backtest — ${lbl} (${typeId})`, latestDrawDate: null, combos: [combo], lotteryType: typeId },
                    { onSuccess: () => toast.success('Combinación guardada'), onError: () => toast.error('Error al guardar') },
                  )
                }}
              />
            )
          })()}
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
            <StatCard label="Sorteos evaluados" value={formatNumber(data.totalDrawsTested)} />
            <StatCard label="Aciertos promedio" value={data.avgMatches.toFixed(2)} />
            <StatCard label="Tasa de acierto" value={`${(data.hitRate * 100).toFixed(1)}%`} />
            <StatCard label="Tasa aleatoria" value={`${(data.expectedRandomRate * 100).toFixed(1)}%`} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Distribución de aciertos por sorteo</CardTitle>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                ¿Cuántos de los {data.topK} números predichos aparecieron en cada sorteo real?
              </p>
            </CardHeader>
            <CardContent className="px-2 sm:px-5">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <XAxis dataKey="matches" tickFormatter={v => `${v} ac.`} tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={((v: unknown) => [v, 'Sorteos']) as never}
                    labelFormatter={(l) => `${l} aciertos`}
                  />
                  <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                    {chartData.map(d => (
                      <Cell key={d.matches} fill={d.matches >= 3 ? '#7c3aed' : d.matches >= 1 ? '#a78bfa' : '#e4e4e7'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Interpretación</CardTitle></CardHeader>
            <CardContent className="text-sm text-zinc-600 dark:text-zinc-300 space-y-2">
              <p>
                Apostando siempre a los <b>{data.topK}</b> números más frecuentes, habrías acertado
                al menos un número en el <b className="text-violet-700 dark:text-violet-300">{(data.hitRate * 100).toFixed(1)}%</b> de
                los últimos {data.totalDrawsTested} sorteos, vs. <b>{(data.expectedRandomRate * 100).toFixed(1)}%</b> esperado por azar puro.
              </p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                Este es un backtest simplificado: la predicción usa frecuencias históricas totales (no rolling window).
              </p>
            </CardContent>
          </Card>
        </>
      ) : (
        <p className="text-sm text-zinc-500">Sin datos. Sincroniza primero.</p>
      )}
    </div>
  )
}

// ── Análisis bayesiano ────────────────────────────────────────────────────────

const BAYES_WINDOW_OPTIONS = [20, 50, 100, 200] as const

function BayesianTab({ typeId }: { typeId: LotteryTypeId }) {
  const [window, setWindow] = useState<number>(50)
  const { data, isLoading } = useBayesianAnalysis(typeId, window)
  const saveMutation = useSavePrediction()
  const [savedKey] = useState<string | null>(null)
  const meta = getLotteryMeta(typeId)

  const top15 = data?.slice(0, 15) ?? []
  const chartData = top15.map(b => ({
    number: b.number,
    posterior: +(b.posteriorMean * 1000).toFixed(3),
    prior: +(b.priorMean * 1000).toFixed(3),
  }))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-zinc-500 dark:text-zinc-400">Ventana reciente:</span>
        {BAYES_WINDOW_OPTIONS.map(w => (
          <button key={w} onClick={() => setWindow(w)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              window === w ? 'bg-violet-600 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
            }`}>{w} sorteos</button>
        ))}
      </div>

      {isLoading ? <PageSpinner /> : data && data.length > 0 ? (
        <>
          {(() => {
            const k = meta.numbers
            const byPosterior = [...data].sort((a: BayesianNumber, b: BayesianNumber) => b.posteriorMean - a.posteriorMean)
            const byLift      = [...data].filter((b: BayesianNumber) => b.lift > 0).sort((a: BayesianNumber, b: BayesianNumber) => b.lift - a.lift)

            const topPost  = byPosterior.slice(0, k).map((b: BayesianNumber) => b.number)
            const topLift  = byLift.slice(0, k).map((b: BayesianNumber) => b.number)
            const mix = [
              ...byPosterior.slice(0, Math.ceil(k / 2)).map((b: BayesianNumber) => b.number),
              ...byLift.slice(0, Math.floor(k / 2)).map((b: BayesianNumber) => b.number),
            ]

            const combos: SuggestedCombo[] = [
              { key: 'post', title: 'Mayor probabilidad posterior', desc: `Top ${k} por probabilidad posterior (prior + ventana ${window}s)`, color: '#7c3aed', label: 'Mayor probabilidad posterior', combo: buildCombo(topPost) },
              { key: 'lift', title: 'Mayor lift positivo',         desc: `Top ${k} con mayor aumento vs su frecuencia histórica`,           color: '#059669', label: 'Mayor lift positivo',         combo: buildCombo(topLift.length >= k ? topLift : topPost) },
              { key: 'mix',  title: 'Mixta posterior + lift',      desc: `${Math.ceil(k/2)} por posterior + ${Math.floor(k/2)} por lift`,   color: '#0284c7', label: 'Mixta posterior + lift',      combo: buildCombo(mix) },
            ]
            return (
              <SuggestedCombosCard
                subtitle={`Modelo Beta-Binomial actualizado con los últimos ${window} sorteos.`}
                combos={combos}
                savedKey={savedKey}
                isPending={saveMutation.isPending}
                onSave={(_key, combo, lbl) => {
                  saveMutation.mutate(
                    { label: `Bayesiano — ${lbl} (${typeId})`, latestDrawDate: null, combos: [combo], lotteryType: typeId },
                    { onSuccess: () => toast.success('Combinación guardada'), onError: () => toast.error('Error al guardar') },
                  )
                }}
              />
            )
          })()}
          <Card>
            <CardHeader>
              <CardTitle>Top 15 por probabilidad posterior</CardTitle>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Prior (histórico) vs Posterior (actualizado con ventana reciente) · ×10⁻³
              </p>
            </CardHeader>
            <CardContent className="px-2 sm:px-5">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <XAxis dataKey="number" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={((v: unknown, name: string) => [
                      `${v} ×10⁻³`,
                      name === 'posterior' ? 'Posterior' : 'Prior',
                    ]) as never}
                    labelFormatter={(l) => `Número ${l}`}
                  />
                  <Bar dataKey="prior"      fill="#c4b5fd" radius={[2, 2, 0, 0]} name="prior" />
                  <Bar dataKey="posterior"  fill="#7c3aed" radius={[2, 2, 0, 0]} name="posterior" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Mayor lift positivo (↑ tendencia)
                  <InfoTip text="Lift = cambio % entre probabilidad posterior (ventana reciente) y prior histórico. Lift positivo → el número aparece más de lo esperado recientemente." />
                </CardTitle>
              </CardHeader>
              <CardContent>
                {[...(data ?? [])].sort((a: BayesianNumber, b: BayesianNumber) => b.lift - a.lift).slice(0, 10).map((bn: BayesianNumber) => (
                  <div key={bn.number} className="flex items-center gap-2 py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                    <span className="w-8 h-8 flex items-center justify-center rounded-full bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300 font-bold text-sm shrink-0">
                      {bn.number}
                    </span>
                    <div className="flex-1 text-xs text-zinc-600 dark:text-zinc-400">
                      <span className="inline-flex items-center gap-1">
                        Post: <b className="text-violet-700 dark:text-violet-300">{(bn.posteriorMean * 1000).toFixed(3)}</b>
                        <InfoTip text="Media posterior ×1000: probabilidad actualizada del número dada la ventana reciente (modelo Beta-Binomial)." />
                      </span>
                      <span className="mx-2 text-zinc-300 dark:text-zinc-600">|</span>
                      <span>Prior: {(bn.priorMean * 1000).toFixed(3)}</span>
                    </div>
                    <span className={`text-xs font-semibold shrink-0 ${bn.lift > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                      {bn.lift > 0 ? '▲' : '▼'} {Math.abs(bn.lift).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Mayor lift negativo (↓ tendencia)</CardTitle></CardHeader>
              <CardContent>
                {[...(data ?? [])].sort((a: BayesianNumber, b: BayesianNumber) => a.lift - b.lift).slice(0, 10).map((bn: BayesianNumber) => (
                  <div key={bn.number} className="flex items-center gap-2 py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                    <span className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 font-bold text-sm shrink-0">
                      {bn.number}
                    </span>
                    <div className="flex-1 text-xs text-zinc-600 dark:text-zinc-400">
                      <span>Post: <b>{(bn.posteriorMean * 1000).toFixed(3)}</b></span>
                      <span className="mx-2 text-zinc-300 dark:text-zinc-600">|</span>
                      <span>Prior: {(bn.priorMean * 1000).toFixed(3)}</span>
                    </div>
                    <span className={`text-xs font-semibold shrink-0 ${bn.lift > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                      {bn.lift > 0 ? '▲' : '▼'} {Math.abs(bn.lift).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>¿Cómo interpretar el lift?</CardTitle></CardHeader>
            <CardContent className="text-sm text-zinc-600 dark:text-zinc-300 space-y-2">
              <p>
                El <b>lift</b> mide cuánto cambió la probabilidad posterior respecto al prior histórico.
                Un lift de <b className="text-emerald-600">+20%</b> significa que en la ventana reciente
                de {window} sorteos el número aparece un 20% más de lo que su historia sugiere.
              </p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                Modelo: Beta-Binomial con prior Jeffreys. La actualización combina toda la historia con los
                últimos {window} sorteos sin descartar información antigua.
              </p>
            </CardContent>
          </Card>
        </>
      ) : (
        <p className="text-sm text-zinc-500">Sin datos. Sincroniza primero.</p>
      )}
    </div>
  )
}



// ── Análisis por posición ─────────────────────────────────────────────────────

function PositionBar({ stats, maxNum }: { stats: PositionStats; maxNum: number }) {
  const pct = (v: number) => (v / maxNum) * 100
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 text-xs font-semibold text-zinc-500 shrink-0">Pos {stats.position}</span>
      <div className="flex-1 relative h-6 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="absolute h-full bg-violet-100 dark:bg-violet-900/30 rounded-full"
          style={{ left: `${pct(stats.p10)}%`, width: `${pct(stats.p90 - stats.p10)}%` }}
        />
        <div
          className="absolute h-full bg-violet-300 dark:bg-violet-700/60 rounded-full"
          style={{ left: `${pct(stats.p25)}%`, width: `${pct(stats.p75 - stats.p25)}%` }}
        />
        <div
          className="absolute h-full w-0.5 bg-violet-600 dark:bg-violet-400"
          style={{ left: `${pct(stats.p50)}%` }}
        />
      </div>
      <span className="text-xs text-zinc-400 shrink-0 tabular-nums w-32 text-right">
        {stats.recommendedMin}–{stats.recommendedMax} · μ={stats.mean}
      </span>
    </div>
  )
}

function PositionTab({ analysis }: { analysis: PositionAnalysis }) {
  const maxNum = analysis.positions.at(-1)?.max ?? 56
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Distribución por posición</CardTitle>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Números ordenados de menor a mayor en cada sorteo.
            Azul claro = P10–P90 · Azul medio = P25–P75 · Línea = mediana.
            El rango recomendado (P10–P90) indica dónde cae el 80% de los valores históricos.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {analysis.positions.map(pos => (
            <PositionBar key={pos.position} stats={pos} maxNum={maxNum} />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

// ── Consecutivos ──────────────────────────────────────────────────────────────

function ConsecutiveTab({ analysis }: { analysis: ConsecutiveAnalysis }) {
  const distData = Object.entries(analysis.distributionByCount)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([k, v]) => ({ label: `${k} par${Number(k) !== 1 ? 'es' : ''}`, count: Number(v) }))

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Distribución de pares consecutivos</CardTitle>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            El <b>{analysis.consecutiveRate}%</b> de sorteos tiene al menos un par consecutivo.
            Promedio: <b>{analysis.avgPairsPerDraw}</b> pares/sorteo.
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={distData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [formatNumber(Number(v)), 'Sorteos']} />
              <Bar dataKey="count" fill="#7c3aed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pares consecutivos frecuentes</CardTitle>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Parejas de números que aparecen juntos y consecutivos con mayor frecuencia.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-1">
            {analysis.topPairs.map((p, i) => (
              <div key={i} className="flex items-center gap-3 py-1.5 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                <span className="w-5 text-xs text-zinc-400 text-right shrink-0">{i + 1}</span>
                <div className="flex gap-1 shrink-0">
                  <span className="h-8 w-8 flex items-center justify-center rounded-full bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300 text-sm font-bold">{p.lower}</span>
                  <span className="h-8 w-8 flex items-center justify-center rounded-full bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300 text-sm font-bold">{p.higher}</span>
                </div>
                <div className="flex-1 h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  <div className="h-full bg-violet-500 rounded-full" style={{ width: `${Math.min(p.percentage * 3, 100)}%` }} />
                </div>
                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300 shrink-0 tabular-nums">{p.percentage}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Calendario ────────────────────────────────────────────────────────────────

function CalendarTab({ cal }: { cal: CalendarFrequency }) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Números calientes por día de la semana</CardTitle>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Los números que más veces salieron en sorteos de cada día, basado en {formatNumber(cal.totalDraws)} sorteos históricos.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            {cal.byDayOfWeek.map(day => (
              <div key={day.dayOfWeek} className="flex items-center gap-3 flex-wrap">
                <span className="w-20 text-sm text-zinc-500 dark:text-zinc-400 capitalize shrink-0 font-medium">{day.dayName}</span>
                <div className="flex flex-wrap gap-1">
                  {day.hotNumbers.map(n => (
                    <span key={n} className="h-7 w-7 flex items-center justify-center rounded-full bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300 text-xs font-bold">
                      {n}
                    </span>
                  ))}
                </div>
                <span className="text-xs text-zinc-400 shrink-0">{formatNumber(day.drawCount)} sorteos</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Números calientes por mes</CardTitle>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Los números más frecuentes en cada mes del año.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
            {cal.byMonth.map(month => (
              <div key={month.month} className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 capitalize">{month.monthName}</span>
                <div className="flex flex-wrap gap-1">
                  {month.hotNumbers.map(n => (
                    <span key={n} className="h-6 w-6 flex items-center justify-center rounded-full bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300 text-xs font-bold">
                      {n}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Selector manual de números ────────────────────────────────────────────────

function ScoreItem({ label, value, ok, detail }: { label: string; value: string; ok: boolean | null; detail?: string }) {
  return (
    <div className={cn(
      'rounded-lg border p-3',
      ok === true  ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20' :
      ok === false ? 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20' :
                     'border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800'
    )}>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className={cn('text-xl font-bold',
        ok === true  ? 'text-emerald-700 dark:text-emerald-400' :
        ok === false ? 'text-amber-700 dark:text-amber-400' :
                       'text-zinc-700 dark:text-zinc-300'
      )}>{value}</p>
      {detail && <p className="text-[10px] text-zinc-400 mt-0.5">{detail}</p>}
    </div>
  )
}

function NumberPickerTab({
  typeId, meta, dueNums, sumDist, balance, pairs, savePickerMutation, pickerSaved,
}: {
  typeId: LotteryTypeId
  meta: { numbers: number; range: string; icon: string; label: string; color: string; id: LotteryTypeId }
  dueNums?: DueNumber[]
  sumDist?: SumDistribution
  balance?: BalanceAnalysis
  pairs?: NumberPair[]
  savePickerMutation: ReturnType<typeof useSavePrediction>
  pickerSaved: boolean
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const maxNumbers = meta.numbers
  const maxNum = meta.range.includes('-') ? parseInt(meta.range.split('-')[1]) : 56

  function toggle(n: number) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(n)) { next.delete(n); return next }
      if (next.size >= maxNumbers) return prev
      next.add(n)
      return next
    })
  }

  function clearAll() { setSelected(new Set()) }

  const numbers = Array.from(selected).sort((a, b) => a - b)
  const complete = numbers.length === maxNumbers

  const sum = numbers.reduce((a, b) => a + b, 0)
  const sumOk = sumDist && complete ? sum >= sumDist.optimalMin && sum <= sumDist.optimalMax : null

  const dueSet = new Set((dueNums ?? []).slice(0, 10).map(d => d.number))
  const dueCount = numbers.filter(n => dueSet.has(n)).length
  const dueOk = complete ? dueCount >= 2 : null

  const odds  = numbers.filter(n => n % 2 !== 0).length
  const evens = numbers.length - odds
  const optOdds = balance?.optimalOddCount ?? Math.round(maxNumbers / 2)
  const balanceOk = complete ? Math.abs(odds - optOdds) <= 1 : null

  const topPairKeys = new Set((pairs ?? []).slice(0, 20).map(p => `${Math.min(p.number1, p.number2)}-${Math.max(p.number1, p.number2)}`))
  const pairCount = complete ? numbers.reduce((acc, n1, i) => {
    for (let j = i + 1; j < numbers.length; j++) {
      const key = `${Math.min(n1, numbers[j])}-${Math.max(n1, numbers[j])}`
      if (topPairKeys.has(key)) acc++
    }
    return acc
  }, 0) : 0
  const pairOk = complete ? pairCount >= 1 : null

  function handleSave() {
    const combo = buildCombo(numbers)
    savePickerMutation.mutate(
      { label: `Mis números (${typeId})`, latestDrawDate: null, lotteryType: typeId, combos: [combo] },
      { onSuccess: () => toast.success('Combinación guardada'), onError: () => toast.error('Error al guardar') },
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Elige tus números</CardTitle>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                Selecciona {maxNumbers} números — el sistema calificará tu combinación en tiempo real.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn('text-sm font-bold tabular-nums', complete ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-500')}>
                {selected.size}/{maxNumbers}
              </span>
              {selected.size > 0 && (
                <Button variant="outline" size="sm" onClick={clearAll}>Limpiar</Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-10 md:grid-cols-14">
            {Array.from({ length: maxNum }, (_, i) => i + 1).map(n => {
              const sel = selected.has(n)
              const due = dueSet.has(n)
              const disabled = !sel && selected.size >= maxNumbers
              return (
                <button
                  key={n}
                  onClick={() => !disabled && toggle(n)}
                  className={cn(
                    'aspect-square rounded-full text-xs font-semibold transition-all select-none',
                    sel
                      ? 'bg-violet-600 text-white ring-2 ring-violet-400 scale-110 shadow-md'
                      : due
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200 hover:bg-amber-200'
                        : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700',
                    disabled && 'opacity-30 cursor-not-allowed',
                  )}
                >
                  {n}
                </button>
              )
            })}
          </div>
          <div className="mt-3 flex items-center gap-4 text-[11px] text-zinc-400">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-amber-200 inline-block"/>
              Pendientes de salir
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-violet-600 inline-block"/>
              Seleccionados
            </span>
          </div>
        </CardContent>
      </Card>

      {complete && (
        <Card>
          <CardHeader>
            <CardTitle>Tu combinación</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              {numbers.map(n => (
                <button
                  key={n}
                  onClick={() => toggle(n)}
                  title="Clic para quitar"
                  className="h-11 w-11 flex items-center justify-center rounded-full bg-violet-600 text-white font-bold text-base hover:bg-violet-700 transition-colors"
                >
                  {n}
                </button>
              ))}
              <span className="self-center ml-1 text-sm font-semibold text-zinc-500 tabular-nums">Σ {sum}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <ScoreItem
                label="Suma"
                value={String(sum)}
                ok={sumOk}
                detail={sumDist ? `Óptimo: ${sumDist.optimalMin}–${sumDist.optimalMax}` : undefined}
              />
              <ScoreItem
                label="Pendientes"
                value={`${dueCount}/${maxNumbers}`}
                ok={dueOk}
                detail="Números con mayor tiempo sin salir"
              />
              <ScoreItem
                label="Par / Impar"
                value={`${evens}p · ${odds}i`}
                ok={balanceOk}
                detail={`Óptimo: ${balance?.optimalOddCount ?? optOdds} impares`}
              />
              <ScoreItem
                label="Pares top"
                value={String(pairCount)}
                ok={pairOk}
                detail="Pares de alta frecuencia histórica"
              />
            </div>

            <Button
              onClick={handleSave}
              disabled={savePickerMutation.isPending || pickerSaved}
              className="w-full sm:w-auto"
            >
              {pickerSaved ? '✓ Guardado en predicciones' : savePickerMutation.isPending ? 'Guardando…' : 'Guardar combinación'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function GamePage() {
  const { id } = useParams<{ id: string }>()
  const typeId = id?.toUpperCase() as LotteryTypeId

  if (!LOTTERY_TYPES.find(t => t.id === typeId)) return <Navigate to="/" replace />

  const meta = getLotteryMeta(typeId)
  const sync = useSync(typeId)
  const { isAdmin } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const fromDate = searchParams.get('from') ?? undefined
  const toDate   = searchParams.get('to')   ?? undefined

  const { data: stats,      isLoading: loadingStats } = useStatistics(typeId, fromDate, toDate)
  const { data: freqs,      isLoading: loadingFreqs } = useFrequencies(typeId)
  const { data: hot,  isLoading: loadingHot  }        = useHotNumbers(typeId, 15)
  const { data: cold, isLoading: loadingCold }        = useColdNumbers(typeId, 15)
  const { data: dueNums,     isLoading: loadingDue }  = useDueNumbers(typeId, 10)
  const { data: balance,     isLoading: loadingBal }  = useBalanceAnalysis(typeId)
  const { data: sumDist,     isLoading: loadingSum }  = useSumDistribution(typeId)
  const { data: chiSq,       isLoading: loadingChi }  = useChiSquare(typeId)
  const { data: positionData, isLoading: loadingPos }  = usePositionAnalysis(typeId)
  const { data: consecutiveData, isLoading: loadingCon } = useConsecutiveAnalysis(typeId)
  const { data: calendarData, isLoading: loadingCal }  = useCalendarFrequency(typeId)
  const { data: pairs } = usePairAnalysis(typeId, 20)
  const saveDueMutation = useSavePrediction()
  const [dueSaved] = useState(false)
  const saveGenMutation = useSavePrediction()
  const [genSavedKey, setGenSavedKey] = useState<string | null>(null)
  const savePickerMutation = useSavePrediction()
  const [pickerSaved] = useState(false)

  function handleSave(key: string, combo: GeneratedCombo, label: string, prefix: string) {
    saveGenMutation.mutate(
      { label: `${prefix} — ${label} (${typeId})`, latestDrawDate: null, combos: [combo], lotteryType: typeId },
      { onSuccess: () => { setGenSavedKey(key); setTimeout(() => setGenSavedKey(null), 2000) } },
    )
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{meta.icon}</span>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{meta.label}</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Rango {meta.range} · {meta.numbers} números
            </p>
          </div>
        </div>
        {isAdmin && (
          <Button variant="outline" size="sm" onClick={() => sync.mutate(undefined, {
            onSuccess: () => toast.success(`${meta.label} sincronizado`),
            onError: (err) => toast.error(`Error: ${err.message}`),
          })} disabled={sync.isPending}>
            {sync.isPending ? <Spinner className="h-4 w-4" /> : null}
            Sincronizar
          </Button>
        )}
      </div>

      <Tabs defaultValue="due">
        <TabsList className="flex-wrap h-auto gap-y-1">
          {/* Vista general */}
          <TabsTrigger value="due">Por salir</TabsTrigger>
          <TabsTrigger value="trend">Tendencia</TabsTrigger>
          <TabsTrigger value="balance">Balance</TabsTrigger>
          <TabsTrigger value="sum">Suma</TabsTrigger>
          <TabsTrigger value="stats">Histórico</TabsTrigger>
          <TabsTrigger value="freqs">Frecuencias</TabsTrigger>
          <TabsTrigger value="hotcold">Cal / Fríos</TabsTrigger>
          {/* Separador visual */}
          <span className="h-5 w-px bg-zinc-300 dark:bg-zinc-600 mx-1 self-center" />
          {/* Análisis avanzado */}
          <TabsTrigger value="pairs">Pares</TabsTrigger>
          <TabsTrigger value="bayesian">Bayesiano</TabsTrigger>
          <TabsTrigger value="backtest">Backtest</TabsTrigger>
          <TabsTrigger value="chisq">Chi²</TabsTrigger>
          <span className="h-5 w-px bg-zinc-300 dark:bg-zinc-600 mx-1 self-center" />
          <TabsTrigger value="position">Posición</TabsTrigger>
          <TabsTrigger value="calendar">Calendario</TabsTrigger>
          <TabsTrigger value="consecutive">Consecutivos</TabsTrigger>
          <TabsTrigger value="picker">Mis números</TabsTrigger>
        </TabsList>

        {/* ── Por salir ── */}
        <TabsContent value="due">
          {loadingDue ? <PageSpinner /> : dueNums && dueNums.length > 0 ? (
            <div className="flex flex-col gap-4">
              <SuggestedCombosCard
                subtitle="Top números con mayor deuda respecto a su intervalo histórico."
                combos={[{
                  key: 'due',
                  title: 'Por salir',
                  desc: `Top ${meta.numbers} con mayor dueScore — llevan más tiempo sin aparecer`,
                  color: '#7c3aed',
                  label: 'Por salir — sugeridos',
                  combo: buildCombo(dueNums.slice(0, meta.numbers).map(d => d.number)),
                }]}
                savedKey={dueSaved ? 'due' : null}
                isPending={saveDueMutation.isPending}
                onSave={(_key, combo, label) => {
                  saveDueMutation.mutate(
                    { label: `${label} (${typeId})`, latestDrawDate: null, lotteryType: typeId, combos: [combo] },
                    { onSuccess: () => toast.success('Combinación guardada'), onError: () => toast.error('Error al guardar') },
                  )
                }}
              />
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Top 10 números pendientes de salir</CardTitle>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Ordenados por <b>dueScore</b> = sorteos sin salir ÷ intervalo promedio.
                    Mayor score significa que el número lleva más tiempo sin aparecer respecto a su frecuencia histórica.
                  </p>
                </CardHeader>
                <CardContent>
                  {dueNums.map((dn, i) => (
                    <DueNumberCard key={dn.number} dn={dn} rank={i + 1} />
                  ))}
                </CardContent>
              </Card>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">Sin datos. Sincroniza primero.</p>
          )}
        </TabsContent>

        {/* ── Tendencia ── */}
        <TabsContent value="trend">
          <WindowedFrequenciesTab typeId={typeId} />
        </TabsContent>

        {/* ── Balance ── */}
        <TabsContent value="balance">
          {loadingBal ? <PageSpinner /> : balance
            ? <BalanceTab balance={balance} typeId={typeId} />
            : <p className="text-sm text-zinc-500">Sin datos. Sincroniza primero.</p>}
        </TabsContent>

        {/* ── Suma ── */}
        <TabsContent value="sum">
          {loadingSum ? <PageSpinner /> : sumDist
            ? <SumDistributionTab dist={sumDist} typeId={typeId} />
            : <p className="text-sm text-zinc-500">Sin datos. Sincroniza primero.</p>}
        </TabsContent>

        {/* ── Resumen ── */}
        <TabsContent value="stats">
          {/* Date range filter — persisted in URL */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">Rango:</span>
            <input
              type="date"
              value={fromDate ?? ''}
              onChange={e => setSearchParams(p => { const n = new URLSearchParams(p); e.target.value ? n.set('from', e.target.value) : n.delete('from'); return n })}
              className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
            <span className="text-xs text-zinc-400">—</span>
            <input
              type="date"
              value={toDate ?? ''}
              onChange={e => setSearchParams(p => { const n = new URLSearchParams(p); e.target.value ? n.set('to', e.target.value) : n.delete('to'); return n })}
              className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
            {(fromDate || toDate) && (
              <button
                onClick={() => setSearchParams(p => { const n = new URLSearchParams(p); n.delete('from'); n.delete('to'); return n })}
                className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 underline"
              >
                Limpiar
              </button>
            )}
            {(fromDate || toDate) && (
              <span className="text-xs text-violet-600 dark:text-violet-400">
                Filtrando · URL compartible
              </span>
            )}
          </div>
          {loadingStats ? <PageSpinner /> : stats ? (
            <div className="flex flex-col gap-4">
              {stats.mostFrequent.length > 0 && (() => {
                const k    = meta.numbers
                const topN = stats.mostFrequent.slice(0, k).map(f => f.number)
                const botN = stats.leastFrequent.slice(0, k).map(f => f.number)
                const mix  = [
                  ...stats.mostFrequent.slice(0, Math.ceil(k / 2)).map(f => f.number),
                  ...stats.leastFrequent.slice(0, Math.floor(k / 2)).map(f => f.number),
                ]
                const combos: SuggestedCombo[] = [
                  { key: 'top',  title: 'Más frecuentes',   desc: `Top ${k} por frecuencia histórica total`,       color: '#7c3aed', label: 'Más frecuentes',   combo: buildCombo(topN) },
                  { key: 'bot',  title: 'Menos frecuentes', desc: `Los ${k} números menos frecuentes — contrarian`, color: '#059669', label: 'Menos frecuentes', combo: buildCombo(botN) },
                  { key: 'mix',  title: 'Mixta',            desc: `${Math.ceil(k/2)} frecuentes + ${Math.floor(k/2)} infrecuentes`, color: '#0284c7', label: 'Mixta', combo: buildCombo(mix) },
                ]
                return (
                  <SuggestedCombosCard
                    subtitle="Basadas en la frecuencia histórica total de cada número."
                    combos={combos}
                    savedKey={genSavedKey}
                    isPending={saveGenMutation.isPending}
                    onSave={(key, combo, label) => handleSave(key, combo, label, 'Histórico')}
                  />
                )
              })()}
              <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                <StatCard label="Total sorteos"   value={formatNumber(stats.totalDraws)} />
                <StatCard label="Primer sorteo"   value={formatDate(stats.firstDrawDate)} />
                <StatCard label="Último sorteo"   value={formatDate(stats.lastDrawDate)} />
                <StatCard label="Sin salir nunca" value={stats.numbersNeverDrawn.length} />
              </div>
              {stats.numbersNeverDrawn.length > 0 && (
                <Card>
                  <CardHeader><CardTitle>Números que nunca han salido</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {stats.numbersNeverDrawn.map(n => (
                        <span key={n} className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 font-semibold text-sm">
                          {n}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              {stats.mostFrequent.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader><CardTitle>Más frecuentes</CardTitle></CardHeader>
                    <CardContent>
                      {stats.mostFrequent.map((nf, i) => <FrequencyRow key={nf.number} nf={nf} rank={i + 1} />)}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle>Menos frecuentes</CardTitle></CardHeader>
                    <CardContent>
                      {stats.leastFrequent.map((nf, i) => <FrequencyRow key={nf.number} nf={nf} rank={i + 1} />)}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          ) : <p className="text-sm text-zinc-500">Sin datos. Sincroniza primero.</p>}
        </TabsContent>

        {/* ── Frecuencias ── */}
        <TabsContent value="freqs">
          {loadingFreqs ? <PageSpinner /> : freqs && freqs.length > 0 ? (
            <div className="flex flex-col gap-4">
              {(() => {
                const k    = meta.numbers
                const sorted = [...freqs].sort((a, b) => b.frequency - a.frequency)
                const topN = sorted.slice(0, k).map(f => f.number)
                const botN = sorted.slice(-k).map(f => f.number)
                const mix  = [
                  ...sorted.slice(0, Math.ceil(k / 2)).map(f => f.number),
                  ...sorted.slice(-Math.floor(k / 2)).map(f => f.number),
                ]
                const combos: SuggestedCombo[] = [
                  { key: 'top', title: 'Más frecuentes',   desc: `Top ${k} con mayor frecuencia acumulada`,         color: '#7c3aed', label: 'Más frecuentes',   combo: buildCombo(topN) },
                  { key: 'bot', title: 'Menos frecuentes', desc: `Los ${k} con menor frecuencia — rebote contrarian`, color: '#059669', label: 'Menos frecuentes', combo: buildCombo(botN) },
                  { key: 'mix', title: 'Mixta',            desc: `${Math.ceil(k/2)} más frecuentes + ${Math.floor(k/2)} menos frecuentes`, color: '#0284c7', label: 'Mixta', combo: buildCombo(mix) },
                ]
                return (
                  <SuggestedCombosCard
                    subtitle="Números seleccionados por frecuencia histórica acumulada."
                    combos={combos}
                    savedKey={genSavedKey}
                    isPending={saveGenMutation.isPending}
                    onSave={(key, combo, label) => handleSave(key, combo, label, 'Frecuencias')}
                  />
                )
              })()}
              <Card>
                <CardHeader>
                  <CardTitle>Mapa de frecuencias</CardTitle>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Color más intenso = mayor frecuencia acumulada. Pasa el cursor para ver el detalle.
                  </p>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const maxFreq = Math.max(...freqs.map(f => f.frequency), 1)
                    const minFreq = Math.min(...freqs.map(f => f.frequency))
                    const freqMap = Object.fromEntries(freqs.map(f => [f.number, f]))
                    const cols = 8
                    const rows = Math.ceil(56 / cols)
                    return (
                      <div
                        className="grid gap-1"
                        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
                      >
                        {Array.from({ length: rows * cols }, (_, i) => i + 1)
                          .filter(n => n <= 56)
                          .map(n => {
                            const nf = freqMap[n]
                            if (!nf) return (
                              <div key={n} className="aspect-square rounded bg-zinc-100 dark:bg-zinc-800 opacity-20" />
                            )
                            const intensity = (nf.frequency - minFreq) / (maxFreq - minFreq)
                            const bg = `rgba(124,58,237,${0.08 + intensity * 0.92})`
                            return (
                              <div
                                key={n}
                                title={`Nº${n}: ${formatNumber(nf.frequency)} apariciones (${nf.percentage.toFixed(1)}%)`}
                                className="aspect-square rounded flex items-center justify-center text-[11px] font-bold cursor-default select-none transition-transform hover:scale-110"
                                style={{ backgroundColor: bg, color: intensity > 0.45 ? 'white' : '#4c1d95' }}
                              >
                                {n}
                              </div>
                            )
                          })}
                      </div>
                    )
                  })()}
                </CardContent>
              </Card>
            </div>
          ) : <p className="text-sm text-zinc-500">Sin datos. Sincroniza primero.</p>}
        </TabsContent>

        {/* ── Calientes / Fríos ── */}
        <TabsContent value="hotcold">
          <div className="flex flex-col gap-4">
            {hot && cold && (() => {
              const k    = meta.numbers
              const hotN = hot.slice(0, k).map(f => f.number)
              const colN = cold.slice(0, k).map(f => f.number)
              const mix  = [
                ...hot.slice(0, Math.ceil(k / 2)).map(f => f.number),
                ...cold.slice(0, Math.floor(k / 2)).map(f => f.number),
              ]
              const combos: SuggestedCombo[] = [
                { key: 'hot', title: 'Calientes',  desc: `Top ${k} números con mayor frecuencia reciente`,        color: '#dc2626', label: 'Calientes',  combo: buildCombo(hotN) },
                { key: 'col', title: 'Fríos',      desc: `Top ${k} números menos frecuentes — candidatos a salir`, color: '#0284c7', label: 'Fríos',      combo: buildCombo(colN) },
                { key: 'mix', title: 'Mixta',      desc: `${Math.ceil(k/2)} calientes + ${Math.floor(k/2)} fríos`, color: '#7c3aed', label: 'Mixta',      combo: buildCombo(mix) },
              ]
              return (
                <SuggestedCombosCard
                  subtitle="Números seleccionados por temperatura de frecuencia reciente."
                  combos={combos}
                  savedKey={genSavedKey}
                  isPending={saveGenMutation.isPending}
                  onSave={(key, combo, label) => handleSave(key, combo, label, 'Cal/Fríos')}
                />
              )
            })()}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Badge variant="hot">Calientes</Badge>Top 15
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingHot
                    ? <div className="flex flex-col gap-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-8 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />)}</div>
                    : hot?.length ? hot.map((nf, i) => <FrequencyRow key={nf.number} nf={nf} rank={i + 1} />) : <p className="text-sm text-zinc-500">Sin datos.</p>}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Badge variant="cold">Fríos</Badge>Top 15
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingCold
                    ? <div className="flex flex-col gap-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-8 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />)}</div>
                    : cold?.length ? cold.map((nf, i) => <FrequencyRow key={nf.number} nf={nf} rank={i + 1} />) : <p className="text-sm text-zinc-500">Sin datos.</p>}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ── Pares ── */}
        <TabsContent value="pairs">
          <PairAnalysisTab typeId={typeId} />
        </TabsContent>

        {/* ── Bayesiano ── */}
        <TabsContent value="bayesian">
          <BayesianTab typeId={typeId} />
        </TabsContent>

        {/* ── Backtest ── */}
        <TabsContent value="backtest">
          <BacktestTab typeId={typeId} defaultK={meta.numbers} />
        </TabsContent>

        {/* ── Chi-cuadrado ── */}
        <TabsContent value="chisq">
          {loadingChi ? <PageSpinner /> : chiSq
            ? <ChiSquareTab result={chiSq} />
            : <p className="text-sm text-zinc-500">Sin datos. Sincroniza primero.</p>}
        </TabsContent>

        {/* ── Análisis por posición ── */}
        <TabsContent value="position">
          {loadingPos ? <PageSpinner /> : positionData
            ? <PositionTab analysis={positionData} />
            : <p className="text-sm text-zinc-500">Sin datos. Sincroniza primero.</p>}
        </TabsContent>

        {/* ── Calendario ── */}
        <TabsContent value="calendar">
          {loadingCal ? <PageSpinner /> : calendarData
            ? <CalendarTab cal={calendarData} />
            : <p className="text-sm text-zinc-500">Sin datos. Sincroniza primero.</p>}
        </TabsContent>

        {/* ── Consecutivos ── */}
        <TabsContent value="consecutive">
          {loadingCon ? <PageSpinner /> : consecutiveData
            ? <ConsecutiveTab analysis={consecutiveData} />
            : <p className="text-sm text-zinc-500">Sin datos. Sincroniza primero.</p>}
        </TabsContent>

        {/* ── Mis números ── */}
        <TabsContent value="picker">
          <NumberPickerTab
            typeId={typeId}
            meta={meta}
            dueNums={dueNums}
            sumDist={sumDist}
            balance={balance}
            pairs={pairs}
            savePickerMutation={savePickerMutation}
            pickerSaved={pickerSaved}
          />
        </TabsContent>

      </Tabs>
    </div>
  )
}
