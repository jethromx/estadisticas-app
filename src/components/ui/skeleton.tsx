import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800', className)} />
  )
}

// ── Skeleton compuesto: tarjeta de juego (Dashboard) ─────────────────────────
export function GameCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-1">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex flex-col gap-1">
            <Skeleton className="h-2.5 w-12" />
            <Skeleton className="h-5 w-14" />
          </div>
        ))}
      </div>
      {/* Sparkline */}
      <Skeleton className="h-10 w-full rounded-lg" />
      {/* Hot numbers */}
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-2.5 w-28" />
        <div className="flex gap-1.5">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-7 w-7 rounded-full" />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Skeleton: predicción reciente (Dashboard) ─────────────────────────────────
export function RecentPredictionSkeleton() {
  return (
    <div className="rounded-xl border border-zinc-100 dark:border-zinc-800 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="flex gap-1.5">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-8 rounded-full" />
        ))}
      </div>
    </div>
  )
}

// ── Skeleton: tarjeta de predicción guardada (PredictionsPage) ────────────────
export function PredictionCardSkeleton() {
  return (
    <div className="rounded-xl border border-zinc-100 dark:border-zinc-800 p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5 flex-1">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      </div>
      <div className="flex gap-1.5">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-8 rounded-full" />
        ))}
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 flex-1 rounded-lg" />
        <Skeleton className="h-8 flex-1 rounded-lg" />
      </div>
    </div>
  )
}
