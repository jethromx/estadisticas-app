import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from './lottery'
import type { LotteryTypeId, SyncResult } from '@/types/lottery'

export const keys = {
  statistics:  (type: LotteryTypeId, from?: string, to?: string) => ['statistics', type, from, to] as const,
  frequencies: (type: LotteryTypeId)                              => ['frequencies', type] as const,
  hotNumbers:  (type: LotteryTypeId, limit: number)               => ['hotNumbers', type, limit] as const,
  coldNumbers: (type: LotteryTypeId, limit: number)               => ['coldNumbers', type, limit] as const,
  recentHot:   (type: LotteryTypeId, draws: number, limit: number) => ['recentHot', type, draws, limit] as const,
  suggestions: (type: LotteryTypeId)                              => ['suggestions', type] as const,
}

export function useStatistics(type: LotteryTypeId, from?: string, to?: string) {
  return useQuery({
    queryKey: keys.statistics(type, from, to),
    queryFn:  () => api.statistics(type, from, to),
    enabled:  !!type,
  })
}

export function useFrequencies(type: LotteryTypeId) {
  return useQuery({
    queryKey: keys.frequencies(type),
    queryFn:  () => api.frequencies(type),
    enabled:  !!type,
  })
}

export function useHotNumbers(type: LotteryTypeId, limit = 10) {
  return useQuery({
    queryKey: keys.hotNumbers(type, limit),
    queryFn:  () => api.hotNumbers(type, limit),
    enabled:  !!type,
  })
}

export function useColdNumbers(type: LotteryTypeId, limit = 10) {
  return useQuery({
    queryKey: keys.coldNumbers(type, limit),
    queryFn:  () => api.coldNumbers(type, limit),
    enabled:  !!type,
  })
}

export function useRecentHot(type: LotteryTypeId, draws = 20, limit = 10) {
  return useQuery({
    queryKey: keys.recentHot(type, draws, limit),
    queryFn:  () => api.recentHot(type, draws, limit),
    enabled:  !!type,
  })
}

export function useSuggestions(type: LotteryTypeId) {
  return useQuery({
    queryKey: keys.suggestions(type),
    queryFn:  () => api.suggestions(type),
    enabled:  !!type,
  })
}

export function useSync(type: LotteryTypeId | 'ALL') {
  const qc = useQueryClient()
  return useMutation<SyncResult | SyncResult[]>({
    mutationFn: () => type === 'ALL' ? api.syncAll() : api.sync(type),
    onSuccess:  () => qc.invalidateQueries(),
  })
}
