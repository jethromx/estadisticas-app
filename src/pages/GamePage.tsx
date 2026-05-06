import { useState, useMemo } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts'
import { LOTTERY_TYPES, formatNumber, formatDate, formatPct, getLotteryMeta } from '@/lib/utils'
import {
  useStatistics, useFrequencies, useHotNumbers, useColdNumbers,
  useSuggestions, useDueNumbers, useWindowedFrequencies,
  useBalanceAnalysis, useSumDistribution, useSync,
  usePairAnalysis, useChiSquare, useBacktest, useBayesianAnalysis,
} from '@/api/queries'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner, PageSpinner } from '@/components/ui/spinner'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import type { LotteryTypeId, NumberFrequency, PatternSuggestion, DueNumber, WindowedFrequency, BalanceAnalysis, SumDistribution, NumberPair, ChiSquareResult, BayesianNumber } from '@/types/lottery'

const METHODOLOGY_LABELS: Record<string, string> = {
  HOT_NUMBERS:        'Números Calientes',
  COLD_NUMBERS:       'Números Fríos',
  BALANCED:           'Balanceado',
  STATISTICAL_RANDOM: 'Aleatorio Estadístico',
}

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
          <span>Score: <b className="text-zinc-700 dark:text-zinc-300">{dn.dueScore.toFixed(2)}</b></span>
          <span className="hidden sm:inline">Apariciones: <b className="text-zinc-700 dark:text-zinc-300">{formatNumber(dn.frequency)}</b></span>
        </div>
      </div>
    </div>
  )
}

function SuggestionCard({ s }: { s: PatternSuggestion }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm">{METHODOLOGY_LABELS[s.methodology] ?? s.methodology}</CardTitle>
          <Badge variant={s.confidenceScore >= 0.7 ? 'success' : s.confidenceScore >= 0.4 ? 'warning' : 'secondary'}>
            {Math.round(s.confidenceScore * 100)}%
          </Badge>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{s.description}</p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {s.suggestedNumbers.map(n => (
            <span key={n} className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-violet-600 text-white font-bold text-sm">
              {n}
            </span>
          ))}
          {s.suggestedAdditional != null && (
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-amber-500 text-white font-bold text-sm">
              {s.suggestedAdditional}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
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

function WindowedFrequenciesTab({ typeId }: { typeId: LotteryTypeId }) {
  const [winSize, setWinSize] = useState<number>(100)
  const { data, isLoading } = useWindowedFrequencies(typeId, winSize)

  const chartData = data?.map(wf => ({
    number: wf.number,
    frequency: wf.frequency,
    trend: wf.trend,
  })) ?? []

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

function BalanceTab({ balance }: { balance: BalanceAnalysis }) {
  const totalOdd  = Object.values(balance.oddEvenDistribution).reduce((a, b) => a + b, 0)
  const totalHigh = Object.values(balance.highLowDistribution).reduce((a, b) => a + b, 0)

  return (
    <div className="grid gap-4 md:grid-cols-2">
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
        <CardHeader><CardTitle>Combinación recomendada</CardTitle></CardHeader>
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

function SumDistributionTab({ dist }: { dist: SumDistribution }) {
  const chartData = Object.entries(dist.histogram).map(([k, v]) => ({
    sum: Number(k),
    frequency: Number(v),
    inOptimal: Number(k) >= dist.optimalMin && Number(k) <= dist.optimalMax,
  }))

  return (
    <div className="flex flex-col gap-4">
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
        <StatCard label="p-valor" value={result.pValue < 0.0001 ? '< 0.0001' : result.pValue.toFixed(5)} />
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
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
            <StatCard label="Sorteos evaluados" value={formatNumber(data.totalDrawsTested)} />
            <StatCard label="Aciertos promedio" value={data.avgMatches.toFixed(2)} />
            <StatCard label="Tasa de acierto" value={`${(data.hitRate * 100).toFixed(1)}%`} />
            <StatCard label="Tasa aleatoria" value={`${(data.expectedRandomRate * 100).toFixed(1)}%`} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Números predichos (top {data.topK} más frecuentes)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {data.predictedNumbers.map(n => (
                  <span key={n} className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-violet-600 text-white font-bold text-sm">
                    {n}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

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
              <CardHeader><CardTitle>Mayor lift positivo (↑ tendencia)</CardTitle></CardHeader>
              <CardContent>
                {[...(data ?? [])].sort((a: BayesianNumber, b: BayesianNumber) => b.lift - a.lift).slice(0, 10).map((bn: BayesianNumber) => (
                  <div key={bn.number} className="flex items-center gap-2 py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                    <span className="w-8 h-8 flex items-center justify-center rounded-full bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300 font-bold text-sm shrink-0">
                      {bn.number}
                    </span>
                    <div className="flex-1 text-xs text-zinc-600 dark:text-zinc-400">
                      <span>Post: <b className="text-violet-700 dark:text-violet-300">{(bn.posteriorMean * 1000).toFixed(3)}</b></span>
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

// ── Sugerencias enriquecidas ─────────────────────────────────────────────────

function SignalBadge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold leading-none ${color}`}>
      {label}
    </span>
  )
}

function EnrichedSuggestionsTab({ typeId, meta }: { typeId: LotteryTypeId; meta: ReturnType<typeof getLotteryMeta> }) {
  const { data: suggestions,  isLoading: loadingSug  } = useSuggestions(typeId)
  const { data: dueAll,       isLoading: loadingDue  } = useDueNumbers(typeId, 56)
  const { data: bayesian,     isLoading: loadingBay  } = useBayesianAnalysis(typeId, 50)
  const { data: balance,      isLoading: loadingBal  } = useBalanceAnalysis(typeId)
  const { data: sumDist,      isLoading: loadingSum  } = useSumDistribution(typeId)
  const { data: chiSq,        isLoading: loadingChi  } = useChiSquare(typeId)
  const { data: backtest,     isLoading: loadingBt   } = useBacktest(typeId, meta.numbers, 100)

  const loading = loadingDue || loadingBay || loadingBal || loadingSum

  const integratedPick = useMemo(() => {
    if (!bayesian?.length || !dueAll?.length || !balance || !sumDist) return null

    const dueMap = new Map(dueAll.map(d => [d.number, d]))
    const maxDue  = Math.max(...dueAll.map(d => d.dueScore), 0.01)
    const maxLift = Math.max(...bayesian.filter(b => b.lift > 0).map(b => b.lift), 0.01)

    const scored = bayesian.map(b => {
      const due = dueMap.get(b.number)
      const normDue  = (due?.dueScore ?? 0) / maxDue
      const normLift = Math.max(b.lift, 0) / maxLift
      return {
        number:   b.number,
        score:    normDue * 0.55 + normLift * 0.30 + b.posteriorMean * 0.15,
        dueScore: due?.dueScore ?? 0,
        lift:     b.lift,
      }
    }).sort((a, b) => b.score - a.score)

    const targetOdd  = balance.optimalOddCount
    const targetEven = balance.optimalEvenCount
    const odds  = scored.filter(s => s.number % 2 !== 0)
    const evens = scored.filter(s => s.number % 2 === 0)

    const picked = [
      ...odds.slice(0, targetOdd),
      ...evens.slice(0, targetEven),
    ].sort((a, b) => a.number - b.number)

    const numbers   = picked.map(p => p.number)
    const sum       = numbers.reduce((a, b) => a + b, 0)
    const inRange   = sum >= sumDist.optimalMin && sum <= sumDist.optimalMax
    const oddCount  = numbers.filter(n => n % 2 !== 0).length

    return { numbers, sum, inRange, oddCount, evenCount: numbers.length - oddCount, details: picked }
  }, [bayesian, dueAll, balance, sumDist])

  if (loading) return <PageSpinner />
  if (!integratedPick) return <p className="text-sm text-zinc-500">Sin datos. Sincroniza primero.</p>

  const { numbers, sum, inRange, oddCount, evenCount, details } = integratedPick

  return (
    <div className="flex flex-col gap-5">

      {/* ── Selección Inteligente ── */}
      <Card>
        <CardHeader>
          <CardTitle>Selección Inteligente</CardTitle>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Algoritmo ponderado: pendiente de salir <b>55%</b> · tendencia bayesiana <b>30%</b> · frecuencia histórica <b>15%</b> ·
            balance {balance?.optimalOddCount}imp+{balance?.optimalEvenCount}par · suma óptima {sumDist?.optimalMin}–{sumDist?.optimalMax}
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {/* Números */}
          <div className="flex flex-wrap gap-4 justify-center sm:justify-start">
            {details.map(d => (
              <div key={d.number} className="flex flex-col items-center gap-1.5">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-violet-600 text-white font-bold text-lg shadow">
                  {d.number}
                </span>
                <div className="flex flex-col items-center gap-0.5">
                  {d.dueScore >= 1.5 && <SignalBadge label="Vencido" color="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" />}
                  {d.dueScore >= 1.0 && d.dueScore < 1.5 && <SignalBadge label="Pendiente" color="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" />}
                  {d.lift >= 5 && <SignalBadge label={`+${d.lift.toFixed(0)}%`} color="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" />}
                  {d.lift < -5 && <SignalBadge label={`${d.lift.toFixed(0)}%`} color="bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400" />}
                </div>
              </div>
            ))}
          </div>

          {/* Métricas de la combinación */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className={`rounded-lg p-3 ${inRange ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-amber-50 dark:bg-amber-900/20'}`}>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Suma total</p>
              <p className={`text-xl font-bold ${inRange ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-600'}`}>{sum}</p>
              <p className="text-xs text-zinc-400 mt-0.5">
                {inRange ? `✓ rango ${sumDist?.optimalMin}–${sumDist?.optimalMax}` : `⚠ fuera de ${sumDist?.optimalMin}–${sumDist?.optimalMax}`}
              </p>
            </div>
            <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/60 p-3">
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Balance</p>
              <p className="text-xl font-bold text-zinc-800 dark:text-zinc-100">{oddCount}I · {evenCount}P</p>
              <p className="text-xs text-zinc-400 mt-0.5">óptimo {balance?.optimalOddCount}I·{balance?.optimalEvenCount}P</p>
            </div>
            <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/60 p-3">
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Señales</p>
              <p className="text-xl font-bold text-violet-700 dark:text-violet-300">
                {details.filter(d => d.dueScore >= 1.0 || d.lift >= 5).length}/{numbers.length}
              </p>
              <p className="text-xs text-zinc-400 mt-0.5">con señal activa</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Contexto estadístico ── */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm">Distribución histórica (Chi²)</CardTitle></CardHeader>
          <CardContent>
            {loadingChi || !chiSq ? (
              <p className="text-xs text-zinc-400">Cargando…</p>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant={chiSq.pValue < 0.05 ? 'warning' : 'success'}>
                    {chiSq.pValue < 0.001 ? 'p < 0.001' : `p = ${chiSq.pValue.toFixed(4)}`}
                  </Badge>
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">χ² = {chiSq.chiSquare.toFixed(1)}</span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{chiSq.interpretation}</p>
                {chiSq.pValue < 0.05 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    ℹ️ Al haber sesgos estadísticos, la Selección Inteligente puede tener ventaja sobre la selección aleatoria.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Rendimiento histórico (Backtest)</CardTitle></CardHeader>
          <CardContent>
            {loadingBt || !backtest ? (
              <p className="text-xs text-zinc-400">Cargando…</p>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant={backtest.hitRate > backtest.expectedRandomRate ? 'success' : 'secondary'}>
                    {(backtest.hitRate * 100).toFixed(1)}% hit rate
                  </Badge>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    vs {(backtest.expectedRandomRate * 100).toFixed(1)}% aleatorio
                  </span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Apostando siempre a los <b>{backtest.topK}</b> números más frecuentes,
                  habrías acertado <b>{backtest.avgMatches.toFixed(2)}</b> números por sorteo en promedio
                  (sobre {formatNumber(backtest.totalDrawsTested)} sorteos).
                </p>
                <div className="flex gap-4 text-xs">
                  <span className={backtest.hitRate > backtest.expectedRandomRate ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-zinc-400'}>
                    {backtest.hitRate > backtest.expectedRandomRate ? '✓ Supera el azar' : '✗ Bajo el azar'}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Sugerencias clásicas ── */}
      <div>
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
          Algoritmos clásicos
        </p>
        {loadingSug ? <PageSpinner /> : suggestions?.length ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {suggestions.map(s => <SuggestionCard key={s.methodology} s={s} />)}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">Sin sugerencias. Sincroniza primero.</p>
        )}
      </div>

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

  const { data: stats,      isLoading: loadingStats } = useStatistics(typeId)
  const { data: freqs,      isLoading: loadingFreqs } = useFrequencies(typeId)
  const { data: hot,  isLoading: loadingHot  }        = useHotNumbers(typeId, 15)
  const { data: cold, isLoading: loadingCold }        = useColdNumbers(typeId, 15)
  const { data: dueNums,     isLoading: loadingDue }  = useDueNumbers(typeId, 10)
  const { data: balance,     isLoading: loadingBal }  = useBalanceAnalysis(typeId)
  const { data: sumDist,     isLoading: loadingSum }  = useSumDistribution(typeId)
  const { data: chiSq,       isLoading: loadingChi }  = useChiSquare(typeId)

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
        <Button variant="outline" size="sm" onClick={() => sync.mutate()} disabled={sync.isPending}>
          {sync.isPending ? <Spinner className="h-4 w-4" /> : null}
          Sincronizar
        </Button>
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
          <TabsTrigger value="suggestions">Sugerencias</TabsTrigger>
        </TabsList>

        {/* ── Por salir ── */}
        <TabsContent value="due">
          {loadingDue ? <PageSpinner /> : dueNums && dueNums.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
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
              <Card className="md:col-span-2">
                <CardHeader><CardTitle>Números sugeridos para el próximo sorteo</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    {dueNums.slice(0, meta.numbers).map(dn => (
                      <div key={dn.number} className="flex flex-col items-center gap-1">
                        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-violet-600 text-white font-bold text-lg">
                          {dn.number}
                        </span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          c/{dn.avgInterval.toFixed(1)}
                        </span>
                      </div>
                    ))}
                  </div>
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
            ? <BalanceTab balance={balance} />
            : <p className="text-sm text-zinc-500">Sin datos. Sincroniza primero.</p>}
        </TabsContent>

        {/* ── Suma ── */}
        <TabsContent value="sum">
          {loadingSum ? <PageSpinner /> : sumDist
            ? <SumDistributionTab dist={sumDist} />
            : <p className="text-sm text-zinc-500">Sin datos. Sincroniza primero.</p>}
        </TabsContent>

        {/* ── Resumen ── */}
        <TabsContent value="stats">
          {loadingStats ? <PageSpinner /> : stats ? (
            <div className="flex flex-col gap-4">
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
            <Card>
              <CardHeader><CardTitle>Frecuencia por número</CardTitle></CardHeader>
              <CardContent className="px-2 sm:px-5">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={freqs} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <XAxis dataKey="number" tick={{ fontSize: 10 }} interval={Math.ceil(freqs.length / 15) - 1} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={((v: unknown) => [formatNumber(Number(v ?? 0)), 'Apariciones']) as never}
                      labelFormatter={(l) => `Número ${l}`}
                    />
                    <Bar dataKey="frequency" radius={[3, 3, 0, 0]}>
                      {freqs.map((nf) => (
                        <Cell key={nf.number} fill={nf.percentage > (100 / freqs.length) * 1.2 ? '#7c3aed' : '#a78bfa'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ) : <p className="text-sm text-zinc-500">Sin datos. Sincroniza primero.</p>}
        </TabsContent>

        {/* ── Calientes / Fríos ── */}
        <TabsContent value="hotcold">
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

        {/* ── Sugerencias ── */}
        <TabsContent value="suggestions">
          <EnrichedSuggestionsTab typeId={typeId} meta={meta} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
