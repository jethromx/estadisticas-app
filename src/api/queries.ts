import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, predictionsApi } from './lottery'
import type { LotteryTypeId, SyncResult, SavePredictionRequest } from '@/types/lottery'


export const keys = {
  draws: (type: LotteryTypeId) => ['draws', type] as const,
  statistics:          (type: LotteryTypeId, from?: string, to?: string) => ['statistics', type, from, to] as const,
  frequencies:         (type: LotteryTypeId)                              => ['frequencies', type] as const,
  hotNumbers:          (type: LotteryTypeId, limit: number)               => ['hotNumbers', type, limit] as const,
  coldNumbers:         (type: LotteryTypeId, limit: number)               => ['coldNumbers', type, limit] as const,
  recentHot:           (type: LotteryTypeId, draws: number, limit: number) => ['recentHot', type, draws, limit] as const,
  suggestions:         (type: LotteryTypeId)                              => ['suggestions', type] as const,
  dueNumbers:          (type: LotteryTypeId, limit: number)               => ['dueNumbers', type, limit] as const,
  windowedFrequencies: (type: LotteryTypeId, window: number)              => ['windowedFrequencies', type, window] as const,
  balanceAnalysis:     (type: LotteryTypeId)                              => ['balanceAnalysis', type] as const,
  sumDistribution:     (type: LotteryTypeId)                              => ['sumDistribution', type] as const,
  pairAnalysis:        (type: LotteryTypeId, limit: number)               => ['pairAnalysis', type, limit] as const,
  chiSquare:           (type: LotteryTypeId)                              => ['chiSquare', type] as const,
  backtest:            (type: LotteryTypeId, topK: number, draws: number) => ['backtest', type, topK, draws] as const,
  bayesianAnalysis:    (type: LotteryTypeId, window: number)              => ['bayesianAnalysis', type, window] as const,
  neuralPrediction:    (type: LotteryTypeId)                              => ['neuralPrediction', type] as const,
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

export function useDueNumbers(type: LotteryTypeId, limit = 10) {
  return useQuery({
    queryKey: keys.dueNumbers(type, limit),
    queryFn:  () => api.dueNumbers(type, limit),
    enabled:  !!type,
  })
}

export function useWindowedFrequencies(type: LotteryTypeId, window = 100) {
  return useQuery({
    queryKey: keys.windowedFrequencies(type, window),
    queryFn:  () => api.windowedFrequencies(type, window),
    enabled:  !!type,
  })
}

export function useBalanceAnalysis(type: LotteryTypeId) {
  return useQuery({
    queryKey: keys.balanceAnalysis(type),
    queryFn:  () => api.balanceAnalysis(type),
    enabled:  !!type,
  })
}

export function useSumDistribution(type: LotteryTypeId) {
  return useQuery({
    queryKey: keys.sumDistribution(type),
    queryFn:  () => api.sumDistribution(type),
    enabled:  !!type,
  })
}

export function usePairAnalysis(type: LotteryTypeId, limit = 20) {
  return useQuery({
    queryKey: keys.pairAnalysis(type, limit),
    queryFn:  () => api.pairAnalysis(type, limit),
    enabled:  !!type,
  })
}

export function useChiSquare(type: LotteryTypeId) {
  return useQuery({
    queryKey: keys.chiSquare(type),
    queryFn:  () => api.chiSquare(type),
    enabled:  !!type,
  })
}

export function useBacktest(type: LotteryTypeId, topK: number, testDraws = 100) {
  return useQuery({
    queryKey: keys.backtest(type, topK, testDraws),
    queryFn:  () => api.backtest(type, topK, testDraws),
    enabled:  !!type,
  })
}

export function useBayesianAnalysis(type: LotteryTypeId, recentWindow = 50) {
  return useQuery({
    queryKey: keys.bayesianAnalysis(type, recentWindow),
    queryFn:  () => api.bayesianAnalysis(type, recentWindow),
    enabled:  !!type,
  })
}

export function useNeuralPrediction(type: LotteryTypeId) {
  return useQuery({
    queryKey: keys.neuralPrediction(type),
    queryFn:  () => api.neuralPrediction(type),
    enabled:  !!type,
    staleTime: 6 * 60 * 60 * 1000,  // 6 h — mismo TTL que el caché del servidor
  })
}

export function useDrawResults(type: LotteryTypeId, limit?: number) {
  return useQuery({
    queryKey: limit ? [...keys.draws(type), limit] : keys.draws(type),
    queryFn:  () => api.draws(type, limit),
    enabled:  !!type,
    staleTime: 5 * 60 * 1000,
  })
}

export function useSync(type: LotteryTypeId | 'ALL') {
  const qc = useQueryClient()
  return useMutation<SyncResult | SyncResult[]>({
    mutationFn: () => type === 'ALL' ? api.syncAll() : api.sync(type),
    onSuccess: (data) => {
      const results = Array.isArray(data) ? data : [data]
      results.forEach(r => {
        if (r.syncedAt) localStorage.setItem(`lastSync_${r.lotteryType}`, r.syncedAt)
      })
      qc.invalidateQueries()
    },
  })
}

export function useSavedPredictions() {
  return useQuery({
    queryKey: ['savedPredictions'],
    queryFn:  () => predictionsApi.getAll(),
  })
}

export function useSavePrediction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: SavePredictionRequest) => predictionsApi.save(body),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['savedPredictions'] }),
  })
}

export function useDeletePrediction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => predictionsApi.delete(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['savedPredictions'] }),
  })
}

export function useAnalyzePrediction() {
  return useMutation({
    mutationFn: ({ id, syncFirst = false }: { id: string; syncFirst?: boolean }) =>
      predictionsApi.analyze(id, syncFirst),
  })
}
