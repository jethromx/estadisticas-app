export type LotteryTypeId = 'MELATE' | 'REVANCHA' | 'REVANCHITA'

export type Methodology =
  | 'HOT_NUMBERS'
  | 'COLD_NUMBERS'
  | 'BALANCED'
  | 'STATISTICAL_RANDOM'

export interface LotteryTypeMeta {
  id: LotteryTypeId
  label: string
  icon: string
  color: string
  range: string
  numbers: number
}

export interface NumberFrequency {
  number: number
  frequency: number
  percentage: number
  lastDrawnDate: string | null
  lastDrawNumber: number | null
}

export interface LotteryStatistics {
  lotteryType: LotteryTypeId
  totalDraws: number
  firstDrawDate: string | null
  lastDrawDate: string | null
  mostFrequent: NumberFrequency[]
  leastFrequent: NumberFrequency[]
  frequencyDistribution: Record<number, number>
  averageFrequency: number
  numbersNeverDrawn: number[]
}

export interface PatternSuggestion {
  lotteryType: LotteryTypeId
  methodology: Methodology
  suggestedNumbers: number[]
  suggestedAdditional: number | null
  description: string
  confidenceScore: number
}

export interface DueNumber {
  number:         number
  frequency:      number
  lastDrawNumber: number
  drawsSinceLast: number
  avgInterval:    number
  dueScore:       number
}

export interface WindowedFrequency {
  number: number
  frequency: number
  percentage: number
  windowSize: number
  windowDrawCount: number
  /** Positive = appearing more than historical average; negative = less. Percentage points. */
  trend: number
}

export interface BalanceAnalysis {
  lotteryType: LotteryTypeId
  oddEvenDistribution: Record<number, number>
  highLowDistribution: Record<number, number>
  optimalOddCount: number
  optimalEvenCount: number
  optimalHighCount: number
  optimalLowCount: number
  totalDraws: number
  numbersPerDraw: number
  midpoint: number
}

export interface SumDistribution {
  lotteryType: LotteryTypeId
  histogram: Record<number, number>
  mean: number
  stdDev: number
  minSum: number
  maxSum: number
  optimalMin: number
  optimalMax: number
  p25: number
  p50: number
  p75: number
  totalDraws: number
}

export interface NumberPair {
  number1: number
  number2: number
  frequency: number
  percentage: number
}

export interface ChiSquareResult {
  lotteryType: LotteryTypeId
  chiSquare: number
  degreesOfFreedom: number
  pValue: number
  totalObservations: number
  expectedFrequency: number
  interpretation: string
}

export interface BacktestResult {
  lotteryType: LotteryTypeId
  strategy: string
  topK: number
  totalDrawsTested: number
  predictedNumbers: number[]
  matchDistribution: Record<number, number>
  avgMatches: number
  hitRate: number
  expectedRandomRate: number
}

export interface BayesianNumber {
  number: number
  posteriorMean: number
  priorMean: number
  historicalFrequency: number
  recentFrequency: number
  recentWindow: number
  lift: number
}

export interface NeuralNumberScore {
  number:       number
  probability:  number
  recentFreq50: number
  dueScore:     number
  trend:        number
  rank:         number
}

export interface NeuralPrediction {
  lotteryType:        string
  totalDrawsAnalyzed: number
  trainingDraws:      number
  validationDraws:    number
  validationHitRate:  number
  trainingEpochs:     number
  scoredNumbers:      NeuralNumberScore[]
  suggestedCombos:    number[][]
  methodDescription:  string
}

export interface DrawResult {
  drawNumber: number
  drawDate:   string
  numbers:    number[]
}

export interface SyncResult {
  lotteryType: LotteryTypeId
  totalRecords: number
  newRecords: number
  skippedRecords: number
  status: 'SUCCESS' | 'ERROR'
  message: string
  syncedAt: string
}

export interface GenWeights {
  due:       number
  bayes:     number
  arima:     number
  backtest:  number
  pairs:     number
  consensus: number
}

export interface GeneratedCombo {
  numbers:  number[]
  sum:      number
  inRange:  boolean
  wasDrawn: boolean
  scores:   GenWeights
}

export interface SavedPredictionSet {
  id:             string
  label:          string
  savedAt:        string        // ISO datetime string
  latestDrawDate: string | null
  combos:         GeneratedCombo[]
  lotteryType?:   string | null
}

export interface SavePredictionRequest {
  label:            string
  latestDrawDate:   string | null
  combos:           GeneratedCombo[]
  lotteryType?:     string | null
  generationParams?: Record<string, unknown> | null
}

export interface ComboMatchDetail {
  comboNumbers:     number[]
  bestMatchCount:   number
  averageMatchCount: number
  matchesPerDraw:   Record<string, number>   // date -> matches
}

export interface PredictionAccuracyResult {
  predictionId:          string
  predictionLabel:       string
  lotteryType:           string | null
  drawsAnalyzed:         number
  bestMatchCount:        number
  worstMatchCount:       number
  averageMatchCount:     number
  comboDetails:          ComboMatchDetail[]
  improvementSuggestions: string[]
}
