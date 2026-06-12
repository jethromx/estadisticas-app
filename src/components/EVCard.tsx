import { Link } from 'react-router-dom'
import { TrendingUp, Users, Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip as Tip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useEVPrediction, useLatestDraw } from '@/api/queries'
import type { EVComboAnalysis, LotteryTypeId } from '@/types/lottery'

const mxnCompact = new Intl.NumberFormat('es-MX', {
  style: 'currency', currency: 'MXN', notation: 'compact', maximumFractionDigits: 1,
})
const mxn = new Intl.NumberFormat('es-MX', {
  style: 'currency', currency: 'MXN', maximumFractionDigits: 2,
})

function popularityLabel(score: number): { text: string; cls: string } {
  if (score < 0.2)  return { text: 'Muy impopular ✓', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' }
  if (score < 0.35) return { text: 'Impopular ✓',     cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' }
  if (score < 0.5)  return { text: 'Neutral',          cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' }
  return { text: 'Popular ⚠', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' }
}

function ComboBalls({ combo }: { combo: number[] }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {combo.map(n => (
        <span
          key={n}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full font-bold text-sm text-white shadow-sm bg-emerald-600 dark:bg-emerald-700"
        >
          {n}
        </span>
      ))}
    </div>
  )
}

function avgEvRatio(combos: EVComboAnalysis[]): number | null {
  const ratios = combos.map(c => c.evRatio).filter((r): r is number => r != null)
  if (ratios.length === 0) return null
  return ratios.reduce((a, b) => a + b, 0) / ratios.length
}

export function EVCard({ type = 'MELATE' as LotteryTypeId }: { type?: LotteryTypeId }) {
  const { data: lastDraw } = useLatestDraw(type)
  const jackpot = lastDraw?.jackpotAmount ?? null
  const { data: ev, isLoading, isError } = useEVPrediction(type, jackpot)

  // El servicio ML es opcional: si no está corriendo, la card no aparece.
  if (isError) return null
  if (isLoading) return <div className="h-40 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
  if (!ev) return null

  const optimized = ev.evOptimizedCombo
  const pop = popularityLabel(optimized.popularityScore)
  const modelAvg = avgEvRatio(ev.combos)
  const evGainPct = modelAvg && optimized.evRatio
    ? Math.round((optimized.evRatio / modelAvg - 1) * 100)
    : null

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
            💰 Valor esperado de esta semana
            <span className="text-xs font-normal text-zinc-400">· {type}</span>
          </CardTitle>
          {jackpot != null && jackpot > 0 && (
            <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
              Bolsa {mxnCompact.format(jackpot)}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {/* Combo EV-optimizado */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Combo EV-optimizado
            </p>
            <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold', pop.cls)}>
              {pop.text}
            </span>
            <Tip content="Los 6 números menos populares entre los mejor rankeados por el modelo. Si ganas, compartes el premio con menos gente.">
              <Info className="h-3.5 w-3.5 text-zinc-400 cursor-help" />
            </Tip>
          </div>
          <ComboBalls combo={optimized.combo} />
        </div>

        {/* Métricas EV (solo con bolsa conocida) */}
        {optimized.evRatio != null ? (
          <div className="grid grid-cols-3 gap-2 border-t border-zinc-100 dark:border-zinc-800 pt-3">
            <div className="text-center">
              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
                {Math.round(optimized.evRatio * 100)}%
              </p>
              <p className="text-[10px] uppercase tracking-wider text-zinc-400">EV del boleto</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-sky-700 dark:text-sky-300 tabular-nums">
                {mxn.format(optimized.evJackpotOnly ?? 0)}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-zinc-400">EV en pesos</p>
            </div>
            <div className="text-center">
              {evGainPct != null && evGainPct > 0 ? (
                <>
                  <p className="text-lg font-bold text-violet-700 dark:text-violet-300 tabular-nums flex items-center justify-center gap-1">
                    <TrendingUp className="h-4 w-4" />+{evGainPct}%
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-400">vs combo típico</p>
                </>
              ) : (
                <>
                  <p className="text-lg font-bold text-zinc-700 dark:text-zinc-300 tabular-nums flex items-center justify-center gap-1">
                    <Users className="h-4 w-4" />
                    {(optimized.expectedCoWinners ?? 0).toFixed(2)}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-400">co-ganadores esp.</p>
                </>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs text-zinc-400 border-t border-zinc-100 dark:border-zinc-800 pt-3">
            Bolsa no disponible para el último sorteo — se muestra solo el análisis de popularidad.
          </p>
        )}

        <p className="text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg px-3 py-2">
          La popularidad no cambia tu probabilidad de ganar (1 en {Math.round(1 / ev.pJackpot / 1e6)} millones) —
          reduce cuánto compartirías el premio. Jugar combos impopulares es la única ventaja matemática real.
          {' '}<Link to="/predicciones" className="text-violet-600 dark:text-violet-400 hover:underline">Generar predicción →</Link>
        </p>
      </CardContent>
    </Card>
  )
}
