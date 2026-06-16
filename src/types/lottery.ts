export type LotteryTypeId = 'MELATE' | 'REVANCHA' | 'REVANCHITA'

export type PredictionStatus = 'pending' | 'has_results' | 'no_draws_yet'

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
  featureImportance?: Record<string, number>
}

export interface DrawResult {
  drawNumber:        number
  drawDate:          string
  numbers:           number[]
  jackpotAmount?:    number | null
  firstPrizeWinners?: number | null
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
  favorite:       boolean
}

export interface PagedResponse<T> {
  content:       T[]
  page:          number
  size:          number
  totalElements: number
  totalPages:    number
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
  matchDistribution?: Record<string, number>  // {"0": 12, "1": 8, "2": 3, ...}
  hitRateByNumber?: Record<string, number>    // {"15": 0.40, "27": 0.20, ...}
  currentDryStreak?: number                   // sorteos consecutivos con 0 aciertos
  perDrawMatchesList?: number[]               // [1,0,2,1,0,...] para sparkline
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
  expectedRandomMatches?: number
  percentileScore?:       number
  performanceLabel?:      string
  liftVsRandom?:          number        // 1.9 = 1.9× mejor que azar
  numbersToKeep?:         number[]      // números con alto hit rate
  numbersToSwap?:         number[]      // números con 0 hits
}

export interface PositionStats {
  position: number
  mean: number
  stdDev: number
  min: number
  max: number
  p10: number
  p25: number
  p50: number
  p75: number
  p90: number
  recommendedMin: number
  recommendedMax: number
}

export interface PositionAnalysis {
  lotteryType: string
  totalDraws: number
  positions: PositionStats[]
}

export interface ConsecutivePair {
  lower: number
  higher: number
  frequency: number
  percentage: number
}

export interface ConsecutiveAnalysis {
  lotteryType: string
  totalDraws: number
  drawsWithAtLeastOne: number
  consecutiveRate: number
  distributionByCount: Record<number, number>
  avgPairsPerDraw: number
  topPairs: ConsecutivePair[]
}

export interface DayFrequency {
  dayOfWeek: number
  dayName: string
  drawCount: number
  numberFrequencies: Record<number, number>
  hotNumbers: number[]
}

export interface MonthFrequency {
  month: number
  monthName: string
  drawCount: number
  numberFrequencies: Record<number, number>
  hotNumbers: number[]
}

export interface CalendarFrequency {
  lotteryType: string
  totalDraws: number
  byDayOfWeek: DayFrequency[]
  byMonth: MonthFrequency[]
}

export interface PredictionSummaryItem {
  predictionId:        string
  label:               string
  avgMatchesPerCombo:  number
  bestMatch:           number
  drawsAnalyzed:       number
}

export interface ModelStatsItem {
  modelName:           string
  available:           boolean
  avgMatchesPerCombo:  number
  bestMatch:           number
  matchDistribution:   Record<string, number>
  unavailableReason:   string | null
}

export interface ScoredNumber {
  number:         number
  rank:           number
  frequencyScore: number
  recencyScore:   number
  dueScore:       number
  pairScore:      number
  compositeScore: number
}

export interface EnsemblePrediction {
  lotteryType:        string
  totalDrawsAnalyzed: number
  validationDraws:    number
  modelWeights:       Record<string, number>
  validationHitRate:  number
  scoredNumbers:      ScoredNumber[]
  suggestedCombos:    number[][]
  methodDescription:  string
  liftVsRandom?:      number
}

export interface MLNumberScore {
  number: number
  score: number
  rank: number
}

export interface MLNumberChange {
  number: number
  rankBefore: number
  rankNow: number
  rankDelta: number
  reason: string
}

export interface MLComboDiff {
  comboIndex: number
  added: number[]
  removed: number[]
}

export interface MLPredictionDiff {
  hasPrevious: boolean
  previousTop6: number[]
  previousPredictedAt: string | null
  drawsSinceLast: number | null
  entered: MLNumberChange[]
  exited: MLNumberChange[]
  stable: number[]
  comboDiff: MLComboDiff[]
}

export interface MLPrediction {
  lotteryType: string
  model: string
  rankedNumbers: MLNumberScore[]
  suggestedCombos: number[][]
  topNumbers: number[]
  modelAvailable: boolean
  trainedAt: string | null
  validationHitRate: number | null
  errorMessage: string | null
  diff: MLPredictionDiff | null
}

export interface MetaPrediction {
  lotteryType: string
  scoredNumbers: Array<{
    number: number
    rank: number
    metaScore: number
    ensembleScore: number
    neuralScore: number
    consensusScore: number
    confidence?: number
  }>
  suggestedCombos: number[][]
  modelHitRates: Record<string, number>
  averageHitRate: number
  methodDescription: string
  liftVsRandom?: number
}

export interface AggregateAccuracyResult {
  lotteryType:          string | null
  totalPredictions:     number
  totalCombosAnalyzed:  number
  drawsAnalyzed:        number
  avgMatchesPerCombo:   number
  bestMatchEver:        number
  matchDistribution:    Record<string, number>
  avgMatchesByDraw:     Record<string, number>
  perPrediction:        PredictionSummaryItem[]
  ensembleStats:        ModelStatsItem | null
  neuralStats:          ModelStatsItem | null
}

export interface NumberStreak {
  number: number
  currentDryStreak: number
  longestDryStreak: number
  avgDryStreak: number
  currentHotStreak: number
  longestHotStreak: number
  pAppearAfter10: number
  pAppearAfter20: number
  status: 'CALIENTE' | 'NORMAL' | 'FRIO' | 'MUY_FRIO'
}

export interface StreakAnalysis {
  lotteryType: string
  totalDrawsAnalyzed: number
  numbers: NumberStreak[]
}

export interface ConsensusNumberScore {
  number: number
  dueScore: number
  trendScore: number
  frequencyScore: number
  consensusScore: number
  rank: number
  signal: 'FUERTE' | 'MODERADO' | 'DEBIL'
}

export interface FeatureContribution {
  name: string; description: string; value: number
  shapValue: number; direction: 'positive' | 'negative'
}
export interface MLExplanation {
  number: number; lotteryType: string; model: string
  score: number; explanationText: string; method: string
  topPositive: FeatureContribution[]; topNegative: FeatureContribution[]
  available: boolean; errorMessage: string | null
}

export interface BacktestModelResult {
  model: string
  hitRate1: number
  hitRate2: number
  hitRate3: number
  meanHits: number
  maxHits: number
  drawsEvaluated: number
}
export interface BacktestComparison {
  lotteryType: string
  evaluatedAt: string | null
  results: BacktestModelResult[]
  available: boolean
  errorMessage: string | null
}

export interface ConsensusPrediction {
  lotteryType: string
  scoredNumbers: ConsensusNumberScore[]
  suggestedCombos: number[][]
  optimalSumMin: number
  optimalSumMax: number
  methodDescription: string
}

export interface PredictionFeedback {
  predictionId:          string
  predictionLabel:       string
  lotteryType:           string | null
  hasResults:            boolean
  bestMatchCount:        number
  avgMatchCount:         number
  drawsAnalyzed:         number
  predictedNumbers:      number[]
  acertados:             number[]   // predijo Y salieron ✅
  fallados:              number[]   // predijo pero NO salieron ❌
  noPredichos:           number[]   // salieron pero no predijo
  suggestedExclude:      number[]   // excluir en siguiente predicción
  suggestedBoost:        number[]   // impulsar en siguiente predicción
  feedbackSummary:       string
  insights:              string[]
  nextActionSuggestion:  string
}

export interface ImprovedPrediction {
  lotteryType:        string
  model:              string
  modelAvailable:     boolean
  topNumbers:         number[]
  suggestedCombos:    number[][]
  rankedNumbers:      MLNumberScore[]
  adjustments: {
    excluded:     number[]
    boosted:      number[]
    explanation:  string
  }
  validationHitRate:  number | null
  trainedAt:          string | null
}

export interface EVComboAnalysis {
  combo:                number[]
  popularityScore:      number          // 0-1: qué tan "humana" es la combinación
  crowdMultiplier:      number          // boletos esperados vs. azar uniforme
  pJackpot:             number
  expectedCoWinners?:   number          // λ Poisson (requiere jackpot)
  expectedPayoutIfWin?: number          // bolsa / co-ganadores esperados
  evJackpotOnly?:       number          // EV en MXN (solo premio mayor)
  evRatio?:             number | null   // EV como fracción del costo del boleto
}

export interface EVPrediction {
  lotteryType:      string
  model:            string
  pJackpot:         number
  jackpot:          number | null
  ticketPrice:      number
  ticketsSold:      number
  combos:           EVComboAnalysis[]
  evOptimizedCombo: EVComboAnalysis
  note:             string
}

export interface EVPortfolio {
  lotteryType:             string
  model:                   string
  nTickets:                number
  ticketPrice:             number
  totalCost:               number
  tickets:                 EVComboAnalysis[]
  distinctNumbersCovered:  number
  coveragePct:             number          // 0-1: fracción de los 56 números cubiertos
  numbersCovered:          number[]
  avgPopularity:           number | null
  avgShareFactor:          number | null   // 1.0 = conservas el premio entero
  pAnyJackpot:             number          // ≈ nTickets × pJackpot
  edgeVsHumanPct:          number | null   // % más premio esperado que una combo humana
  poolSize:                number
  coverageWeight:          number
  jackpot?:                number | null
  totalExpectedPayout?:    number          // EV total de la cartera en MXN
  portfolioEvRatio?:       number | null   // EV total / costo total
  note:                    string
}

export interface TriplePrediction {
  scoredNumbers: Array<{
    number: number
    rank: number
    tripleScore: number
    melateScore: number
    revanchaScore: number
    revanchitaScore: number
    confidence?: number
  }>
  suggestedCombos: number[][]
  optimalSumMin: number
  optimalSumMax: number
  gameHitRates: { melate: number; revancha: number; revanchita: number }
  methodDescription: string
  liftVsRandom?: number
}
