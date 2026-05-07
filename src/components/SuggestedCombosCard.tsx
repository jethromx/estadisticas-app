import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { GeneratedCombo } from '@/types/lottery'

export type SuggestedCombo = {
  key:   string
  title: string
  desc:  string
  color: string
  label: string
  combo: GeneratedCombo
}

export const EMPTY_SCORES: GeneratedCombo['scores'] = {
  due: 0, bayes: 0, arima: 0, backtest: 0, pairs: 0, consensus: 0,
}

export function buildCombo(numbers: number[]): GeneratedCombo {
  const sorted = [...numbers].sort((a, b) => a - b)
  return {
    numbers: sorted,
    sum:     sorted.reduce((a, b) => a + b, 0),
    inRange: true,
    wasDrawn: false,
    scores:  EMPTY_SCORES,
  }
}

export function SuggestedCombosCard({
  subtitle,
  combos,
  savedKey,
  isPending,
  onSave,
}: {
  subtitle?: string
  combos: SuggestedCombo[]
  savedKey: string | null
  isPending: boolean
  onSave: (key: string, combo: GeneratedCombo, label: string) => void
}) {
  return (
    <Card className="border-2 border-violet-200 dark:border-violet-800 bg-violet-50/30 dark:bg-violet-900/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-violet-800 dark:text-violet-300">
          🎯 Combinaciones sugeridas
        </CardTitle>
        {subtitle && <p className="text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>}
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {combos.map(({ key, title, desc, color, label, combo }) => (
            <div key={key} className="rounded-xl border border-violet-100 dark:border-violet-900 bg-white dark:bg-zinc-900 p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100">{title}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{desc}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {savedKey === key
                    ? <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">✓ Guardada</span>
                    : <Button size="sm" variant="outline" disabled={isPending} onClick={() => onSave(key, combo, label)}>Guardar</Button>
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
}
