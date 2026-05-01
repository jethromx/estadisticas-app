import { Link } from 'react-router-dom'
import { LOTTERY_TYPES, formatNumber, formatDate } from '@/lib/utils'
import { useStatistics, useSync } from '@/api/queries'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import type { LotteryTypeId } from '@/types/lottery'

function GameCard({ id }: { id: LotteryTypeId }) {
  const meta = LOTTERY_TYPES.find(t => t.id === id)!
  const { data: stats, isLoading } = useStatistics(id)
  const sync = useSync(id)

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{meta.icon}</span>
            <div>
              <CardTitle>{meta.label}</CardTitle>
              <CardDescription>Rango {meta.range} · {meta.numbers} números</CardDescription>
            </div>
          </div>
          <Badge variant="secondary">{id}</Badge>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        {isLoading ? (
          <Spinner className="mx-auto" />
        ) : stats ? (
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Total sorteos</dt>
              <dd className="font-semibold text-zinc-900 dark:text-zinc-100">{formatNumber(stats.totalDraws)}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Último sorteo</dt>
              <dd className="font-semibold text-zinc-900 dark:text-zinc-100">{formatDate(stats.lastDrawDate)}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Primer sorteo</dt>
              <dd className="font-semibold text-zinc-900 dark:text-zinc-100">{formatDate(stats.firstDrawDate)}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Sin salir</dt>
              <dd className="font-semibold text-zinc-900 dark:text-zinc-100">{stats.numbersNeverDrawn.length}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-zinc-500">Sin datos. Sincroniza primero.</p>
        )}

        <div className="mt-auto flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => sync.mutate()}
            disabled={sync.isPending}
            className="flex-1"
          >
            {sync.isPending ? <Spinner className="h-4 w-4" /> : null}
            Sincronizar
          </Button>
          <Button size="sm" className="flex-1" asChild>
            <Link to={`/game/${id}`}>Ver detalle</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function SyncAllButton() {
  const sync = useSync('ALL')
  return (
    <Button onClick={() => sync.mutate()} disabled={sync.isPending} variant="outline">
      {sync.isPending ? <Spinner className="h-4 w-4" /> : null}
      Sincronizar todo
    </Button>
  )
}

export function Dashboard() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Dashboard</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Estadísticas generales de los juegos de lotería
          </p>
        </div>
        <SyncAllButton />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {LOTTERY_TYPES.map(t => (
          <GameCard key={t.id} id={t.id} />
        ))}
      </div>
    </div>
  )
}
