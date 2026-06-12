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
  NeuralPrediction,
  EnsemblePrediction,
  MLPrediction,
  MetaPrediction,
  MLExplanation,
  BacktestComparison,
  StreakAnalysis,
  ConsensusPrediction,
  SavedPredictionSet,
  SavePredictionRequest,
  PredictionAccuracyResult,
  AggregateAccuracyResult,
  PositionAnalysis,
  ConsecutiveAnalysis,
  CalendarFrequency,
  PagedResponse,
  PredictionFeedback,
  ImprovedPrediction,
  TriplePrediction,
  EVPrediction,
} from '@/types/lottery'

const BASE        = `${import.meta.env.VITE_API_BASE_URL ?? ''}/api/v1/lottery`
const PRED_BASE   = `${import.meta.env.VITE_API_BASE_URL ?? ''}/api/v1/predictions`
const BOLETO_BASE = `${import.meta.env.VITE_API_BASE_URL ?? ''}/api/v1/boleto`
const ML_BASE     = `http://localhost:8001`

async function boletoRequest<T>(path: string): Promise<T> {
  const token = localStorage.getItem('lottery_token')
  const res = await fetch(`${BOLETO_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) {
    if (res.status === 401) window.dispatchEvent(new CustomEvent('auth:unauthorized'))
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error((err as { message?: string }).message ?? 'Error en la solicitud')
  }
  return res.json() as Promise<T>
}

async function mlRequest<T>(path: string): Promise<T> {
  const res = await fetch(`${ML_BASE}${path}`)
  if (!res.ok) throw new Error(`ML service error: ${res.status}`)
  return res.json() as Promise<T>
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('lottery_token')
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })
  if (!res.ok) {
    if (res.status === 401) window.dispatchEvent(new CustomEvent('auth:unauthorized'))
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error((err as { message?: string }).message ?? 'Error en la solicitud')
  }
  if (res.status === 204 || res.headers.get('content-length') === '0') return undefined as T
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

  neuralPrediction: (type: LotteryTypeId) =>
    request<NeuralPrediction>(`/${type}/neural-prediction`),

  draws: (type: LotteryTypeId, limit = 5000) =>
    request<DrawResult[]>(`/${type}/draws?limit=${limit}`),

  positionAnalysis: (type: LotteryTypeId) =>
    request<PositionAnalysis>(`/${type}/position-analysis`),

  consecutiveAnalysis: (type: LotteryTypeId, topPairs = 10) =>
    request<ConsecutiveAnalysis>(`/${type}/consecutive-analysis?topPairs=${topPairs}`),

  calendarFrequency: (type: LotteryTypeId) =>
    request<CalendarFrequency>(`/${type}/calendar-frequency`),

  ensemblePrediction: (type: LotteryTypeId, validationDraws = 30) =>
    request<EnsemblePrediction>(`/${type}/ensemble-prediction?validationDraws=${validationDraws}`),

  streakAnalysis: (type: LotteryTypeId) =>
    request<StreakAnalysis>(`/${type}/streak-analysis`),

  consensusPrediction: (type: LotteryTypeId) =>
    request<ConsensusPrediction>(`/${type}/consensus-prediction`),

  mlPrediction: (type: LotteryTypeId, model = 'best') =>
    request<MLPrediction>(`/${type}/ml-prediction?model=${model}`),

  mlExplanation: (type: LotteryTypeId, model: string, number: number) =>
    request<MLExplanation>(`/${type}/ml-explanation?model=${model}&number=${number}`),

  backtestComparison: (type: LotteryTypeId) =>
    request<BacktestComparison>(`/${type}/backtest-comparison`),

  metaPrediction: (type: LotteryTypeId) =>
    request<MetaPrediction>(`/${type}/meta-prediction`),

  markovPrediction: (type: LotteryTypeId) =>
    request<EnsemblePrediction>(`/${type}/markov-prediction`),

  knnPrediction: (type: LotteryTypeId) =>
    request<EnsemblePrediction>(`/${type}/knn-prediction`),

  metaLearnerPrediction: (type: LotteryTypeId) =>
    request<EnsemblePrediction>(`/${type}/meta-learner-prediction`),

  improvedPrediction: (type: LotteryTypeId, model = 'best', excludeNumbers: number[] = [], boostNumbers: number[] = []) => {
    const params = new URLSearchParams({ model })
    if (excludeNumbers.length) params.set('exclude_numbers', excludeNumbers.join(','))
    if (boostNumbers.length)   params.set('boost_numbers', boostNumbers.join(','))
    return mlRequest<ImprovedPrediction>(`/predict/${type}/improved?${params}`)
  },

  triplePrediction: () =>
    boletoRequest<TriplePrediction>('/triple'),

  latestDraw: (type: LotteryTypeId) =>
    request<DrawResult[]>(`/${type}/draws?limit=1`).then(d => d[0] ?? null),

  evPrediction: (type: LotteryTypeId, model = 'best', jackpot?: number | null) => {
    const params = new URLSearchParams({ model })
    if (jackpot != null && jackpot > 0) params.set('jackpot', String(jackpot))
    return mlRequest<EVPrediction>(`/predict/${type}/ev?${params}`)
  },
}

async function predRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('lottery_token')
  const res = await fetch(`${PRED_BASE}${path}`, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })
  if (!res.ok) {
    if (res.status === 401) window.dispatchEvent(new CustomEvent('auth:unauthorized'))
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error((err as { message?: string }).message ?? 'Error en la solicitud')
  }
  if (res.status === 204 || res.headers.get('content-length') === '0') return undefined as T
  return res.json() as Promise<T>
}

export const predictionsApi = {
  getPaged: (page: number, size: number) =>
    predRequest<PagedResponse<SavedPredictionSet>>(`?page=${page}&size=${size}`),

  save: (body: SavePredictionRequest) =>
    predRequest<SavedPredictionSet>('', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    }),

  delete: (id: string) =>
    predRequest<void>(`/${id}`, { method: 'DELETE' }),

  analyze: (id: string, syncFirst = false) =>
    predRequest<PredictionAccuracyResult>(`/${id}/analyze?syncFirst=${syncFirst}`, {
      method: 'POST',
    }),

  aggregate: (lotteryType?: string, syncFirst = false) => {
    const params = new URLSearchParams({ syncFirst: String(syncFirst) })
    if (lotteryType) params.set('lotteryType', lotteryType)
    return predRequest<AggregateAccuracyResult>(`/analysis/aggregate?${params}`)
  },

  toggleFavorite: (id: string) =>
    predRequest<SavedPredictionSet>(`/${id}/favorite`, { method: 'PATCH' }),

  feedback: (id: string) =>
    predRequest<PredictionFeedback>(`/${id}/feedback`),

  notifyTelegram: (id: string) =>
    predRequest<void>(`/${id}/notify/telegram`, { method: 'POST' }),
}
