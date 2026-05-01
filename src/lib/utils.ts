import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { LotteryTypeMeta } from '@/types/lottery'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const LOTTERY_TYPES: LotteryTypeMeta[] = [
  { id: 'MELATE',     label: 'Melate',     icon: '🟣', color: '#7c3aed', range: '1–56', numbers: 6 },
  { id: 'REVANCHA',   label: 'Revancha',   icon: '🔵', color: '#0ea5e9', range: '1–56', numbers: 6 },
  { id: 'REVANCHITA', label: 'Revanchita', icon: '🟢', color: '#10b981', range: '1–56', numbers: 6 },
  { id: 'GANA_GATO',  label: 'Gana Gato',  icon: '🐱', color: '#f59e0b', range: '1–5',  numbers: 8 },
]

export function getLotteryMeta(id: string): LotteryTypeMeta {
  return LOTTERY_TYPES.find(t => t.id === id) ?? LOTTERY_TYPES[0]
}

export function formatNumber(n: number | null | undefined): string {
  if (n == null) return '—'
  return new Intl.NumberFormat('es-MX').format(n)
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(new Date(dateStr))
}

export function formatPct(n: number | null | undefined): string {
  if (n == null) return '—'
  return `${Number(n).toFixed(1)} %`
}
