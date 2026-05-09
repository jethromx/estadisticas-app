import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  useDueNumbers, useWindowedFrequencies, useSumDistribution,
  useDrawResults, usePairAnalysis, useBacktest,
  useBayesianAnalysis, useSavePrediction,
} from '@/api/queries'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { PageSpinner } from '@/components/ui/spinner'
import { Tooltip as Tip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type {
  LotteryTypeId, DueNumber, DrawResult, WindowedFrequency,
  SumDistribution, NumberPair, BacktestResult, BayesianNumber,
  GenWeights, GeneratedCombo,
} from '@/types/lottery'

// ── Constants ──────────────────────────────────────────────────────────────────

const GAMES: LotteryTypeId[] = ['MELATE', 'REVANCHA', 'REVANCHITA']

const WEIGHT_LABELS: Record<keyof GenWeights, string> = {
  due: 'Por salir', bayes: 'Bayesiano', arima: 'ARIMA',
  backtest: 'Backtest', pairs: 'Co-ocurrencia', consensus: 'Consenso',
}
const WEIGHT_COLORS: Record<keyof GenWeights, string> = {
  due: '#f59e0b', bayes: '#8b5cf6', arima: '#ec4899',
  backtest: '#0ea5e9', pairs: '#10b981', consensus: '#7c3aed',
}

// ── Scoring helpers ────────────────────────────────────────────────────────────

interface NumberScore {
  number: number
  consensusScore: number
  gamesInTop10: number
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

// ── Component ──────────────────────────────────────────────────────────────────

export function CombinationGenerator() {
  // ── Data fetching ────────────────────────────────────────────────────────────
  const { data: dueMelate,     isLoading: l1 } = useDueNumbers('MELATE',     56)
  const { data: dueRevancha,   isLoading: l2 } = useDueNumbers('REVANCHA',   56)
  const { data: dueRevanchita, isLoading: l3 } = useDueNumbers('REVANCHITA', 56)

  const { data: wfMelate     } = useWindowedFrequencies('MELATE',     100)
  const { data: wfRevancha   } = useWindowedFrequencies('REVANCHA',   100)
  const { data: wfRevanchita } = useWindowedFrequencies('REVANCHITA', 100)

  const { data: wf50Melate,      isLoading: la1 } = useWindowedFrequencies('MELATE',      50)
  const { data: wf300Melate,     isLoading: la2 } = useWindowedFrequencies('MELATE',     300)
  const { data: wf50Revancha,    isLoading: la3 } = useWindowedFrequencies('REVANCHA',    50)
  const { data: wf300Revancha,   isLoading: la4 } = useWindowedFrequencies('REVANCHA',   300)
  const { data: wf50Revanchita,  isLoading: la5 } = useWindowedFrequencies('REVANCHITA',  50)
  const { data: wf300Revanchita, isLoading: la6 } = useWindowedFrequencies('REVANCHITA', 300)

  const { data: sumMelate     } = useSumDistribution('MELATE')
  const { data: sumRevancha   } = useSumDistribution('REVANCHA')
  const { data: sumRevanchita } = useSumDistribution('REVANCHITA')

  const { data: drawsMelate     } = useDrawResults('MELATE')
  const { data: drawsRevancha   } = useDrawResults('REVANCHA')
  const { data: drawsRevanchita } = useDrawResults('REVANCHITA')

  const { data: pairsMelate     } = usePairAnalysis('MELATE',     15)
  const { data: pairsRevancha   } = usePairAnalysis('REVANCHA',   15)
  const { data: pairsRevanchita } = usePairAnalysis('REVANCHITA', 15)

  const { data: btMelate     } = useBacktest('MELATE',     6, 100)
  const { data: btRevancha   } = useBacktest('REVANCHA',   6, 100)
  const { data: btRevanchita } = useBacktest('REVANCHITA', 6, 100)

  const { data: bayMelate     } = useBayesianAnalysis('MELATE',     50)
  const { data: bayRevancha   } = useBayesianAnalysis('REVANCHA',   50)
  const { data: bayRevanchita } = useBayesianAnalysis('REVANCHITA', 50)

  const saveMutation = useSavePrediction()

  // ── Derived data ─────────────────────────────────────────────────────────────

  const dueMap: Record<string, DueNumber[]> = {
    MELATE: dueMelate ?? [], REVANCHA: dueRevancha ?? [], REVANCHITA: dueRevanchita ?? [],
  }
  const trendMap: Record<string, WindowedFrequency[]> = {
    MELATE: wfMelate ?? [], REVANCHA: wfRevancha ?? [], REVANCHITA: wfRevanchita ?? [],
  }
  const sumMap: Record<string, SumDistribution | undefined> = {
    MELATE: sumMelate, REVANCHA: sumRevancha, REVANCHITA: sumRevanchita,
  }
  const drawsMap: Record<string, DrawResult[]> = {
    MELATE: drawsMelate ?? [], REVANCHA: drawsRevancha ?? [], REVANCHITA: drawsRevanchita ?? [],
  }
  const pairsMap: Record<string, NumberPair[] | undefined> = {
    MELATE: pairsMelate, REVANCHA: pairsRevancha, REVANCHITA: pairsRevanchita,
  }
  const backtestMap: Record<string, BacktestResult | undefined> = {
    MELATE: btMelate, REVANCHA: btRevancha, REVANCHITA: btRevanchita,
  }
  const bayesMap: Record<string, BayesianNumber[] | undefined> = {
    MELATE: bayMelate, REVANCHA: bayRevancha, REVANCHITA: bayRevanchita,
  }

  const coreLoading = l1 || l2 || l3
  const arimaLoading = la1 || la2 || la3 || la4 || la5 || la6

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
        const oldest = Math.max(f(300) - f(100), 0)
        const recent = Math.max(f(50), 0)
        result[game][num] = Math.max(recent + (recent - oldest) / 2, 0)
      }
    }
    return result
  }, [
    wf50Melate, wfMelate, wf300Melate,
    wf50Revancha, wfRevancha, wf300Revancha,
    wf50Revanchita, wfRevanchita, wf300Revanchita,
  ])

  const arimaReady = Object.keys(arimaForecasts).length > 0

  const rankedScores = useMemo(() => {
    const hasData = GAMES.every(g => dueMap[g].length > 0 && trendMap[g].length > 0)
    if (!hasData) return []
    return [...computeScores(dueMap, trendMap)].sort((a, b) => b.consensusScore - a.consensusScore)
  }, [dueMelate, dueRevancha, dueRevanchita, wfMelate, wfRevancha, wfRevanchita]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── UI state ─────────────────────────────────────────────────────────────────

  const [weights, setWeights] = useState<GenWeights>({
    due: 70, bayes: 80, arima: 50, backtest: 65, pairs: 40, consensus: 75,
  })
  const [numCombos,    setNumCombos]    = useState(5)
  const [balance,      setBalance]      = useState<'3+3' | '4+2' | '2+4' | 'libre'>('3+3')
  const [sigmaStrict,  setSigmaStrict]  = useState(true)
  const [diversity,    setDiversity]    = useState(65)
  const [excludeDrawn, setExcludeDrawn] = useState(true)
  const [results,      setResults]      = useState<GeneratedCombo[]>([])
  const [generated,    setGenerated]    = useState(false)

  // ── Derived UI values ─────────────────────────────────────────────────────────

  const drawnSets = useMemo(() => {
    const s = new Set<string>()
    GAMES.forEach(g => {
      drawsMap[g]?.forEach(d => {
        s.add([...d.numbers].sort((a, b) => a - b).join('-'))
      })
    })
    return s
  }, [drawsMap]) // eslint-disable-line react-hooks/exhaustive-deps

  const opt = useMemo(() => {
    const arr = GAMES.map(g => sumMap[g]).filter(Boolean) as SumDistribution[]
    return {
      sMin:   arr.length ? Math.max(...arr.map(d => d.optimalMin)) : 0,
      sMax:   arr.length ? Math.min(...arr.map(d => d.optimalMax)) : 999,
      absMin: arr.length ? Math.min(...arr.map(d => d.minSum)) : 21,
      absMax: arr.length ? Math.max(...arr.map(d => d.maxSum)) : 336,
    }
  }, [sumMelate, sumRevancha, sumRevanchita]) // eslint-disable-line react-hooks/exhaustive-deps

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
      due:       dueRaw[n] / maxDue,
      bayes:     bayesRaw[n] / maxBayes,
      arima:     arimaRaw[n] / maxArima,
      backtest:  GAMES.filter(g => backtestMap[g]?.predictedNumbers.includes(n)).length / GAMES.length,
      pairs:     GAMES.reduce((acc, g) => acc + (pairsMap[g]?.slice(0, 10).some(p => p.number1 === n || p.number2 === n) ? 1 : 0), 0) / GAMES.length,
      consensus: 0,
    }))

    return raw.map(s => {
      const idx = rankedScores.findIndex(r => r.number === s.n)
      return { ...s, consensus: idx >= 0 ? 1 - idx / (raw.length - 1) : 0 }
    })
  }, [rankedScores, bayesMap, dueMap, backtestMap, pairsMap, arimaForecasts]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ──────────────────────────────────────────────────────────────────

  function saveCurrentResults() {
    if (!results.length) return
    const latestDrawDate = GAMES
      .flatMap(g => drawsMap[g] ?? [])
      .map(d => d.drawDate)
      .sort()
      .at(-1) ?? null
    saveMutation.mutate(
      {
        label: `Predicción ${new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}`,
        latestDrawDate,
        combos: results,
        lotteryType: GAMES[0],
        generationParams: { weights, numCombos, balance, sigmaStrict, diversity, excludeDrawn, sumMin: opt.sMin, sumMax: opt.sMax, games: GAMES },
      },
      { onSuccess: () => toast.success('Predicción guardada — ver en Predicciones'), onError: () => toast.error('Error al guardar') },
    )
  }

  function generate() {
    const { sMin, sMax } = opt
    const totalW = Math.max(
      weights.due + weights.bayes + weights.arima + weights.backtest + weights.pairs + weights.consensus, 1,
    )
    function wscore(s: typeof baseScores[0]): number {
      return (s.due * weights.due + s.bayes * weights.bayes + s.arima * weights.arima +
        s.backtest * weights.backtest + s.pairs * weights.pairs + s.consensus * weights.consensus) / totalW
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
    const isDrawn = (combo: number[]) =>
      excludeDrawn && drawnSets.has([...combo].sort((a, b) => a - b).join('-'))

    for (let iter = 0; iter < numCombos; iter++) {
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
          if (isDrawn(combo)) continue
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
        const filtered = excludeDrawn ? pool.filter(c => !isDrawn(c)) : pool
        const src = filtered.length > 0 ? filtered : pool
        return src.reduce((best, c) => {
          return c.reduce((a, n) => a + (scoreMap[n] ?? 0), 0) > best.reduce((a, n) => a + (scoreMap[n] ?? 0), 0) ? c : best
        }, src[0] ?? [])
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
        numbers: final, sum,
        inRange:  sum >= sMin && sum <= sMax,
        wasDrawn: drawnSets.has(final.join('-')),
        scores: { due: avgS('due'), bayes: avgS('bayes'), arima: avgS('arima'), backtest: avgS('backtest'), pairs: avgS('pairs'), consensus: avgS('consensus') },
      })
    }
    setResults(combos)
    setGenerated(true)
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  if (coreLoading) return <PageSpinner />

  const { sMin, sMax, absMin, absMax } = opt

  return (
    <div className="flex flex-col gap-6">

      {/* Config card */}
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
                        {key === 'arima' && arimaLoading && (
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
                  <button onClick={() => setNumCombos(v => Math.max(1, v - 1))}
                    className="w-7 h-7 rounded-md border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-bold flex items-center justify-center">−</button>
                  <span className="w-8 text-center font-bold text-zinc-800 dark:text-zinc-200 tabular-nums text-sm">{numCombos}</span>
                  <button onClick={() => setNumCombos(v => Math.min(10, v + 1))}
                    className="w-7 h-7 rounded-md border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-bold flex items-center justify-center">+</button>
                </div>
              </div>

              {/* Balance */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-500 dark:text-zinc-400">Balance I/P</label>
                <div className="flex gap-1">
                  {(['3+3', '4+2', '2+4', 'libre'] as const).map(b => (
                    <button key={b} onClick={() => setBalance(b)}
                      className={cn('px-2.5 py-1 rounded-md text-xs font-medium border transition-colors',
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
                    <button key={String(strict)} onClick={() => setSigmaStrict(strict)}
                      className={cn('px-2.5 py-1 rounded-md text-xs font-medium border transition-colors',
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
                <Tip content="Penaliza números que ya aparecieron en combinaciones anteriores, forzando mayor variedad entre combinaciones." side="top">
                  <div className="flex items-center justify-between w-full cursor-help">
                    <label className="text-xs text-zinc-500 dark:text-zinc-400">Diversidad</label>
                    <span className="text-xs font-bold tabular-nums text-violet-600">{diversity}%</span>
                  </div>
                </Tip>
                <input type="range" min={0} max={100} step={5} value={diversity}
                  onChange={e => setDiversity(Number(e.target.value))}
                  className="w-full h-1.5 accent-violet-600" />
              </div>

            </div>

            {/* Exclude drawn toggle */}
            <Tip
              content={`Omite combinaciones que ya aparecieron en el histórico. ${drawnSets.size > 0 ? `${drawnSets.size.toLocaleString()} combinaciones históricas cargadas.` : 'Cargando histórico…'}`}
              side="top"
            >
              <button type="button" onClick={() => setExcludeDrawn(v => !v)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors cursor-help',
                  excludeDrawn
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300'
                    : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400',
                )}
              >
                <span className={cn('w-9 h-5 rounded-full transition-colors flex items-center shrink-0',
                  excludeDrawn ? 'bg-violet-500' : 'bg-zinc-300 dark:bg-zinc-600',
                )}>
                  <span className={cn('w-4 h-4 rounded-full bg-white shadow transition-transform mx-0.5',
                    excludeDrawn ? 'translate-x-4' : 'translate-x-0',
                  )} />
                </span>
                <span>
                  Omitir combinaciones ya sorteadas
                  {drawnSets.size > 0 && (
                    <span className="ml-1 text-[10px] font-normal opacity-60">
                      ({drawnSets.size.toLocaleString()} en histórico)
                    </span>
                  )}
                </span>
              </button>
            </Tip>

            {/* Generate button */}
            <button onClick={generate}
              className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white font-bold text-sm transition-colors">
              🎲 Generar {numCombos} combinación{numCombos !== 1 ? 'es' : ''}
            </button>

          </div>
        </CardContent>
      </Card>

      {/* Results */}
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
              {/* Save button */}
              <div className="flex items-center gap-3">
                <button onClick={saveCurrentResults} disabled={saveMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-violet-300 dark:border-violet-700 text-violet-600 dark:text-violet-400 text-xs font-medium hover:bg-violet-50 dark:hover:bg-violet-900/20 disabled:opacity-50 transition-colors">
                  {saveMutation.isPending ? '…' : '💾 Guardar predicción'}
                </button>
              </div>

              {results.map((combo, idx) => {
                const totalSpan = absMax - absMin || 1
                const pctSum  = Math.max(0, Math.min(100, ((combo.sum  - absMin) / totalSpan) * 100))
                const pctOptL = Math.max(0, Math.min(100, ((sMin - absMin) / totalSpan) * 100))
                const pctOptW = Math.max(0, Math.min(100 - pctOptL, ((sMax - sMin) / totalSpan) * 100))

                return (
                  <div key={idx} className={cn(
                    'rounded-xl border p-4 flex flex-col gap-3',
                    combo.inRange
                      ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-900/10'
                      : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900',
                  )}>
                    {/* Header row */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 w-5 shrink-0">#{idx + 1}</span>
                      <div className="flex flex-wrap gap-1.5 flex-1">
                        {[...combo.numbers].sort((a, b) => a - b).map(n => (
                          <span key={n}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full font-bold text-base text-white shadow-sm"
                            style={{ background: n % 2 !== 0 ? '#7c3aed' : '#0ea5e9' }}>
                            {n}
                          </span>
                        ))}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {combo.scores.consensus > 0 && (
                          <span className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold',
                            combo.scores.consensus >= 0.66 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                              : combo.scores.consensus >= 0.33 ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
                              : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
                          )}>
                            IA {Math.min(100, Math.round(combo.scores.consensus * 100))}%
                          </span>
                        )}
                        <Tip content={`Suma de los 6 números. Rango óptimo: ${sMin}–${sMax}. ${combo.inRange ? '✓ Dentro del rango' : '⚠ Fuera del rango'}`}>
                          <span className={cn('text-sm font-bold tabular-nums cursor-help',
                            combo.inRange ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500')}>
                            Σ {combo.sum} {combo.inRange ? '✓' : '~'}
                          </span>
                        </Tip>
                        {combo.wasDrawn && (
                          <Tip content="Esta combinación ya apareció en el histórico de sorteos." side="top">
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 cursor-help">
                              ya sorteada
                            </span>
                          </Tip>
                        )}
                        <button onClick={() => navigator.clipboard?.writeText(combo.numbers.join(' - '))}
                          className="text-[10px] text-zinc-400 hover:text-violet-500 transition-colors">
                          📋 copiar
                        </button>
                      </div>
                    </div>

                    {/* Σ range bar */}
                    <div className="flex flex-col gap-0.5">
                      <div className="relative h-2.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                        <div className="absolute top-0 h-full rounded-full bg-emerald-200 dark:bg-emerald-900/60"
                          style={{ left: `${pctOptL}%`, width: `${pctOptW}%` }} />
                        <div className={cn('absolute top-0 h-full w-1 rounded-full -translate-x-1/2',
                          combo.inRange ? 'bg-emerald-500' : 'bg-amber-400')}
                          style={{ left: `${pctSum}%` }} />
                      </div>
                      <div className="flex justify-between text-[9px] text-zinc-400 tabular-nums">
                        <span>{absMin}</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">óptimo {sMin}–{sMax}</span>
                        <span>{absMax}</span>
                      </div>
                    </div>

                    {/* Per-analysis score breakdown */}
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                      {(Object.keys(combo.scores) as (keyof GenWeights)[]).map(key => {
                        const val = combo.scores[key]
                        return (
                          <Tip key={key} content={`${WEIGHT_LABELS[key]}: score promedio ${(val * 100).toFixed(0)}% · peso ${weights[key]}%`}>
                            <div className="flex flex-col items-center gap-1 cursor-help w-full">
                              <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                                <div className="h-1.5 rounded-full"
                                  style={{ width: `${val * 100}%`, background: WEIGHT_COLORS[key] }} />
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
