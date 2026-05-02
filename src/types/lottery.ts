export type LotteryTypeId = 'MELATE' | 'REVANCHA' | 'REVANCHITA' | 'GANA_GATO'

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

export interface SyncResult {
  lotteryType: LotteryTypeId
  totalRecords: number
  newRecords: number
  skippedRecords: number
  status: 'SUCCESS' | 'ERROR'
  message: string
  syncedAt: string
}
