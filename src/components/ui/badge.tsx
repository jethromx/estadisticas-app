import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'secondary' | 'hot' | 'cold' | 'success' | 'warning'

const variants: Record<BadgeVariant, string> = {
  default:   'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
  secondary: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  hot:       'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  cold:      'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  success:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  warning:   'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
}

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

export function Badge({ variant = 'default', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}
