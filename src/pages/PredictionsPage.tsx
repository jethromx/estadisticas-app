import { useState, useRef, useCallback } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  useSavedPredictions, useDeletePrediction,
  useAnalyzePrediction, useDrawResults,
} from '@/api/queries'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Tooltip as Tip } from '@/components/ui/tooltip'
import { CombinationGenerator } from '@/components/CombinationGenerator'
import { cn } from '@/lib/utils'
import type {
  LotteryTypeId, DrawResult, SavedPredictionSet, PredictionAccuracyResult,
} from '@/types/lottery'

const GAMES: LotteryTypeId[] = ['MELATE', 'REVANCHA', 'REVANCHITA']

const GAME_LABELS: Record<string, string> = {
  MELATE: 'Melate', REVANCHA: 'Revancha', REVANCHITA: 'Revanchita',
}

interface LookupResult {
  numbers: number[]
  sum: number
  odds: number
  matches: { game: string; draw: DrawResult }[]
}

function ComboLookup({ drawsMap }: { drawsMap: Record<string, DrawResult[]> }) {
  const [cells, setCells] = useState<string[]>(['', '', '', '', '', ''])
  const [result, setResult] = useState<LookupResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Per-cell error flags derived from current state
  const filledNums = cells.map(Number).filter((n, i) => cells[i] !== '')
  const duplicates = new Set(
    filledNums.filter((n, i) => filledNums.indexOf(n) !== i)
  )
  const cellErrors = cells.map((val, i) => {
    if (val === '') return false
    const n = Number(val)
    if (n < 1 || n > 56) return true
    if (duplicates.has(n)) return true
    return false
  })
  const hasInlineErrors = cellErrors.some(Boolean)

  function handleCellChange(idx: number, raw: string) {
    const val = raw.replace(/\D/g, '').slice(0, 2)
    const next = cells.slice()
    next[idx] = val
    setCells(next)
    setResult(null)
    setError(null)
    if (val.length === 2 && idx < 5) inputRefs.current[idx + 1]?.focus()
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && cells[idx] === '' && idx > 0) {
      inputRefs.current[idx - 1]?.focus()
    }
    if (e.key === 'Enter') search()
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const nums = e.clipboardData.getData('text').split(/[\s,]+/).map(Number).filter(n => n >= 1 && n <= 56)
    if (nums.length >= 6) {
      setCells(nums.slice(0, 6).map(String))
      inputRefs.current[5]?.focus()
    }
  }

  function search() {
    const nums = cells.map(Number)
    if (nums.some(n => n < 1 || n > 56)) { setError('Hay números fuera del rango 1–56'); return }
    if (new Set(nums).size !== 6)         { setError('Hay números repetidos'); return }

    const sorted = [...nums].sort((a, b) => a - b)
    const key    = sorted.join('-')
    const matches: { game: string; draw: DrawResult }[] = []

    Object.entries(drawsMap).forEach(([game, draws]) => {
      draws?.forEach(draw => {
        if ([...draw.numbers].sort((a, b) => a - b).join('-') === key)
          matches.push({ game, draw })
      })
    })

    setResult({
      numbers: sorted,
      sum:  sorted.reduce((a, b) => a + b, 0),
      odds: sorted.filter(n => n % 2 !== 0).length,
      matches,
    })
    setError(null)
  }

  function reset() {
    setCells(['', '', '', '', '', ''])
    setResult(null)
    setError(null)
    inputRefs.current[0]?.focus()
  }

  const outOfRange = cells.some(v => v !== '' && (Number(v) < 1 || Number(v) > 56))
  const hasDuplicates = duplicates.size > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          🔎 Consultar combinación
        </CardTitle>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Ingresa 6 números (1–56) para ver si esa combinación exacta ya salió en sorteos anteriores.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Input cells */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {cells.map((val, i) => (
              <input
                key={i}
                ref={el => { inputRefs.current[i] = el }}
                type="text"
                inputMode="numeric"
                value={val}
                onChange={e => handleCellChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                onPaste={i === 0 ? handlePaste : undefined}
                placeholder={(i + 1).toString()}
                className={cn(
                  'h-11 w-11 rounded-full border text-center font-bold text-sm outline-none transition-colors',
                  'bg-white dark:bg-zinc-900',
                  cellErrors[i]
                    ? 'border-red-400 dark:border-red-500 text-red-600 dark:text-red-400 ring-2 ring-red-200 dark:ring-red-900/40'
                    : 'border-zinc-200 dark:border-zinc-700 focus:border-violet-400 dark:focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:focus:ring-violet-900/40',
                  val && !cellErrors[i] ? 'text-zinc-800 dark:text-zinc-100' : '',
                  !val ? 'text-zinc-300 dark:text-zinc-600' : '',
                )}
                maxLength={2}
              />
            ))}
          </div>

          {/* Inline hints */}
          {(outOfRange || hasDuplicates) && (
            <div className="flex flex-col gap-0.5">
              {outOfRange && (
                <p className="text-xs text-red-500 dark:text-red-400">Los números deben estar entre 1 y 56.</p>
              )}
              {hasDuplicates && (
                <p className="text-xs text-red-500 dark:text-red-400">No puede haber números repetidos.</p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={search}
            disabled={cells.some(c => c === '') || hasInlineErrors}
            className="rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 transition-colors"
          >
            Buscar
          </button>
          {result && (
            <button
              onClick={reset}
              className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 underline underline-offset-2"
            >
              Limpiar
            </button>
          )}
        </div>

        {error && (
          <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
        )}

        {result && (
          <div className="flex flex-col gap-3 pt-1">
            {/* Numbers display */}
            <div className="flex gap-2 flex-wrap">
              {result.numbers.map(n => (
                <span
                  key={n}
                  className={cn(
                    'inline-flex h-10 w-10 items-center justify-center rounded-full font-bold text-sm text-white',
                    result.matches.length > 0
                      ? 'bg-orange-500'
                      : n % 2 !== 0
                      ? 'bg-violet-500'
                      : 'bg-sky-500',
                  )}
                >
                  {n}
                </span>
              ))}
              <div className="flex flex-col justify-center ml-2 gap-0.5">
                <span className="text-xs text-zinc-500">Σ <b className="text-zinc-700 dark:text-zinc-200">{result.sum}</b></span>
                <span className="text-xs text-zinc-500">{result.odds}I · {6 - result.odds}P</span>
              </div>
            </div>

            {/* Match result */}
            {result.matches.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-4 py-3">
                <span className="text-emerald-600 dark:text-emerald-400 text-base">✓</span>
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  Esta combinación <b>nunca ha sido sorteada</b> en el histórico disponible.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 px-4 py-3">
                  <span className="text-orange-500 text-base">⚠</span>
                  <p className="text-sm font-medium text-orange-700 dark:text-orange-300">
                    Esta combinación <b>ya fue sorteada {result.matches.length} {result.matches.length === 1 ? 'vez' : 'veces'}</b>.
                  </p>
                </div>
                <div className="flex flex-col gap-1.5">
                  {result.matches.map(({ game, draw }, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 text-xs">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300 w-24 shrink-0">
                        {GAME_LABELS[game] ?? game}
                      </span>
                      <span className="text-zinc-500 dark:text-zinc-400">
                        Sorteo #{draw.drawNumber}
                      </span>
                      <span className="text-zinc-400 dark:text-zinc-500">
                        {new Date(draw.drawDate).toLocaleDateString('es-MX', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function PredictionsPage() {
  const { data: savedSets = [], isLoading: savedSetsLoading } = useSavedPredictions()

  const { data: drawsMelate     } = useDrawResults('MELATE')
  const { data: drawsRevancha   } = useDrawResults('REVANCHA')
  const { data: drawsRevanchita } = useDrawResults('REVANCHITA')

  const drawsMap: Record<string, DrawResult[]> = {
    MELATE:     drawsMelate     ?? [],
    REVANCHA:   drawsRevancha   ?? [],
    REVANCHITA: drawsRevanchita ?? [],
  }

  const deleteMutation  = useDeletePrediction()
  const analyzeMutation = useAnalyzePrediction()

  const listRef = useRef<HTMLDivElement>(null)
  const [expandedSetId,  setExpandedSetId]  = useState<string | null>(null)
  const [analysisResults, setAnalysisResults] = useState<Record<string, PredictionAccuracyResult>>({})
  const [analysisErrors,  setAnalysisErrors]  = useState<Record<string, string>>({})
  const [analyzingId,     setAnalyzingId]     = useState<string | null>(null)

  function deleteSet(id: string) {
    deleteMutation.mutate(id)
    if (expandedSetId === id) setExpandedSetId(null)
  }

  function analyzeSet(id: string, syncFirst = false) {
    setAnalyzingId(id)
    setAnalysisErrors(prev => { const n = { ...prev }; delete n[id]; return n })
    analyzeMutation.mutate(
      { id, syncFirst },
      {
        onSuccess: (result) => setAnalysisResults(prev => ({ ...prev, [id]: result })),
        onError:   (err)    => setAnalysisErrors(prev => ({ ...prev, [id]: err instanceof Error ? err.message : 'Error al analizar' })),
        onSettled: ()       => setAnalyzingId(null),
      },
    )
  }

  const virtualizer = useVirtualizer({
    count: savedSets.length,
    getScrollElement: () => listRef.current,
    estimateSize: useCallback((i: number) =>
      expandedSetId === savedSets[i]?.id ? 420 : 72
    , [expandedSetId, savedSets]),
    overscan: 3,
  })

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">

      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Predicciones</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Genera combinaciones con el análisis estadístico cruzado de Melate, Revancha y Revanchita,
          guárdalas y compáralas con los sorteos posteriores.
        </p>
      </div>

      {/* Generator */}
      <CombinationGenerator />

      {/* Manual combo lookup */}
      <ComboLookup drawsMap={drawsMap} />

      {/* Saved predictions header */}
      <div className="flex items-center gap-3 pt-2">
        <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          Predicciones guardadas
        </span>
        <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
      </div>

      {/* Empty state */}
      {!savedSetsLoading && savedSets.length === 0 && (
        <p className="text-center text-sm text-zinc-400 dark:text-zinc-500 py-4">
          Aún no hay predicciones guardadas. Genera una arriba y pulsa "Guardar predicción".
        </p>
      )}

      {/* Skeleton while loading */}
      {savedSetsLoading && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-14 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
          ))}
        </div>
      )}

      {/* Prediction cards — virtualised */}
      {!savedSetsLoading && savedSets.length > 0 && (
        <div
          ref={listRef}
          className="overflow-y-auto rounded-xl"
          style={{ maxHeight: '72vh' }}
        >
          <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
            {virtualizer.getVirtualItems().map(virtualRow => {
              const set = savedSets[virtualRow.index]
              const allNewDraws = GAMES.flatMap(g =>
                (drawsMap[g] ?? []).filter(d => !set.latestDrawDate || d.drawDate > set.latestDrawDate),
              )
              const isExpanded = expandedSetId === set.id

              return (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                    paddingBottom: '12px',
                  }}
                >
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden bg-white dark:bg-zinc-900">
            {/* Set header */}
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50">
              <button
                className="flex-1 flex items-center gap-3 text-left"
                onClick={() => setExpandedSetId(isExpanded ? null : set.id)}
              >
                <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{set.label}</span>
                <span className="text-[10px] text-zinc-400">
                  {new Date(set.savedAt).toLocaleString('es-MX', {
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </span>
                {allNewDraws.length > 0 ? (
                  <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded-full">
                    {allNewDraws.length} sorteo{allNewDraws.length !== 1 ? 's' : ''} nuevo{allNewDraws.length !== 1 ? 's' : ''}
                  </span>
                ) : (
                  <span className="text-[10px] text-zinc-400">sin sorteos nuevos aún</span>
                )}
                <span className="ml-auto text-zinc-400 text-xs">{isExpanded ? '▲' : '▼'}</span>
              </button>
              <button
                onClick={() => analyzeSet(set.id)}
                disabled={analyzingId === set.id}
                className="ml-3 rounded-lg border border-violet-200 dark:border-violet-800 px-2.5 py-1 text-[11px] font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/30 disabled:opacity-50 transition-colors"
                title="Analizar precisión vs sorteos posteriores"
              >
                {analyzingId === set.id ? '…' : '⚡ Analizar'}
              </button>
              <button
                onClick={() => deleteSet(set.id)}
                className="ml-1 text-zinc-300 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 transition-colors text-base"
                title="Eliminar predicción"
              >
                🗑
              </button>
            </div>

            {/* Combos */}
            {isExpanded && (
              <div className="px-4 py-3 flex flex-col gap-3">
                {set.combos.map((combo, ci) => {
                  let bestMatches = 0
                  let bestDraw: DrawResult | null = null
                  const everMatched = new Set<number>()

                  allNewDraws.forEach(draw => {
                    const matched = combo.numbers.filter(n => draw.numbers.includes(n))
                    matched.forEach(n => everMatched.add(n))
                    if (matched.length > bestMatches) {
                      bestMatches = matched.length
                      bestDraw = draw
                    }
                  })

                  return (
                    <div key={ci} className="flex items-center gap-3 flex-wrap">
                      <span className="text-[10px] text-zinc-400 w-5 shrink-0">#{ci + 1}</span>
                      <div className="flex gap-1.5 flex-wrap flex-1">
                        {combo.numbers.map(n => (
                          <span
                            key={n}
                            className={cn(
                              'inline-flex h-9 w-9 items-center justify-center rounded-full font-bold text-sm shadow-sm',
                              allNewDraws.length === 0
                                ? (n % 2 !== 0
                                  ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300'
                                  : 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300')
                                : everMatched.has(n)
                                ? 'bg-emerald-500 text-white'
                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500',
                            )}
                          >
                            {n}
                          </span>
                        ))}
                      </div>
                      {allNewDraws.length > 0 && (
                        <Tip
                          content={bestDraw
                            ? `Mejor sorteo: #${(bestDraw as DrawResult).drawNumber} (${(bestDraw as DrawResult).drawDate}) — ${bestMatches} de 6 aciertos`
                            : 'Sin coincidencias en sorteos posteriores'}
                          side="top"
                        >
                          <span className={cn(
                            'text-sm font-bold cursor-help px-2.5 py-1 rounded-full tabular-nums',
                            bestMatches >= 4 ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' :
                            bestMatches >= 3 ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' :
                            bestMatches >= 2 ? 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300' :
                            'bg-zinc-100 dark:bg-zinc-800 text-zinc-500',
                          )}>
                            {bestMatches}/6
                          </span>
                        </Tip>
                      )}
                    </div>
                  )
                })}

                {allNewDraws.length > 0 && (() => {
                  const best = Math.max(...set.combos.map(combo => {
                    let max = 0
                    allNewDraws.forEach(draw => {
                      const m = combo.numbers.filter(n => draw.numbers.includes(n)).length
                      if (m > max) max = m
                    })
                    return max
                  }))
                  return (
                    <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                      <span>Mejor acierto en este grupo:</span>
                      <span className={cn(
                        'font-bold',
                        best >= 4 ? 'text-emerald-600' : best >= 3 ? 'text-amber-600' : best >= 2 ? 'text-sky-600' : 'text-zinc-400',
                      )}>
                        {best}/6
                      </span>
                      <span>en {allNewDraws.length} sorteo{allNewDraws.length !== 1 ? 's' : ''}</span>
                    </div>
                  )
                })()}
              </div>
            )}

            {/* Analysis error */}
            {analysisErrors[set.id] && (
              <div className="border-t border-red-100 dark:border-red-900/40 bg-red-50/50 dark:bg-red-900/10 px-4 py-3">
                <p className="text-xs text-red-600 dark:text-red-400">⚠ {analysisErrors[set.id]}</p>
              </div>
            )}

            {/* Analysis panel */}
            {analysisResults[set.id] && (() => {
              const r = analysisResults[set.id]
              return (
                <div className="border-t border-violet-100 dark:border-violet-900/40 bg-violet-50/50 dark:bg-violet-900/10 px-4 py-4 flex flex-col gap-4">
                  <div className="flex flex-wrap gap-4">
                    <div className="flex flex-col items-center rounded-xl bg-white dark:bg-zinc-900 border border-violet-100 dark:border-violet-900/40 px-4 py-2 min-w-[80px]">
                      <span className="text-xl font-bold text-violet-600 dark:text-violet-400">{r.drawsAnalyzed}</span>
                      <span className="text-[10px] text-zinc-400 text-center">sorteos<br/>analizados</span>
                    </div>
                    <div className="flex flex-col items-center rounded-xl bg-white dark:bg-zinc-900 border border-emerald-100 dark:border-emerald-900/40 px-4 py-2 min-w-[80px]">
                      <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{r.bestMatchCount}/6</span>
                      <span className="text-[10px] text-zinc-400 text-center">mejor<br/>acierto</span>
                    </div>
                    <div className="flex flex-col items-center rounded-xl bg-white dark:bg-zinc-900 border border-sky-100 dark:border-sky-900/40 px-4 py-2 min-w-[80px]">
                      <span className="text-xl font-bold text-sky-600 dark:text-sky-400">{r.averageMatchCount.toFixed(1)}</span>
                      <span className="text-[10px] text-zinc-400 text-center">promedio<br/>por combo</span>
                    </div>
                    <div className="flex flex-col items-center rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 px-4 py-2 min-w-[80px]">
                      <span className="text-xl font-bold text-zinc-500">{r.worstMatchCount}/6</span>
                      <span className="text-[10px] text-zinc-400 text-center">peor<br/>acierto</span>
                    </div>
                  </div>

                  {r.drawsAnalyzed > 0 && r.comboDetails.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-500 dark:text-violet-400">Detalle por combinación</p>
                      {r.comboDetails.map((detail, ci) => {
                        const pct = r.bestMatchCount > 0 ? detail.bestMatchCount / 6 : 0
                        return (
                          <div key={ci} className="flex items-center gap-3 flex-wrap">
                            <div className="flex gap-1">
                              {detail.comboNumbers.map(n => (
                                <span
                                  key={n}
                                  className={cn(
                                    'inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold',
                                    detail.bestMatchCount >= 4 ? 'bg-emerald-500 text-white' :
                                    detail.bestMatchCount >= 3 ? 'bg-amber-400 text-white' :
                                    detail.bestMatchCount >= 2 ? 'bg-sky-400 text-white' :
                                    'bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400',
                                  )}
                                >{n}</span>
                              ))}
                            </div>
                            <div className="flex-1 min-w-[100px]">
                              <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                                <div
                                  className={cn('h-full rounded-full transition-all',
                                    pct >= 0.67 ? 'bg-emerald-500' : pct >= 0.5 ? 'bg-amber-400' : pct >= 0.33 ? 'bg-sky-400' : 'bg-zinc-300 dark:bg-zinc-600'
                                  )}
                                  style={{ width: `${Math.round(pct * 100)}%` }}
                                />
                              </div>
                            </div>
                            <span className="text-xs font-mono text-zinc-500 w-10 text-right">
                              {detail.bestMatchCount}/6 · ø{detail.averageMatchCount.toFixed(1)}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {r.improvementSuggestions.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-500 dark:text-violet-400">Sugerencias</p>
                      {r.improvementSuggestions.map((s, i) => (
                        <p key={i} className="text-xs text-zinc-600 dark:text-zinc-300 flex gap-2">
                          <span className="text-violet-400 shrink-0">›</span>{s}
                        </p>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => analyzeSet(set.id, true)}
                    disabled={analyzingId === set.id}
                    className="self-start text-[11px] text-violet-500 hover:text-violet-700 dark:hover:text-violet-300 disabled:opacity-50 underline underline-offset-2"
                  >
                    {analyzingId === set.id ? 'Analizando…' : '↺ Sincronizar sorteos y re-analizar'}
                  </button>
                </div>
              )
            })()}
          </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
