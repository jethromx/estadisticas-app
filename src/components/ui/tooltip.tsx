import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface TooltipProps {
  content: ReactNode
  children: ReactNode
  className?: string
  /** Default: top. Use 'bottom' when near top of viewport */
  side?: 'top' | 'bottom'
}

export function Tooltip({ content, children, className, side = 'top' }: TooltipProps) {
  return (
    <span className={cn('relative group/tip inline-flex', className)}>
      {children}
      <span
        className={cn(
          'pointer-events-none absolute left-1/2 -translate-x-1/2 z-50',
          'invisible group-hover/tip:visible opacity-0 group-hover/tip:opacity-100',
          'transition-opacity duration-150',
          'w-max max-w-[240px] rounded-lg bg-zinc-900 dark:bg-zinc-700',
          'px-3 py-2 text-[11px] leading-snug text-white shadow-xl text-center',
          side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
        )}
      >
        {content}
        <span
          className={cn(
            'absolute left-1/2 -translate-x-1/2 border-4 border-transparent',
            side === 'top'
              ? 'top-full border-t-zinc-900 dark:border-t-zinc-700'
              : 'bottom-full border-b-zinc-900 dark:border-b-zinc-700',
          )}
        />
      </span>
    </span>
  )
}
