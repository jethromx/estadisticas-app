import { useState } from 'react'
import { TrendingUp, Target, Ticket, Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip as Tip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { usePortfolioPrediction, useLatestDraw } from '@/api/queries'
import type { EVComboAnalysis, LotteryTypeId } from '@/types/lottery'

const mxnCompact = new Intl.NumberFormat('es-MX', {
  style: 'currency', currency: 'MXN', notation: 'compact', maximumFractionDigits: 1,
})
const mxn = new Intl.NumberFormat('es-MX', {
  style: 'currency', currency: 'MXN', maximumFractionDigits: 0,
})

const TICKET_OPTIONS = [3, 5, 10] as const

/**
 * Participación estimada (boletos en juego) a partir de la bolsa.
 * Modelo calibrado con datos reales de ganadores (scripts/calibrate_participation.py,
 * 33 sorteos, jun 2026): tickets ≈ 835k + 0.0008 × bolsa, r=0.50.
 * El Melate vende ~1M boletos (hasta ~1.6M en bolsas enormes) — NO decenas de
 * millones; por eso el edge de impopularidad es real pero modesto.
 */
function estimateTicketsSold(jackpot: number | null): number {
  const base = 835_000
  if (!jackpot || jackpot <= 0) return base
  return Math.round(base + 0.0008 * jackpot) // $300M → ~1.06M · $1,000M → ~1.6M
}

function popularityBadge(score: number): { text: string; cls: string } {
  if (score < 0.2)  return { text: 'Muy impopular ✓', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' }
  if (score < 0.35) return { text: 'Impopular ✓',     cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' }
  if (score < 0.5)  return { text: 'Neutral',          cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' }
  return { text: 'Popular ⚠', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' }
}

function TicketRow({ ticket, index }: { ticket: EVComboAnalysis; index: number }) {
  const pop = popularityBadge(ticket.popularityScore)
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 px-2.5 py-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold text-zinc-400 w-5">#{index + 1}</span>
        <div className="flex gap-1 flex-wrap">
          {ticket.combo.map(n => (
            <span
              key={n}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full font-bold text-xs text-white bg-emerald-600 dark:bg-emerald-700"
            >
              {n}
            </span>
          ))}
        </div>
      </div>
      <span className={cn('shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold', pop.cls)}>
        {pop.text}
      </span>
    </div>
  )
}

export function PortfolioCard({ type = 'MELATE' as LotteryTypeId }: { type?: LotteryTypeId }) {
  const [nTickets, setNTickets] = useState<number>(5)
  const { data: lastDraw } = useLatestDraw(type)
  const jackpot = lastDraw?.jackpotAmount ?? null
  const ticketsSold = estimateTicketsSold(jackpot)

  const { data: pf, isLoading, isError } = usePortfolioPrediction(type, {
    nTickets, jackpot, ticketsSold,
  })

  // El servicio ML es opcional: si no está corriendo, la card no aparece.
  if (isError) return null
  if (isLoading) return <div className="h-72 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
  if (!pf) return null

  const edge = pf.edgeVsHumanPct ?? 0

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
            🎟️ Cartera EV-óptima
            <Tip content="Conjunto de boletos optimizado para maximizar el pago esperado: combos de baja popularidad (compartes menos el premio si ganas) con buena cobertura de números. NO cambia tu probabilidad de ganar.">
              <Info className="h-3.5 w-3.5 text-zinc-400 cursor-help" />
            </Tip>
          </CardTitle>
          {jackpot != null && jackpot > 0 && (
            <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
              Bolsa {mxnCompact.format(jackpot)}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {/* Selector de número de boletos */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Boletos</span>
          <div className="flex gap-1">
            {TICKET_OPTIONS.map(n => (
              <button
                key={n}
                onClick={() => setNTickets(n)}
                className={cn(
                  'h-7 w-9 rounded-md text-xs font-bold transition-colors',
                  n === nTickets
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700',
                )}
              >
                {n}
              </button>
            ))}
          </div>
          <span className="ml-auto text-[11px] text-zinc-400">
            Costo {mxn.format(pf.totalCost)}
          </span>
        </div>

        {/* Boletos de la cartera */}
        <div className="flex flex-col gap-1.5">
          {pf.tickets.map((t, i) => <TicketRow key={i} ticket={t} index={i} />)}
        </div>

        {/* Métricas de cartera */}
        <div className="grid grid-cols-3 gap-2 border-t border-zinc-100 dark:border-zinc-800 pt-3">
          <div className="text-center">
            <p className="text-lg font-bold text-violet-700 dark:text-violet-300 tabular-nums flex items-center justify-center gap-1">
              <TrendingUp className="h-4 w-4" />{edge > 0 ? '+' : ''}{edge}%
            </p>
            <p className="text-[10px] uppercase tracking-wider text-zinc-400">vs combo típica</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-sky-700 dark:text-sky-300 tabular-nums flex items-center justify-center gap-1">
              <Target className="h-4 w-4" />{pf.distinctNumbersCovered}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-zinc-400">números cubiertos</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300 tabular-nums flex items-center justify-center gap-1">
              <Ticket className="h-4 w-4" />{mxn.format(pf.totalExpectedPayout ?? 0)}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-zinc-400">EV total (premio mayor)</p>
          </div>
        </div>

        <p className="text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg px-3 py-2">
          Es una ventaja <strong>pequeña pero real y gratis</strong>: jugar combos impopulares no cambia
          tu probabilidad de ganar, solo reduce cuánto compartirías el premio. En Melate el edge es modesto
          (~1-2%) porque se venden ~{mxnCompact.format(ticketsSold).replace('$', '').trim()} boletos
          <Tip content="Participación estimada con un modelo calibrado contra datos reales de ganadores (no es dato oficial por sorteo). El Melate vende ~1M boletos, no decenas de millones, así que los co-ganadores del premio mayor son raros.">
            <Info className="inline h-3 w-3 text-zinc-400 cursor-help ml-0.5 align-text-top" />
          </Tip>
          , no decenas de millones. Aun así, no pierdes nada por aplicarla.
        </p>
      </CardContent>
    </Card>
  )
}
