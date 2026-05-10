import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Bookmark, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useSuggestions,
  useDueNumbers,
  useBayesianAnalysis,
  useWindowedFrequencies,
  useBacktest,
  useSavePrediction,
} from '@/api/queries'
import { buildCombo } from '@/components/SuggestedCombosCard'
import type { LotteryTypeId, DueNumber, BayesianNumber, WindowedFrequency } from '@/types/lottery'
import { LOTTERY_TYPES } from '@/lib/utils'

const NUMBERS_PER_DRAW = 6
const ALL_TYPES: LotteryTypeId[] = ['MELATE', 'REVANCHA', 'REVANCHITA']


function Ball({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/50 text-violet-800 dark:text-violet-200 text-sm font-bold tabular-nums">
      {String(n).padStart(2, '0')}
    </span>
  )
}

function SourceBadge({ label }: { label: string }) {
  return (
    <span className="text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300">
      {label}
    </span>
  )
}

interface ComboEntry {
  source: string
  numbers: number[]
}

function ComboCard({
  entry,
  lotteryType,
  index,
}: {
  entry: ComboEntry
  lotteryType: LotteryTypeId | null
  index: number
}) {
  const saveMutation = useSavePrediction()
  const sorted = [...entry.numbers].sort((a, b) => a - b)
  const sum = sorted.reduce((a, b) => a + b, 0)

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
    <Card className="border border-violet-200 dark:border-violet-800">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-zinc-500 dark:text-zinc-400">#{index + 1}</span>
            <SourceBadge label={entry.source} />
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="h-7 px-2.5 text-xs"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Bookmark className="h-3 w-3 mr-1" />
            )}
            Guardar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="flex flex-wrap gap-1.5 mb-2">
          {sorted.map(n => <Ball key={n} n={n} />)}
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Suma: <strong>{sum}</strong></p>
      </CardContent>
    </Card>
  )
}

function ComboCardSkeleton() {
  return (
    <Card className="border border-zinc-200 dark:border-zinc-700">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-7 w-20" />
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="flex gap-1.5 mb-2">
          {Array.from({ length: NUMBERS_PER_DRAW }).map((_, i) => (
            <Skeleton key={i} className="w-8 h-8 rounded-full" />
          ))}
        </div>
        <Skeleton className="h-3 w-16" />
      </CardContent>
    </Card>
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
  const { data: dueNumbers, isLoading: l2 } = useDueNumbers(type, 20)
  const { data: bayesian, isLoading: l3 } = useBayesianAnalysis(type)
  const { data: windowed, isLoading: l4 } = useWindowedFrequencies(type, 100)
  const { data: backtest, isLoading: l5 } = useBacktest(type, NUMBERS_PER_DRAW)

  const isLoading = l1 || l2 || l3 || l4 || l5
  const entries = buildEntriesForType(type, suggestions, dueNumbers, bayesian, windowed, backtest)

  if (isLoading) return <ComboGrid skeletons={5} />
  if (entries.length === 0) return <EmptyState />

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {entries.map((entry, i) => (
        <ComboCard key={entry.source} entry={entry} lotteryType={type} index={i} />
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

  const { data: sug2, isLoading: l2a } = useSuggestions('REVANCHA')
  const { data: due2, isLoading: l2b } = useDueNumbers('REVANCHA', 20)
  const { data: bay2, isLoading: l2c } = useBayesianAnalysis('REVANCHA')
  const { data: win2, isLoading: l2d } = useWindowedFrequencies('REVANCHA', 100)
  const { data: bt2,  isLoading: l2e } = useBacktest('REVANCHA', NUMBERS_PER_DRAW)

  const { data: sug3, isLoading: l3a } = useSuggestions('REVANCHITA')
  const { data: due3, isLoading: l3b } = useDueNumbers('REVANCHITA', 20)
  const { data: bay3, isLoading: l3c } = useBayesianAnalysis('REVANCHITA')
  const { data: win3, isLoading: l3d } = useWindowedFrequencies('REVANCHITA', 100)
  const { data: bt3,  isLoading: l3e } = useBacktest('REVANCHITA', NUMBERS_PER_DRAW)

  const isLoading =
    l1a || l1b || l1c || l1d || l1e ||
    l2a || l2b || l2c || l2d || l2e ||
    l3a || l3b || l3c || l3d || l3e

  if (isLoading) return <ComboGrid skeletons={5} />

  // Aggregate dueScore per number across all 3 types
  const dueScoreMap = new Map<number, number>()
  for (const due of [due1, due2, due3]) {
    for (const d of due ?? []) {
      dueScoreMap.set(d.number, (dueScoreMap.get(d.number) ?? 0) + d.dueScore)
    }
  }

  // Aggregate posteriorMean per number across all 3 types
  const bayesMap = new Map<number, number>()
  for (const bay of [bay1, bay2, bay3]) {
    for (const b of bay ?? []) {
      bayesMap.set(b.number, (bayesMap.get(b.number) ?? 0) + b.posteriorMean)
    }
  }

  // Aggregate windowed frequency per number across all 3 types
  const windowedMap = new Map<number, number>()
  for (const win of [win1, win2, win3]) {
    for (const w of win ?? []) {
      windowedMap.set(w.number, (windowedMap.get(w.number) ?? 0) + w.frequency)
    }
  }

  // Aggregate backtest appearances: numbers that appear in more type backtests rank higher
  const backtestMap = new Map<number, number>()
  for (const bt of [bt1, bt2, bt3]) {
    for (const n of bt?.predictedNumbers ?? []) {
      backtestMap.set(n, (backtestMap.get(n) ?? 0) + 1)
    }
  }

  // Best suggestion across all 3 types (highest confidenceScore)
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
    <div className="space-y-4">
      <p className="text-xs text-zinc-500 dark:text-zinc-400 border-l-2 border-violet-400 pl-3">
        Scores agregados de Melate, Revancha y Revanchita. Los números que destacan en los tres juegos reciben mayor peso.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((entry, i) => (
          <ComboCard key={entry.source} entry={entry} lotteryType={null} index={i} />
        ))}
      </div>
    </div>
  )
}

function ComboGrid({ skeletons }: { skeletons: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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

export function TopCombosPage() {
  const navigate = useNavigate()

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="-ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Dashboard
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Mejores combinaciones
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Las 5 combinaciones más prometedoras según nuestros modelos de análisis
        </p>
      </div>

      <Card className="border-violet-200 dark:border-violet-800 bg-violet-50/40 dark:bg-violet-900/10">
        <CardContent className="px-4 py-3">
          <p className="text-xs text-violet-700 dark:text-violet-300">
            Cada combinación proviene de un modelo distinto: patrones estadísticos, números rezagados,
            análisis bayesiano, frecuencia reciente y backtesting histórico. La pestaña <strong>Todos</strong> agrega
            los scores de los tres juegos para mostrar los números que más destacan globalmente.
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="ALL">
        <TabsList className="mb-4">
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
    </div>
  )
}
