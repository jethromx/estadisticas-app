import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, predictionsApi } from './lottery'
import type { LotteryTypeId, SyncResult, SavePredictionRequest } from '@/types/lottery'


export const keys = {
  draws: (type: LotteryTypeId) => ['draws', type] as const,
  ensemblePrediction: (type: LotteryTypeId, validationDraws: number) => ['ensemblePrediction', type, validationDraws] as const,
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
  positionAnalysis:    (type: LotteryTypeId) => ['positionAnalysis', type] as const,
  consecutiveAnalysis: (type: LotteryTypeId) => ['consecutiveAnalysis', type] as const,
  calendarFrequency:   (type: LotteryTypeId) => ['calendarFrequency', type] as const,
  aggregateAccuracy:   (type?: string)        => ['aggregateAccuracy', type] as const,
}

export function useStatistics(type: LotteryTypeId, from?: string, to?: string) {
  return useQuery({
    queryKey: keys.statistics(type, from, to),
    queryFn:  () => api.statistics(type, from, to),
    enabled:  !!type,
    staleTime: 30 * 60 * 1000,
  })
}

export function useFrequencies(type: LotteryTypeId) {
  return useQuery({
    queryKey: keys.frequencies(type),
    queryFn:  () => api.frequencies(type),
    enabled:  !!type,
    staleTime: 30 * 60 * 1000,
  })
}

export function useHotNumbers(type: LotteryTypeId, limit = 10) {
  return useQuery({
    queryKey: keys.hotNumbers(type, limit),
    queryFn:  () => api.hotNumbers(type, limit),
    enabled:  !!type,
    staleTime: 30 * 60 * 1000,
  })
}

export function useColdNumbers(type: LotteryTypeId, limit = 10) {
  return useQuery({
    queryKey: keys.coldNumbers(type, limit),
    queryFn:  () => api.coldNumbers(type, limit),
    enabled:  !!type,
    staleTime: 30 * 60 * 1000,
  })
}

export function useRecentHot(type: LotteryTypeId, draws = 20, limit = 10) {
  return useQuery({
    queryKey: keys.recentHot(type, draws, limit),
    queryFn:  () => api.recentHot(type, draws, limit),
    enabled:  !!type,
    staleTime: 30 * 60 * 1000,
  })
}

export function useSuggestions(type: LotteryTypeId) {
  return useQuery({
    queryKey: keys.suggestions(type),
    queryFn:  () => api.suggestions(type),
    enabled:  !!type,
    staleTime: 30 * 60 * 1000,
  })
}

export function useDueNumbers(type: LotteryTypeId, limit = 10) {
  return useQuery({
    queryKey: keys.dueNumbers(type, limit),
    queryFn:  () => api.dueNumbers(type, limit),
    enabled:  !!type,
    staleTime: 30 * 60 * 1000,
  })
}

export function useWindowedFrequencies(type: LotteryTypeId, window = 100) {
  return useQuery({
    queryKey: keys.windowedFrequencies(type, window),
    queryFn:  () => api.windowedFrequencies(type, window),
    enabled:  !!type,
    staleTime: 30 * 60 * 1000,
  })
}

export function useBalanceAnalysis(type: LotteryTypeId) {
  return useQuery({
    queryKey: keys.balanceAnalysis(type),
    queryFn:  () => api.balanceAnalysis(type),
    enabled:  !!type,
    staleTime: 30 * 60 * 1000,
  })
}

export function useSumDistribution(type: LotteryTypeId) {
  return useQuery({
    queryKey: keys.sumDistribution(type),
    queryFn:  () => api.sumDistribution(type),
    enabled:  !!type,
    staleTime: 30 * 60 * 1000,
  })
}

export function usePairAnalysis(type: LotteryTypeId, limit = 20) {
  return useQuery({
    queryKey: keys.pairAnalysis(type, limit),
    queryFn:  () => api.pairAnalysis(type, limit),
    enabled:  !!type,
    staleTime: 30 * 60 * 1000,
  })
}

export function useChiSquare(type: LotteryTypeId) {
  return useQuery({
    queryKey: keys.chiSquare(type),
    queryFn:  () => api.chiSquare(type),
    enabled:  !!type,
    staleTime: 30 * 60 * 1000,
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

export function usePositionAnalysis(type: LotteryTypeId) {
  return useQuery({
    queryKey: keys.positionAnalysis(type),
    queryFn:  () => api.positionAnalysis(type),
    enabled:  !!type,
    staleTime: 30 * 60 * 1000,
  })
}

export function useConsecutiveAnalysis(type: LotteryTypeId, topPairs = 10) {
  return useQuery({
    queryKey: keys.consecutiveAnalysis(type),
    queryFn:  () => api.consecutiveAnalysis(type, topPairs),
    enabled:  !!type,
    staleTime: 30 * 60 * 1000,
  })
}

export function useCalendarFrequency(type: LotteryTypeId) {
  return useQuery({
    queryKey: keys.calendarFrequency(type),
    queryFn:  () => api.calendarFrequency(type),
    enabled:  !!type,
    staleTime: 30 * 60 * 1000,
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

export function useEnsemblePrediction(type: LotteryTypeId, validationDraws = 30) {
  return useQuery({
    queryKey: keys.ensemblePrediction(type, validationDraws),
    queryFn:  () => api.ensemblePrediction(type, validationDraws),
    enabled:  !!type,
    staleTime: 6 * 60 * 60 * 1000,
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

export function useSavedPredictions(page = 0, size = 20) {
  return useQuery({
    queryKey: ['savedPredictions', page, size],
    queryFn:  () => predictionsApi.getPaged(page, size),
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

export function useToggleFavorite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => predictionsApi.toggleFavorite(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['savedPredictions'] }),
  })
}

export function useAnalyzePrediction() {
  return useMutation({
    mutationFn: ({ id, syncFirst = false }: { id: string; syncFirst?: boolean }) =>
      predictionsApi.analyze(id, syncFirst),
  })
}

export function useSendToTelegram() {
  return useMutation({
    mutationFn: (id: string) => predictionsApi.notifyTelegram(id),
  })
}

export function useMLPrediction(type: LotteryTypeId, model = 'best', enabled = true) {
  return useQuery({
    queryKey: ['mlPrediction', type, model],
    queryFn:  () => api.mlPrediction(type, model),
    enabled:  !!type && enabled,
    staleTime: 6 * 60 * 60 * 1000,
    retry: false,  // no reintentar si Python service está caído
  })
}

export function useAggregateAccuracy(lotteryType?: string, enabled = true) {
  return useQuery({
    queryKey: keys.aggregateAccuracy(lotteryType),
    queryFn:  () => predictionsApi.aggregate(lotteryType),
    enabled,
    staleTime: 5 * 60 * 1000,
  })
}

export function useStreakAnalysis(type: LotteryTypeId) {
  return useQuery({
    queryKey: ['streakAnalysis', type],
    queryFn:  () => api.streakAnalysis(type),
    enabled:  !!type,
    staleTime: 60 * 60 * 1000,
  })
}

export function useMLExplanation(type: LotteryTypeId, model: string, number: number, enabled = false) {
  return useQuery({
    queryKey: ['mlExplanation', type, model, number],
    queryFn:  () => api.mlExplanation(type, model, number),
    enabled:  !!type && !!model && number > 0 && enabled,
    staleTime: 6 * 60 * 60 * 1000,
    retry: false,
  })
}

export function useBacktestComparison(type: LotteryTypeId, enabled = false) {
  return useQuery({
    queryKey: ['backtestComparison', type],
    queryFn:  () => api.backtestComparison(type),
    enabled:  !!type && enabled,
    staleTime: 24 * 60 * 60 * 1000,
    retry: false,
  })
}

export function useConsensusPrediction(type: LotteryTypeId, enabled = true) {
  return useQuery({
    queryKey: ['consensusPrediction', type],
    queryFn:  () => api.consensusPrediction(type),
    enabled:  !!type && enabled,
    staleTime: 2 * 60 * 60 * 1000,
  })
}

export function usePredictionFeedback(predictionId: string, enabled = false) {
  return useQuery({
    queryKey: ['predictionFeedback', predictionId],
    queryFn:  () => predictionsApi.feedback(predictionId),
    enabled:  !!predictionId && enabled,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
}

export function useImprovedPrediction(
  type: LotteryTypeId,
  model: string,
  excludeNumbers: number[],
  boostNumbers: number[],
  enabled = false
) {
  return useQuery({
    queryKey: ['improvedPrediction', type, model, excludeNumbers.join(','), boostNumbers.join(',')],
    queryFn:  () => api.improvedPrediction(type, model, excludeNumbers, boostNumbers),
    enabled:  !!type && enabled,
    staleTime: 10 * 60 * 1000,
    retry: false,
  })
}

export function useLatestDraw(type: LotteryTypeId) {
  return useQuery({
    queryKey: ['latestDraw', type],
    queryFn:  () => api.latestDraw(type),
    enabled:  !!type,
    staleTime: 30 * 60 * 1000,
  })
}

export function useEVPrediction(type: LotteryTypeId, jackpot?: number | null, model = 'best') {
  return useQuery({
    queryKey: ['evPrediction', type, model, jackpot ?? 0],
    queryFn:  () => api.evPrediction(type, model, jackpot),
    enabled:  !!type,
    staleTime: 30 * 60 * 1000,
    retry: false,
  })
}

export function usePortfolioPrediction(
  type: LotteryTypeId,
  opts: { nTickets?: number; jackpot?: number | null; ticketsSold?: number; model?: string } = {},
) {
  const { nTickets = 5, jackpot, ticketsSold, model = 'best' } = opts
  return useQuery({
    queryKey: ['portfolioPrediction', type, model, nTickets, jackpot ?? 0, ticketsSold ?? 0],
    queryFn:  () => api.portfolioPrediction(type, { nTickets, jackpot, ticketsSold, model }),
    enabled:  !!type,
    staleTime: 30 * 60 * 1000,
    retry: false,
  })
}

export function useMetaPrediction(type: LotteryTypeId, enabled = true) {
  return useQuery({
    queryKey: ['metaPrediction', type],
    queryFn:  () => api.metaPrediction(type),
    enabled:  !!type && enabled,
    staleTime: 6 * 60 * 60 * 1000,
    retry: false,
  })
}

export function useMarkovPrediction(type: LotteryTypeId, enabled = true) {
  return useQuery({
    queryKey: ['markovPrediction', type],
    queryFn:  () => api.markovPrediction(type),
    enabled:  !!type && enabled,
    staleTime: 6 * 60 * 60 * 1000,
    retry: false,
  })
}

export function useKNNPrediction(type: LotteryTypeId, enabled = true) {
  return useQuery({
    queryKey: ['knnPrediction', type],
    queryFn:  () => api.knnPrediction(type),
    enabled:  !!type && enabled,
    staleTime: 6 * 60 * 60 * 1000,
    retry: false,
  })
}

export function useMetaLearnerPrediction(type: LotteryTypeId, enabled = true) {
  return useQuery({
    queryKey: ['metaLearnerPrediction', type],
    queryFn:  () => api.metaLearnerPrediction(type),
    enabled:  !!type && enabled,
    staleTime: 6 * 60 * 60 * 1000,
    retry: false,
  })
}

export function useTriplePrediction(enabled = true) {
  return useQuery({
    queryKey: ['triplePrediction'],
    queryFn:  () => api.triplePrediction(),
    enabled,
    staleTime: 6 * 60 * 60 * 1000,
    retry: false,
  })
}
