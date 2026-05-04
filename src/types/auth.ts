export interface AuthUser {
  id: string
  username: string
  email: string
  role: 'USER' | 'ADMIN'
}

export interface AuthState {
  user: AuthUser | null
  token: string | null
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
}

export interface AuthResponse {
  token: string
  userId: string
  username: string
  email: string
  role: string
}

export interface AdminUser {
  id: string
  username: string
  email: string
  role: string
  active: boolean
  createdAt: string
}

export interface AdminMetrics {
  totalUsers: number
  totalPredictions: number
  actionBreakdown: Record<string, number>
}

export interface AdminPrediction {
  id: string
  label: string
  savedAt: string
  latestDrawDate: string | null
  combosJson: string
  lotteryType: string | null
  generationParamsJson: string | null
  userId: string
}

export interface CreateUserRequest {
  username: string
  email: string
  password: string
  role: string
}

export interface UpdateUserRequest {
  username: string
  email: string
  role: string
  active: boolean
}
