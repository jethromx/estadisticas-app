import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Bookmark, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useSuggestions,
  useDueNumbers,
  useBayesianAnalysis,
  useWindowedFrequencies,
  useBacktest,
  useSavePrediction,
  useSumDistribution,
} from '@/api/queries'
import { buildCombo } from '@/components/SuggestedCombosCard'
import type { LotteryTypeId, DueNumber, BayesianNumber, WindowedFrequency, SumDistribution } from '@/types/lottery'
import { LOTTERY_TYPES, cn } from '@/lib/utils'

const NUMBERS_PER_DRAW = 6
const ALL_TYPES: LotteryTypeId[] = ['MELATE', 'REVANCHA', 'REVANCHITA']

const SOURCE_COLOR: Record<string, string> = {
  Patrones:        '#7c3aed',
  Rezagados:       '#ef4444',
  Bayesiano:       '#0ea5e9',
  'Frec. Reciente':'#10b981',
  Backtest:        '#f59e0b',
}

const SOURCE_DESC: Record<string, string> = {
  Patrones:        'Mejor combinación según patrones estadísticos históricos',
  Rezagados:       'Números con mayor deuda histórica — llevan más tiempo sin salir',
  Bayesiano:       'Top 6 por probabilidad posterior bayesiana actualizada',
  'Frec. Reciente':'Números con mayor frecuencia en los últimos 100 sorteos',
  Backtest:        'Números predichos por backtesting histórico',
}

interface ComboEntry {
  source: string
  numbers: number[]
}

function SumRangeBar({ sum, dist }: { sum: number; dist: SumDistribution }) {
  const range = dist.maxSum - dist.minSum || 1
  const pctSum  = Math.max(0, Math.min(100, ((sum            - dist.minSum) / range) * 100))
  const pctOptL = Math.max(0, Math.min(100, ((dist.optimalMin - dist.minSum) / range) * 100))
  const pctOptW = Math.max(0, Math.min(100 - pctOptL, ((dist.optimalMax - dist.optimalMin) / range) * 100))
  const inRange = sum >= dist.optimalMin && sum <= dist.optimalMax

  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="relative h-3 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
        <div
          className="absolute top-0 h-full rounded-full bg-emerald-200 dark:bg-emerald-900/60"
          style={{ left: `${pctOptL}%`, width: `${pctOptW}%` }}
        />
        <div
          className={cn('absolute top-0 h-full w-1 rounded-full -translate-x-1/2',
            inRange ? 'bg-emerald-500' : 'bg-amber-400')}
          style={{ left: `${pctSum}%` }}
        />
      </div>
      <div className="flex justify-between text-[9px] tabular-nums text-zinc-400">
        <span>{dist.minSum}</span>
        <span className={cn('font-semibold', inRange ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500')}>
          {inRange ? `✓ óptimo ${dist.optimalMin}–${dist.optimalMax}` : `fuera de ${dist.optimalMin}–${dist.optimalMax}`}
        </span>
        <span>{dist.maxSum}</span>
      </div>
    </div>
  )
}

function ComboCard({
  entry,
  lotteryType,
  index,
  sumDist,
}: {
  entry: ComboEntry
  lotteryType: LotteryTypeId | null
  index: number
  sumDist?: SumDistribution
}) {
  const saveMutation = useSavePrediction()
  const sorted = [...entry.numbers].sort((a, b) => a - b)
  const sum = sorted.reduce((a, b) => a + b, 0)
  const oddCount  = sorted.filter(n => n % 2 !== 0).length
  const evenCount = sorted.length - oddCount
  const color = SOURCE_COLOR[entry.source] ?? '#7c3aed'
  const inRange = sumDist ? sum >= sumDist.optimalMin && sum <= sumDist.optimalMax : null

  function handleSave() {
    const combo = buildCombo(sorted)
    saveMutation.mutate(
      {
        label: `Top #${index + 1} — ${entry.source}`,
        latestDrawDate: null,
        combos: [combo],
        lotteryType: lotteryType ?? null,
      },
      {
        onSuccess: () => toast.success('Combinación guardada'),
        onError: () => toast.error('Error al guardar'),
      },
    )
  }

  return (
    <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-white dark:bg-zinc-900 p-4 flex flex-col gap-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full text-white"
              style={{ background: color }}
            >
              #{index + 1}
            </span>
            <span className="text-sm font-bold text-zinc-800 dark:text-zinc-100">{entry.source}</span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-tight">
            {SOURCE_DESC[entry.source] ?? ''}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="h-7 px-2.5 text-xs shrink-0"
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Bookmark className="h-3 w-3 mr-1" />
          )}
          Guardar
        </Button>
      </div>

      {/* Balls + sum */}
      <div className="flex flex-wrap gap-3 items-center">
        {sorted.map(n => (
          <span
            key={n}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full font-bold text-base text-white shadow-sm"
            style={{ background: color }}
          >
            {n}
          </span>
        ))}
        <div className="ml-auto flex flex-col items-end gap-0.5 shrink-0">
          <span className={cn(
            'text-sm font-bold tabular-nums',
            inRange === true ? 'text-emerald-600 dark:text-emerald-400'
            : inRange === false ? 'text-amber-500'
            : 'text-zinc-600 dark:text-zinc-300',
          )}>
            Σ {sum} {inRange === true ? '✓' : inRange === false ? '~' : ''}
          </span>
          <span className="text-[10px] text-zinc-400">{oddCount}I · {evenCount}P</span>
        </div>
      </div>

      {/* Range bar */}
      {sumDist && <SumRangeBar sum={sum} dist={sumDist} />}
    </div>
  )
}

function ComboCardSkeleton() {
  return (
    <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-white dark:bg-zinc-900 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-7 w-20" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: NUMBERS_PER_DRAW }).map((_, i) => (
          <Skeleton key={i} className="w-11 h-11 rounded-full" />
        ))}
      </div>
      <Skeleton className="h-3 w-full rounded-full" />
    </div>
  )
}

function ComboGrid({ skeletons }: { skeletons: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: skeletons }).map((_, i) => <ComboCardSkeleton key={i} />)}
    </div>
  )
}

function EmptyState() {
  return (
    <p className="text-center text-zinc-500 dark:text-zinc-400 py-12">
      No se pudieron cargar los análisis. Intenta de nuevo más tarde.
    </p>
  )
}

function buildEntriesForType(
  _type: LotteryTypeId,
  suggestions: ReturnType<typeof useSuggestions>['data'],
  dueNumbers: DueNumber[] | undefined,
  bayesian: BayesianNumber[] | undefined,
  windowed: WindowedFrequency[] | undefined,
  backtest: ReturnType<typeof useBacktest>['data'],
): ComboEntry[] {
  const entries: ComboEntry[] = []

  if (suggestions && suggestions.length > 0) {
    const best = [...suggestions].sort((a, b) => b.confidenceScore - a.confidenceScore)[0]
    if (best.suggestedNumbers.length >= NUMBERS_PER_DRAW)
      entries.push({ source: 'Patrones', numbers: best.suggestedNumbers.slice(0, NUMBERS_PER_DRAW) })
  }
  if (dueNumbers && dueNumbers.length >= NUMBERS_PER_DRAW) {
    const top = [...dueNumbers].sort((a, b) => b.dueScore - a.dueScore).slice(0, NUMBERS_PER_DRAW)
    entries.push({ source: 'Rezagados', numbers: top.map(d => d.number) })
  }
  if (bayesian && bayesian.length >= NUMBERS_PER_DRAW) {
    const top = [...bayesian].sort((a, b) => b.posteriorMean - a.posteriorMean).slice(0, NUMBERS_PER_DRAW)
    entries.push({ source: 'Bayesiano', numbers: top.map(d => d.number) })
  }
  if (windowed && windowed.length >= NUMBERS_PER_DRAW) {
    const top = [...windowed].sort((a, b) => b.frequency - a.frequency).slice(0, NUMBERS_PER_DRAW)
    entries.push({ source: 'Frec. Reciente', numbers: top.map(d => d.number) })
  }
  if (backtest && backtest.predictedNumbers.length >= NUMBERS_PER_DRAW) {
    entries.push({ source: 'Backtest', numbers: backtest.predictedNumbers.slice(0, NUMBERS_PER_DRAW) })
  }

  return entries
}

/** Single-type tab */
function TopCombosForType({ type }: { type: LotteryTypeId }) {
  const { data: suggestions, isLoading: l1 } = useSuggestions(type)
  const { data: dueNumbers,  isLoading: l2 } = useDueNumbers(type, 20)
  const { data: bayesian,    isLoading: l3 } = useBayesianAnalysis(type)
  const { data: windowed,    isLoading: l4 } = useWindowedFrequencies(type, 100)
  const { data: backtest,    isLoading: l5 } = useBacktest(type, NUMBERS_PER_DRAW)
  const { data: sumDist }                    = useSumDistribution(type)

  const isLoading = l1 || l2 || l3 || l4 || l5
  const entries = buildEntriesForType(type, suggestions, dueNumbers, bayesian, windowed, backtest)

  if (isLoading) return <ComboGrid skeletons={5} />
  if (entries.length === 0) return <EmptyState />

  return (
    <div className="flex flex-col gap-3">
      {entries.map((entry, i) => (
        <ComboCard key={entry.source} entry={entry} lotteryType={type} index={i} sumDist={sumDist} />
      ))}
    </div>
  )
}

/** Combined tab: aggregates scores across all three types */
function TopCombosAllTypes() {
  const { data: sug1, isLoading: l1a } = useSuggestions('MELATE')
  const { data: due1, isLoading: l1b } = useDueNumbers('MELATE', 20)
  const { data: bay1, isLoading: l1c } = useBayesianAnalysis('MELATE')
  const { data: win1, isLoading: l1d } = useWindowedFrequencies('MELATE', 100)
  const { data: bt1,  isLoading: l1e } = useBacktest('MELATE', NUMBERS_PER_DRAW)
  const { data: sd1 }                  = useSumDistribution('MELATE')

  const { data: sug2, isLoading: l2a } = useSuggestions('REVANCHA')
  const { data: due2, isLoading: l2b } = useDueNumbers('REVANCHA', 20)
  const { data: bay2, isLoading: l2c } = useBayesianAnalysis('REVANCHA')
  const { data: win2, isLoading: l2d } = useWindowedFrequencies('REVANCHA', 100)
  const { data: bt2,  isLoading: l2e } = useBacktest('REVANCHA', NUMBERS_PER_DRAW)
  const { data: sd2 }                  = useSumDistribution('REVANCHA')

  const { data: sug3, isLoading: l3a } = useSuggestions('REVANCHITA')
  const { data: due3, isLoading: l3b } = useDueNumbers('REVANCHITA', 20)
  const { data: bay3, isLoading: l3c } = useBayesianAnalysis('REVANCHITA')
  const { data: win3, isLoading: l3d } = useWindowedFrequencies('REVANCHITA', 100)
  const { data: bt3,  isLoading: l3e } = useBacktest('REVANCHITA', NUMBERS_PER_DRAW)
  const { data: sd3 }                  = useSumDistribution('REVANCHITA')

  const isLoading =
    l1a || l1b || l1c || l1d || l1e ||
    l2a || l2b || l2c || l2d || l2e ||
    l3a || l3b || l3c || l3d || l3e

  // Merge sum distributions into a synthetic one covering all three games
  const mergedSumDist = useMemo((): SumDistribution | undefined => {
    const dists = [sd1, sd2, sd3].filter(Boolean) as SumDistribution[]
    if (!dists.length) return undefined
    return {
      lotteryType:  'MELATE',
      histogram:    {},
      mean:         dists.reduce((a, d) => a + d.mean, 0) / dists.length,
      stdDev:       dists.reduce((a, d) => a + d.stdDev, 0) / dists.length,
      minSum:       Math.min(...dists.map(d => d.minSum)),
      maxSum:       Math.max(...dists.map(d => d.maxSum)),
      optimalMin:   Math.max(...dists.map(d => d.optimalMin)),
      optimalMax:   Math.min(...dists.map(d => d.optimalMax)),
      p25:          dists.reduce((a, d) => a + d.p25, 0) / dists.length,
      p50:          dists.reduce((a, d) => a + d.p50, 0) / dists.length,
      p75:          dists.reduce((a, d) => a + d.p75, 0) / dists.length,
      totalDraws:   dists.reduce((a, d) => a + d.totalDraws, 0),
    }
  }, [sd1, sd2, sd3])

  if (isLoading) return <ComboGrid skeletons={5} />

  const dueScoreMap = new Map<number, number>()
  for (const due of [due1, due2, due3]) {
    for (const d of due ?? []) {
      dueScoreMap.set(d.number, (dueScoreMap.get(d.number) ?? 0) + d.dueScore)
    }
  }

  const bayesMap = new Map<number, number>()
  for (const bay of [bay1, bay2, bay3]) {
    for (const b of bay ?? []) {
      bayesMap.set(b.number, (bayesMap.get(b.number) ?? 0) + b.posteriorMean)
    }
  }

  const windowedMap = new Map<number, number>()
  for (const win of [win1, win2, win3]) {
    for (const w of win ?? []) {
      windowedMap.set(w.number, (windowedMap.get(w.number) ?? 0) + w.frequency)
    }
  }

  const backtestMap = new Map<number, number>()
  for (const bt of [bt1, bt2, bt3]) {
    for (const n of bt?.predictedNumbers ?? []) {
      backtestMap.set(n, (backtestMap.get(n) ?? 0) + 1)
    }
  }

  const allSuggestions = [...(sug1 ?? []), ...(sug2 ?? []), ...(sug3 ?? [])]
  const entries: ComboEntry[] = []

  if (allSuggestions.length > 0) {
    const best = [...allSuggestions].sort((a, b) => b.confidenceScore - a.confidenceScore)[0]
    if (best.suggestedNumbers.length >= NUMBERS_PER_DRAW)
      entries.push({ source: 'Patrones', numbers: best.suggestedNumbers.slice(0, NUMBERS_PER_DRAW) })
  }
  if (dueScoreMap.size >= NUMBERS_PER_DRAW) {
    const top = [...dueScoreMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, NUMBERS_PER_DRAW).map(([n]) => n)
    entries.push({ source: 'Rezagados', numbers: top })
  }
  if (bayesMap.size >= NUMBERS_PER_DRAW) {
    const top = [...bayesMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, NUMBERS_PER_DRAW).map(([n]) => n)
    entries.push({ source: 'Bayesiano', numbers: top })
  }
  if (windowedMap.size >= NUMBERS_PER_DRAW) {
    const top = [...windowedMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, NUMBERS_PER_DRAW).map(([n]) => n)
    entries.push({ source: 'Frec. Reciente', numbers: top })
  }
  if (backtestMap.size >= NUMBERS_PER_DRAW) {
    const top = [...backtestMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, NUMBERS_PER_DRAW).map(([n]) => n)
    entries.push({ source: 'Backtest', numbers: top })
  }

  if (entries.length === 0) return <EmptyState />

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-zinc-500 dark:text-zinc-400 border-l-2 border-violet-400 pl-3">
        Scores agregados de Melate, Revancha y Revanchita. Los números que destacan en los tres juegos reciben mayor peso.
        {mergedSumDist && (
          <> El rango óptimo de suma mostrado combina los tres juegos (<b className="text-zinc-600 dark:text-zinc-300">Σ {mergedSumDist.optimalMin}–{mergedSumDist.optimalMax}</b>).</>
        )}
      </p>
      {entries.map((entry, i) => (
        <ComboCard key={entry.source} entry={entry} lotteryType={null} index={i} sumDist={mergedSumDist} />
      ))}
    </div>
  )
}

export function TopCombosPage() {
  const navigate = useNavigate()

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="-ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Dashboard
        </Button>
      </div>

      <Card className="border-2 border-amber-300 dark:border-amber-700 bg-amber-50/30 dark:bg-amber-900/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
            🏆 Mejores combinaciones
          </CardTitle>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Las combinaciones más prometedoras según nuestros modelos de análisis.
            Cada una proviene de un método distinto: patrones estadísticos, números rezagados,
            análisis bayesiano, frecuencia reciente y backtesting histórico.
          </p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="ALL">
            <TabsList className="mb-5">
              <TabsTrigger value="ALL" className="gap-1.5 font-semibold">
                🌟 Todos
              </TabsTrigger>
              {LOTTERY_TYPES.map(meta => (
                <TabsTrigger key={meta.id} value={meta.id} className="gap-1.5">
                  <span>{meta.icon}</span>
                  {meta.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="ALL">
              <TopCombosAllTypes />
            </TabsContent>

            {ALL_TYPES.map(type => (
              <TabsContent key={type} value={type}>
                <TopCombosForType type={type} />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Method legend */}
      <Card className="border-dashed">
        <CardContent className="pt-5">
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-zinc-500 dark:text-zinc-400">
            {Object.entries(SOURCE_DESC).map(([src, desc]) => (
              <div key={src} className="flex items-start gap-1.5">
                <span
                  className="mt-0.5 h-3 w-3 shrink-0 rounded-full"
                  style={{ background: SOURCE_COLOR[src] }}
                />
                <span><b style={{ color: SOURCE_COLOR[src] }}>{src}:</b> {desc}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
