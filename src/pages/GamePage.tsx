import { useParams, Navigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { LOTTERY_TYPES, formatNumber, formatDate, formatPct, getLotteryMeta } from '@/lib/utils'
import {
  useStatistics, useFrequencies, useHotNumbers, useColdNumbers,
  useSuggestions, useDueNumbers, useSync,
} from '@/api/queries'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner, PageSpinner } from '@/components/ui/spinner'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import type { LotteryTypeId, NumberFrequency, PatternSuggestion, DueNumber } from '@/types/lottery'

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

export function GamePage() {
  const { id } = useParams<{ id: string }>()
  const typeId = id?.toUpperCase() as LotteryTypeId

  if (!LOTTERY_TYPES.find(t => t.id === typeId)) return <Navigate to="/" replace />

  const meta = getLotteryMeta(typeId)
  const sync = useSync(typeId)

  const { data: stats,      isLoading: loadingStats } = useStatistics(typeId)
  const { data: freqs,      isLoading: loadingFreqs } = useFrequencies(typeId)
  const { data: hot }                                 = useHotNumbers(typeId, 15)
  const { data: cold }                                = useColdNumbers(typeId, 15)
  const { data: suggestions, isLoading: loadingSug }  = useSuggestions(typeId)
  const { data: dueNums,     isLoading: loadingDue }  = useDueNumbers(typeId, 10)

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
        <TabsList>
          <TabsTrigger value="due">Por salir</TabsTrigger>
          <TabsTrigger value="stats">Resumen</TabsTrigger>
          <TabsTrigger value="freqs">Frecuencias</TabsTrigger>
          <TabsTrigger value="hotcold">Cal / Fríos</TabsTrigger>
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
                {hot?.length ? hot.map((nf, i) => <FrequencyRow key={nf.number} nf={nf} rank={i + 1} />) : <p className="text-sm text-zinc-500">Sin datos.</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Badge variant="cold">Fríos</Badge>Top 15
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cold?.length ? cold.map((nf, i) => <FrequencyRow key={nf.number} nf={nf} rank={i + 1} />) : <p className="text-sm text-zinc-500">Sin datos.</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Sugerencias ── */}
        <TabsContent value="suggestions">
          {loadingSug ? <PageSpinner /> : suggestions?.length ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {suggestions.map(s => <SuggestionCard key={s.methodology} s={s} />)}
            </div>
          ) : <p className="text-sm text-zinc-500">Sin sugerencias. Sincroniza primero.</p>}
        </TabsContent>
      </Tabs>
    </div>
  )
}
