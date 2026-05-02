import type {
  LotteryTypeId,
  LotteryStatistics,
  NumberFrequency,
  PatternSuggestion,
  SyncResult,
  DueNumber,
  Methodology,
} from '@/types/lottery'

const BASE = `${import.meta.env.VITE_API_BASE_URL ?? ''}/api/v1/lottery`

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, options)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error((err as { message?: string }).message ?? 'Error en la solicitud')
  }
  return res.json() as Promise<T>
}

export const api = {
  sync: (type: LotteryTypeId) =>
    request<SyncResult>(`/${type}/sync`, { method: 'POST' }),

  syncAll: () =>
    request<SyncResult[]>('/sync/all', { method: 'POST' }),

  statistics: (type: LotteryTypeId, from?: string, to?: string) =>
    request<LotteryStatistics>(
      `/${type}/statistics${from && to ? `?from=${from}&to=${to}` : ''}`,
    ),

  frequencies: (type: LotteryTypeId) =>
    request<NumberFrequency[]>(`/${type}/frequencies`),

  hotNumbers: (type: LotteryTypeId, limit = 10) =>
    request<NumberFrequency[]>(`/${type}/hot-numbers?limit=${limit}`),

  coldNumbers: (type: LotteryTypeId, limit = 10) =>
    request<NumberFrequency[]>(`/${type}/cold-numbers?limit=${limit}`),

  recentHot: (type: LotteryTypeId, draws = 20, limit = 10) =>
    request<NumberFrequency[]>(`/${type}/recent-hot-numbers?recentDraws=${draws}&limit=${limit}`),

  suggestions: (type: LotteryTypeId) =>
    request<PatternSuggestion[]>(`/${type}/suggestions`),

  suggestion: (type: LotteryTypeId, methodology: Methodology) =>
    request<PatternSuggestion>(`/${type}/suggestions/${methodology}`),

  dueNumbers: (type: LotteryTypeId, limit = 10) =>
    request<DueNumber[]>(`/${type}/due-numbers?limit=${limit}`),
}
