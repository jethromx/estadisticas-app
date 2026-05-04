import type {
  LotteryTypeId,
  LotteryStatistics,
  NumberFrequency,
  PatternSuggestion,
  SyncResult,
  DueNumber,
  DrawResult,
  Methodology,
  WindowedFrequency,
  BalanceAnalysis,
  SumDistribution,
  NumberPair,
  ChiSquareResult,
  BacktestResult,
  BayesianNumber,
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

  windowedFrequencies: (type: LotteryTypeId, window = 100) =>
    request<WindowedFrequency[]>(`/${type}/windowed-frequencies?window=${window}`),

  balanceAnalysis: (type: LotteryTypeId) =>
    request<BalanceAnalysis>(`/${type}/balance-analysis`),

  sumDistribution: (type: LotteryTypeId) =>
    request<SumDistribution>(`/${type}/sum-distribution`),

  pairAnalysis: (type: LotteryTypeId, limit = 20) =>
    request<NumberPair[]>(`/${type}/pair-analysis?limit=${limit}`),

  chiSquare: (type: LotteryTypeId) =>
    request<ChiSquareResult>(`/${type}/chi-square`),

  backtest: (type: LotteryTypeId, topK?: number, testDraws = 100) =>
    request<BacktestResult>(
      `/${type}/backtest?testDraws=${testDraws}${topK != null ? `&topK=${topK}` : ''}`,
    ),

  bayesianAnalysis: (type: LotteryTypeId, recentWindow = 50) =>
    request<BayesianNumber[]>(`/${type}/bayesian-analysis?recentWindow=${recentWindow}`),

  draws: (type: LotteryTypeId, limit = 5000) =>
    request<DrawResult[]>(`/${type}/draws?limit=${limit}`),
}
