import { cn } from '@/lib/utils'

// ── Ilustraciones SVG ─────────────────────────────────────────────────────────

function IllustrationPredictions() {
  return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" aria-hidden>
      {/* Fondo suave */}
      <ellipse cx="60" cy="88" rx="44" ry="8" fill="currentColor" opacity="0.06"/>
      {/* Hoja / documento */}
      <rect x="28" y="18" width="52" height="64" rx="6" fill="currentColor" opacity="0.08"/>
      <rect x="28" y="18" width="52" height="64" rx="6" stroke="currentColor" strokeWidth="1.5" opacity="0.2"/>
      {/* Doblez esquina */}
      <path d="M68 18 L80 30 H68 V18Z" fill="currentColor" opacity="0.15"/>
      <path d="M68 18 L80 30" stroke="currentColor" strokeWidth="1.5" opacity="0.25"/>
      {/* Líneas de texto */}
      <rect x="37" y="38" width="32" height="3" rx="1.5" fill="currentColor" opacity="0.2"/>
      <rect x="37" y="46" width="24" height="3" rx="1.5" fill="currentColor" opacity="0.15"/>
      <rect x="37" y="54" width="28" height="3" rx="1.5" fill="currentColor" opacity="0.15"/>
      {/* Bola de lotería */}
      <circle cx="85" cy="28" r="16" fill="currentColor" opacity="0.1"/>
      <circle cx="85" cy="28" r="16" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
      <text x="85" y="33" textAnchor="middle" fontSize="14" fontWeight="bold" fill="currentColor" opacity="0.4">?</text>
      {/* Estrellitas */}
      <circle cx="22" cy="42" r="2" fill="currentColor" opacity="0.2"/>
      <circle cx="16" cy="55" r="1.5" fill="currentColor" opacity="0.15"/>
      <circle cx="102" cy="50" r="2.5" fill="currentColor" opacity="0.15"/>
    </svg>
  )
}

function IllustrationNoData() {
  return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" aria-hidden>
      <ellipse cx="60" cy="88" rx="44" ry="8" fill="currentColor" opacity="0.06"/>
      {/* Nube principal */}
      <circle cx="52" cy="52" r="22" fill="currentColor" opacity="0.08"/>
      <circle cx="52" cy="52" r="22" stroke="currentColor" strokeWidth="1.5" opacity="0.2"/>
      <circle cx="36" cy="60" r="14" fill="currentColor" opacity="0.08"/>
      <circle cx="36" cy="60" r="14" stroke="currentColor" strokeWidth="1.5" opacity="0.2"/>
      <circle cx="68" cy="60" r="14" fill="currentColor" opacity="0.08"/>
      <circle cx="68" cy="60" r="14" stroke="currentColor" strokeWidth="1.5" opacity="0.2"/>
      {/* Base nube */}
      <rect x="22" y="58" width="60" height="16" rx="0" fill="currentColor" opacity="0.08"/>
      {/* Signo de sincronización */}
      <path d="M48 44 A10 10 0 0 1 68 54" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4"/>
      <path d="M72 54 A10 10 0 0 1 52 64" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4"/>
      <polyline points="44,40 48,44 52,40" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.4"/>
      <polyline points="76,58 72,54 68,58" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.4"/>
      {/* Destellos */}
      <circle cx="26" cy="34" r="2" fill="currentColor" opacity="0.18"/>
      <circle cx="96" cy="38" r="3" fill="currentColor" opacity="0.12"/>
      <circle cx="18" cy="68" r="1.5" fill="currentColor" opacity="0.12"/>
    </svg>
  )
}

function IllustrationNoResults() {
  return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" aria-hidden>
      <ellipse cx="60" cy="88" rx="44" ry="8" fill="currentColor" opacity="0.06"/>
      {/* Lupa */}
      <circle cx="52" cy="46" r="22" fill="currentColor" opacity="0.08"/>
      <circle cx="52" cy="46" r="22" stroke="currentColor" strokeWidth="2" opacity="0.22"/>
      <circle cx="52" cy="46" r="14" stroke="currentColor" strokeWidth="1.5" opacity="0.15"/>
      {/* Mango */}
      <line x1="68" y1="62" x2="82" y2="76" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" opacity="0.22"/>
      {/* X dentro */}
      <line x1="46" y1="40" x2="58" y2="52" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.35"/>
      <line x1="58" y1="40" x2="46" y2="52" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.35"/>
      {/* Destellos */}
      <circle cx="22" cy="30" r="2" fill="currentColor" opacity="0.15"/>
      <circle cx="96" cy="44" r="2.5" fill="currentColor" opacity="0.12"/>
      <circle cx="88" cy="72" r="1.5" fill="currentColor" opacity="0.12"/>
    </svg>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

const ILLUSTRATIONS = {
  predictions: IllustrationPredictions,
  noData:      IllustrationNoData,
  noResults:   IllustrationNoResults,
}

interface EmptyStateProps {
  illustration?: keyof typeof ILLUSTRATIONS
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
  compact?: boolean
}

export function EmptyState({
  illustration = 'noData',
  title,
  description,
  action,
  className,
  compact = false,
}: EmptyStateProps) {
  const Illustration = ILLUSTRATIONS[illustration]

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center text-zinc-400 dark:text-zinc-500',
        compact ? 'gap-2 py-6' : 'gap-4 py-12',
        className,
      )}
    >
      {!compact && (
        <div className="text-zinc-300 dark:text-zinc-600">
          <Illustration />
        </div>
      )}
      <div className="flex flex-col gap-1">
        <p className={cn('font-semibold text-zinc-500 dark:text-zinc-400', compact ? 'text-sm' : 'text-base')}>
          {title}
        </p>
        {description && (
          <p className={cn('max-w-xs text-zinc-400 dark:text-zinc-500', compact ? 'text-xs' : 'text-sm')}>
            {description}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
